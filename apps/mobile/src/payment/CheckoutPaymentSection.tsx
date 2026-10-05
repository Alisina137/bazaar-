import type {
  DeliveryCheckoutQuoteResponse,
  PaymentAttemptRecord,
  PaymentMethod,
  PaymentMethodAvailability,
  PaymentOptionsResponse
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  AppState,
  Linking,
  View
} from "react-native";

import {
  AppText,
  Badge,
  Button,
  Card,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

import {
  cancelPaymentAttempt,
  createPaymentAttempts,
  getPaymentOptions,
  getPaymentStatus,
  PaymentApiError
} from "./api";
import { paymentErrorKey } from "./messages";

function methodKey(method: PaymentMethod): TranslationKey {
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

function unavailableKey(
  reason: PaymentMethodAvailability["unavailableReason"]
): TranslationKey {
  switch (reason) {
    case "merchant_disabled":
      return "payment.unavailable.merchantDisabled";
    case "provider_unavailable":
      return "payment.unavailable.providerUnavailable";
    case "pickup_required":
      return "payment.unavailable.pickupRequired";
    case "delivery_required":
      return "payment.unavailable.deliveryRequired";
    case null:
    default:
      return "payment.error.methodUnavailable";
  }
}

function stateKey(state: PaymentAttemptRecord["state"]): TranslationKey {
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

function makeIdempotencyKey(sessionId: string): string {
  return (
    "pay-" +
    sessionId.replace(/-/g, "").slice(0, 20) +
    "-" +
    Date.now().toString(36)
  );
}

export function CheckoutPaymentSection({
  token,
  quote,
  onPaymentReady
}: {
  token: string;
  quote: DeliveryCheckoutQuoteResponse;
  onPaymentReady: (ready: boolean) => void;
}) {
  const theme = useAppTheme();
  const { formatAfn, t } = useLocalization();

  const [options, setOptions] = useState<PaymentOptionsResponse | null>(null);
  const [selected, setSelected] = useState<Record<string, PaymentMethod>>({});
  const [checkout, setCheckout] = useState<Awaited<
    ReturnType<typeof getPaymentStatus>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const idempotencyKeyRef = useRef(makeIdempotencyKey(quote.sessionId));

  const applyCheckout = (
    next: Awaited<ReturnType<typeof getPaymentStatus>>
  ) => {
    setCheckout(next);
    onPaymentReady(next.canProceedToReview);
  };

  const loadOptions = async () => {
    setLoading(true);
    setErrorKey(null);
    onPaymentReady(false);

    try {
      const next = await getPaymentOptions(token, quote.sessionId);
      setOptions(next);
      const defaults: Record<string, PaymentMethod> = {};
      for (const group of next.merchantGroups) {
        const available = group.methods.filter((method) => method.available);
        if (available.length === 1 && available[0]) {
          defaults[group.storeId] = available[0].method;
        }
      }
      setSelected(defaults);

      try {
        const status = await getPaymentStatus(token, quote.sessionId);
        if (status.attempts.length > 0) {
          applyCheckout(status);
          const existing: Record<string, PaymentMethod> = {};
          for (const attempt of status.attempts) {
            existing[attempt.storeId] = attempt.method;
          }
          setSelected((current) => ({ ...current, ...existing }));
        }
      } catch {
        // A quote with no attempts yet is a normal initial state.
      }
    } catch (error) {
      const safe =
        error instanceof PaymentApiError
          ? error
          : new PaymentApiError("service_unavailable");
      setErrorKey(paymentErrorKey(safe.code));
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setBusy("refresh");
    setErrorKey(null);
    try {
      applyCheckout(await getPaymentStatus(token, quote.sessionId));
    } catch (error) {
      const safe =
        error instanceof PaymentApiError
          ? error
          : new PaymentApiError("service_unavailable");
      setErrorKey(paymentErrorKey(safe.code));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    setOptions(null);
    setCheckout(null);
    setSelected({});
    idempotencyKeyRef.current = makeIdempotencyKey(quote.sessionId);
    void loadOptions();
  }, [quote.sessionId, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        checkout?.requiresCustomerAction
      ) {
        void refreshStatus();
      }
    });

    return () => subscription.remove();
  }, [checkout?.requiresCustomerAction, quote.sessionId, token]);

  const allSelected = useMemo(
    () =>
      Boolean(options?.canContinue) &&
      (options?.merchantGroups.every((group) => {
        const method = selected[group.storeId];
        return group.methods.some(
          (candidate) =>
            candidate.method === method && candidate.available
        );
      }) ?? false),
    [options, selected]
  );

  const confirm = async () => {
    if (!options || !allSelected) {
      setErrorKey("payment.error.methodUnavailable");
      return;
    }

    setBusy("confirm");
    setErrorKey(null);
    try {
      const next = await createPaymentAttempts(token, {
        checkoutSessionId: quote.sessionId,
        idempotencyKey: idempotencyKeyRef.current,
        selections: options.merchantGroups.map((group) => ({
          storeId: group.storeId,
          method: selected[group.storeId]!
        }))
      });
      applyCheckout(next);
    } catch (error) {
      const safe =
        error instanceof PaymentApiError
          ? error
          : new PaymentApiError("service_unavailable");
      setErrorKey(paymentErrorKey(safe.code));
      idempotencyKeyRef.current = makeIdempotencyKey(quote.sessionId);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (attemptId: string) => {
    setBusy("cancel:" + attemptId);
    setErrorKey(null);
    try {
      await cancelPaymentAttempt(token, attemptId);
      idempotencyKeyRef.current = makeIdempotencyKey(quote.sessionId);
      applyCheckout(await getPaymentStatus(token, quote.sessionId));
    } catch (error) {
      const safe =
        error instanceof PaymentApiError
          ? error
          : new PaymentApiError("service_unavailable");
      setErrorKey(paymentErrorKey(safe.code));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !options) {
    return (
      <Card>
        <StateView
          kind="loading"
          title={t("payment.customer.loadingTitle")}
          message={t("payment.customer.loadingMessage")}
        />
      </Card>
    );
  }

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Badge label={t("payment.phaseBadge")} tone="primary" />
            <AppText variant="title">
              {t("checkout.step.payment")}
            </AppText>
            <AppText tone="muted">
              {t("payment.customer.description")}
            </AppText>
          </View>

          {errorKey ? (
            <AppText tone="danger">{t(errorKey)}</AppText>
          ) : null}

          {options?.merchantGroups.map((group) => (
            <View
              key={group.storeId}
              style={{ gap: theme.spacing.sm }}
            >
              <AppText variant="heading">{group.storeName}</AppText>
              <AppText tone="muted">
                {formatAfn(group.amount)} ·{" "}
                {t(
                  group.fulfillmentType === "pickup"
                    ? "delivery.customer.fulfillment.pickup"
                    : group.fulfillmentType === "digital"
                      ? "delivery.customer.fulfillment.digital"
                      : "delivery.customer.fulfillment.delivery"
                )}
              </AppText>

              {group.methods.map((method) => (
                <View
                  key={method.method}
                  style={{ gap: theme.spacing.xs }}
                >
                  <Button
                    variant={
                      selected[group.storeId] === method.method
                        ? "primary"
                        : "secondary"
                    }
                    disabled={!method.available || busy !== null}
                    onPress={() => {
                      setSelected((current) => ({
                        ...current,
                        [group.storeId]: method.method
                      }));
                      setCheckout(null);
                      onPaymentReady(false);
                      idempotencyKeyRef.current =
                        makeIdempotencyKey(quote.sessionId);
                    }}
                  >
                    {t(methodKey(method.method))}
                  </Button>
                  {!method.available ? (
                    <AppText variant="caption" tone="muted">
                      {t(unavailableKey(method.unavailableReason))}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          ))}

          <Button
            fullWidth
            loading={busy === "confirm"}
            disabled={!allSelected || busy !== null}
            onPress={() => {
              void confirm();
            }}
          >
            {t("payment.customer.confirm")}
          </Button>
        </View>
      </Card>

      {checkout ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">
              {t("payment.customer.statusTitle")}
            </AppText>

            {checkout.attempts.map((attempt) => (
              <View
                key={attempt.id}
                style={{ gap: theme.spacing.sm }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: theme.spacing.sm
                  }}
                >
                  <AppText variant="bodyStrong">
                    {t(methodKey(attempt.method))}
                  </AppText>
                  <Badge
                    label={t(stateKey(attempt.state))}
                    tone={
                      attempt.state === "paid"
                        ? "success"
                        : attempt.state === "failed" ||
                            attempt.state === "cancelled" ||
                            attempt.state === "expired"
                          ? "danger"
                          : "warning"
                    }
                  />
                </View>
                <AppText tone="muted">
                  {formatAfn(attempt.amount)}
                </AppText>

                {attempt.hostedCheckoutUrl &&
                attempt.state === "pending" ? (
                  <Button
                    variant="primary"
                    onPress={() => {
                      void Linking.openURL(attempt.hostedCheckoutUrl!);
                    }}
                  >
                    {t("payment.customer.openHostedCheckout")}
                  </Button>
                ) : null}

                {attempt.provider !== "manual" &&
                attempt.state === "pending" ? (
                  <Button
                    variant="ghost"
                    loading={busy === "cancel:" + attempt.id}
                    disabled={busy !== null}
                    onPress={() => {
                      void cancel(attempt.id);
                    }}
                  >
                    {t("payment.customer.cancelAttempt")}
                  </Button>
                ) : null}

                {attempt.failureReason ? (
                  <AppText variant="caption" tone="danger">
                    {attempt.failureReason}
                  </AppText>
                ) : null}
              </View>
            ))}

            {checkout.requiresCustomerAction ? (
              <AppText tone="muted">
                {t("payment.customer.webhookPending")}
              </AppText>
            ) : null}

            <Button
              variant="secondary"
              loading={busy === "refresh"}
              disabled={busy !== null}
              onPress={() => {
                void refreshStatus();
              }}
            >
              {t("payment.customer.refreshStatus")}
            </Button>

            {checkout.canProceedToReview ? (
              <Badge
                label={t("payment.customer.readyForReview")}
                tone="success"
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      <Card muted>
        <AppText variant="caption" tone="muted">
          {t("payment.customer.securityHint")}
        </AppText>
      </Card>
    </View>
  );
}
