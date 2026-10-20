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
  useRef,
  useState
} from "react";
import { Image, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useAuth } from "@/auth/provider";
import { CheckoutChoice, CheckoutSectionHeading } from "@/components/checkout/CheckoutChoice";
import {
  CartPricingApiError,
  getCart,
  listCustomerAddresses
} from "@/cart-pricing/api";
import { cartPricingRequestErrorKey } from "@/cart-pricing/messages";
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
import {
  OrderApiError,
  placeOrder
} from "@/order/api";
import { orderErrorKey } from "@/order/messages";

function makeOrderIdempotencyKey(sessionId: string): string {
  return (
    "order-" +
    sessionId.replace(/-/g, "").slice(0, 20) +
    "-" +
    Date.now().toString(36)
  );
}

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
  const { isRTL, formatAfn, t } = useLocalization();

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
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<TranslationKey | null>(null);
  const orderIdempotencyRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<{
    source: "cart" | "addresses";
    key: TranslationKey;
    reference: string | null;
  } | null>(null);
  const loadEpoch = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadEpoch.current;
    if (status !== "signedIn" || !sessionToken) {
      setCart(null);
      setAddresses([]);
      setSelectedAddressId(null);
      setInitialLoadError(null);
      setLoading(false);
      return;
    }

    // Checkout must not retain a previous customer's cart or old paid quote.
    setLoading(true);
    setCart(null);
    setAddresses([]);
    setSelectedAddressId(null);
    setInitialLoadError(null);
    setErrorKey(null);
    setDelivery(null);
    setSelectedOptions({});
    setQuote(null);
    setPaymentReady(false);
    setOrderError(null);
    orderIdempotencyRef.current = null;

    try {
      // Keep cart and saved-address failures distinct: Promise.all would hide
      // which service failed and mislabel an address 503 as "cart offline".
      const [cartResult, addressResult] = await Promise.allSettled([
        getCart(sessionToken),
        listCustomerAddresses(sessionToken)
      ]);
      if (requestId !== loadEpoch.current) return;

      const failure =
        cartResult.status === "rejected"
          ? { source: "cart" as const, reason: cartResult.reason as unknown }
          : addressResult.status === "rejected"
            ? { source: "addresses" as const, reason: addressResult.reason as unknown }
            : null;
      if (failure) {
        setInitialLoadError({
          source: failure.source,
          key: cartPricingRequestErrorKey(failure.reason),
          reference: failure.reason instanceof CartPricingApiError
            ? failure.reason.reference : null
        });
        return;
      }

      if (cartResult.status !== "fulfilled" || addressResult.status !== "fulfilled") {
        return;
      }
      setCart(cartResult.value);
      setAddresses(addressResult.value.addresses);
      setSelectedAddressId(
        addressResult.value.addresses.find(address => address.isDefault)?.id ??
        addressResult.value.addresses[0]?.id ??
        null
      );
    } catch (error) {
      if (requestId === loadEpoch.current) {
        setInitialLoadError({
          source: "cart",
          key: cartPricingRequestErrorKey(error),
          reference: error instanceof CartPricingApiError ? error.reference : null
        });
      }
    } finally {
      if (requestId === loadEpoch.current) setLoading(false);
    }
  }, [sessionToken, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => { loadEpoch.current += 1; };
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
      setOrderError(null);
      orderIdempotencyRef.current = makeOrderIdempotencyKey(
        response.sessionId
      );
    } catch (error) {
      const safe =
        error instanceof DeliveryApiError
          ? error
          : new DeliveryApiError("service_unavailable");
      setErrorKey(deliveryErrorKey(safe.code));
      setQuote(null);
      setPaymentReady(false);
      setOrderError(null);
      orderIdempotencyRef.current = null;

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

  const submitOrder = async () => {
    if (!sessionToken || !quote || !paymentReady) {
      setOrderError("order.error.paymentNotReady");
      return;
    }

    setPlacingOrder(true);
    setOrderError(null);

    try {
      const idempotencyKey =
        orderIdempotencyRef.current ??
        makeOrderIdempotencyKey(quote.sessionId);
      orderIdempotencyRef.current = idempotencyKey;

      await placeOrder(sessionToken, {
        checkoutSessionId: quote.sessionId,
        idempotencyKey
      });

      router.replace("/(tabs)/orders");
    } catch (error) {
      const safe =
        error instanceof OrderApiError
          ? error
          : new OrderApiError("service_unavailable");
      setOrderError(orderErrorKey(safe.code));

      if (
        safe.code === "checkout_unavailable" ||
        safe.code === "inventory_unavailable" ||
        safe.code === "payment_not_ready"
      ) {
        orderIdempotencyRef.current = null;
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  const selectAddress = (addressId: string) => {
    if (selectedAddressId === addressId) return;
    setSelectedAddressId(addressId);
    setDelivery(null);
    setSelectedOptions({});
    setQuote(null);
    setPaymentReady(false);
    setOrderError(null);
    orderIdempotencyRef.current = null;
    setErrorKey(null);
  };

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          loadingVariant="cart"
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
          loadingVariant="cart"
          title={t("checkout.loadingTitle")}
          message={t("checkout.loadingMessage")}
        />
      </Screen>
    );
  }

  if (initialLoadError) {
    return (
      <Screen scrollable={false}>
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <StateView
            kind="error"
            title={t(initialLoadError.source === "cart"
              ? "checkout.cartLoadErrorTitle" : "checkout.addressLoadErrorTitle")}
            message={
              t(initialLoadError.key) +
              (initialLoadError.reference
                ? "\n" + t("cart.error.reference") + ": " + initialLoadError.reference
                : "")
            }
            actionLabel={t("cart.retry")}
            onAction={() => { void load(); }}
          />
          <View style={{ alignItems: "center" }}>
            <Button variant="ghost" onPress={() => router.back()}>
              {t("marketplace.back")}
            </Button>
          </View>
        </View>
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
    <Screen contentStyle={{ gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing["3xl"] }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", gap: theme.spacing.sm
      }}>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="bodyStrong" style={{ fontSize: 22, lineHeight: 29 }}>{t("checkout.title")}</AppText>
          <AppText variant="caption" tone="muted">{t("checkout.description")}</AppText>
        </View>
        <Button variant="ghost" onPress={() => router.back()}>{t("marketplace.back")}</Button>
      </View>

      <CheckoutSteps
        addressReady={Boolean(selectedAddress)}
        deliveryReady={Boolean(quote)}
        paymentReady={paymentReady}
      />

      {errorKey ? (
        <Card style={{ borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm, alignItems: "flex-start" }}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.danger} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" tone="danger" accessibilityRole="alert">{t(errorKey)}</AppText>
            </View>
          </View>
        </Card>
      ) : null}

      <Card style={{ padding: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.md }}>
          <CheckoutSectionHeading step={1} title={t("checkout.step.address")}
            subtitle={t("checkout.addressHint")} />
          {addresses.length === 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="label" tone="muted">{t("checkout.noAddress")}</AppText>
              <Button variant="secondary" onPress={() => router.push("/checkout/addresses")}>
                {t("address.add")}
              </Button>
            </View>
          ) : (
            <>
              {addresses.map(address => (
                <CheckoutChoice
                  key={address.id}
                  icon="location-outline"
                  title={address.label || address.recipientName}
                  subtitle={address.recipientName + " · " + address.phone}
                  secondary={[address.addressDescription, address.districtCity, address.province]
                    .filter(Boolean).join(" · ")}
                  selected={selectedAddressId === address.id}
                  onPress={() => selectAddress(address.id)}
                />
              ))}
              <Button variant="ghost" onPress={() => router.push("/checkout/addresses")}>
                {t("address.manage")}
              </Button>
            </>
          )}
        </View>
      </Card>

      <Card style={{ padding: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.md }}>
          <CheckoutSectionHeading step={2} title={t("checkout.cartReview")}
            subtitle={t("checkout.itemsHint")} />
          {cart.groups.map((group, groupIndex) => (
            <View key={group.store.id} style={{
              gap: theme.spacing.sm,
              borderTopWidth: groupIndex > 0 ? 1 : 0,
              borderTopColor: theme.colors.border,
              paddingTop: groupIndex > 0 ? theme.spacing.md : 0
            }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm }}>
                <Ionicons name="storefront-outline" size={17} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" style={{ fontSize: 14, lineHeight: 21 }}>
                    {group.store.name}
                  </AppText>
                </View>
              </View>
              {group.items.map(item => (
                <View key={item.id} style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", gap: theme.spacing.md,
                  paddingVertical: theme.spacing.xs
                }}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} resizeMode="contain"
                      style={{ width: 56, height: 56, borderRadius: theme.radii.md, backgroundColor: theme.colors.surfaceMuted }} />
                  ) : (
                    <View style={{
                      width: 56, height: 56, borderRadius: theme.radii.md,
                      backgroundColor: theme.colors.surfaceMuted,
                      alignItems: "center", justifyContent: "center"
                    }}>
                      <Ionicons name="image-outline" size={21} color={theme.colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: theme.spacing.xs }}>
                    <AppText variant="label" numberOfLines={2}>{item.name}</AppText>
                    {item.variantTitle ? (
                      <AppText variant="caption" tone="muted" numberOfLines={1}>{item.variantTitle}</AppText>
                    ) : null}
                    <AppText variant="caption" tone="muted">
                      {t("cart.itemCount")}: {item.quantity}
                    </AppText>
                  </View>
                  <AppText variant="label" tone="primary">{formatAfn(item.lineTotal)}</AppText>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          <SummaryRow label={t("cart.preDeliveryTotal")}
            value={formatAfn(cart.totals.preDeliveryTotal)} emphasized />
          <AppText variant="caption" tone="muted">{t("checkout.preDeliveryDisclaimer")}</AppText>
        </View>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Button fullWidth loading={deliveryLoading}
          disabled={!selectedAddressId || cart.hasBlockingIssues || deliveryLoading || quoting || placingOrder}
          onPress={() => { void calculateDelivery(); }}>
          {delivery ? t("delivery.customer.recalculate") : t("delivery.customer.calculate")}
        </Button>
        {cart.hasBlockingIssues ? (
          <AppText variant="caption" tone="danger" accessibilityRole="alert">{t("cart.blockingIssues")}</AppText>
        ) : null}
        {!delivery ? (
          <AppText variant="caption" tone="muted" align="center">
            {t("checkout.calculateHint")}
          </AppText>
        ) : null}
      </View>

      {delivery ? (
        <View style={{ gap: theme.spacing.lg }}>
          <CheckoutSectionHeading step={3} title={t("checkout.step.delivery")}
            subtitle={t("checkout.deliveryHint")} />

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
                setPaymentReady(false);
                setOrderError(null);
                orderIdempotencyRef.current = null;
              }}
            />
          ))}

          {!delivery.canContinue ? (
            <Card style={{ backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }}>
              <AppText variant="label" tone="danger">{t("delivery.customer.resolveUnavailable")}</AppText>
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
          <Card style={{ padding: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm }}>
                <Ionicons name="checkmark-circle" size={21} color={theme.colors.success} />
                <AppText variant="bodyStrong" style={{ fontSize: 16, lineHeight: 22 }}>
                  {t("delivery.customer.pricingVerified")}
                </AppText>
              </View>
              <View style={{
                padding: theme.spacing.lg, borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primarySoft, gap: theme.spacing.xs
              }}>
                <AppText variant="caption" tone="muted">{t("delivery.customer.finalBeforePayment")}</AppText>
                <AppText variant="bodyStrong" tone="primary" style={{ fontSize: 26, lineHeight: 34 }}>
                  {formatAfn(quote.totals.finalBeforePaymentTotal)}
                </AppText>
              </View>
              <AppText variant="bodyStrong">{t("checkout.breakdown")}</AppText>

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

          <Card style={{ padding: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.md }}>
              <CheckoutSectionHeading step={5} title={t("checkout.step.review")}
                subtitle={t("checkout.reviewHint")} />
              <View style={{
                borderRadius: theme.radii.md, padding: theme.spacing.md,
                backgroundColor: paymentReady ? theme.colors.successSoft : theme.colors.surfaceMuted,
                flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm
              }}>
                <Ionicons name={paymentReady ? "checkmark-circle" : "lock-closed-outline"}
                  size={20} color={paymentReady ? theme.colors.success : theme.colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <AppText variant="label" tone={paymentReady ? "success" : "muted"}>
                    {paymentReady ? t("payment.customer.reviewReady") : t("payment.customer.reviewBlocked")}
                  </AppText>
                </View>
              </View>
              {orderError ? (
                <AppText tone="danger">{t(orderError)}</AppText>
              ) : null}
              <Button
                fullWidth
                loading={placingOrder}
                disabled={!paymentReady || placingOrder}
                onPress={() => {
                  void submitOrder();
                }}
              >
                {placingOrder
                  ? t("order.customer.placingOrder")
                  : t("order.customer.placeOrder")}
              </Button>
              <AppText variant="caption" tone="muted">
                {t("order.customer.placeOrderHint")}
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
  const selected = group.options.find(option => option.optionId === selectedOptionId) ?? null;

  return (
    <Card style={{ padding: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="bodyStrong" style={{ fontSize: 15, lineHeight: 22 }}>{group.storeName}</AppText>
          {!group.available ? (
            <Badge label={t("delivery.customer.unavailable")} tone="danger" />
          ) : null}
        </View>

        {!group.available ? (
          <AppText variant="label" tone="danger" accessibilityRole="alert">
            {t(unavailableKey(group.unavailableReason))}
          </AppText>
        ) : group.options.map(option => (
          <CheckoutChoice
            key={option.optionId}
            icon={option.fulfillmentType === "pickup" ? "storefront-outline"
              : option.fulfillmentType === "digital" ? "cloud-download-outline" : "cube-outline"}
            title={option.label}
            subtitle={t(fulfillmentKey(option))}
            trailing={formatAfn(option.price.finalDeliveryPrice)}
            selected={selectedOptionId === option.optionId}
            onPress={() => onSelect(option.optionId)}
          />
        ))}

        {selected ? (
          <View style={{
            gap: theme.spacing.sm,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radii.md
          }}>
            <SummaryRow label={t("delivery.customer.deliveryBase")}
              value={formatAfn(selected.price.baseDelivery)} />
            {selected.price.urgencySurcharge > 0 ? (
              <SummaryRow label={t("delivery.customer.urgencySurcharge")}
                value={formatAfn(selected.price.urgencySurcharge)} />
            ) : null}
            {selected.price.productDeliverySurcharge > 0 ? (
              <SummaryRow label={t("delivery.customer.productSurcharge")}
                value={formatAfn(selected.price.productDeliverySurcharge)} />
            ) : null}
            {selected.price.freeDeliveryDiscount > 0 ? (
              <SummaryRow label={t("delivery.customer.freeDelivery")}
                value={"-" + formatAfn(selected.price.freeDeliveryDiscount)} />
            ) : null}
            <SummaryRow label={t("delivery.customer.deliveryTotal")}
              value={formatAfn(selected.price.finalDeliveryPrice)} emphasized />
            <AppText variant="caption" tone="muted">
              {t("delivery.customer.ruleUsed")}: {t(ruleKey(selected))} · {selected.ruleUsed.label}
            </AppText>
            {selected.ruleUsed.distanceKm !== null ? (
              <AppText variant="caption" tone="muted">
                {t("delivery.customer.distance")}: {formatNumber(selected.ruleUsed.distanceKm)} km
              </AppText>
            ) : null}
            {selected.estimatedMinAt && selected.estimatedMaxAt ? (
              <AppText variant="caption" tone="muted">
                {t("delivery.customer.estimate")}:{" "}
                {new Date(selected.estimatedMinAt).toLocaleString(
                  locale === "fa-AF" ? "fa-AF" : locale === "ps-AF" ? "ps-AF" : "en"
                )}
                {" – "}
                {new Date(selected.estimatedMaxAt).toLocaleString(
                  locale === "fa-AF" ? "fa-AF" : locale === "ps-AF" ? "ps-AF" : "en"
                )}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function CheckoutSteps({
  addressReady,
  deliveryReady,
  paymentReady
}: {
  addressReady: boolean;
  deliveryReady: boolean;
  paymentReady: boolean;
}) {
  const theme = useAppTheme();
  const { t, isRTL, formatNumber } = useLocalization();
  const current = !addressReady ? 0 : !deliveryReady ? 1 : !paymentReady ? 2 : 3;
  const labels: TranslationKey[] = [
    "checkout.step.address",
    "checkout.step.delivery",
    "checkout.step.payment",
    "checkout.step.review"
  ];

  return (
    <View accessibilityRole="progressbar"
      accessibilityLabel={t("checkout.title")}
      style={{ gap: theme.spacing.sm }}
    >
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", justifyContent: "space-between",
        gap: theme.spacing.xs
      }}>
        {labels.map((key, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <View key={key} style={{
              flex: 1, alignItems: "center", gap: theme.spacing.xs,
              paddingVertical: theme.spacing.sm
            }}>
              <View style={{
                height: 29, width: 29, borderRadius: theme.radii.full,
                alignItems: "center", justifyContent: "center",
                backgroundColor: complete ? theme.colors.successSoft
                  : active ? theme.colors.primary : theme.colors.surfaceMuted,
                borderWidth: active ? 0 : 1,
                borderColor: complete ? theme.colors.success : theme.colors.border
              }}>
                {complete ? (
                  <Ionicons name="checkmark" color={theme.colors.success} size={17} />
                ) : (
                  <AppText variant="caption"
                    style={{ color: active ? theme.colors.onPrimary : theme.colors.textMuted }}>
                    {formatNumber(index + 1)}
                  </AppText>
                )}
              </View>
              <AppText variant="caption" align="center" numberOfLines={2}
                tone={active ? "primary" : complete ? "success" : "muted"}
                style={{ fontSize: 11, lineHeight: 16 }}>
                {t(key)}
              </AppText>
            </View>
          );
        })}
      </View>
      <View style={{
        height: 4, backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radii.full, overflow: "hidden"
      }}>
        <View style={{
          width: `${(current + 1) / labels.length * 100}%` as `${number}%`,
          alignSelf: isRTL ? "flex-end" : "flex-start",
          height: 4,
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.primary
        }} />
      </View>
    </View>
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
  const { isRTL } = useLocalization();

  return (
    <View style={{
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md
    }}>
      <View style={{ flex: 1 }}>
        <AppText variant={emphasized ? "bodyStrong" : "label"}
          tone={emphasized ? "default" : "muted"}>
          {label}
        </AppText>
      </View>
      <AppText variant="bodyStrong" tone={emphasized ? "primary" : "default"}
        style={{ fontSize: emphasized ? 16 : 14, lineHeight: 21 }}>
        {value}
      </AppText>
    </View>
  );
}
