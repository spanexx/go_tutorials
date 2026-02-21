// Code Map: reaction-bar.component.ts
// - ReactionBarComponent: Shows 6 reaction buttons with counts
// - Displays user's active reaction highlighted
// - Click to toggle reaction, hover for tooltip
// - Keyboard accessible (Tab + Enter)
// CID: Phase-2 Milestone 2.1 - Post Reactions
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactionType, REACTION_TYPES, ReactionCounts } from '../models/reaction.model';
import { ReactionService } from '../services/reaction.service';

@Component({
  selector: 'app-reaction-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reaction-bar" role="group" aria-label="Post reactions">
      @for (reaction of reactions; track reaction.type) {
        <button
          class="reaction-btn"
          [class.active]="userReaction === reaction.type"
          [attr.aria-label]="reaction.label + ' reaction, ' + getCount(reaction.type) + ' people'"
          [attr.aria-pressed]="userReaction === reaction.type"
          [attr.title]="reaction.label + ' - ' + getCount(reaction.type)"
          (click)="onReactionClick(reaction.type)"
          (keydown.enter)="onReactionClick(reaction.type)"
          (keydown.space)="onReactionClick(reaction.type)"
          tabindex="0"
        >
          <span class="reaction-emoji" [style.color]="reaction.color">{{ reaction.emoji }}</span>
          <span class="reaction-count">{{ getCount(reaction.type) }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .reaction-bar {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 8px;
      justify-content: space-around;
    }

    .reaction-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 10px;
      border: 2px solid transparent;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 50px;
    }

    .reaction-btn:hover {
      background: #f0f2f5;
      transform: translateY(-2px);
    }

    .reaction-btn.active {
      border-color: var(--reaction-color, #1877f2);
      background: rgba(24, 119, 242, 0.1);
    }

    .reaction-btn:focus {
      outline: 2px solid #1877f2;
      outline-offset: 2px;
    }

    .reaction-emoji {
      font-size: 20px;
      line-height: 1;
    }

    .reaction-count {
      font-size: 11px;
      font-weight: 600;
      color: #65676b;
    }

    .reaction-btn.active .reaction-count {
      color: var(--reaction-color, #1877f2);
    }

    @media (max-width: 640px) {
      .reaction-bar {
        gap: 2px;
        padding: 6px 8px;
      }

      .reaction-btn {
        min-width: 40px;
        padding: 4px 6px;
      }

      .reaction-emoji {
        font-size: 18px;
      }

      .reaction-count {
        font-size: 10px;
      }
    }
  `]
})
export class ReactionBarComponent {
  @Input() postId!: string;
  @Input() counts!: ReactionCounts;
  @Input() userReaction: ReactionType | null = null;
  @Output() reactionSelected = new EventEmitter<ReactionType>();

  reactions = REACTION_TYPES;

  constructor(private reactionService: ReactionService) { }

  getCount(type: ReactionType): number {
    if (!this.counts) return 0;
    return this.counts[type] || 0;
  }

  onReactionClick(type: ReactionType): void {
    this.reactionSelected.emit(type);
  }
}
