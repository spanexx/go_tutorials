import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Loader } from 'lucide-angular';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="loading-indicator" [class.visible]="visible">
      @if (visible) {
        <div class="loading-content">
          <lucide-angular [img]="loaderIcon" class="spinner"></lucide-angular>
          <span>{{ message }}</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['./loading-indicator.component.scss']
})
export class LoadingIndicatorComponent {
  @Input() visible: boolean = false;
  @Input() message: string = 'Loading more posts...';

  loaderIcon = Loader;
}
