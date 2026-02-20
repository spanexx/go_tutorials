import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { HeaderComponent } from './shared/header/header.component';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { KeyboardShortcutsModalComponent } from './shared/keyboard-shortcuts-modal/keyboard-shortcuts-modal.component';
import { QuickActionsComponent } from './shared/quick-actions/quick-actions.component';
import { SharePostModalComponent } from './shared/share-post-modal/share-post-modal.component';
import { ImageLightboxComponent } from './shared/image-lightbox/image-lightbox.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent, ToastContainerComponent, KeyboardShortcutsModalComponent, QuickActionsComponent, SharePostModalComponent, ImageLightboxComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Social Media App';
}
