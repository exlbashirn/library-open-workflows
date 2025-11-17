import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AlertService, CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { filter, finalize, forkJoin } from 'rxjs';
import { AppService, N8nFormItem } from '../app.service';
import { EditDialogComponent } from './edit-dialog/edit-dialog.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {

  forms: N8nFormItem[] = [];
  settings: { [id: string]: any };
  saving = false;

  constructor(public appService: AppService,
    private dialog: MatDialog,
    private alertService: AlertService,
    private settingsService: CloudAppSettingsService) {
    this.appService.setTitle('User Settings');
  }

  ngOnInit(): void {
    forkJoin([
      this.appService.getUserAccessibleForms(),
      this.settingsService.get()
    ]).subscribe(([forms, settings]) => {
      this.forms = forms ?? [];
      this.settings = settings ?? {};
    });
  }

  onEntryEdit(form: N8nFormItem) {
    const formKey = this.appService.getFormKey(form);
    this.dialog.open(EditDialogComponent, {
      minWidth: '90vw', maxHeight: '95vh',
      data: { form, params: this.settings.defaultParams?.[formKey] ?? [] }
    }).afterClosed().pipe(filter(res => !!res)).subscribe(res => {
      const params = typeof res === 'function' && res();
      this.updateSettings(params, formKey);
      this.saving = true;
      this.settingsService.set(this.settings).pipe(
        finalize(() => this.saving = false)
      ).subscribe(() => {
        this.alertService.success("Configuration saved successfully")
      });
    });
  }

  private updateSettings(params: any, formKey: string) {
    if (params.length === 0) {
      delete this.settings.defaultParams?.[formKey];
    } else {
      this.settings.defaultParams = this.settings.defaultParams ?? {};
      this.settings.defaultParams[formKey] = params;
    }
    this.removeNonExistingFormKeys();
  }

  private removeNonExistingFormKeys() {
    const formKeys = this.forms.reduce((acc, form) => {
      acc.add(this.appService.getFormKey(form));
      return acc;
    }, new Set());
    for (const formKey of Object.keys(this.settings?.defaultParams ?? {})) {
      if (!formKeys.has(formKey)) {
        delete this.settings.defaultParams[formKey];
      }
    }
  }
  
}
