import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-angular';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  mailIcon = Mail;
  lockIcon = Lock;
  userIcon = User;
  eyeIcon = Eye;
  eyeOffIcon = EyeOff;
  registerIcon = UserPlus;

  name = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  error = '';
  agreeToTerms = false;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) { }

  get isFormValid(): boolean {
    return this.name.trim().length > 0 &&
      this.username.trim().length > 0 &&
      this.email.trim().length > 0 &&
      this.password.length >= 6 &&
      this.password === this.confirmPassword &&
      this.agreeToTerms &&
      !this.isLoading;
  }

  get passwordMatchError(): boolean {
    return this.confirmPassword.length > 0 &&
      this.password !== this.confirmPassword;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid) {
      if (this.password !== this.confirmPassword) {
        this.toastService.error('Passwords do not match', 'Please make sure both passwords are the same.');
      } else {
        this.toastService.warning('Invalid form', 'Please fill in all required fields correctly.');
      }
      return;
    }

    this.isLoading = true;
    this.error = '';
    console.log('[AUTH-CLIENT] Registration form submitted for:', this.email);

    const result = await this.authService.register(this.name, this.email, this.password, this.username);

    this.isLoading = false;

    if (result.success) {
      console.log('[AUTH-CLIENT] Registration successful, redirecting to feed');
      this.toastService.success('Account created!', 'Welcome to SocialHub. You are now logged in.');
      this.router.navigate(['/feed']);
    } else {
      console.error('[AUTH-CLIENT] Registration failed:', result.error);
      this.toastService.error('Registration failed', result.error || 'Please try again with different credentials.');
    }
  }
}
