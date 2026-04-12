import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AppService, N8nChatItem } from '../app.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  url: SafeResourceUrl;
  chat: N8nChatItem;
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
        this.appService.getUserAccessibleChats(),
        this.appService.getAlmaUrl()
      ]).subscribe(([chats, almaUrl]) => {
        if (almaUrl?.endsWith('/')) {
          almaUrl = almaUrl.slice(0, -1);
        }

        const routeId = params.get('id');
        this.chat = chats.find(c => String(c.uniqueId) === routeId);
        this.notFound = !this.chat;

        if (this.chat) {
          this.appService.setTitle(this.chat.name);
          const path = `/webhook/${this.chat.path}/chat`;
          // Chats always route through the Alma proxy; auth is always true
          const endpoint = this.chat.isNetworkChat ? '/infra/watp-network' : '/infra/watp';
          const url = new URL(`${endpoint}${path}`, almaUrl);
          this.url = this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
        }

        this.loading = false;
      });
    });
  }

  onIframeLoad() {
    this.loading = false;
  }

}
