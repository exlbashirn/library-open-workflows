import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-resource-tab-label',
  templateUrl: './resource-tab-label.component.html',
  styleUrls: ['./resource-tab-label.component.scss']
})
export class ResourceTabLabelComponent {

  @Input() icon = '';
  @Input() title = '';
  @Input() count = 0;

}
