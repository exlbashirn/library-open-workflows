
import { Injectable } from '@angular/core';
import { AlertService, CloudAppConfigService, CloudAppEventsService, CloudAppRestService } from '@exlibris/exl-cloudapp-angular-lib';
import { cloneDeep } from 'lodash';
import { BehaviorSubject, firstValueFrom, forkJoin, from, Observable, of, timer } from 'rxjs';
import { catchError, concatMap, map, retry, take, tap } from 'rxjs/operators';

export const CONFIG_KEYS = {
    forms: 'forms',
    network: 'network',
    // Deprecated: use network.forms
    networkForms: 'networkForms',
    chats: 'chats',
    // Deprecated: use network.chats
    networkChats: 'networkChats',
    meta: 'meta'
} as const;

export class ConflictError extends Error {
    constructor() {
        super('Configuration changed remotely');
        this.name = 'ConflictError';
    }
}

interface CodeValue {
    code: string;
    value: string;
}

export type RoleType = CodeValue;
export type NetworkMember = CodeValue;
export type ResourceType = 'form' | 'chat';

export interface N8nFormItem {
    id: number;
    name: string;
    description: string;
    path: string;
    createdDate: number;
    createdBy: string;
    modifiedDate: number;
    modifiedBy: string;
    formWorkflow: N8nFormTriggeredWorkflow;
    /** Preferred accessor — falls back to formWorkflow for data saved before this field was introduced */
    webhookWorkflow?: N8nFormTriggeredWorkflow;
    auth: boolean;
    roles: string[];
    defaultParams?: any;
    networkMembers?: string[];
    isNetworkForm?: boolean;
    /** Used for routing to avoid ID conflicts between local and network items */
    uniqueId?: string | number;
}

export interface N8nChatItem {
    id: number;
    name: string;
    description: string;
    path: string;
    createdDate: number;
    createdBy: string;
    modifiedDate: number;
    modifiedBy: string;
    webhookWorkflow: N8nChatTriggeredWorkflow;
    /** Always true — Alma auth is always required for chats */
    auth: true;
    roles: string[];
    networkMembers?: string[];
    isNetworkChat?: boolean;
    /** Used for routing to avoid ID conflicts between local and network items */
    uniqueId?: string | number;
}

export interface N8nFormTriggeredWorkflow {
    id: string;
    name: string;
    formPath: string;
    formTitle: string;
    authentication: string;
}

export interface N8nChatTriggeredWorkflow {
    id: string;
    name: string;
    chatTrigger: string;
    webhookId: string;
    authentication: string;
}

export interface TriggeredWorkflowsResponse {
    formTriggeredWorkflows: N8nFormTriggeredWorkflow[];
    chatTriggeredWorkflows: N8nChatTriggeredWorkflow[];
}

interface ConfigMetadata {
    modifiedDate: number;
}

type NetworkItemType = 'forms' | 'chats';

@Injectable({
    providedIn: 'root'
})
export class AppService {

    private title = new BehaviorSubject<string>('Demo n8n forms');
    private title$ = this.title.asObservable();

    activeResourceTab: ResourceType = 'form';
    tabExplicitlySelected = false;

    autoSelectTab(formsCount: number, chatsCount: number) {
        if (this.tabExplicitlySelected) return;
        if (formsCount === 0 && chatsCount > 0) {
            this.activeResourceTab = 'chat';
        } else if (chatsCount === 0 && formsCount > 0) {
            this.activeResourceTab = 'form';
        }
    }

    private metadata: ConfigMetadata;

    private configPromise: Promise<any> | null = null;

    private almaUrl: Promise<string>;
    private n8nUrl: Promise<string>;
    private triggeredWorkflowsPromise: Promise<TriggeredWorkflowsResponse> | null = null;
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

