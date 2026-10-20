# Local development: cart requests and Expo CLI disconnects

Cart mutations are sent to BazaarLink's HTTP API on **port 4000**, whereas
Expo/Metro uses **port 8081**. The Android phone reaches both over public tunnels
in development. These are different services; one may disconnect while the other
continues working.

## Recommended restart order (PowerShell)

1. In the repository root run `pnpm dev:api` and leave that terminal open.
   Wait for the ready message and the printed public HTTPS ngrok URL.
2. **After** the API tunnel is running, in another terminal run
   `pnpm dev:mobile` and leave Expo/Metro running.
3. Scan the **new** Expo QR code in Expo Go. Closing/restarting Metro invalidates
   its previous session. If Expo Go warns `Cannot connect to Expo CLI`, first
   reopen the active Expo session and verify the phone can reach the internet.
4. Run `pnpm diagnose:mobile` from the repo root to check local API readiness,
   the current ngrok tunnel, the configured phone-facing API and Metro port 8081.

`pnpm dev:api` updates `apps/mobile/.env.local` with the current ngrok URL,
but Metro reads Expo environment variables at start. Restart `pnpm dev:mobile`
**after** any API tunnel URL change. Otherwise the phone may call a stale URL.

If the cart displays an old count and the error `API unreachable`, this does
not mean an item was deleted. The refreshed mobile cart now distinguishes
network errors, request timeouts and backend 503s. When a DELETE's response is
lost, it reads the server cart before confirming removal. If the server cannot
be reached, it leaves the item visible; manually refresh after connectivity
recovers.

The warning `Cannot connect to Expo CLI` originates from the development
session, not a particular Home component. A Metro/tunnel outage cannot be
fixed by a React Native screen change alone. Keep both terminals running,
use the new QR after restarting Expo, check device Internet and Android battery
saving restrictions, and confirm the local machine is online.

Do not delete your account data or disable authentication to bypass an
unreachable API. Do not put bearer tokens into troubleshooting logs.
