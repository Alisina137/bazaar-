# BazaarLink — Phase 12 Release-Readiness Runbook

Status: Release-engineering implementation and automated regression gates verified by GitHub Actions run `37769585890` (commit `0f84bb9e79af1ee5c9b915d0c0b9df87cdd1b944`). A production deployment and public-store distribution are **NOT** implied by passing CI. A production go/no-go must be explicitly signed off after physical-device, payment-provider and operational checks.

## Seven workstreams

| Task | Implemented change | Release evidence |
| --- | --- | --- |
| 12.1 Security | API anti-sniffing, anti-framing and no-store headers; 1 MiB JSON cap; fail-closed production environment validation; blocked unverified merchant paid upgrades | `pnpm verify`, service unit tests; third-party dependency audit before deployment |
| 12.2 Performance | Bounded marketplace offsets, rate-limited public search and browse, short public GET caching with personalized reads no-store, bounded seven-day offline cache for stale product snapshots | API tests; physical low-bandwidth profiling, representative load and DB query analysis still require a staging environment |
| 12.3 Accessibility | 48px minimum shared controls, descriptive input accessibility hints (including errors), improved keyboard dismissal | structural UX gate plus real TalkBack/large-text tests |
| 12.4 RTL | Both customer and merchant tab bars reverse for Dari/Pashto; direction-aware shared input; translation/AFN formatting invariant gate | `pnpm verify:localization`, `pnpm verify:release-ux`, on-device three-language matrix |
| 12.5 Payment | Provider decline, network failure, insecure redirect and spoofed webhook protections; existing idempotency and refund tests; block unverified paid-plan upgrades on production | Unit/PostgreSQL integration tests and test provider sandbox scenario; live callbacks require credentials |
| 12.6 Delivery | Missing map coordinates, overlapping zones, coverage denial, cutoff, suspended merchant and free delivery cases | Unit/integration tests; Kabul-zone actual device tests |
| 12.7 Production | `/ready` DB-backed probe, production config fail-fast, APK/AAB EAS build profiles, preflight script, CI checks and backup/rollback runbook | `pnpm verify`, `pnpm test:integration`, `pnpm release:preflight` with real environment plus manual operator sign-off |

## Local developer verification

```powershell
cd C:\projects\bazaar
git pull origin main
pnpm install
pnpm db:migrate
pnpm verify
pnpm test:integration
```

The integration suite requires an isolated migrated PostgreSQL instance in root `.env`. Use a staging database rather than live customer data.

## Deployment preparation

1. Provision private PostgreSQL 17 with TLS, restrict inbound access, configure daily encrypted `pg_dump` and managed snapshot backups, and test a restore on isolated staging. Never rely solely on untested snapshots.
2. Provision HTTPS API. Set `NODE_ENV=production`, `DATABASE_URL`, `API_PUBLIC_BASE_URL=https://api.example.com`, and production database connection parameters. On startup, invalid/missing required values throw instead of serving traffic.
3. Set server-side `API_URL=https://api.example.com` on Next.js admin and storefront; configure `NEXT_PUBLIC_API_URL` only for public browser fetches. Keep payment keys and database passwords out of any `EXPO_PUBLIC_*` variables.
4. If launching card/HesabPay payments, provision live `HESABPAY_API_KEY`, `HESABPAY_ENVIRONMENT=production`, trusted `HESABPAY_API_BASE_URL` and `PAYMENT_PUBLIC_BASE_URL` over HTTPS. Verify real webhook signature, idempotency, late callbacks, settlement and refund process. Without verified payment integration, use a **COD/pickup-only controlled pilot**; production starts without a gateway key.
5. The production endpoint `GET /ready` must return HTTP 200 `ready` **only when database connectivity succeeds**. Register it as the orchestrator readiness probe. `GET /health` checks API process liveness only.
6. Set `EXPO_PUBLIC_API_URL` to the externally accessible HTTPS API **before EAS compilation (the dynamic Expo app config rejects production EAS builds without an HTTPS API URL)**. Use `apps/mobile/eas.json` profiles: `preview` produces APK, `production` produces Android App Bundle. Confirm the provisional `com.bazaarlink.app` package ID before publishing; it is immutable once registered with Google Play. Set project ID and signing through your Expo/EAS account. Generate professional icon, adaptive icon, splash assets and localized Play Store metadata before distribution.
7. Run `pnpm release:preflight` with the full production environment available to the command. This is **static configuration validation only**, not a live smoke test. Manually verify CDN/DNS/TLS, privacy-policy pages, legal terms, support contact, monitoring, alerts, secrets rotation and rollback procedures.

