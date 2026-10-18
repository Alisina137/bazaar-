# BazaarLink Project State

## Sources of truth

1. Product Specification V1 — defines intended product scope and behavior.
2. Actual repository — defines current implementation reality.
3. Software Development Workflow V5 — defines implementation process.

## Repository baseline

- Repository: Alisina137/bazaar-
- Local project root: existing user folder named `bazaar`
- Default branch: main
- Active product phase: Phase 12 — Release Readiness (code verified; real-world release gates outstanding)
- Phase branch: main
- Initial repository state: empty before Phase 1 planning
- Phase 10 verified code baseline: e79827a983180cfe49c30f1c06ec290330fa7c31
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

## Phase 7 — Payments

### Status

Complete and verified on `main`.

### Product outcomes

- Cash on Delivery
- Pay at Store for pickup
- HesabPay hosted checkout
- card-capable hosted payment path
- merchant-controlled payment availability
- per-merchant checkout payment selection
- server-owned payment state machine
- authenticated/idempotent provider webhooks
- payment failure/cancellation/expiry handling
- refund-request foundation

### Task plan

- [x] 7.1 Payment domain & data model
- [x] 7.2 Merchant payment settings
- [x] 7.3 Checkout payment availability and selection
- [x] 7.4 HesabPay sandbox and card-capable provider integration
- [x] 7.5 Webhooks, failure handling, and refund foundation
- [x] 7.6 Phase 7 integration/regression verification and close

### Delivered

- persisted payment settings per merchant store
- merchant Seller → More → Payments screen for:
  - Cash on Delivery
  - HesabPay
  - card
  - Pay at Store
- digital methods cannot be enabled until the server-side HesabPay provider is configured
- checkout calculates payment availability separately for every merchant group
- fulfillment-aware manual payment rules:
  - Cash on Delivery is available only for delivery fulfillment
  - Pay at Store is available only for pickup fulfillment
- HesabPay and card methods use hosted checkout when enabled and provider-ready
- the current card-capable path deliberately uses HesabPay hosted checkout because the gateway supports wallet, AfPay cards, and supported international cards without BazaarLink collecting card credentials
- provider abstraction remains independent from the payment method so another card gateway can be added later without rewriting the payment ledger
- payment attempts snapshot:
  - customer
  - checkout session
  - merchant
  - method/provider
  - authoritative merchant payable amount
  - AFN currency
  - provider session/transaction/reference
  - hosted checkout URL
  - failure state/reason
  - refund state
  - lifecycle timestamps
- hosted checkout charges the exact server-authoritative merchant total after product discounts, coupons, and delivery pricing; the provider amount is not reconstructed from client data
- duplicate checkout taps are protected with persisted idempotency keys
- manual methods transition to pending and are review-ready because money is collected later
- digital methods remain blocked from review until a verified provider webhook marks the attempt paid
- the browser/app redirect is explicitly non-authoritative and never marks an attempt paid
- HesabPay webhook signatures are verified server-to-server before any payment transition
- webhook amount must exactly match the persisted BazaarLink attempt amount
- provider transaction IDs and webhook deduplication keys make repeated success notifications replay-safe
- forged/unverified webhooks are rejected
- customers can cancel created/pending payment attempts
- pending digital attempts expire with the checkout quote
- merchant refund requests transition eligible paid/partially-refunded attempts into `refund_pending`
- refunds intentionally remain a manual-action foundation until a documented/approved provider refund operation is integrated; no undocumented provider refund behavior is fabricated
- customer checkout:
  - shows payment methods per seller
  - disables unavailable methods with a localized reason
  - opens secure hosted checkout externally
  - refreshes authoritative payment status
  - refreshes automatically when the app returns to foreground while provider action is pending
  - shows created/pending/paid/failed/cancelled/expired/refund states
  - unlocks review only when every merchant payment requirement is satisfied
- at the Phase 7 baseline, Place Order remained blocked pending the Phase 8 order transaction; Phase 8 now resolves that boundary
- payment UI/errors/statuses are localized in Dari, Pashto, and English with existing RTL/LTR behavior preserved
- public product payment copy now describes the real checkout behavior instead of future Phase 7 work

### Database migration

- `0007_striped_tana_nile.sql`
- adds:
  - `payment_event_source`
  - `payment_method`
  - `payment_provider`
  - `payment_refund_state`
  - `payment_state`
  - `store_payment_settings`
  - `payment_attempts`
  - `payment_state_events`
- migration is additive and preserves all Phase 1–6 data
- Tasks 7.2–7.6 required no additional schema migration

### Acceptance

Passed: payment availability is merchant-controlled and fulfillment-aware; Cash on Delivery and Pay at Store work without pretending money was collected; hosted digital checkout is server-created; online payment success is accepted only from a verified provider notification; duplicate attempts/webhooks are idempotent; exact quoted merchant totals are preserved; and checkout cannot advance to payment-ready review until every merchant payment requirement is satisfied.

### Verification

GitHub Actions run `37334531587` passed on exact `main` commit `d37127985a35ade657cb290947111c95cdddf389`.

Verified Phase 7 gates include:

- zero Drizzle migration/schema drift
- fresh Phase 1–7 migration application on PostgreSQL 17
- database connectivity
- payment schema invariant tests
- payment state-machine transition tests
- HesabPay hosted-checkout adapter tests
- API-key server-only request behavior
- webhook signature-verification adapter behavior
- fulfillment-specific payment availability
- forged webhook rejection
- hosted-payment pending state remaining blocked from review
- real PostgreSQL payment integration lifecycle
- merchant payment settings ownership
- hosted card/HesabPay payment attempt creation
- authoritative webhook payment confirmation
- webhook replay/idempotency
- exact payment amount verification
- Cash on Delivery lifecycle
- Pay at Store pickup lifecycle
- payment-attempt idempotency
- merchant refund-request lifecycle
- three-language localization verification
- all workspace lint/typecheck/test gates
- Fastify production build
- Expo mobile web export
- Next.js admin/storefront production builds

### External provider configuration

Digital payments remain safely unavailable until the deployment configures the server-only HesabPay values documented in `.env.example`:

- `HESABPAY_ENVIRONMENT`
- `HESABPAY_API_KEY`
- `HESABPAY_API_BASE_URL`
- `PAYMENT_PUBLIC_BASE_URL`
- `PAYMENT_PROVIDER_TIMEOUT_MS`

Cash on Delivery and Pay at Store do not depend on a HesabPay API key.

### Deferred by design

- Phase 7 intentionally deferred order creation, inventory reservation ownership/expiry, merchant suborders, fulfillment state, and final Place Order to Phase 8; those items are now implemented in the Phase 8 section below
- automatic external-provider refund execution remains deferred until an approved provider refund operation is documented and integrated


## Phase 8 — Orders & Fulfillment

### Status

Complete and verified on `main`.

### Product outcomes

- transactional order creation
- one merchant order and fulfillment per store group
- merchant confirmation
- preparation and fulfillment state management
- customer order tracking
- cancellation and refund behavior
- transactional inventory reservation and release
- real Place Order checkout completion

### Task plan

