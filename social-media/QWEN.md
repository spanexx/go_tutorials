# SocialHub - Angular Social Media Application

## Project Overview

**SocialHub** is a modern social media platform built with **Angular 18**, featuring a clean design inspired by shadcn UI. Despite the parent directory name (`go_tutorials`), this is an **Angular/TypeScript frontend project** - a complete social media application with feed, profiles, messages, notifications, bookmarks, analytics, and more.

### Key Features

- **Feed** - Infinite scroll posts with reactions, replies, and sharing
- **Authentication** - Login/register with protected routes and session persistence
- **Profile System** - View/edit profiles with stats, bio, and customization
- **Explore** - Trending topics, suggested users, activity feed
- **Messages** - Direct messaging between users
- **Notifications** - Real-time notifications with type filtering
- **Bookmarks** - Save posts to custom, color-coded collections
- **Analytics Dashboard** - Engagement metrics, follower growth, post performance
- **Settings** - Theme toggle (light/dark), privacy, notification preferences
- **Keyboard Shortcuts** - Command palette (Cmd/Ctrl+K), navigation shortcuts

### Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Angular 18 |
| Language | TypeScript 5.4 |
| Styling | SCSS with CSS variables (shadcn-inspired design tokens) |
| Icons | Lucide Angular |
| State | Angular Signals, RxJS |
| Testing | Jasmine, Karma |
| Build | Angular CLI |

---

## Project Structure

```
social-media/
├── src/
│   ├── app/
│   │   ├── pages/              # Page components (feed, profile, explore, etc.)
│   │   ├── components/         # Core components (create-post, post-card, thread)
│   │   ├── shared/             # Shared modules
│   │   │   ├── services/       # 20+ services (auth, posts, notifications, etc.)
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── directives/     # Custom directives
│   │   │   ├── pipes/          # Custom pipes (hashtag, mention, post-content)
│   │   │   ├── guards/         # Route guards (authGuard, guestGuard)
│   │   │   ├── utils/          # Utility functions (validators, helpers, strings)
│   │   │   └── constants/      # App constants
│   │   ├── app.component.ts    # Root component
│   │   └── app.routes.ts       # Route definitions
│   ├── styles.scss             # Global styles & design tokens
│   ├── main.ts                 # Bootstrap file
│   └── environments/           # Environment configurations
├── docs/
│   ├── PLAN/                   # Development plan (Ralph agent workflow)
│   └── README.md               # Detailed documentation (DevThread spec)
├── .ralph/                     # Ralph agent workspace
├── .github/                    # GitHub workflows
├── angular.json                # Angular CLI configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── ralph.sh                    # Ralph agent implementation loop script
```

---

