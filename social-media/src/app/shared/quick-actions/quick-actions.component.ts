import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Search, Command, ArrowRight, X } from 'lucide-angular';
import { QuickActionsService, QuickAction } from '../../shared/services/quick-actions.service';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss']
})
export class QuickActionsComponent {
  searchIcon = Search;
  commandIcon = Command;
  arrowIcon = ArrowRight;
  closeIcon = X;

  constructor(public actionsService: QuickActionsService) {}

  showModal = this.actionsService.showModal;
  searchQuery = this.actionsService.searchQuery;
  selectedIndex = this.actionsService.selectedIndex;

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.actionsService.setSearchQuery(input.value);
  }

  closeModal(): void {
    this.actionsService.hide();
  }

  selectAction(action: QuickAction, index: number): void {
    this.actionsService.setSelectedIndex(index);
  }

  executeAction(action: QuickAction): void {
    action.action();
    this.actionsService.hide();
  }

  getIconClass(icon: string): string {
    return `icon-${icon}`;
  }

  trackByActionId(index: number, action: QuickAction): string {
    return action.id;
  }
}
