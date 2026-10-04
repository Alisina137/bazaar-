# BazaarLink Project State

## Sources of truth

1. Product Specification V1 — defines intended product scope and behavior.
2. Actual repository — defines current implementation reality.
3. Software Development Workflow V5 — defines implementation process.

## Repository baseline

- Repository: Alisina137/bazaar-
- Default branch: main
- Initial repository state: empty
- Active product phase: Phase 1 — Foundation
- Phase branch: phase-01-foundation
- Implementation status: Phase planned; no product implementation started.

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

- 1.1 Repository and monorepo foundation
- 1.2 Shared design system and mobile application shell
- 1.3 Localization, RTL/LTR, and AFN formatting foundation
- 1.4 Core PostgreSQL data layer and database tooling
- 1.5 Authentication and secure session foundation
- 1.6 Account roles, authorization boundaries, and Phase 1 integration/regression

## Current task

Not started. Awaiting `Start Task 1.1`.

## Known external requirements

Database and other external-service credentials will only be required when the relevant task reaches integration and cannot proceed safely without them.
