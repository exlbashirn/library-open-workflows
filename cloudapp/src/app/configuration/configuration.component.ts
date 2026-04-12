import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib';
import { concatMap, filter, finalize, map } from 'rxjs/operators';
import { forkJoin, Observable } from 'rxjs';
import { AppService, N8nChatItem, N8nFormItem, ResourceType } from '../app.service';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog/delete-confirmation-dialog.component';
import { EditDialogComponent } from './edit-dialog/edit-dialog.component';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {

  forms: N8nFormItem[] = [];
  chats: N8nChatItem[] = [];
  saving = false;
  loadError = false;

  get activeTab(): ResourceType { return this.appService.activeResourceTab; }
  get activeTabIndex(): number { return this.activeTab === 'form' ? 0 : 1; }

  constructor(
    private appService: AppService,
    private alertService: AlertService,
    private dialog: MatDialog
  ) {
    this.appService.setTitle('Configuration');
  }

  ngOnInit(): void {
    this.loadError = false;
    forkJoin([
      this.appService.getForms(),
      this.appService.getChats()
    ]).subscribe({
      next: ([forms, chats]) => {
        this.forms = forms ?? [];
        this.chats = chats ?? [];
        this.appService.autoSelectTab(this.forms.length, this.chats.length);
      },
      error: () => {
        this.loadError = true;
      }
    });
  }

  retryLoad() {
    this.ngOnInit();
  }

  onTabChange(index: number) {
    this.appService.tabExplicitlySelected = true;
    this.appService.activeResourceTab = index === 0 ? 'form' : 'chat';
  }

  onEntryDelete(item: N8nFormItem | N8nChatItem, resourceType: ResourceType) {
    this.dialog.open(DeleteConfirmationDialogComponent, { data: { item, resourceType } })
      .afterClosed().pipe(
        filter(res => !!res),
        concatMap(() => this.appService.confirmNoRemoteChanges())
      ).subscribe(() => {
        if (resourceType === 'form') {
          const form = item as N8nFormItem;
          const index = this.forms.findIndex(f => f.id === form.id);
          this.forms.splice(index, 1);
        } else {
          const chat = item as N8nChatItem;
          const index = this.chats.findIndex(c => c.id === chat.id);
          this.chats.splice(index, 1);
        }
        this.saveChanges(resourceType);
      });
  }

  onEntryEdit(item: N8nFormItem | N8nChatItem, resourceType: ResourceType) {
    this.dialog.open(EditDialogComponent, { minWidth: '90vw', maxHeight: '95vh', data: { item, resourceType } })
      .afterClosed().pipe(
        filter(res => !!res),
        concatMap(res => this.appService.confirmNoRemoteChanges().pipe(map(() => res))),
      ).subscribe(res => {
        typeof res === 'function' && res();
        this.saveChanges(resourceType);
      });
  }

  onEntryAdd(resourceType: ResourceType) {
    const emptyItem = {} as N8nFormItem | N8nChatItem;
    this.dialog.open(EditDialogComponent, { minWidth: '90vw', maxHeight: '95vh', data: { item: emptyItem, resourceType } })
      .afterClosed().pipe(
        filter(res => !!res),
        concatMap(res => this.appService.confirmNoRemoteChanges().pipe(map(() => res)))
      ).subscribe(res => {
        const newItem = typeof res === 'function' && res();
        if (resourceType === 'form') {
          const nextId = [...this.forms].sort((a, b) => a.id - b.id)
            .reduce((acc, f) => Math.max(acc, f.id), 0) + 1;
          (newItem as N8nFormItem).id = nextId;
          this.forms.push(newItem as N8nFormItem);
        } else {
          const nextId = [...this.chats].sort((a, b) => a.id - b.id)
            .reduce((acc, c) => Math.max(acc, c.id), 0) + 1;
          (newItem as N8nChatItem).id = nextId;
          this.chats.push(newItem as N8nChatItem);
        }
        this.saveChanges(resourceType);
      });
  }

  saveChanges(resourceType: ResourceType) {
    this.saving = true;
    const save$: Observable<unknown> = resourceType === 'form'
      ? this.appService.saveForms(this.forms)
      : this.appService.saveChats(this.chats);
    save$.pipe(finalize(() => this.saving = false)).subscribe(() => {
      this.alertService.success('Configuration saved successfully');
    });
  }

}
