import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";

import { getWishlist, removeWishlistProduct, saveWishlistProduct } from "@/account/wishlist-api";
import { useAuth } from "@/auth/provider";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { AppText, Button } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

/**
 * One wishlist fetch per visible grid, not one request per product card.
 * Focus refreshes saves after returning from detail. Mutations only commit
 * local state after the API succeeds and are guarded by the current session.
 */
export function MarketplaceProductGrid({
  products
}: {
  products: MarketplaceProductSummary[];
}) {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const router = useRouter();
  const { status, sessionToken } = useAuth();

  const [savedIds, setSavedIds] = useState<Set<string> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [reload, setReload] = useState(0);

  const tokenRef = useRef(sessionToken);
  tokenRef.current = sessionToken;

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadError(false);
    setUpdateError(false);
    setSavedIds(null);
    setBusyIds([]);

    if (status !== "signedIn" || !sessionToken) {
      if (status === "signedOut") setSavedIds(new Set());
      return () => { active = false; };
    }

    void getWishlist(sessionToken).then(response => {
      if (active) setSavedIds(new Set(response.savedProductIds));
    }).catch(() => {
      if (active) setLoadError(true);
    });

    return () => { active = false; };
  }, [status, sessionToken, reload]));

  const toggleSaved = async (productId: string) => {
    if (status === "signedOut") {
      router.push("/(tabs)/account");
      return;
    }
    if (status !== "signedIn" || !sessionToken || !savedIds ||
        loadError || busyIds.includes(productId)) return;

    const token = sessionToken;
    const wasSaved = savedIds.has(productId);
    setUpdateError(false);
    setBusyIds(current => [...current, productId]);
    try {
      if (wasSaved) await removeWishlistProduct(token, productId);
      else await saveWishlistProduct(token, productId);
      if (tokenRef.current === token) {
        setSavedIds(previous => {
          if (!previous) return previous;
          const next = new Set(previous);
          if (wasSaved) next.delete(productId);
          else next.add(productId);
          return next;
        });
      }
    } catch {
      if (tokenRef.current === token) setUpdateError(true);
    } finally {
      if (tokenRef.current === token) {
        setBusyIds(current => current.filter(id => id !== productId));
      }
    }
  };

  const showSave = status === "signedOut" ||
    (status === "signedIn" && savedIds !== null && !loadError);

  return (
    <View style={{ gap: theme.spacing.md }}>
      {loadError && status === "signedIn" ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="caption" tone="danger" accessibilityRole="alert">
            {t("marketplace.phase4.wishlistLoadError")}
          </AppText>
          <Button variant="secondary" onPress={() => setReload(current => current + 1)}>
            {t("account.shopping.retry")}
          </Button>
        </View>
      ) : null}
      {updateError ? (
        <AppText variant="caption" tone="danger" accessibilityRole="alert">
          {t("account.shopping.saveError")}
        </AppText>
      ) : null}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: theme.spacing.md
      }}>
        {products.map(product => (
          <MarketplaceProductCard
            key={product.id} product={product} grid
            saved={Boolean(savedIds?.has(product.id))}
            saving={busyIds.includes(product.id)}
            onSavePress={showSave ? () => { void toggleSaved(product.id); } : undefined}
          />
        ))}
      </View>
    </View>
  );
}
