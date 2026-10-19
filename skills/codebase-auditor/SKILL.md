---
name: codebase-auditor
description: Audits security, code cleanliness, test coverage, and validation compliance across HabiTrack backend and frontend components. Use when refactoring, adding routes, verifying multi-database compatibility, or checking endpoints prior to production releases.
---

# Codebase Auditor

Executes a comprehensive review of endpoint security, input validation, SQL injection safety, multi-database query compatibility, and test coverage across the HabiTrack platform.

## When to Use

- Adding new API routes, controller endpoints, or background workers.
- Refactoring database interactions or switching between SQLite (local) and PostgreSQL (cloud).
- Performing pre-release security reviews (authentication, rate-limiting, token leakage).
- Verifying regression tests and linting before creating pull requests.

## Steps

### 1. Endpoint Security & Protection Checks
1. Ensure all private REST endpoints in `src/routes/` mount the `authenticateToken` middleware from `src/middlewares/auth.middleware.js`.
2. Verify rate-limiting enforcement:
   - `authLimiter` applied on authentication paths (`/api/auth/otp`, `/api/auth/verify`).
   - `apiLimiter` applied on general data mutating endpoints.
3. Verify parameter and body validation using Zod schemas (`src/schemas/`) piped through `validate(schema)` middleware.

### 2. SQL Injection & Database Abstraction Verification
1. Inspect all query statements in `src/controllers/` and `src/services/`.
2. Enforce strict parameterization:
   - Reject raw string interpolation/concatenation.
   - Use dialect-agnostic abstractions or handle positional placeholders (`?` in SQLite vs `$1, $2` in PostgreSQL) via `src/config/database.js`.

### 3. Automated Test Execution
1. Run the Vitest test suite and ensure 100% pass rate:
   ```bash
   npm test
   ```
2. Verify test isolation: mocks must intercept external SMTP dispatches and third-party scraping requests.

### 4. Code Quality & Formatting
1. Run ESLint checks against `src/`:
   ```bash
   npm run lint
   ```
2. Format codebase using Prettier:
   ```bash
   npm run format
   ```

## Gotchas

- **Positional parameters in PostgreSQL**: SQLite accepts numbered parameters or `?`, while PostgreSQL strictly requires `$1, $2...`. Always use helper query wrappers from `src/config/database.js`.
- **Sensitive local files**: Never commit `casas.db` or unencrypted `.env` files into Git.
