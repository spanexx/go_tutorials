import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, RefreshCw, AlertTriangle } from 'lucide-angular';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss']
})
export class ErrorPageComponent {
  homeIcon = Home;
  refreshIcon = RefreshCw;
  alertIcon = AlertTriangle;

  error = this.errorService.currentError;

  constructor(public errorService: ErrorHandlingService) {}

  retry(): void {
    this.errorService.clearError();
    window.history.back();
  }

  goHome(): void {
    this.errorService.clearError();
    window.location.href = '/feed';
  }

  getErrorMessage(): string {
    const error = this.error();
    if (!error) return 'An unexpected error occurred';
    
    switch (error.type) {
      case 'unauthorized':
        return 'You need to log in to access this page';
      case 'forbidden':
        return 'You don\'t have permission to access this resource';
      case 'server_error':
        return 'Something went wrong on our end';
      case 'network_error':
        return 'Unable to connect to the server. Please check your internet connection';
      default:
        return error.message;
    }
  }

  getErrorTitle(): string {
    const error = this.error();
    if (!error) return 'Error';
    
    switch (error.type) {
      case 'unauthorized':
        return 'Authentication Required';
      case 'forbidden':
        return 'Access Denied';
      case 'server_error':
        return 'Server Error';
      case 'network_error':
        return 'Connection Error';
      default:
        return 'Oops! Something went wrong';
    }
  }
}
