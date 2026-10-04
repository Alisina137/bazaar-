import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  initialWindowMetrics,
  SafeAreaProvider
} from "react-native-safe-area-context";

import {
  AppThemeProvider,
  useAppTheme
} from "@/design/theme";

function RootNavigator() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background
          }
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppThemeProvider>
        <RootNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
