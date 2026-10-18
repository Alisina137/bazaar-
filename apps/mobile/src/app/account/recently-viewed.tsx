import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";

import { AppText, Button, Card, Screen, StateView } from "@/components/ui";
import { AccountBackLink } from "@/components/account/AccountBackLink";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { marketplaceHome } from "@/marketplace/api";
import { clearRecentProductIds, getRecentProductIds } from "@/marketplace/cache";

export default function RecentlyViewedScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const [products, setProducts] = useState<MarketplaceProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(false);
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    const run = async () => {
      setError(false);
      setLoading(true);
      try {
        const ids = await getRecentProductIds();
        if (!active) return;
        if (!ids.length) { setProducts([]); return; }
        const home = await marketplaceHome({ recentProductIds: ids });
        if (active) {
          const byId = new Map(home.recentlyViewed.map(item => [item.id, item]));
          setProducts(ids.flatMap(id => {
            const item = byId.get(id);
            return item ? [item] : [];
          }));
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [reload]));

  const clear = async () => {
    if (clearing) return;
    setClearing(true);
    setClearError(false);
    try {
      await clearRecentProductIds();
      setProducts([]);
    } catch {
      setClearError(true);
    } finally {
      setClearing(false);
    }
  };

  const confirmClear = () => {
    if (clearing || products.length === 0) return;
    Alert.alert(
      t("account.phase8.clearHistoryTitle"),
      t("account.phase8.clearHistoryPrompt"),
      [
        { text: t("support.hub.cancel"), style: "cancel" },
        {
          text: t("account.phase8.clearHistoryConfirm"),
          style: "destructive",
          onPress: () => { void clear(); }
        }
      ]
    );
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <AccountBackLink />
      <AppText variant="heading">{t("account.shopping.recent")}</AppText>
      <AppText tone="muted">{t("account.shopping.recentDescription")}</AppText>
      {loading ? (
        <StateView kind="loading" title={t("account.shopping.loading")} message={t("account.shopping.loadingHint")} />
      ) : error ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText tone="danger">{t("account.shopping.loadError")}</AppText>
            <Button variant="secondary" onPress={() => setReload(current => current + 1)}>
              {t("account.shopping.retry")}
            </Button>
          </View>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="bodyStrong">{t("account.shopping.recentEmpty")}</AppText>
            <Button onPress={() => router.push("/(tabs)/marketplace")}>
              {t("account.shopping.explore")}
            </Button>
          </View>
        </Card>
      ) : (
        <>
          <Button variant="secondary" disabled={clearing}
            loading={clearing} onPress={confirmClear}>
            {t("account.shopping.clearRecent")}
          </Button>
          {clearError ? (
            <AppText accessibilityRole="alert" tone="danger">
              {t("account.phase8.clearHistoryError")}
            </AppText>
          ) : null}
          {products.map(product => <MarketplaceProductCard product={product} key={product.id} />)}
        </>
      )}
    </Screen>
  );
}
