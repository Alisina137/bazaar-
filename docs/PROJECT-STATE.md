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

Passed.

The application boots reliably, users can authenticate in Dari, Pashto, and English, PostgreSQL migrations are reproducible, secure sessions restore/revoke correctly, and server-side role boundaries reject unauthorized access.

### Task plan

- [x] 1.1 Repository and monorepo foundation
- [x] 1.2 Shared design system and mobile application shell
- [x] 1.3 Localization, RTL/LTR, and AFN formatting foundation
- [x] 1.4 Core PostgreSQL data layer and database tooling
- [x] 1.5 Authentication and secure session foundation
- [x] 1.6 Account roles, authorization boundaries, and Phase 1 integration/regression

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

## Task 1.5 — Authentication and secure session foundation

### Status

Complete and verified.

### Delivered

- shared authentication contracts for API/mobile
- email/password account registration and login
- email normalization and generic invalid-credential responses
- Argon2id password hashing
- opaque cryptographically random 256-bit session tokens
- SHA-256 session-token hashes stored in PostgreSQL instead of raw session tokens
- configurable session expiry and last-seen touch intervals
- server-side session restoration, expiry validation, revocation, and account-status checks
- authenticated `GET /auth/session` route and `POST /auth/logout` revocation
- rate-limited registration and login endpoints with safe rate-limit responses
- Zod request validation with non-leaking error responses
- database-backed auth repository with transaction-safe account creation
- mobile SecureStore session-token persistence on supported native platforms
- mobile startup session restoration and invalid-session cleanup
- localized register/login/logout/session-loading UI in Dari, Pashto, and English
- localized authentication error states
- mobile-specific Expo API environment template for physical-device testing
- verified safe HTTP 429 rate-limit response shape
- authentication environment configuration in `.env.example`
- Argon2 native build allowlist for pnpm 12
- focused service and API route tests
- PostgreSQL-backed end-to-end authentication integration test
- contracts package source resolution for mobile/API workspace consumers

### Verification

GitHub Actions run 37204050715 passed on Task 1.5 after the final rate-limit regression fix.

Verified gates:

- PostgreSQL 17 initialization
- migration history and schema-drift checks
- committed migration application
- database connectivity
- ESLint
- all workspace TypeScript checks
- 4 AuthService tests
- 6 authentication-route tests, including verified HTTP 429 rate limiting
- 1 real PostgreSQL authentication lifecycle integration test
- all 14 API tests
- database/design-token/localization regression tests
- mobile localization raw-string verification
- Fastify API production build
- Expo mobile web export
- Next.js admin/storefront production builds

The PostgreSQL auth integration verified registration, session restoration, login, logout/revocation, and rejection of the revoked session.

### Git

- Core auth verification baseline: c8fdf1238925c1af37ee6a9f74c4f4e26486f113
- Final rate-limit status fix: 9d7e90b090630a93cf20de0c46411607b4a0bf23
- Verification run: 37204050715

## Task 1.6 — Account roles, authorization boundaries, and Phase 1 integration/regression

### Status

Complete and verified.

### Delivered

- persisted multi-role account model using a `user_roles` membership table
- roles: customer, merchant owner, merchant staff, platform support, platform admin, and super admin
- unauthenticated visitors remain an application state rather than a persisted role
- new registrations receive the customer role only
- migration backfills all existing users with the customer role
- registration schemas reject unknown privilege fields, including attempted client self-promotion
- sessions hydrate current roles from PostgreSQL rather than trusting client claims
- reusable server-side role guards return safe 401/403 responses
- merchant and platform authorization boundaries are explicitly separated
- account status remains independent from authorization roles
- mobile signed-in state displays server-trusted roles and authorized application modes without exposing a role editor
- role/mode/forbidden states localized in Dari, Pashto, and English
- shared contracts package now has separate Metro-safe source and Node-safe compiled entries
- CI returned to read-only migration verification after the committed role migration was generated
- complete Phase 1 regression across database, authentication, sessions, localization, authorization, mobile, API, admin, and storefront

### Database migration

- `0001_violet_archangel.sql`
- creates the `app_role` enum
- creates indexed `user_roles` memberships with a composite primary key
- backfills existing users to `customer`
- migration snapshot and journal committed
- schema generation reports no uncommitted drift

### Verification

GitHub Actions run 37205570313 passed the final Task 1.6 / Phase 1 verification.

