# BazaarLink Project State

## Sources of truth

1. Product Specification V1 — defines intended product scope and behavior.
2. Actual repository — defines current implementation reality.
3. Software Development Workflow V5 — defines implementation process.

## Repository baseline

- Repository: Alisina137/bazaar-
- Local project root: existing user folder named `bazaar`
- Default branch: main
- Active product phase: Phase 6 — Delivery
- Phase branch: main
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

Complete, verified, and merged into `main`.

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

Post-merge mobile corrections were also delivered:
- PR #4 surfaced the Phase 2 seller entry point on the customer Home screen.
- PR #5 added visible customer and seller bottom-navigation icons.

## Phase 3 — Catalog & Inventory

### Status

Complete and verified on `phase-03-catalog-inventory`.

### Product outcomes

- category and subcategory management
- seller product catalog
- product images
- configurable variants
- product/variant inventory
- low-stock tracking and stock-adjustment history
- Starter / Pro / Business catalog-limit enforcement
- public storefront catalog rendering

### Task plan

- [x] 3.1 Catalog contracts and PostgreSQL schema
- [x] 3.2 Category hierarchy and plan-aware category management
- [x] 3.3 Product CRUD, lifecycle, pagination, and plan limits
- [x] 3.4 Product images and configurable variants
- [x] 3.5 Product-level and variant-level inventory
- [x] 3.6 Seller mobile catalog/inventory experience
- [x] 3.7 Public storefront catalog and Phase 3 regression

### Delivered

- category create, edit, reorder, archive, restore, image/icon metadata, and subcategory parenting
- active subcategory and product safeguards prevent unsafe category archival
- Starter active-category limit enforced transactionally; Pro/Business retain unlimited category entitlement
- complete seller product model with required and advanced fields from Product Specification V1
- Draft, Active, Out of Stock, Archived, and Plan Restricted product states
- non-archived product limits enforced transactionally: Starter 15, Pro 300, Business 1,200
- archived products do not consume the product limit
- Plan Restricted products are blocked from publication and are excluded from the public catalog
- paginated seller product listing so large catalogs are not loaded entirely into client state
- product image metadata management and public storefront images with lazy loading
- configurable product variants with option values, SKU, price override, image, availability, and independent stock
- inventory at variant level when variants exist, otherwise at product level
- database checks plus atomic conditional updates prevent stock from dropping below reserved quantities under concurrent adjustments
- stock adjustments persist previous/new quantity and reason in inventory history
- low-stock thresholds plus a complete seller low-stock endpoint and mobile list
- atomic reservation/release operations protect product-level and variant-level free stock under concurrent updates; checkout/order orchestration remains deferred
- stock changes automatically transition published products between Active and Out of Stock
- seller Products tab is now a real catalog dashboard with current plan usage
- dedicated category, product creation/editing, image, variant, and inventory screens
- simple-first product creation with optional advanced fields
- Store and Preview screens now consume live catalog data
- public published storefront renders active/out-of-stock catalog products while hiding draft, archived, and Plan Restricted products
- Dari, Pashto, and English Phase 3 localization
- seller/store ownership boundaries continue to protect catalog mutations
- real PostgreSQL integration coverage for store ownership, category rules, product publishing, variants, inventory, public visibility, low-stock behavior, and Starter plan limits

### Database migration

- `0003_green_roland_deschain.sql`
- adds `category_status` and `product_status` enums
- adds `categories`, `products`, `product_images`, `product_variants`, and `inventory_movements`
- preserves existing Phase 1/2 data
- adds store/product/category/variant foreign keys and catalog/inventory indexes
- adds non-negative price/quantity/threshold constraints

### Acceptance

Passed: a merchant can build a real sellable catalog with categories, products, images, variants, and inventory; publish products into a published storefront; and operate within current subscription limits without loading an entire large catalog into mobile state.

### Verification

GitHub Actions run `37256956007` passed after the final atomic inventory reservation/release and concurrency-safety regression coverage.

Verified gates include:

