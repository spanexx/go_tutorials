import { Injectable, signal } from '@angular/core';

/**
 * Type of toast notification
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

/**
 * ToastService - Manages toast notifications throughout the application
 * 
 * Provides methods to show success, error, warning, and info toasts
 * with auto-dismiss functionality and manual control.
 * 
 * @example
 * ```typescript
 * // Show success toast
 * toastService.success('Post created', 'Your post has been published');
 * 
 * // Show error toast with custom duration
 * toastService.error('Failed', 'Please try again', 5000);
 * 
 * // Show custom toast
 * toastService.show('Title', { type: 'info', message: 'Details' });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSignal = signal<Toast[]>([]);
  private toastCounter = 0;

  toasts = this.toastsSignal.asReadonly();

  /**
   * Get default duration for toast type
   */
  private getDefaultDuration(type: ToastType): number {
    switch (type) {
      case 'error':
        return 5000;
      case 'warning':
        return 4000;
      default:
        return 3000;
    }
  }

  private generateId(): string {
    return `toast-${++this.toastCounter}-${Date.now()}`;
  }

  /**
   * Show a toast notification
   * @param title - Toast title
   * @param options - Toast options (type, message, duration)
   * @returns Toast ID for manual dismissal
   */
  show(
    title: string,
    options: {
      type?: ToastType;
      message?: string;
      duration?: number;
    } = {}
  ): string {
    const { type = 'info', message, duration } = options;
    
    const toast: Toast = {
      id: this.generateId(),
      type,
      title,
      message,
      duration: duration ?? this.getDefaultDuration(type)
    };

    this.toastsSignal.update(toasts => [...toasts, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.duration);
    }

    return toast.id;
  }

  /**
   * Show success toast
   * @param title - Toast title
   * @param message - Optional message
   * @param duration - Optional custom duration in ms
   */
  success(title: string, message?: string, duration?: number): string {
    return this.show(title, { type: 'success', message, duration });
  }

  /**
   * Show error toast
   * @param title - Toast title
   * @param message - Optional message
   * @param duration - Optional custom duration in ms
   */
  error(title: string, message?: string, duration?: number): string {
    return this.show(title, { type: 'error', message, duration });
  }

  /**
   * Show warning toast
   * @param title - Toast title
   * @param message - Optional message
   * @param duration - Optional custom duration in ms
   */
  warning(title: string, message?: string, duration?: number): string {
    return this.show(title, { type: 'warning', message, duration });
  }

  /**
   * Show info toast
   * @param title - Toast title
   * @param message - Optional message
   * @param duration - Optional custom duration in ms
   */
  info(title: string, message?: string, duration?: number): string {
    return this.show(title, { type: 'info', message, duration });
  }

  /**
   * Dismiss a toast by ID
   * @param id - Toast ID to dismiss
   */
  dismiss(id: string): void {
    this.toastsSignal.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this.toastsSignal.set([]);
  }
}
