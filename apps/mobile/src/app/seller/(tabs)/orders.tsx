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
  listMerchantOrders,
  OrderApiError
} from "@/order/api";
import {
  orderErrorKey,
  orderStateKey
} from "@/order/messages";
import { useStores } from "@/store/provider";

export default function SellerOrdersScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status: authStatus, sessionToken } = useAuth();
  const { currentStore } = useStores();
  const { formatAfn, locale, t } = useLocalization();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    if (
      authStatus !== "signedIn" ||
      !sessionToken ||
      !currentStore
    ) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setErrorKey(null);
    try {
      const response = await listMerchantOrders(
        sessionToken,
        currentStore.id
      );
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
  }, [authStatus, currentStore?.id, sessionToken]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading && orders.length === 0) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("order.seller.loadingTitle")}
          message={t("order.seller.loadingMessage")}
        />
      </Screen>
    );
  }

  if (!currentStore) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("seller.dashboard.noStore")}
          message={t("seller.dashboard.noStoreMessage")}
        />
      </Screen>
    );
  }

  if (errorKey && orders.length === 0) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("order.seller.errorTitle")}
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
        <AppText variant="display">{t("order.seller.title")}</AppText>
        <AppText tone="muted">{t("order.seller.description")}</AppText>
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      {orders.length === 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">{t("order.seller.emptyTitle")}</AppText>
            <AppText tone="muted">{t("order.seller.emptyMessage")}</AppText>
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
                  <AppText variant="title">
                    {order.customerAddress?.recipientName ??
                      t("order.seller.customer")}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {order.orderNumber}
                  </AppText>
                </View>
                <Badge
                  label={t(orderStateKey(order.state))}
                  tone={
                    order.state === "delivered" ||
                    order.state === "picked_up"
                      ? "success"
                      : order.state === "cancelled" ||
                          order.state === "delivery_failed" ||
                          order.state === "payment_failed"
                        ? "danger"
                        : "warning"
                  }
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
                    pathname: "/seller/order/[orderId]",
                    params: { orderId: order.id }
                  })
                }
              >
                {t("order.seller.manage")}
              </Button>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
