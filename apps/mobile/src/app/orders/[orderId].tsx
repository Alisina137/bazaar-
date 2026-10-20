import type {
  OrderRecord,
  PaymentMethod,
  ReviewEligibilityRecord,
  SupportTicketRecord
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Linking, View } from "react-native";

import { useAuth } from "@/auth/provider";
import { createSupportTicket, supportTickets, CommunicationApiError } from "@/communication/api";
import { communicationErrorKey, supportStatusKey } from "@/communication/messages";
import { addCartItem } from "@/cart-pricing/api";
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
import { canOpenReturnReview, openReturnCase, relatedReturnCases, RETURN_REVIEW_PREFIX } from "@/order/return-policy";

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
  const { isRTL, formatAfn, locale, t } = useLocalization();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const actionInFlight = useRef(false);
  const loadEpoch = useRef(0);
  const loadedOrderIdentity = useRef<string | null>(null);
  const [reason, setReason] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewEligibilityRecord[]>([]);
  const [supportReason, setSupportReason] = useState("");
  const [returnCases, setReturnCases] = useState<SupportTicketRecord[]>([]);
  const [caseHistoryError, setCaseHistoryError] = useState(false);

  const load = useCallback(async () => {
    if (actionInFlight.current) return;
    const requestId = ++loadEpoch.current;
    if (
      status !== "signedIn" ||
      !sessionToken ||
      !orderId
    ) {
      loadedOrderIdentity.current = null;
      setOrder(null);
      setReturnCases([]);
      setReviewItems([]);
      setLoading(false);
      return;
    }

    const identity = sessionToken + ":" + orderId;
    if (loadedOrderIdentity.current !== identity) {
      setOrder(null);
      setReturnCases([]);
      setReviewItems([]);
      loadedOrderIdentity.current = identity;
    }
    setLoading(true);
    setErrorKey(null);
    try {
      const [nextOrder, eligibility, caseHistory] = await Promise.all([
        getCustomerOrder(sessionToken, orderId),
        reviewEligibility(sessionToken, orderId).catch(() => ({ items: [] })),
        supportTickets(sessionToken).catch(() => null)
      ]);
      if (requestId !== loadEpoch.current) return;
      setOrder(nextOrder);
      setReviewItems(eligibility.items);
      setCaseHistoryError(caseHistory === null);
      setReturnCases(caseHistory ? relatedReturnCases(caseHistory.tickets, nextOrder.id) : []);
    } catch (error) {
      if (requestId !== loadEpoch.current) return;
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setErrorKey(orderErrorKey(safe.code));
    } finally {
      if (requestId === loadEpoch.current) setLoading(false);
    }
  }, [orderId, sessionToken, status]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { loadEpoch.current += 1; };
  }, [load]));

  const cancel = async () => {
    if (actionInFlight.current || !sessionToken || !orderId || !reason.trim() || order?.state !== "pending_confirmation") {
      setErrorKey("order.error.invalidRequest");
      return;
    }

    actionInFlight.current = true;
    setBusy(true);
    setErrorKey(null);
    try {
      setOrder(
        await cancelCustomerOrder(sessionToken, orderId, {
          reason: reason.trim()
        })
      );
      setReason("");
      Alert.alert(t("order.customer.cancelTitle"), t("order.shopping.cancelled"));
    } catch (error) {
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setErrorKey(orderErrorKey(safe.code));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  const requestReview = async () => {
    if (actionInFlight.current || !sessionToken || !order || !canOpenReturnReview(order.state) ||
        caseHistoryError || openReturnCase(returnCases, order.id) || supportReason.trim().length < 5) return;
    actionInFlight.current = true;
    setBusy(true);
    setErrorKey(null);
    try {
      const ticket = await createSupportTicket(sessionToken, {
        category: "order",
        orderId: order.id,
        subject: RETURN_REVIEW_PREFIX + order.orderNumber,
        message: "Order: " + order.orderNumber + "\nRequest: " + supportReason.trim()
      });
      setSupportReason("");
      setReturnCases(previous => [ticket, ...previous]);
      router.push({ pathname: "/support/[ticketId]", params: { ticketId: ticket.id } });
    } catch (cause) {
      Alert.alert(t("order.shopping.returnTitle"), t(communicationErrorKey(
        cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
      )));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  const reorder = async () => {
    if (actionInFlight.current || !sessionToken || !order || !order.items.length) return;
    actionInFlight.current = true;
    setBusy(true);
    setErrorKey(null);
    let added = 0;
    let changed = false;
    const failed: string[] = [];
    try {
      // The existing cart API rechecks live stock, product visibility and prices.
      // A partial success is explicitly reported: it is never presented as an order.
      for (const item of order.items) {
        try {
          const cart = await addCartItem(sessionToken, {
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
          });
          added += 1;
          const current = cart.groups.flatMap(group => group.items)
            .find(candidate => candidate.productId === item.productId && candidate.variantId === item.variantId);
          if (current && Math.abs(current.unitPrice - item.unitPrice) >= 0.005) changed = true;
        } catch {
          failed.push(item.productName);
        }
      }
      if (added === 0) {
        Alert.alert(t("order.shopping.reorderTitle"), t("order.shopping.reorderFailed") + "\n" + failed.join(", "));
      } else {
        const message = (failed.length ? t("order.shopping.reorderPartial") + "\n" + failed.join(", ") : t("order.shopping.reorderSuccess"))
          + (changed ? "\n" + t("order.shopping.priceChanged") : "");
        Alert.alert(t("order.shopping.reorderTitle"), message, [
          { text: t("order.shopping.reviewCart"), onPress: () => router.push({ pathname: "/(tabs)/shopping", params: { section: "cart" } }) }
        ]);
      }
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  if (loading && !order) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          loadingVariant="orders"
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
          actionLabel={t("cart.retry")}
          onAction={() => { void load(); }}
        />
        <Button variant="ghost" onPress={() => router.back()}>{t("marketplace.back")}</Button>
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
    <Screen refreshing={loading} onRefresh={() => { void load(); }}>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>

      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t(orderStateKey(order.state))} tone={order.state === "delivered" || order.state === "picked_up" ? "success" : "primary"} />
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
              flexDirection: isRTL ? "row-reverse" : "row",
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
          {[...order.timeline].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).map((event, index) => (
            <View
              key={event.id}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
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
              <AppText variant="bodyStrong">{formatAfn(item.lineTotal)}</AppText>
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
          <View style={{ gap: theme.spacing.sm }}>
            {([
              [t("cart.itemsSubtotal"), order.totals.itemsSubtotal],
              [t("cart.productDiscount"), -order.totals.productDiscount],
              [t("cart.couponDiscount"), -order.totals.couponDiscount],
              [t("order.shopping.deliveryCost"), order.totals.deliveryTotal]
            ] as const).filter(([, amount]) => amount !== 0).map(([label, amount]) => (
              <View key={label} style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", gap: theme.spacing.sm }}>
                <AppText tone="muted">{label}</AppText>
                <AppText>{amount < 0 ? "-" : ""}{formatAfn(Math.abs(amount))}</AppText>
              </View>
            ))}
          </View>
          <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText variant="bodyStrong">{t("order.shopping.total")}</AppText>
              <AppText variant="heading">{formatAfn(order.totals.total)}</AppText>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.customer.support")}</AppText>
          <AppText>{order.storeName}</AppText>
          <AppText tone="muted">{order.storePhone}</AppText>
          {order.storePhone ? (
            <Button variant="secondary" onPress={() => {
              const phone = order.storePhone.replace(/[^\d+]/g, "");
              if (!phone) return;
              void Linking.openURL("tel:" + phone).catch(() => {
                Alert.alert(t("order.customer.support"), order.storePhone);
              });
            }}>
              {locale === "fa-AF" ? "تماس با فروشگاه" : locale === "ps-AF" ? "پلورنځي ته زنګ ووهئ" : "Call store"}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/support",
                params: { orderId: order.id }
              })
            }
          >
            {t("account.support")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("order.shopping.reorderTitle")}</AppText>
          <AppText tone="muted">{t("order.shopping.reorderHint")}</AppText>
          <Button variant="secondary" disabled={busy || !order.items.length} loading={busy}
            onPress={() => Alert.alert(t("order.shopping.reorderTitle"), t("order.shopping.reorderConfirm"), [
              { text: t("support.hub.cancel"), style: "cancel" },
              { text: t("order.shopping.reorder"), onPress: () => { void reorder(); } }
            ])}>
            {t("order.shopping.reorder")}
          </Button>
        </View>
      </Card>

      {(canOpenReturnReview(order.state) || returnCases.length > 0 || order.state === "refund_pending" || order.state === "refunded") ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">{t("order.shopping.returnTitle")}</AppText>
            <AppText tone="muted">{t("order.shopping.returnHint")}</AppText>
            {order.state === "refund_pending" || order.state === "refunded" ? (
              <Badge label={t(orderStateKey(order.state))} tone="warning" />
            ) : null}
            {returnCases.map(ticket => (
              <View key={ticket.id} style={{ gap: theme.spacing.xs }}>
                <Badge label={t(supportStatusKey(ticket.status))} tone={ticket.status === "closed" ? "neutral" : "primary"} />
                <AppText variant="caption" tone="muted">{new Date(ticket.updatedAt).toLocaleDateString(locale)}</AppText>
                <Button variant="secondary" onPress={() => router.push({
                  pathname: "/support/[ticketId]", params: { ticketId: ticket.id }
                })}>{t("order.shopping.viewCase")}</Button>
              </View>
            ))}
            {caseHistoryError ? (
              <AppText tone="muted">{t("order.shopping.caseHistoryError")}</AppText>
            ) : null}
            {canOpenReturnReview(order.state) && !caseHistoryError && !openReturnCase(returnCases, order.id) ? (
              <View style={{ gap: theme.spacing.md }}>
                <TextField label={t("order.shopping.returnReason")}
                  value={supportReason} onChangeText={setSupportReason}
                  maxLength={1000} multiline />
                <Button disabled={busy || supportReason.trim().length < 5} loading={busy}
                  onPress={() => Alert.alert(t("order.shopping.returnConfirmTitle"), t("order.shopping.returnHint"), [
                    { text: t("support.hub.cancel"), style: "cancel" },
                    { text: t("order.shopping.returnSubmit"), onPress: () => { void requestReview(); } }
                  ])}>
                  {t("order.shopping.returnSubmit")}
                </Button>
              </View>
            ) : null}
            {openReturnCase(returnCases, order.id) ? (
              <AppText tone="muted">{t("order.shopping.caseAlreadyOpen")}</AppText>
            ) : null}
          </View>
        </Card>
      ) : null}

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
              onPress={() => Alert.alert(t("order.shopping.cancelConfirmTitle"), t("order.shopping.cancelConfirmMessage"), [
                { text: t("support.hub.cancel"), style: "cancel" },
                { text: t("order.customer.cancel"), style: "destructive", onPress: () => { void cancel(); } }
              ])}
            >
              {t("order.customer.cancel")}
            </Button>
          </View>
        </Card>
      ) : null}

      {order.state === "refund_pending" || order.state === "refunded" ? (
        <Card muted><AppText tone="muted">{t("order.shopping.refundStatusHint")}</AppText></Card>
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
