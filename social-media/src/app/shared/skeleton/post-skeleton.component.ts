import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-post-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="post-skeleton">
      <div class="post-header">
        <app-skeleton variant="avatar" width="40px" height="40px"></app-skeleton>
        <div class="post-author">
          <app-skeleton variant="text" width="150px" height="16px"></app-skeleton>
          <app-skeleton variant="text" width="100px" height="12px"></app-skeleton>
        </div>
      </div>
      
      <div class="post-content">
        <app-skeleton variant="text" width="100%" height="16px"></app-skeleton>
        <app-skeleton variant="text" width="90%" height="16px"></app-skeleton>
        <app-skeleton variant="text" width="60%" height="16px"></app-skeleton>
      </div>
      
      <div class="post-image">
        <app-skeleton variant="image" width="100%" height="200px"></app-skeleton>
      </div>
      
      <div class="post-actions">
        <app-skeleton variant="button" width="80px" height="36px"></app-skeleton>
        <app-skeleton variant="button" width="80px" height="36px"></app-skeleton>
        <app-skeleton variant="button" width="80px" height="36px"></app-skeleton>
      </div>
    </div>
  `,
  styleUrls: ['./post-skeleton.component.scss']
})
export class PostSkeletonComponent {
}