    /**
     * Fetches both form- and chat-triggered workflows from the unified endpoint.
     *
     * Retry policy:
     *  - 404  → bypass retries, fall back immediately to the legacy
     *           form-triggered endpoint (chatTriggeredWorkflows will be []).
     *  - Other → exponential-backoff retry (max 3), then fall back with alert.
     */
    getTriggersFromInstance(): Observable<TriggeredWorkflowsResponse> {
        if (!this.triggeredWorkflowsPromise) {
            this.triggeredWorkflowsPromise = firstValueFrom(
                this.restService.call<any>('/library-open-workflows/workflows/triggered').pipe(
                    map(res => ({
                        formTriggeredWorkflows: (res.formTriggeredWorkflows ?? [])
                            .filter((wf: N8nFormTriggeredWorkflow) => wf.authentication === 'alma'),
                        chatTriggeredWorkflows: (res.chatTriggeredWorkflows ?? [])
                            .filter((wf: N8nChatTriggeredWorkflow) => wf.authentication === 'alma')
                    })),
                    retry({
                        count: 3,
                        delay: (err: any, retryCount: number) => {
                            if (err?.status === 404) throw err; // 404 → skip retries, fall through to catchError
                            return timer(Math.pow(2, retryCount - 1) * 1000);
                        }
                    }),
                    catchError((err: any) => {
                        if (err?.status !== 404) {
                            this.alertService.error('An error was encountered while fetching workflow list');
                        }
                        // Fall back to the legacy forms-only endpoint
                        return this.fetchFormTriggeredFallback();
                    })
                )
            ).catch(err => {
                this.triggeredWorkflowsPromise = null;
                throw err;
            });
        }
        return from(this.triggeredWorkflowsPromise);
    }

    /** Backward-compat wrapper — returns only form-triggered workflows. */
    getFormTriggersFromInstance(): Observable<N8nFormTriggeredWorkflow[]> {
        return this.getTriggersFromInstance().pipe(map(r => r.formTriggeredWorkflows));
    }

    /** Returns only chat-triggered workflows. */
    getChatTriggersFromInstance(): Observable<N8nChatTriggeredWorkflow[]> {
        return this.getTriggersFromInstance().pipe(map(r => r.chatTriggeredWorkflows));
    }

    private fetchFormTriggeredFallback(): Observable<TriggeredWorkflowsResponse> {
        return this.restService.call<N8nFormTriggeredWorkflow[]>('/library-open-workflows/workflows/form-triggered').pipe(
            map(wflows => ({
                formTriggeredWorkflows: wflows.filter(wf => wf.authentication === 'alma'),
                chatTriggeredWorkflows: [] as N8nChatTriggeredWorkflow[]
            }))
        );
    }

    getRolesTypes() {
        this.roleTypes = this.roleTypes ?? firstValueFrom(this.restService.call('/user-roles/types'));
        return from(this.roleTypes);
    }

