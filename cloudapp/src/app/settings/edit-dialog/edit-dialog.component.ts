import { Component, Inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { isEqual } from 'lodash';
import { debounceTime } from 'rxjs';
import { N8nFormItem } from '../../app.service';

@Component({
  selector: 'app-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  styleUrl: './edit-dialog.component.scss'
})
export class EditDialogComponent {

  formGroup: FormGroup;
  configDefaultParams: any;
  hasDefaultParams = false;

  constructor(@Inject(MAT_DIALOG_DATA) private data: { form: N8nFormItem, params: any },
    private dialogRef: MatDialogRef<EditDialogComponent>) { 
    }

  get defaultParams(): FormArray {
    return this.formGroup.get('defaultParams') as FormArray;
  }

  ngOnInit(): void {
    const { form, params } = this.data;
    this.configDefaultParams = form.defaultParams;
    this.hasDefaultParams = params?.length > 0;
    this.formGroup = new FormGroup({
      defaultParams: new FormArray(params?.map(({ key, value }) => new FormGroup({
        key: new FormControl(key, Validators.required),
        value: new FormControl(value, Validators.required)
      })) ?? [])
    });
    this.formGroup.valueChanges.pipe(debounceTime(100)).subscribe(value => {
      const { defaultParams } = value;
      if (this.formGroup.dirty && isEqual(defaultParams, params)) {
        this.formGroup.markAsPristine();
      }
    });
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
    this.dialogRef.close(() => this.formGroup.get('defaultParams').value ?? []);
  }

}
