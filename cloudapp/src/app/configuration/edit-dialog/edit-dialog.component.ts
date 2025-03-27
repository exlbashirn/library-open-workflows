import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { isEmpty, isEqual, pick } from 'lodash';
import { forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AppService, N8nFormItem, N8nFormTriggeredWorkflow, RoleType } from '../../app.service';

@Component({
  selector: 'app-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  styleUrls: ['./edit-dialog.component.scss']
})
export class EditDialogComponent implements OnInit {

  formGroup: FormGroup;
  formTriggeredWorkflows: N8nFormTriggeredWorkflow[] = [];
  roleList: RoleType[];
  selectedRolesNum = 0;
  editMode = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { form: N8nFormItem },
    private dialogRef: MatDialogRef<EditDialogComponent>,
    private appService: AppService) { }

  get defaultParams(): FormArray {
    return this.formGroup.get('defaultParams') as FormArray;
  }

  ngOnInit(): void {
    const { form } = this.data;
    this.editMode = !isEmpty(this.data?.form);
    forkJoin([
      this.appService.getFormTriggersFromInstance(),
      this.appService.getRolesTypes()
    ]).subscribe(([formTriggeredWorkflows, roleTypes]) => {
      this.formTriggeredWorkflows = formTriggeredWorkflows;
      this.roleList = roleTypes;
    });
    if (this.editMode) {
      this.selectedRolesNum = form.roles?.length ?? 0;
      this.initEditFormGroup(form);
    } else {
      this.initNewFormGroup(form);
    }
    this.initFormListenerForPath();
    this.initFormListenerForStatus(form);
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
  }

  onSave() {
    this.appService.getCurrentUserId().subscribe(userId => {
      this.dialogRef.close(() => {
        const { form } = this.data;
        form.name = this.formGroup.get('name').value;
        form.path = this.formGroup.get('path').value;
        form.description = this.formGroup.get('description').value;
        form.auth = this.formGroup.get('auth').value;
        form.roles = this.formGroup.get('roles').value ?? [];
        form.defaultParams = this.formGroup.get('defaultParams').value ?? [];
        form.modifiedBy = userId;
        form.modifiedDate = Date.now();
        if (!form.id) {
          form.createdBy = userId;
          form.createdDate = Date.now();
        }
        if (!form.formWorkflow) {
          form.formWorkflow = this.formTriggeredWorkflows
            .find(wf => `${wf.id}+${wf.formPath}` === this.formGroup.get('form').value);
        }
        return form;
      });
    })
  }
  private initFormListenerForStatus(form: N8nFormItem) {
    this.formGroup.valueChanges.pipe(debounceTime(100)).subscribe(value => {
      this.selectedRolesNum = value.roles?.length ?? 0;
      const props: (keyof N8nFormItem)[] = ['name', 'description', 'roles', 'defaultParams'];
      const now = pick(value, props);
      const original = Object.assign({ roles: [] }, pick(form, props));
      if (this.formGroup.dirty && isEqual(now, original)) {
        this.formGroup.markAsPristine();
      }
    });
  }

  private initFormListenerForPath() {
    this.formGroup.get('form')?.valueChanges.subscribe(formVal => {
      const form = this.formTriggeredWorkflows.find(wf => `${wf.id}+${wf.formPath}` === formVal);
      this.formGroup.get('name').setValue(`${form.formTitle}`);
      this.formGroup.get('path').setValue(form.formPath);
      if (form.formPath === 'null') {
        this.formGroup.get('path').enable();
      } else {
        this.formGroup.get('path').disable();
      }
    });
  }

  private initNewFormGroup(form: N8nFormItem) {
    this.formGroup = new FormGroup({
      form: new FormControl('', Validators.required),
      name: new FormControl('', Validators.required),
      path: new FormControl({ value: '', disabled: true }, Validators.required),
      auth: new FormControl(true),
      roles: new FormControl(form.roles ?? []),
      description: new FormControl(''),
      defaultParams: new FormArray([])
    });
  }

  private initEditFormGroup(form: N8nFormItem) {
    this.formGroup = new FormGroup({
      form: new FormControl({
        value: `${form.formWorkflow.id}+${form.formWorkflow.formPath}`,
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
      })) ?? [])
    });
  }

}
