# Milestone 5.8 - Database Integration Tests

## Problem Statement
Database integration tests validate complex database operations including migrations, transactions, constraints, and multi-table queries. These tests ensure data integrity and verify that schema changes work correctly.

## Success Metrics
- All migrations tested (up and down)
- Transaction rollback verified
- Database constraints enforced
- Complex queries return correct results
- Connection pooling works correctly

## Non-Goals
- Repository method testing (covered in Milestone 5.2)
- Business logic testing (covered in Milestone 5.1)

## Items

### Item 5.8.1 - Migration Tests
**Type:** Integration Test
**Description:** Test database migrations up and down.
**Acceptance Criteria:**
- Test all migrations apply cleanly
- Test migration downgrades work
- Test migration idempotency
- Test schema version tracking
- Test migration locking (concurrent)
- Test seed data migrations
- Verify table creation order
**Passes:** false

### Item 5.8.2 - Transaction Tests
**Type:** Integration Test
**Description:** Verify transaction isolation and rollback.
**Acceptance Criteria:**
- Test transaction commit persists data
- Test transaction rollback reverts data
- Test nested transactions handling
- Test deadlock detection and retry
- Test transaction timeout handling
- Test concurrent transaction isolation
- Verify ACID properties
**Passes:** false

### Item 5.8.3 - Constraint Tests
**Type:** Integration Test
**Description:** Verify database constraints are enforced.
**Acceptance Criteria:**
- Test NOT NULL constraints
- Test UNIQUE constraints (email, username)
- Test FOREIGN KEY constraints
- Test CHECK constraints
- Test DEFAULT values
- Test constraint error messages
- Test cascading deletes
**Passes:** false

### Item 5.8.4 - Complex Query Tests
**Type:** Integration Test
**Description:** Test complex multi-table queries.
**Acceptance Criteria:**
- Test recursive CTE for comment trees
- Test trending score calculation
- Test feed generation queries
- Test aggregation with GROUP BY
- Test subqueries performance
- Test JOIN operations
- Test window functions
**Passes:** false

### Item 5.8.5 - Index Tests
**Type:** Integration Test
**Description:** Verify index usage and performance.
**Acceptance Criteria:**
- Test unique indexes prevent duplicates
- Test composite index usage
- Test partial index conditions
- Test GIN index for full-text search
- Test index-only scans
- Test query planner index selection
**Passes:** false

### Item 5.8.6 - Connection Pool Tests
**Type:** Integration Test
**Description:** Test database connection management.
**Acceptance Criteria:**
- Test connection pool limits
- Test connection timeout handling
- Test connection health checks
- Test graceful shutdown
- Test max connection handling
- Test connection leak detection
**Passes:** false

## Affected Files
- `backend/tests/integration/db_migration_test.go`
- `backend/tests/integration/db_transaction_test.go`
- `backend/tests/integration/db_constraint_test.go`
- `backend/tests/integration/db_query_test.go`
- `backend/tests/integration/db_index_test.go`
- `backend/tests/integration/db_connection_test.go`

## Affected Dependencies
- testify/suite
- testcontainers-go/postgres
- golang-migrate/migrate

## Notes
- Use dedicated test database instance
- Reset database state between tests
- Test both success and failure scenarios
- Measure query execution times
