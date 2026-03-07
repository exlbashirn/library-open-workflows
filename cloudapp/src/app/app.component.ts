import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<app-banner [show]="showBanner" [message]="bannerMessage"></app-banner><cloudapp-alert></cloudapp-alert><router-outlet></router-outlet>'
})
export class AppComponent {

  showBanner = true;
  bannerMessage = 'This version requires the April 2026 release';

  constructor() {
  }

}
