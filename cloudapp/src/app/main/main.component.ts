import { Component, OnDestroy, OnInit } from '@angular/core';
import { debounce } from 'lodash';
import { AppService, N8nFormItem } from '../app.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  searching = false;
  searchValue: string;
  forms: N8nFormItem[];

  private _forms: N8nFormItem[];

  constructor(
    private appService: AppService
  ) { }

  ngOnInit() {
    this.appService.getUserAccessibleForms().subscribe(forms => {
      this._forms = forms;
      this.forms = [...forms];
      this.loading = false;
    })
  }

  ngOnDestroy(): void {
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
    this.forms = this._forms.filter(f => {
      return f.name.toLowerCase().indexOf(this.searchValue.toLowerCase()) > -1
        || f.description.toLowerCase().indexOf(this.searchValue.toLowerCase()) > -1
    });
    this.searching = false;
  }, 1000)

  clearSearch() {
    this.forms = [...this._forms];
    this.searchValue = '';
  }

}