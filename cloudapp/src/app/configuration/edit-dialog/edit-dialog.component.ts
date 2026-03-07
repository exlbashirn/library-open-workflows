import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { isEmpty, isEqual, pick } from 'lodash';
import { forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  AppService,
  N8nChatItem,
  N8nChatTriggeredWorkflow,
  N8nFormItem,
  N8nFormTriggeredWorkflow,
  NetworkMember,
  ResourceType,
  RoleType
} from '../../app.service';

@Component({
  selector: 'app-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  styleUrls: ['./edit-dialog.component.scss']
})
export class EditDialogComponent implements OnInit {

  formGroup: FormGroup;
  formTriggeredWorkflows: N8nFormTriggeredWorkflow[] = [];
  chatTriggeredWorkflows: N8nChatTriggeredWorkflow[] = [];
  roleList: RoleType[];
  networkMembersList: NetworkMember[] = [];
  selectedRolesNum = 0;
  selectedNetworkMembersNum = 0;
  editMode = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: { item: N8nFormItem | N8nChatItem; resourceType: ResourceType },
    private dialogRef: MatDialogRef<EditDialogComponent>,
    private appService: AppService
  ) { }

  get resourceType(): ResourceType {
    return this.data.resourceType;
  }

  get defaultParams(): FormArray {
    return this.formGroup.get('defaultParams') as FormArray;
  }

  ngOnInit(): void {
    const { item } = this.data;
    this.editMode = !isEmpty(item);

    forkJoin([
      this.appService.getFormTriggersFromInstance(),
      this.appService.getChatTriggersFromInstance(),
      this.appService.getRolesTypes(),
      this.appService.getNetworkMembers()
    ]).subscribe(([formTriggeredWorkflows, chatTriggeredWorkflows, roleTypes, networkMembers]) => {
      this.formTriggeredWorkflows = formTriggeredWorkflows;
      this.chatTriggeredWorkflows = chatTriggeredWorkflows;
      this.roleList = roleTypes;
      this.networkMembersList = networkMembers;
    });

    if (this.editMode) {
      this.selectedRolesNum = item.roles?.length ?? 0;
      this.updateNetworkMembersCount(item.networkMembers);
      this.initEditFormGroup(item);
    } else {
      this.initNewFormGroup(item);
    }
    this.initFormListenerForPath();
    this.initFormListenerForStatus(item);
    this.initFormListenerForNetworkMembers();
  }

  addParam() {
    const keyValueGroup = new FormGroup({
      key: new FormControl('', Validators.required),
      value: new FormControl('', Validators.required)
    });
    this.defaultParams.push(keyValueGroup);
  }

  removeParam(index: number) {
    this.defaultParams.removeAt(index);
    this.defaultParams.markAsDirty();
  }

  onSave() {
    this.appService.getCurrentUserId().subscribe(userId => {
      this.dialogRef.close(() => {
        const { item, resourceType } = this.data;

        // Common fields for both resource types
        item.name = this.formGroup.get('name').value;
        item.path = this.formGroup.get('path').value;
        item.description = this.formGroup.get('description').value;
        item.roles = this.formGroup.get('roles').value ?? [];
        item.networkMembers = this.formGroup.get('networkMembers').value ?? [];
        item.modifiedBy = userId;
        item.modifiedDate = Date.now();
        if (!item.id) {
          item.createdBy = userId;
          item.createdDate = Date.now();
        }

        if (resourceType === 'form') {
          const form = item as N8nFormItem;
          form.auth = this.formGroup.get('auth').value;
          form.defaultParams = this.formGroup.get('defaultParams').value ?? [];
          if (!form.webhookWorkflow) {
            form.webhookWorkflow = this.formTriggeredWorkflows
              .find(wf => `${wf.id}+${wf.formPath}` === this.formGroup.get('form').value);
          }
        } else {
          const chat = item as N8nChatItem;
          (chat as any).auth = true; // always true; cast needed due to literal type
          if (!chat.webhookWorkflow) {
            chat.webhookWorkflow = this.chatTriggeredWorkflows
              .find(wf => `${wf.id}+${wf.webhookId}` === this.formGroup.get('form').value);
          }
        }

        return item;
      });
    });
  }

  private initNewFormGroup(item: N8nFormItem | N8nChatItem) {
    const base = {
      form: new FormControl('', Validators.required),
      name: new FormControl('', Validators.required),
      path: new FormControl({ value: '', disabled: true }, Validators.required),
      auth: new FormControl(true),
      roles: new FormControl(item.roles ?? []),
      description: new FormControl(''),
      networkMembers: new FormControl(item.networkMembers ?? [])
    };

    if (this.data.resourceType === 'form') {
      this.formGroup = new FormGroup({
        ...base,
        defaultParams: new FormArray([])
      });
    } else {
      this.formGroup = new FormGroup(base);
    }
  }

  private initEditFormGroup(item: N8nFormItem | N8nChatItem) {
    if (this.data.resourceType === 'form') {
      const form = item as N8nFormItem;
      const formWf = form.webhookWorkflow ?? form.formWorkflow;
      this.formGroup = new FormGroup({
        form: new FormControl({
          value: `${formWf.id}+${formWf.formPath}`,
          disabled: true
        }, Validators.required),
        name: new FormControl(form.name, Validators.required),
        path: new FormControl({ value: form.path, disabled: form.path !== 'null' }, Validators.required),
        auth: new FormControl(form.auth || form.roles?.length > 0),
        roles: new FormControl(form.roles ?? []),
        description: new FormControl(form.description ?? ''),
        defaultParams: new FormArray(form.defaultParams?.map(({ key, value }) => new FormGroup({
          key: new FormControl(key, Validators.required),
          value: new FormControl(value, Validators.required)
        })) ?? []),
        networkMembers: new FormControl(form.networkMembers ?? [])
      });
    } else {
      const chat = item as N8nChatItem;
      this.formGroup = new FormGroup({
        form: new FormControl({
          value: `${chat.webhookWorkflow.id}+${chat.webhookWorkflow.webhookId}`,
          disabled: true
        }, Validators.required),
        name: new FormControl(chat.name, Validators.required),
        path: new FormControl({ value: chat.path, disabled: true }, Validators.required),
        auth: new FormControl(true), // always true; not rendered in template
        roles: new FormControl(chat.roles ?? []),
        description: new FormControl(chat.description ?? ''),
        networkMembers: new FormControl(chat.networkMembers ?? [])
      });
    }
  }

  private initFormListenerForPath() {
    this.formGroup.get('form')?.valueChanges.subscribe(formVal => {
      if (this.data.resourceType === 'form') {
        const wf = this.formTriggeredWorkflows.find(w => `${w.id}+${w.formPath}` === formVal);
        if (!wf) return;
        this.formGroup.get('name').setValue(`${wf.formTitle}`);
        this.formGroup.get('path').setValue(wf.formPath);
        if (wf.formPath === 'null') {
          this.formGroup.get('path').enable();
        } else {
          this.formGroup.get('path').disable();
        }
      } else {
        const wf = this.chatTriggeredWorkflows.find(w => `${w.id}+${w.webhookId}` === formVal);
        if (!wf) return;
        this.formGroup.get('name').setValue(wf.name);
        this.formGroup.get('path').setValue(wf.webhookId);
        this.formGroup.get('path').disable(); // webhook IDs are always fixed
      }
    });
  }

  private initFormListenerForStatus(item: N8nFormItem | N8nChatItem) {
    this.formGroup.valueChanges.pipe(debounceTime(100)).subscribe(value => {
      this.selectedRolesNum = value.roles?.length ?? 0;
      this.selectedNetworkMembersNum = value.networkMembers?.length ?? 0;

      const props: string[] = ['name', 'description', 'roles', 'networkMembers'];
      if (this.data.resourceType === 'form') {
        props.push('defaultParams');
      }

      const now = pick(value, props);
      const original = Object.assign(
        { roles: [], ...(this.data.resourceType === 'form' ? { defaultParams: [] } : {}) },
        pick(item, props)
      );

      if (this.formGroup.dirty && isEqual(now, original)) {
        this.formGroup.markAsPristine();
      }
    });
  }

  private initFormListenerForNetworkMembers() {
    this.formGroup.get('networkMembers')?.valueChanges.subscribe(value => {
      this.updateNetworkMembersCount(value);
    });
  }

  private updateNetworkMembersCount(members: string[] | null | undefined) {
    if (members?.includes('ALL')) {
      this.selectedNetworkMembersNum = this.networkMembersList.length;
    } else {
      this.selectedNetworkMembersNum = members?.length ?? 0;
    }
  }

  onNetworkMembersChange(event: any) {
    const selectedValues: string[] = event.value || [];
    const previousValues: string[] = this.formGroup.get('networkMembers').value || [];

    if (selectedValues.includes('ALL') && !previousValues.includes('ALL')) {
      this.formGroup.get('networkMembers').setValue(['ALL'], { emitEvent: false });
    } else if (previousValues.includes('ALL') && selectedValues.length > 1) {
      const newValues = selectedValues.filter(v => v !== 'ALL');
      this.formGroup.get('networkMembers').setValue(newValues, { emitEvent: false });
    } else if (!selectedValues.includes('ALL') && selectedValues.length === this.networkMembersList.length) {
      this.formGroup.get('networkMembers').setValue(['ALL'], { emitEvent: false });
    }

    this.updateNetworkMembersCount(this.formGroup.get('networkMembers').value);
    this.formGroup.markAsDirty();
  }

}

