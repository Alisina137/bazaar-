import type { MarketplaceHomeResponse, MarketplaceProductSummary, MarketplaceSearchSuggestion } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { useAuth } from "@/auth/provider";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { MarketplaceCategoryTile } from "@/components/marketplace/MarketplaceCategoryTile";
import { MarketplaceSearchBox } from "@/components/marketplace/MarketplaceSearchBox";
import { MarketplaceSuggestions } from "@/components/marketplace/MarketplaceSuggestions";
import { MarketplaceStoreCard } from "@/components/marketplace/MarketplaceStoreCard";
import { HomeDealSpotlight } from "@/components/marketplace/HomeDealSpotlight";
import { HomeProductRail } from "@/components/marketplace/HomeProductRail";
import { HomeProvinceSelector } from "@/components/marketplace/HomeProvinceSelector";
import { HomeInterestPicker } from "@/components/marketplace/HomeInterestPicker";
import { HomeHeroBanner } from "@/components/marketplace/HomeHeroBanner";
import { HomeLoadingSkeleton } from "@/components/marketplace/HomeLoadingSkeleton";
import { HomeSectionHeader } from "@/components/marketplace/HomeSectionHeader";
import { AppText, Card, Screen, StateView } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { browseMarketplace, marketplaceHome } from "@/marketplace/api";
import { browseCacheKey, clearRecentProductIds, getRecentProductIds, homeCacheKey, readBrowseCache, readHomeCache, writeBrowseCache, writeHomeCache } from "@/marketplace/cache";
import { useMarketplaceSuggestions } from "@/marketplace/useMarketplaceSuggestions";
import { getDiscoveryProvince, provinceName, setDiscoveryProvince, type ProvinceName } from "@/marketplace/provinces";
import { getFavoriteCategories, setFavoriteCategories } from "@/marketplace/preferences";
import { orderRecentProducts, personalizeProducts } from "@/marketplace/personalize";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, locale, t } = useLocalization();
  const { status } = useAuth();
  const [home, setHome] = useState<MarketplaceHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cached, setCached] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState<ProvinceName | null>(null);
  const [provinceLoaded, setProvinceLoaded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<MarketplaceProductSummary[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const lastProvince = useRef<ProvinceName | null | undefined>(undefined);
  const { suggestions, suggestionsLoading } = useMarketplaceSuggestions(query);

  useEffect(() => {
    let active = true;
    void getDiscoveryProvince().then((saved) => {
      if (active) {
        setProvince(saved);
        setProvinceLoaded(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void getFavoriteCategories().then((stored) => {
      if (active) setFavorites(stored);
    });
    return () => { active = false; };
  }, []);

  const saveFavorites = (next: string[]) => {
    const allowed = new Set(home?.categories.filter((item) => !item.parentId)
      .map((item) => item.id) ?? []);
    const selected = next.filter((id) => allowed.has(id)).slice(0, 5);
    setFavorites(selected);
    void setFavoriteCategories(selected);
  };

  const clearHistory = () => {
    setRecentIds([]);
    setHome((current) => current ? { ...current, recentlyViewed: [] } : current);
    void clearRecentProductIds().then(() => setRefreshKey((key) => key + 1));
  };

  const chooseProvince = (next: ProvinceName | null) => {
    setProvince(next);
    void setDiscoveryProvince(next);
  };

  useFocusEffect(useCallback(() => {
    if (!provinceLoaded) return () => undefined;
    let active = true;
    const locationChanged = lastProvince.current !== province;
    lastProvince.current = province;
    if (locationChanged) setHome(null);
    const load = async () => {
      setLoading(true);
      setError(false);
      setCached(false);
      const key = homeCacheKey(province ?? undefined);
      try {
        const recentProductIds = await getRecentProductIds();
        if (active) setRecentIds(recentProductIds);
        const fresh = await marketplaceHome({
          ...(province ? { province } : {}),
          recentProductIds
        });
        if (active) {
          setHome({
            ...fresh,
            recentlyViewed: orderRecentProducts(fresh.recentlyViewed, recentProductIds)
          });
          setCached(false);
        }
        void writeHomeCache(key, fresh);
      } catch {
        const fallbackRaw = await readHomeCache(key, true);
        const recentProductIds = await getRecentProductIds();
        const fallback = fallbackRaw ? {
          ...fallbackRaw,
          recentlyViewed: orderRecentProducts(fallbackRaw.recentlyViewed, recentProductIds)
        } : null;
        if (active) {
          setRecentIds(recentProductIds);
          setHome(fallback);
          setCached(Boolean(fallback));
          setError(!fallback);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [refreshKey, province, provinceLoaded]));

  useFocusEffect(useCallback(() => {
    let active = true;
    // Fetch a bounded, real catalog sample for each explicitly selected
    // category. Never block the rest of Home if these calls fail.
    if (favorites.length === 0) {
      setFavoriteListings([]);
      setFavoritesLoading(false);
      return () => { active = false; };
    }

    const load = async () => {
      setFavoritesLoading(true);
      setFavoriteListings([]);
      const results = await Promise.all(favorites.map(async (categoryId) => {
        const input = {
          categoryId,
          ...(province ? { province } : {}),
          inStock: true,
          sort: "relevance" as const,
          offset: 0,
          limit: 10
        };
        const key = browseCacheKey(input);
        try {
          const response = await browseMarketplace(input);
          void writeBrowseCache(key, response);
          return response.products;
        } catch {
          const saved = await readBrowseCache(key, true);
          return saved?.products ?? [];
        }
      }));
      if (active) {
        setFavoriteListings(results.flat());
        setFavoritesLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [favorites, province]));

  const openMarketplace = () => router.push("/(tabs)/marketplace");
  const openResults = (params: {
    sort?: "relevance" | "popularity" | "newest";
    discount?: "true";
    province?: string;
  } = {}) => router.push({ pathname: "/(tabs)/marketplace", params });
  const goToCategory = (categoryId: string) => {
    setQuery("");
    router.push({
      pathname: "/(tabs)/marketplace",
      params: { categoryId }
    });
  };
  const submitSearch = () => {
    const q = query.trim();
    if (q) {
      router.push({ pathname: "/(tabs)/marketplace", params: { q } });
      setQuery("");
    } else {
      openMarketplace();
    }
  };
  const selectSuggestion = (suggestion: MarketplaceSearchSuggestion) => {
    setQuery("");
    if (suggestion.type === "product") {
      router.push({ pathname: "/marketplace/product/[productId]", params: { productId: suggestion.id } });
    } else if (suggestion.type === "category") {
      goToCategory(suggestion.id);
    } else if (suggestion.type === "store" && suggestion.handle) {
      router.push({ pathname: "/marketplace/store/[handle]", params: { handle: suggestion.handle } });
    } else if (suggestion.type === "store") {
      router.push({ pathname: "/(tabs)/marketplace", params: { storeId: suggestion.id } });
    } else {
      router.push({ pathname: "/(tabs)/marketplace", params: { brand: suggestion.label } });
    }
  };
  const rootCategories = home?.categories.filter((item) => !item.parentId).slice(0, 8) ?? [];
  const featuredStores = home?.featuredStores.slice(0, 6) ?? [];
  const spotlight = home?.deals.find((item) => item.inStock && item.hasDiscount);
  const personalized = personalizeProducts({
    home,
    favorites,
    extra: favoriteListings,
    recentIds,
    province
  });
  const hasContent = Boolean(home && (
    rootCategories.length ||
    featuredStores.length ||
    home.recommended.length || home.popular.length ||
    home.nearby.length || home.newest.length ||
    home.deals.length || home.recentlyViewed.length
  ));

  const iconAction = (
    icon: "language-outline" | "cart-outline" | "notifications-outline",
    label: string,
    onPress: () => void
  ) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({
        width: 44, height: 44, alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: theme.colors.border,
        borderRadius: theme.radii.lg, backgroundColor: theme.colors.surface,
        opacity: pressed ? theme.opacity.pressed : 1
      })}>
      <Ionicons name={icon} size={22} color={theme.colors.text} />
    </Pressable>
  );

  return (
    <Screen contentStyle={{ gap: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing["3xl"] }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
        gap: theme.spacing.sm, paddingVertical: theme.spacing.sm,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border
      }}>
        <View style={{
          width: 44, height: 44, borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center"
        }}>
          <Ionicons name="storefront" size={24} color={theme.colors.onPrimary} />
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

      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        flexWrap: "wrap", gap: theme.spacing.sm, alignItems: "center"
      }}>
        <HomeProvinceSelector value={province} onChange={chooseProvince} />
        <HomeInterestPicker
          categories={home?.categories.filter((item) => !item.parentId) ?? []}
          favorites={favorites}
          recentCount={recentIds.length}
          onSave={saveFavorites}
          onClearHistory={clearHistory}
        />
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <MarketplaceSearchBox value={query} onChangeText={setQuery} onSubmit={submitSearch} />
        <MarketplaceSuggestions
          query={query}
          items={suggestions}
          loading={suggestionsLoading}
          categories={home?.categories}
          onSelect={selectSuggestion}
          onSearchAll={submitSearch}
        />
      </View>

      {spotlight ? (
        <HomeDealSpotlight product={spotlight} />
      ) : (
        <HomeHeroBanner />
      )}

      {loading && !home ? <HomeLoadingSkeleton /> : null}
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
          <HomeSectionHeader title={t("marketplace.categories")} icon="grid-outline" onViewAll={openMarketplace} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
            {rootCategories.map((category) => (
              <MarketplaceCategoryTile key={category.id} category={category} onPress={() => goToCategory(category.id)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <HomeProductRail
        icon="sparkles-outline"
        title={t("home.forYou")}
        products={personalized}
      />
      {favoritesLoading && favorites.length > 0 ? (
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm, alignItems: "center" }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <AppText variant="caption" tone="muted">{t("home.findingForYou")}</AppText>
        </View>
      ) : null}
      <HomeProductRail
        icon="compass-outline"
        title={t("marketplace.recommended")}
        products={home?.recommended ?? []}
        onViewAll={() => openResults({ sort: "relevance" })}
      />
      <HomeProductRail
        icon="flame-outline"
        title={t("marketplace.popular")}
        products={home?.popular ?? []}
        onViewAll={() => openResults({ sort: "popularity" })}
      />
      <HomeProductRail
        icon="flash-outline"
        title={t("home.newArrivals")}
        products={home?.newest ?? []}
        onViewAll={() => openResults({ sort: "newest" })}
      />
      <HomeProductRail
        icon="pricetags-outline"
        title={t("home.discountedProducts")}
        products={home?.deals ?? []}
        onViewAll={() => openResults({ discount: "true" })}
      />

      {province ? (
        <View style={{ gap: theme.spacing.sm }}>
          {home?.nearby.length ? (
            <HomeProductRail
              icon="location-outline"
              title={t("home.provinceProducts") + " · " + provinceName(province, locale)}
              products={home.nearby}
              onViewAll={() => openResults({ province })}
            />
          ) : home && !loading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.noProvinceProducts")}
              onPress={() => openResults({ province })}
              style={{ padding: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.surfaceMuted }}
            >
              <AppText variant="label">{t("home.provinceProducts") + " · " + provinceName(province, locale)}</AppText>
              <AppText variant="caption" tone="muted">{t("home.noProvinceProducts")}</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <HomeProductRail
        icon="time-outline"
        title={t("marketplace.recentlyViewed")}
        products={home?.recentlyViewed ?? []}
      />

      {featuredStores.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <HomeSectionHeader title={t("marketplace.featuredStores")} icon="storefront-outline" onViewAll={openMarketplace} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.md, paddingVertical: theme.spacing.xs }}>
            {featuredStores.map((featured) => (
              <MarketplaceStoreCard key={featured.store.id} featured={featured} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Screen>
  );
}

