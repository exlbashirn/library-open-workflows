import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { concatMap, filter, finalize, map } from 'rxjs/operators';
import { AppService, N8nFormItem } from '../app.service';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog/delete-confirmation-dialog.component';
import { EditDialogComponent } from './edit-dialog/edit-dialog.component';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {

  displayedColumns = ['id', 'name', 'description', 'url', 'actions'];
  forms: N8nFormItem[] = [];
  saving = false;

  constructor(private appService: AppService, public dialog: MatDialog) {
    this.appService.setTitle('Configuration');
  }

  ngOnInit(): void {
    this.appService.getForms().subscribe(forms => {
      this.forms = forms ?? [];
    });
  }

  onEntryDelete(form: N8nFormItem) {
    this.dialog.open(DeleteConfirmationDialogComponent, { data: { form } })
      .afterClosed().pipe(
        filter(res => !!res),
        concatMap(() => this.appService.confirmNoRemoteChanges())
      ).subscribe(() => {
        const index = this.forms.findIndex(f => f.id === form.id);
        this.forms.splice(index, 1);
        this.saveChanges();
      });
  }

  onEntryEdit(form: N8nFormItem) {
    this.dialog.open(EditDialogComponent, { minWidth: '90vw', maxHeight: '95vh', data: { form } })
      .afterClosed().pipe(
        filter(res => !!res),
        concatMap(res => this.appService.confirmNoRemoteChanges().pipe(map(() => res))),
      ).subscribe(res => {
        typeof res === 'function' && res();
        this.saveChanges();
      });
  }

  onEntryAdd() {
    this.dialog.open(EditDialogComponent, { minWidth: '90vw', maxHeight: '95vh', data: { form: {} } })
      .afterClosed().pipe(
        filter(res => !!res),
        concatMap(res => this.appService.confirmNoRemoteChanges().pipe(map(() => res)))
      ).subscribe(res => {
        const form = typeof res === 'function' && res();
        const nextId = [...this.forms].sort((a, b) => a.id - b.id).reduce((acc, f) => {
          return Math.max(acc, f.id)
        }, 0) + 1;
        form.id = nextId;
        this.forms.push(form);
        this.saveChanges();
      })
  }

  saveChanges() {
    this.saving = true;
    this.appService.saveForms(this.forms).pipe(finalize(() => this.saving = false)).subscribe();
  }

}
