import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { debugError, debugLog } from '../utils/debug-logger';

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

type AuthFieldErrors = Partial<Record<'name' | 'username' | 'email' | 'password', string>>;

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
  login(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; fieldErrors?: AuthFieldErrors }> {
    return new Promise((resolve) => {
      debugLog('AuthService', 'login() called', { email });
      console.log('[AUTH-SERVICE] Login called with email:', email);
      this.authState.update(state => ({ ...state, isLoading: true }));

      this.post<LoginResponse>('/auth/login', { email, password }).subscribe({
        next: (response) => {
          debugLog('AuthService', 'login() response received', { userId: response.user.id });
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

          debugLog('AuthService', 'login() success: storing session');
          console.log('[AUTH-SERVICE] User state updated, storing in localStorage');
          localStorage.setItem('socialhub_user', JSON.stringify(user));
          localStorage.setItem('socialhub_token', response.access_token);

          resolve({ success: true });
        },
        error: (error) => {
          debugError('AuthService', 'login() error', error);
          console.error('[AUTH-SERVICE] Login error:', error);
          this.authState.update(state => ({ ...state, isLoading: false }));

          const rawErrorMessage = error?.error?.error;
          const errorMessage = rawErrorMessage || 'Login failed';
          const fieldErrors: AuthFieldErrors = {};

          if (typeof rawErrorMessage === 'string') {
            const keyMatch = rawErrorMessage.match(/LoginRequest\.([A-Za-z]+)/);
            const tagMatch = rawErrorMessage.match(/failed on the '([^']+)' tag/);

            if (keyMatch && tagMatch) {
              const rawField = keyMatch[1].toLowerCase();
              const tag = tagMatch[1];

              if (rawField === 'email') {
                if (tag === 'email') {
                  fieldErrors.email = 'Please enter a valid email address.';
                } else {
                  fieldErrors.email = 'Email is required.';
                }
              }

              if (rawField === 'password') {
                fieldErrors.password = 'Password is required.';
              }
            }
          }

          resolve({ success: false, error: errorMessage, fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined });
        }
      });
    });
  }

  /**
   * Register new user
   * Calls backend API and stores token
   */
  register(
    name: string,
    email: string,
    password: string,
    username?: string
  ): Promise<{ success: boolean; error?: string; fieldErrors?: AuthFieldErrors }> {
    return new Promise((resolve) => {
      debugLog('AuthService', 'register() called', { email, username });
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
          debugLog('AuthService', 'register() response received', { userId: response.user.id });
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

          debugLog('AuthService', 'register() success: storing session');
          console.log('[AUTH-SERVICE] User state updated, storing in localStorage');
          localStorage.setItem('socialhub_user', JSON.stringify(user));
          localStorage.setItem('socialhub_token', response.access_token);

          resolve({ success: true });
        },
        error: (error) => {
          debugError('AuthService', 'register() error', error);
          console.error('[AUTH-SERVICE] Registration error:', error);
          this.authState.update(state => ({ ...state, isLoading: false }));

          const rawErrorMessage = error?.error?.error;
          const errorMessage = rawErrorMessage || 'Registration failed';
          const fieldErrors: AuthFieldErrors = {};

          if (typeof rawErrorMessage === 'string') {
            const keyMatch = rawErrorMessage.match(/RegisterRequest\.([A-Za-z]+)/);
            const tagMatch = rawErrorMessage.match(/failed on the '([^']+)' tag/);

            if (keyMatch && tagMatch) {
              const rawField = keyMatch[1].toLowerCase();
              const tag = tagMatch[1];

              if (rawField === 'username') {
                if (tag === 'alphanum') {
                  fieldErrors.username = 'Username must contain only letters and numbers.';
                } else if (tag === 'min') {
                  fieldErrors.username = 'Username must be at least 3 characters.';
                } else if (tag === 'max') {
                  fieldErrors.username = 'Username must be at most 30 characters.';
                } else {
                  fieldErrors.username = 'Invalid username.';
                }
              }

              if (rawField === 'email') {
                fieldErrors.email = 'Please enter a valid email address.';
              }

              if (rawField === 'password') {
                fieldErrors.password = 'Password is invalid.';
              }

              if (rawField === 'displayname') {
                fieldErrors.name = 'Name is required.';
              }
            }
          }

          resolve({ success: false, error: errorMessage, fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined });
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
