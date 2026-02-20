import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, RefreshCw, ArrowDown, Check } from 'lucide-angular';
import { RefreshService } from '../../shared/services/refresh.service';

@Component({
  selector: 'app-refresh-indicator',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './refresh-indicator.component.html',
  styleUrls: ['./refresh-indicator.component.scss']
})
export class RefreshIndicatorComponent {
  @Input() show: boolean = false;
  @Output() refresh = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  refreshIcon = RefreshCw;
  arrowIcon = ArrowDown;
  checkIcon = Check;

  constructor(public refreshService: RefreshService) {}

  onRefresh(): void {
    this.refresh.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  toggleAutoRefresh(): void {
    this.refreshService.toggleAutoRefresh();
  }

  getFormattedTime(): string {
    return this.refreshService.getFormattedLastRefresh();
  }
}