    getNetworkMembers() {
        this.networkMembers = this.networkMembers ?? firstValueFrom(
            this.restService.call('/conf/mapping-tables/ConsortiaMembers').pipe(map(
                (data: any) => data.row?.filter((r: any) => !!r.enabled).map((r: any) => ({ code: r.column0, value: r.column2 })) ?? []
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
                    throw new ConflictError();
                }
            }));
    }

    private loadConfig(): Observable<any> {
        if (!this.configPromise) {
            this.configPromise = firstValueFrom(
                this.configService.get().pipe(
                    retry({
                        count: 3,
                        delay: (_err: any, retryCount: number) => timer(Math.pow(2, retryCount - 1) * 1000)
                    }),
                    tap(conf => {
                        // Keep metadata fresh so conflict detection works for
                        // whichever tab (forms or chats) is opened first.
                        this.metadata = conf?.[CONFIG_KEYS.meta];
                    })
                )
            ).catch(err => {
                this.configPromise = null; // allow retry on next access
                throw err;
            });
        }
        return from(this.configPromise);
    }

    private saveConfigPartial(partial: Record<string, any>): Observable<any> {
        return this.confirmNoRemoteChanges().pipe(
            concatMap(() => this.configService.get()),
            concatMap(conf =>
                this.configService.set({
                    ...conf,
                    ...partial,
                    [CONFIG_KEYS.meta]: { modifiedDate: Date.now() }
                }).pipe(
                    retry({
                        count: 2,
                        delay: (err: any, retryCount: number) => {
                            if (err instanceof ConflictError) throw err;
                            return timer(Math.pow(2, retryCount - 1) * 1000);
                        }
                    })
                )
            ),
            tap(() => {
                this.configPromise = null; // invalidate cache so next load re-fetches
            })
        );
    }

    saveForms(forms: N8nFormItem[]) {
        return this.saveConfigPartial({ [CONFIG_KEYS.forms]: forms }).pipe(
            concatMap(() => this.loadForms())
        );
    }

    getForms(): Observable<N8nFormItem[]> {
        return this.loadForms();
    }

    loadForms(): Observable<N8nFormItem[]> {
        return this.loadConfig().pipe(
            map(conf => cloneDeep(conf?.[CONFIG_KEYS.forms] ?? []))
        );
    }

    getUserAccessibleForms() {
        return forkJoin([
            this.getForms(),
            this.getNetworkForms(),
            this.getCurrentUserRoles()
        ]).pipe(map(([forms, networkForms, userRoles]) => {
            const roleFilter = (f: N8nFormItem) => !f.roles || f.roles.length === 0 || f.roles.some(r => userRoles.indexOf(r) > -1);
            const accessibleForms = forms?.filter(roleFilter) ?? [];
            const accessibleNetworkForms = networkForms?.filter(roleFilter) ?? [];

            accessibleForms.forEach(f => f.uniqueId = f.id);
            accessibleNetworkForms.forEach(f => {
                f.isNetworkForm = true;
                f.uniqueId = `network-${f.id}`;
            });

            const allForms = [...accessibleForms, ...accessibleNetworkForms];
            allForms.sort((a, b) => a.name.localeCompare(b.name));
            return allForms;
        }));
    }

    getNetworkForms(): Observable<N8nFormItem[]> {
        return this.loadConfig().pipe(
            map(conf => this.getNetworkItemsFromConfig<N8nFormItem>(conf, 'forms'))
        );
    }

    saveChats(chats: N8nChatItem[]) {
        return this.saveConfigPartial({ [CONFIG_KEYS.chats]: chats }).pipe(
            concatMap(() => this.loadChats())
        );
    }

    getChats(): Observable<N8nChatItem[]> {
        return this.loadChats();
    }

    loadChats(): Observable<N8nChatItem[]> {
        return this.loadConfig().pipe(
            map(conf => cloneDeep(conf?.[CONFIG_KEYS.chats] ?? []))
        );
    }

    getUserAccessibleChats() {
        return forkJoin([
            this.getChats(),
            this.getNetworkChats(),
            this.getCurrentUserRoles()
        ]).pipe(map(([chats, networkChats, userRoles]) => {
            const roleFilter = (c: N8nChatItem) => !c.roles || c.roles.length === 0 || c.roles.some(r => userRoles.indexOf(r) > -1);
            const accessibleChats = chats?.filter(roleFilter) ?? [];
            const accessibleNetworkChats = networkChats?.filter(roleFilter) ?? [];

            accessibleChats.forEach(c => c.uniqueId = c.id);
            accessibleNetworkChats.forEach(c => {
                c.isNetworkChat = true;
                c.uniqueId = `network-${c.id}`;
            });

            const allChats = [...accessibleChats, ...accessibleNetworkChats];
            allChats.sort((a, b) => a.name.localeCompare(b.name));
            return allChats;
        }));
    }

    getNetworkChats(): Observable<N8nChatItem[]> {
        return this.loadConfig().pipe(
            map(conf => this.getNetworkItemsFromConfig<N8nChatItem>(conf, 'chats'))
        );
    }

    private getDeprecatedNetworkKey(itemType: NetworkItemType): typeof CONFIG_KEYS.networkForms | typeof CONFIG_KEYS.networkChats {
        return itemType === 'forms' ? CONFIG_KEYS.networkForms : CONFIG_KEYS.networkChats;
    }

    private getNetworkContainer(conf: any): Record<string, any> {
        const network = conf?.[CONFIG_KEYS.network];
        return network && typeof network === 'object' ? network : {};
    }

    private getNetworkItemsFromConfig<T>(conf: any, itemType: NetworkItemType): T[] {
        const networkItems = this.getNetworkContainer(conf)?.[itemType];
        if (Array.isArray(networkItems)) {
            return cloneDeep(networkItems);
        }

        const deprecatedKey = this.getDeprecatedNetworkKey(itemType);
        const deprecatedItems = conf?.[deprecatedKey];
        if (Array.isArray(deprecatedItems)) {
            return cloneDeep(deprecatedItems);
        }

        return [];
    }

    getFormKey(form: N8nFormItem) {
        const wf = form.webhookWorkflow ?? form.formWorkflow;
        return wf.id + '_' + wf.formPath + '_' + form.id;
    }

}
