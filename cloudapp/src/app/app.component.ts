import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <app-banner [show]="showBanner" [message]="bannerMessage" (closed)="showBanner = false"></app-banner>
      <div style="flex: 1; overflow: auto;">
        <cloudapp-alert></cloudapp-alert>
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AppComponent {

  showBanner = true;
  bannerMessage = 'This version requires the April 2026 release';

  constructor() {
  }

}