- [x] 8.1 Order & reservation data model
- [x] 8.2 Transactional Place Order
- [x] 8.3 Merchant order management
- [x] 8.4 Customer tracking & cancellation
- [x] 8.5 Payment/refund & inventory-release integration
- [x] 8.6 Phase 8 integration/regression verification and close

### Delivered

- checkout now exposes a real Place Order action after every merchant payment requirement is satisfied
- Place Order is idempotent so retrying the same completed checkout does not create duplicate merchant orders
- multi-store checkout creates one independent order and fulfillment per merchant group
- all merchant orders in a checkout are created inside one PostgreSQL transaction so the checkout cannot partially create only some seller orders
- the server revalidates before order creation:
  - checkout ownership and expiry
  - published store status
  - active/grace-period subscription
  - payment attempt ownership and checkout/store linkage
  - exact authoritative merchant payable amount
  - current inventory availability
- payment attempts are attached to the created merchant order without rewriting the Phase 7 payment ledger
- checkout sessions move to `ordered` only after successful transactional creation
- successfully ordered cart items and applied store coupons are cleared after order creation
- order records preserve immutable purchase-time snapshots for:
  - product and selected variant identity
  - product image reference
  - quantity
  - unit/list price
  - product discount
  - coupon-adjusted merchant subtotal
  - customer delivery address
  - selected delivery/fulfillment method
  - delivery rule and estimate
  - delivery base/urgency/product surcharge/free-delivery discount
  - exact final merchant total
  - payment method/provider/state/amount
- later product, delivery, store, or catalog edits do not rewrite historical order snapshots
- inventory is reserved transactionally at Place Order using server-side conditional stock updates; mobile inventory values are never trusted
- reservations have explicit states:
  - reserved
  - committed
  - released
  - expired
- pending-confirmation reservations use a 24-hour confirmation window
- expired pending-confirmation reservations are reconciled before customer/merchant order reads and actions
- merchant confirmation commits the reservation:
  - available stock is decremented
  - reserved stock is released
  - inventory movement history is recorded
- cancellation/rejection releases uncommitted reservations
- cancellation after a committed reservation restores inventory and records the compensating inventory movement
- delivery order lifecycle:
  - pending confirmation
  - confirmed
  - preparing
  - ready
  - out for delivery
  - delivered
- pickup order lifecycle:
  - pending confirmation
  - confirmed
  - preparing
  - ready for pickup
  - picked up
- digital fulfillment can move from ready to delivered without fabricating a physical-delivery state
- delivery-failed state is supported for merchant-managed delivery failures
- customer cancellation is allowed while the order is pending merchant confirmation
- merchant rejection/cancellation requires a reason where applicable
- cancellation of a paid order transitions the payment/order into the refund-pending workflow
- completed paid orders can start the refund workflow
- Cash on Delivery remains pending until the merchant marks the order delivered, then becomes paid
- Pay at Store remains pending until the merchant marks the pickup completed, then becomes paid
- customer Orders tab now provides:
  - order history
  - current localized status
  - purchase-time total
  - order detail
  - progress timeline
  - expected fulfillment window
  - seller/contact information
  - purchased items
  - delivery/pickup information
  - payment information
  - pre-confirmation cancellation
- seller Orders tab now provides:
  - order inbox
  - customer/address/contact information
  - products and quantities
  - fulfillment method and estimate
  - payment state
  - complete order timeline
  - confirm/reject
  - start preparing
  - mark ready / ready for pickup
  - dispatch
  - deliver / mark picked up
  - mark delivery failed
  - cancel with reason
  - start refund workflow
- order, fulfillment, payment, and error UI is localized in Dari, Pashto, and English with existing RTL/LTR behavior preserved
- stale checkout markers that said Place Order was blocked until Phase 8 were replaced with the real current checkout readiness states

### Database migration

- `0008_stormy_stark_industries.sql`
- adds enums:
  - `order_state`
  - `order_fulfillment_type`
  - `fulfillment_state`
  - `inventory_reservation_state`
  - `order_event_source`
- adds tables:
  - `orders`
  - `order_items`
  - `order_fulfillments`
  - `inventory_reservations`
  - `order_state_events`
- extends checkout-session status with `ordered`
- extends payment attempts with nullable `order_id`
- adds ownership, state, timeline, expiry, order-number, checkout/store, reservation, and fulfillment indexes/constraints
- migration is additive and preserves all Phase 1–7 data

### Acceptance

Passed: the complete BazaarLink purchase-to-delivery workflow functions end to end. A payment-ready checkout creates idempotent per-merchant orders transactionally, reserves stock safely, supports merchant confirmation/preparation/fulfillment, exposes customer tracking, handles pre-confirmation cancellation, settles COD/Pay-at-Store on real-world completion, and enters refund handling when a paid order requires cancellation/refund.

### Verification

GitHub Actions run `37343886343` passed on exact `main` code commit `1944333944f23a400d69d39fc57fb4b0b15fd88c`.

Verified Phase 8 gates include:

- valid Drizzle migration history
- zero schema/migration drift
- fresh Phase 1–8 migration application on PostgreSQL 17
- database connectivity
- Phase 8 schema invariant tests
- order/fulfillment state-machine tests
- all workspace lint/typecheck/unit-test gates
- three-language localization verification
- Fastify production build
- Expo mobile web export
- Next.js admin/storefront production builds
- complete serial PostgreSQL integration suite
- idempotent Place Order retry behavior
- transactional stock reservation
- customer cancellation and reservation release
- merchant confirmation and reservation commit
- inventory decrement and movement history
- delivery fulfillment lifecycle through delivered
- pickup fulfillment lifecycle through picked up
- Cash on Delivery settlement at delivery
- Pay at Store settlement at pickup
- paid hosted-payment order creation
- verified hosted-payment webhook compatibility
- paid-order refund-pending transition
- customer order history/detail/tracking
- merchant order inbox/action ownership
- all pre-existing auth/store/catalog/marketplace/cart/delivery/payment integration suites

### Deferred by design

- reviews, Verified Purchase, notifications, reports, basic seller trust, and support workflows remain Phase 9 — Trust & Communication
- automatic external-provider refund execution remains deferred until the payment provider exposes an approved/documented refund operation; Phase 8 safely records `refund_pending` rather than fabricating provider behavior
- a platform-owned courier fleet, external courier orchestration, and advanced logistics remain outside the approved Phase 8 scope


## Phase 9 — Trust & Communication

### Status

Complete and verified on `main`.

### Product outcomes

- reviews
- Verified Purchase
- notifications
- reports
- basic seller trust
- support workflows

### Acceptance

Passed: completed BazaarLink transactions now produce server-authoritative trust signals and communication. Reviews are purchase-linked, notifications are persisted and deep-linkable, seller trust is earned from verified phone identity rather than subscription tier, abuse is moderatable, and users can communicate with platform support.

### Task plan

- [x] 9.1 Review & Verified Purchase foundation
- [x] 9.2 Customer review experience
- [x] 9.3 Review reports & moderation
- [x] 9.4 Notifications & deep links
- [x] 9.5 Basic seller trust & support workflows
- [x] 9.6 Phase 9 integration/regression verification and close

### Task 9.1 — Review & Verified Purchase foundation

