/**
 * Capitalize the first letter of a string
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param str - The string to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Convert string to slug (URL-friendly)
 * @param str - The string to slugify
 * @returns Slugified string
 */
export function toSlug(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert camelCase to space-separated words
 * @param str - The camelCase string
 * @returns Space-separated string
 */
export function fromCamelCase(str: string): string {
  if (!str) return '';
  return str.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Extract hashtags from text
 * @param text - The text to extract hashtags from
 * @returns Array of hashtags (without #)
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#\w+/g);
  return matches ? matches.map(tag => tag.substring(1)) : [];
}

/**
 * Extract mentions from text
 * @param text - The text to extract mentions from
 * @returns Array of mentions (without @)
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/@\w+/g);
  return matches ? matches.map(mention => mention.substring(1)) : [];
}

/**
 * Remove all HTML tags from string
 * @param html - The HTML string
 * @returns Plain text
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Wrap text at specified character count
 * @param text - The text to wrap
 * @param maxLength - Maximum characters per line
 * @returns Wrapped text with newlines
 */
export function wrapText(text: string, maxLength: number = 80): string {
  if (!text || text.length <= maxLength) return text;

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

/**
 * Count words in a string
 * @param text - The text to count words in
 * @returns Word count
 */
export function countWords(text: string): number {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Check if string contains emoji
 * @param str - The string to check
 * @returns True if contains emoji
 */
export function containsEmoji(str: string): boolean {
  const emojiRegex = /[\p{Emoji}]/u;
  return emojiRegex.test(str);
}

/**
 * Remove emoji from string
 * @param str - The string to remove emoji from
 * @returns String without emoji
 */
export function removeEmoji(str: string): string {
  if (!str) return '';
  const emojiRegex = /[\p{Emoji}]/gu;
  return str.replace(emojiRegex, '').trim();
}

/**
 * Generate initials from name
 * @param name - The full name
 * @returns Initials (first 2 letters)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  const names = name.trim().split(/\s+/);
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

/**
 * Format username for display (add @ if missing)
 * @param username - The username
 * @returns Formatted username with @
 */
export function formatUsername(username: string): string {
  if (!username) return '';
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Parse JSON safely
 * @param json - JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}