## Building and Running

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (http://localhost:4200)
npm start

# Build for production
npm run build

# Watch mode
npm run watch

# Run unit tests
npm test

# Run linting
npm run lint
```

### Build Configuration

| Configuration | Command | Description |
|---------------|---------|-------------|
| Development | `npm start` | Dev server with hot reload |
| Production | `npm run build` | Optimized production build |
| Watch | `npm run watch` | Build on file changes |
| Test | `npm test` | Run unit tests with Karma |
| Lint | `npm run lint` | Run ESLint |

---

## Development Conventions

### TypeScript Configuration

- **Strict mode** enabled (`strict: true`)
- **No implicit any** - proper typing required
- **No property access from index signature** - explicit typing
- **No fallthrough cases in switch** - explicit fallthrough comments
- **Target**: ES2022, **Module**: ES2022

### Coding Standards

1. **Standalone Components** - Angular 18+ standalone components preferred
2. **Signals** - Use Angular Signals for reactive state management
3. **OnPush Change Detection** - Use `changeDetection: ChangeDetectionStrategy.OnPush`
4. **Proper Typing** - Avoid `any`, use interfaces and types
5. **Barrel Exports** - Use path aliases (`@shared`, `@pages`, `@components`)

### Import Path Aliases

```typescript
// Services
import { ToastService, AuthService, PostService } from '@shared';

// Components
import { FeedComponent, ProfileComponent } from '@pages';
import { CreatePostComponent, PostCardComponent } from '@components';

// Utilities
import { validateEmail, formatRelativeTime } from '@shared/utils';
```

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Components | `*.component.ts` | `feed.component.ts` |
| Services | `*.service.ts` | `auth.service.ts` |
| Directives | `*.directive.ts` | `infinite-scroll.directive.ts` |
| Pipes | `*.pipe.ts` | `hashtag.pipe.ts` |
| Guards | `*.guard.ts` | `auth.guard.ts` |
| Utils | `*.ts` | `validators.ts`, `helpers.ts` |

### Testing Practices

- Unit tests with **Jasmine** and **Karma**
- Test files: `*.spec.ts` alongside source files
- Test services, components, pipes, and guards
- E2E testing ready for Playwright integration

---

## Design System

### CSS Variables (Design Tokens)

The project uses a shadcn-inspired design system with CSS variables:

```scss
:root {
  // Colors (HSL format)
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --accent: 240 4.8% 95.9%;
  --destructive: 0 84.2% 60.2%;
  --border: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  
  // Shadows
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  
  // Radius
  --radius: 0.75rem;
}

.dark {
  /* Dark theme overrides */
}
```

### Typography

- **Font**: Inter (Google Fonts)
- **Base Size**: 16px
- **Scale**: 0.75rem to 2rem
- **Line Height**: 1.6

### Spacing

- **Base Unit**: 0.5rem (8px)
- **Common**: 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem

---

## Key Services

| Service | Purpose |
|---------|---------|
| `AuthService` | User authentication, session management |
| `PostService` | Post CRUD, feed loading |
| `ReactionService` | Post reactions (Like, Love, Laugh, Wow, Sad, Angry) |
| `ReplyService` | Comment/reply system |
| `NotificationService` | Real-time notifications |
| `BookmarkCollectionService` | Bookmark management |
| `AnalyticsService` | Engagement metrics |
| `ThemeService` | Light/dark mode toggle |
| `ToastService` | Toast notifications |
| `SearchService` | Search posts, users, hashtags |
| `SharePostService` | Share functionality |
| `LightboxService` | Image lightbox |
| `KeyboardShortcutsService` | Keyboard shortcuts |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `?` | Show keyboard shortcuts help |
| `Esc` | Close modal/dropdown |
| `G F` | Go to Feed |
| `G E` | Go to Explore |
| `G M` | Go to Messages |
| `G N` | Go to Notifications |
| `G P` | Go to Profile |
| `G B` | Go to Bookmarks |
| `G S` | Go to Settings |
| `G A` | Go to Analytics |
| `C` | Compose new post |
| `/` | Focus search |
| `T` | Scroll to top |

---

## Ralph Agent Workflow

This project includes **Ralph scripts** for agentic development:

### Scripts

| Script | Purpose |
|--------|---------|
| `ralph.sh` | Main implementation loop |
| `ralph-validator.sh` | Validates build and bookkeeping |
| `ralph-critic.sh` | Scans for TODOs/stubs, generates PRD backlog |

### Usage

```bash
# Run implementation loop (5 iterations)
./ralph.sh 5

# Critic scan + iterations
./ralph.sh 5 --critic

# With validation every 2 iterations
./ralph.sh 10 --validate-every 2

# Validator only
./ralph-validator.sh 3
```

### How It Works

1. **`docs/PLAN`** is the source of truth for development tasks
2. Each iteration completes **one PRD item** (`passes: false` → `true`)
3. Agent performs bookkeeping (updates `Progress.md`, marks PRD complete)
4. Validator checks build status and correctness

---

## Current State (Iteration 30)

### Build Status: ✅ PASS

- **Build Time**: 15.8s
- **Main Bundle**: 752KB
- **Estimated Transfer**: ~156KB

### Code Quality: ✅ EXCELLENT

- Zero TODO/FIXME/HACK comments
- No console.log in production code
- Strong typing throughout (no `any`)
- Proper memory management (OnDestroy, subscription cleanup)

### Features Completed

- [x] User authentication with guards
- [x] Feed with infinite scroll
- [x] Post reactions (6 types)
- [x] Reply system with nesting
- [x] Hashtag support
- [x] User mentions
- [x] Analytics dashboard
- [x] Dark mode toggle
- [x] Bookmark collections
- [x] Image lightbox
- [x] Keyboard shortcuts
- [x] Activity feed
- [x] Profile cards
- [x] Toast notifications
- [x] Skeleton loading

### Recommended Next Steps

1. **Add Testing Foundation** - Unit tests for services, E2E with Playwright
2. **API Integration** - Replace mock data with real HTTP calls
3. **Error Boundaries** - Add global error handler
4. **Route Lazy Loading** - Optimize bundle size
5. **Accessibility** - Add ARIA labels, keyboard navigation testing

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Documentation Files

| File | Description |
|------|-------------|
| [README.md](README.md) | Project overview and getting started |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community guidelines |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [RALPH.md](RALPH.md) | Ralph agent scripts documentation |
| [docs/README.md](docs/README.md) | Detailed DevThread specification |

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Latest |
| Firefox | Latest |
| Safari | Latest |
| Edge | Latest |

---

## Quick Reference

### Component Template

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  template: `<p>{{ title() }}</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
  title = signal('Example Component');
}
```

### Service Template

```typescript
import { Injectable, signal } from '@angular/core';
import { ToastService } from '@shared';

@Injectable({ providedIn: 'root' })
export class ExampleService {
  data = signal<any[]>([]);

  constructor(private toastService: ToastService) {}

  loadData() {
    // Load data logic
    this.toastService.success('Success', 'Data loaded');
  }
}
```

### Using Validators

```typescript
import { validateEmail, validatePassword, validateRequired } from '@shared/utils';

// Email validation
const emailResult = validateEmail('user@example.com');
if (!emailResult.valid) {
  // Handle error
}

// Password validation
const passwordResult = validatePassword('password123', { minLength: 8 });

// Required field validation
const requiredResult = validateRequired(value);
```

---

*Last updated: 2026-02-20*
*Project iteration: 30*
