import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, User, Mail, Image, Save, X, Camera } from 'lucide-angular';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent {
  userIcon = User;
  mailIcon = Mail;
  imageIcon = Image;
  saveIcon = Save;
  closeIcon = X;
  cameraIcon = Camera;

  name = '';
  username = '';
  bio = '';
  avatar = '';
  coverImage = '';
  
  isLoading = false;
  isSaving = false;
  error = '';

  constructor(
    public authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    const user = this.authService.user;
    if (user) {
      this.name = user.name || '';
      this.username = user.username || '';
      this.bio = user.bio || '';
      this.avatar = user.avatar || '';
    } else {
      this.router.navigate(['/login']);
    }
  }

  get isFormValid(): boolean {
    return this.name.trim().length > 0 && 
           this.username.trim().length > 0;
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const url = input.value;
    if (url) {
      this.avatar = url;
    }
  }

  onSave(): void {
    if (!this.isFormValid) {
      this.toastService.warning('Invalid form', 'Please fill in all required fields.');
      return;
    }

    this.isSaving = true;
    this.error = '';

    this.authService.updateProfile({
      name: this.name.trim(),
      username: this.username.trim(),
      bio: this.bio.trim(),
      avatar: this.avatar.trim()
    });

    this.isSaving = false;
    this.toastService.success('Profile updated', 'Your profile has been saved successfully.');
    this.router.navigate(['/profile', this.username]);
  }

  onCancel(): void {
    this.router.navigate(['/profile', this.username]);
  }
}
