import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private theme = signal<'light' | 'dark'>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const root = document.documentElement;
      if (this.theme() === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', this.theme());
    });
  }

  private getInitialTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) return stored;
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  getTheme() {
    return this.theme();
  }

  toggleTheme() {
    this.theme.update(current => current === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
  }
}
