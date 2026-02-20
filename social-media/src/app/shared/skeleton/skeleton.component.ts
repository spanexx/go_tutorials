import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton" 
      [class.skeleton-avatar]="variant === 'avatar'"
      [class.skeleton-text]="variant === 'text'"
      [class.skeleton-title]="variant === 'title'"
      [class.skeleton-button]="variant === 'button'"
      [class.skeleton-image]="variant === 'image'"
      [class.skeleton-card]="variant === 'card'"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="borderRadius"
    ></div>
  `,
  styleUrls: ['./skeleton.component.scss']
})
export class SkeletonComponent {
  @Input() variant: 'avatar' | 'text' | 'title' | 'button' | 'image' | 'card' = 'text';
  @Input() width?: string;
  @Input() height?: string;
  @Input() borderRadius?: string;
}
