import type {
  CartResponse,
  CustomerAddressRecord,
  DeliveryCheckoutQuoteResponse,
  DeliveryMerchantQuote,
  DeliveryOptionQuote,
  DeliveryOptionsResponse
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import {
  useFocusEffect,
  useRouter
} from "expo-router";
import {
  useCallback,
  useMemo,
  useState
} from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  CartPricingApiError,
  getCart,
  listCustomerAddresses
} from "@/cart-pricing/api";
import { cartPricingErrorKey } from "@/cart-pricing/messages";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import {
  createDeliveryCheckoutQuote,
  DeliveryApiError,
  getDeliveryOptions
} from "@/delivery/api";
import { deliveryErrorKey } from "@/delivery/messages";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { CheckoutPaymentSection } from "@/payment/CheckoutPaymentSection";

function unavailableKey(
  reason: DeliveryMerchantQuote["unavailableReason"]
): TranslationKey {
  switch (reason) {
    case "delivery_disabled":
      return "delivery.customer.unavailable.deliveryDisabled";
    case "outside_coverage":
      return "delivery.customer.unavailable.outsideCoverage";
    case "minimum_order":
      return "delivery.customer.unavailable.minimumOrder";
    case "operating_day":
      return "delivery.customer.unavailable.operatingDay";
    case "cutoff_missed":
      return "delivery.customer.unavailable.cutoffMissed";
    case "product_restriction":
      return "delivery.customer.unavailable.productRestriction";
    case "address_location_required":
      return "delivery.customer.unavailable.locationRequired";
    case null:
    default:
      return "delivery.error.unavailable";
  }
}

function fulfillmentKey(
  option: DeliveryOptionQuote
): TranslationKey {
  switch (option.fulfillmentType) {
    case "pickup":
      return "delivery.customer.fulfillment.pickup";
    case "digital":
      return "delivery.customer.fulfillment.digital";
    case "delivery":
    default:
      return "delivery.customer.fulfillment.delivery";
  }
}

function ruleKey(option: DeliveryOptionQuote): TranslationKey {
  switch (option.ruleUsed.type) {
    case "zone":
      return "delivery.rule.zone";
    case "distance_tier":
      return "delivery.rule.distanceTier";
    case "base_per_km":
      return "delivery.rule.basePerKm";
    case "store_default":
      return "delivery.rule.storeDefault";
    case "pickup":
      return "delivery.rule.pickup";
    case "digital":
      return "delivery.rule.digital";
    case "free_delivery":
      return "delivery.rule.freeDelivery";
  }
}

