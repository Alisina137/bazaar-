import type {
  CartResponse,
  CheckoutQuoteResponse,
  CustomerAddressRecord
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
  listCustomerAddresses,
  quoteCheckout
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
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

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
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
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
      setQuote(null);
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

  const createQuote = async () => {
    if (!selectedAddressId) {
      setErrorKey("cart.error.addressNotFound");
      return;
    }

    setQuoting(true);
    setErrorKey(null);

    try {
      setQuote(
        await quoteCheckout(sessionToken, {
          addressId: selectedAddressId
        })
      );
    } catch (error) {
      const safe =
        error instanceof CartPricingApiError
          ? error
          : new CartPricingApiError("service_unavailable");
      setErrorKey(cartPricingErrorKey(safe.code));
      setQuote(null);
      if (
        safe.code === "checkout_unavailable" ||
        safe.code === "insufficient_stock" ||
        safe.code === "product_unavailable"
      ) {
        setCart(await getCart(sessionToken).catch(() => cart));
      }
    } finally {
      setQuoting(false);
    }
  };

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
        <Badge label={t("checkout.phaseBadge")} tone="primary" />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="display">{t("checkout.title")}</AppText>
        <AppText tone="muted">{t("checkout.description")}</AppText>
      </View>

      <CheckoutSteps />

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
                  onPress={() => {
                    setSelectedAddressId(address.id);
                    setQuote(null);
                  }}
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
              <View
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  paddingBottom: theme.spacing.md
                }}
              />
            </View>
          ))}

          <SummaryRow
            label={t("cart.itemsSubtotal")}
            value={formatAfn(cart.totals.itemsSubtotal)}
          />
          {cart.totals.productDiscount > 0 ? (
            <SummaryRow
              label={t("cart.productDiscount")}
              value={"-" + formatAfn(cart.totals.productDiscount)}
            />
          ) : null}
          {cart.totals.couponDiscount > 0 ? (
            <SummaryRow
              label={t("cart.couponDiscount")}
              value={"-" + formatAfn(cart.totals.couponDiscount)}
            />
          ) : null}
          <SummaryRow
            label={t("cart.preDeliveryTotal")}
            value={formatAfn(cart.totals.preDeliveryTotal)}
            emphasized
          />
          <AppText variant="caption" tone="muted">
            {t("checkout.preDeliveryDisclaimer")}
          </AppText>
        </View>
      </Card>

      <Button
        fullWidth
        loading={quoting}
        disabled={
          !selectedAddressId ||
          cart.hasBlockingIssues ||
          quoting
        }
        onPress={() => {
          void createQuote();
        }}
      >
        {t("checkout.createQuote")}
      </Button>

      {cart.hasBlockingIssues ? (
        <AppText tone="danger">
          {t("cart.blockingIssues")}
        </AppText>
      ) : null}

      {quote ? (
        <View style={{ gap: theme.spacing.lg }}>
          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <Badge label={t("checkout.quoteReady")} tone="success" />
              <AppText variant="title">
                {t("checkout.authoritativeTotal")}
              </AppText>
              <AppText variant="display">
                {formatAfn(quote.cart.totals.preDeliveryTotal)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t("checkout.quoteExpiryHint")}
              </AppText>
              {selectedAddress ? (
                <AppText tone="muted">
                  {selectedAddress.recipientName} · {selectedAddress.province} ·{" "}
                  {selectedAddress.districtCity}
                </AppText>
              ) : null}
            </View>
          </Card>

          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="title">
                {t("checkout.step.delivery")}
              </AppText>
              <Badge
                label={t("checkout.pendingPhase6")}
                tone="warning"
              />
              <AppText tone="muted">
                {t("checkout.deliveryBoundary")}
              </AppText>
            </View>
          </Card>

          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="title">
                {t("checkout.step.payment")}
              </AppText>
              <Badge
                label={t("checkout.pendingPhase7")}
                tone="warning"
              />
              <AppText tone="muted">
                {t("checkout.paymentBoundary")}
              </AppText>
            </View>
          </Card>

          <Card muted>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="title">
                {t("checkout.step.review")}
              </AppText>
              <AppText tone="muted">
                {t("checkout.reviewReady")}
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

function CheckoutSteps() {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <Card muted>
      <View style={{ gap: theme.spacing.sm }}>
        {[
          ["1", "checkout.step.address"],
          ["2", "checkout.step.delivery"],
          ["3", "checkout.step.payment"],
          ["4", "checkout.step.review"],
          ["5", "checkout.step.placeOrder"]
        ].map(([number, key]) => (
          <View
            key={key}
            style={{
              flexDirection: "row",
              gap: theme.spacing.sm,
              alignItems: "center"
            }}
          >
            <Badge label={number ?? ""} tone="neutral" />
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
