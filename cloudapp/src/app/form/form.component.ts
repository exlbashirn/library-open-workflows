import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AppService, N8nFormItem } from '../app.service';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class FormComponent implements OnInit {

  url: SafeResourceUrl;
  form: N8nFormItem;
  notFound = false;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private appService: AppService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      forkJoin([
        this.appService.getForms(),
        this.appService.getN8nInstanceUrl(),
        this.appService.getAlmaUrl(),
      ]).subscribe(([forms, n8nUrl, almaUrl]) => {
        this.form = forms.find(f => f.id === +params.get('id'));
        this.notFound = !this.form;
        if (this.form) {
          this.appService.setTitle(this.form.name);
          if (this.form.auth) {
            this.url = this.sanitizer.bypassSecurityTrustResourceUrl(`${almaUrl}/infra/watp/form/${this.form.path}`);
          } else {
            this.url = this.sanitizer.bypassSecurityTrustResourceUrl(`${n8nUrl}/form/${this.form.path}`);
          }
        }
      })
    });
  }

  onIframeLoad() {
    this.loading = false;
  }

}
