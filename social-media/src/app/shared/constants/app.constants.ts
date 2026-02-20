/**
 * Application Constants
 * Centralized configuration for app-wide constants
 */

/**
 * App information
 */
export const APP_CONFIG = {
  name: 'SocialHub',
  version: '1.0.0',
  description: 'A modern social media platform built with Angular 18',
  author: 'SocialHub Team'
} as const;

/**
 * API configuration
 */
export const API_CONFIG = {
  baseUrl: '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
} as const;

/**
 * Pagination settings
 */
export const PAGINATION_CONFIG = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],
  maxPageSize: 100
} as const;

/**
 * Post configuration
 */
export const POST_CONFIG = {
  maxContentLength: 280,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  minContentLength: 1
} as const;

/**
 * User configuration
 */
export const USER_CONFIG = {
  minUsernameLength: 3,
  maxUsernameLength: 30,
  minPasswordLength: 6,
  maxPasswordLength: 128,
  minBioLength: 0,
  maxBioLength: 160,
  maxNameLength: 50,
  avatarPlaceholder: 'https://i.pravatar.cc/150?img=1'
} as const;

/**
 * Reaction types available
 */
export const REACTION_TYPES = {
  like: { emoji: '👍', label: 'Like' },
  love: { emoji: '❤️', label: 'Love' },
  laugh: { emoji: '😂', label: 'Haha' },
  wow: { emoji: '😮', label: 'Wow' },
  sad: { emoji: '😢', label: 'Sad' },
  angry: { emoji: '😠', label: 'Angry' }
} as const;

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  like: 'like',
  comment: 'comment',
  share: 'share',
  follow: 'follow',
  mention: 'mention'
} as const;

/**
 * Theme configuration
 */
export const THEME_CONFIG = {
  default: 'light',
  storageKey: 'socialhub_theme',
  systemPreference: true
} as const;

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  user: 'socialhub_user',
  theme: 'socialhub_theme',
  token: 'socialhub_token',
  collections: 'socialhub_collections',
  preferences: 'socialhub_preferences'
} as const;

/**
 * Keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  openCommandPalette: { key: 'k', modifiers: ['ctrl', 'meta'] },
  showHelp: { key: '?' },
  close: { key: 'escape' },
  navigate: {
    feed: { key: 'f', prefix: 'g' },
    explore: { key: 'e', prefix: 'g' },
    messages: { key: 'm', prefix: 'g' },
    notifications: { key: 'n', prefix: 'g' },
    profile: { key: 'p', prefix: 'g' },
    bookmarks: { key: 'b', prefix: 'g' },
    settings: { key: 's', prefix: 'g' },
    analytics: { key: 'a', prefix: 'g' }
  },
  actions: {
    compose: { key: 'c' },
    search: { key: '/' },
    scrollTop: { key: 't' }
  }
} as const;

/**
 * Breakpoints for responsive design (in pixels)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 900,
  xl: 1024,
  xxl: 1200
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  enter: 200,
  exit: 150
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  enabled: true
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  network: 'Unable to connect to the server. Please check your internet connection.',
  unauthorized: 'Please log in to continue.',
  forbidden: 'You do not have permission to access this resource.',
  notFound: 'The requested resource was not found.',
  server: 'Something went wrong. Please try again later.',
  validation: 'Please check your input and try again.',
  unknown: 'An unexpected error occurred.'
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  saved: 'Successfully saved.',
  deleted: 'Successfully deleted.',
  updated: 'Successfully updated.',
  created: 'Successfully created.',
  posted: 'Your post has been published.'
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  short: 'MMM d, y',
  medium: 'MMM d, y, h:mm a',
  long: 'MMMM d, y, h:mm:ss a',
  relative: 'relative'
} as const;

/**
 * Image placeholders
 */
export const IMAGE_PLACEHOLDERS = {
  avatar: 'https://i.pravatar.cc/150',
  cover: 'https://picsum.photos/1200/300',
  post: 'https://picsum.photos/600/400'
} as const;

/**
 * Social media links
 */
export const SOCIAL_LINKS = {
  twitter: 'https://twitter.com/intent/tweet',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  linkedin: 'https://www.linkedin.com/shareArticle',
  whatsapp: 'https://wa.me/'
} as const;

/**
 * Route paths
 */
export const ROUTES = {
  home: '/',
  feed: '/feed',
  explore: '/explore',
  messages: '/messages',
  notifications: '/notifications',
  profile: '/profile',
  bookmarks: '/bookmarks',
  settings: '/settings',
  analytics: '/analytics',
  login: '/login',
  register: '/register',
  notFound: '/404',
  error: '/error'
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  serverError: 500
} as const;
