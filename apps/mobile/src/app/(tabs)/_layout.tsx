import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

const customerTabIcons = {
  home: {
    ios: "house.fill",
    android: "home",
    web: "home"
  },
  marketplace: {
    ios: "bag.fill",
    android: "storefront",
    web: "storefront"
  },
  cart: {
    ios: "cart.fill",
    android: "shopping_cart",
    web: "shopping_cart"
  },
  orders: {
    ios: "doc.text.fill",
    android: "receipt_long",
    web: "receipt_long"
  },
  account: {
    ios: "person.fill",
    android: "person",
    web: "person"
  }
} as const;

function TabIcon({
  name,
  color,
  size
}: {
  name: keyof typeof customerTabIcons;
  color: string;
  size: number;
}) {
  return (
    <SymbolView
      name={customerTabIcons[name]}
      tintColor={color}
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
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="home" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="marketplace"
      name="marketplace"
      options={{
        title: t("nav.marketplace"),
        tabBarAccessibilityLabel: t("nav.marketplace"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="marketplace" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="cart"
      name="cart"
      options={{
        title: t("nav.cart"),
        tabBarAccessibilityLabel: t("nav.cart"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="cart" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="orders"
      name="orders"
      options={{
        title: t("nav.orders"),
        tabBarAccessibilityLabel: t("nav.orders"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="orders" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="account"
      name="account"
      options={{
        title: t("nav.account"),
        tabBarAccessibilityLabel: t("nav.account"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="account" color={color} size={size} />
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
