// Code Map: hashtag.pipe.ts
// - HashtagPipe: Parses content and converts #hashtags to clickable links
// - Regex to identify #hashtag patterns (supports letters, numbers, underscores)
// - Case-insensitive matching
// - Prevents linking in code blocks
// CID: Phase-2 Milestone 2.3 - Hashtags & Mentions
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'hashtag',
  standalone: true
})
export class HashtagPipe implements PipeTransform {
  // Regex to match hashtags: # followed by letters, numbers, or underscores
  // Must start with a letter, can contain letters, numbers, underscores
  // Minimum 1 character after #
  private hashtagRegex = /(?<!\S)#([a-zA-Z][a-zA-Z0-9_]*)/g;
  
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

    // Replace hashtags with clickable links
    protectedContent = protectedContent.replace(
      this.hashtagRegex,
      (match, hashtag) => {
        const encodedHashtag = encodeURIComponent(hashtag.toLowerCase());
        return `<a href="/hashtag/${encodedHashtag}" class="hashtag-link" data-hashtag="${hashtag.toLowerCase()}">#${hashtag}</a>`;
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
   * Extract all hashtags from content
   */
  static extractHashtags(content: string): string[] {
    if (!content) {
      return [];
    }

    // Remove code blocks first
    const withoutCode = content.replace(/```[\s\S]*?```|`[^`]*`/g, '');
    
    const hashtags = new Set<string>();
    const matches = withoutCode.match(/(?<!\S)#([a-zA-Z][a-zA-Z0-9_]*)/g);
    
    if (matches) {
      matches.forEach(match => {
        // Remove the # and convert to lowercase
        hashtags.add(match.substring(1).toLowerCase());
      });
    }

    return Array.from(hashtags);
  }

  /**
   * Check if content contains a specific hashtag
   */
  static containsHashtag(content: string, hashtag: string): boolean {
    const hashtags = this.extractHashtags(content);
    return hashtags.includes(hashtag.toLowerCase());
  }
}
