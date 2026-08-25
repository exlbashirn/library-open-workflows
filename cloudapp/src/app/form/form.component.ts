import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppService, type N8nFormItem } from '../app.service';
import type { IframeHostStrategy } from '../shared/iframe-host/iframe-host.component';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class FormComponent {

  readonly strategy: IframeHostStrategy;

  constructor(
    private appService: AppService,
    private settingsService: CloudAppSettingsService,
    private sanitizer: DomSanitizer
  ) {
    this.strategy = (routeId) => forkJoin([
      this.appService.getUserAccessibleForms(),
      this.appService.getN8nInstanceUrl(),
      this.settingsService.get()
    ]).pipe(map(([forms, n8nUrl, settings]: [N8nFormItem[], string, any]) => {
      if (n8nUrl?.endsWith('/')) n8nUrl = n8nUrl.slice(0, -1);

      const form = forms.find(f => String(f.uniqueId) === routeId);
      if (!form) return { item: null, url: null };

      const path = `/form/${form.path}`;
      let url: URL;
      if (form.auth || !n8nUrl) {
        const endpoint = form.isNetworkForm ? '/infra/watp-network' : '/infra/watp';
        url = new URL(`${endpoint}${path}`, location.origin);
      } else {
        const _n8nUrl = new URL(n8nUrl);
        url = new URL(_n8nUrl.pathname !== '/' ? _n8nUrl.pathname + path : path, _n8nUrl.origin);
      }
      const defaultParams = this.getParamMap(form.defaultParams);
      const userDefaultParams = this.getParamMap(settings?.defaultParams?.[this.appService.getFormKey(form)]);
      const finalParams = Object.assign({}, defaultParams, userDefaultParams);
      for (const [key, values] of Object.entries(finalParams)) {
        for (const value of values as string[]) {
          url.searchParams.append(key, value);
        }
      }
      return { item: form, url: this.sanitizer.bypassSecurityTrustResourceUrl(url.toString()) };
    }));
  }

  private getParamMap(params: { key: string; value: string; }[]): Record<string, string[]> {
    return (params ?? []).reduce((acc, p) => {
      acc[p.key] = acc[p.key] ?? [];
      acc[p.key].push(p.value);
      return acc;
    }, {} as Record<string, string[]>);
  }
}
