# BazaarLink Project State

## Sources of truth

1. Product Specification V1 — defines intended product scope and behavior.
2. Actual repository — defines current implementation reality.
3. Software Development Workflow V5 — defines implementation process.

## Repository baseline

- Repository: Alisina137/bazaar-
- Local project root: existing user folder named `bazaar`
- Default branch: main
- Active product phase: Phase 1 — Foundation
- Phase branch: phase-01-foundation
- Initial repository state: empty before Phase 1 planning
- Phase baseline commit: 536d7b575182988cfb31ee9c483fe5f50f19f228
- Package manager: pnpm 12.6
- Minimum Node.js: 22.13

## Phase 1 — Foundation

### Product outcomes

- Monorepo/application foundation
- Design system
- Dari, Pashto, and English localization with RTL/LTR behavior
- Authentication
- Account roles
- Core PostgreSQL database layer

### Phase acceptance

The application boots reliably and users can authenticate in all supported languages.

### Task plan

- [x] 1.1 Repository and monorepo foundation
- [x] 1.2 Shared design system and mobile application shell
- [x] 1.3 Localization, RTL/LTR, and AFN formatting foundation
- [x] 1.4 Core PostgreSQL data layer and database tooling
- [ ] 1.5 Authentication and secure session foundation
- [ ] 1.6 Account roles, authorization boundaries, and Phase 1 integration/regression

## Task 1.1 — Repository and monorepo foundation

### Status

Complete and verified.

### Delivered

- pnpm workspace and shared TypeScript baseline
- Expo SDK 57 mobile app foundation
- Fastify API foundation with a health route
- Next.js administration foundation
- Next.js public storefront companion foundation
- shared package boundaries for contracts, design tokens, localization, and database
- environment example and Git-safe ignore rules
- repository verification scripts
- GitHub Actions verification workflow
- project README and run commands
- pnpm 12 build-script allowlist for required native/tooling dependencies
- explicit Expo SDK 57 application entry compatible with the monorepo layout

### Verification

GitHub Actions run 37195114990 passed after the Task 1.1 documentation update.

### Git

- Task implementation baseline commit: d598ab396e155a96be46b02a2b7f2da6cd1fbb58
- Dependency-build policy fix: d61bd99b133cfcd735a7bdda950fc605e5098e20
- Expo entry fix: 4ec69130f7ac3fff14bbbb080fdd080c5cbf117b
- Task state commit: e70b4a17b07608c9f9b0a38445d3ddbc529b0930

## Task 1.2 — Shared design system and mobile application shell

### Status

Complete and verified.

### Delivered

- shared primitive and semantic design tokens
- light and dark application themes
- spacing, radius, typography, touch-target, opacity, and elevation tokens
- reusable mobile `AppText`, `Button`, `Card`, `Badge`, `TextField`, `StateView`, and `Screen` components
- safe-area and keyboard-aware mobile screen structure
- automatic system light/dark theme selection
- Expo Router foundation using the SDK 57 router
- five-tab customer shell: Home, Marketplace, Cart, Orders, Account
- placeholder screens that establish navigation without implementing later product phases early
- not-found route
- design-token invariant tests, including minimum interactive touch size

### Verification

GitHub Actions run 37196129758 passed on Task 1.2.

Verified gates:

- dependency installation
- ESLint
- all workspace TypeScript checks
- API focused test
- 3 design-token invariant tests
- all shared-package builds
- Fastify API build
- Next.js admin production build
- Next.js storefront production build
- Expo Router web export

### Git

- Main Task 1.2 implementation: 35b3de47b7892d79e2c1b3f728ff1f6d27345849
- Text variant correction: 3828bc60b3c1835ab5329aea32f872fab038ea15
- Metro/module-resolution correction: bf37be398a0d8ab985744311758611758fc7a7ea

## Task 1.3 — Localization, RTL/LTR, and AFN formatting foundation

### Status

Complete and verified.

### Delivered

