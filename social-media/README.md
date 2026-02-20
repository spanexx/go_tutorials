# SocialHub - Angular Social Media Application

A beautiful, modern social media platform built with Angular 18, featuring a clean design inspired by shadcn UI design system.

![SocialHub Banner](docs/banner.png)

## ✨ Features

### Core Features
- **Feed Page** - View and interact with posts from other users with infinite scroll
- **Create Posts** - Compose and share new posts with images, character count, and emoji support
- **Profile Page** - View and edit user profiles with stats, bio, and customizable information
- **Explore Page** - Discover trending topics, suggested users, and activity feed
- **Messages** - Direct messaging between users with conversation list
- **Notifications** - Real-time notifications with filtering by type (likes, comments, follows, mentions)
- **Bookmarks** - Save posts to custom collections with color-coded organization
- **Analytics Dashboard** - Track engagement metrics, follower growth, and post performance
- **Settings** - Manage account settings, notifications, privacy, and theme preferences

### Interaction Features
- **Post Reactions** - React with Like, Love, Laugh, Wow, Sad, or Angry emojis
- **Reply System** - Post replies to threads with nested conversation support
- **Hashtags** - Clickable hashtags with dedicated hashtag pages showing related posts
- **User Mentions** - Mention other users with @username syntax and clickable profile links
- **Share Posts** - Share posts to Twitter, Facebook, LinkedIn, WhatsApp, Email, or copy link
- **Image Lightbox** - Full-screen image viewing with zoom, gallery navigation, and download

### User Experience
- **Search** - Real-time search for posts, users, and hashtags with dropdown results
- **Keyboard Shortcuts** - Command palette (Cmd/Ctrl+K) for quick navigation and actions
- **Dark Mode** - Toggle between light and dark themes with system preference detection
- **Toast Notifications** - Beautiful toast messages for user feedback
- **Skeleton Loading** - Loading placeholders for smooth content transitions
- **Profile Cards** - Hover over usernames to see quick profile previews
- **Activity Feed** - Real-time activity stream showing platform interactions
- **Bookmark Collections** - Organize saved posts into custom, color-coded collections

### Authentication
- **Login/Register** - User authentication with form validation
- **Protected Routes** - Auth guards for authenticated and guest users
- **Session Persistence** - LocalStorage-based session management
- **User Menu** - Profile dropdown with quick access to settings and logout

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/socialhub.git
cd socialhub

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

The application will be available at `http://localhost:4200`

## 📁 Project Structure

```
src/
├── app/
│   ├── pages/
│   │   ├── feed/                    # Main feed page with infinite scroll
│   │   ├── profile/                 # User profile and edit pages
│   │   ├── explore/                 # Explore/discover page
│   │   ├── messages/                # Direct messaging
│   │   ├── notifications/           # Notifications page with filters
│   │   ├── bookmarks/               # Bookmarks with collections
│   │   ├── settings/                # Settings and preferences
│   │   ├── analytics/               # Analytics dashboard
│   │   ├── hashtag/                 # Hashtag pages
│   │   └── auth/                    # Login and register pages
│   ├── components/
│   │   ├── create-post/             # Post creation with image upload
│   │   ├── post-card/               # Individual post display
│   │   └── thread/                  # Thread/reply display
│   ├── shared/
│   │   ├── header/                  # Top navigation bar
│   │   ├── sidebar/                 # Side navigation menu
│   │   ├── services/                # Reusable services
│   │   ├── components/              # Reusable components
│   │   ├── directives/              # Custom directives
│   │   ├── pipes/                   # Custom pipes
│   │   └── guards/                  # Route guards
│   ├── app.component.ts             # Root component
│   ├── app.routes.ts                # Route definitions
│   └── app.component.scss           # Root styles
├── styles.scss                      # Global styles & design tokens
├── main.ts                          # Bootstrap file
└── docs/                            # Documentation assets
```

## 🎨 Design System

This project uses a modern design system with CSS variables for theming:

### Colors
| Variable | Description |
|----------|-------------|
| `--accent` | Primary accent color (purple) |
| `--destructive` | Error/destructive actions (red) |
| `--success` | Success states (green) |
| `--warning` | Warning states (yellow) |
| `--info` | Info states (blue) |
| `--muted` | Muted backgrounds |
| `--foreground` | Text color |
| `--background` | Page background |
| `--card` | Card backgrounds |
| `--border` | Border color |
| `--ring` | Focus ring color |

### Typography
- **Font Family**: Inter
- **Base Size**: 16px
- **Scale**: 0.75rem to 2rem

### Spacing
- **Base Unit**: 0.5rem (8px)
- **Common**: 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem

### Border Radius
- **Default**: 0.5rem (8px)
- **Small**: 0.375rem (6px)
- **Large**: 0.75rem (12px)
- **Full**: 9999px (pills/circles)