- fresh PostgreSQL 17
- migration history and schema-drift verification
- Phase 1 + Phase 2 + Phase 3 migrations
- live database connectivity
- ESLint
- all workspace TypeScript checks
- database schema tests
- catalog service rule tests
- PostgreSQL catalog/inventory lifecycle integration tests
- cross-owner catalog isolation
- category-in-use safeguards
- Starter 5-category limit
- Starter 15-product limit
- negative-inventory prevention
- reservation/release capacity protection
- stock adjustments cannot consume reserved quantity
- product stock-state transitions
- low-stock endpoint
- public-catalog data projection
- three-language localization parity and mobile raw-text guard
- Fastify production build
- Next.js admin/storefront production builds
- Expo mobile web export

### Deferred by design

- actual paid subscription upgrade/downgrade activation remains in the Merchant Growth phase; Phase 3 models and enforces the documented current entitlements and Plan Restricted product state without inventing pricing or bypassing the required downgrade grace/merchant-selection flow
- checkout/order creation, reservation expiry, and order-to-reservation ownership remain in the checkout/order phases; Phase 3 provides the atomic inventory reservation primitives they will consume
- central marketplace discovery/search/filter/product-detail behavior remains Phase 4


## Phase 4 — Marketplace

### Status

Complete and verified on `phase-04-marketplace`.

### Product outcomes

- marketplace home
- platform categories
- search
- filtering and sorting
- customer product pages
- customer store pages

### Acceptance

Customer can reliably discover active products from published stores.

### Task plan

- [x] 4.1 Marketplace data model and public contracts
- [x] 4.2 Marketplace browse/search/filter/sort API
- [x] 4.3 Mobile marketplace home, categories, and discovery UX
- [x] 4.4 Customer product detail experience
- [x] 4.5 Customer store pages and public product sharing
- [x] 4.6 Low-connectivity, recently viewed, localization, and Phase 4 regression

### Phase 4 delivered

- platform-wide Dari/Pashto/English marketplace taxonomy with merchant-to-marketplace category mapping
- central marketplace home with categories, recommended, nearby-by-province, popular, new, deals, featured stores, and recently viewed
- public product discovery restricted to Active / Out of Stock products from published stores
- search across product name, store, marketplace category, brand, tags, and description
- autocomplete suggestions for products, stores, categories, and brands
- category, price, province, store, brand, in-stock, and discount filtering
- relevance, newest, price ascending/descending, and popularity sorting
- explicit capability metadata for rating/verified/delivery/payment filters whose authoritative data belongs to later phases rather than fabricated Phase 4 values
- paginated customer results and store catalog results
- privacy-preserving aggregate product-view popularity metrics
- customer product pages with images, prices/discounts, variants, stock, seller identity, descriptions, related products, public sharing, and future delivery/payment/review data boundaries
- customer store pages with public identity, categories, and paginated active catalog
- shareable public web product pages plus existing store pages
- saved recently viewed products and cache-backed home/browse/product/store fallback for unreliable connections
- seller product create/edit mapping to BazaarLink marketplace taxonomy
- three-language localization with RTL/LTR behavior preserved
- real PostgreSQL marketplace regression covering store visibility, product visibility, search, filtering, suggestions, details, nearby/home sections, recently viewed input, store pages, popularity views, and suspended-store hiding

### Phase 4 verification

GitHub Actions run `37291079686` passed the complete repository gate with the marketplace PostgreSQL integration suite enabled.

### Task 4.1 — Marketplace data model and public contracts

Delivered:

- platform-wide localized category taxonomy separate from merchant-private categories
- nullable product-to-marketplace-category mapping so existing Phase 3 data remains valid
- seeded Afghanistan-first root marketplace categories plus common subcategories
- privacy-preserving aggregate product-view metrics for future Popular ranking without storing viewer identity
- marketplace browse indexes for category, product price/publication time, store status, and province
- public marketplace contracts for home sections, category records, product/store summaries, product details, search suggestions, browse pagination, and store pages
- Catalog product create/update contracts now support optional marketplace-category mapping
- additive migration `0004_marketplace_discovery.sql`
- Drizzle snapshot/journal updated with zero schema drift
- database schema regression coverage extended for marketplace tables and product mappings

