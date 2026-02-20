import { Injectable, signal, computed } from '@angular/core';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
  bio?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authState = signal<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  constructor() {
    this.loadUserFromStorage();
    this.loadTokenFromStorage();
  }

  private loadUserFromStorage(): void {
    const stored = localStorage.getItem('socialhub_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.authState.set({
          user,
          isAuthenticated: true,
          isLoading: false
        });
      } catch {
        this.authState.set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } else {
      this.authState.set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }

  get user(): User | null {
    return this.authState().user;
  }

  get isAuthenticated(): boolean {
    return this.authState().isAuthenticated;
  }

  get isLoading(): boolean {
    return this.authState().isLoading;
  }

  login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email && password.length >= 6) {
          const user: User = {
            id: '1',
            email,
            username: email.split('@')[0],
            name: email.split('@')[0].replace('.', ' '),
            avatar: 'https://i.pravatar.cc/150?img=1'
          };

          this.authState.set({
            user,
            isAuthenticated: true,
            isLoading: false
          });

          localStorage.setItem('socialhub_user', JSON.stringify(user));
          resolve({ success: true });
        } else {
          resolve({ 
            success: false, 
            error: password.length < 6 ? 'Password must be at least 6 characters' : 'Invalid credentials' 
          });
        }
      }, 800);
    });
  }

  register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (name && email && password.length >= 6) {
          const user: User = {
            id: Date.now().toString(),
            email,
            username: email.split('@')[0],
            name,
            avatar: 'https://i.pravatar.cc/150?img=1'
          };

          this.authState.set({
            user,
            isAuthenticated: true,
            isLoading: false
          });

          localStorage.setItem('socialhub_user', JSON.stringify(user));
          resolve({ success: true });
        } else {
          resolve({ 
            success: false, 
            error: password.length < 6 ? 'Password must be at least 6 characters' : 'All fields are required' 
          });
        }
      }, 800);
    });
  }

  logout(): void {
    localStorage.removeItem('socialhub_user');
    localStorage.removeItem('socialhub_token');
    this.authState.set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: undefined
    });
  }

  updateProfile(updates: Partial<User>): void {
    if (this.authState().user) {
      const updatedUser = { ...this.authState().user!, ...updates };
      this.authState.set({
        user: updatedUser,
        isAuthenticated: true,
        isLoading: false
      });
      localStorage.setItem('socialhub_user', JSON.stringify(updatedUser));
    }
  }

  /**
   * Get the current JWT token
   * Used by the auth interceptor to attach to API requests
   */
  getToken(): string | null {
    return this.authState().token || null;
  }

  /**
   * Set the authentication token
   * Called after successful login/register
   */
  setToken(token: string): void {
    this.authState.update(state => ({
      ...state,
      token
    }));
    localStorage.setItem('socialhub_token', token);
  }

  /**
   * Load token from localStorage on initialization
   */
  private loadTokenFromStorage(): void {
    const token = localStorage.getItem('socialhub_token');
    if (token && this.authState().isAuthenticated) {
      this.authState.update(state => ({
        ...state,
        token
      }));
    }
  }
}