### Shadows
- **Small**: Subtle elevation
- **Medium**: Card elevation
- **Large**: Modal/dropdown elevation

## ⌨️ Keyboard Shortcuts

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

## 🛠️ Technologies Used

- **Angular 18** - Frontend framework
- **TypeScript** - Type-safe JavaScript
- **SCSS** - CSS preprocessor
- **RxJS** - Reactive programming
- **Lucide Icons** - Beautiful icon library
- **Angular Signals** - Reactive state management

## 📦 Key Components

### Header
- Global search with real-time results
- Theme toggle (light/dark)
- Notifications badge with unread count
- User avatar with dropdown menu

### Sidebar
- Navigation menu with icons
- Active route highlighting
- Quick post creation button
- Keyboard shortcuts hint

### Feed
- Post creation with character count
- Infinite scroll for loading more posts
- Post reactions (6 types)
- Reply system with nesting
- Share functionality
- Image lightbox

### Notifications
- Filter by type (All, Likes, Comments, Shares, Follows, Mentions)
- Mark as read/unread
- Delete notifications
- Real-time unread count

### Analytics
- Engagement metrics
- Follower growth chart
- Top performing posts
- Hashtag performance

## 🌐 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Latest |
| Firefox | Latest |
| Safari | Latest |
| Edge | Latest |

## 🔧 Development Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## 📝 Code Quality

### ESLint Configuration
The project uses ESLint with Angular-specific rules for code quality.

### Style Guide
- Follow Angular Style Guide
- Use standalone components
- Use Angular Signals for state management
- Proper TypeScript typing
- Consistent naming conventions

### Testing
```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run e2e
```

## 🚀 Performance Optimizations

- Lazy loading for routes
- Image lazy loading
- Virtual scrolling for large lists
- OnPush change detection
- Tree-shakable services
- Production build optimizations

## 🔐 Security Features

- XSS protection via DomSanitizer
- CSRF token support
- Secure authentication flow
- Input validation
- Sanitized user content

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: 640px, 768px, 900px, 1024px, 1200px
- Touch-friendly interactive elements
- Adaptive layouts

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Make your changes and commit:
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
4. Push to your branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

### Code Review Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 💻 Code Examples

### Creating a New Component

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent {
  title = 'Example Component';
}
```

### Using Services

```typescript
import { Component } from '@angular/core';
import { ToastService } from '@shared';

@Component({
  selector: 'app-example',
  standalone: true,
  template: `<button (click)="showToast()">Click me</button>`
})
export class ExampleComponent {
  constructor(private toastService: ToastService) {}

  showToast() {
    this.toastService.success('Success!', 'Operation completed');
  }
}
```

### Using Utilities

```typescript
import { formatRelativeTime, validateEmail } from '@shared';

// Format date
const timeAgo = formatRelativeTime(new Date()); // "5m ago"

// Validate email
const result = validateEmail('user@example.com');
if (result.valid) {
  // Email is valid
}
```

### Keyboard Shortcuts

```typescript
// Open command palette
Cmd/Ctrl + K

// Navigate to Feed
G F

// Navigate to Explore
G E

// Compose new post
C

// Focus search
/

// Show help
?
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspired by [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- Built with [Angular](https://angular.io)

## 📞 Support

For issues and questions:
- Create an issue in the [repository](https://github.com/yourusername/socialhub/issues)
- Check existing [documentation](README.md)
- Review the [Contributing Guide](CONTRIBUTING.md)
- Read the [Code of Conduct](CODE_OF_CONDUCT.md)
- Check the [CHANGELOG](CHANGELOG.md) for version history

## 📚 Documentation

- [README](README.md) - Project overview and getting started
- [CONTRIBUTING](CONTRIBUTING.md) - How to contribute to the project
- [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) - Community guidelines
- [CHANGELOG](CHANGELOG.md) - Version history and changes

## 🗺️ Roadmap

### Completed ✅
- [x] User authentication
- [x] Search functionality
- [x] Hashtag support
- [x] User mentions
- [x] Analytics dashboard
- [x] Dark mode toggle
- [x] Bookmark collections
- [x] Post reactions
- [x] Reply system
- [x] Image lightbox
- [x] Keyboard shortcuts
- [x] Activity feed
- [x] Profile cards
- [x] Toast notifications
- [x] Infinite scroll
- [x] Skeleton loading

### In Progress 🚧
- [ ] Real-time notifications with WebSockets
- [ ] Image uploads and optimization
- [ ] Post scheduling

### Planned 📋
- [ ] Admin panel
- [ ] Advanced analytics
- [ ] Mobile app (Ionic/Capacitor)
- [ ] PWA support
- [ ] i18n support
- [ ] Accessibility improvements

---

Built with ❤️ using Angular 18