- added purchase-linked review persistence and shared contracts
- every review references the customer, completed order, order item, store, and product
- one review is allowed per purchased order item
- rating is constrained to 1–5 stars
- review text is optional and up to five image URL references are supported
- review states support published, reported, hidden, and removed
- abuse reports support spam, abuse, misleading, inappropriate, and other
- duplicate reports by the same customer are prevented
- Verified Purchase is calculated by the server and cannot be forged by a client flag
- only delivered and picked-up purchases are review-eligible

### Task 9.2 — Customer review experience

- completed customer orders expose review eligibility and Write/Edit Review actions
- customers can create and edit eligible reviews
- product detail shows:
  - average rating
  - review count
  - 1–5 star reviews
  - Verified Purchase
  - optional review images
  - seller responses
- public storefront product pages expose the same purchase-linked review information
- rating data is now active in marketplace discovery instead of a future placeholder
- marketplace supports minimum-rating filtering and rating sorting
- old marketplace cache entries are versioned out so pre-Phase-9 cached response shapes cannot crash the new UI
- review flows are localized in Dari, Pashto, and English

### Task 9.3 — Review reports & moderation

- customers can report review abuse with structured reasons and optional details
- seller review inbox exposes reviews for the owned store only
- merchants can respond publicly to eligible published/reported reviews
- platform review-report queue is restricted to:
  - platform support
  - platform admin
  - super admin
- moderation supports:
  - publish
  - hide
  - remove
  - dismiss reports
- moderation state and resolution metadata are persisted
- hidden/removed reviews are excluded from public rating/review surfaces as appropriate

### Task 9.4 — Notifications & deep links

- added persisted in-app notification records with per-user event idempotency
- added push-device registration for Android/iOS Expo tokens
- added Expo-compatible push delivery with three-language notification copy
- push delivery is claimed at the database boundary before send so a repeated server event cannot dispatch the same notification/device pair twice
- notification inbox supports:
  - list
  - unread count
  - mark read
  - mark all read
  - push opt-in
  - safe internal deep links
- authoritative server transitions emit notifications for:
  - order placed — customer and merchant
  - payment successful — customer and merchant
  - payment failed — customer
  - order confirmed — customer
  - order cancelled — customer and merchant
  - order preparing — customer
  - out for delivery — customer
  - delivered/picked up — customer and merchant
  - review available — customer
  - low stock — merchant
  - new review — merchant
  - subscription issue — merchant
  - support reply — user
  - delivery failure — customer
- mobile account/seller navigation exposes the notification inbox

### Task 9.5 — Basic seller trust & support workflows

- seller trust is derived from an actually verified `phone_password` auth identity
- a paid subscription never creates verification
- marketplace product/store responses expose:
  - phone verified / unverified
  - verification level
- marketplace supports filtering to phone-verified sellers
- product cards, product detail, mobile store pages, and public storefront pages display the earned trust signal
- cart merchant summaries propagate the same server-authoritative trust record
- later identity/business/address/history trust levels remain intentionally deferred
- added customer/merchant support tickets with:
  - category
  - subject
  - conversation messages
  - open/waiting-support/waiting-customer/closed states
- users can create, list, read, reply to, and close their own support tickets
- platform support/admin roles can list, inspect, reply to, and change ticket status without granting ordinary support staff unrestricted super-admin access
- platform replies create user notifications with deep links

### Database migrations

- `0009_yummy_eternals.sql`
  - review/report enums and persistence
- `0010_stale_firestar.sql`
  - notification, push-device, push-delivery, support-ticket, and support-message persistence
- `0011_eminent_magneto.sql`
  - merchant review-response persistence
- all Phase 9 migrations are additive and preserve Phase 1–8 data

### Task 9.6 — Integration/regression verification

GitHub Actions run `37561917026` passed on exact Phase 9 code baseline `383ff96c36f438b67960607392f5f70d4feed3af`.

Verified gates include:

- valid Drizzle migration history
- zero schema/migration drift
- fresh Phase 1–9 migration application on PostgreSQL 17
- database connectivity
- all workspace lint/typecheck/unit-test gates
- three-language localization verification
- Fastify production build
- Expo mobile web export with Expo Notifications
- Next.js admin production build
- Next.js public storefront production build
- existing auth/store/catalog/marketplace/cart/delivery/payment/order PostgreSQL integration suites
- Phase 9 PostgreSQL trust/communication integration coverage for:
  - completed-purchase review eligibility
  - server-issued Verified Purchase
  - duplicate-review prevention
  - public rating summaries
  - merchant review response
  - abuse reporting
  - platform moderation
  - phone-verified seller trust
  - idempotent customer/merchant notifications
  - new-review notification
  - support ticket creation
  - platform support reply
  - support-reply notification

## Phase 10 — Merchant Growth

### Status

Complete and verified on `main`.

### Product outcomes

- analytics
- coupons
- promotions
- merchant staff
- advanced storefront themes
- subscription upgrades/downgrades

### Acceptance

Passed: Pro and Business entitlements now function server-side across catalog pricing, coupons, scheduled promotions, analytics, staff access, premium storefront customization, and plan transitions. Starter cannot bypass paid growth features through the mobile client or direct API calls.

### Task plan

- [x] 10.1 Analytics & seller dashboard
- [x] 10.2 Coupons & promotions
- [x] 10.3 Merchant staff & granular permissions
- [x] 10.4 Advanced storefront themes
- [x] 10.5 Subscription upgrade/downgrade enforcement
- [x] 10.6 Phase 10 integration/regression verification and close

### Task 10.1 — Analytics & seller dashboard

- added a server-authoritative merchant dashboard with:
  - today's orders
  - today's sales
  - today's customers
  - new orders needing confirmation
  - low-stock count
  - failed-payment count
  - delivery-issue count
  - active product count
  - plan usage
  - recent order/review/inventory activity
- added merchant analytics with:
  - order count
  - completed sales
  - customer count
  - product and coupon discount totals
  - top products
- Pro/Business advanced analytics additionally expose:
  - revenue trend
  - order trend
  - repeat-customer count/rate
  - delivery completion/failure counts
- analytics remain privacy-light and do not fabricate unavailable traffic-source attribution
- seller mobile dashboard and Analytics screen consume the server results
- analytics access is available to owners and staff only when their store-scoped `analytics` permission allows it

### Task 10.2 — Coupons & promotions

- activated the existing seller-scoped coupon foundation as a real merchant management feature
- coupon CRUD supports:
  - percentage or fixed discount
  - minimum order amount
  - active/inactive state
  - optional start/end schedule
  - normalized unique code per store
- coupon eligibility remains server-calculated in cart/checkout
- Starter is blocked from coupon management and coupon application
- added scheduled product promotions with:
  - product
  - promotion name
  - promotional price
  - start/end date-time
  - active/inactive state
  - overlap prevention
- promotional price must be below the product base price
- marketplace, public catalog, and cart pricing now calculate effective discounts server-side
- downgrade removes the entitlement without deleting coupon/promotion data; paid-plan behavior resumes if entitlement is restored

### Task 10.3 — Merchant staff & granular permissions

- added store-scoped staff assignments and invitation persistence
- staff invitation:
  - uses a random invite code
  - persists only a SHA-256 token hash
  - expires after seven days
  - is bound to the invited email identity
