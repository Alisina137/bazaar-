# Cart/pricing write failures: reproduce safely

The public marketplace endpoints and `GET /customer/cart` can succeed while
`POST /customer/cart/items`, `PATCH`, or `DELETE` fail. A 503 returned by the
API is **not** proof of an internet outage; it means the server encountered an
unexpected exception. Because a cart write can commit before recalculation fails,
avoid repeatedly clicking Add to cart until you refresh and inspect the item count.

1. Run `pnpm diagnose:mobile` to distinguish Metro, ngrok and API connectivity.
2. Run `pnpm diagnose:cart-db` from the repository root to check the configured
   database's table presence, read/write mode, and cart write privileges.
   This script performs **SELECTs only**. It does not change customer carts.
3. Start `pnpm dev:api`. Retry **one** failing cart action on the phone.
4. The phone now displays an **Error reference** for unexpected 503 responses,
   e.g. `req-72`. Find that reference in the backend terminal alongside
   `Unexpected cart/pricing request failure`. The log includes the SQL/driver
   error locally; the phone never displays SQL, DB credentials or bearer tokens.
5. If your local schema has pending migrations, first back up the database,
   then run `pnpm db:migrate` on the intended development DB.
6. Restart Expo *after* starting the API/ngrok tunnel so `EXPO_PUBLIC_API_URL`
   does not reference an old URL.

The integration suite also covers cart POST, DELETE, PATCH, repeated reads and
cross-account access against the CI PostgreSQL database. Passing CI cannot
confirm the user's local database permissions, schema or live network.

Do not send your `.env`, tokens, passwords or connection strings to support.
Share the request reference and the sanitized backend error line instead.
