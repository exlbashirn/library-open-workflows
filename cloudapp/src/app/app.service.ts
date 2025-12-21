
import { Injectable } from '@angular/core';
import { AlertService, CloudAppConfigService, CloudAppEventsService, CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib';
import { cloneDeep } from 'lodash';
import { BehaviorSubject, firstValueFrom, forkJoin, from, Observable, of } from 'rxjs';
import { catchError, concatMap, map, take, tap } from 'rxjs/operators';

interface CodeValue {
    code: string;
    value: string;
}

export type RoleType = CodeValue;
export type NetworkMember = CodeValue;

export interface N8nFormItem {
    id: number,
    name: string,
    description: string,
    path: string,
    createdDate: number,
    createdBy: string,
    modifiedDate: number,
    modifiedBy: string,
    formWorkflow: N8nFormTriggeredWorkflow,
    auth: boolean,
    roles: string[],
    defaultParams?: any,
    networkMembers?: string[],
    isNetworkForm?: boolean,
    uniqueId?: string | number  // Used for routing to avoid ID conflicts
}

export interface N8nFormTriggeredWorkflow {
    id: string;
    name: string;
    formPath: string;
    formTitle: string;
    authentication: string;
}

interface ConfigMetadata {
    modifiedDate: number;
}

@Injectable({
    providedIn: 'root'
})
export class AppService {

    private title = new BehaviorSubject<string>('Demo n8n forms');
    private title$ = this.title.asObservable();

    private forms: N8nFormItem[];
    private metadata: ConfigMetadata;

    private almaUrl: Promise<string>;
    private n8nUrl: Promise<string>;
    private formTriggeredWorkflows: Promise<N8nFormTriggeredWorkflow[]>;
    private roleTypes: Promise<RoleType[]>;
    private userRoles: Promise<string[]>;
    private networkMembers: Promise<NetworkMember[]>;

    constructor(private configService: CloudAppConfigService,
        private eventsService: CloudAppEventsService,
        private alertService: AlertService,
        private restService: CloudAppRestService) {
        this.init();
    }

    private init() {
        this.almaUrl = firstValueFrom(this.eventsService.getInitData().pipe(take(1),
            map(data => data.urls.alma)));
        this.n8nUrl = firstValueFrom(this.restService.call('/conf/mapping-tables/WorkflowAutomationToolConfig').pipe(
            map((data: any) => data.row.find(r => r.column0 === '02_wat_url').column2),
            catchError(() => of(null))
        ));
    }

    getAlmaUrl() {
        return from(this.almaUrl);
    }

    getN8nInstanceUrl() {
        return from(this.n8nUrl);
    }

    getFormTriggersFromInstance() {
        this.formTriggeredWorkflows = this.formTriggeredWorkflows ?? firstValueFrom(
            this.restService.call<N8nFormTriggeredWorkflow[]>('/library-open-workflows/workflows/form-triggered').pipe(
                map(wflows => wflows.filter(wf => wf.authentication === 'alma')),
                catchError(e => {
                    this.alertService.error('An error was encountered while fetching workflow list');
                    throw e;
                })
            )
        );
        return from(this.formTriggeredWorkflows);
    }

    getRolesTypes() {
        this.roleTypes = this.roleTypes ?? firstValueFrom(this.restService.call('/user-roles/types'));
        return from(this.roleTypes);
    }

    getNetworkMembers() {
        this.networkMembers = this.networkMembers ?? firstValueFrom(
            this.restService.call('/conf/mapping-tables/ConsortiaMembers').pipe(map(
                (data: any) => data.row.filter((r: any) => !!r.enabled).map((r: any) => ({ code: r.column0, value: r.column2 }))
            )));
        return this.networkMembers;
    }

    getCurrentUserId() {
        return this.eventsService.getInitData().pipe(take(1),
            map(data => data.user.primaryId));
    }

    isCurrentUserAdmin() {
        return this.eventsService.getInitData().pipe(take(1),
            map(data => data.user.isAdmin));
    }

    getCurrentUserRoles() {
        this.userRoles = this.userRoles ?? firstValueFrom(this.eventsService.getInitData().pipe(
            take(1),
            map(data => data.user.primaryId),
            concatMap(() => this.restService.call('/users/ME')),
            map(({ user_role }) => Array.from(new Set(user_role.filter(r => r.status.value === 'ACTIVE').map(r => r.role_type.value)))),
            tap(roles => roles.sort())
        )) as Promise<string[]>;
        return from(this.userRoles);
    }

    setTitle(title: string) {
        this.title.next(title);
    }

    getTitle(): Observable<string> {
        return this.title$;
    }

    confirmNoRemoteChanges() {
        return this.configService.get().pipe(
            tap(conf => {
                const metadata: ConfigMetadata = conf?.meta;
                if (metadata?.modifiedDate !== this.metadata?.modifiedDate) {
                    this.alertService.error('Could not save changes! Configuration may have changed remotely. Please reload this app.');
                    throw new Error('Configuration changed remotely');
                }
            }));
    }

    saveForms(forms: N8nFormItem[]) {
        return this.confirmNoRemoteChanges().pipe(
            concatMap(() => this.configService.set({ forms, meta: { modifiedDate: Date.now() } })),
            concatMap(() => this.loadForms())
        );
    }

    getForms() {
        if (!this.forms) {
            return this.loadForms();
        }
        return of(cloneDeep(this.forms));
    }

    getUserAccessibleForms() {
        return forkJoin([
            this.getForms(),
            this.getNetworkForms(),
            this.getCurrentUserRoles()
        ]).pipe(map(([forms, networkForms, userRoles]) => {
            const roleFilter = f => !f.roles || f.roles.length === 0 || f.roles.some(r => userRoles.indexOf(r) > -1);
            const accessibleForms = forms?.filter(roleFilter) ?? [];
            const accessibleNetworkForms = networkForms?.filter(roleFilter) ?? [];
            
            // Mark network forms and create unique IDs
            accessibleForms.forEach(f => f.uniqueId = f.id);
            accessibleNetworkForms.forEach(f => {
                f.isNetworkForm = true;
                f.uniqueId = `network-${f.id}`;
            });
            
            // Combine and sort by name
            const allForms = [...accessibleForms, ...accessibleNetworkForms];
            allForms.sort((a, b) => a.name.localeCompare(b.name));
            
            return allForms;
        }));
    }

    getNetworkForms(): Observable<N8nFormItem[]> {
        return this.configService.get().pipe(
            map(conf => cloneDeep(conf['networkForms'] ?? []))
        );
    }

    loadForms() {
        return this.configService.get().pipe(
            tap(conf => {
                this.forms = conf['forms'] ?? [];
                this.metadata = conf['meta'];
            }),
            map(conf => cloneDeep(conf['forms']))
        );
    }

    getFormKey(form: N8nFormItem) {
        return form.formWorkflow.id + '_' + form.formWorkflow.formPath + '_' + form.id;
    }

}