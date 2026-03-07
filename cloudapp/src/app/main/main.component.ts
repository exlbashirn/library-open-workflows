import { Component, OnDestroy, OnInit } from '@angular/core';
import { debounce } from 'lodash';
import { forkJoin } from 'rxjs';
import { AppService, N8nChatItem, N8nFormItem, ResourceType } from '../app.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = true;
  loadError = false;
  searching = false;
  searchValue = '';

  get activeTab(): ResourceType { return this.appService.activeResourceTab; }
  get activeTabIndex(): number { return this.activeTab === 'form' ? 0 : 1; }

  forms: N8nFormItem[] = [];
  chats: N8nChatItem[] = [];

  private _forms: N8nFormItem[] = [];
  private _chats: N8nChatItem[] = [];

  constructor(private appService: AppService) { }

  ngOnInit() {
    this.loading = true;
    this.loadError = false;
    forkJoin([
      this.appService.getUserAccessibleForms(),
      this.appService.getUserAccessibleChats()
    ]).subscribe({
      next: ([forms, chats]) => {
        this._forms = forms;
        this._chats = chats;
        this.forms = [...forms];
        this.chats = [...chats];
        this.appService.autoSelectTab(forms.length, chats.length);
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void { }

  retryLoad() {
    this.ngOnInit();
  }

  onTabChange(index: number) {
    this.appService.tabExplicitlySelected = true;
    this.appService.activeResourceTab = index === 0 ? 'form' : 'chat';
    // Search state resets on tab switch
    this.filterList.cancel();
    this.clearSearch();
    this.searching = false;
  }

  onSearchChange(searchValue: string) {
    if (searchValue.trim().length > 0) {
      this.searchValue = searchValue;
      if (this.searchValue.length > 2) {
        this.searching = true;
        this.filterList();
      }
    } else {
      this.filterList.cancel();
      this.clearSearch();
      this.searching = false;
    }
  }

  filterList = debounce(() => {
    const term = this.searchValue.toLowerCase();
    if (this.appService.activeResourceTab === 'form') {
      this.forms = this._forms.filter(f =>
        f.name.toLowerCase().includes(term) || f.description.toLowerCase().includes(term)
      );
    } else {
      this.chats = this._chats.filter(c =>
        c.name.toLowerCase().includes(term) || c.description.toLowerCase().includes(term)
      );
    }
    this.searching = false;
  }, 1000);

  clearSearch() {
    this.forms = [...this._forms];
    this.chats = [...this._chats];
    this.searchValue = '';
  }

}
