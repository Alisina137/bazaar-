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

## Verify

```powershell
pnpm verify
```

## Development

API:

```powershell
pnpm dev:api
```

Mobile:

```powershell
pnpm dev:mobile
```

Admin:

```powershell
pnpm dev:admin
```

Public storefront:

```powershell
pnpm dev:storefront
```