- Pro supports up to 3 active staff; Business supports up to 10; Starter supports owner only
- granular permissions:
  - products
  - inventory
  - orders
  - customers
  - discounts
  - analytics
  - delivery
  - storefront
- server routes resolve staff permissions before invoking owner-scoped repositories
- staff can see assigned stores in the seller store list
- catalog, inventory, orders, delivery, analytics, discounts, and storefront operations enforce the relevant permission
- subscription, payment configuration, and staff administration remain owner-controlled
- downgrade suspends excess staff rather than deleting assignments

### Task 10.4 — Advanced storefront themes

- premium storefront configuration now supports:
  - existing theme families: minimal, modern, fashion, electronics, food
  - accent color
  - featured categories
  - featured products
  - custom-domain field/capability
- premium storefront/custom-domain controls are entitlement-gated
- Starter public storefronts fall back safely to:
  - minimal theme
  - default accent
  - no premium featured lists
  - no custom domain
- premium configuration is preserved on downgrade rather than deleted
- restoring Pro/Business entitlement makes preserved customization usable again
- public storefront data never uses subscription level as a seller-verification signal

### Task 10.5 — Subscription upgrade/downgrade enforcement

- plan entitlements now consistently define:
  - Starter: 15 products, 5 active categories, 0 staff, basic growth capabilities
  - Pro: 300 products, unlimited categories, up to 3 staff, growth features
  - Business: 1,200 products, unlimited categories, up to 10 staff, growth features
- plan pricing remains administrator-configurable by design and is not hardcoded into merchant application logic
- added auditable subscription-change history
- upgrade/downgrade events are recorded in the growth analytics event stream
- large downgrade resource selection is paginated; the client does not load an entire large catalog into memory
- when a downgrade exceeds target limits:
  - merchant must select the permitted products/categories/staff to retain
  - excess products become `plan_restricted`
  - their previous product state is preserved for later restoration
  - excess categories are archived
  - excess staff are suspended
  - merchant data is not deleted
  - grace-period metadata is persisted
- upgrading restores plan-restricted products up to the newly available product limit
- product quota calculations exclude archived and plan-restricted products
- Starter cannot create/update product discount pricing
- public/cart pricing ignores paid-plan discounts/promotions when the store no longer has the required entitlement

### Database migration

- `0012_superb_roughhouse.sql`
- adds:
  - merchant staff and invitation persistence
  - product promotion persistence
  - growth analytics events
  - subscription change history
  - product previous-state metadata for plan restriction
  - premium storefront featured-category/product and custom-domain fields
- migration is additive and preserves all Phase 1–9 merchant, catalog, order, payment, and trust data

### Task 10.6 — Integration/regression verification

GitHub Actions run `37713854639` passed on final Phase 10 `main` baseline `8c73495dd2e479b31e3c98d69ad82c6467610b82`.

Verified gates include:

- valid Drizzle migration history
- zero schema/migration drift
- fresh Phase 1–10 migration application on PostgreSQL 17
- database connectivity
- all workspace ESLint checks
- all workspace TypeScript checks
- all unit tests
- three-language localization verification
- Fastify production build
- Expo mobile web export
- Next.js admin production build
- Next.js public storefront production build
- complete serial PostgreSQL integration suite for:
  - auth
  - store
  - catalog
  - marketplace
  - cart/pricing
  - delivery
  - payment
  - orders/fulfillment
  - trust/communication
  - Merchant Growth
- Phase 10 PostgreSQL coverage verifies:
  - Starter growth-feature denial
  - Starter → Pro entitlement activation
  - merchant coupon management
  - staff invitation and email-bound acceptance
  - assigned-store discovery for staff
  - staff analytics permission
  - Pro advanced analytics access
  - Pro → Starter downgrade
  - staff entitlement removal after downgrade
  - coupon entitlement removal after downgrade
- older catalog/cart/marketplace integration fixtures were updated to respect the new plan boundary instead of bypassing Phase 10 entitlements

### Deferred by design

- platform administration of subscription pricing/configuration remains Phase 11 — Administration
- a paid subscription still never grants a verified-seller trust badge
- custom-domain DNS/provisioning automation is outside the entitlement-layer work completed here
- traffic-source analytics remain unavailable until BazaarLink has a trustworthy first-party attribution source

## Current phase

Phase 12 — Release Readiness automation verified; external production go/no-go outstanding.

## Last known-good baseline

- Branch: `main`
- Phase 10 final baseline commit: `8c73495dd2e479b31e3c98d69ad82c6467610b82`
- Verification run: `37713854639`

## Verification workflow

- Local `pnpm verify` runs deterministic lint, typecheck, unit, localization, and build checks without invoking remote database integration suites.
- `pnpm test:integration` explicitly runs the auth, store, catalog, marketplace, cart/pricing, delivery, payment, order, trust/communication, and Merchant Growth PostgreSQL integration suites serially against the configured root `.env` database.
- GitHub Actions runs `pnpm verify` without database integration discovery, then runs `pnpm test:integration` as one explicit serial PostgreSQL gate against fresh PostgreSQL 17 on every push/PR. `dist/**` is excluded from Vitest discovery so compiled test copies cannot run a second time.
- Unexpected catalog failures are logged server-side before returning the safe public `service_unavailable` response.

### Verification reliability fix

- ordinary API unit verification now always excludes compiled `dist/**` tests
- database integration tests are excluded from ordinary `pnpm verify`
- database integration coverage runs only through the explicit serial `pnpm test:integration` command
- this prevents source and compiled integration suites from running together and avoids the local cart/catalog timeout pattern reported after Task 7.1
- corrected workflow verified successfully in GitHub Actions run `37335866032`

## Known external requirements

CI verifies the current marketplace, cart/pricing, delivery, payment, orders/fulfillment, trust/communication, and Phase 10 Merchant Growth baseline against fresh PostgreSQL 17.

Local API/store execution requires a valid `DATABASE_URL` in the root `.env` file. Docker is optional when a hosted PostgreSQL database such as Neon is used.

Physical-device seller testing requires `EXPO_PUBLIC_API_URL` to point to an API URL reachable from the phone.

The public storefront runtime requires `API_URL` or `NEXT_PUBLIC_API_URL` to point to the BazaarLink API.

## Phase 11 — Administration (implementation baseline)

### Task plan

- [x] 11.1 Secured web console, operator login, scoped privileges and first-super-admin bootstrap
- [x] 11.2 User/store/product/order management and platform overview
- [x] 11.3 Review-report moderation, support, catalog and promotion visibility
- [x] 11.4 Subscription status operations, payment/refund visibility and administrator-configurable plan prices
- [x] 11.5 Approved platform configuration, role assignment, transactionally recorded audit trail
- [x] 11.6 Fresh PostgreSQL verification, TypeScript/lint/build, integrated regression and phase close

### Operational and security notes

