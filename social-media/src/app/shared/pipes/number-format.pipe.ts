// Code Map: number-format.pipe.ts
// - NumberFormatPipe: Formats large numbers with K/M notation
// - Formats: 1200 -> 1.2K, 1500000 -> 1.5M
// - Used for follower/following counts on profiles
// CID: Phase-2 Milestone 2.5 - Social Graph (Follow System)
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFormat',
  standalone: true
})
export class NumberFormatPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) {
      return '0';
    }

    const num = typeof value === 'string' ? parseInt(value, 10) : value;

    if (isNaN(num)) {
      return '0';
    }

    // For numbers less than 1000, return as is
    if (num < 1000) {
      return num.toString();
    }

    // For numbers between 1000 and 999999, format with K
    if (num < 1000000) {
      const formatted = (num / 1000).toFixed(1);
      // Remove trailing .0
      return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'K' : formatted + 'K';
    }

    // For numbers 1000000 and above, format with M
    const formatted = (num / 1000000).toFixed(1);
    return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'M' : formatted + 'M';
  }
}
