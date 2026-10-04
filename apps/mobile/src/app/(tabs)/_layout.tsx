import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

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
    color: ColorValue;
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

export default function CustomerTabsLayout() {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  const screens = [
    <Tabs.Screen
      key="home"
      name="index"
      options={{
        title: t("nav.home"),
        tabBarAccessibilityLabel: t("nav.home"),
        tabBarIcon: tabIcon("home", "home-outline")
      }}
    />,
    <Tabs.Screen
      key="marketplace"
      name="marketplace"
      options={{
        title: t("nav.marketplace"),
        tabBarAccessibilityLabel: t("nav.marketplace"),
        tabBarIcon: tabIcon("storefront", "storefront-outline")
      }}
    />,
    <Tabs.Screen
      key="cart"
      name="cart"
      options={{
        title: t("nav.cart"),
        tabBarAccessibilityLabel: t("nav.cart"),
        tabBarIcon: tabIcon("cart", "cart-outline")
      }}
    />,
    <Tabs.Screen
      key="orders"
      name="orders"
      options={{
        title: t("nav.orders"),
        tabBarAccessibilityLabel: t("nav.orders"),
        tabBarIcon: tabIcon("receipt", "receipt-outline")
      }}
    />,
    <Tabs.Screen
      key="account"
      name="account"
      options={{
        title: t("nav.account"),
        tabBarAccessibilityLabel: t("nav.account"),
        tabBarIcon: tabIcon("person", "person-outline")
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
