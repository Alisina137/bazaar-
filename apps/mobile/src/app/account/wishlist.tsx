import { useFocusEffect, useRouter } from "expo-router";
import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import { AppText, Button, Card, Screen, StateView } from "@/components/ui";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  getWishlist, removeWishlistProduct
} from "@/account/wishlist-api";

export default function WishlistScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, formatNumber } = useLocalization();
  const { status, sessionToken } = useAuth();
  const [items, setItems] = useState<MarketplaceProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removeError, setRemoveError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (status !== "signedIn" || !sessionToken) {
      setItems([]);
      setLoading(false);
      return () => { active = false; };
    }
    setItems([]);
    setLoading(true);
    setError(false);
    setRemoveError(false);
    void getWishlist(sessionToken).then(data => {
      if (active) setItems(data.products);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [status, sessionToken, reload]));

  const remove = async (id: string) => {
    if (!sessionToken || busyId) return;
    setBusyId(id);
    setRemoveError(false);
    try {
      await removeWishlistProduct(sessionToken, id);
      setItems(current => current.filter(product => product.id !== id));
    } catch {
      // Keep the product visible so the customer can retry the removal.
      setRemoveError(true);
    } finally {
      setBusyId(null);
    }
  };

  if (status === "loading") return (
    <Screen scrollable={false}>
      <StateView kind="loading" title={t("auth.restoringTitle")} message={t("auth.restoringMessage")} />
    </Screen>
  );

  if (status !== "signedIn") return (
    <Screen>
      <Card>
        <AppText>{t("account.shopping.signInRequired")}</AppText>
        <Button onPress={() => router.replace("/(tabs)/account")}>
          {t("auth.signInAction")}
        </Button>
      </Card>
    </Screen>
  );

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <AppText variant="heading">{t("account.shopping.wishlist")}</AppText>
      <AppText tone="muted">{t("account.shopping.wishlistDescription")}</AppText>
      {loading ? (
        <StateView kind="loading" title={t("account.shopping.loading")} message={t("account.shopping.loadingHint")} />
      ) : null}
      {error ? (
        <Card>
          <AppText tone="danger">{t("account.shopping.loadError")}</AppText>
          <Button variant="secondary" onPress={() => setReload(value => value + 1)}>
            {t("account.shopping.retry")}
          </Button>
        </Card>
      ) : null}
      {!loading && items.length === 0 && !error ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="bodyStrong">{t("account.shopping.wishlistEmpty")}</AppText>
            <Button onPress={() => router.push("/(tabs)/marketplace")}>
              {t("account.shopping.explore")}
            </Button>
          </View>
        </Card>
      ) : null}
      {removeError ? (
        <AppText accessibilityRole="alert" tone="danger">
          {t("account.phase8.wishlistRemoveError")}
        </AppText>
      ) : null}
      {!loading && items.length > 0 ? (
        <AppText variant="caption" tone="muted">
          {formatNumber(items.length)} {t("account.shopping.items")}
        </AppText>
      ) : null}
      {!loading && items.map(item => (
        <View key={item.id} style={{ gap: theme.spacing.xs }}>
          <MarketplaceProductCard product={item} />
          <Button variant="secondary" disabled={busyId !== null}
            loading={busyId === item.id} onPress={() => void remove(item.id)}>
            {t("account.shopping.remove")}
          </Button>
        </View>
      ))}
    </Screen>
  );
}
