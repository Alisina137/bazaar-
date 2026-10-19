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
import { LocalizationProvider } from "@/localization/provider";
import { StoreProvider } from "@/store/provider";

function RootNavigator() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
            // Keep Yoga LTR: dynamic locale changes mirror rows explicitly.
            // Inheriting native RTL here would undo row-reverse on Persian screens.
            direction: "ltr"
          }
        }}
      />
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
