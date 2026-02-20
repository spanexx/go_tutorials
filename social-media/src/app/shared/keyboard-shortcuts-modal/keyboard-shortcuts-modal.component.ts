import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Keyboard } from 'lucide-angular';
import { KeyboardShortcutsService } from '../../shared/services/keyboard-shortcuts.service';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './keyboard-shortcuts-modal.component.html',
  styleUrls: ['./keyboard-shortcuts-modal.component.scss']
})
export class KeyboardShortcutsModalComponent {
  closeIcon = X;
  keyboardIcon = Keyboard;

  constructor(private shortcutsService: KeyboardShortcutsService) {}

  showModal = this.shortcutsService.showModal;
  shortcutsByCategory = this.shortcutsService.getShortcutsByCategory();

  closeModal(): void {
    this.shortcutsService.hide();
  }

  toggleModal(): void {
    this.shortcutsService.toggle();
  }

  formatKeys(keys: string): string[] {
    return keys.split(' ').map(key => key.trim());
  }
}