export default function CheckoutScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status, sessionToken } = useAuth();
  const { formatAfn, t } = useLocalization();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddressRecord[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [delivery, setDelivery] = useState<DeliveryOptionsResponse | null>(
    null
  );
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [quote, setQuote] =
    useState<DeliveryCheckoutQuoteResponse | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    if (status !== "signedIn" || !sessionToken) return;

    setLoading(true);
    setErrorKey(null);

    try {
      const [cartResponse, addressResponse] = await Promise.all([
        getCart(sessionToken),
        listCustomerAddresses(sessionToken)
      ]);

      setCart(cartResponse);
      setAddresses(addressResponse.addresses);
      setSelectedAddressId((current) => {
        if (
          current &&
          addressResponse.addresses.some((address) => address.id === current)
        ) {
          return current;
        }

        return (
          addressResponse.addresses.find((address) => address.isDefault)?.id ??
          addressResponse.addresses[0]?.id ??
          null
        );
      });
      setDelivery(null);
      setSelectedOptions({});
      setQuote(null);
      setPaymentReady(false);
    } catch (error) {
      const safe =
        error instanceof CartPricingApiError
          ? error
          : new CartPricingApiError("service_unavailable");
      setErrorKey(cartPricingErrorKey(safe.code));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const selectedAddress = useMemo(
    () =>
      addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const allDeliverySelectionsReady = useMemo(() => {
    if (!delivery || !delivery.canContinue) return false;

    return delivery.merchantGroups.every((group) => {
      const selected = selectedOptions[group.storeId];
      return (
        selected !== undefined &&
        group.options.some((option) => option.optionId === selected)
      );
    });
  }, [delivery, selectedOptions]);

  const calculateDelivery = async () => {
    if (!selectedAddressId || !sessionToken) {
      setErrorKey("delivery.error.addressNotFound");
      return;
    }

    setDeliveryLoading(true);
    setErrorKey(null);
    setQuote(null);
    setPaymentReady(false);
    setSelectedOptions({});

    try {
      const response = await getDeliveryOptions(
        sessionToken,
        selectedAddressId
      );
      setDelivery(response);
      setCart(response.cart);

      const defaults: Record<string, string> = {};
      for (const group of response.merchantGroups) {
        if (group.options.length === 1 && group.options[0]) {
          defaults[group.storeId] = group.options[0].optionId;
        }
      }
      setSelectedOptions(defaults);
    } catch (error) {
      const safe =
        error instanceof DeliveryApiError
          ? error
          : new DeliveryApiError("service_unavailable");
      setErrorKey(deliveryErrorKey(safe.code));
      setDelivery(null);
    } finally {
      setDeliveryLoading(false);
    }
  };

  const createQuote = async () => {
    if (
      !sessionToken ||
      !selectedAddressId ||
      !delivery ||
      !allDeliverySelectionsReady
    ) {
      setErrorKey("delivery.error.optionInvalid");
      return;
    }

    setQuoting(true);
    setErrorKey(null);

    try {
      const response = await createDeliveryCheckoutQuote(sessionToken, {
        addressId: selectedAddressId,
        selections: delivery.merchantGroups.map((group) => ({
          storeId: group.storeId,
          optionId: selectedOptions[group.storeId] ?? ""
        }))
      });

      setQuote(response);
      setCart(response.cart);
      setPaymentReady(false);
    } catch (error) {
      const safe =
        error instanceof DeliveryApiError
          ? error
          : new DeliveryApiError("service_unavailable");
      setErrorKey(deliveryErrorKey(safe.code));
      setQuote(null);
      setPaymentReady(false);

      if (
        safe.code === "delivery_unavailable" ||
        safe.code === "delivery_option_invalid" ||
        safe.code === "checkout_unavailable"
      ) {
        await calculateDelivery();
      }
    } finally {
      setQuoting(false);
    }
  };

  const selectAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    setDelivery(null);
    setSelectedOptions({});
    setQuote(null);
    setPaymentReady(false);
    setErrorKey(null);
  };

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("checkout.loadingTitle")}
          message={t("checkout.loadingMessage")}
        />
      </Screen>
    );
  }

  if (status !== "signedIn" || !sessionToken) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("checkout.signInTitle")}
          message={t("checkout.signInMessage")}
          actionLabel={t("cart.signInAction")}
          onAction={() => router.push("/(tabs)/account")}
        />
      </Screen>
    );
  }

  if (loading && !cart) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("checkout.loadingTitle")}
          message={t("checkout.loadingMessage")}
        />
      </Screen>
    );
  }

  if (errorKey && !cart) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("checkout.errorTitle")}
          message={t(errorKey)}
          actionLabel={t("cart.retry")}
          onAction={() => {
            void load();
          }}
        />
      </Screen>
    );
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("cart.emptyTitle")}
          message={t("cart.emptyMessage")}
          actionLabel={t("cart.browseAction")}
          onAction={() => router.replace("/(tabs)/marketplace")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: theme.spacing.sm
        }}
      >
        <Button variant="ghost" onPress={() => router.back()}>
          {t("marketplace.back")}
        </Button>
        <Badge label={t("delivery.phaseBadge")} tone="primary" />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="display">{t("checkout.title")}</AppText>
        <AppText tone="muted">{t("checkout.description")}</AppText>
      </View>

      <CheckoutSteps
        deliveryReady={Boolean(quote)}
        paymentReady={paymentReady}
      />

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">
            {t("checkout.step.address")}
          </AppText>

          {addresses.length === 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <AppText tone="muted">
                {t("checkout.noAddress")}
              </AppText>
              <Button
                variant="secondary"
                onPress={() => router.push("/checkout/addresses")}
              >
                {t("address.add")}
              </Button>
            </View>
          ) : (
            <>
              {addresses.map((address) => (
                <Button
                  key={address.id}
                  variant={
                    selectedAddressId === address.id
                      ? "primary"
                      : "secondary"
                  }
                  onPress={() => selectAddress(address.id)}
                >
                  {(address.label ?? address.recipientName) +
                    " · " +
                    address.province +
                    " · " +
                    address.districtCity}
                </Button>
              ))}
              <Button
                variant="ghost"
                onPress={() => router.push("/checkout/addresses")}
              >
                {t("address.manage")}
              </Button>
            </>
          )}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("checkout.cartReview")}</AppText>
          {cart.groups.map((group) => (
            <View key={group.store.id} style={{ gap: theme.spacing.sm }}>
              <AppText variant="heading">{group.store.name}</AppText>
              {group.items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: theme.spacing.md
                  }}
                >
                  <AppText style={{ flex: 1 }}>
                    {item.name +
                      (item.variantTitle ? " · " + item.variantTitle : "") +
                      " × " +
                      item.quantity}
                  </AppText>
                  <AppText>{formatAfn(item.lineTotal)}</AppText>
                </View>
              ))}
            </View>
          ))}

          <SummaryRow
            label={t("cart.preDeliveryTotal")}
            value={formatAfn(cart.totals.preDeliveryTotal)}
            emphasized
          />
        </View>
      </Card>

      <Button
        fullWidth
        loading={deliveryLoading}
        disabled={
          !selectedAddressId ||
          cart.hasBlockingIssues ||
          deliveryLoading
        }
        onPress={() => {
          void calculateDelivery();
        }}
      >
        {delivery
          ? t("delivery.customer.recalculate")
          : t("delivery.customer.calculate")}
      </Button>

      {cart.hasBlockingIssues ? (
        <AppText tone="danger">
          {t("cart.blockingIssues")}
        </AppText>
      ) : null}

      {delivery ? (
        <View style={{ gap: theme.spacing.lg }}>
          <Card>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="title">
                {t("checkout.step.delivery")}
              </AppText>
              {selectedAddress ? (
                <AppText tone="muted">
                  {selectedAddress.recipientName} · {selectedAddress.province} ·{" "}
                  {selectedAddress.districtCity}
                </AppText>
              ) : null}
            </View>
          </Card>

          {delivery.merchantGroups.map((group) => (
            <DeliveryGroupCard
              key={group.storeId}
              group={group}
              selectedOptionId={selectedOptions[group.storeId] ?? null}
              onSelect={(optionId) => {
                setSelectedOptions((current) => ({
                  ...current,
                  [group.storeId]: optionId
                }));
                setQuote(null);
              }}
            />
          ))}

          {!delivery.canContinue ? (
            <Card>
              <AppText tone="danger">
                {t("delivery.customer.resolveUnavailable")}
              </AppText>
            </Card>
          ) : null}

          <Button
            fullWidth
            loading={quoting}
            disabled={!allDeliverySelectionsReady || quoting}
            onPress={() => {
              void createQuote();
            }}
          >
            {t("delivery.customer.confirmAndPrice")}
          </Button>
        </View>
      ) : null}

      {quote ? (
        <View style={{ gap: theme.spacing.lg }}>
          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <Badge
                label={t("delivery.customer.pricingVerified")}
                tone="success"
              />
              <AppText variant="title">
                {t("delivery.customer.finalBeforePayment")}
              </AppText>
              <AppText variant="display">
                {formatAfn(quote.totals.finalBeforePaymentTotal)}
              </AppText>

              <SummaryRow
                label={t("cart.itemsSubtotal")}
                value={formatAfn(quote.totals.itemsSubtotal)}
              />
              {quote.totals.productDiscount > 0 ? (
                <SummaryRow
                  label={t("cart.productDiscount")}
                  value={"-" + formatAfn(quote.totals.productDiscount)}
                />
              ) : null}
              {quote.totals.couponDiscount > 0 ? (
                <SummaryRow
                  label={t("cart.couponDiscount")}
                  value={"-" + formatAfn(quote.totals.couponDiscount)}
                />
              ) : null}
              <SummaryRow
                label={t("delivery.customer.deliveryBase")}
                value={formatAfn(quote.totals.deliveryBase)}
              />
              {quote.totals.urgencySurcharge > 0 ? (
                <SummaryRow
                  label={t("delivery.customer.urgencySurcharge")}
                  value={formatAfn(quote.totals.urgencySurcharge)}
                />
              ) : null}
              {quote.totals.productDeliverySurcharge > 0 ? (
                <SummaryRow
                  label={t("delivery.customer.productSurcharge")}
                  value={formatAfn(quote.totals.productDeliverySurcharge)}
                />
              ) : null}
              {quote.totals.freeDeliveryDiscount > 0 ? (
                <SummaryRow
                  label={t("delivery.customer.freeDelivery")}
                  value={
                    "-" + formatAfn(quote.totals.freeDeliveryDiscount)
                  }
                />
              ) : null}
              <SummaryRow
                label={t("delivery.customer.deliveryTotal")}
                value={formatAfn(quote.totals.deliveryTotal)}
                emphasized
              />
              <SummaryRow
                label={t("delivery.customer.finalBeforePayment")}
                value={formatAfn(quote.totals.finalBeforePaymentTotal)}
                emphasized
              />

              <AppText variant="caption" tone="muted">
                {t("delivery.customer.noTaxAssumed")}
              </AppText>
            </View>
          </Card>

          <CheckoutPaymentSection
            token={sessionToken}
            quote={quote}
            onPaymentReady={setPaymentReady}
          />

          <Card muted>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="title">
                {t("checkout.step.review")}
              </AppText>
              <AppText tone="muted">
                {paymentReady
                  ? t("payment.customer.reviewReady")
                  : t("payment.customer.reviewBlocked")}
              </AppText>
              <Button fullWidth disabled>
                {t("checkout.placeOrderBlocked")}
              </Button>
              <AppText variant="caption" tone="muted">
                {t("checkout.orderBoundary")}
              </AppText>
            </View>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function DeliveryGroupCard({
  group,
  selectedOptionId,
  onSelect
}: {
  group: DeliveryMerchantQuote;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
}) {
  const theme = useAppTheme();
  const { formatAfn, formatNumber, locale, t } = useLocalization();

  return (
    <Card>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="title">{group.storeName}</AppText>
          <Badge
            label={
              group.available
                ? t("delivery.customer.available")
                : t("delivery.customer.unavailable")
            }
            tone={group.available ? "success" : "danger"}
          />
        </View>

        {!group.available ? (
          <AppText tone="danger">
            {t(unavailableKey(group.unavailableReason))}
          </AppText>
        ) : (
          group.options.map((option) => (
            <Button
              key={option.optionId}
              variant={
                selectedOptionId === option.optionId
                  ? "primary"
                  : "secondary"
              }
              onPress={() => onSelect(option.optionId)}
            >
              {option.label} · {formatAfn(option.price.finalDeliveryPrice)}
            </Button>
          ))
        )}

        {group.options.map((option) =>
          selectedOptionId === option.optionId ? (
            <View key={"detail:" + option.optionId} style={{ gap: theme.spacing.sm }}>
              <AppText variant="heading">
                {t(fulfillmentKey(option))}: {option.label}
              </AppText>
              <SummaryRow
                label={t("delivery.customer.deliveryBase")}
                value={formatAfn(option.price.baseDelivery)}
              />
              {option.price.urgencySurcharge > 0 ? (
                <SummaryRow
                  label={t("delivery.customer.urgencySurcharge")}
                  value={formatAfn(option.price.urgencySurcharge)}
                />
              ) : null}
              {option.price.productDeliverySurcharge > 0 ? (
                <SummaryRow
                  label={t("delivery.customer.productSurcharge")}
                  value={formatAfn(option.price.productDeliverySurcharge)}
                />
              ) : null}
              {option.price.freeDeliveryDiscount > 0 ? (
                <SummaryRow
                  label={t("delivery.customer.freeDelivery")}
                  value={"-" + formatAfn(option.price.freeDeliveryDiscount)}
                />
              ) : null}
              <SummaryRow
                label={t("delivery.customer.deliveryTotal")}
                value={formatAfn(option.price.finalDeliveryPrice)}
                emphasized
              />

              <AppText variant="caption" tone="muted">
                {t("delivery.customer.ruleUsed")}: {t(ruleKey(option))} ·{" "}
                {option.ruleUsed.label}
              </AppText>

              {option.ruleUsed.distanceKm !== null ? (
                <AppText variant="caption" tone="muted">
                  {t("delivery.customer.distance")}:{" "}
                  {formatNumber(option.ruleUsed.distanceKm)} km ·{" "}
                  {t(
                    option.ruleUsed.distanceSource ===
                      "straight_line_fallback"
                      ? "delivery.customer.distanceFallback"
                      : "delivery.customer.distanceNotRequired"
                  )}
                </AppText>
              ) : null}

              {option.estimatedMinAt && option.estimatedMaxAt ? (
                <AppText variant="caption" tone="muted">
                  {t("delivery.customer.estimate")}:{" "}
                  {new Date(option.estimatedMinAt).toLocaleString(
                    locale === "fa-AF"
                      ? "fa-AF"
                      : locale === "ps-AF"
                        ? "ps-AF"
                        : "en"
                  )}
                  {" – "}
                  {new Date(option.estimatedMaxAt).toLocaleString(
                    locale === "fa-AF"
                      ? "fa-AF"
                      : locale === "ps-AF"
                        ? "ps-AF"
                        : "en"
                  )}
                </AppText>
              ) : null}
            </View>
          ) : null
        )}
      </View>
    </Card>
  );
}

function CheckoutSteps({
  deliveryReady,
  paymentReady
}: {
  deliveryReady: boolean;
  paymentReady: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <Card muted>
      <View style={{ gap: theme.spacing.sm }}>
        {[
          ["1", "checkout.step.address", true],
          ["2", "checkout.step.delivery", deliveryReady],
          ["3", "checkout.step.payment", paymentReady],
          ["4", "checkout.step.review", paymentReady],
          ["5", "checkout.step.placeOrder", false]
        ].map(([number, key, ready]) => (
          <View
            key={String(key)}
            style={{
              flexDirection: "row",
              gap: theme.spacing.sm,
              alignItems: "center"
            }}
          >
            <Badge
              label={String(number)}
              tone={ready ? "success" : "neutral"}
            />
            <AppText>{t(key as TranslationKey)}</AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: theme.spacing.md
      }}
    >
      <AppText variant={emphasized ? "heading" : "body"}>
        {label}
      </AppText>
      <AppText variant={emphasized ? "heading" : "body"}>
        {value}
      </AppText>
    </View>
  );
}
