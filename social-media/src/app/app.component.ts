import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { HeaderComponent } from './shared/header/header.component';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { KeyboardShortcutsModalComponent } from './shared/keyboard-shortcuts-modal/keyboard-shortcuts-modal.component';
import { QuickActionsComponent } from './shared/quick-actions/quick-actions.component';

import { ImageLightboxComponent } from './shared/image-lightbox/image-lightbox.component';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent, ToastContainerComponent, KeyboardShortcutsModalComponent, QuickActionsComponent, ImageLightboxComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Social Media App';
  private authService = inject(AuthService);

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated;
  }
}
