# Development sample data

The database seed creates three sample owners/customers, three published stores, three marketplace categories, three store categories, three products per store (nine products), three subscriptions, three carts (three items each), three addresses, nine wishlist records, three notifications, three support tickets, and three coupons.

All generated entities use stable identifiers and `[DEMO]` labels where applicable. Re-running the seed skips existing records and does not delete customer data. Demo users intentionally have **no authentication credentials**; they cannot be used to log in. Orders, product reviews, and payment transactions are **not seeded** because they require legitimate checkout and order lifecycle invariants. This is a first-stage catalog and customer-state fixture, not comprehensive end-to-end commerce simulation.

## Run locally

1. Configure `DATABASE_URL` in the project root `.env` and run migrations.
2. On PowerShell, run `$env:BAZAAR_DEMO_SEED='YES'; pnpm db:seed:demo; Remove-Item Env:BAZAAR_DEMO_SEED`.
3. Only if your database is a separate **remote development database**, additionally set `$env:BAZAAR_DEMO_REMOTE_DB='YES'` for this session. Never seed production or a shared real-customer database.

The script rejects `NODE_ENV=production` and remote connections without the explicit second opt-in. Database writes are transactional and no payments, emails, or push notifications are sent.
