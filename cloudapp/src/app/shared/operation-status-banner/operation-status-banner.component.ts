import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

export type BannerState = 'loading' | 'success' | 'error';

/** Minimum time (ms) the banner stays visible so fast operations don't flash. */
const MIN_VISIBLE_MS = 1500;
/** Minimum time (ms) each state is shown before switching to the next. */
const MIN_STATE_MS = 1000;

@Component({
  selector: 'app-operation-status-banner',
  templateUrl: './operation-status-banner.component.html',
  styleUrls: ['./operation-status-banner.component.scss'],
  animations: [
    trigger('slideDown', [
      state('visible', style({ transform: 'translateY(0)', opacity: 1 })),
      state('hidden', style({ transform: 'translateY(-100%)', opacity: 0 })),
      transition('hidden => visible', animate('200ms ease-out')),
      transition('visible => hidden', animate('200ms ease-in')),
    ]),
    trigger('fadeSwap', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms ease', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('150ms ease', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class OperationStatusBannerComponent implements OnChanges, OnDestroy {
  /** Whether the operation is active. Set to false to begin the close sequence. */
  @Input() open = false;
  /** Current state of the operation. */
  @Input() state: BannerState = 'loading';
  /** Message displayed inside the banner. */
  @Input() message = '';

  /** Controls the Angular animation binding. */
  animationState: 'visible' | 'hidden' = 'hidden';
  /** The state actually rendered in the template — may lag behind @Input() state. */
  displayedState: BannerState = 'loading';
  /** The message actually rendered in the template — kept in sync with displayedState. */
  displayedMessage = '';

  /** Tracks when the banner was first shown, for minimum-visible enforcement. */
  private shownAt: number | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Tracks when the current displayed state was applied. */
  private stateShownAt: number | null = null;
  private pendingState: BannerState | null = null;
  private pendingMessage = '';
  private stateTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.show();
      } else {
        this.scheduleHide();
      }
    }
    if (changes['state'] || changes['message']) {
      this.scheduleStateChange(this.state, this.message);
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.clearStateTimer();
  }

  private show(): void {
    this.clearTimer();
    this.shownAt = Date.now();
    this.animationState = 'visible';
    // Apply initial state+message immediately when banner first opens
    this.displayedState = this.state;
    this.displayedMessage = this.message;
    this.stateShownAt = Date.now();
  }

  private scheduleHide(): void {
    if (this.animationState === 'hidden') return;

    const elapsed = this.shownAt != null ? Date.now() - this.shownAt : MIN_VISIBLE_MS;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    this.hideTimer = setTimeout(() => this.hide(), Math.max(remaining, MIN_STATE_MS));
  }

  private hide(): void {
    this.animationState = 'hidden';
    this.shownAt = null;
  }

  private clearTimer(): void {
    if (this.hideTimer != null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private scheduleStateChange(next: BannerState, nextMessage: string): void {
    // If banner isn't open yet, don't buffer — show() will apply on open
    if (this.animationState === 'hidden') return;
    if (next === this.displayedState && nextMessage === this.displayedMessage) return;

    const elapsed = this.stateShownAt != null ? Date.now() - this.stateShownAt : MIN_STATE_MS;
    const remaining = Math.max(0, MIN_STATE_MS - elapsed);

    this.pendingState = next;
    this.pendingMessage = nextMessage;
    this.clearStateTimer();

    if (remaining > 0) {
      this.stateTimer = setTimeout(() => this.applyPendingState(), remaining);
    } else {
      this.applyPendingState();
    }
  }

  private applyPendingState(): void {
    if (this.pendingState != null) {
      this.displayedState = this.pendingState;
      this.displayedMessage = this.pendingMessage;
      this.pendingState = null;
      this.pendingMessage = '';
      this.stateShownAt = Date.now();
    }
  }

  private clearStateTimer(): void {
    if (this.stateTimer != null) {
      clearTimeout(this.stateTimer);
      this.stateTimer = null;
    }
  }
}
