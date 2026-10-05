import type {
  MerchantOrderAction,
  OrderRecord,
  PaymentMethod,
  PaymentState
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
  getMerchantOrder,
  merchantOrderAction,
  OrderApiError
} from "@/order/api";
import {
  orderErrorKey,
  orderStateKey
} from "@/order/messages";
import { useStores } from "@/store/provider";

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

function paymentStateKey(state: PaymentState): TranslationKey {
  switch (state) {
    case "created":
      return "payment.state.created";
    case "pending":
      return "payment.state.pending";
    case "paid":
      return "payment.state.paid";
    case "failed":
      return "payment.state.failed";
    case "cancelled":
      return "payment.state.cancelled";
    case "expired":
      return "payment.state.expired";
    case "refund_pending":
      return "payment.state.refundPending";
    case "partially_refunded":
      return "payment.state.partiallyRefunded";
    case "refunded":
      return "payment.state.refunded";
  }
}

export default function SellerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { status: authStatus, sessionToken } = useAuth();
  const { currentStore } = useStores();
  const { formatAfn, locale, t } = useLocalization();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<MerchantOrderAction | null>(null);
  const [reason, setReason] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const load = async () => {
    if (
      authStatus !== "signedIn" ||
      !sessionToken ||
      !currentStore ||
      !orderId
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorKey(null);
    try {
      setOrder(
        await getMerchantOrder(
          sessionToken,
          currentStore.id,
          orderId
        )
      );
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
  }, [authStatus, currentStore?.id, orderId, sessionToken]);

  const runAction = async (action: MerchantOrderAction) => {
    if (!sessionToken || !currentStore || !orderId) return;

    if (
      (action === "reject" || action === "cancel") &&
      !reason.trim()
    ) {
      setErrorKey("order.error.invalidRequest");
      return;
    }

    setBusy(action);
    setErrorKey(null);
    try {
      setOrder(
        await merchantOrderAction(
          sessionToken,
          currentStore.id,
          orderId,
          {
            action,
            reason: reason.trim() || null
          }
        )
      );
      setReason("");
    } catch (error) {
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setErrorKey(orderErrorKey(safe.code));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !order) {
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

  if (!order) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("order.seller.errorTitle")}
          message={t(errorKey ?? "order.error.notFound")}
          actionLabel={t("marketplace.back")}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const address = order.customerAddress;

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>

      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("order.phaseBadge")} tone="primary" />
        <AppText variant="display">{t("order.seller.detailTitle")}</AppText>
        <AppText tone="muted">{order.orderNumber}</AppText>
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Badge
            label={t(orderStateKey(order.state))}
            tone={
              order.state === "delivered" || order.state === "picked_up"
                ? "success"
                : order.state === "cancelled" ||
                    order.state === "delivery_failed" ||
                    order.state === "payment_failed"
                  ? "danger"
                  : "warning"
            }
          />
          <AppText variant="title">{t("order.seller.customer")}</AppText>
          <AppText>
            {address?.recipientName ?? t("order.seller.digitalCustomer")}
          </AppText>
          {address ? (
            <>
              <AppText tone="muted">{address.phone}</AppText>
              <AppText tone="muted">
                {[
                  address.province,
                  address.districtCity,
                  address.areaNeighborhood,
                  address.addressDescription
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
              {address.deliveryInstructions ? (
                <AppText tone="muted">
                  {t("order.seller.notes")}:{" "}
                  {address.deliveryInstructions}
                </AppText>
              ) : null}
            </>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.seller.items")}</AppText>
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

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.seller.fulfillment")}</AppText>
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
          {order.fulfillment.expectedMinAt &&
          order.fulfillment.expectedMaxAt ? (
            <AppText tone="muted">
              {t("order.customer.expected")}:{" "}
              {new Date(order.fulfillment.expectedMinAt).toLocaleString(
                locale === "fa-AF"
                  ? "fa-AF"
                  : locale === "ps-AF"
                    ? "ps-AF"
                    : "en"
              )}
              {" – "}
              {new Date(order.fulfillment.expectedMaxAt).toLocaleString(
                locale === "fa-AF"
                  ? "fa-AF"
                  : locale === "ps-AF"
                    ? "ps-AF"
                    : "en"
              )}
            </AppText>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.seller.payment")}</AppText>
          <AppText>{t(paymentMethodKey(order.payment.method))}</AppText>
          <Badge
            label={t(paymentStateKey(order.payment.state))}
            tone={
              order.payment.state === "paid"
                ? "success"
                : order.payment.state === "failed" ||
                    order.payment.state === "cancelled" ||
                    order.payment.state === "expired"
                  ? "danger"
                  : "warning"
            }
          />
          <AppText variant="heading">
            {formatAfn(order.totals.total)}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.seller.timeline")}</AppText>
          {order.timeline.map((event) => (
            <View key={event.id} style={{ gap: theme.spacing.xs }}>
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
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.seller.actions")}</AppText>
          <TextField
            label={t("order.seller.reason")}
            value={reason}
            onChangeText={setReason}
            multiline
          />

          {order.state === "pending_confirmation" ? (
            <>
              <ActionButton
                action="confirm"
                label={t("order.action.confirm")}
                busy={busy}
                onRun={runAction}
              />
              <ActionButton
                action="reject"
                label={t("order.action.reject")}
                busy={busy}
                onRun={runAction}
                danger
              />
            </>
          ) : null}

          {order.state === "confirmed" ? (
            <ActionButton
              action="start_preparing"
              label={t("order.action.startPreparing")}
              busy={busy}
              onRun={runAction}
            />
          ) : null}

          {order.state === "preparing" ? (
            <ActionButton
              action="mark_ready"
              label={
                order.fulfillmentType === "pickup"
                  ? t("order.action.readyForPickup")
                  : t("order.action.markReady")
              }
              busy={busy}
              onRun={runAction}
            />
          ) : null}

          {order.state === "ready" &&
          order.fulfillmentType === "delivery" ? (
            <ActionButton
              action="dispatch"
              label={t("order.action.dispatch")}
              busy={busy}
              onRun={runAction}
            />
          ) : null}

          {order.state === "ready" &&
          order.fulfillmentType === "digital" ? (
            <ActionButton
              action="deliver"
              label={t("order.action.deliver")}
              busy={busy}
              onRun={runAction}
            />
          ) : null}

          {order.state === "out_for_delivery" ? (
            <>
              <ActionButton
                action="deliver"
                label={t("order.action.deliver")}
                busy={busy}
                onRun={runAction}
              />
              <ActionButton
                action="mark_delivery_failed"
                label={t("order.action.deliveryFailed")}
                busy={busy}
                onRun={runAction}
                danger
              />
            </>
          ) : null}

          {order.state === "ready_for_pickup" ? (
            <ActionButton
              action="mark_picked_up"
              label={t("order.action.pickedUp")}
              busy={busy}
              onRun={runAction}
            />
          ) : null}

          {[
            "confirmed",
            "preparing",
            "ready",
            "ready_for_pickup",
            "delivery_failed"
          ].includes(order.state) ? (
            <ActionButton
              action="cancel"
              label={t("order.action.cancel")}
              busy={busy}
              onRun={runAction}
              danger
            />
          ) : null}

          {order.state === "delivered" ||
          order.state === "picked_up" ? (
            <ActionButton
              action="request_refund"
              label={t("order.action.requestRefund")}
              busy={busy}
              onRun={runAction}
              danger
            />
          ) : null}

          {busy === null &&
          ![
            "pending_confirmation",
            "confirmed",
            "preparing",
            "ready",
            "ready_for_pickup",
            "out_for_delivery",
            "delivery_failed",
            "delivered",
            "picked_up"
          ].includes(order.state) ? (
            <AppText tone="muted">
              {t("order.seller.noActions")}
            </AppText>
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}

function ActionButton({
  action,
  label,
  busy,
  onRun,
  danger = false
}: {
  action: MerchantOrderAction;
  label: string;
  busy: MerchantOrderAction | null;
  onRun: (action: MerchantOrderAction) => Promise<void>;
  danger?: boolean;
}) {
  return (
    <Button
      variant={danger ? "danger" : "primary"}
      loading={busy === action}
      disabled={busy !== null}
      onPress={() => {
        void onRun(action);
      }}
    >
      {label}
    </Button>
  );
}