Deferred to later Phase 4 tasks:

- public discovery endpoints and ranking queries
- seller UI for selecting a marketplace category
- mobile marketplace/search/filter screens
- product and store detail screens
- recently viewed/offline caching



## Phase 5 — Cart & Pricing

### Status

Complete and verified on `phase-05-cart-pricing`.

### Product outcomes

- persistent customer cart
- multi-store merchant grouping
- live product-discount and coupon-aware pricing
- Afghanistan-friendly saved customer addresses
- server-authoritative pricing engine
- checkout foundation

### Delivered

- one persistent server-backed cart per signed-in customer
- Add to Cart and Buy Now connected from public marketplace product pages
- variant selection and live stock validation before adding or changing quantity
- customer cart grouped by merchant so later delivery/payment/order logic remains merchant-scoped
- live server repricing on every cart read and checkout quote instead of trusting client or stale cart prices
- explicit detection when seller price or compare-at discount changes after an item was added
- product discounts calculated from current compare-at price versus current sell price
- coupon pricing infrastructure for percentage, fixed, minimum-order, activation-window, and seller-scoped coupons
- only one manual coupon selection per merchant group; complicated coupon stacking is intentionally disabled
- Pro/Business coupon entitlement enforced by the pricing engine; Starter remains ineligible
- merchant coupon/promotion creation and campaign management remain deferred to the Merchant Growth phase instead of being pulled forward
- current cart stock is revalidated against available minus reserved inventory; stale cart quantities become blocking issues rather than silently overselling
- published-store, active/out-of-stock product, subscription, and variant visibility revalidated server-side during cart and checkout
- Afghanistan-friendly saved addresses with country, province, district/city, area/neighborhood, address description, landmark, phone, optional map pin, and delivery instructions
- first saved address becomes default; customers can create, edit, delete, and choose a default address
- address ownership is user-scoped and map-pin coordinates are kept as a valid latitude/longitude pair
- checkout flow establishes Address → Delivery → Payment → Review → Place Order without fabricating later-phase data
- persisted 15-minute checkout pricing quotes bound to the customer cart and selected address
- authoritative Phase 5 total covers current items, product discounts, and eligible coupon discounts
- delivery fee, urgency surcharge, delivery-specific product surcharge, configured disclosed fees, and legally configured tax are not invented before their authoritative phases/configuration exist
- Delivery is explicitly pending Phase 6, Payment pending Phase 7, and Place Order blocked until the order phase
- customer Account exposes saved address management
- Dari, Pashto, and English cart/address/checkout localization with existing RTL/LTR behavior preserved
- dedicated cart/pricing contracts, safe public error codes, route validation, and rate-limited checkout quote creation

### Database migration

- `0005_cart_pricing.sql`
- adds `coupon_discount_type` and `checkout_session_status` enums
- adds `customer_addresses`, `carts`, `cart_items`, `store_coupons`, `cart_store_coupons`, and `checkout_sessions`
- enforces one active cart per user and one selected coupon per cart/store pair
- keeps product deletion protected while referenced by cart items
- stores cart price snapshots only for change detection; authoritative totals always use live catalog data
- preserves all Phase 1–4 data and uses additive foreign keys, indexes, and quantity/value checks

### Acceptance

Passed: a customer can add products from multiple published stores, see them grouped by merchant, receive current product-discount/coupon-aware server pricing, manage a locally appropriate delivery address, and create an authoritative address-bound pre-delivery checkout quote. Price and stock changes are detected before checkout and block unsafe progression.

### Verification

GitHub Actions run `37299864188` passed the complete repository gate after the final Phase 5 address invariant.

Verified Phase 5 gates include:

- zero Drizzle migration/schema drift
- fresh Phase 1–5 migration application on PostgreSQL 17
- live database connectivity
- ESLint and all workspace TypeScript checks
- 17 database tests across 6 files, including Phase 5 commerce schema coverage
- 53 API tests across 15 files
- real PostgreSQL Phase 5 lifecycle integration covering two merchants in one cart
- product discount and one-seller-coupon pricing
- Pro coupon eligibility enforcement and Starter ineligibility unit coverage
- Afghanistan-friendly saved-address persistence and cross-account isolation
- address map-pin invariant coverage
- authoritative checkout quote persistence and later-phase boundaries
- live seller price-change repricing
- inventory dropping below cart quantity and checkout blocking
- three-language localization raw-text verification
- Fastify production build
- Expo mobile web export
- Next.js admin/storefront production builds

### Deferred by design

- delivery coverage, delivery options, delivery base fees, urgency surcharge, delivery-specific product surcharge, and delivery estimate remain Phase 6
- real seller payment-method availability and payment selection remain Phase 7
- order creation, inventory-reservation ownership/expiry orchestration, merchant suborders, and final Place Order remain Phase 8
- merchant-facing coupon/promotion campaign management and broader promotional tooling remain the Merchant Growth phase
- no tax percentage is assumed; tax remains configurable and subject to legal review before activation


## Phase 6 — Delivery

### Status

Complete and verified on `main`.

### Product outcomes

- merchant delivery availability
- store pickup
- store delivery origin
- location zones
- distance rules
- delivery speeds and urgency pricing
- product delivery restrictions and surcharges
- deterministic delivery estimates
- checkout integration

### Delivered

- merchant-controlled delivery and pickup availability
- every store receives a persisted delivery-settings record initialized from the store's current location/profile
- store delivery origin supports address, province, district, area, and optional latitude/longitude
- Afghanistan-friendly location zones using province, district/city, and area/neighborhood matching
- overlapping zones are deterministic: higher configured priority wins, then more-specific location match, then stable ID tie-break
- delivery-zone fees are non-negative and every zone must define at least one location matcher
- advanced distance pricing for entitled plans:
  - fixed distance tiers
  - base fee plus per-kilometer pricing
- straight-line Haversine distance is used as a deterministic fallback when both origin and customer map coordinates exist; the rule audit records that distance source
- delivery pricing priority follows the product specification:
  - explicit matching zone
  - configured distance rule
  - store default delivery fee
  - unavailable
- every calculated option returns the exact rule used for audit/debugging
- store pickup is a zero-delivery-fee fulfillment option with configurable preparation ETA
- merchants can configure economy, standard, same-day, express, and custom delivery speeds
- urgency pricing supports fixed surcharges and multipliers over the base delivery fee
- speed eligibility can constrain:
  - minimum order amount
  - maximum range
  - cutoff time
  - supported weekdays
  - maximum known order weight
- merchant-wide delivery settings can constrain:
  - minimum order
  - operating weekdays
  - cutoff time
  - free-delivery threshold
- free delivery is applied after base delivery, urgency, and product delivery surcharges so the customer sees the full discount explicitly
- product-level delivery profiles are supported:
  - normal
  - bulky
  - fragile
  - pickup-only
  - no-express
  - seller-delivery-only
  - digital/no-delivery
- products can carry an additive delivery surcharge applied per cart quantity
- digital-only merchant groups automatically receive a zero-fee digital fulfillment option
- pickup-only products block delivery while preserving pickup when allowed
- seller-delivery-only products block pickup
- no-express products remove express options
- delivery availability revalidates current cart, store status, subscription state, address ownership, stock/pricing state, and current delivery configuration during checkout
- delivery options are calculated separately for every merchant group in a multi-store cart
- customer checkout now loads real delivery options after address selection and requires one valid selection per merchant group
- checkout shows:
  - item subtotal
  - product discounts
  - coupon discounts
  - delivery base fees
  - urgency surcharges
  - product delivery surcharges
  - free-delivery discounts
  - final total before payment
