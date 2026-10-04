import { Tabs } from "expo-router";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function CustomerTabsLayout() {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  const screens = [
    <Tabs.Screen
      key="home"
      name="index"
      options={{
        title: t("nav.home"),
        tabBarAccessibilityLabel: t("nav.home")
      }}
    />,
    <Tabs.Screen
      key="marketplace"
      name="marketplace"
      options={{
        title: t("nav.marketplace"),
        tabBarAccessibilityLabel: t("nav.marketplace")
      }}
    />,
    <Tabs.Screen
      key="cart"
      name="cart"
      options={{
        title: t("nav.cart"),
        tabBarAccessibilityLabel: t("nav.cart")
      }}
    />,
    <Tabs.Screen
      key="orders"
      name="orders"
      options={{
        title: t("nav.orders"),
        tabBarAccessibilityLabel: t("nav.orders")
      }}
    />,
    <Tabs.Screen
      key="account"
      name="account"
      options={{
        title: t("nav.account"),
        tabBarAccessibilityLabel: t("nav.account")
      }}
    />
  ];

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
      {isRTL ? [...screens].reverse() : screens}
    </Tabs>
  );
}
