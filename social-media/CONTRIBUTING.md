# Contributing to SocialHub

Thank you for your interest in contributing to SocialHub! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## 🤝 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a welcoming and inclusive community.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/socialhub.git
   cd socialhub
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/original-owner/socialhub.git
   ```

## 💻 Development Setup

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:4200`

### Run Tests

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Format code
npm run format
```

## 📝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes**: Fix reported issues
- **New Features**: Implement new functionality
- **Documentation**: Improve documentation
- **Performance Improvements**: Optimize existing code
- **UI/UX Improvements**: Enhance user interface
- **Tests**: Add or improve test coverage
- **Code Quality**: Refactor and improve code structure

### Finding Issues to Work On

1. Check the [Issues](https://github.com/your-username/socialhub/issues) page
2. Look for issues labeled:
   - `good first issue` - Great for first-time contributors
   - `help wanted` - Needs community help
   - `bug` - Bug fixes needed
   - `enhancement` - New features

### Working on an Issue

1. Comment on the issue to let others know you're working on it
2. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Test your changes thoroughly
5. Commit and push your changes
6. Open a Pull Request

## 📐 Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define proper types for all variables and functions
- Use interfaces for object types
- Avoid `any` type unless absolutely necessary

### Angular

- Use standalone components (Angular 18+)
- Use Angular Signals for state management
- Follow Angular Style Guide
- Use OnPush change detection where possible
- Implement proper error handling

### Code Style

```typescript
// ✅ Good - Proper typing and documentation
/**
 * Calculate user engagement score
 * @param likes - Number of likes
 * @param comments - Number of comments
 * @returns Engagement score
 */
function calculateEngagement(likes: number, comments: number): number {
  return likes + (comments * 2);
}

// ❌ Bad - No typing or documentation
function calc(l, c) {
  return l + c * 2;
}
```

### File Naming

- Components: `component-name.component.ts`
- Services: `service-name.service.ts`
- Directives: `directive-name.directive.ts`
- Pipes: `pipe-name.pipe.ts`
- Guards: `guard-name.guard.ts`
- Constants: `name.constants.ts`
- Utilities: `name.utils.ts` or `name.helpers.ts`

### Directory Structure

```
src/app/
├── pages/           # Page components
├── components/      # Reusable components
├── shared/          # Shared modules
│   ├── services/    # Services
│   ├── components/  # Shared components
│   ├── directives/  # Directives
│   ├── pipes/       # Pipes
│   ├── guards/      # Route guards
│   ├── utils/       # Utility functions
│   └── constants/   # Constants
└── environments/    # Environment configs
```

## 📝 Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
feat(feed): add infinite scroll functionality

# Bug fix
fix(auth): resolve login redirect issue

# Documentation
docs(readme): update installation instructions

# Refactor
refactor(services): simplify authentication logic

# With scope
feat(ui): add skeleton loading components
```

### Commit Best Practices

- Keep commits atomic and focused
- Write clear, concise commit messages
- Reference issues in commit messages when applicable
- Use present tense ("add" not "added")

## 🔀 Pull Request Process

### Before Submitting

1. **Update Documentation**: Ensure README and other docs are updated
2. **Run Tests**: All tests must pass
3. **Check Linting**: No linting errors
4. **Update CHANGELOG**: Add entry for your changes
5. **Rebase on Main**: Ensure your branch is up to date

### PR Template

When creating a PR, please include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged

## 🐛 Issue Reporting

### Bug Reports

When reporting a bug, please include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Browser, OS, Node version
- **Screenshots**: If applicable
- **Console Errors**: Any error messages

### Feature Requests

When requesting a feature:

- **Problem**: What problem does this solve?
- **Solution**: Proposed solution
- **Alternatives**: Alternative solutions considered
- **Use Cases**: Example use cases
- **Additional Context**: Any other relevant information

## 📚 Resources

- [Angular Style Guide](https://angular.io/guide/styleguide)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Signals](https://angular.io/guide/signals)

## 🙏 Thank You!

Your contributions make SocialHub better for everyone. We appreciate your time and effort in making this project great!

---

For questions or discussions, please open an issue or join our community discussions.
