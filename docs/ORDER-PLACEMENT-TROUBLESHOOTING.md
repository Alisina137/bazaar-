# Checkout: Place order errors and old Phase 8 copy

The app's **Review** section previously displayed “Order creation begins in
Phase 8.” That text referred to the internal implementation roadmap, not a
customer-facing restriction or a future feature. The backend already includes
`POST /customer/orders/place`, payment verification, inventory reservations,
order rows and post-checkout order views. The green callout now confirms that
the user may proceed to place the order.

The app previously reported every unexpected order error as “could not reach
the order service,” even for HTTP 503 responses. That prevented diagnosis of a
slow or failing backend. The order client now distinguishes network/timeout
failures and HTTP responses, retains an error reference from the API and
allows up to 45 seconds for the multi-store order transaction.

**Safety:** After an ambiguous request (timeout or 5xx), it checks the
authenticated order history for the same `checkoutSessionId`. If matching
orders exist, the app navigates to Orders without repeating the POST. If the
history request fails or does not confirm an order, the app does **not**
pretend it succeeded. It displays a Check my orders action; do not repeatedly
place an order until its status is known. The original idempotency key remains
stable across retries of the same quote.

The server now logs unexpected order errors with a safe reference and gives
that reference to the phone (without exposing SQL, session tokens or private
data). A notification failure after a successfully committed order no longer
turns the response into an order failure. Notification provider failures still
need investigation if order messages are delayed.

If the problem continues on your development database:
1. Pull latest main and run `pnpm dev:api`.
2. Start `pnpm dev:mobile` in another terminal once ngrok is available.
3. Place **one** order. Check Shopping → Orders before attempting another.
4. Share the reference displayed in Checkout and the matching sanitized error
   from the `pnpm dev:api` terminal. Never share DATABASE_URL or user tokens.
5. Check `pnpm diagnose:cart-db` and any missing migrations; use
   `pnpm db:migrate` only after confirming the target database and backup.

This does not establish whether the user's local Neon service is healthy.
