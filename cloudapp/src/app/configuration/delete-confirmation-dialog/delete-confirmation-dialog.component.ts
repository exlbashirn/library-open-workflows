import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { N8nChatItem, N8nFormItem, ResourceType } from '../../app.service';

@Component({
  selector: 'app-delete-confirmation-dialog',
  templateUrl: './delete-confirmation-dialog.component.html',
  styleUrls: ['./delete-confirmation-dialog.component.scss']
})
export class DeleteConfirmationDialogComponent implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public data: { item: N8nFormItem | N8nChatItem; resourceType: ResourceType }) { }

  ngOnInit(): void {
  }

}
