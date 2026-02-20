import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'mention',
  standalone: true
})
export class MentionPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(content: string): SafeHtml {
    if (!content) return '';

    const mentionRegex = /@([\w]+)/g;
    const transformed = content.replace(
      mentionRegex,
      '<a href="/profile/$1" class="mention" data-username="$1">@$1</a>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(transformed);
  }
}
