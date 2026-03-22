# Backup and Restore Tests

This directory contains comprehensive automated tests for the backup and restore functionality of the Board Game Night application.

## Test Coverage

### Backup Endpoints
- **GET /api/backup/collection**: Tests backup of game collections including all new schema fields (artists, minAge, complexity, bggRating, bggRatingsCount, bggRank)
- **GET /api/backup/plays**: Tests backup of play logs with game and player relationships

### Restore Endpoints
- **POST /api/restore/collection**: Tests restoration of game collections with conflict resolution
- **POST /api/restore/plays**: Tests restoration of play logs with player matching

## Test Categories

### Authentication Tests
- Verifies 401 responses when not authenticated
- Ensures endpoints properly check for valid sessions

### Backup Tests
- Full backup with all schema fields (new and old)
- Empty collection handling
- Null/undefined field handling
- Database error handling

### Restore Tests
- Conflict detection and analysis
- Three conflict resolution strategies: skip, replace, keepBoth
- New field preservation (artists, ratings, complexity, etc.)
- Legacy backup compatibility (backups without new fields)
- Individual item error handling
- Empty array handling
- Invalid data validation

### Play Log Tests
- Game matching by bggId and title
- Player creation when not found
- Winner matching
- Skip existing plays
- Handle non-existent games

### Integration Tests
- Full backup → restore workflow for collections
- Full backup → restore workflow for plays
- Data integrity verification
- Relationship preservation

## Running the Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npx jest src/__tests__/api/backup-restore.test.ts
```

## Test Configuration

Tests are configured in:
- `jest.config.ts` - Main Jest configuration
- `jest.setup.ts` - Test environment setup

## Key Testing Features

### Schema Compatibility
The tests verify that:
1. All new database schema fields are properly backed up and restored
2. Legacy backups (without new fields like artists, ratings) can still be restored
3. JSON array fields (mechanics, categories, designers, publishers, artists) are correctly stringified/parsed

### Error Handling
Tests ensure graceful handling of:
- Database connection failures
- Individual item import errors
- Missing required fields
- Invalid data formats

### Conflict Resolution
Comprehensive tests for all three strategies:
- **skip**: Skip duplicate games
- **replace**: Delete existing and create new
- **keepBoth**: Keep both versions (allows duplicates)

## Mock Setup

The tests use Jest mocks for:
- `next-auth` - Session management
- `@/lib/prisma` - Database operations
- `@/lib/auth` - Auth configuration

This allows testing without requiring an actual database connection.

## Test Data

Tests use realistic mock data including:
- Games with all schema fields populated
- Games with null/optional fields
- Play logs with players and winners
- Edge cases (empty arrays, special characters, etc.)

## Continuous Integration

These tests can be integrated into CI/CD pipelines to ensure:
- Backup/restore functionality works after schema changes
- New features don't break existing backup compatibility
- Data integrity is maintained across operations