- Administrative web application is served on port 3001 and calls the API through Next.js same-origin route handlers using HttpOnly, SameSite=Strict session cookies. Configure server-side `API_URL` (default local 4000); it is not a browser-side secret.
- Initial setup requires an existing active email/password account. With PostgreSQL configured, set `ADMIN_BOOTSTRAP_EMAIL` and run `pnpm --filter @bazaarlink/database admin:bootstrap`. This intentionally refuses once a super-admin exists, to prevent silent subsequent elevation. Further support/admin roles are managed by a signed-in super administrator.
- Support operators can read operational data and moderate reviews/reports. Platform administrators can additionally manage customer, merchant, product, subscription status and pricing. Super administrators additionally control operator roles, settings, and audit access. No role can suspend itself; operator accounts cannot be suspended through the generic user action.
- All new mutation endpoints require validated inputs; status changes and settings/price/role changes are written with transactional audit records; no physical deletes. User suspension invalidates all active sessions. Reinstating a suspended store intentionally returns it to `draft` (merchant must re-publish).
- Config keys support_email, moderation_policy and maintenance_message are informational: they are not advertised as toggles for systems not yet wired to them.
- Payment refunds are view-only in the platform console; existing seller refund workflow remains the authoritative processor. No administrator can arbitrarily mark payment attempts as refunded. Plan pricing is administration metadata, not an automatic subscription purchase or settlement system. The Phase 10 direct owner-initiated upgrade path still requires a verified billing solution before paid production launch.
- Advanced operations on support tickets and review queues already exist under platform routes in Phase 9; Phase 11 adds their cross-platform listing and audited report/review status operations.
- All platform lists use bounded pagination; audit records contain no raw session tokens or provider secrets.
- Verify via GitHub Actions migration generation, fresh database migrations, `pnpm verify` and `pnpm test:integration`. Local database must be configured before `pnpm db:migrate`.

### Phase 11 verification

GitHub Actions run `37765776025` passed after Phase 11 delivery: migration history, schema generation, fresh PostgreSQL 17 migrations, database connectivity, ESLint, TypeScript, unit tests, localization, production builds and all serial PostgreSQL integration tests including Phase 11. Migration `0013_smiling_anthem.sql` is committed.

### Explicit limitations

Platform audit records cover all mutations through the newly introduced Phase 11 endpoints. Previously implemented support-ticket and review-moderation endpoints have their own actor attribution but are not automatically written to the new platform audit table. Platform payment/refund views are read-only: actual refunds are processed through established seller payment workflows. Configured subscription prices are operational metadata, not merchant billing or settlement. Seller-paid-plan checkout enforcement remains necessary before a monetized release.


## Phase 12 — Release Readiness

### Scope: seven tasks

- [x] 12.1 API security headers, strict production env validation and paid-upgrade denial
- [x] 12.2 Marketplace bounded search/rate limits, conditional public caching and stale offline-cache limits
- [x] 12.3 Shared mobile control accessibility and keyboard navigation refinements
- [x] 12.4 Three-language RTL/localization static regression gate
- [x] 12.5 Provider failure tests and production subscription guard
- [x] 12.6 Missing-location, cutoff and suspended-merchant delivery edge tests
- [x] 12.7 Production build profiles, readiness endpoint, preflight and runbook

Automated implementation scope is committed as an integrated Phase 12 change. GitHub Actions run `37769585890` passed on commit `0f84bb9e79af1ee5c9b915d0c0b9df87cdd1b944`: migration history/diff, PostgreSQL 17 migrations/health, workspace ESLint, TypeScript, unit tests, localization/RTL static check, admin/storefront/mobile builds and serialized database integration suites.

**Release gate:** passing CI alone does not mean public-launch approved. External live provider integration, full on-device E2E journeys, app signing, official artwork, deployed backups and recovery drill, accessibility/RTL device checks and production observability are manual requirements. Paid-plan self-service is disabled on production until verified payment or authorized activation is implemented. A COD-only Starter pilot is the safe available launch scope. Details: `docs/RELEASE-READINESS.md`.


## Customer Home UX redesign — Phase 1

- Replaced the development/foundation Home status page with an actual shopping landing page: branded header, language toggle, cart and notifications shortcuts, marketplace search entry, live categories and deep-linked filtered category results, recommendations and featured stores.
- Uses marketplace data and 7-day maximum stale cache fallback; loads on Home focus, with retry, loading and meaningful empty states. No synthetic listings or invented location filtering.
- Simplified redundant opening phase labels and large title/subtitle pairs across the five main customer tabs. Useful error and section labels are retained.
- Backend routes, merchant workflows, and database migrations are unchanged. Later phases cover advanced search, categories, personalized feeds, and full polish.


## Home UX redesign — Phase 2: search and categories

- Replaced passive search shortcut on Home with an editable searchable control and debounced live product/store/category/brand suggestions, reusable on Marketplace.
- Added direct product and public store navigation, category/brand/full-query deep links to filtered Marketplace results. Store suggestions expose existing public handle.
- Shared localized image-or-icon category cards now appear in Home and Marketplace; Marketplace allows browsing active child categories in filtered results.
- Filters show active count, sortable options fit in a horizontal row, and result totals are displayed. RTL/Dari/Pashto/English are respected.
- No fake listings, new permissions, backend schema change or changes to checkout or merchant entitlement systems. Product, promotion, layout and personalization improvements remain later phases.

## Customer Home UX — Phase 3 (product discovery)

- Home now surfaces live discovery rails (relevance-ranked, popular, new, real deals, recently viewed) along with categories and stores; no new API endpoints or migrations.
- Discount spotlight only uses an in-stock product with a real discount.
- User-selected province controls a separate home request and cache key, with localized 34-province picker and persistent opt-in selection; not device geolocation or delivery guarantee. Explicit no-results when there are no public products in the province.
- View-all shortcuts deep-link into matching Marketplace server-side sort, discount and province browse filters. Existing auth, checkout, merchant entitlement and offline cache behavior retained.
- Compact labels remain; no redundant titles or explanatory marketing subtitles added.
- Following phases remain: product/store card polish, further preference-based personalization, and full design/UX regression.

## Customer Home UX redesign — Phase 4 (product/store cards)

- Added shared responsive image-first MarketplaceProductCard, MarketplaceStoreCard and MarketplaceProductGrid.
- Images show fallback when missing or broken; cards use theme tokens for light/dark, RTL-aware order and touch-friendly press targets.
- Product prices are formatted AFN; original compare-at price and percentage badges appear only when hasDiscount and a valid higher comparison price. Out-of-stock state and real review ratings remain visible where applicable.
- Phone-verification cues are based only on seller.trust.phoneVerified, never subscription or paid status.
- Home, Marketplace, and store product listings share card presentation; Marketplace and store catalogs use a 2-column grid while Home uses compact horizontal rails.
- Product cards navigate to product detail for options/purchase; store cards navigate to published store. No new backend routes or migrations.

## Home UX Phase 5 — personalization

- Device-local preferred-category selector (top-level category IDs, max five, persisted with AsyncStorage), explicit reset, and confirmed clear of local recent product IDs.
- Home enriches the public discovery response with bounded category-specific browse requests (in-stock, respect manually chosen province, offline cache fallback), ranks real matching inventory with explicit selections ahead of recent-category affinities, and avoids recently viewed/out-of-stock items.
- "For you" appears only with actual matched products; generic marketplace relevance still has its own Recommended rail. On-device recent-view order is stable and recent list clearing reconciles cached responses.
- Existing province opt-in, RTL, language and navigation preserved. The user account/role and database schema remain unchanged; no background tracking or AI API costs were added.

## Home UX Phase 6 — visual design / hierarchy

