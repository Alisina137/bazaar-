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

Install and authenticate the ngrok CLI once before the first launch (for example `ngrok config add-authtoken <your-token>`; never commit tokens). Keep the API and ngrok process running while using Expo on a device. For a server-only API (no tunnel), run `pnpm api:dev:server`.

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

This command runs `pnpm --filter @bazaarlink/mobile exec expo start --tunnel --clear --go` automatically. Keep `pnpm dev:api` running in another terminal for the backend and ngrok API tunnel.

Admin:

```powershell
pnpm dev:admin
```

After a successful operator login, **Remember my email on this device** stores only the email locally for next time. Browser password-manager autofill handles passwords (never stored in the app or committed to Git), and the existing administrator session uses an HttpOnly, SameSite=Strict cookie until expiration or sign-out.

Public storefront:

```powershell
pnpm dev:storefront
```
