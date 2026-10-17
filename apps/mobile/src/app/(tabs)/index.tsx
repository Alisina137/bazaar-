import type { MarketplaceHomeResponse } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, View } from "react-native";

import { useAuth } from "@/auth/provider";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { AppText, Button, Card, Screen, StateView } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { marketplaceHome } from "@/marketplace/api";
import { getRecentProductIds, homeCacheKey, readHomeCache, writeHomeCache } from "@/marketplace/cache";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { locale, isRTL, t } = useLocalization();
  const { status } = useAuth();
  const [home, setHome] = useState<MarketplaceHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cached, setCached] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      setCached(false);
      const key = homeCacheKey();
      try {
        const recentProductIds = await getRecentProductIds();
        const fresh = await marketplaceHome({ recentProductIds });
        if (active) setHome(fresh);
        void writeHomeCache(key, fresh);
      } catch {
        const fallback = await readHomeCache(key, true);
        if (active) {
          if (fallback) setHome(fallback);
          setCached(Boolean(fallback));
          setError(!fallback);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [refreshKey]));

  const openMarketplace = () => router.push("/(tabs)/marketplace");
  const goToCategory = (categoryId: string) => router.push({
    pathname: "/(tabs)/marketplace",
    params: { categoryId }
  });
  const categoryLabel = (category: MarketplaceHomeResponse["categories"][number]) =>
    locale === "en" ? category.nameEn : locale === "ps-AF" ? category.namePs : category.nameFa;
  const rootCategories = home?.categories.filter((item) => !item.parentId).slice(0, 8) ?? [];
  const featuredProducts = home?.recommended.slice(0, 8) ?? [];
  const featuredStores = home?.featuredStores.slice(0, 6) ?? [];
  const hasContent = rootCategories.length > 0 || featuredProducts.length > 0 || featuredStores.length > 0;

  const iconAction = (
    icon: "language-outline" | "cart-outline" | "notifications-outline",
    label: string,
    onPress: () => void
  ) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({
        width: 46, height: 46, alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: theme.colors.border,
        borderRadius: theme.radii.md, backgroundColor: theme.colors.surface,
        opacity: pressed ? theme.opacity.pressed : 1
      })}>
      <Ionicons name={icon} size={22} color={theme.colors.text} />
    </Pressable>
  );

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg, paddingTop: theme.spacing.md }}>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm }}>
        <View style={{
          width: 42, height: 42, borderRadius: theme.radii.md,
          backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center"
        }}>
          <Ionicons name="storefront" size={23} color={theme.colors.onPrimary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="heading" numberOfLines={1}>{t("common.brandName")}</AppText>
        </View>
        {iconAction("language-outline", t("language.label"), () => setLanguageOpen((open) => !open))}
        {iconAction("cart-outline", t("nav.cart"), () => router.push("/(tabs)/cart"))}
        {iconAction("notifications-outline", t("account.notifications"), () =>
          router.push(status === "signedIn" ? "/notifications" : "/(tabs)/account"))}
      </View>

      {languageOpen ? <Card style={{ padding: theme.spacing.md }}><LanguageSwitcher compact /></Card> : null}

      <Pressable accessibilityRole="button" accessibilityLabel={t("marketplace.searchPlaceholder")}
        onPress={openMarketplace}
        style={({ pressed }) => ({
          minHeight: 52, flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radii.md, borderWidth: 1,
          borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surface,
          opacity: pressed ? theme.opacity.pressed : 1
        })}>
        <Ionicons name="search-outline" size={22} color={theme.colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" tone="muted" numberOfLines={1}>{t("marketplace.searchPlaceholder")}</AppText>
        </View>
        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={theme.colors.textMuted} />
      </Pressable>

      <View style={{
        padding: theme.spacing.xl, gap: theme.spacing.lg,
        borderRadius: theme.radii.xl, backgroundColor: theme.colors.primarySoft,
        borderWidth: 1, borderColor: theme.colors.border
      }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{t("home.shopLocal")}</AppText>
          </View>
          <Ionicons name="bag-handle-outline" size={40} color={theme.colors.primary} />
        </View>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
          <Button onPress={openMarketplace}>{t("home.exploreProducts")}</Button>
        </View>
      </View>

      {loading && !home ? (
        <View style={{ alignItems: "center", paddingVertical: theme.spacing["2xl"], gap: theme.spacing.sm }}>
          <ActivityIndicator color={theme.colors.primary} accessibilityLabel={t("marketplace.loadingTitle")} />
          <AppText tone="muted">{t("marketplace.loadingTitle")}</AppText>
        </View>
      ) : null}
      {error && !home ? (
        <StateView kind="error" title={t("marketplace.errorTitle")}
          message={t("marketplace.error.serviceUnavailable")}
          actionLabel={t("marketplace.retry")}
          onAction={() => setRefreshKey((key) => key + 1)} />
      ) : null}
      {cached ? <AppText variant="caption" tone="muted">{t("marketplace.cachedNotice")}</AppText> : null}
      {home && !loading && !hasContent ? (
        <StateView kind="empty" title={t("home.emptyTitle")}
          message={t("home.emptyMessage")} actionLabel={t("home.exploreProducts")}
          onAction={openMarketplace} />
      ) : null}

      {rootCategories.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title={t("marketplace.categories")} action={t("home.viewAll")} onPress={openMarketplace} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm }}>
            {rootCategories.map((category) => (
              <Pressable key={category.id} accessibilityRole="button"
                accessibilityLabel={categoryLabel(category)} onPress={() => goToCategory(category.id)}
                style={({ pressed }) => ({
                  width: 112, minHeight: 96, padding: theme.spacing.md,
                  backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg,
                  borderWidth: 1, borderColor: theme.colors.border,
                  alignItems: "center", justifyContent: "center", gap: theme.spacing.sm,
                  opacity: pressed ? theme.opacity.pressed : 1
                })}>
                <View style={{
                  width: 34, height: 34, borderRadius: theme.radii.full,
                  backgroundColor: theme.colors.primarySoft, alignItems: "center", justifyContent: "center"
                }}>
                  <Ionicons name="pricetag-outline" size={18} color={theme.colors.primary} />
                </View>
                <AppText variant="caption" align="center" numberOfLines={2}>{categoryLabel(category)}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {featuredProducts.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title={t("marketplace.recommended")} action={t("home.viewAll")} onPress={openMarketplace} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.md }}>
            {featuredProducts.map((product) => (
              <MarketplaceProductCard key={product.id} product={product} compact />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {featuredStores.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title={t("marketplace.featuredStores")} action={t("home.viewAll")} onPress={openMarketplace} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.md }}>
            {featuredStores.map(({ store }) => (
              <Pressable key={store.id} accessibilityRole="button" accessibilityLabel={store.name}
                onPress={() => router.push({ pathname: "/marketplace/store/[handle]", params: { handle: store.handle } })}
                style={({ pressed }) => ({
                  width: 172, minHeight: 120, overflow: "hidden",
                  backgroundColor: theme.colors.surface, borderColor: theme.colors.border,
                  borderWidth: 1, borderRadius: theme.radii.lg, opacity: pressed ? theme.opacity.pressed : 1
                })}>
                {store.coverImageUrl ? (
                  <Image source={{ uri: store.coverImageUrl }} resizeMode="cover"
                    accessibilityLabel={store.name}
                    style={{ height: 64, width: "100%", backgroundColor: theme.colors.surfaceMuted }} />
                ) : (
                  <View style={{
                    height: 64, alignItems: "center", justifyContent: "center",
                    backgroundColor: theme.colors.primarySoft
                  }}>
                    <Ionicons name="storefront-outline" size={26} color={theme.colors.primary} />
                  </View>
                )}
                <View style={{ padding: theme.spacing.sm, gap: theme.spacing.xs }}>
                  <AppText variant="label" numberOfLines={1}>{store.name}</AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>{store.province}</AppText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Screen>
  );
}

function SectionHeader({ title, action, onPress }: {
  title: string; action: string; onPress: () => void;
}) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  return (
    <View style={{
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center", gap: theme.spacing.sm
    }}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>{title}</AppText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={action + ": " + title}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 44, paddingHorizontal: theme.spacing.sm,
          justifyContent: "center", opacity: pressed ? theme.opacity.pressed : 1
        })}>
        <AppText variant="label" tone="primary">{action}</AppText>
      </Pressable>
    </View>
  );
}
