<!-- Copilot Instructions for Social Media App -->

# SocialHub Angular Social Media Application

## Project Overview
This is a beautiful, modern Angular 18 social media application with a clean design inspired by shadcn UI design system. The project features multiple pages including feed, profiles, messaging, notifications, and exploration.

## Setup Instructions

1. Install dependencies: `npm install`
2. Start development server: `npm start`
3. Build for production: `npm build`

## Key Features
- Feed with post creation and interactions
- User profiles with statistics
- Direct messaging system
- Notifications center
- Explore/discover page
- Responsive design for all devices
- Modern shadcn-inspired UI

## Architecture
- Standalone Angular components
- Signal-based reactivity
- CSS variables for theming
- SCSS for styling
- Responsive grid layouts

## Angular Industry Standards (from Angular Style Guide)

### Single Responsibility & Code Organization
- **Rule of One**: Define ONE component/service/pipe per file
- **File Size Limit**: Keep files under 400 lines of code
- **Small Functions**: Limit functions to 75 lines maximum
- **LIFT Principle**: 
  - **L**ocate code quickly
  - **I**dentify code at a glance
  - **F**lattest structure possible
  - **T**ry to be DRY (Don't Repeat Yourself)

### Naming Conventions
- **Pattern**: `feature.type.ts` (e.g., `hero-list.component.ts`)
- **File names**: Use dashes to separate words, dots to separate type
- **Classes**: Use UpperCamelCase
- **Components**: Suffix with `Component`, use kebab-case selector
- **Services**: Suffix with `Service` 
- **Directives**: Suffix with `Directive`
- **Pipes**: Suffix with `Pipe`
- **Modules**: Suffix with `Module`
- **Custom prefix**: Use app-specific prefix (e.g., `app-hero`, not just `hero`)

### Component Standards
- Use **element selectors** (not attribute or class selectors)
- Extract templates/styles to separate files when >3 lines
- Use **@Input/@Output decorators** instead of inputs/outputs metadata
- **Avoid aliasing** inputs and outputs
- Place **properties first**, then methods
- Place **public members before private**, alphabetized
- Delegate complex logic to services, keep components focused on views

### Services & Dependency Injection
- Services are **singletons** within the same injector
- Create service with **single responsibility**
- Provide services via `@Injectable({ providedIn: 'root' })` decorator
- Use `@Injectable()` decorator, not `@Inject()` parameters when possible
- Data services handle all data operations (API calls, storage, etc.)

### File Structure
- All code in `src/` folder
- **Feature-based organization**: Each feature in its own folder
- Create dedicated folders for components with multiple files (.ts, .html, .css, .spec)
- **Shared module** for reusable components/directives/pipes
- **Lazy-loaded features** in separate folders, not directly imported
- Maximum ~7-10 files per folder before creating subfolders

### Module Organization
- Create NgModule for each feature area
- **SharedModule** for reusable components across features
- Don't provide singleton services in SharedModule (use root providers instead)
- Import all required modules (CommonModule, FormsModule) in SharedModule

### Directives
- Use **attribute directives** for presentation logic without templates
- Prefer `@HostListener/@HostBinding` over `host` metadata property
- Use **custom prefix** for directives (e.g., `appHighlight`, not just `highlight`)

### Lifecycle & Testing
- Implement lifecycle hook interfaces (OnInit, OnDestroy, etc.)
- Keep tests in `.spec.ts` files matching component name
- One component per file for easy lazy loading
- Separate logic from presentation for better testability

### TypeScript & Types
- Use **--strictPropertyInitialization** compiler flag
- Initialize `@Input()` properties with default values
- Mark optional properties with `?` or provide defaults
- Avoid `!` non-null assertion unless absolutely necessary

### Best Practices
- ✅ Extract templates & styles to separate files
- ✅ Use standalone components (Angular 14+)
- ✅ Implement interfaces for type safety
- ✅ Use RxJS for async operations
- ✅ Keep presentation logic in component class, not template
- ✅ Use services for data access and business logic
- ❌ Avoid putting application logic in main.ts
- ❌ Don't repeat yourself (DRY principle)
- ❌ Avoid multiple responsibilities per file
- ❌ Don't use `ng` prefix for custom directives

## Development Notes
- All components are standalone (no NgModules)
- Global styles use CSS variables for theming
- Routes defined in app.routes.ts
- Bootstrap through main.ts
