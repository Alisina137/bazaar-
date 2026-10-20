import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "@/auth/provider";
import { getCart } from "@/cart-pricing/api";
import type { CartResponse } from "@bazaarlink/contracts";
import { AppText } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { listCustomerOrders } from "@/order/api";
import CartScreen from "./cart";
import OrdersScreen from "./orders";

type ShoppingSection = "cart" | "orders";

export default function ShoppingScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const selected: ShoppingSection = section === "orders" ? "orders" : "cart";
  const theme = useAppTheme();
  const { isRTL, formatNumber, t } = useLocalization();
  const { status, sessionToken } = useAuth();
  const [cartCount, setCartCount] = useState<number | null>(null);
  const [activeOrders, setActiveOrders] = useState<number | null>(null);
  const cartCountEpoch = useRef(0);
  const updateCartCount = useCallback((next: CartResponse) => {
    ++cartCountEpoch.current;
    setCartCount(next.itemCount);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    const cartRequestId = ++cartCountEpoch.current;
    if (status !== "signedIn" || !sessionToken) {
      setCartCount(null);
      setActiveOrders(null);
      return () => { active = false; };
    }
    // Counts are optional enhancements: failure never blocks either screen.
    void getCart(sessionToken).then(result => {
      if (active && cartRequestId === cartCountEpoch.current) setCartCount(result.itemCount);
    }).catch(() => {
      if (active && cartRequestId === cartCountEpoch.current) setCartCount(null);
    });
    void listCustomerOrders(sessionToken).then(result => {
      if (active) {
        setActiveOrders(result.orders.filter(order =>
          !["delivered", "picked_up", "cancelled", "refunded", "payment_failed", "delivery_failed"].includes(order.state)
        ).length);
      }
    }).catch(() => { if (active) setActiveOrders(null); });
    return () => { active = false; ++cartCountEpoch.current; };
  }, [sessionToken, status, selected]));

  const sections: { key: ShoppingSection; label: string; icon: "cart-outline" | "receipt-outline"; count: number | null }[] = [
    { key: "cart", label: t("nav.cart"), icon: "cart-outline", count: cartCount },
    { key: "orders", label: t("nav.orders"), icon: "receipt-outline", count: activeOrders }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        gap: theme.spacing.xs
      }}>
        <AppText variant="bodyStrong" style={{ fontSize: 18, lineHeight: 25 }}>{t("nav.shopping")}</AppText>
        <AppText variant="caption" tone="muted">{t("shopping.subtitle")}</AppText>
      </View>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          marginHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.sm,
          padding: theme.spacing.xs,
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: 1,
          borderColor: theme.colors.border,
          gap: theme.spacing.xs
        }}
      >
        {sections.map(item => {
          const focused = selected === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
              onPress={() => router.setParams({ section: item.key })}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                borderRadius: theme.radii.md,
                backgroundColor: focused ? theme.colors.primary : "transparent",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: isRTL ? "row-reverse" : "row",
                gap: theme.spacing.xs,
                opacity: pressed ? theme.opacity.pressed : 1
              })}
            >
              <Ionicons name={item.icon} size={18} color={focused ? theme.colors.onPrimary : theme.colors.text} />
              <AppText variant="label" style={{ fontSize: 13, lineHeight: 19, color: focused ? theme.colors.onPrimary : theme.colors.text }}>
                {item.label}
              </AppText>
              {item.count !== null && item.count > 0 ? (
                <View style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  paddingHorizontal: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: focused ? theme.colors.onPrimary : theme.colors.primary
                }}>
                  <AppText variant="caption" style={{ color: focused ? theme.colors.primary : theme.colors.onPrimary }}>
                    {formatNumber(item.count)}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>
        {selected === "cart" ? <CartScreen onCartChange={updateCartCount} /> : <OrdersScreen />}
      </View>
    </View>
  );
}
