import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactionService, ReactionType } from '../../shared/services/reaction.service';

@Component({
  selector: 'app-reaction-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="reaction-picker" 
      [class.visible]="visible"
      [class.position-left]="position === 'left'"
      (mouseleave)="onMouseLeave()"
    >
      @for (reaction of reactions; track reaction) {
        <button
          class="reaction-btn"
          [style.--reaction-color]="reactionService.getReactionColor(reaction)"
          [attr.title]="reactionService.getReactionLabel(reaction)"
          (mouseenter)="onHover(reaction)"
          (click)="onSelect(reaction)"
        >
          <span class="reaction-emoji">{{ reactionService.getReactionEmoji(reaction) }}</span>
        </button>
      }
    </div>
  `,
  styleUrls: ['./reaction-picker.component.scss']
})
export class ReactionPickerComponent {
  @Input() visible: boolean = false;
  @Input() position: 'left' | 'center' = 'center';
  @Output() reactionSelected = new EventEmitter<ReactionType>();
  @Output() pickerClosed = new EventEmitter<void>();

  reactions: ReactionType[] = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
  hoverReaction: ReactionType | null = null;

  constructor(public reactionService: ReactionService) {}

  onHover(reaction: ReactionType): void {
    this.hoverReaction = reaction;
  }

  onSelect(reaction: ReactionType): void {
    this.reactionSelected.emit(reaction);
    this.pickerClosed.emit();
  }

  onMouseLeave(): void {
    this.pickerClosed.emit();
  }
}
