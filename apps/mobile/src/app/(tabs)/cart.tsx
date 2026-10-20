import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  CartResponse,
  MerchantCartGroup
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import {
  useFocusEffect,
  useRouter
} from "expo-router";
import {
  useCallback,
  useState
} from "react";
import {
  Alert,
  Image,
  View
} from "react-native";

import { useAuth } from "@/auth/provider";
import {
  applyCartCoupon,
  CartPricingApiError,
  getCart,
  removeCartCoupon,
  removeCartItem,
  updateCartItem
} from "@/cart-pricing/api";
import { cartPricingErrorKey } from "@/cart-pricing/messages";
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

function issueKey(
  reason: NonNullable<
    CartResponse["groups"][number]["items"][number]["unavailableReason"]
  >
): TranslationKey {
  switch (reason) {
    case "product_unavailable":
      return "cart.issue.productUnavailable";
    case "variant_unavailable":
      return "cart.issue.variantUnavailable";
    case "insufficient_stock":
      return "cart.issue.insufficientStock";
  }
}

export default function CartScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status, sessionToken } = useAuth();
  const { formatAfn, formatNumber, isRTL, t } = useLocalization();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    if (status !== "signedIn" || !sessionToken) {
      setCart(null);
      return;
    }

    setLoading(true);
    setErrorKey(null);

    try {
      setCart(await getCart(sessionToken));
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

  const run = async (
    key: string,
    action: (token: string) => Promise<CartResponse>
  ) => {
    if (!sessionToken || busyKey !== null) return;

    setBusyKey(key);
    setErrorKey(null);

    try {
      setCart(await action(sessionToken));
    } catch (error) {
      const safe =
        error instanceof CartPricingApiError
          ? error
          : new CartPricingApiError("service_unavailable");
      setErrorKey(cartPricingErrorKey(safe.code));
    } finally {
      setBusyKey(null);
    }
  };

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("cart.loadingTitle")}
          message={t("cart.loadingMessage")}
        />
      </Screen>
    );
  }

  if (status !== "signedIn") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("cart.signInTitle")}
          message={t("cart.signInMessage")}
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
          title={t("cart.loadingTitle")}
          message={t("cart.loadingMessage")}
        />
      </Screen>
    );
  }

  if (errorKey && !cart) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("cart.errorTitle")}
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
          onAction={() => router.push("/(tabs)/marketplace")}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollKey="shopping-cart" refreshing={loading} onRefresh={() => { void load(); }} contentStyle={{ gap: theme.spacing.lg }}>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="heading">{t("cart.title")}</AppText>
        <Badge label={formatNumber(cart.itemCount) + " " + t("cart.itemCount")} tone="neutral" />
      </View>

      {cart.priceChanged ? (
        <Card muted>
          <AppText variant="heading">
            {t("cart.priceChangedTitle")}
          </AppText>
          <AppText tone="muted">
            {t("cart.priceChangedMessage")}
          </AppText>
        </Card>
      ) : null}

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      {cart.groups.map((group) => (
        <MerchantGroupCard
          key={group.store.id}
          group={group}
          busyKey={busyKey}
          onUpdate={(itemId, quantity) =>
            run("item:" + itemId, (token) =>
              updateCartItem(token, itemId, { quantity })
            )
          }
          onRemove={(itemId) => {
            const item = group.items.find(entry => entry.id === itemId);
            if (!item) return;
            Alert.alert(t("cart.remove"), item.name, [
              { text: t("support.hub.cancel"), style: "cancel" },
              {
                text: t("cart.remove"),
                style: "destructive",
                onPress: () => {
                  void run("item:" + itemId, async token => {
                    return removeCartItem(token, itemId);
                  });
                }
              }
            ]);
          }}
          onApplyCoupon={(code) =>
            run("coupon:" + group.store.id, (token) =>
              applyCartCoupon(token, {
                storeId: group.store.id,
                code
              })
            )
          }
          onRemoveCoupon={() =>
            run("coupon:" + group.store.id, (token) =>
              removeCartCoupon(token, group.store.id)
            )
          }
        />
      ))}

      <Card muted>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("cart.summary")}</AppText>
          <PriceRow
            label={t("cart.itemsSubtotal")}
            value={formatAfn(cart.totals.itemsSubtotal)}
          />
          {cart.totals.productDiscount > 0 ? (
            <PriceRow
              label={t("cart.productDiscount")}
              value={"-" + formatAfn(cart.totals.productDiscount)}
            />
          ) : null}
          {cart.totals.couponDiscount > 0 ? (
            <PriceRow
              label={t("cart.couponDiscount")}
              value={"-" + formatAfn(cart.totals.couponDiscount)}
            />
          ) : null}
          <PriceRow
            label={t("cart.preDeliveryTotal")}
            value={formatAfn(cart.totals.preDeliveryTotal)}
            emphasized
          />
          <AppText variant="caption" tone="muted">
            {t("cart.deliveryPendingHint")}
          </AppText>
        </View>
      </Card>

      <Button
        fullWidth
        disabled={cart.hasBlockingIssues || busyKey !== null || loading}
        onPress={() => router.push("/checkout")}
      >
        {t("cart.checkout")}
      </Button>

      {cart.hasBlockingIssues ? (
        <AppText tone="danger">
          {t("cart.blockingIssues")}
        </AppText>
      ) : null}

      <AppText variant="caption" tone="muted">
        {t("cart.itemCount")}: {formatNumber(cart.itemCount)}
      </AppText>
    </Screen>
  );
}