- delivery-ready checkout quotes are persisted for 15 minutes and snapshot the exact delivery options/pricing used
- changing merchant delivery configuration later does not rewrite a persisted quote snapshot
- Payment remains explicitly pending Phase 7 and Place Order remains blocked until Phase 8
- seller More exposes a real Delivery management screen
- seller Delivery UI covers availability, pickup, origin, zones, distance rules, delivery speeds, free-delivery threshold, minimum order, operating days, cutoff time, and pickup ETA
- product create/edit screens expose delivery profile and product delivery surcharge
- Starter plans retain basic zone/default/pickup delivery capability while advanced distance-rule controls follow the existing advanced-delivery entitlement
- Dari, Pashto, and English delivery/customer/seller localization is included with existing RTL/LTR behavior preserved

### Database migration

- `0006_normal_micromacro.sql`
- adds:
  - `delivery_distance_rule_type`
  - `delivery_surcharge_type`
  - `delivery_speed_kind`
  - `delivery_product_profile`
- adds:
  - `store_delivery_settings`
  - `delivery_zones`
  - `delivery_distance_rules`
  - `delivery_speeds`
- extends products with `delivery_profile` and `delivery_surcharge`
- adds non-negative fee/surcharge checks, distance-range checks, ETA checks, zone matcher requirements, and delivery indexes
- migration is additive and preserves all Phase 1–5 data

### Acceptance

Passed: delivery availability and pricing are deterministic for every checkout merchant group, with an auditable rule source, eligible fulfillment methods, speed/urgency adjustments, product delivery restrictions, free-delivery behavior, estimates, and a server-authoritative delivery-ready checkout total.

### Verification

GitHub Actions run `37322482284` passed on exact `main` commit `b843f97dff3a9f5c10af301d0d7be323223884ae`.

Verified Phase 6 gates include:

- zero Drizzle migration/schema drift
- fresh Phase 1–6 migration application on PostgreSQL 17
- database schema invariant tests for delivery settings/zones/rules/speeds/product profiles
- deterministic delivery service unit coverage
- real PostgreSQL Phase 6 integration lifecycle
- overlapping-zone specificity/priority behavior
- product delivery surcharge calculation
- urgency surcharge calculation
- free-delivery behavior
- outside-coverage behavior
- address and merchant ownership boundaries
- persisted delivery-ready quote
- product restriction handling
- seller delivery configuration API and mobile flow
- customer delivery-option and checkout integration
- three-language localization verification
- all workspace lint/typecheck/build gates
- Expo mobile export
- Fastify production build
- Next.js admin/storefront builds

### Deferred by design

- real merchant payment-method configuration and payment selection remain Phase 7
- order creation, inventory reservation ownership/expiry, merchant suborders, fulfillment state, and final Place Order remain Phase 8
- external road-routing/map-provider distance is not fabricated; Phase 6 records straight-line fallback when coordinates are available and remains deterministic without an external routing dependency
- configurable tax remains inactive until a legally reviewed tax configuration exists

## Current phase

Phase 6 — Delivery is complete and verified. Phase 7 — Payments is the next product phase.

## Last known-good baseline

- Branch: `main`
- Commit: `b843f97dff3a9f5c10af301d0d7be323223884ae`
- Verification run: `37322482284`

## Verification workflow

- Local `pnpm verify` runs deterministic lint, typecheck, unit, localization, and build checks without invoking remote database integration suites.
- `pnpm test:integration` explicitly runs the auth, store, catalog, marketplace, cart/pricing, and delivery PostgreSQL integration suites serially against the configured root `.env` database.
- GitHub Actions sets `RUN_DATABASE_INTEGRATION_TESTS=true` and continues to run the complete PostgreSQL integration suite against fresh PostgreSQL 17 on every push/PR.
- Unexpected catalog failures are logged server-side before returning the safe public `service_unavailable` response.

## Known external requirements

CI verifies the current marketplace, cart/pricing, and delivery baseline against fresh PostgreSQL 17.

Local API/store execution requires a valid `DATABASE_URL` in the root `.env` file. Docker is optional when a hosted PostgreSQL database such as Neon is used.

Physical-device seller testing requires `EXPO_PUBLIC_API_URL` to point to an API URL reachable from the phone.

The public storefront runtime requires `API_URL` or `NEXT_PUBLIC_API_URL` to point to the BazaarLink API.