Verified gates:

- PostgreSQL 17 initialization
- migration history validation
- zero schema/migration drift
- fresh database migrations
- live database connectivity
- ESLint
- all workspace TypeScript checks
- 8 database tests
- 3 design-token tests
- 4 localization tests
- 19 API tests across health, authentication, PostgreSQL integration, and role authorization
- client self-promotion regression coverage
- customer vs merchant vs platform authorization coverage
- mobile raw-string localization verification
- Fastify API production build
- Next.js admin production build
- Next.js storefront production build
- Expo mobile web export

### Git

- Final contracts/API regression fix before Phase state update: 0dde17a962c9bca9800f8c2c1f186fd79118e17f
- Final Phase 1 verification run: 37205570313

## Phase 1 status

Complete and verified. Phase 1 is the recovery baseline for Phase 2.

## Phase 2 — Merchant & Store

### Status

Complete and verified on `phase-02-merchant-store`.

### Product outcomes

- seller onboarding
- store creation
- store settings
- subscription entitlements
- storefront basics
- seller navigation

### Delivered

- signed-in customers can enter the seller onboarding flow without a separate account
- required store identity and location fields are validated server-side
- optional store profile fields, theme, accent color, contact details, and business hours can be edited later
- unique normalized public store handles
- transactional store creation with an active Starter subscription
- automatic trusted `merchant_owner` role assignment after store creation
- Starter, Pro, and Business entitlement definitions using documented limits
- current paid upgrade activation remains deferred to the documented Merchant Growth phase; Phase 2 exposes the plan capabilities without inventing pricing
- seller navigation: Dashboard, Products, Orders, Store, More
- seller can switch back to Shopping mode without a second account
- store preview and publish workflow
- suspended stores and unavailable subscriptions cannot publish
- repeated publish is idempotent
- unpublished stores are not publicly readable
- published empty stores are available through the public store API and `/store/[handle]` storefront page
- public storefront respects the store language direction and exposes only public store information
- owner-scoped store reads and updates prevent one user from managing another user's store
- Dari, Pashto, and English seller/store localization
- Phase 3/8 functionality remains visibly deferred rather than partially implemented

### Database migration

- `0002_windy_nehzno.sql`
- adds store status/theme and subscription plan/status enums
- adds `stores` and `store_subscriptions`
- enforces unique public handles and one subscription row per store
- uses additive foreign keys and indexes; no existing Phase 1 data is deleted

### Acceptance

Passed: a signed-in merchant can create a valid empty store, preview it, publish it, receive the `merchant_owner` role, and access the published store publicly.

### Verification

GitHub Actions run 37210407024 passed after recovering the missing migration and removing a dead store error contract.

Verified gates:

- PostgreSQL 17 initialization
- migration history validation
- zero schema/migration drift
- fresh Phase 1 + Phase 2 migrations
- live database connectivity
- ESLint
- all workspace TypeScript checks
- 11 database tests
- 3 design-token tests
- 4 localization tests
- 33 API/auth/authorization/store tests
- real PostgreSQL merchant ownership + draft/publish/public lifecycle integration
- cross-user store ownership protection
- duplicate handle protection
- mobile localization raw-string verification
- Fastify API production build
- Next.js admin production build
- Next.js storefront production build
- Expo mobile web export

### Recovery / corrections

The original Phase 2 PR was merged before its final CI gate was green. The correction branch preserves that implementation and fixes the two verification defects:
- committed the missing Drizzle Phase 2 migration/snapshot
- removed an unused `store_already_exists` contract value that broke the exhaustive mobile error mapper

CI has been restored to read-only migration verification after recovery.

## Current phase

Phase 2 is complete and verified on the correction branch. The correction PR must be reviewed/merged into `main` before Phase 3 starts.

## Last known-good baseline

- Branch: `phase-02-merchant-store`
- Verification run: `37210407024`

## Known external requirements

CI verifies Phase 2 against fresh PostgreSQL 17.

Local API/store execution requires a valid `DATABASE_URL` in the root `.env` file. Docker is optional when a hosted PostgreSQL database such as Neon is used.

Physical-device seller testing requires `EXPO_PUBLIC_API_URL` to point to an API URL reachable from the phone.

The public storefront runtime requires `API_URL` or `NEXT_PUBLIC_API_URL` to point to the BazaarLink API.
