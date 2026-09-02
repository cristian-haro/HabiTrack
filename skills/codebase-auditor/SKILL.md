---
name: codebase-auditor
description: >-
  Audits security, code cleanliness, test coverage, and validation compliance
  across HabiTrack backend and frontend components.
---

# Codebase Auditor Skill for HabiTrack

Use this skill when refactoring, adding new features, or verifying system integrity before deploying to production.

## Security & Architecture Checklist

### 1. Endpoint Security
- [ ] **Authentication:** All private routes must use `authenticateToken` middleware from [auth.middleware.js](file:///C:/Users/crist/Documents/GitHub/HabiTrack/src/middlewares/auth.middleware.js).
- [ ] **Rate Limiting:** Authentication routes must have `authLimiter` applied. General API must have `apiLimiter`.
- [ ] **Input Validation:** All body/query parameters must be validated using Zod schemas via `validate(schema)` middleware.
- [ ] **SQL Injection Prevention:** Never concatenate user input into SQL queries. Always use parameterized queries (`?` in SQLite, `$1, $2` in Postgres).

### 2. Multi-Database Compatibility
- [ ] Ensure queries function identically on SQLite (local development / testing) and PostgreSQL (production).

### 3. Automated Test Verification
Run the complete test suite before committing:
```bash
npm test
```

### 4. Code Quality & Formatting
```bash
npm run lint
npm run format
```
