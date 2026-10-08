import type {
  GrowthCouponType,
  MerchantCouponRecord,
  MerchantPromotionRecord
} from "@bazaarlink/contracts";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "@/auth/provider";
import { useCatalog } from "@/catalog/provider";
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
import {
  GrowthApiError,
  coupons as loadCoupons,
  createCoupon,
  createPromotion,
  deleteCoupon,
  deletePromotion,
  promotions as loadPromotions
} from "@/growth/api";
import { growthErrorKey } from "@/growth/messages";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

function numeric(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function SellerDiscountsScreen() {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const { sessionToken } = useAuth();
  const { currentStore } = useStores();
  const { products, hasMore, loadingMore, loadMore } = useCatalog();

  const [couponRows, setCouponRows] = useState<MerchantCouponRecord[]>([]);
  const [promotionRows, setPromotionRows] = useState<MerchantPromotionRecord[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<GrowthCouponType>("percentage");
  const [couponValue, setCouponValue] = useState("");
  const [minimumOrder, setMinimumOrder] = useState("");
  const [couponStart, setCouponStart] = useState("");
  const [couponEnd, setCouponEnd] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [promotionName, setPromotionName] = useState("");
  const [promotionPrice, setPromotionPrice] = useState("");
  const [promotionStart, setPromotionStart] = useState(
    new Date().toISOString()
  );
  const [promotionEnd, setPromotionEnd] = useState(
    new Date(Date.now() + 7 * 86_400_000).toISOString()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GrowthApiError | null>(null);

  const entitled =
    Boolean(currentStore?.subscription.entitlements.coupons) &&
    Boolean(currentStore?.subscription.entitlements.promotions);

  const refresh = async () => {
    if (!sessionToken || !currentStore || !entitled) return;
    setError(null);
    try {
      const [couponResponse, promotionResponse] = await Promise.all([
        loadCoupons(sessionToken, currentStore.id),
        loadPromotions(sessionToken, currentStore.id)
      ]);
      setCouponRows(couponResponse.coupons);
      setPromotionRows(promotionResponse.promotions);
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    }
  };

  useEffect(() => {
    void refresh();
  }, [sessionToken, currentStore?.id, entitled]);

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

  if (!entitled) {
    return (
      <Screen>
        <AppText variant="title">{t("growth.discounts.title")}</AppText>
        <Card muted>
          <AppText tone="muted">{t("growth.discounts.planLocked")}</AppText>
        </Card>
      </Screen>
    );
  }

  const submitCoupon = async () => {
    if (!sessionToken) return;
    const value = numeric(couponValue);
    const minimum = minimumOrder.trim() ? numeric(minimumOrder) : null;
    if (value === null || (minimumOrder.trim() && minimum === null)) {
      setError(new GrowthApiError("invalid_request"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createCoupon(sessionToken, currentStore.id, {
        code: couponCode,
        type: couponType,
        value,
        minimumOrderAmount: minimum,
        startsAt: couponStart.trim() || null,
        endsAt: couponEnd.trim() || null
      });
      setCouponCode("");
      setCouponValue("");
      setMinimumOrder("");
      setCouponStart("");
      setCouponEnd("");
      await refresh();
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    } finally {
      setBusy(false);
    }
  };

  const submitPromotion = async () => {
    if (!sessionToken) return;
    const price = numeric(promotionPrice);
    if (!selectedProductId || price === null) {
      setError(new GrowthApiError("invalid_request"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createPromotion(sessionToken, currentStore.id, {
        productId: selectedProductId,
        name: promotionName,
        promotionalPrice: price,
        startsAt: promotionStart,
        endsAt: promotionEnd
      });
      setPromotionName("");
      setPromotionPrice("");
      await refresh();
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="title">{t("growth.discounts.title")}</AppText>

      {error ? (
        <Card muted>
          <AppText tone="danger">{t(growthErrorKey(error.code))}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="heading">{t("growth.discounts.coupons")}</AppText>
          <TextField
            label={t("growth.discounts.code")}
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Button
              variant={couponType === "percentage" ? "primary" : "secondary"}
              onPress={() => setCouponType("percentage")}
            >
              {t("growth.discounts.percentage")}
            </Button>
            <Button
              variant={couponType === "fixed" ? "primary" : "secondary"}
              onPress={() => setCouponType("fixed")}
            >
              {t("growth.discounts.fixed")}
            </Button>
          </View>
          <TextField
            label={t("growth.discounts.value")}
            value={couponValue}
            onChangeText={setCouponValue}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("growth.discounts.minimum")}
            value={minimumOrder}
            onChangeText={setMinimumOrder}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("growth.discounts.start")}
            value={couponStart}
            onChangeText={setCouponStart}
            autoCapitalize="none"
          />
          <TextField
            label={t("growth.discounts.end")}
            value={couponEnd}
            onChangeText={setCouponEnd}
            autoCapitalize="none"
          />
          <Button
            loading={busy}
            disabled={!couponCode.trim() || !couponValue.trim()}
            onPress={() => void submitCoupon()}
          >
            {t("growth.discounts.createCoupon")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          {couponRows.length === 0 ? (
            <AppText tone="muted">{t("growth.discounts.emptyCoupons")}</AppText>
          ) : (
            couponRows.map((coupon) => (
              <View
                key={coupon.id}
                style={{ gap: theme.spacing.sm }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: theme.spacing.md
                  }}
                >
                  <View style={{ flex: 1, gap: theme.spacing.xs }}>
                    <AppText variant="bodyStrong">{coupon.code}</AppText>
                    <AppText tone="muted">
                      {coupon.type === "percentage"
                        ? coupon.value + "%"
                        : coupon.value + " AFN"}
                    </AppText>
                  </View>
                  <Badge
                    label={coupon.active ? "ON" : "OFF"}
                    tone={coupon.active ? "success" : "neutral"}
                  />
                </View>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (!sessionToken) return;
                    void (async () => {
                      await deleteCoupon(
                        sessionToken,
                        currentStore.id,
                        coupon.id
                      );
                      await refresh();
                    })();
                  }}
                >
                  {t("growth.discounts.delete")}
                </Button>
              </View>
            ))
          )}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="heading">{t("growth.discounts.promotions")}</AppText>
          <AppText variant="label">{t("growth.discounts.product")}</AppText>
          <View style={{ gap: theme.spacing.sm }}>
            {products
              .filter((product) => product.status !== "archived")
              .map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => setSelectedProductId(product.id)}
                  style={{
                    padding: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    borderColor:
                      selectedProductId === product.id
                        ? theme.colors.primary
                        : theme.colors.borderStrong
                  }}
                >
                  <AppText variant="bodyStrong">{product.name}</AppText>
                  <AppText tone="muted">{product.price} AFN</AppText>
                </Pressable>
              ))}
            {hasMore ? (
              <Button
                variant="secondary"
                loading={loadingMore}
                onPress={() => void loadMore()}
              >
                +
              </Button>
            ) : null}
          </View>
          <TextField
            label={t("growth.discounts.name")}
            value={promotionName}
            onChangeText={setPromotionName}
          />
          <TextField
            label={t("growth.discounts.price")}
            value={promotionPrice}
            onChangeText={setPromotionPrice}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("growth.discounts.startRequired")}
            value={promotionStart}
            onChangeText={setPromotionStart}
            autoCapitalize="none"
          />
          <TextField
            label={t("growth.discounts.endRequired")}
            value={promotionEnd}
            onChangeText={setPromotionEnd}
            autoCapitalize="none"
          />
          <Button
            loading={busy}
            disabled={
              !selectedProductId ||
              !promotionName.trim() ||
              !promotionPrice.trim()
            }
            onPress={() => void submitPromotion()}
          >
            {t("growth.discounts.createPromotion")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          {promotionRows.length === 0 ? (
            <AppText tone="muted">{t("growth.discounts.emptyPromotions")}</AppText>
          ) : (
            promotionRows.map((promotion) => (
              <View key={promotion.id} style={{ gap: theme.spacing.sm }}>
                <AppText variant="bodyStrong">{promotion.name}</AppText>
                <AppText tone="muted">{promotion.productName}</AppText>
                <AppText>
                  {promotion.promotionalPrice} AFN
                </AppText>
                <AppText tone="muted">
                  {promotion.startsAt} → {promotion.endsAt}
                </AppText>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (!sessionToken) return;
                    void (async () => {
                      await deletePromotion(
                        sessionToken,
                        currentStore.id,
                        promotion.id
                      );
                      await refresh();
                    })();
                  }}
                >
                  {t("growth.discounts.delete")}
                </Button>
              </View>
            ))
          )}
        </View>
      </Card>
    </Screen>
  );
}
