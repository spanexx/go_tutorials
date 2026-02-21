// Code Map: mention.pipe.ts
// - MentionPipe: Parses content and converts @mentions to clickable profile links
// - Regex to identify @username patterns (supports letters, numbers, dots, underscores)
// - Validates username format
// - Links to user profile pages
// CID: Phase-2 Milestone 2.3 - Hashtags & Mentions
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'mention',
  standalone: true
})
export class MentionPipe implements PipeTransform {
  // Regex to match mentions: @ followed by username
  // Username can contain: letters, numbers, dots, underscores
  // Must start with a letter or number, 1-30 characters
  private mentionRegex = /(?<!\S)@([a-zA-Z0-9][a-zA-Z0-9._]{0,29})(?!\w)/g;
  
  // Regex to detect code blocks (prevent linking inside them)
  private codeBlockRegex = /```[\s\S]*?```|`[^`]*`/g;

  constructor(private sanitizer: DomSanitizer) {}

  transform(content: string): SafeHtml {
    if (!content) {
      return '';
    }

    // First, protect code blocks by replacing them with placeholders
    const codeBlocks: string[] = [];
    let protectedContent = content.replace(this.codeBlockRegex, (match) => {
      codeBlocks.push(match);
      return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`;
    });

    // Replace mentions with clickable links
    protectedContent = protectedContent.replace(
      this.mentionRegex,
      (match, username) => {
        return `<a href="/profile/${username}" class="mention-link" data-username="${username}" title="View profile">@${username}</a>`;
      }
    );

    // Restore code blocks
    protectedContent = protectedContent.replace(
      /%%CODE_BLOCK_(\d+)%%/g,
      (match, index) => codeBlocks[parseInt(index, 10)]
    );

    return this.sanitizer.bypassSecurityTrustHtml(protectedContent);
  }

  /**
   * Extract all mentions from content
   */
  static extractMentions(content: string): string[] {
    if (!content) {
      return [];
    }

    // Remove code blocks first
    const withoutCode = content.replace(/```[\s\S]*?```|`[^`]*`/g, '');
    
    const mentions = new Set<string>();
    const matches = withoutCode.match(/(?<!\S)@([a-zA-Z0-9][a-zA-Z0-9._]{0,29})(?!\w)/g);
    
    if (matches) {
      matches.forEach(match => {
        // Remove the @ and convert to lowercase
        mentions.add(match.substring(1).toLowerCase());
      });
    }

    return Array.from(mentions);
  }

  /**
   * Check if content contains a specific mention
   */
  static containsMention(content: string, username: string): boolean {
    const mentions = this.extractMentions(content);
    return mentions.includes(username.toLowerCase());
  }

  /**
   * Validate username format
   */
  static isValidUsername(username: string): boolean {
    if (!username || username.length < 1 || username.length > 30) {
      return false;
    }
    
    // Must start with letter or number
    // Can contain letters, numbers, dots, underscores
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9._]{0,29}$/;
    return usernameRegex.test(username);
  }
}
