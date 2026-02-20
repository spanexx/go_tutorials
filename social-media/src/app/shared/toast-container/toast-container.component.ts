import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-angular';
import { ToastService, Toast } from '../../shared/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss']
})
export class ToastContainerComponent {
  closeIcon = X;
  successIcon = CheckCircle;
  errorIcon = AlertCircle;
  warningIcon = AlertTriangle;
  infoIcon = Info;

  constructor(private toastService: ToastService) {}

  toasts = this.toastService.toasts;

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  getIcon(type: string): any {
    switch (type) {
      case 'success': return this.successIcon;
      case 'error': return this.errorIcon;
      case 'warning': return this.warningIcon;
      default: return this.infoIcon;
    }
  }

  getClass(type: string): string {
    return `toast-${type}`;
  }
}
