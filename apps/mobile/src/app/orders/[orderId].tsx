import type {
  OrderRecord,
  PaymentMethod,
  ReviewEligibilityRecord
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  cancelCustomerOrder,
  getCustomerOrder,
  OrderApiError
} from "@/order/api";
import {
  orderErrorKey,
  orderStateKey
} from "@/order/messages";
import { reviewEligibility } from "@/trust/api";

function paymentMethodKey(method: PaymentMethod): TranslationKey {
  switch (method) {
    case "cash_on_delivery":
      return "payment.method.cod";
    case "hesabpay":
      return "payment.method.hesabpay";
    case "card":
      return "payment.method.card";
    case "pay_at_store":
      return "payment.method.payAtStore";
  }
}

export default function CustomerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { status, sessionToken } = useAuth();
  const { formatAfn, locale, t } = useLocalization();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewEligibilityRecord[]>([]);

  const load = async () => {
    if (
      status !== "signedIn" ||
      !sessionToken ||
      !orderId
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorKey(null);
    try {
      const [nextOrder, eligibility] = await Promise.all([
        getCustomerOrder(sessionToken, orderId),
        reviewEligibility(sessionToken, orderId).catch(() => ({ items: [] }))
      ]);
      setOrder(nextOrder);
      setReviewItems(eligibility.items);
    } catch (error) {
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setErrorKey(orderErrorKey(safe.code));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orderId, sessionToken, status]);

  const cancel = async () => {
    if (!sessionToken || !orderId || !reason.trim()) {
      setErrorKey("order.error.invalidRequest");
      return;
    }

    setBusy(true);
    setErrorKey(null);
    try {
      setOrder(
        await cancelCustomerOrder(sessionToken, orderId, {
          reason: reason.trim()
        })
      );
      setReason("");
    } catch (error) {
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setErrorKey(orderErrorKey(safe.code));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !order) {
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

  if (!order) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("order.customer.errorTitle")}
          message={t(errorKey ?? "order.error.notFound")}
          actionLabel={t("marketplace.back")}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const address = order.customerAddress;
  const expected =
    order.fulfillment.expectedMinAt && order.fulfillment.expectedMaxAt
      ? new Date(order.fulfillment.expectedMinAt).toLocaleString(
          locale === "fa-AF"
            ? "fa-AF"
            : locale === "ps-AF"
              ? "ps-AF"
              : "en"
        ) +
        " – " +
        new Date(order.fulfillment.expectedMaxAt).toLocaleString(
          locale === "fa-AF"
            ? "fa-AF"
            : locale === "ps-AF"
              ? "ps-AF"
              : "en"
        )
      : null;

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>

      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("order.phaseBadge")} tone="primary" />
        <AppText variant="display">{t("order.customer.detailTitle")}</AppText>
        <AppText tone="muted">{order.orderNumber}</AppText>
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
              alignItems: "center"
            }}
          >
            <AppText variant="title">{order.storeName}</AppText>
            <Badge
              label={t(orderStateKey(order.state))}
              tone={
                order.state === "delivered" || order.state === "picked_up"
                  ? "success"
                  : order.state === "cancelled" ||
                      order.state === "payment_failed" ||
                      order.state === "delivery_failed" ||
                      order.state === "refunded"
                    ? "danger"
                    : "warning"
              }
            />
          </View>

          <AppText tone="muted">
            {t("order.customer.placedAt")}:{" "}
            {new Date(order.placedAt).toLocaleString(
              locale === "fa-AF"
                ? "fa-AF"
                : locale === "ps-AF"
                  ? "ps-AF"
                  : "en"
            )}
          </AppText>
          {expected ? (
            <AppText tone="muted">
              {t("order.customer.expected")}: {expected}
            </AppText>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.customer.tracking")}</AppText>
          {order.timeline.map((event, index) => (
            <View
              key={event.id}
              style={{
                flexDirection: "row",
                gap: theme.spacing.md,
                alignItems: "flex-start"
              }}
            >
              <Badge
                label={index + 1 + ""}
                tone={
                  index === order.timeline.length - 1
                    ? "primary"
                    : "neutral"
                }
              />
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <AppText variant="bodyStrong">
                  {t(orderStateKey(event.toState))}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {new Date(event.createdAt).toLocaleString(
                    locale === "fa-AF"
                      ? "fa-AF"
                      : locale === "ps-AF"
                        ? "ps-AF"
                        : "en"
                  )}
                </AppText>
                {event.reason ? (
                  <AppText variant="caption" tone="muted">
                    {event.reason}
                  </AppText>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.customer.items")}</AppText>
          {order.items.map((item) => (
            <View key={item.id} style={{ gap: theme.spacing.xs }}>
              <AppText variant="bodyStrong">
                {item.productName}
                {item.variantTitle ? " · " + item.variantTitle : ""}
              </AppText>
              <AppText tone="muted">
                {item.quantity} × {formatAfn(item.unitPrice)}
              </AppText>
              <AppText>{formatAfn(item.lineTotal)}</AppText>
            </View>
          ))}
        </View>
      </Card>

      {reviewItems.some((item) => item.eligible) ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">{t("review.summary")}</AppText>
            {reviewItems
              .filter((item) => item.eligible)
              .map((item) => (
                <View key={item.orderItemId} style={{ gap: theme.spacing.sm }}>
                  <AppText variant="bodyStrong">{item.productName}</AppText>
                  <Badge
                    label={t("trust.verifiedPurchase")}
                    tone="success"
                  />
                  <Button
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/reviews/[orderItemId]",
                        params: { orderItemId: item.orderItemId }
                      })
                    }
                  >
                    {t(
                      item.alreadyReviewed
                        ? "review.edit"
                        : "review.write"
                    )}
                  </Button>
                </View>
              ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.customer.fulfillment")}</AppText>
          <AppText>
            {t(
              order.fulfillmentType === "pickup"
                ? "delivery.customer.fulfillment.pickup"
                : order.fulfillmentType === "digital"
                  ? "delivery.customer.fulfillment.digital"
                  : "delivery.customer.fulfillment.delivery"
            )}:{" "}
            {order.fulfillment.label}
          </AppText>

          {address ? (
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="bodyStrong">
                {t("order.customer.deliveryAddress")}
              </AppText>
              <AppText tone="muted">
                {[
                  address.recipientName,
                  address.province,
                  address.districtCity,
                  address.areaNeighborhood,
                  address.addressDescription
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
              <AppText tone="muted">{address.phone}</AppText>
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.customer.payment")}</AppText>
          <AppText>
            {t(paymentMethodKey(order.payment.method))}
          </AppText>
          <AppText tone="muted">
            {t("order.customer.paymentState")}: {order.payment.state}
          </AppText>
          <AppText variant="heading">
            {formatAfn(order.totals.total)}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.customer.support")}</AppText>
          <AppText>{order.storeName}</AppText>
          <AppText tone="muted">{order.storePhone}</AppText>
        </View>
      </Card>

      {order.state === "pending_confirmation" ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">
              {t("order.customer.cancelTitle")}
            </AppText>
            <AppText tone="muted">
              {t("order.customer.cancelHint")}
            </AppText>
            <TextField
              label={t("order.customer.cancelReason")}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Button
              variant="danger"
              loading={busy}
              disabled={busy || !reason.trim()}
              onPress={() => {
                void cancel();
              }}
            >
              {t("order.customer.cancel")}
            </Button>
          </View>
        </Card>
      ) : null}

      {order.cancellationReason ? (
        <Card muted>
          <AppText tone="muted">
            {t("order.customer.cancellationReason")}:{" "}
            {order.cancellationReason}
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
