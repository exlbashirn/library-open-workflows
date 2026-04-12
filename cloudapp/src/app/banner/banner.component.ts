import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss']
})
export class BannerComponent {
    @Input() message: string;
    @Input() show: boolean = true;
    @Output() closed = new EventEmitter<void>();

    close(): void {
        this.show = false;
        this.closed.emit();
    }
}