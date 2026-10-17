# BazaarLink

BazaarLink is a mobile-first multilingual commerce platform for Afghanistan.

This repository is implemented from **Product Specification V1** using **Software Development Workflow V5**.

## Workspace

```text
apps/
├── mobile            Expo / React Native customer + merchant mobile app
├── api               Fastify API
├── admin             Next.js platform administration app
└── storefront-web    Next.js public storefront companion

packages/
├── contracts         Shared cross-app contracts
├── database          PostgreSQL / Drizzle database package
├── design-tokens     Shared visual tokens
└── localization      Shared locale definitions
```

## Requirements

- Node.js 22.13 or newer
- pnpm 12.6
- Docker Desktop / Docker Compose for the provided local PostgreSQL workflow, or a hosted PostgreSQL connection string

## Install

```powershell
pnpm install
```

## Local PostgreSQL

The example environment points to PostgreSQL at `localhost:5432`. Start the provided PostgreSQL 17 development service before running migrations:

```powershell
Copy-Item .env.example .env
pnpm db:setup
```

`db:setup` starts PostgreSQL, waits until it is healthy, applies committed migrations, and verifies connectivity.

Useful commands:

```powershell
pnpm db:up
pnpm db:health
pnpm db:logs
pnpm db:down
```

The Docker volume keeps local development data when `db:down` is used.

If you use Neon or another hosted PostgreSQL provider, replace `DATABASE_URL` in the root `.env` with the provider connection string and run:

```powershell
pnpm db:migrate
pnpm db:health
```

Never commit `.env` or real credentials.

## Mobile API environment

Expo reads the mobile app environment from `apps/mobile`. For local mobile development:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
```

Run `pnpm dev:api` from the repository root. It starts the Fastify API on **port 4000**, waits for `/ready` (including PostgreSQL), starts `ngrok http 4000` in the **same terminal**, prints the public HTTPS URL and automatically sets `EXPO_PUBLIC_API_URL` in the ignored `apps/mobile/.env.local`. It updates only this key and preserves other local values. The ngrok local inspector (normally port 4040) is **not** the forwarding target. Stop both processes with Ctrl+C.

Install and authenticate the ngrok CLI once before the first launch (for example `ngrok config add-authtoken <your-token>`; never commit tokens). On Windows, the launcher prioritizes the current ngrok v3 executable at `%LOCALAPPDATA%\\Microsoft\\WindowsApps\\ngrok.exe` when present, even if its Windows app-execution alias cannot be inspected by the Node filesystem API. ngrok is executed directly (never re-resolved by cmd.exe) to avoid an older ngrok 2.x program shadowing it in the pnpm script PATH. The selected CLI and its version are printed before startup, and no token is read or copied by BazaarLink. If your ngrok 3 executable is installed somewhere else, set `BAZAARLINK_NGROK_BIN` to its full `ngrok.exe` path. For instance, in PowerShell use `$env:BAZAARLINK_NGROK_BIN = (Get-Command ngrok).Source` before `pnpm dev:api`. If the terminal shows `ERR_NGROK_4018`, make sure you authenticated that same version of ngrok with `ngrok config add-authtoken`.
 Keep the API and ngrok process running while using Expo on a device. For a server-only API (no tunnel), run `pnpm api:dev:server`.

For a physical phone, `http://localhost:4000` points to the phone itself, not the development computer. The single-terminal API runner handles the ngrok URL; restart Expo after a URL change. The legacy alias `pnpm api:dev` also works, but `pnpm dev:api` is the primary command.

## Verify

```powershell
pnpm verify
```

## Development

API:

```powershell
pnpm dev:api
```

Mobile (Expo Go using a tunnel; clears Metro cache on startup):

```powershell
pnpm dev:mobile
```

This command runs `pnpm --filter @bazaarlink/mobile exec expo start --tunnel --clear --go` automatically. On Android Expo Go, the app skips native remote-push registration (unsupported since Expo SDK 53) but still supports browsing, accounts, orders and the in-app notification center. Remote push requires an EAS development/production build with configured credentials. Keep `pnpm dev:api` running in another terminal for the backend and ngrok API tunnel.

Admin:

```powershell
pnpm dev:admin
```

After a successful operator login, **Remember my email on this device** stores only the email locally for next time. Browser password-manager autofill handles passwords (never stored in the app or committed to Git), and the existing administrator session uses an HttpOnly, SameSite=Strict cookie until expiration or sign-out.

Public storefront:

```powershell
pnpm dev:storefront
```

## Customer Home refresh — Phase 1

Home is now a compact shopping landing page with a branded header, language menu, existing cart and notification links, search entry, real categories, product recommendations and featured stores. Category shortcuts deep-link into filtered Marketplace results. Home uses the marketplace API and offline cache with loading/empty/error states. The five main customer tabs have reduced their duplicated large introductory titles, subtitles and phase badges. Further phases refine search, category imagery, promotion surfaces, personalized discovery and commerce-specific styling.

## Customer Home UX — Phase 2

The Home search is now an editable field with debounced suggestions for products, shops, categories and brands, backed by the live marketplace search API. Selecting a product opens its detail; selecting a store opens its public storefront using the returned handle; category, brand and full search queries open filtered Marketplace results. Category tiles display real category images or recognizable fallback icons in English/Dari/Pashto. Marketplace supports incoming search/brand/category/store parameters, subcategories and horizontal sort controls. Search suggestions ignore stale responses, offer a clear action and keyboard submission, and never invent product/store results. No DB migration required.

## Customer shopping Home — Phase 3 product discovery

The mobile Home now displays live recommended (general relevance, not yet personalized), popular (view counts), new arrivals, discounted listings, recently viewed products, featured stores, and province-specific product rails. Each section uses the marketplace Home API; product cards open their public product pages. A promotional spotlight highlights a genuine discounted in-stock product when available and otherwise keeps the general shop-local CTA.

Use the compact province picker to view listings from a **selected province**, not GPS-measured nearby distances. No province is inferred or preselected. Province choice is stored locally and can be reset to `All Afghanistan`. Nearby/province results only appear when a province has been explicitly chosen. If no matching products exist, a small no-results message appears without fabricated listings. Each `View all` opens real Marketplace filtered results (popularity, newest, discounted, province); recently viewed intentionally has no false global `View all`. Live data and province-specific offline caches are kept separate.

This phase does not add a personalized recommendation engine, GPS radius filtering, or paid promoted-placement logic. Those require additional approved features and data.

## Customer Home — Phase 4 product and store card design

Home discovery rails, filtered Marketplace results, and public store product listings reuse an updated customer-facing product card. Cards have consistent responsive image areas with fallback icons on image errors, compact product and seller names, province, real phone-verification cues (not subscription or paid verification), available review ratings, AFN pricing, validated discount percentages and out-of-stock labels. Product cards navigate to product details; variant-dependent cart logic remains on the detail page.

Home and Marketplace now share a branded featured-store card with a real store cover, logo fallback, location, verified-phone indicator only when true, and authoritative active product count. Search results and store listings use a two-column responsive product grid; Home's horizontal product rails remain compact. Dari, Pashto and English text direction follow the existing localization system. No new payments, fabricated ratings, schema migrations or push features.
