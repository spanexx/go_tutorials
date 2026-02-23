# Task Manager CLI Guide

## Overview

The task manager has been successfully migrated from manual markdown files to a structured CLI system. All tasks from the plan directory have been organized into phases, milestones, and individual tasks.

## Quick Start

### View All Tasks
```bash
./task-manager-dev task list
```

### View Tasks by Status
```bash
./task-manager-dev task list status:todo
./task-manager-dev task list status:in_progress
./task-manager-dev task list status:done
```

### View Tasks by Priority
```bash
./task-manager-dev task list priority:urgent
./task-manager-dev task list priority:high
./task-manager-dev task list priority:medium
./task-manager-dev task list priority:low
```

### View Tasks by Phase
```bash
./task-manager-dev task list phase:phase-1
./task-manager-dev task list phase:phase-2
./task-manager-dev task list phase:phase-3
./task-manager-dev task list phase:phase-4
./task-manager-dev task list phase:phase-5
```

### View Tasks by Milestone
```bash
./task-manager-dev task list milestone:milestone-2-28
```

### View Specific Task Details
```bash
./task-manager-dev task show task-65
```

### Mark Task as Complete
```bash
./task-manager-dev task complete task-65
```

### View Statistics
```bash
./task-manager-dev stats
```

### Search Tasks
```bash
./task-manager-dev task list search:"backend"
./task-manager-dev task list search:"authentication"
```

## Structure

### Phases (6 total)
- **Phase 1:** Phase 0: Critic Backlog - Backend unmocking and basic functionality
- **Phase 2:** Phase 1: Foundation - Authentication, Core UI, Feed, Backend Foundation, Email Service
- **Phase 3:** Phase 2: Social Interactions - Reactions, Comments, Hashtags, Sharing, Social Graph, Posts API
- **Phase 4:** Phase 3: Advanced Features - Notifications, Bookmarks, Search, Analytics, Images, Messages, Realtime
- **Phase 5:** Phase 4: Polish & Scale - Real-time, PWA, Accessibility, i18n, Performance, Admin, Production Backend
- **Phase 6:** Phase 5: Testing - Backend & Frontend Unit Tests, Integration Tests, E2E Tests

### Task Statistics
- **Total Tasks:** 106
- **High Priority:** 58
- **Medium Priority:** 44
- **Low Priority:** 4
- **Status:** All currently in "todo" state

## Key Milestones with Tasks

### Go Backend Foundation (milestone-2-28)
- 12 tasks covering:
  - Project structure & module setup
  - Database schema & migrations
  - Configuration management
  - HTTP server setup
  - Repository layer (sqlc)
  - Service layer & business logic
  - JWT authentication
  - HTTP handlers & routes
  - API documentation
  - Integration tests
  - Docker setup
  - Build scripts

### Posts Service API (milestone-3-35)
- 8 tasks covering:
  - CRUD endpoints
  - Database schema
  - Feed algorithms
  - Comments
  - Search & filtering
  - Pagination
  - Integration tests
  - Frontend service

### Realtime Service (milestone-4-42)
- 8 tasks covering:
  - WebSocket server setup
  - Connection & authentication
  - Real-time notifications
  - Presence tracking
  - Typing indicators
  - Message broadcasting
  - Frontend service
  - Integration tests

### Production Backend (milestone-5-49)
- 8 tasks covering:
  - Redis caching
  - Rate limiting
  - Monitoring & logging
  - Error handling
  - Performance optimization
  - Database backup
  - Horizontal scaling
  - API versioning

## Workflow

1. **View Current Work**
   ```bash
   ./task-manager-dev task list status:in_progress
   ```

2. **Start a New Task**
   ```bash
   ./task-manager-dev task show task-65
   # Review details, then update status
   ```

3. **Mark Task In Progress** (update status)
   ```bash
   # Use the task show command to view, then update via the application
   ```

4. **Complete Task**
   ```bash
   ./task-manager-dev task complete task-65
   ```

5. **View Progress**
   ```bash
   ./task-manager-dev stats
   ```

## Exporting

### Export to Markdown
```bash
./task-manager-dev export markdown > tasks.md
```

### Export to JSON
```bash
./task-manager-dev export json > tasks.json
```

## Data Location

All task data is stored in:
```
.task-manager/
├── tasks.json          # Main task database
└── activity.log        # Activity log
```

## Notes

- Tasks are now centralized and easier for agents to reference
- All previous manual markdown tracking has been migrated
- The system supports filtering, searching, and bulk operations
- Activity is automatically logged for audit trails
- No more need to manually update multiple files

## Agent Instructions

When working on tasks, agents should:
1. Use `task list` to see what needs to be done
2. Use `task show <id>` to get full details
3. Use `task complete <id>` when finished
4. Update progress regularly with `stats`
5. Reference task IDs in commit messages and documentation
