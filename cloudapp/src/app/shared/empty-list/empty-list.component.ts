import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-list',
  templateUrl: './empty-list.component.html'
})
export class EmptyListComponent {

  @Input() text = 'No items available';

}