- Added reusable HomeSectionHeader (icon, one-line title, RTL-aware accessible View all), a non-image-dependent HomeHeroBanner, and a stable low-cost HomeLoadingSkeleton.
- Unified Home rail spacing, visual icons and consistent horizontal card padding. Header actions retain 44px tap targets and gain a separator; surface gutters are tighter to show more products.
- Styled category icons with circular media surfaces and changed narrow-screen category grids to three columns. Product/store cards use subtle light-mode elevation, improved image sizing, and consistent radii; theme tokens avoid unreadable dark-mode shadows.
- Search bar now highlights keyboard focus; manual province and interests controls highlight their selected state. Offer spotlight shows only verifiable discounts, with a broken-image fallback.
- Existing Phase 1–5 search, recommendation, opt-in province, localization and auth flows preserved. No external image assets, mocked listings or backend/schema changes.

## Home UX Phase 7 — mobile responsiveness / navigation

- Responsive Home header hides the decorative mark at widths below 360dp to maintain the three action shortcuts' minimum 44dp target sizes.
- Promo banner, live deal spotlight and Interests actions adapt to narrow Android widths (less than 360/390dp).
- Home screen supports refresh gesture; generic Screen component's RefreshControl is optional and does not alter all other app screens.
- Home renders cached province-matched public data as soon as possible, then revalidates via the real marketplace service. Stale or failed requests do not erase successfully loaded results; focus cleanup prevents obsolete async screen updates.
- Horizontal product rails now use bounded FlatList virtualization, stable item IDs and inverted RTL direction.
- Categories move ahead of the hero and New Arrivals/Discounts use an accessible, localized Show more / Show less expander to cut excessive default vertical scrolling. The exact same View all routes remain available.
- Phase 1–6 APIs, stock/trust indicators, opt-in manual province selection, customer auth and multilingual RTL/LTR preserved. Device rendering still requires manual Expo Go acceptance testing.

## Customer Home redesign — Phase 8 final QA hardening

- Serializes local recent-view writes and clear operations to avoid AsyncStorage last-writer-wins races; Home uses a revision token when reading and showing recent products so asynchronous old snapshots cannot restore a just-cleared list.
- Autocomplete results are associated with their query so obsolete product/store suggestions cannot display for a different search string.
- Marketplace search clears the old result set as the next query starts and checks the active request ID even after async cached fallback. On a failed search, the browse-specific error is shown instead of stale products or a duplicated discovery page.
- Marketplace general home response loading now has request-ID guards, explicit province-scope resets, and a single province-dependent effect rather than two competing initial requests.
- Phase 8 Node regression tests exercise concurrent view writes, clear-history races, cache scope isolation, async guard invariants, and navigation/localization accessibility contracts. CI verifies build, typecheck, lint, API integration and migration checks; Android device acceptance remains a separate manual requirement.


## Mobile live language-direction parity — English ⇄ Dari/Persian / Pashto

- Language is not only translated: English uses LTR text and content order; Dari (`fa-AF`) and Pashto (`ps-AF`) use right-aligned RTL text and mirrored horizontal content ordering, including shopping, checkout, customer support and seller/platform screens.
- Navigation explicitly reverses customer/seller tab order when the language changes. Navigator keys update the arrangement immediately without restarting Expo Go.
- Stable native LTR Yoga roots prevent `direction: rtl` from cancelling manual `row-reverse` on Android. Shared AppText/TextField/search controls set live `writingDirection` and text alignment for the selected language. No `I18nManager.forceRTL`, which would require an app restart and affect other Expo Go projects.
- An RTL-aware horizontal ScrollView wrapper preserves the leading first item at the right edge even when content exceeds the phone's viewport. Home virtualized product rails retain their existing RTL inversion.
- Locale hydration cannot override a newer user-selected language during a delayed AsyncStorage read. There are no new native dependencies, API endpoints, migrations or permissions.
- Regression test: `pnpm test:rtl-layout`, included in `pnpm verify`.
- **Manual Expo Go device QA still required**: switch English → Dari → Pashto → English on Home, Marketplace/search/filter sliders, product/gallery and stores, cart, checkout/address/payment, account, support, reviews, seller tab bar and seller operations, checking narrow (320–360dp) and normal screens. Verify the first category/product in horizontal carousels appears on the RTL right edge, back arrows remain logical, keyboards/cursors match text direction, and switches do not unexpectedly lose the active route. Android/iOS and light/dark checks are not substituted by CI.

## Customer Account redesign — Phase 1 (structure & role-aware navigation)

- Rebuilt the signed-in customer's Account tab as a compact RTL/LTR-aware profile hub, including an initials/avatar placeholder (no photo upload yet), server-authorized primary role indicator and an expandable list of all account roles/authorized modes.
- Replaced the large unsorted button stack with themed icon rows and clearly separated Shopping (Orders/Cart), Account (Addresses), Preferences (real notification inbox + working language switcher), Business (seller/store staff + authorized moderation/support), Help (existing support), and distinct Sign Out areas.
- Real destinations only: all navigation rows route to existing screens. No unsupported wishlist, edit-profile, password recovery or appearance controls are presented before later phases implement them.
- Seller navigation now distinguishes customer, merchant owner and merchant staff; staff without a linked store do not enter store onboarding. Store access remains resolved by the existing authorized store API, including loading/error/retry states, and role restrictions remain server-side.
- Added localized strings for English, Dari (`fa-AF`) and Pashto (`ps-AF`); icon order and chevrons mirror on language changes, and the page stays readable in dark/light mode.
- Guest login/registration form and its existing authentication behavior remain unchanged until Phase 2. No new API endpoints, permissions, product storage, migrations, or external services.
- Verify with `pnpm test:account-phase1` (included in `pnpm verify`); Expo Go manual checks still required on narrow phones, with both layout directions and all available user roles. Profile editing/verified email/wishlist/security belong to upcoming phases.


## Customer Account redesign — Phase 2 (guest UX & authentication)

- Guest Account redesigned into an icon-led entry screen, localized sign-in/create-account segmented navigation, clearer form hierarchy, large touch targets, accessible labels, and a working Continue Shopping link.
- Registration asks for an optional name, email, password and confirmation. Login requires email and password. Per-field inline validation checks email shape/length, password length and exact confirmation; invalid submissions do not contact the API. The existing Fastify auth endpoints remain the source of truth.
- Password visibility is toggleable (including confirmation), login/signup requests are guarded against double taps and provide localized API error messages; secrets are cleared after success or when switching modes.
- Email and password input content is LTR for readability across English, Dari and Pashto; the rest of the screen and actions retain live RTL/LTR switching through the existing localization provider.
- Authentication remains email/password-based; no fabricated password-recovery, verification or policy links. Password recovery and advanced security remain allocated to Phase 4. Existing signed-in Account structure and guest access to Marketplace remain unchanged.
- Validation and layout regression tests: `pnpm test:account-phase2` and `pnpm test:account-phase1`, included in `pnpm verify`.
- Manual Expo Go QA: guest Account in all three locales and both color themes on narrow and normal Android phones; validate empty/bad email, short/mismatched passwords, eye toggle, keyboard Next/Go, rapid double taps, backend 401/429/offline messages, guest Marketplace navigation, and successful login/sign-up. No database migrations.


