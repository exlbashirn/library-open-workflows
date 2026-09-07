import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { map } from 'rxjs/operators';
import { AppService, type N8nChatItem } from '../app.service';
import type { IframeHostStrategy } from '../shared/iframe-host/iframe-host.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent {

  readonly strategy: IframeHostStrategy;

  constructor(
    private appService: AppService,
    private sanitizer: DomSanitizer
  ) {
    this.strategy = (routeId) => forkJoin([
        this.appService.getUserAccessibleChats(),
        this.appService.getAlmaUrl()
      ]).pipe(map(([chats, almaUrl]: [N8nChatItem[], string]) => {
      if (almaUrl?.endsWith('/')) {
        almaUrl = almaUrl.slice(0, -1);
      }

      const chat = chats.find(c => String(c.uniqueId) === routeId);
      if (!chat) return { item: null, url: null };

      const path = `/webhook/${chat.path}/chat`;
      // Chats always route through the Alma proxy; auth is always true
      const endpoint = chat.isNetworkChat ? '/infra/watp-network' : '/infra/watp';
      const url = new URL(`${endpoint}${path}`, almaUrl);
      return { item: chat, url: this.sanitizer.bypassSecurityTrustResourceUrl(url.toString()) };
    }));
  }
}
