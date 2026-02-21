// Code Map: reaction-summary.component.ts
// - ReactionSummaryComponent: Shows reaction summary with top reactions and total count
// - Expandable view showing all reaction counts
// - Positioned at top of reaction bar
// CID: Phase-2 Milestone 2.1 - Post Reactions
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactionCounts, REACTION_TYPES } from '../models/reaction.model';

interface ReactionCount {
  type: string;
  emoji: string;
  color: string;
  count: number;
}

@Component({
  selector: 'app-reaction-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reaction-summary" *ngIf="counts && totalCount > 0">
      <div class="summary-bar" (click)="toggleExpand()" tabindex="0" (keydown.enter)="toggleExpand()" (keydown.space)="toggleExpand()">
        <div class="top-reactions">
          @for (reaction of topReactions; track reaction.type) {
            <span 
              class="reaction-icon" 
              [style.color]="reaction.color"
              [attr.title]="reaction.type + ': ' + reaction.count"
            >
              {{ reaction.emoji }}
            </span>
          }
        </div>
        <span class="total-count">{{ totalCount }} {{ totalCount === 1 ? 'reaction' : 'reactions' }}</span>
        <span class="expand-icon" [class.expanded]="expanded">
          <ng-container *ngIf="expanded">−</ng-container>
          <ng-container *ngIf="!expanded">+</ng-container>
        </span>
      </div>

      <div class="all-counts" *ngIf="expanded">
        @for (reaction of allCounts; track reaction.type) {
          <div class="count-row" *ngIf="reaction.count > 0">
            <span class="reaction-emoji" [style.color]="reaction.color">{{ reaction.emoji }}</span>
            <span class="reaction-name">{{ reaction.type }}</span>
            <span class="reaction-number">{{ reaction.count }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .reaction-summary {
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 12px;
      background: #f8f9fa;
    }

    .summary-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }

    .summary-bar:focus {
      outline: 2px solid #1877f2;
      outline-offset: 2px;
      border-radius: 4px;
    }

    .top-reactions {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .reaction-icon {
      font-size: 18px;
      line-height: 1;
      cursor: help;
    }

    .total-count {
      font-size: 13px;
      font-weight: 500;
      color: #65676b;
      margin-left: 8px;
    }

    .expand-icon {
      font-size: 16px;
      font-weight: 600;
      color: #65676b;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .expand-icon:hover {
      background: #e5e7eb;
    }

    .expand-icon.expanded {
      color: #1877f2;
    }

    .all-counts {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .count-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .reaction-emoji {
      font-size: 16px;
      width: 20px;
      text-align: center;
    }

    .reaction-name {
      flex: 1;
      color: #050505;
      text-transform: capitalize;
    }

    .reaction-number {
      font-weight: 600;
      color: #65676b;
      min-width: 30px;
      text-align: right;
    }

    @media (max-width: 640px) {
      .reaction-summary {
        padding: 6px 10px;
      }

      .reaction-icon {
        font-size: 16px;
      }

      .total-count {
        font-size: 12px;
      }
    }
  `]
})
export class ReactionSummaryComponent {
  @Input() counts!: ReactionCounts;
  expanded = false;

  get totalCount(): number {
    if (!this.counts) return 0;
    return this.counts.total || 0;
  }

  get topReactions(): ReactionCount[] {
    if (!this.counts) return [];

    const reactions = REACTION_TYPES
      .map((r: any) => ({
        type: r.label,
        emoji: r.emoji,
        color: r.color,
        count: this.counts[r.type as keyof ReactionCounts] as number || 0
      }))
      .filter((r: any) => r.count > 0)
      .sort((a: any, b: any) => b.count - a.count);

    return reactions.slice(0, 3);
  }

  get allCounts(): ReactionCount[] {
    if (!this.counts) return [];

    return REACTION_TYPES.map((r: any) => ({
      type: r.label,
      emoji: r.emoji,
      color: r.color,
      count: this.counts[r.type as keyof ReactionCounts] as number || 0
    }));
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;
  }
}
