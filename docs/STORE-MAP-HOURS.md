# BazaarLink store location and business hours

In **Account → Sell on BazaarLink**, Store Optional Details now provide:
- **Street address / directions:** editable text, saved in the existing `physicalAddress` field.
- **Physical location:** explicit pin chosen by tapping/dragging a Google Map on Android. Saved in `mapLatitude` and `mapLongitude` separately (both optional). No device GPS permission is required. The public store detail page shows the pin and a **View in Google Maps** button.
- **Business hours:** opening and closing selects in 30-minute increments, stored as `HH:mm - HH:mm`. Earlier closing time implies next day; nothing is saved until both endpoints are chosen. A blank range is allowed.
- The seller dashboard Settings page supports editing the same fields.

**Expo Go:** SDK 57 includes `react-native-maps`. Install dependencies after pulling (`pnpm install`) and restart Expo Go using `pnpm dev:mobile`. On Android the map is backed by Google Maps in Expo Go.

**Android standalone APK/AAB:** The Maps SDK for Android needs a Google Cloud API key (with the Google Cloud Maps SDK enabled and required billing). Provide `GOOGLE_MAPS_ANDROID_API_KEY` in your secure build environment. `apps/mobile/app.config.ts` only adds the native map plugin if that environment variable is set. Do not commit secrets into source. Without a key, standalone builds may display a blank map even though Expo Go works. iOS uses Apple Maps by default. Web has explicit latitude/longitude inputs and an external Google Maps link.

**Store creation failures:** A 503 from the backend and a transport timeout were previously shown as the same generic message. The mobile store API now carries the HTTP status, the onboarding form displays distinct server/network guidance, and unexpected backend exceptions are logged at the API server. Store creation also reconciles after an ambiguous response and does not treat a failed authentication-session refresh as a failed database insert. This improves debugging and prevents unneeded duplicate submissions; it does *not* guarantee connectivity or resolve an unknown database outage. If server errors persist, inspect the `pnpm dev:api` terminal and `GET /ready`, and verify the same `EXPO_PUBLIC_API_URL` tunnel is used by Expo Go.
