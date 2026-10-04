import { Redirect, Tabs } from "expo-router";

import { Screen, StateView } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

export default function SellerTabsLayout() {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const { status, currentStore } = useStores();

  if (status === "loading" || status === "idle") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("seller.onboarding.creating")}
          message={t("seller.dashboard.description")}
        />
      </Screen>
    );
  }

  if (!currentStore) {
    return <Redirect href="/seller/onboarding" />;
  }

  const screens = [
    <Tabs.Screen
      key="dashboard"
      name="index"
      options={{
        title: t("seller.nav.dashboard"),
        tabBarAccessibilityLabel: t("seller.nav.dashboard")
      }}
    />,
    <Tabs.Screen
      key="products"
      name="products"
      options={{
        title: t("seller.nav.products"),
        tabBarAccessibilityLabel: t("seller.nav.products")
      }}
    />,
    <Tabs.Screen
      key="orders"
      name="orders"
      options={{
        title: t("seller.nav.orders"),
        tabBarAccessibilityLabel: t("seller.nav.orders")
      }}
    />,
    <Tabs.Screen
      key="store"
      name="store"
      options={{
        title: t("seller.nav.store"),
        tabBarAccessibilityLabel: t("seller.nav.store")
      }}
    />,
    <Tabs.Screen
      key="more"
      name="more"
      options={{
        title: t("seller.nav.more"),
        tabBarAccessibilityLabel: t("seller.nav.more")
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
