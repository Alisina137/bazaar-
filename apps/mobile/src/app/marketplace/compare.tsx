import type { MarketplaceProductDetail } from "@bazaarlink/contracts";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { AppText, Button, Card, Screen, StateView } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { marketplaceProduct } from "@/marketplace/api";
import {
  clearCompareProducts,
  getCompareProductIds,
  removeCompareProduct
} from "@/marketplace/compare";
import { isProvinceName, provinceName } from "@/marketplace/provinces";

export default function MarketplaceCompareScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, isRTL, locale, formatAfn, formatNumber } = useLocalization();
  const [products, setProducts] = useState<MarketplaceProductDetail[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [reload, setReload] = useState(0);

  const load = useCallback(async (active: () => boolean) => {
    setLoading(true);
    setError(false);
    try {
      const ids = await getCompareProductIds();
      if (active()) setSelectedCount(ids.length);
      const results = await Promise.all(ids.map(async id => {
        try {
          const result = await marketplaceProduct(id);
          return result.product;
        } catch {
          return null;
        }
      }));
      if (!active()) return;
      const valid = results.filter((item): item is MarketplaceProductDetail => item !== null);
      setProducts(valid);
      if (valid.length !== ids.length) setError(true);
    } catch {
      if (active()) setError(true);
    } finally {
      if (active()) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load, reload]));

  const remove = async (id: string) => {
    if (busyId || clearing) return;
    setBusyId(id);
    try {
      await removeCompareProduct(id);
      setProducts(current => current.filter(product => product.id !== id));
      setSelectedCount(current => Math.max(0, current - 1));
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const clear = async () => {
    if (clearing || busyId) return;
    setClearing(true);
    try {
      await clearCompareProducts();
      setProducts([]);
      setSelectedCount(0);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setClearing(false);
    }
  };

  const categoryLabel = (product: MarketplaceProductDetail) => {
    const category = product.marketplaceCategory;
    if (!category) return "—";
    return locale === "en" ? category.nameEn : locale === "ps-AF" ? category.namePs : category.nameFa;
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        justifyContent: "space-between", alignItems: "center",
        gap: theme.spacing.sm
      }}>
        <Button variant="ghost" onPress={() => router.back()}>{t("marketplace.back")}</Button>
        <AppText variant="heading">{t("marketplace.compare.title")}</AppText>
      </View>
      <AppText tone="muted">{t("marketplace.compare.description")}</AppText>
      {loading ? (
        <StateView kind="loading" title={t("account.shopping.loading")} message={t("account.shopping.loadingHint")} />
      ) : null}
      {!loading && !error && selectedCount === 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText>{t("marketplace.compare.empty")}</AppText>
            <Button onPress={() => router.replace("/(tabs)/marketplace")}>{t("marketplace.compare.addMore")}</Button>
          </View>
        </Card>
      ) : null}
      {error ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText tone="danger">{t("marketplace.compare.loadError")}</AppText>
            <Button variant="secondary" onPress={() => setReload(value => value + 1)}>{t("account.shopping.retry")}</Button>
          </View>
        </Card>
      ) : null}
      {!loading && products.length > 0 ? (
        <>
          <AppText variant="caption" tone="muted">{formatNumber(selectedCount)} / 4</AppText>
          <View style={{ gap: theme.spacing.md }}>
            {products.map(product => {
              const location = isProvinceName(product.store.province)
                ? provinceName(product.store.province, locale)
                : product.store.province;
              const hasDiscount = product.compareAtPrice !== null && product.compareAtPrice > product.price;
              return (
                <Card key={product.id}>
                  <View style={{ gap: theme.spacing.sm }}>
                    <AppText variant="title">{product.name}</AppText>
                    <AppText variant="heading" tone="primary">{t("marketplace.compare.price")}: {formatAfn(product.price)}</AppText>
                    {hasDiscount ? (
                      <AppText variant="caption" tone="muted">{t("marketplace.compare.originalPrice")}: {formatAfn(product.compareAtPrice ?? product.price)}</AppText>
                    ) : null}
                    <View style={{ gap: theme.spacing.xs }}>
                      <AppText>{t("marketplace.compare.rating")}: {product.averageRating === null ? "—" : formatNumber(product.averageRating)}</AppText>
                      <AppText>{t("marketplace.compare.reviews")}: {formatNumber(product.reviewCount)}</AppText>
                      <AppText>{t("marketplace.compare.availability")}: {t(product.inStock ? "marketplace.compare.inStock" : "marketplace.compare.outOfStock")}</AppText>
                      <AppText>{t("marketplace.compare.seller")}: {product.store.name}</AppText>
                      <AppText>{t("marketplace.compare.location")}: {location}</AppText>
                      <AppText>{t("marketplace.compare.category")}: {categoryLabel(product)}</AppText>
                    </View>
                    <Button variant="secondary" onPress={() => router.push({
                      pathname: "/marketplace/product/[productId]",
                      params: { productId: product.id }
                    })}>{t("marketplace.phase4.openDetails")}</Button>
                    <Button variant="ghost" disabled={busyId !== null || clearing} loading={busyId === product.id}
                      onPress={() => void remove(product.id)}>{t("marketplace.compare.removeItem")}</Button>
                  </View>
                </Card>
              );
            })}
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <Button variant="secondary" disabled={clearing || busyId !== null} loading={clearing} onPress={() => void clear()}>
              {t("marketplace.compare.clear")}
            </Button>
            <Button onPress={() => router.replace("/(tabs)/marketplace")}>{t("marketplace.compare.addMore")}</Button>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
