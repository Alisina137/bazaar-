import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

import { Screen, StateView } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

const sellerTabIcons = {
  dashboard: {
    ios: "square.grid.2x2.fill",
    android: "dashboard",
    web: "dashboard"
  },
  products: {
    ios: "cube.box.fill",
    android: "inventory_2",
    web: "inventory_2"
  },
  orders: {
    ios: "doc.text.fill",
    android: "receipt_long",
    web: "receipt_long"
  },
  store: {
    ios: "storefront.fill",
    android: "store",
    web: "store"
  },
  more: {
    ios: "ellipsis.circle.fill",
    android: "more_horiz",
    web: "more_horiz"
  }
} as const;

function TabIcon({
  name,
  color,
  size
}: {
  name: keyof typeof sellerTabIcons;
  color: string;
  size: number;
}) {
  return (
    <SymbolView
      name={sellerTabIcons[name]}
      tintColor={color}
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
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="dashboard" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="products"
      name="products"
      options={{
        title: t("seller.nav.products"),
        tabBarAccessibilityLabel: t("seller.nav.products"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="products" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="orders"
      name="orders"
      options={{
        title: t("seller.nav.orders"),
        tabBarAccessibilityLabel: t("seller.nav.orders"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="orders" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="store"
      name="store"
      options={{
        title: t("seller.nav.store"),
        tabBarAccessibilityLabel: t("seller.nav.store"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="store" color={color} size={size} />
        )
      }}
    />,
    <Tabs.Screen
      key="more"
      name="more"
      options={{
        title: t("seller.nav.more"),
        tabBarAccessibilityLabel: t("seller.nav.more"),
        tabBarIcon: ({ color, size }) => (
          <TabIcon name="more" color={color} size={size} />
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
