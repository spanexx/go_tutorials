// Code Map: forgot-password.component.ts
// - ForgotPasswordComponent: Password reset request page
// - Two-step flow: email input -> confirmation
// - Handles API calls to forgot-password endpoint
// CID: Frontend Email Flow - 1.6.9
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LucideAngularModule, Mail, ArrowLeft, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
  template: `
    <div class="forgot-password-container">
      <div class="forgot-card">
        @if (!sent()) {
          <!-- Email Input Step -->
          <div class="forgot-content">
            <div class="header">
              <lucide-angular name="mail" class="icon"></lucide-angular>
              <h1>Forgot Password?</h1>
              <p>No worries! Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            <form (ngSubmit)="onSubmit()" class="form">
              <div class="form-group">
                <label for="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  [(ngModel)]="email"
                  placeholder="you@example.com"
                  required
                  [disabled]="loading()"
                  class="input"
                />
              </div>

              <button type="submit" class="btn btn-primary" [disabled]="loading() || !email()">
                @if (loading()) {
                  <lucide-angular name="loader" class="spinner"></lucide-angular>
                  Sending...
                } @else {
                  <lucide-angular name="mail"></lucide-angular>
                  Send Reset Link
                }
              </button>
            </form>

            <a routerLink="/auth/login" class="back-link">
              <lucide-angular name="arrow-left"></lucide-angular>
              Back to Login
            </a>
          </div>
        } @else {
          <!-- Confirmation Step -->
          <div class="forgot-content success">
            <lucide-angular name="check-circle" class="icon success-icon"></lucide-angular>
            <h1>Check Your Email</h1>
            <p>We've sent a password reset link to <strong>{{ email() }}</strong></p>
            
            <div class="info-box">
              <p>Didn't receive the email?</p>
              <ul>
                <li>Check your spam folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>

            <a routerLink="/auth/login" class="btn btn-primary">
              <lucide-angular name="arrow-left"></lucide-angular>
              Back to Login
            </a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .forgot-password-container {
      min-height: calc(100vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: #f9fafb;
    }

    .forgot-card {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .forgot-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .forgot-content.success {
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

    .input {
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

    .info-box {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: left;
    }

    .info-box p {
      font-weight: 500;
      margin-bottom: 0.75rem;
    }

    .info-box ul {
      margin: 0;
      padding-left: 1.25rem;
      color: #6b7280;
    }

    .info-box li {
      margin-bottom: 0.5rem;
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
export class ForgotPasswordComponent {
  email = signal('');
  loading = signal(false);
  sent = signal(false);

  constructor(
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  onSubmit(): void {
    if (!this.email()) return;

    this.loading.set(true);

    this.authService.forgotPassword(this.email()).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
        this.toastService.success(
          'Email sent',
          `Password reset link sent to ${this.email()}`
        );
      },
      error: () => {
        this.loading.set(false);
        // Always show success to prevent email enumeration
        this.sent.set(true);
        this.toastService.success(
          'Email sent',
          `If an account exists with ${this.email()}, you will receive a password reset link.`
        );
      }
    });
  }
}
