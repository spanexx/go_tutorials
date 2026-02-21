import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-angular';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

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
    console.log('[AUTH-CLIENT] Login form submitted for:', this.email);

    const result = await this.authService.login(this.email, this.password);

    this.isLoading = false;

    if (result.success) {
      console.log('[AUTH-CLIENT] Login successful, redirecting to feed');
      this.toastService.success('Welcome back!', 'You have successfully logged in.');
      this.router.navigate(['/feed']);
    } else {
      console.error('[AUTH-CLIENT] Login failed:', result.error);
      this.toastService.error('Login failed', result.error || 'Please check your credentials and try again.');
    }
  }
}
