import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'hashtag',
  standalone: true
})
export class HashtagPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(content: string): SafeHtml {
    if (!content) return '';

    const hashtagRegex = /(#\w+)/g;
    const transformed = content.replace(
      hashtagRegex,
      '<a href="/hashtag/$1" class="hashtag" data-hashtag="$1">$1</a>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(transformed);
  }
}