function MerchantGroupCard({
  group,
  busyKey,
  onUpdate,
  onRemove,
  onApplyCoupon,
  onRemoveCoupon
}: {
  group: MerchantCartGroup;
  busyKey: string | null;
  onUpdate: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => Promise<void>;
}) {
  const theme = useAppTheme();
  const { isRTL, formatAfn, formatNumber, t } = useLocalization();
  const [couponCode, setCouponCode] = useState(group.coupon?.code ?? "");

  return (
    <Card>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
          <Ionicons name="storefront-outline" size={20} color={theme.colors.primary} />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <AppText variant="title">{group.store.name}</AppText>
            <AppText variant="caption" tone="muted">
              {group.store.province} · {group.store.cityDistrict}
            </AppText>
          </View>
          <Badge label={formatNumber(group.items.length)} tone="neutral" />
        </View>

        {group.items.map((item) => (
          <View
            key={item.id}
            style={{
              gap: theme.spacing.sm,
              paddingBottom: theme.spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border
            }}
          >
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                gap: theme.spacing.md
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  accessibilityLabel={item.name}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: theme.radii.md,
                    backgroundColor: theme.colors.surfaceMuted
                  }}
                />
              ) : (
                <View style={{ width: 88, height: 88, borderRadius: theme.radii.md, backgroundColor: theme.colors.surfaceMuted, justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="image-outline" size={30} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <AppText variant="heading">{item.name}</AppText>
                {item.variantTitle ? (
                  <AppText variant="caption" tone="muted">
                    {item.variantTitle}
                  </AppText>
                ) : null}
                <AppText variant="bodyStrong" tone="primary">{formatAfn(item.lineTotal)}</AppText>
              </View>
            </View>

            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                flexWrap: "wrap",
                gap: theme.spacing.sm
              }}
            >
              {item.priceChanged ? (
                <Badge
                  label={t("cart.priceChangedBadge")}
                  tone="warning"
                />
              ) : null}
              {item.unavailableReason ? (
                <Badge
                  label={t(issueKey(item.unavailableReason))}
                  tone="danger"
                />
              ) : null}
            </View>

            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                gap: theme.spacing.sm,
                alignItems: "center"
              }}
            >
              <Button
                variant="secondary"
                disabled={busyKey !== null || item.quantity <= 1}
                onPress={() => {
                  void onUpdate(item.id, item.quantity - 1);
                }}
              >
                −
              </Button>
              <AppText variant="heading">
                {formatNumber(item.quantity)}
              </AppText>
              <Button
                variant="secondary"
                disabled={
                  busyKey !== null ||
                  item.quantity >= item.availableQuantity
                }
                onPress={() => {
                  void onUpdate(item.id, item.quantity + 1);
                }}
              >
                +
              </Button>
              <Button
                variant="ghost"
                loading={busyKey === "item:" + item.id}
                disabled={busyKey !== null}
                onPress={() => {
                  void onRemove(item.id);
                }}
              >
                {t("cart.remove")}
              </Button>
            </View>
          </View>
        ))}

        <View style={{ gap: theme.spacing.md }}>
          <PriceRow
            label={t("cart.itemsSubtotal")}
            value={formatAfn(group.itemsSubtotal)}
          />
          {group.productDiscount > 0 ? (
            <PriceRow
              label={t("cart.productDiscount")}
              value={"-" + formatAfn(group.productDiscount)}
            />
          ) : null}
          {group.couponDiscount > 0 ? (
            <PriceRow
              label={t("cart.couponDiscount")}
              value={"-" + formatAfn(group.couponDiscount)}
            />
          ) : null}
          <PriceRow
            label={t("cart.storePreDeliveryTotal")}
            value={formatAfn(group.preDeliveryTotal)}
            emphasized
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <TextField
            label={t("cart.coupon")}
            placeholder={t("cart.couponPlaceholder")}
            value={couponCode}
            autoCapitalize="characters"
            onChangeText={setCouponCode}
          />
          {group.coupon ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Badge
                label={
                  group.coupon.code +
                  (group.coupon.valid
                    ? " · " + t("cart.couponApplied")
                    : " · " + t("cart.couponInvalid"))
                }
                tone={group.coupon.valid ? "success" : "danger"}
              />
              <Button
                variant="ghost"
                disabled={busyKey !== null}
                onPress={() => {
                  void onRemoveCoupon();
                  setCouponCode("");
                }}
              >
                {t("cart.removeCoupon")}
              </Button>
            </View>
          ) : (
            <Button
              variant="secondary"
              loading={busyKey === "coupon:" + group.store.id}
              disabled={!couponCode.trim() || busyKey !== null}
              onPress={() => {
                void onApplyCoupon(couponCode.trim());
              }}
            >
              {t("cart.applyCoupon")}
            </Button>
          )}
          <AppText variant="caption" tone="muted">
            {t("cart.couponRuleHint")}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function PriceRow({
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
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
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
