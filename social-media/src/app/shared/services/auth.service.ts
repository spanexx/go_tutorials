import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';

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

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
  };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
  };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseApiService {
  private authState = signal<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false
  });

  constructor(http: HttpClient) {
    super(http);
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

  /**
   * Login user with email and password
   * Calls backend API and stores token
   */
  login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      console.log('[AUTH-SERVICE] Login called with email:', email);
      this.authState.update(state => ({ ...state, isLoading: true }));

      this.post<LoginResponse>('/auth/login', { email, password }).subscribe({
        next: (response) => {
          console.log('[AUTH-SERVICE] Login response received:', response.user);
          const user: User = {
            id: response.user.id,
            email: response.user.email,
            username: response.user.username,
            name: response.user.display_name,
            avatar: response.user.avatar_url,
            bio: response.user.bio
          };

          this.authState.set({
            user,
            isAuthenticated: true,
            isLoading: false,
            token: response.access_token
          });

          console.log('[AUTH-SERVICE] User state updated, storing in localStorage');
          localStorage.setItem('socialhub_user', JSON.stringify(user));
          localStorage.setItem('socialhub_token', response.access_token);

          resolve({ success: true });
        },
        error: (error) => {
          console.error('[AUTH-SERVICE] Login error:', error);
          this.authState.update(state => ({ ...state, isLoading: false }));
          const errorMessage = error.error?.error || 'Login failed';
          resolve({ success: false, error: errorMessage });
        }
      });
    });
  }

  /**
   * Register new user
   * Calls backend API and stores token
   */
  register(name: string, email: string, password: string, username?: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      console.log('[AUTH-SERVICE] Register called with email:', email);
      this.authState.update(state => ({ ...state, isLoading: true }));

      // Use provided username or generate one if not provided
      const finalUsername = username || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

      this.post<RegisterResponse>('/auth/register', {
        email,
        password,
        username: finalUsername,
        display_name: name
      }).subscribe({
        next: (response) => {
          console.log('[AUTH-SERVICE] Registration response received:', response.user);
          const user: User = {
            id: response.user.id,
            email: response.user.email,
            username: response.user.username,
            name: response.user.display_name,
            avatar: response.user.avatar_url,
            bio: response.user.bio
          };

          this.authState.set({
            user,
            isAuthenticated: true,
            isLoading: false,
            token: response.access_token
          });

          console.log('[AUTH-SERVICE] User state updated, storing in localStorage');
          localStorage.setItem('socialhub_user', JSON.stringify(user));
          localStorage.setItem('socialhub_token', response.access_token);

          resolve({ success: true });
        },
        error: (error) => {
          console.error('[AUTH-SERVICE] Registration error:', error);
          this.authState.update(state => ({ ...state, isLoading: false }));
          const errorMessage = error.error?.error || 'Registration failed';
          resolve({ success: false, error: errorMessage });
        }
      });
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

  /**
   * Verify email address with token
   */
  verifyEmail(token: string) {
    return this.post('/auth/verify-email', { token });
  }

  /**
   * Resend verification email
   */
  resendVerificationEmail(email: string) {
    return this.post('/auth/resend-verification', { email });
  }

  /**
   * Request password reset
   */
  forgotPassword(email: string) {
    return this.post('/auth/forgot-password', { email });
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string) {
    return this.post('/auth/reset-password', {
      token,
      new_password: newPassword
    });
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return this.authState().user;
  }
}
