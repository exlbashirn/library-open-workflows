import { Component, EventEmitter, Input, Output } from '@angular/core';
import { N8nChatItem, N8nFormItem, ResourceType } from '../../app.service';

type ResourceItem = N8nFormItem | N8nChatItem;

@Component({
  selector: 'app-resource-main-list',
  templateUrl: './resource-main-list.component.html',
  styleUrls: ['./resource-main-list.component.scss']
})
export class ResourceMainListComponent {

  @Input() items: ResourceItem[] = [];
  @Input() resourceType: ResourceType = 'form';
  @Input() searchValue = '';
  @Input() searching = false;
  @Input() searchThreshold = 10;

  @Output() searchChange = new EventEmitter<string>();
  @Output() clearSearch = new EventEmitter<void>();

  get isFormResource() {
    return this.resourceType === 'form';
  }

  onSearchChange(value: string) {
    this.searchChange.emit(value);
  }

  onClearSearch() {
    this.clearSearch.emit();
  }

  getRoute(item: ResourceItem) {
    return this.isFormResource ? ['/form', item.uniqueId] : ['/chat', item.uniqueId];
  }

  getTooltip(item: ResourceItem) {
    if (this.isFormResource) {
      const form = item as N8nFormItem;
      return form.description || (form.webhookWorkflow ?? form.formWorkflow)?.name;
    }
    const chat = item as N8nChatItem;
    return chat.description || chat.webhookWorkflow?.name;
  }

  isNetworkItem(item: ResourceItem) {
    if (this.isFormResource) {
      return !!(item as N8nFormItem).isNetworkForm;
    }
    return !!(item as N8nChatItem).isNetworkChat;
  }

  getNetworkTooltip() {
    return this.isFormResource ? 'Network Form' : 'Network Chat';
  }
}
