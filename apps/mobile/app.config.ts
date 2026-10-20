import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * A production binary pointed to localhost would silently fail every request
 * on a real phone. Fail the EAS build instead of shipping an unusable APK/AAB.
 */
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  if (process.env.EAS_BUILD_PROFILE === "production") {
    const url = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (!url || !/^https:\/\//i.test(url)) {
      throw new Error(
        "Production EAS builds require EXPO_PUBLIC_API_URL to be an HTTPS API endpoint"
      );
    }
  }
  // Expo Go bundles the native Google Map on Android. Standalone builds
  // need an Android Maps SDK key; add it only when configured.
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  if (mapsKey) {
    config.plugins = [
      ...(config.plugins ?? []),
      ["react-native-maps", { androidGoogleMapsApiKey: mapsKey }]
    ];
  }
  return config;
}
