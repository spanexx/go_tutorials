// Code Map: reset-password.component.ts
// - ResetPasswordComponent: Password reset with token page
// - Handles token from URL query params
// - New password form with validation
// - Password strength indicator
// CID: Frontend Email Flow - 1.6.9
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LucideAngularModule, Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-angular';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
  template: `
    <div class="reset-password-container">
      <div class="reset-card">
        @if (invalidToken()) {
          <!-- Invalid Token -->
          <div class="reset-content error">
            <lucide-angular name="x-circle" class="icon error-icon"></lucide-angular>
            <h1>Invalid Reset Link</h1>
            <p>This password reset link is invalid or has expired. Please request a new one.</p>
            <a routerLink="/auth/forgot-password" class="btn btn-primary">
              <lucide-angular name="mail"></lucide-angular>
              Request New Link
            </a>
          </div>
        } @else if (success()) {
          <!-- Success -->
          <div class="reset-content success">
            <lucide-angular name="check-circle" class="icon success-icon"></lucide-angular>
            <h1>Password Reset!</h1>
            <p>Your password has been successfully reset. You can now log in with your new password.</p>
            <a routerLink="/auth/login" class="btn btn-primary">
              <lucide-angular name="lock"></lucide-angular>
              Go to Login
            </a>
          </div>
        } @else {
          <!-- Reset Form -->
          <div class="reset-content">
            <div class="header">
              <lucide-angular name="lock" class="icon"></lucide-angular>
              <h1>Reset Password</h1>
              <p>Enter your new password below.</p>
            </div>

            <form (ngSubmit)="onSubmit()" class="form">
              <div class="form-group">
                <label for="password">New Password</label>
                <div class="password-input">
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    id="password"
                    name="password"
                    [(ngModel)]="password"
                    placeholder="Enter new password"
                    required
                    minlength="8"
                    [disabled]="loading()"
                    class="input"
                  />
                  <button 
                    type="button" 
                    class="toggle-password"
                    (click)="togglePassword()"
                    tabindex="-1">
                    <lucide-angular [name]="showPassword() ? 'eye-off' : 'eye'"></lucide-angular>
                  </button>
                </div>
                
                <!-- Password Strength -->
                <div class="password-strength">
                  <div class="strength-bar">
                    <div class="strength-fill" [class]="'strength-' + passwordStrength()"></div>
                  </div>
                  <span class="strength-text" [class]="'strength-' + passwordStrength()">
                    {{ strengthText() }}
                  </span>
                </div>

                <!-- Password Requirements -->
                <ul class="requirements">
                  <li [class.valid]="password().length >= 8">
                    <lucide-angular [name]="password().length >= 8 ? 'check-circle' : 'x-circle'"></lucide-angular>
                    At least 8 characters
                  </li>
                </ul>
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  placeholder="Confirm new password"
                  required
                  [disabled]="loading()"
                  class="input"
                  [class.error]="passwordMismatch()"
                />
                @if (passwordMismatch()) {
                  <span class="error-message">Passwords do not match</span>
                }
              </div>

              <button type="submit" class="btn btn-primary" [disabled]="loading() || !isValid()">
                @if (loading()) {
                  <lucide-angular name="loader" class="spinner"></lucide-angular>
                  Resetting...
                } @else {
                  <lucide-angular name="lock"></lucide-angular>
                  Reset Password
                }
              </button>
            </form>

            <a routerLink="/auth/login" class="back-link">
              <lucide-angular name="arrow-left"></lucide-angular>
              Back to Login
            </a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .reset-password-container {
      min-height: calc(100vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: #f9fafb;
    }

    .reset-card {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .reset-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .reset-content.error,
    .reset-content.success {
      text-align: center;
    }

    .header {
      text-align: center;
    }

    .icon {
      width: 64px;
      height: 64px;
      color: #667eea;
      margin-bottom: 1rem;
    }

    .success-icon {
      color: #10b981;
    }

    .error-icon {
      color: #ef4444;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0.5rem 0;
    }

    p {
      color: #6b7280;
      margin: 0;
      line-height: 1.6;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .password-input {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .input.error {
      border-color: #ef4444;
    }

    .toggle-password {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: #6b7280;
      display: flex;
      align-items: center;
      padding: 4px;
    }

    .toggle-password:hover {
      color: #1f2937;
    }

    .password-strength {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .strength-bar {
      flex: 1;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }

    .strength-fill {
      height: 100%;
      width: 0;
      transition: all 0.3s;
    }

    .strength-fill.strength-weak {
      width: 33%;
      background: #ef4444;
    }

    .strength-fill.strength-medium {
      width: 66%;
      background: #f59e0b;
    }

    .strength-fill.strength-strong {
      width: 100%;
      background: #10b981;
    }

    .strength-text {
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .strength-text.strength-weak { color: #ef4444; }
    .strength-text.strength-medium { color: #f59e0b; }
    .strength-text.strength-strong { color: #10b981; }

    .requirements {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .requirements li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .requirements li.valid {
      color: #10b981;
    }

    .requirements li lucide-angular {
      width: 16px;
      height: 16px;
    }

    .error-message {
      color: #ef4444;
      font-size: 0.875rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #6b7280;
      text-decoration: none;
      font-weight: 500;
      justify-content: center;
      transition: color 0.2s;
    }

    .back-link:hover {
      color: #1f2937;
    }

    .spinner {
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    lucide-angular {
      display: flex;
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  token = signal<string | null>(null);
  password = signal('');
  confirmPassword = signal('');
  loading = signal(false);
  success = signal(false);
  invalidToken = signal(false);
  showPassword = signal(false);

  passwordStrength = computed(() => {
    const pwd = this.password();
    if (pwd.length === 0) return '';
    if (pwd.length < 8) return 'weak';
    if (pwd.length < 12) return 'medium';
    return 'strong';
  });

  strengthText = computed(() => {
    const strength = this.passwordStrength();
    if (strength === 'weak') return 'Weak';
    if (strength === 'medium') return 'Medium';
    if (strength === 'strong') return 'Strong';
    return '';
  });

  passwordMismatch = computed(() => {
    return this.confirmPassword() && this.password() !== this.confirmPassword();
  });

  isValid = computed(() => {
    return this.password().length >= 8 && 
           !this.passwordMismatch() && 
           this.confirmPassword() !== '';
  });

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
    
    if (!this.token()) {
      this.invalidToken.set(true);
    }
  }

  onSubmit(): void {
    if (!this.isValid() || !this.token()) return;

    this.loading.set(true);

    this.authService.resetPassword(this.token()!, this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.toastService.success('Password reset', 'Your password has been successfully reset!');
      },
      error: (error: any) => {
        this.loading.set(false);
        this.invalidToken.set(true);
        this.toastService.error('Error', error?.error?.error || 'Invalid or expired reset token');
      }
    });
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}