## Customer Account redesign — Phase 3 (editable personal information)

- Added a real `/account/profile` page accessible through the signed-in Account profile header and Personal Information menu row.
- Authenticated customer can edit display name (including clearing it), optional **unverified** contact phone number, and an avatar color preset (teal/blue/purple/orange), persisted in users table. The Account header reflects edits from the AuthProvider immediately. The color preset modifies a generated initials avatar; **photo upload is not supported** because a secure image upload provider has not been configured.
- The signed-in user's email address is returned by the auth session/profile projection and is displayed read-only; email updates require a secure verification workflow and are reserved for Phase 4. Changing a contact phone is explicitly **not** verification or an alternative login factor.
- Backend: bearer-authenticated `PATCH /auth/profile`, strict allowlist of 3 fields, input-length restrictions, no roles/status/email mutability, rate limiting, immutable session token, role queries from the database.
- Additive PostgreSQL migration `0014_customer_profile`: `users.phone` nullable and `users.avatar_color` default `teal`. **Run `pnpm db:migrate` against the configured database after pulling before starting the API.**
- Supports Dari, Pashto and English, RTL/LTR flow, LTR phone/email values, keyboard-safe form and status/error feedback, plus profile regressions in `pnpm test:account-phase3` included in `pnpm verify`.
- QA still required in Expo Go (both device sizes + locales) and user lifecycle (login, save, reopen, new login, logout, staff/owner, offline failure). Image uploading, verified email changes, phone verification, and security/session controls belong to later phases.


## Sell on BazaarLink — full scrollable plan comparison (October 2026)

- Updated `Account → Sell on BazaarLink → Plan` to show **Starter, Pro and Business horizontally side by side** in an overflow rail. Cards follow the reference design's compact tall pricing-card treatment: asymmetric round corners, visual accent, plan headline, capability checklist and footer action.
- Product limits, category limits, staff seats, advanced inventory, advanced delivery, discounts, coupons, promotions, analytics, premium storefront and custom domain are all rendered from **the authenticated seller-plan API's `entitlements`**, not hardcoded marketing guesses. Availability is shown clearly for included/unavailable features.
- Mobile width shows a card and a preview of the next card, and users can swipe horizontally. Shared `HorizontalLocaleScroll` handles Persian/Pashto RTL first-card alignment and English LTR without a device restart.
- Starter is free and the **only selectable onboarding tier** (new stores are created on Starter). Pro and Business cards explain that paid plan activation is separate; no fake "Order Now" purchase links or example USD prices. Seller prices are platform-controlled and the existing API does not expose public published pricing. Production paid upgrades remain gated until verified billing is available.
- Premium theme choices in Starter onboarding are disabled with a clear explanation, avoiding a later API rejection during store creation.
- If server plans fail to load, show an honest retry instead of misleading fabricated plan caps.
- Test via `pnpm test:seller-plan-cards` (included in `pnpm verify`). Manual Expo Go QA still needed on 320–430px phones and tablets, both appearance modes and all three languages: swipe, CTA, no price guesses, scroll offset, plan descriptions, store creation with minimal theme.
- No schema or database migration is introduced by this UI update.


## Account Phase 4 — secure recovery and signed-in sessions (2026-10-18)

- Account → Security now provides: verified email status, request/confirm email verification, change password with current password confirmation, list real active sessions, revoke another session, and revoke all other sessions. Guest Account → Forgot password opens a real email-initiated reset and long one-time-code confirmation screen. Display and text directions supported in English/Dari/Pashto.
- Email verification and reset use cryptographically random 256-bit tokens generated server-side, stored only as SHA-256 hashes in existing `auth_verification_tokens` with purpose, 15-minute expiry, single-use transactionally consumed flag, and a per-account 2-minute send cooldown. Reset revokes **all** sessions; changing password revokes all **other** sessions, retaining the current one; revocation operations are scoped to the authenticated user. Session info displays only real timestamps, not invented device identities. Server email-verification state is reflected in `AuthUser.emailVerified`.
- Email delivery is **configuration-gated**: set **`RESEND_API_KEY` and `AUTH_EMAIL_FROM`** in the API server environment, where the sender address must be verified in Resend. The server sends via the Resend HTTPS endpoint with a 10-second timeout. There is **no offline fallback and no emailing without credentials**; absent settings yield `service_unavailable`. Never log or share tokens. User copies the full 43-character code from email into the app; no deep-link infrastructure assumed.
- Password-reset request always responds with the same neutral `202 accepted` for unknown and existing addresses when mail delivery is configured, to resist enumeration. Endpoint rates are limited. Sensitive fields and roles cannot be modified with the security endpoints. The email identity remains **read-only**; changing login email or adding MFA requires a separate verified flow. These security features do not claim that telephone or email change is available.
- Uses existing auth schema (tokens, accounts, sessions): **no new DB migration**. Do make sure Phase 3 migration `0014_customer_profile` has been applied when using the latest app.
- Automated checks: `pnpm test:account-phase4`, standard API tests and PostgreSQL integration tests (run by `pnpm verify` / CI). Manual Expo Go device checks still needed in all three languages for unconfigured email, configured email deliverability, expired/used/wrong codes, rate limits, password update, restored sessions, and cross-account access.


## Customer Account Phase 5 — saved shopping activity (2026-10-18)

- Account → **My Shopping** now offers My Orders, **Wishlist** (private, per-user, cross-device), **Recently Viewed** (local on this device), and Cart. A **Latest Order** link appears only when the customer has an actual order; it navigates to that order's detail view with its true server state. The Orders bottom tab remains the main order-management surface.
- Product detail has a real Save/Saved toggle, backed by bearer-authenticated wishlist APIs. Guests are redirected to sign-in rather than being shown fake saved success. Wishlist page loads publicly visible saved products, supports removing them, and shows empty/loading/error/retry states. Items hidden from the marketplace are excluded from displayed saved product results, and the backend caps the list at 100 items.
- Database: migration **`0015_customer_wishlist`** adds a user-scoped composite-key table with product/user FK cascades, preventing account leakage and duplicate saves. API routes `GET /customer/wishlist`, `PUT /customer/wishlist/:productId`, `DELETE /customer/wishlist/:productId`, all protected by signed-in auth; product visibility checked using the existing marketplace repository. API unit/integration tests check cross-account isolation.
- Recently Viewed uses the existing 12-item AsyncStorage browsing history. The list is fetched from the public marketplace Home API; Clear History reuses the existing serialized queue to avoid reappearing after delayed writes. History is explicitly **local to the device** (not yet cloud-synced); it can include products viewed before login on the same device.
- Supports Dari and Pashto RTL and English LTR, light and dark themes, and uses existing product cards and navigation. No fictional products, order statuses, or checkout actions. Store accounts can still shop as customers.
- **After pull run `pnpm db:migrate` before starting the API**. Automated tests: `pnpm test:account-phase5` (included in `pnpm verify`), plus API unit and PostgreSQL integration tests. Expo Go device acceptance remains manual: save on product detail, account switching, cross-device restore, clear history, open latest order, inaccessible/unpublished products, 401/offline/retry behavior, and all locales.


## Customer Account Phase 6 — Preferences & Settings (2026-10-18)

