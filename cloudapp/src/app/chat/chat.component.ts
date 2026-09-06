import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { map } from 'rxjs/operators';
import { AppService, type N8nChatItem } from '../app.service';
import type { IframeHostStrategy } from '../shared/iframe-host/iframe-host.component';

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
    this.strategy = (routeId) => this.appService.getUserAccessibleChats()
    .pipe(map((chats: N8nChatItem[]) => {
      const chat = chats.find(c => String(c.uniqueId) === routeId);
      if (!chat) return { item: null, url: null };

      const path = `/webhook/${chat.path}/chat`;
      // Chats always route through the Alma proxy; auth is always true
      const endpoint = chat.isNetworkChat ? '/infra/watp-network' : '/infra/watp';
      const url = new URL(`${endpoint}${path}`, location.origin);
      return { item: chat, url: this.sanitizer.bypassSecurityTrustResourceUrl(url.toString()) };
    }));
  }
}