- shared typed localization package for Dari (`fa-AF`), Pashto (`ps-AF`), and English
- complete translation-key parity for current Phase 1 mobile UI
- Dari fallback when the device locale is unsupported
- device locale detection via Expo Localization
- persistent user language selection via AsyncStorage
- runtime language switching without requiring a new account or reinstall
- RTL metadata for Dari and Pashto, LTR metadata for English
- direction-aware text, inputs, links, badges, buttons, badge rows, and tab ordering
- localized tab labels and current Phase 1 route content
- localized number formatting
- AFN currency formatting through `Intl.NumberFormat`
- language switcher using native language labels
- Expo Localization configuration in the mobile app
- automated localization tests
- verification guard against raw user-facing English strings in route/foundation UI

### Verification

GitHub Actions run 37197209869 passed on Task 1.3.

Verified gates:

- dependency installation
- ESLint
- all workspace TypeScript checks
- API focused test
- 3 design-token invariant tests
- 4 localization foundation tests
- mobile localization raw-string verification
- all shared-package builds
- Fastify API build
- Next.js admin production build
- Next.js storefront production build
- Expo Router web export

### Git

- Main Task 1.3 implementation: a09d412f96ac8c0a7f12a4f77830e0766361ebb9
- Lint verification correction: a2952f20ea17a032be78cd280f43792d198ce54f

## Task 1.4 — Core PostgreSQL data layer and database tooling

### Status

Complete and verified.

### Delivered

- PostgreSQL database package using Drizzle ORM 0.45.3 and Postgres.js 3.4.9
- Drizzle Kit 0.31.11 schema/migration tooling
- validated database environment configuration using Zod
- configurable connection-pool size, connect timeout, idle timeout, and prepared-statement behavior
- pooled-connection-safe default with prepared statements disabled unless explicitly enabled
- core `users`, `auth_accounts`, `auth_sessions`, and `auth_verification_tokens` tables
- authentication-provider, user-status, and verification-purpose PostgreSQL enums
- UUID primary keys, cascade relationships, expiry indexes, and unique token/account constraints
- committed initial Drizzle SQL migration and metadata snapshot
- migration history validation and schema-drift protection in CI
- PostgreSQL 17 integration service in CI
- migration runner, connectivity health script, and database package scripts
- API `/health/database` endpoint with safe unavailable responses
- API runtime database initialization and graceful connection shutdown
- root database commands for generate, check, migrate, health, and studio
- expanded `.env.example` for PostgreSQL configuration

### Verification

GitHub Actions run 37198830936 passed on Task 1.4.

Verified database gates:

- Drizzle migration history check
- schema generation produced no uncommitted migration drift
- initial migration applied to fresh PostgreSQL 17
- live database connectivity check
- 5 database package tests
- 3 API health tests
- full repository lint/typecheck/test/build verification

### Git

- Main Task 1.4 implementation: af2a6546e5bde34fd66ffc92a673d12ff3baaf9d
- Initial migration + migration drift guard: 07a9548b3fd1c572998664343eef732abf4f40b5

### Local development correction

Root cause: the example DATABASE_URL points to localhost, while CI automatically provided PostgreSQL but the repository did not provide an equivalent local PostgreSQL startup workflow. This could make local db:migrate/db:health fail even though CI was green.

Correction:
- added PostgreSQL 17 Docker Compose service
- added db:up, db:down, db:logs, and db:setup commands
- db:setup starts PostgreSQL, waits for health, migrates, and verifies connectivity
- database migration/health scripts now report actionable connection, credential, host, database, and SSL diagnostics
- added focused runtime-diagnostic regression tests
- documented local and hosted PostgreSQL workflows

Verification: GitHub Actions run 37201345518 passed migration history, schema drift, fresh migrations, database connectivity, and full repository verification after the correction.

## Current task

Task 1.4 is complete. Awaiting `Start Task 1.5`.

## Known external requirements

No external credentials are required for Task 1.3.

Task 1.4 is verified in CI against fresh PostgreSQL. Local API/database execution requires a valid DATABASE_URL in the root .env file.