- `Account → Preferences & Settings` is a consolidated, phone-friendly page for the application's existing **English / Dari / Pashto** language switcher, new **System / Light / Dark** theme selector, explicit **Afghan province** discovery region, and **per-device remote push notifications**. The old standalone language strip in Account is replaced by one settings navigation row.
- Appearance is persisted to `bazaarlink.appearance.v1` in AsyncStorage, defaulting to `system`. Changing modes applies instantly to all screens through `AppThemeProvider`, follows subsequent OS appearance changes if in System mode, and does not require an app restart. Storage hydration cannot overwrite an active user selection. Locale remains persisted by the existing localization provider.
- Province uses the existing Afghanistan province catalog and storage key `bazaarlink.marketplace.province.v1` to avoid separate sources of truth. "All Afghanistan" clears an explicit region; **no GPS, location permission, or automatic geo-inference**. Home re-reads the saved province on focus so returning from Preferences updates nearby suggestions; checkout/delivery address remains separate and unchanged.
- Push option is **real, not a cosmetic toggle**. Enabling reuses the current Expo permission, EAS project configuration and authenticated token registration. Disabling contacts the server to mark that user's **exact device push token** inactive, without revoking any other account's token or deleting transactional in-app notification history. Account-scoped preference is stored on-device at `bazaarlink.push.v1.<userId>`; it does not imply that OS permission can be revoked programmatically.
- Remote push remains explicitly **unavailable in Expo Go** (Expo SDK 53+); the switch is disabled and the screen explains that an EAS development build with permissions is needed. In-app Notifications remains accessible even when remote push is disabled. No fake marketing/subcategory toggles have been added: event-category opt-outs would require server preference logic and a proper delivery policy.
- Language, appearance and discovery region are device-local (not claimed to synchronize across devices); push preference is also saved per signed-in account **on this device**. The user's server-side saved products and profile (Phases 3/5) continue to sync normally.
- No DB migration. Tests: `pnpm test:account-phase6` and full repository `pnpm verify`, plus GitHub CI. Expo Go QA: languages and theme changes immediately, reopening appearance/locale, province changes reflected on Home, signed-in/signed-out push isolation, Expo Go unavailable state, and actual production push token deactivation in a development build.


## Customer Account redesign — Phase 7: Help & Support (2026-10-18)

- Account → Help now has separate **Frequently Asked Questions** and **Support** entries. Support is a practical help hub: FAQ preview, a logged-out sign-in explanation, a toggleable Create Support Ticket form, and searchable/filterable existing tickets. Tickets are ordered by true server `updatedAt`, with category, current status and an explicit "needs your reply" indicator.
- Static **FAQs** are available without signing in. They are grouped into Orders/Payments/Delivery, Shopping, Account/Notifications and Selling; include 9 localized answers for real BazaarLink features only, with instant text search and accessible expand/collapse buttons. Payments, returns and refunds do not promise unsupported capabilities, and Support explicitly discloses that tickets are not live chat / no SLA is guaranteed.
- Ticket creation uses existing secured `POST /support/tickets` route, including an optional verified order/store context from existing deeplinks, server-compatible length limits (subject 3–240, message 2–6000), clear category selector, validation, in-flight guard and localized API errors. On success opens the real created ticket immediately.
- Tickets reload on screen focus and support search/filter for All/Active/Needs your reply/Closed. Loading, empty, failed request, retry, filter reset and refresh are handled without unhandled promises.
- Ticket detail now shows an easy-to-read chronological conversation with actual author type and timestamps, clear status and linked-order shortcut; reply/close calls handle errors, close requires confirmation and closed threads are read-only. No fake agent or automated responses.
- Translation keys added in English, Dari and Pashto. RTL/LTR row layout and application themes maintained. All support APIs remain authenticated, user-scoped as before; FAQ is static/offline content. No new database migration, credential or external service dependency.
- Run `pnpm test:account-phase7` or the full `pnpm verify`. Manual acceptance in Expo Go remains: FAQ guest access, RTL text and search, ticket filters and reopening, real order context, network failure/retry, create/reply/close and cross-account privacy.

## Account Phase 7 — help and support usability update (2026-10-18)

- Existing Help & Support already had backed ticket creation, ticket search/status filters, ticket thread replies, close confirmation, FAQ search and content in English/Dari/Pashto. Phase 7 improves the working flows rather than replacing them with placeholder screens.
- Account Help items now distinguish FAQ topic browsing and the support-ticket hub.
- FAQ now has accessible topic chips (All, Orders, Shopping, Account, Selling), combined with existing full-text search, RTL layout, expand/collapse, and reset of both filters on no results.
- Support hub prioritizes real tickets in `waiting_customer` status above normal listings and links directly to the most recently updated ticket needing a customer reply. It shows the actual count and subject from authenticated API data, not invented ticket numbers or queues. The existing account-safe ticket list, filters, forms, conversation and support notifications remain unchanged.
- Includes phase-specific translations in English, Dari and Pashto, added assertions in existing `pnpm test:account-phase7` and standard `pnpm verify`.
- No new database migration, permissions, prices, direct chat, or third-party support provider. Manual Expo Go QA still necessary in three languages for FAQ chip sizes, search/filter combination, real waiting-customer tickets and navigation.


## Customer Account Phase 8 — final UX and quality pass (2026-10-18)

- Signed-in Account now includes a **compact three-action row** (Orders, Saved Products, Customer Support), with safe 44px+ accessible targets, explicit navigation, localized labels, theme tokens and RTL/LTR layout. All detailed Account menu sections remain available.
- For accounts whose email is **actually unverified** according to the authenticated server user projection, show a prominent action with context linking to the working email-verification flow in Account Security. Already-verified users never receive the prompt. Email verification still requires Phase 4's configured Resend sender; no fake "verified" state.
- **Sign out must be confirmed** through a translated native dialog. When server revocation fails but the existing AuthProvider clears the local session, show a warning that server-side sessions may still exist; avoid falsely asserting remote revocation. Cancel does nothing. Disabled state prevents repeated requests.
- Recently Viewed now **asks before clearing device-local browsing history**, disclosing that the action cannot be reversed. Previously swallowed AsyncStorage removal errors now correctly propagate through the serialized recent-history write queue, so the UI shows failure instead of lying that an item was deleted. The queue recovers after failures and still prevents delayed views from restoring cleared data. No cloud history is implied.
- Wishlist removal failures now leave items in the list and show their own retryable error message rather than turning a mutation error into a failed-list-load state; existing per-account auth and visibility rules remain intact.
- Wishlist and Recently Viewed previously had hidden stack headers without their own Back control. Both now expose one consistent, mirrored RTL/LTR, 48px+ accessible back action.
- Phase 8 copy translated to English/Dari/Pashto; automated checks in `pnpm test:account-phase8`, included in repository `pnpm verify`, with a live TypeScript-module test using an in-memory AsyncStorage fake for clear-failure and write-queue ordering.
- No API or schema changes and **no new migration**. Previous migration 0015 is still needed for Phase 5 Saved Products if not already applied. Manual Expo Go QA required on light/dark phones across three languages: quick action targets, verification status on verified vs unverified users, cancel/confirm signout (including API-offline), confirm/cancel/clear history and offline errors, wishlist deletion failures, long localized labels and 320px screens.
