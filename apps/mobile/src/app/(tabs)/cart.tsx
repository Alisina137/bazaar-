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
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  View
} from "react-native";

import { useAuth } from "@/auth/provider";
import {
  applyCartCoupon,
  getCart,
  removeCartCoupon,
  removeCartItemWithRecovery,
  CartPricingApiError,
  updateCartItem
} from "@/cart-pricing/api";
import { cartPricingRequestErrorKey } from "@/cart-pricing/messages";
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

export default function CartScreen({ onCartChange }: {
  onCartChange?: ((next: CartResponse) => void) | undefined;
} = {}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { status, sessionToken } = useAuth();
  const { formatAfn, formatNumber, isRTL, t } = useLocalization();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [errorRef, setErrorRef] = useState<string | null>(null);
  const requestEpoch = useRef(0);
  const mutationLock = useRef(false);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const visibleCart = loadedToken === sessionToken ? cart : null;

  const load = useCallback(async () => {
    const requestId = ++requestEpoch.current;
    if (status !== "signedIn" || !sessionToken) {
      setCart(null);
      setLoadedToken(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorKey(null);
    setErrorRef(null);

    try {
      const next = await getCart(sessionToken);
      if (requestId !== requestEpoch.current || mutationLock.current) return;
      setLoadedToken(sessionToken);
      setCart(next);
    } catch (error) {
      if (requestId !== requestEpoch.current || mutationLock.current) return;
      setErrorKey(cartPricingRequestErrorKey(error));
      setErrorRef(error instanceof CartPricingApiError ? error.reference : null);
    } finally {
      if (requestId === requestEpoch.current) setLoading(false);
    }
  }, [sessionToken, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => { requestEpoch.current += 1; };
    }, [load])
  );

  const run = async (
    key: string,
    action: (token: string) => Promise<CartResponse>
  ) => {
    if (!sessionToken || mutationLock.current) return;
    mutationLock.current = true;
    ++requestEpoch.current; // An earlier GET must not restore a deleted item.
    setLoading(false);
    setBusyKey(key);
    setErrorKey(null);
    setErrorRef(null);

    try {
      const next = await action(sessionToken);
      setLoadedToken(sessionToken);
      setCart(next);
      onCartChange?.(next);
    } catch (error) {
      setErrorKey(cartPricingRequestErrorKey(error));
    } finally {
      mutationLock.current = false;
      setBusyKey(null);
    }
  };

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          loadingVariant="cart"
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

  if (loading && !visibleCart) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          loadingVariant="cart"
          title={t("cart.loadingTitle")}
          message={t("cart.loadingMessage")}
        />
      </Screen>
    );
  }

  if (errorKey && !visibleCart) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("cart.errorTitle")}
          message={t(errorKey) + (errorRef ? "\n" + t("cart.error.reference") + ": " + errorRef : "")}
          actionLabel={t("cart.retry")}
          onAction={() => {
            void load();
          }}
        />
      </Screen>
    );
  }

  if (!visibleCart || visibleCart.itemCount === 0) {
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
    <Screen scrollKey="shopping-cart" refreshing={loading} onRefresh={() => { void load(); }} contentStyle={{ gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg }}>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="bodyStrong" style={{ fontSize: 17, lineHeight: 24 }}>{t("cart.title")}</AppText>
        <Badge label={formatNumber(visibleCart.itemCount) + " " + t("cart.itemCount")} tone="neutral" />
      </View>

      {visibleCart.priceChanged ? (
        <Card muted>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="bodyStrong" tone="danger">
              {t("cart.priceChangedTitle")}
            </AppText>
            <AppText variant="label" tone="muted">
              {t("cart.priceChangedMessage")}
            </AppText>
          </View>
        </Card>
      ) : null}

      {errorKey ? (
        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label" tone="danger" accessibilityRole="alert">{t(errorKey)}</AppText>
            {errorRef ? <AppText variant="caption" tone="muted">{t("cart.error.reference")}: {errorRef}</AppText> : null}
            <Button variant="secondary" onPress={() => { void load(); }}>
              {t("cart.retry")}
            </Button>
          </View>
        </Card>
      ) : null}

      {visibleCart.groups.map((group) => (
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
            Alert.alert(t("cart.removeConfirmTitle"), t("cart.removeConfirmMessage") + "\n" + item.name, [
              { text: t("support.hub.cancel"), style: "cancel" },
              {
                text: t("cart.remove"),
                style: "destructive",
                onPress: () => {
                  void run("item:" + itemId, token => removeCartItemWithRecovery(token, itemId));
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
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="bodyStrong" style={{ fontSize: 17, lineHeight: 23 }}>{t("cart.summary")}</AppText>
          <PriceRow
            label={t("cart.itemsSubtotal")}
            value={formatAfn(visibleCart.totals.itemsSubtotal)}
          />
          {visibleCart.totals.productDiscount > 0 ? (
            <PriceRow
              label={t("cart.productDiscount")}
              value={"-" + formatAfn(visibleCart.totals.productDiscount)}
            />
          ) : null}
          {visibleCart.totals.couponDiscount > 0 ? (
            <PriceRow
              label={t("cart.couponDiscount")}
              value={"-" + formatAfn(visibleCart.totals.couponDiscount)}
            />
          ) : null}
          <PriceRow
            label={t("cart.preDeliveryTotal")}
            value={formatAfn(visibleCart.totals.preDeliveryTotal)}
            emphasized
          />
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm, alignItems: "flex-start" }}>
            <Ionicons name="information-circle-outline" size={17} color={theme.colors.textMuted} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" tone="muted">
                {t("cart.deliveryPendingHint")}
              </AppText>
            </View>
          </View>
        </View>
      </Card>

      <Button
        fullWidth
        disabled={visibleCart.hasBlockingIssues || busyKey !== null || loading}
        onPress={() => router.push("/checkout")}
      >
        {t("cart.checkout")}
      </Button>

      {visibleCart.hasBlockingIssues ? (
        <AppText tone="danger">
          {t("cart.blockingIssues")}
        </AppText>
      ) : null}


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
  onRemove: (itemId: string) => void;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => Promise<void>;
}) {
  const theme = useAppTheme();
  const { isRTL, formatAfn, formatNumber, t } = useLocalization();
  const [couponCode, setCouponCode] = useState(group.coupon?.code ?? "");

  return (
    <Card>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm, paddingBottom: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
          <Ionicons name="storefront-outline" size={20} color={theme.colors.primary} />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <AppText variant="bodyStrong" style={{ fontSize: 15, lineHeight: 21 }} numberOfLines={2}>{group.store.name}</AppText>
            <AppText variant="caption" tone="muted">
              {group.store.province} · {group.store.cityDistrict}
            </AppText>
          </View>
          <Badge label={formatNumber(group.items.length)} tone="neutral" />
        </View>

        {group.items.map(item => (
          <View
            key={item.id}
            style={{
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border
            }}
          >
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: theme.spacing.md, alignItems: "flex-start"
            }}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  accessibilityLabel={item.name}
                  resizeMode="contain"
                  style={{
                    width: 76, height: 76,
                    borderRadius: theme.radii.md,
                    backgroundColor: theme.colors.surfaceMuted
                  }}
                />
              ) : (
                <View style={{
                  width: 76, height: 76, borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.surfaceMuted,
                  justifyContent: "center", alignItems: "center"
                }}>
                  <Ionicons name="image-outline" size={25} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <AppText variant="label" numberOfLines={2} style={{ fontSize: 14, lineHeight: 20 }}>
                  {item.name}
                </AppText>
                {item.variantTitle ? (
                  <AppText variant="caption" tone="muted" numberOfLines={2}>
                    {item.variantTitle}
                  </AppText>
                ) : null}
                <AppText variant="caption" tone="muted">
                  {formatAfn(item.unitPrice)} × {formatNumber(item.quantity)}
                </AppText>
                <AppText variant="bodyStrong" tone="primary" style={{ fontSize: 16, lineHeight: 22 }}>
                  {formatAfn(item.lineTotal)}
                </AppText>
              </View>
            </View>

            {(item.priceChanged || item.unavailableReason) ? (
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                flexWrap: "wrap", gap: theme.spacing.xs
              }}>
                {item.priceChanged ? (
                  <Badge label={t("cart.priceChangedBadge")} tone="warning" />
                ) : null}
                {item.unavailableReason ? (
                  <Badge label={t(issueKey(item.unavailableReason))} tone="danger" />
                ) : null}
              </View>
            ) : null}

            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", justifyContent: "space-between",
              gap: theme.spacing.sm
            }}>
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", gap: theme.spacing.xs,
                borderWidth: 1, borderColor: theme.colors.border,
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.surface
              }}>
                <QuantityButton
                  icon="remove"
                  label={t("cart.decreaseQuantity")}
                  disabled={busyKey !== null || item.quantity <= 1}
                  onPress={() => { void onUpdate(item.id, item.quantity - 1); }}
                />
                <AppText variant="label" align="center" style={{ minWidth: 24 }}>
                  {formatNumber(item.quantity)}
                </AppText>
                <QuantityButton
                  icon="add"
                  label={t("cart.increaseQuantity")}
                  disabled={busyKey !== null || item.quantity >= item.availableQuantity}
                  onPress={() => { void onUpdate(item.id, item.quantity + 1); }}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("cart.removeProduct") + ": " + item.name}
                accessibilityState={{ disabled: busyKey !== null, busy: busyKey === "item:" + item.id }}
                disabled={busyKey !== null}
                onPress={() => onRemove(item.id)}
                style={({ pressed }) => ({
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", justifyContent: "center",
                  gap: theme.spacing.xs,
                  minHeight: 44, paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.dangerSoft,
                  opacity: busyKey !== null ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1
                })}
              >
                {busyKey === "item:" + item.id ? (
                  <ActivityIndicator size="small" color={theme.colors.danger} />
                ) : (
                  <Ionicons name="trash-outline" size={17} color={theme.colors.danger} />
                )}
                <AppText variant="caption" tone="danger">{t("cart.remove")}</AppText>
              </Pressable>
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

function QuantityButton({
  icon,
  label,
  disabled,
  onPress
}: {
  icon: "add" | "remove";
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44, height: 44,
        alignItems: "center", justifyContent: "center",
        opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1
      })}
    >
      <Ionicons name={icon} size={19} color={theme.colors.primary} />
    </Pressable>
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
      <AppText
        variant={emphasized ? "bodyStrong" : "label"}
        tone={emphasized ? "default" : "muted"}
        style={emphasized ? { fontSize: 15, lineHeight: 22 } : undefined}
      >{label}</AppText>
      <AppText
        variant="bodyStrong"
        tone={emphasized ? "primary" : "default"}
        style={{ fontSize: 14, lineHeight: 22 }}
      >{value}</AppText>
    </View>
  );
}
