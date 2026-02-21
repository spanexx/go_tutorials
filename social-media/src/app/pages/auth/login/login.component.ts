import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-angular';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { debugError, debugLog } from '../../../shared/utils/debug-logger';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  mailIcon = Mail;
  lockIcon = Lock;
  eyeIcon = Eye;
  eyeOffIcon = EyeOff;
  loginIcon = LogIn;

  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  error = '';
  rememberMe = false;

  emailError = '';

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  get isFormValid(): boolean {
    return this.email.trim().length > 0 &&
           this.password.length >= 6 &&
           !this.isLoading;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid) {
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.emailError = '';
    debugLog('LoginComponent', 'onSubmit() called', { email: this.email });
    console.log('[AUTH-CLIENT] Login form submitted for:', this.email);

    const result = await this.authService.login(this.email, this.password);

    this.isLoading = false;

    if (result.success) {
      debugLog('LoginComponent', 'login success: navigating to feed');
      console.log('[AUTH-CLIENT] Login successful, redirecting to feed');
      this.toastService.success('Welcome back!', 'You have successfully logged in.');
      this.router.navigate(['/feed']);
    } else {
      debugError('LoginComponent', 'login failed', { error: result.error, fieldErrors: result.fieldErrors });
      console.error('[AUTH-CLIENT] Login failed:', result.error);

      const fieldEmailError = result.fieldErrors?.email;
      if (fieldEmailError) {
        this.emailError = fieldEmailError;
      }

      this.toastService.error('Login failed', result.error || 'Please check your credentials and try again.');
    }
  }

  onEmailInput(): void {
    if (this.emailError) {
      this.emailError = '';
    }
  }
}
