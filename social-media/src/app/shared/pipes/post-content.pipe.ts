import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'postContent',
  standalone: true
})
export class PostContentPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(content: string): SafeHtml {
    if (!content) return '';

    let transformed = content;

    // First, replace hashtags
    const hashtagRegex = /(#\w+)/g;
    transformed = transformed.replace(
      hashtagRegex,
      '<a href="/hashtag/$1" class="hashtag" data-hashtag="$1">$1</a>'
    );

    // Then, replace mentions
    const mentionRegex = /@([\w]+)/g;
    transformed = transformed.replace(
      mentionRegex,
      '<a href="/profile/$1" class="mention" data-username="$1">@$1</a>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(transformed);
  }
}
