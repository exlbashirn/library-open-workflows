import { Component, EventEmitter, Input, Output } from '@angular/core';
import { N8nChatItem, N8nFormItem, ResourceType } from '../../app.service';

type ResourceItem = N8nFormItem | N8nChatItem;

@Component({
  selector: 'app-resource-config-list',
  templateUrl: './resource-config-list.component.html',
  styleUrls: ['./resource-config-list.component.scss']
})
export class ResourceConfigListComponent {

  @Input() items: ResourceItem[] = [];
  @Input() saving = false;
  @Input() resourceType: ResourceType = 'form';

  @Output() edit = new EventEmitter<ResourceItem>();
  @Output() remove = new EventEmitter<ResourceItem>();

  get isFormResource() {
    return this.resourceType === 'form';
  }

  onEdit(item: ResourceItem) {
    this.edit.emit(item);
  }

  onDelete(item: ResourceItem) {
    this.remove.emit(item);
  }

  showMetadata(item: ResourceItem) {
    if (this.isFormResource) {
      const form = item as N8nFormItem;
      return !!(form.auth || (form.defaultParams?.length ?? 0) > 0 || (form.networkMembers?.length ?? 0) > 0 || form.includePageEntities);
    }
    const chat = item as N8nChatItem;
    return !!(chat.auth || (chat.networkMembers?.length ?? 0) > 0 || chat.includePageEntities);
  }

  showAuth(item: ResourceItem) {
    if (this.isFormResource) {
      return !!(item as N8nFormItem).auth;
    }
    return !!(item as N8nChatItem).auth;
  }

  hasRoles(item: ResourceItem) {
    return ((item as N8nFormItem | N8nChatItem).roles?.length ?? 0) > 0;
  }

  hasNetworkMembers(item: ResourceItem) {
    return (((item as N8nFormItem | N8nChatItem).networkMembers?.length) ?? 0) > 0;
  }

  isAllNetworkMembers(item: ResourceItem) {
    return (item as N8nFormItem | N8nChatItem).networkMembers?.includes('ALL');
  }

  hasDefaultParams(item: ResourceItem) {
    return this.isFormResource && (((item as N8nFormItem).defaultParams?.length) ?? 0) > 0;
  }

  includesPageEntities(item: ResourceItem) {
    return !!(item as N8nFormItem | N8nChatItem).includePageEntities;
  }

  getNetworkMembersCount(item: ResourceItem) {
    return (item as N8nFormItem | N8nChatItem).networkMembers?.length ?? 0;
  }

  getPath(item: ResourceItem) {
    return item.path;
  }

  getWorkflowName(item: ResourceItem) {
    if (this.isFormResource) {
      const form = item as N8nFormItem;
      return (form.webhookWorkflow ?? form.formWorkflow)?.name;
    }
    const chat = item as N8nChatItem;
    return chat.webhookWorkflow?.name;
  }
}
