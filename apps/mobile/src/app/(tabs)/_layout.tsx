import { Tabs } from "expo-router";

import { useAppTheme } from "@/design/theme";

export default function CustomerTabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          minHeight: 64,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSizes.caption,
          lineHeight: theme.lineHeights.caption,
          fontWeight: theme.fontWeights.semibold
        },
        sceneStyle: {
          backgroundColor: theme.colors.background
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home"
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Marketplace",
          tabBarAccessibilityLabel: "Marketplace"
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarAccessibilityLabel: "Cart"
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarAccessibilityLabel: "Orders"
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarAccessibilityLabel: "Account"
        }}
      />
    </Tabs>
  );
}
