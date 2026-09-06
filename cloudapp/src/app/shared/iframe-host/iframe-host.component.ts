import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { AppService, IframeHostItem, EntityResolutionReadyResponse, EntityResolutionResponse, EntityResolutionError } from '../../app.service';
import { AlertService, Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { BannerState } from '../operation-status-banner/operation-status-banner.component';

export interface IframeHostContext {
  item: IframeHostItem | null;
  url: SafeResourceUrl | null;
}

export type IframeHostStrategy = (routeId: string) => Observable<IframeHostContext>;

const ENTITY_RESOLUTION_TIMEOUT_MESSAGE_DURATION_MS = 5000;

@Component({
  selector: 'app-iframe-host',
  templateUrl: './iframe-host.component.html',
  styleUrls: ['./iframe-host.component.scss']
})
export class IframeHostComponent implements OnInit, OnDestroy {

  @Input() strategy: IframeHostStrategy;
  @Input() notFoundMessage = 'Could not find the requested item';

  url: SafeResourceUrl | null = null;
  item: IframeHostItem | null = null;
  notFound = false;
  loading = true;
  bannerOpen = false;
  bannerState: BannerState = 'loading';
  bannerMessage = '';

  @ViewChild('iframe') iframeElement: ElementRef<HTMLIFrameElement>;

  private pageEntities: Entity[] = [];
  private postMessageHandler: ((event: MessageEvent) => void) | null = null;
  private entityResolutionRequestId = 0;
  private timeoutBannerCloseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private appService: AppService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.postMessageHandler = (event: MessageEvent) => this.handleIframeMessage(event);
    window.addEventListener('message', this.postMessageHandler);

    this.appService.getPageEntities().subscribe(entities => {
      this.pageEntities = entities;
    });

    this.route.paramMap.subscribe(params => {
      this.loading = true;
      this.notFound = false;
      this.item = null;
      this.url = null;

      const routeId = params.get('id');
      this.strategy(routeId).subscribe(({ item, url }) => {
        this.item = item;
        this.notFound = !item;
        if (!item) {
          this.loading = false;
        }
        if (item) {
          this.appService.setTitle(item.name);
          this.url = url;
        }
      });
    });
  }

  onIframeLoad(): void {
    this.loading = false;
  }

  ngOnDestroy(): void {
    if (this.timeoutBannerCloseTimer) {
      clearTimeout(this.timeoutBannerCloseTimer);
      this.timeoutBannerCloseTimer = null;
    }
    if (this.postMessageHandler) {
      window.removeEventListener('message', this.postMessageHandler);
      this.postMessageHandler = null;
    }
  }

  private async handleIframeMessage(event: MessageEvent): Promise<void> {
    const message = event.data;

    if (event.source !== this.iframeElement?.nativeElement?.contentWindow) {
      return;
    }

    if (message?.type === 'REQUEST_ENTITY_RESOLUTION_READY') {
      this.sendResolutionResponse({
        type: 'ENTITY_RESOLUTION_READY'
      });
      return;
    }

    if (message?.type === 'REQUEST_ENTITY_RESOLUTION_TIMEOUT') {
      this.entityResolutionRequestId++;
      this.bannerState = 'error';
      this.bannerMessage = 'Timed out while waiting for page context...';
      this.bannerOpen = true;
      if (this.timeoutBannerCloseTimer) {
        clearTimeout(this.timeoutBannerCloseTimer);
      }
      this.timeoutBannerCloseTimer = setTimeout(() => {
        this.bannerOpen = false;
        this.timeoutBannerCloseTimer = null;
      }, ENTITY_RESOLUTION_TIMEOUT_MESSAGE_DURATION_MS);
      return;
    }

    if (message?.type === 'REQUEST_ENTITY_RESOLUTION') {
      if (this.timeoutBannerCloseTimer) {
        clearTimeout(this.timeoutBannerCloseTimer);
        this.timeoutBannerCloseTimer = null;
      }
      const requestId = ++this.entityResolutionRequestId;
      if (!this.item?.includePageEntities) {
        this.sendResolutionResponse({
          type: 'ENTITY_RESOLUTION_ERROR',
          code: 'ERR_DISABLED',
          error: 'Entity resolution is not enabled for this item'
        });
        return;
      }

      const allowedTypes = this.item.allowedEntityTypes;
      const entitiesToResolve = allowedTypes?.length
        ? this.pageEntities.filter(e => allowedTypes.includes(e.type))
        : this.pageEntities;

      this.bannerOpen = true;
      this.bannerState = 'loading';
      this.bannerMessage = 'Getting page context data...';
      try {
        const resolvedData = await firstValueFrom(this.appService.resolveEntities(entitiesToResolve));
        if (requestId !== this.entityResolutionRequestId) return;
        this.bannerState = 'success';
        this.bannerMessage = 'Page context data loaded';
        this.sendResolutionResponse({
          type: 'ENTITY_RESOLUTION_RESPONSE',
          payload: resolvedData
        });
      } catch (err) {
        if (requestId !== this.entityResolutionRequestId) return;
        console.error('Error handling entity resolution request:', err);
        this.bannerState = 'error';
        this.bannerMessage = 'Failed to load page context data';
        this.alertService.error('Failed to resolve page entities. Proceeding without enriched data.');
        this.sendResolutionResponse({
          type: 'ENTITY_RESOLUTION_ERROR',
          code: 'ERR_FAILED',
          error: 'Failed to resolve entities',
          payload: entitiesToResolve
        });
      } finally {
        if (requestId === this.entityResolutionRequestId) {
          this.bannerOpen = false;
        }
      }
    }
  }

  /**
   * Sends a resolution response back to the iframe via postMessage.
   * Target origin is '*' intentionally: the iframe may be served from a different
   * origin (n8n direct URL or Alma proxy) that is not statically known at call time.
   */
  private sendResolutionResponse(response: EntityResolutionReadyResponse | EntityResolutionResponse | EntityResolutionError): void {
    if (!this.iframeElement?.nativeElement) return;
    this.iframeElement.nativeElement.contentWindow.postMessage(response, '*');
  }
}
