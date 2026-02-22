import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'contentLink',
  standalone: true
})
export class ContentLinkPipe implements PipeTransform {
  private hashtagRegex = /(?<!\S)#([a-zA-Z][a-zA-Z0-9_]*)/g;
  private mentionRegex = /(?<!\S)@([a-zA-Z0-9][a-zA-Z0-9._]{0,29})(?!\w)/g;
  private codeBlockRegex = /```[\s\S]*?```|`[^`]*`/g;

  constructor(private sanitizer: DomSanitizer) {}

  transform(content: string): SafeHtml {
    if (!content) {
      return '';
    }

    const codeBlocks: string[] = [];
    let protectedContent = content.replace(this.codeBlockRegex, (match) => {
      codeBlocks.push(match);
      return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`;
    });

    protectedContent = protectedContent.replace(this.hashtagRegex, (match, hashtag) => {
      const normalized = String(hashtag).toLowerCase();
      const encoded = encodeURIComponent(normalized);
      return `<a href="/hashtag/${encoded}" class="hashtag-link" data-hashtag="${normalized}">#${hashtag}</a>`;
    });

    protectedContent = protectedContent.replace(this.mentionRegex, (match, username) => {
      return `<a href="/profile/${username}" class="mention-link" data-username="${username}" title="View profile">@${username}</a>`;
    });

    protectedContent = protectedContent.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, index) => {
      return codeBlocks[parseInt(index, 10)];
    });

    return this.sanitizer.bypassSecurityTrustHtml(protectedContent);
  }
}
