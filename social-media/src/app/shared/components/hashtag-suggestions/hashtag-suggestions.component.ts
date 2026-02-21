// Code Map: hashtag-suggestions.component.ts
// - HashtagSuggestionsComponent: Shows hashtag suggestions when typing # in post input
// - Detects # character and shows dropdown with popular hashtags
// - Filters as user types
// - Click to insert hashtag
// - Keyboard navigation (up/down, enter)
// - Maximum 5 suggestions shown
// CID: Phase-2 Milestone 2.3 - Hashtags & Mentions
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Hash } from 'lucide-angular';
import { HashtagService, Hashtag } from '../../services/hashtag.service';

@Component({
  selector: 'app-hashtag-suggestions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isVisible && suggestions.length > 0) {
      <div class="hashtag-suggestions" [style.top]="positionY + 'px'" [style.left]="positionX + 'px'">
        <div class="suggestions-header">
          <lucide-icon [img]="hashIcon" [size]="14"></lucide-icon>
          <span>Suggestions</span>
        </div>

        <div class="suggestions-list">
          @for (hashtag of suggestions; track hashtag.tag; let i = $index) {
            <button
              class="suggestion-item"
              [class.selected]="selectedIndex === i"
              (click)="selectHashtag(hashtag.tag)"
              (mouseenter)="selectedIndex = i"
            >
              <span class="hashtag-name">#{{ hashtag.tag }}</span>
              <span class="hashtag-count">{{ hashtag.count | number }} posts</span>
            </button>
          }
        </div>

        <div class="suggestions-footer">
          <kbd>↑↓</kbd> to navigate · <kbd>Enter</kbd> to select · <kbd>Esc</kbd> to close
        </div>
      </div>
    }
  `,
  styles: [`
    .hashtag-suggestions {
      position: absolute;
      z-index: 1000;
      min-width: 250px;
      max-width: 350px;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: slideIn 0.15s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .suggestions-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      background: hsl(var(--muted) / 0.3);
      border-bottom: 1px solid hsl(var(--border));

      lucide-icon {
        color: hsl(var(--accent));
      }

      span {
        font-size: 0.8rem;
        font-weight: 600;
        color: hsl(var(--muted-foreground));
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .suggestions-list {
      max-height: 250px;
      overflow-y: auto;
      padding: 0.5rem;

      .suggestion-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0.625rem 0.75rem;
        border: none;
        background: transparent;
        border-radius: calc(var(--radius) - 0.25rem);
        cursor: pointer;
        transition: background 0.15s ease;
        text-align: left;

        &:hover,
        &.selected {
          background: hsl(var(--accent) / 0.1);
        }

        .hashtag-name {
          font-weight: 600;
          color: hsl(var(--foreground));
          font-size: 0.9rem;
        }

        .hashtag-count {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          white-space: nowrap;
          margin-left: 0.75rem;
        }
      }
    }

    .suggestions-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: hsl(var(--muted) / 0.3);
      border-top: 1px solid hsl(var(--border));
      font-size: 0.7rem;
      color: hsl(var(--muted-foreground));

      kbd {
        display: inline-block;
        padding: 0.125rem 0.375rem;
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        border-radius: calc(var(--radius) - 0.25rem);
        font-family: monospace;
        font-size: 0.65rem;
      }
    }
  `]
})
export class HashtagSuggestionsComponent implements OnChanges {
  @Input() currentText: string = '';
  @Input() positionX: number = 0;
  @Input() positionY: number = 0;
  @Output() hashtagSelected = new EventEmitter<string>();

  hashIcon = Hash;
  suggestions: Hashtag[] = [];
  selectedIndex = 0;
  isVisible = false;

  constructor(private hashtagService: HashtagService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentText']) {
      this.updateSuggestions();
    }
  }

  private updateSuggestions(): void {
    const hashtagMatch = this.currentText.match(/#([a-zA-Z0-9_]*)$/);
    
    if (!hashtagMatch) {
      this.isVisible = false;
      return;
    }

    const searchText = hashtagMatch[1];
    
    // Get suggestions from service
    this.suggestions = this.hashtagService.searchHashtags(searchText, 5);
    
    // If no matches, show popular hashtags
    if (this.suggestions.length === 0 && searchText.length === 0) {
      const trendingTags = this.hashtagService.trending();
      const hashtagsMap = this.hashtagService.hashtags();
      this.suggestions = trendingTags
        .slice(0, 5)
        .map(tag => hashtagsMap[tag.toLowerCase()])
        .filter((h): h is Hashtag => Boolean(h));
    }

    this.isVisible = this.suggestions.length > 0;
    this.selectedIndex = 0;
  }

  selectHashtag(tag: string): void {
    this.hashtagSelected.emit(tag);
    this.isVisible = false;
    this.suggestions = [];
  }

  navigateUp(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    } else {
      this.selectedIndex = this.suggestions.length - 1;
    }
  }

  navigateDown(): void {
    if (this.selectedIndex < this.suggestions.length - 1) {
      this.selectedIndex++;
    } else {
      this.selectedIndex = 0;
    }
  }

  selectCurrent(): string | null {
    if (this.suggestions.length > 0 && this.selectedIndex >= 0) {
      const selected = this.suggestions[this.selectedIndex];
      this.selectHashtag(selected.tag);
      return selected.tag;
    }
    return null;
  }

  close(): void {
    this.isVisible = false;
    this.suggestions = [];
    this.selectedIndex = 0;
  }

  handleKeydown(event: KeyboardEvent): boolean {
    if (!this.isVisible) {
      return false;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.navigateUp();
        return true;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateDown();
        return true;
      case 'Enter':
        event.preventDefault();
        this.selectCurrent();
        return true;
      case 'Escape':
        event.preventDefault();
        this.close();
        return true;
      default:
        return false;
    }
  }
}
