import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  initialWindowMetrics,
  SafeAreaProvider
} from "react-native-safe-area-context";

import { AuthProvider } from "@/auth/provider";
import { CatalogProvider } from "@/catalog/provider";
import { NotificationProvider } from "@/communication/push-provider";
import {
  AppThemeProvider,
  useAppTheme
} from "@/design/theme";
import {
  LocalizationProvider,
  useLocalization
} from "@/localization/provider";
import { StoreProvider } from "@/store/provider";

function RootNavigator() {
  const theme = useAppTheme();
  const { direction } = useLocalization();

  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
            direction
          }
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="marketplace" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="seller" />
        <Stack.Screen name="reviews" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="support" />
        <Stack.Screen name="platform" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppThemeProvider>
        <LocalizationProvider>
          <AuthProvider>
            <NotificationProvider>
              <StoreProvider>
                <CatalogProvider>
                  <RootNavigator />
                </CatalogProvider>
              </StoreProvider>
            </NotificationProvider>
          </AuthProvider>
        </LocalizationProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
