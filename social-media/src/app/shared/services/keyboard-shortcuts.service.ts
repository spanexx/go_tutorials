import { Injectable, signal, effect } from '@angular/core';
import { Router } from '@angular/router';

export interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private showModalSignal = signal(false);
  showModal = this.showModalSignal.asReadonly();

  private shortcuts: Shortcut[] = [
    { keys: 'g f', description: 'Go to Feed', category: 'Navigation' },
    { keys: 'g e', description: 'Go to Explore', category: 'Navigation' },
    { keys: 'g m', description: 'Go to Messages', category: 'Navigation' },
    { keys: 'g n', description: 'Go to Notifications', category: 'Navigation' },
    { keys: 'g p', description: 'Go to Profile', category: 'Navigation' },
    { keys: 'g b', description: 'Go to Bookmarks', category: 'Navigation' },
    { keys: 'g s', description: 'Go to Settings', category: 'Navigation' },
    { keys: 'g a', description: 'Go to Analytics', category: 'Navigation' },
    { keys: 'c', description: 'Compose new post', category: 'Actions' },
    { keys: '/', description: 'Focus search', category: 'Actions' },
    { keys: 't', description: 'Scroll to top', category: 'Actions' },
    { keys: '?', description: 'Show shortcuts help', category: 'Help' },
    { keys: 'esc', description: 'Close modal/dropdown', category: 'Help' }
  ];

  private keyBuffer: string[] = [];
  private bufferTimeout: any;
  private isInputFocused = false;

  constructor(private router: Router) {
    this.initKeyboardListener();
  }

  private initKeyboardListener(): void {
    document.addEventListener('keydown', (event) => {
      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      this.isInputFocused = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (this.isInputFocused && event.key !== 'Escape') {
        return;
      }

      // Handle Escape to close modal
      if (event.key === 'Escape') {
        this.hide();
        return;
      }

      // Handle help shortcut
      if (event.key === '?' && !event.shiftKey) {
        event.preventDefault();
        this.toggle();
        return;
      }

      // Handle single-key shortcuts
      if (event.key === 'c' && !this.isInputFocused) {
        event.preventDefault();
        this.navigateTo('/feed');
        // Could trigger create post focus here
        return;
      }

      if (event.key === '/' && !this.isInputFocused) {
        event.preventDefault();
        this.focusSearch();
        return;
      }

      if (event.key === 't' && !this.isInputFocused) {
        event.preventDefault();
        this.scrollToTop();
        return;
      }

      // Handle 'g' prefix for navigation
      if (event.key === 'g') {
        this.keyBuffer = ['g'];
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = setTimeout(() => {
          this.keyBuffer = [];
        }, 800);
        return;
      }

      // Handle second key after 'g'
      if (this.keyBuffer.length === 1 && this.keyBuffer[0] === 'g') {
        const secondKey = event.key.toLowerCase();
        
        switch (secondKey) {
          case 'f':
            event.preventDefault();
            this.navigateTo('/feed');
            break;
          case 'e':
            event.preventDefault();
            this.navigateTo('/explore');
            break;
          case 'm':
            event.preventDefault();
            this.navigateTo('/messages');
            break;
          case 'n':
            event.preventDefault();
            this.navigateTo('/notifications');
            break;
          case 'p':
            event.preventDefault();
            this.navigateTo('/profile/1');
            break;
          case 'b':
            event.preventDefault();
            this.navigateTo('/bookmarks');
            break;
          case 's':
            event.preventDefault();
            this.navigateTo('/settings');
            break;
          case 'a':
            event.preventDefault();
            this.navigateTo('/analytics');
            break;
        }

        this.keyBuffer = [];
        clearTimeout(this.bufferTimeout);
      }
    });
  }

  private navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  private focusSearch(): void {
    const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  show(): void {
    this.showModalSignal.set(true);
  }

  hide(): void {
    this.showModalSignal.set(false);
  }

  toggle(): void {
    this.showModalSignal.update(current => !current);
  }

  getShortcuts(): Shortcut[] {
    return this.shortcuts;
  }

  getShortcutsByCategory(): Map<string, Shortcut[]> {
    const categories = new Map<string, Shortcut[]>();
    
    for (const shortcut of this.shortcuts) {
      const existing = categories.get(shortcut.category) || [];
      existing.push(shortcut);
      categories.set(shortcut.category, existing);
    }
    
    return categories;
  }
}
