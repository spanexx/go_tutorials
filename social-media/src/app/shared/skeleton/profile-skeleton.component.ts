import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-profile-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="profile-skeleton">
      <div class="profile-header">
        <div class="cover-image">
          <app-skeleton variant="image" width="100%" height="200px" borderRadius="0"></app-skeleton>
        </div>
        
        <div class="profile-info">
          <app-skeleton variant="avatar" width="120px" height="120px"></app-skeleton>
          
          <div class="profile-details">
            <app-skeleton variant="title" width="200px" height="32px"></app-skeleton>
            <app-skeleton variant="text" width="120px" height="16px"></app-skeleton>
            <app-skeleton variant="text" width="300px" height="16px"></app-skeleton>
            
            <div class="profile-meta">
              <app-skeleton variant="text" width="150px" height="16px"></app-skeleton>
              <app-skeleton variant="text" width="150px" height="16px"></app-skeleton>
            </div>
            
            <div class="profile-stats">
              <div class="stat">
                <app-skeleton variant="title" width="50px" height="28px"></app-skeleton>
                <app-skeleton variant="text" width="40px" height="14px"></app-skeleton>
              </div>
              <div class="stat">
                <app-skeleton variant="title" width="60px" height="28px"></app-skeleton>
                <app-skeleton variant="text" width="50px" height="14px"></app-skeleton>
              </div>
              <div class="stat">
                <app-skeleton variant="title" width="60px" height="28px"></app-skeleton>
                <app-skeleton variant="text" width="50px" height="14px"></app-skeleton>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="profile-tabs">
        <app-skeleton variant="button" width="100px" height="40px"></app-skeleton>
        <app-skeleton variant="button" width="100px" height="40px"></app-skeleton>
        <app-skeleton variant="button" width="100px" height="40px"></app-skeleton>
      </div>
    </div>
  `,
  styleUrls: ['./profile-skeleton.component.scss']
})
export class ProfileSkeletonComponent {
}
