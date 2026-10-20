import type { OrderRecord } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  listCustomerOrders,
  OrderApiError
} from "@/order/api";
import {
  orderErrorKey,
  orderStateKey
} from "@/order/messages";

type OrderFilter = "all" | "active" | "completed" | "cancelled";
const finishedStates = new Set(["delivered", "picked_up"]);
const cancelledStates = new Set(["cancelled", "refunded", "payment_failed", "delivery_failed"]);
function filterLabel(filter: OrderFilter, locale: string): string {
  const labels: Record<OrderFilter, [string, string, string]> = {
    all: ["All", "همه", "ټول"],
    active: ["Active", "فعال", "فعال"],
    completed: ["Completed", "تکمیل شده", "بشپړ شوي"],
    cancelled: ["Cancelled", "لغو شده", "لغوه شوي"]
  };
  const index = locale === "fa-AF" ? 1 : locale === "ps-AF" ? 2 : 0;
  return labels[filter][index];
}
function statusTone(
  state: OrderRecord["state"]
): "success" | "danger" | "warning" | "neutral" {
  if (state === "delivered" || state === "picked_up") return "success";
  if (
    state === "cancelled" ||
    state === "payment_failed" ||
    state === "delivery_failed" ||
    state === "refunded"
  ) {
    return "danger";
  }
  if (state === "refund_pending") return "warning";
  return "neutral";
}

export default function OrdersScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status, sessionToken } = useAuth();
  const { isRTL, formatAfn, locale, t } = useLocalization();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const epoch = useRef(0);
  const currentOrders = loadedToken === sessionToken ? orders : [];
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const visibleOrders = useMemo(() => currentOrders.filter(order => {
    const query = search.trim().toLowerCase();
    if (query && ![order.storeName, order.orderNumber].some(value => value.toLowerCase().includes(query))) return false;
    if (filter === "active") return !finishedStates.has(order.state) && !cancelledStates.has(order.state);
    if (filter === "completed") return finishedStates.has(order.state);
    if (filter === "cancelled") return cancelledStates.has(order.state);
    return true;
  }).sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt)), [currentOrders, filter, search]);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    const requestId = ++epoch.current;
    if (status !== "signedIn" || !sessionToken) {
      setOrders([]);
      setLoadedToken(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorKey(null);
    try {
      const response = await listCustomerOrders(sessionToken);
      if (requestId !== epoch.current) return;
      setLoadedToken(sessionToken);
      setOrders(response.orders);
    } catch (error) {
      if (requestId !== epoch.current) return;
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setErrorKey(orderErrorKey(safe.code));
    } finally {
      if (requestId === epoch.current) setLoading(false);
    }
  }, [sessionToken, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => { epoch.current += 1; };
    }, [load])
  );

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("order.customer.loadingTitle")}
          message={t("order.customer.loadingMessage")}
        />
      </Screen>
    );
  }

  if (status !== "signedIn" || !sessionToken) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("order.customer.signInTitle")}
          message={t("order.customer.signInMessage")}
          actionLabel={t("auth.signInAction")}
          onAction={() => router.push("/(tabs)/account")}
        />
      </Screen>
    );
  }

  if (loading && currentOrders.length === 0) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("order.customer.loadingTitle")}
          message={t("order.customer.loadingMessage")}
        />
      </Screen>
    );
  }

  if (errorKey && currentOrders.length === 0) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("order.customer.errorTitle")}
          message={t(errorKey)}
          actionLabel={t("cart.retry")}
          onAction={() => {
            void load();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollKey="shopping-orders" refreshing={loading} onRefresh={() => { void load(); }} contentStyle={{ gap: theme.spacing.md }}>
      <AppText variant="bodyStrong" style={{ fontSize: 17, lineHeight: 24 }}>{t("order.customer.title")}</AppText>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={locale === "fa-AF" ? "جستجوی سفارش یا فروشگاه" : locale === "ps-AF" ? "د فرمایش یا پلورنځي لټون" : "Search orders or stores"}
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={locale === "fa-AF" ? "جستجوی سفارش" : locale === "ps-AF" ? "د فرمایش لټون" : "Search orders"}
        style={{ color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.md, minHeight: 48, textAlign: isRTL ? "right" : "left" }}
      />
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
        {(["all", "active", "completed", "cancelled"] as const).map(key => (
          <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key)}
            style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.md, borderWidth: 1, borderColor: filter === key ? theme.colors.primary : theme.colors.border, backgroundColor: filter === key ? theme.colors.primary : theme.colors.surface }}>
            <AppText style={{ color: filter === key ? theme.colors.onPrimary : theme.colors.text }}>{filterLabel(key, locale)}</AppText>
          </Pressable>
        ))}
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      {currentOrders.length === 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="bodyStrong" style={{ fontSize: 16, lineHeight: 22 }}>
              {t("order.customer.emptyTitle")}
            </AppText>
            <AppText tone="muted">
              {t("order.customer.emptyMessage")}
            </AppText>
            <Button
              variant="secondary"
              onPress={() => router.push("/(tabs)/marketplace")}
            >
              {t("order.customer.browse")}
            </Button>
          </View>
        </Card>
      ) : (
        visibleOrders.length === 0 ? (
          <Card>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText tone="muted">{t("order.shopping.noMatches")}</AppText>
              <Button variant="secondary" onPress={() => { setSearch(""); setFilter("all"); }}>{t("order.shopping.clearFilters")}</Button>
            </View>
          </Card>
        ) : visibleOrders.map((order) => (
          <Card key={order.id}>
            <View style={{ gap: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  justifyContent: "space-between",
                  gap: theme.spacing.sm,
                  alignItems: "center"
                }}
              >
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <AppText variant="bodyStrong" style={{ fontSize: 15, lineHeight: 21 }} numberOfLines={2}>{order.storeName}</AppText>
                  <AppText variant="caption" tone="muted">
                    {order.orderNumber}
                  </AppText>
                </View>
                <Badge
                  label={t(orderStateKey(order.state))}
                  tone={statusTone(order.state)}
                />
              </View>

              <AppText variant="caption" tone="muted">
                {new Date(order.placedAt).toLocaleString(
                  locale === "fa-AF"
                    ? "fa-AF"
                    : locale === "ps-AF"
                      ? "ps-AF"
                      : "en"
                )}
              </AppText>

              <AppText variant="bodyStrong" tone="primary" style={{ fontSize: 17, lineHeight: 24 }}>
                {formatAfn(order.totals.total)}
              </AppText>

              <Button
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/orders/[orderId]",
                    params: { orderId: order.id }
                  })
                }
              >
                {t("order.customer.view")}
              </Button>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
