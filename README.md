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
├── database          Database package boundary
├── design-tokens     Shared visual tokens
└── localization      Shared locale definitions
```

## Requirements

- Node.js 22.13 or newer
- pnpm 12.6

## Install

```powershell
pnpm install
```

## Verify

```powershell
pnpm verify
```

## Development

```powershell
pnpm dev:api
pnpm dev:mobile
pnpm dev:admin
pnpm dev:storefront
```

## Environment

Copy `.env.example` to `.env` when a task begins requiring environment-backed services.

Never commit real credentials.