## Payment integrity policy

For production, unauthenticated merchant requests cannot obtain Pro or Business benefits merely by calling `POST /seller/stores/:storeId/subscription/change`. Any **upgrade** is blocked with `feature_not_available` until verified billing/activation is implemented; legitimate **downgrades** continue. In local test/development, plan transitions stay available for automated fixtures. This prevents charging a customer nothing while granting a paid entitlement. **Paid subscriptions are therefore NOT ready to sell via self-service production checkout.** Do not switch this gate off to manufacture a green launch result.

HesabPay payment-success redirects do not prove payment; only verified server callback can mark a hosted attempt paid. Handle refunds through the existing merchant manual-action workflow; a `refund_pending` state does not imply money was returned.

## Critical go/no-go: connected tests

| Journey | Required verification |
| --- | --- |
| Customer | Register → browse → search → product → cart → location → delivery → checkout → COD or verified payment → order → tracking → verified review |
| Merchant | Register → create store → category → product + variant + inventory + image → delivery + payment settings → publish → order received → fulfill → review/support |
| Subscription | Starter 15 products permitted and #16 rejected; Pro 300 / #301; Business 1,200 / #1,201; downgrade preserved records and entitlements |
| Payment | Success, decline, timeout, abandonment, duplicate/late webhooks, disconnect after payment, refund failed/pending; no forged payment states |
| Delivery | Inside/outside zones, zone precedence, location unknown, distance fallback, cutoff/same-day, free threshold, COD refusal, failed delivery |
| Platform | User suspension invalidates active sessions; access-limited operator; support reply, moderation, audit history, no token exposure |

Automated database suites cover many of these transitions but **do not replace a single complete physical-device checkout**, actual provider settlement, or full-scale load testing. Record evidence for each manual case with screenshots and anonymized reference IDs before public distribution.

## Physical-device matrix

Validate in Dari (RTL), Pashto (RTL), English (LTR) on at least a low-end Android phone and a recent Android version. Exercise large accessibility font, TalkBack focus order, tab-bar placement, onscreen keyboard, long translated labels, AFN prices, Wi-Fi to mobile-data switching, airplane-mode offline cache, reconnect, Android back behavior and deep links. Verify user-facing errors stay localized and no offline checkout falsely succeeds.

## Backup / disaster recovery

Schedule daily snapshots and regular encrypted logical dumps. Example on an approved operator shell:

```bash
pg_dump --format=custom --no-owner --no-acl --file=bazaarlink-backup.dump "$DATABASE_URL"
```

Keep backups in an encrypted off-server location with restricted access and documented retention. Rehearse `pg_restore` **into isolated staging**, compare row counts, login and checkout read paths, and document realistic RPO/RTO based on measured recovery (do not invent guarantees).

## Rollback and incident protocol

- Before publishing: tag the CI-verified commit, take a database backup, record schema migration version and EAS build ID.
- Deploy API and web changes using reversible traffic switching; keep the previous server image and environment snapshot. Deploy DB migrations before code if compatible.
- On elevated payment failures or duplicate orders: stop new digital checkout, preserve webhook payload fingerprints and request IDs, switch to COD pilot where safe, notify operators.
- On schema rollback: prefer forward-fix migration. Never blindly reverse/drop tables containing orders/payments. Restore a backup **only with an agreed recovery plan** and after determining transaction-loss exposure.
- Stop rollout for: forged payment state, double charge/order, leaked credentials, seller cross-store access, incorrect totals, unbounded downtime, untested backups, failed mobile accessibility/RTL on target devices.

## External blockers and sign-off

**Not completed by code/CI:** actual hosting and DNS, production database credentials, gateway credential/account verification, signing and Play Store credentials, official artwork, live settlement tests, official legal/privacy content, low-end device usability, real customer/merchant acceptance and a measured backup restore.

For a **Starter + COD-only pilot**, paid upsell must remain disabled and manual operational acceptance is still required. For a **fully paid/public launch**, add approved billing/activation verification and satisfy all manual go/no-go items.
