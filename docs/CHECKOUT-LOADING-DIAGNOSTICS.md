# Checkout shows “Unavailable” before the payment steps

Checkout loads the authenticated cart (`GET /customer/cart`) **and** the
customer's saved addresses (`GET /customer/addresses`). Previously the mobile
screen used `Promise.all` and displayed the same **cart unreachable** message
if either request failed, including database-backed HTTP 503s. This has been
corrected; the screen now reports which request failed, includes a safe request
reference for unexpected server errors, and offers retry/back.

The checkout UI cannot place orders while it cannot verify the live cart,
delivery quote and payment readiness; do **not** bypass the server pricing.

To diagnose the underlying cause on your own machine (not accessible to CI):

1. Pull `main`. Run `pnpm diagnose:cart-db` from the repository root. This
   read-only query now checks cart tables **and** pricing/checkout dependencies,
   especially `product_promotions` from migration
   `0012_superb_roughhouse`. Missing promotions can cause cart pricing reads
   to throw 503 even when public catalog browsing still works.
2. Start `pnpm dev:api`, then `pnpm dev:mobile`. Wait for ngrok and scan
   the new Expo Go QR. Do not reuse a stale API tunnel or Expo session.
3. Retry Checkout. If an error reference is shown, locate that same reference
   in `pnpm dev:api` logs. Check the exception type (e.g. missing relation,
   permissions, network timeout), without sharing credentials or tokens.
4. If the audit shows missing migrations, back up and migrate the intended
   **development** database with `pnpm db:migrate`. Check errors before
   repeating. Do not attempt forced schema changes on production data.

Automated CI integration tests only exercise the CI database; they do not
prove your connected Neon DB is healthy. Please share the diagnostic result
and the sanitized backend error if the issue persists.
