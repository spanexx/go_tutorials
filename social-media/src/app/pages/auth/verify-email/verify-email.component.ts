// Code Map: verify-email.component.ts
// - VerifyEmailComponent: Email verification page with token handling
// - Handles token from URL query params
// - Shows success/error states
// - Provides resend verification option
// CID: Frontend Email Flow - 1.6.9
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LucideAngularModule, CheckCircle, XCircle, Loader, Mail } from 'lucide-angular';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <div class="verify-email-container">
      <div class="verify-card">
        <!-- Loading State -->
        @if (verifying()) {
          <div class="verify-content loading">
            <lucide-angular name="loader" class="spinner"></lucide-angular>
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your email address.</p>
          </div>
        }

        <!-- Success State -->
        @else if (verified()) {
          <div class="verify-content success">
            <lucide-angular name="check-circle" class="icon success-icon"></lucide-angular>
            <h2>Email Verified!</h2>
            <p>Your email has been successfully verified. You can now enjoy all features of SocialHub.</p>
            <a routerLink="/feed" class="btn btn-primary">Go to Feed</a>
          </div>
        }

        <!-- Error State -->
        @else if (error()) {
          <div class="verify-content error">
            <lucide-angular name="x-circle" class="icon error-icon"></lucide-angular>
            <h2>Verification Failed</h2>
            <p>{{ errorMessage() }}</p>
            
            @if (!resent()) {
              <button 
                class="btn btn-secondary" 
                (click)="resendVerification()"
                [disabled]="resending()">
                @if (resending()) {
                  <lucide-angular name="loader" class="spinner-small"></lucide-angular>
                  Sending...
                } @else {
                  <lucide-angular name="mail"></lucide-angular>
                  Resend Verification Email
                }
              </button>
            } @else {
              <div class="resent-message">
                <lucide-angular name="check-circle" class="small-icon"></lucide-angular>
                <p>Verification email sent! Please check your inbox.</p>
              </div>
            }
            
            <a routerLink="/feed" class="btn btn-outline">Back to Feed</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .verify-email-container {
      min-height: calc(100vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .verify-card {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .verify-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .verify-content.loading {
      color: #6b7280;
    }

    .verify-content.success {
      color: #1f2937;
    }

    .verify-content.error {
      color: #1f2937;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    p {
      color: #6b7280;
      margin: 0;
      line-height: 1.6;
    }

    .icon {
      width: 80px;
      height: 80px;
    }

    .success-icon {
      color: #10b981;
    }

    .error-icon {
      color: #ef4444;
    }

    .spinner {
      width: 60px;
      height: 60px;
      color: #667eea;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
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

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #1f2937;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-outline {
      background: transparent;
      color: #6b7280;
      border: 1px solid #e5e7eb;
    }

    .btn-outline:hover {
      background: #f9fafb;
    }

    .resent-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #f0fdf4;
      border-radius: 8px;
      color: #10b981;
    }

    .small-icon {
      width: 20px;
      height: 20px;
    }

    lucide-angular {
      display: flex;
    }
  `]
})
export class VerifyEmailComponent implements OnInit {
  verifying = signal(true);
  verified = signal(false);
  error = signal(false);
  errorMessage = signal('');
  resending = signal(false);
  resent = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (!token) {
      this.verifying.set(false);
      this.error.set(true);
      this.errorMessage.set('No verification token provided. Please check your email link.');
      return;
    }

    this.verifyEmail(token);
  }

  private verifyEmail(token: string): void {
    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.verifying.set(false);
        this.verified.set(true);
        this.toastService.success('Email verified', 'Your email has been successfully verified!');
      },
      error: (error) => {
        this.verifying.set(false);
        this.error.set(true);
        this.errorMessage.set(this.getErrorMessage(error));
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.error) {
      return error.error.error;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Invalid or expired verification token. Please request a new verification email.';
  }

  resendVerification(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.email) {
      this.toastService.error('Error', 'User email not found');
      return;
    }

    this.resending.set(true);
    this.authService.resendVerificationEmail(user.email).subscribe({
      next: () => {
        this.resending.set(false);
        this.resent.set(true);
        this.toastService.success('Email sent', 'Verification email sent! Please check your inbox.');
      },
      error: () => {
        this.resending.set(false);
        this.toastService.error('Error', 'Failed to send verification email. Please try again.');
      }
    });
  }
}
