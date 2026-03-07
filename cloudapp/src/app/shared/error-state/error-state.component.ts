import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  styleUrls: ['./error-state.component.scss']
})
export class ErrorStateComponent {

  @Input() message = 'Something went wrong. Please try again.';
  @Input() buttonText = 'Retry';
  @Output() retry = new EventEmitter<void>();

  onRetry() {
    this.retry.emit();
  }

}
