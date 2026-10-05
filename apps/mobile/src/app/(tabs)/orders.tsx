import type { OrderRecord } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

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
  const { formatAfn, locale, t } = useLocalization();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    if (status !== "signedIn" || !sessionToken) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setErrorKey(null);
    try {
      const response = await listCustomerOrders(sessionToken);
      setOrders(response.orders);
    } catch (error) {
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setErrorKey(orderErrorKey(safe.code));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
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

  if (loading && orders.length === 0) {
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

  if (errorKey && orders.length === 0) {
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
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("order.phaseBadge")} tone="primary" />
        <AppText variant="display">{t("order.customer.title")}</AppText>
        <AppText tone="muted">
          {t("order.customer.description")}
        </AppText>
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      {orders.length === 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">
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
        orders.map((order) => (
          <Card key={order.id}>
            <View style={{ gap: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: theme.spacing.sm,
                  alignItems: "center"
                }}
              >
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <AppText variant="title">{order.storeName}</AppText>
                  <AppText variant="caption" tone="muted">
                    {order.orderNumber}
                  </AppText>
                </View>
                <Badge
                  label={t(orderStateKey(order.state))}
                  tone={statusTone(order.state)}
                />
              </View>

              <AppText tone="muted">
                {new Date(order.placedAt).toLocaleString(
                  locale === "fa-AF"
                    ? "fa-AF"
                    : locale === "ps-AF"
                      ? "ps-AF"
                      : "en"
                )}
              </AppText>

              <AppText variant="heading">
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
