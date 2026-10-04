import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { Screen, StateView } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(
  filled: IoniconName,
  outline: IoniconName
) {
  return ({
    color,
    size,
    focused
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => (
    <Ionicons
      name={focused ? filled : outline}
      color={color}
      size={size}
    />
  );
}

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
        tabBarAccessibilityLabel: t("seller.nav.dashboard"),
        tabBarIcon: tabIcon("grid", "grid-outline")
      }}
    />,
    <Tabs.Screen
      key="products"
      name="products"
      options={{
        title: t("seller.nav.products"),
        tabBarAccessibilityLabel: t("seller.nav.products"),
        tabBarIcon: tabIcon("cube", "cube-outline")
      }}
    />,
    <Tabs.Screen
      key="orders"
      name="orders"
      options={{
        title: t("seller.nav.orders"),
        tabBarAccessibilityLabel: t("seller.nav.orders"),
        tabBarIcon: tabIcon("receipt", "receipt-outline")
      }}
    />,
    <Tabs.Screen
      key="store"
      name="store"
      options={{
        title: t("seller.nav.store"),
        tabBarAccessibilityLabel: t("seller.nav.store"),
        tabBarIcon: tabIcon("storefront", "storefront-outline")
      }}
    />,
    <Tabs.Screen
      key="more"
      name="more"
      options={{
        title: t("seller.nav.more"),
        tabBarAccessibilityLabel: t("seller.nav.more"),
        tabBarIcon: tabIcon(
          "ellipsis-horizontal-circle",
          "ellipsis-horizontal-circle-outline"
        )
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
          minHeight: 68,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm
        },
        tabBarIconStyle: {
          marginTop: 2
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
