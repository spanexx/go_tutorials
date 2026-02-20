import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export type ErrorType = 'not_found' | 'unauthorized' | 'forbidden' | 'server_error' | 'network_error' | 'unknown';

export interface ErrorInfo {
  type: ErrorType;
  code?: number;
  message: string;
  details?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  private currentErrorSignal = signal<ErrorInfo | null>(null);
  currentError = this.currentErrorSignal.asReadonly();

  constructor(private router: Router) {}

  handleError(error: any): void {
    const errorInfo: ErrorInfo = {
      type: this.determineErrorType(error),
      code: error?.status || error?.code,
      message: error?.message || 'An unexpected error occurred',
      details: error?.error?.message || error?.details,
      timestamp: new Date()
    };

    this.currentErrorSignal.set(errorInfo);

    // Navigate to appropriate error page
    this.navigateToErrorPage(errorInfo.type);
  }

  private determineErrorType(error: any): ErrorType {
    if (!error) return 'unknown';
    
    const status = error?.status;
    
    if (status === 404) return 'not_found';
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status >= 500) return 'server_error';
    if (error?.name === 'HttpErrorResponse' && error?.status === 0) return 'network_error';
    
    return 'unknown';
  }

  private navigateToErrorPage(type: ErrorType): void {
    switch (type) {
      case 'not_found':
        this.router.navigate(['/404']);
        break;
      case 'unauthorized':
        this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        break;
      case 'forbidden':
        this.router.navigate(['/403']);
        break;
      default:
        this.router.navigate(['/error']);
    }
  }

  clearError(): void {
    this.currentErrorSignal.set(null);
  }

  showNotFound(): void {
    this.router.navigate(['/404']);
  }

  showUnauthorized(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
