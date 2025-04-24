import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { forkJoin, map } from 'rxjs';
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
    private settingsService: CloudAppSettingsService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      forkJoin([
        this.appService.getUserAccessibleForms(),
        this.appService.getN8nInstanceUrl(),
        this.appService.getAlmaUrl(),
        this.settingsService.get()
      ]).pipe(map(([forms, n8nUrl, almaUrl, settings]) => {
        if (almaUrl?.endsWith("/")) {
          almaUrl = almaUrl.slice(0, -1);
        }
        if (n8nUrl?.endsWith("/")) {
          n8nUrl = n8nUrl.slice(0, -1);
        }
        return [forms, n8nUrl, almaUrl, settings];
      })).subscribe(([forms, n8nUrl, almaUrl, settings]: [N8nFormItem[], string, string, any]) => {
        this.form = forms.find(f => f.id === +params.get('id'));
        this.notFound = !this.form;
        if (this.form) {
          this.appService.setTitle(this.form.name);
          const path = `/form/${this.form.path}`;
          let url: URL;
          if (this.form.auth) {
            url = new URL(`/infra/watp${path}`, almaUrl);
          } else {
            const _n8nUrl = new URL(n8nUrl);
            url = new URL(_n8nUrl.pathname !== '/' ? _n8nUrl.pathname + path : path, _n8nUrl.origin);
          }
          const defaultParams = this.getParamMap(this.form.defaultParams);
          const userDefaultParams = this.getParamMap(settings?.defaultParams?.[this.appService.getFormKey(this.form)]);
          const finalParams = Object.assign({}, defaultParams, userDefaultParams);
          for (const [key, values] of Object.entries(finalParams)) {
            for (const value of values as []) {
              url.searchParams.append(key, value);
            }
          }
          this.url = this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
        }
      })
    });
  }

  private getParamMap(params: { key: string; value: string; }[]) {
    return (params ?? []).reduce((acc, p) => {
      acc[p.key] = acc[p.key] ?? [];
      acc[p.key].push(p.value);
      return acc;
    }, {});
  }

  onIframeLoad() {
    this.loading = false;
  }

}
