import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export type ActionType = 'navigation' | 'action' | 'setting';

export interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type: ActionType;
  shortcut?: string;
  action: () => void;
  category: string;
  keywords: string[];
}

@Injectable({
  providedIn: 'root'
})
export class QuickActionsService {
  private showModalSignal = signal(false);
  showModal = this.showModalSignal.asReadonly();

  private searchQuerySignal = signal('');
  searchQuery = this.searchQuerySignal.asReadonly();

  private selectedIndexSignal = signal(0);
  selectedIndex = this.selectedIndexSignal.asReadonly();

  private actions: QuickAction[] = [];

  constructor(private router: Router) {
    this.initializeActions();
    this.initKeyboardListener();
  }

  private initializeActions(): void {
    this.actions = [
      // Navigation
      {
        id: 'go-feed',
        title: 'Go to Feed',
        description: 'View your home feed',
        icon: 'home',
        type: 'navigation',
        shortcut: 'G F',
        action: () => this.router.navigate(['/feed']),
        category: 'Navigation',
        keywords: ['feed', 'home', 'posts', 'timeline']
      },
      {
        id: 'go-explore',
        title: 'Go to Explore',
        description: 'Discover trending topics',
        icon: 'compass',
        type: 'navigation',
        shortcut: 'G E',
        action: () => this.router.navigate(['/explore']),
        category: 'Navigation',
        keywords: ['explore', 'discover', 'trending', 'search']
      },
      {
        id: 'go-messages',
        title: 'Go to Messages',
        description: 'View your conversations',
        icon: 'mail',
        type: 'navigation',
        shortcut: 'G M',
        action: () => this.router.navigate(['/messages']),
        category: 'Navigation',
        keywords: ['messages', 'chat', 'dm', 'conversations']
      },
      {
        id: 'go-notifications',
        title: 'Go to Notifications',
        description: 'View your activity',
        icon: 'bell',
        type: 'navigation',
        shortcut: 'G N',
        action: () => this.router.navigate(['/notifications']),
        category: 'Navigation',
        keywords: ['notifications', 'alerts', 'activity', 'updates']
      },
      {
        id: 'go-profile',
        title: 'Go to Profile',
        description: 'View your profile',
        icon: 'user',
        type: 'navigation',
        shortcut: 'G P',
        action: () => this.router.navigate(['/profile/1']),
        category: 'Navigation',
        keywords: ['profile', 'account', 'me', 'my page']
      },
      {
        id: 'go-bookmarks',
        title: 'Go to Bookmarks',
        description: 'View saved posts',
        icon: 'bookmark',
        type: 'navigation',
        shortcut: 'G B',
        action: () => this.router.navigate(['/bookmarks']),
        category: 'Navigation',
        keywords: ['bookmarks', 'saved', 'favorites']
      },
      {
        id: 'go-settings',
        title: 'Go to Settings',
        description: 'Manage your settings',
        icon: 'settings',
        type: 'navigation',
        shortcut: 'G S',
        action: () => this.router.navigate(['/settings']),
        category: 'Navigation',
        keywords: ['settings', 'preferences', 'options', 'config']
      },
      {
        id: 'go-analytics',
        title: 'Go to Analytics',
        description: 'View your stats',
        icon: 'bar-chart',
        type: 'navigation',
        shortcut: 'G A',
        action: () => this.router.navigate(['/analytics']),
        category: 'Navigation',
        keywords: ['analytics', 'stats', 'performance', 'metrics']
      },
      // Actions
      {
        id: 'compose-post',
        title: 'Create New Post',
        description: 'Share your thoughts',
        icon: 'pen',
        type: 'action',
        shortcut: 'C',
        action: () => {
          this.router.navigate(['/feed']);
          // Could focus create post input here
        },
        category: 'Actions',
        keywords: ['post', 'create', 'compose', 'write', 'new']
      },
      {
        id: 'search',
        title: 'Search',
        description: 'Search posts and people',
        icon: 'search',
        type: 'action',
        shortcut: '/',
        action: () => {
          const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        },
        category: 'Actions',
        keywords: ['search', 'find', 'lookup']
      },
      {
        id: 'refresh-feed',
        title: 'Refresh Feed',
        description: 'Load latest posts',
        icon: 'refresh',
        type: 'action',
        action: () => window.location.reload(),
        category: 'Actions',
        keywords: ['refresh', 'reload', 'update', 'sync']
      },
      // Settings
      {
        id: 'toggle-theme',
        title: 'Toggle Theme',
        description: 'Switch between light and dark',
        icon: 'moon',
        type: 'setting',
        action: () => {
          const root = document.documentElement;
          root.classList.toggle('dark');
          localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
        },
        category: 'Settings',
        keywords: ['theme', 'dark', 'light', 'mode', 'appearance']
      },
      {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'View all shortcuts',
        icon: 'keyboard',
        type: 'setting',
        action: () => this.show(),
        category: 'Settings',
        keywords: ['shortcuts', 'keyboard', 'hotkeys', 'commands']
      }
    ];
  }

  private initKeyboardListener(): void {
    document.addEventListener('keydown', (event) => {
      // Cmd/Ctrl + K to open
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        this.toggle();
        return;
      }

      // Handle navigation when modal is open
      if (this.showModalSignal()) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.navigate(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.navigate(-1);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          this.executeSelected();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          this.hide();
        }
      }
    });
  }

  show(): void {
    this.searchQuerySignal.set('');
    this.selectedIndexSignal.set(0);
    this.showModalSignal.set(true);
  }

  hide(): void {
    this.showModalSignal.set(false);
  }

  toggle(): void {
    this.showModalSignal.update(current => !current);
  }

  setSearchQuery(query: string): void {
    this.searchQuerySignal.set(query);
    this.selectedIndexSignal.set(0);
  }

  navigate(direction: number): void {
    const filtered = this.getFilteredActions();
    const newIndex = this.selectedIndexSignal() + direction;
    if (newIndex >= 0 && newIndex < filtered.length) {
      this.selectedIndexSignal.set(newIndex);
    }
  }

  setSelectedIndex(index: number): void {
    this.selectedIndexSignal.set(index);
  }

  executeSelected(): void {
    const filtered = this.getFilteredActions();
    const selected = filtered[this.selectedIndexSignal()];
    if (selected) {
      selected.action();
      this.hide();
    }
  }

  getFilteredActions(): QuickAction[] {
    const query = this.searchQuerySignal().toLowerCase().trim();
    if (!query) {
      return this.actions.slice(0, 8); // Show first 8 by default
    }

    return this.actions.filter(action =>
      action.title.toLowerCase().includes(query) ||
      action.description?.toLowerCase().includes(query) ||
      action.keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
      action.category.toLowerCase().includes(query)
    );
  }

  getActionsByCategory(): Map<string, QuickAction[]> {
    const query = this.searchQuerySignal().toLowerCase().trim();
    let filtered = this.actions;

    if (query) {
      filtered = this.actions.filter(action =>
        action.title.toLowerCase().includes(query) ||
        action.description?.toLowerCase().includes(query) ||
        action.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    const categories = new Map<string, QuickAction[]>();
    for (const action of filtered) {
      const existing = categories.get(action.category) || [];
      existing.push(action);
      categories.set(action.category, existing);
    }

    return categories;
  }

  getIconName(action: QuickAction): string {
    return action.icon;
  }
}
