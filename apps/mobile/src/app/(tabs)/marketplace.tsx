import type {
  MarketplaceBrowseResponse,
  MarketplaceCategoryRecord,
  MarketplaceHomeResponse,
  MarketplaceSearchSuggestion,
  MarketplaceSort
} from "@bazaarlink/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Pressable,
  ScrollView,
  View
} from "react-native";

import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { MarketplaceCategoryTile } from "@/components/marketplace/MarketplaceCategoryTile";
import { MarketplaceSearchBox } from "@/components/marketplace/MarketplaceSearchBox";
import { MarketplaceSuggestions } from "@/components/marketplace/MarketplaceSuggestions";
import {
  AppText,
  Button,
  Card,
  Screen,
  StateView,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  browseMarketplace,
  marketplaceHome,
  MarketplaceApiError,
  type BrowseMarketplaceInput
} from "@/marketplace/api";
import {
  browseCacheKey,
  getRecentProductIds,
  homeCacheKey,
  readBrowseCache,
  readHomeCache,
  writeBrowseCache,
  writeHomeCache
} from "@/marketplace/cache";
import { marketplaceErrorKey } from "@/marketplace/messages";
import { useMarketplaceSuggestions } from "@/marketplace/useMarketplaceSuggestions";

function localizedCategoryName(
  category: MarketplaceCategoryRecord,
  locale: "fa-AF" | "ps-AF" | "en"
) {
  switch (locale) {
    case "ps-AF":
      return category.namePs;
    case "en":
      return category.nameEn;
    case "fa-AF":
    default:
      return category.nameFa;
  }
}

function optionalPrice(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { categoryId: linkedCategoryId, q: linkedQuery, brand: linkedBrand, storeId: linkedStoreId } =
    useLocalSearchParams<{ categoryId?: string; q?: string; brand?: string; storeId?: string }>();
  const theme = useAppTheme();
  const { locale, isRTL, formatNumber, t } = useLocalization();

  const [home, setHome] = useState<MarketplaceHomeResponse | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<MarketplaceApiError | null>(null);
  const [usingCachedHome, setUsingCachedHome] = useState(false);

  const [query, setQuery] = useState(linkedQuery ?? "");
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(linkedQuery?.trim() ?? null);
  const [province, setProvince] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [verifiedStoreOnly, setVerifiedStoreOnly] = useState(false);
  const [sort, setSort] = useState<MarketplaceSort>("relevance");
  const [categoryId, setCategoryId] = useState<string | undefined>(linkedCategoryId);
  const [storeId, setStoreId] = useState<string | undefined>(linkedStoreId);
  const [brand, setBrand] = useState<string | undefined>(linkedBrand);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const browseRequestId = useRef(0);

  const [browse, setBrowse] = useState<MarketplaceBrowseResponse | null>(null);
  const [browseInput, setBrowseInput] = useState<BrowseMarketplaceInput | null>(
    null
  );
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoadingMore, setBrowseLoadingMore] = useState(false);
  const [browseError, setBrowseError] = useState<MarketplaceApiError | null>(null);
  const [usingCachedBrowse, setUsingCachedBrowse] = useState(false);

  const { suggestions, suggestionsLoading } = useMarketplaceSuggestions(query);

  const loadHome = useCallback(async (nearbyProvince?: string) => {
    setHomeLoading(true);
    setHomeError(null);
    setUsingCachedHome(false);

    const key = homeCacheKey(nearbyProvince);

    try {
      const recentProductIds = await getRecentProductIds();
      const response = await marketplaceHome({
        ...(nearbyProvince ? { province: nearbyProvince } : {}),
        recentProductIds
      });

      setHome(response);
      await writeHomeCache(key, response);
    } catch (error) {
      const safeError =
        error instanceof MarketplaceApiError
          ? error
          : new MarketplaceApiError("service_unavailable");
      const cached = await readHomeCache(key, true);

      if (cached) {
        setHome(cached);
        setUsingCachedHome(true);
      } else {
        setHomeError(safeError);
      }
    } finally {
      setHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const rootCategories = useMemo(
    () => home?.categories.filter((category) => category.parentId === null) ?? [],
    [home]
  );

  const executeBrowse = useCallback(
    async (
      input: BrowseMarketplaceInput,
      append = false
    ) => {
      const requestId = ++browseRequestId.current;
      if (append) {
        setBrowseLoadingMore(true);
      } else {
        setBrowseLoading(true);
        setBrowseError(null);
        setUsingCachedBrowse(false);
      }

      const key = browseCacheKey(input);

      try {
        const response = await browseMarketplace(input);
        if (requestId !== browseRequestId.current) return;

        if (append) {
          setBrowse((current) => {
            if (!current) return response;
            const known = new Set(current.products.map((product) => product.id));

            return {
              ...response,
              products: [
                ...current.products,
                ...response.products.filter((product) => !known.has(product.id))
              ]
            };
          });
        } else {
          setBrowse(response);
          setBrowseInput(input);
          await writeBrowseCache(key, response);
        }
      } catch (error) {
        if (requestId !== browseRequestId.current) return;
        const safeError =
          error instanceof MarketplaceApiError
            ? error
            : new MarketplaceApiError("service_unavailable");

        if (!append) {
          const cached = await readBrowseCache(key, true);
          if (cached) {
            setBrowse(cached);
            setBrowseInput(input);
            setUsingCachedBrowse(true);
          } else {
            setBrowseError(safeError);
          }
        }
      } finally {
        if (requestId === browseRequestId.current) {
          if (append) {
            setBrowseLoadingMore(false);
          } else {
            setBrowseLoading(false);
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!linkedCategoryId && !linkedQuery && !linkedBrand && !linkedStoreId) return;
    setCategoryId(linkedCategoryId);
    setStoreId(linkedStoreId);
    setBrand(linkedBrand);
    setQuery(linkedQuery ?? "");
    setDismissedQuery(linkedQuery?.trim() ?? null);
    void executeBrowse({
      ...(linkedCategoryId ? { categoryId: linkedCategoryId } : {}),
      ...(linkedQuery ? { q: linkedQuery } : {}),
      ...(linkedBrand ? { brand: linkedBrand } : {}),
      ...(linkedStoreId ? { storeId: linkedStoreId } : {}),
      sort: "relevance", offset: 0, limit: 20
    });
  }, [linkedCategoryId, linkedQuery, linkedBrand, linkedStoreId, executeBrowse]);

  const applyBrowse = useCallback(
    async (overrides: Partial<BrowseMarketplaceInput> = {}) => {
      const parsedMin = optionalPrice(minPrice);
      const parsedMax = optionalPrice(maxPrice);

      if (
        (minPrice.trim() && parsedMin === undefined) ||
        (maxPrice.trim() && parsedMax === undefined) ||
        (parsedMin !== undefined &&
          parsedMax !== undefined &&
          parsedMin > parsedMax)
      ) {
        setBrowseError(new MarketplaceApiError("invalid_request"));
        return;
      }

      const next: BrowseMarketplaceInput = {
        sort,
        offset: 0,
        limit: 20,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(parsedMin !== undefined ? { minPrice: parsedMin } : {}),
        ...(parsedMax !== undefined ? { maxPrice: parsedMax } : {}),
        ...(province.trim() ? { province: province.trim() } : {}),
        ...(storeId ? { storeId } : {}),
        ...(brand ? { brand } : {}),
        ...(inStockOnly ? { inStock: true } : {}),
        ...(dealsOnly ? { discount: true } : {}),
        ...(minRating !== undefined ? { minRating } : {}),
        ...(verifiedStoreOnly ? { verifiedStore: true } : {}),
        ...overrides
      };

      await executeBrowse(next);
      if (next.province) {
        void loadHome(next.province);
      }
    },
    [
      brand,
      categoryId,
      dealsOnly,
      executeBrowse,
      inStockOnly,
      loadHome,
      minRating,
      maxPrice,
      minPrice,
      province,
      query,
      sort,
      storeId,
      verifiedStoreOnly
    ]
  );

  const clearDiscovery = () => {
    browseRequestId.current++;
    setBrowseLoading(false);
    setBrowseLoadingMore(false);
    setQuery("");
    setDismissedQuery(null);
    setProvince("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setDealsOnly(false);
    setMinRating(undefined);
    setVerifiedStoreOnly(false);
    setSort("relevance");
    setCategoryId(undefined);
    setStoreId(undefined);
    setBrand(undefined);
    setBrowse(null);
    setBrowseInput(null);
    setBrowseError(null);
    if (linkedCategoryId || linkedQuery || linkedBrand || linkedStoreId) {
      router.replace("/(tabs)/marketplace");
    }
    void loadHome();
  };

  const submitSearch = () => {
    setDismissedQuery(query.trim());
    setCategoryId(undefined);
    setStoreId(undefined);
    setBrand(undefined);
    void applyBrowse({ q: query.trim() || undefined, categoryId: undefined, storeId: undefined, brand: undefined });
  };

  const chooseCategory = (id: string) => {
    setQuery("");
    setCategoryId(id);
    setStoreId(undefined);
    setBrand(undefined);
    void applyBrowse({ categoryId: id, q: undefined, storeId: undefined, brand: undefined });
  };

  const chooseSuggestion = (suggestion: MarketplaceSearchSuggestion) => {
    setQuery("");
    if (suggestion.type === "product") {
      router.push({ pathname: "/marketplace/product/[productId]", params: { productId: suggestion.id } });
    } else if (suggestion.type === "category") {
      chooseCategory(suggestion.id);
    } else if (suggestion.type === "store" && suggestion.handle) {
      router.push({ pathname: "/marketplace/store/[handle]", params: { handle: suggestion.handle } });
    } else if (suggestion.type === "store") {
      setStoreId(suggestion.id);
      setCategoryId(undefined);
      setBrand(undefined);
      void applyBrowse({ storeId: suggestion.id, categoryId: undefined, q: undefined, brand: undefined });
    } else {
      setBrand(suggestion.label);
      setStoreId(undefined);
      setCategoryId(undefined);
      void applyBrowse({ brand: suggestion.label, storeId: undefined, categoryId: undefined, q: undefined });
    }
  };

  const categoryLabel = categoryId
    ? home?.categories.find((category) => category.id === categoryId)
    : undefined;
  const childCategories = home?.categories.filter((category) => category.parentId === categoryId) ?? [];
  const activeFilterCount = [
    categoryId, storeId, brand, province.trim(), minPrice.trim(), maxPrice.trim(),
    inStockOnly, dealsOnly, minRating !== undefined, verifiedStoreOnly
  ].filter(Boolean).length;

  return (
    <Screen>
      <AppText variant="heading">{t("marketplace.title")}</AppText>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <MarketplaceSearchBox value={query} onChangeText={(text) => { setQuery(text); setDismissedQuery(null); }} onSubmit={submitSearch} />
          {dismissedQuery !== query.trim() ? (
            <MarketplaceSuggestions
              query={query} items={suggestions} loading={suggestionsLoading}
              categories={home?.categories} onSelect={chooseSuggestion} onSearchAll={submitSearch}
            />
          ) : null}

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                fullWidth
                loading={browseLoading}
                onPress={submitSearch}
              >
                {t("marketplace.searchAction")}
              </Button>
            </View>
            <Button
              variant="secondary"
              onPress={() => setFiltersOpen((value) => !value)}
            >
              {t("marketplace.filters") + (activeFilterCount ? " · " + formatNumber(activeFilterCount) : "")}
            </Button>
          </View>

          {filtersOpen ? (
            <View style={{ gap: theme.spacing.md }}>
              <TextField
                label={t("marketplace.filter.province")}
                value={province}
                onChangeText={setProvince}
              />
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t("marketplace.filter.minPrice")}
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t("marketplace.filter.maxPrice")}
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Button
                variant={inStockOnly ? "primary" : "secondary"}
                onPress={() => setInStockOnly((value) => !value)}
              >
                {t("marketplace.filter.inStock")}
              </Button>
              <Button
                variant={dealsOnly ? "primary" : "secondary"}
                onPress={() => setDealsOnly((value) => !value)}
              >
                {t("marketplace.filter.deals")}
              </Button>

              <AppText variant="label">{t("marketplace.filter.rating")}</AppText>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
                {[3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    variant={minRating === value ? "primary" : "secondary"}
                    onPress={() =>
                      setMinRating((current) =>
                        current === value ? undefined : value
                      )
                    }
                  >
                    {"★ " + value + "+"}
                  </Button>
                ))}
              </View>
              <Button
                variant={verifiedStoreOnly ? "primary" : "secondary"}
                onPress={() => setVerifiedStoreOnly((value) => !value)}
              >
                {t("marketplace.filter.verifiedStore")}
              </Button>

              <AppText variant="label">{t("marketplace.sort.label")}</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: theme.spacing.sm, flexDirection: isRTL ? "row-reverse" : "row" }}>
              {(
                [
                  ["relevance", "marketplace.sort.relevance"],
                  ["newest", "marketplace.sort.newest"],
                  ["price_asc", "marketplace.sort.priceLowHigh"],
                  ["price_desc", "marketplace.sort.priceHighLow"],
                  ["rating", "marketplace.sort.rating"],
                  ["popularity", "marketplace.sort.popularity"]
                ] as const
              ).map(([value, key]) => (
                <Button
                  key={value}
                  variant={sort === value ? "primary" : "secondary"}
                  onPress={() => setSort(value)}
                >
                  {t(key)}
                </Button>
              ))}
              </ScrollView>

              <Button
                fullWidth
                onPress={() => {
                  void applyBrowse();
                  setFiltersOpen(false);
                }}
              >
                {t("marketplace.applyFilters")}
              </Button>
              <Button variant="ghost" onPress={clearDiscovery}>
                {t("marketplace.clearFilters")}
              </Button>
            </View>
          ) : null}
        </View>
      </Card>

      {homeLoading && !home && !browse ? (
        <StateView
          kind="loading"
          title={t("marketplace.loadingTitle")}
          message={t("marketplace.loadingMessage")}
        />
      ) : null}

      {homeError && !home && !browse ? (
        <StateView
          kind="error"
          title={t("marketplace.errorTitle")}
          message={t(marketplaceErrorKey(homeError.code))}
          actionLabel={t("marketplace.retry")}
          onAction={() => {
            void loadHome();
          }}
        />
      ) : null}

      {usingCachedHome || usingCachedBrowse ? (
        <Card muted>
          <AppText variant="caption" tone="muted">
            {t("marketplace.cachedNotice")}
          </AppText>
        </Card>
      ) : null}

      {browseLoading && !browse ? <StateView kind="loading" title={t("marketplace.searching")} /> : null}
      {browseError && !browse ? (
        <StateView kind="error" title={t("marketplace.errorTitle")}
          message={t(marketplaceErrorKey(browseError.code))}
          actionLabel={t("marketplace.retry")} onAction={submitSearch} />
      ) : null}

      {browse ? (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="heading">{t("marketplace.results")}</AppText>
            <AppText variant="caption" tone="muted">{t("marketplace.productCount") + ": " + formatNumber(browse.pageInfo.total)}</AppText>
            <AppText variant="caption" tone="muted">
              {categoryLabel
                ? localizedCategoryName(categoryLabel, locale)
                : query.trim() || t("marketplace.allProducts")}
            </AppText>
          </View>

          {childCategories.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="bodyStrong">{t("marketplace.subcategories")}</AppText>
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                flexWrap: "wrap", justifyContent: "space-between", gap: theme.spacing.sm
              }}>
                {childCategories.map((category) => (
                  <MarketplaceCategoryTile grid key={category.id} category={category}
                    onPress={() => chooseCategory(category.id)} />
                ))}
              </View>
            </View>
          ) : null}

          {browse.products.length === 0 ? (
            <StateView
              kind="empty"
              title={t("marketplace.noResultsTitle")}
              message={t("marketplace.noResultsMessage")}
              actionLabel={t("marketplace.clearFilters")}
              onAction={clearDiscovery}
            />
          ) : (
            <View style={{ gap: theme.spacing.lg }}>
              {browse.products.map((product) => (
                <MarketplaceProductCard key={product.id} product={product} />
              ))}

              {browse.pageInfo.hasMore && browseInput ? (
                <Button
                  variant="secondary"
                  loading={browseLoadingMore}
                  onPress={() => {
                    const next = {
                      ...browseInput,
                      offset:
                        (browse?.products.length ?? 0)
                    };
                    void executeBrowse(next, true);
                  }}
                >
                  {t("marketplace.loadMore")}
                </Button>
              ) : null}
            </View>
          )}

          {browseError ? (
            <AppText tone="danger">
              {t(marketplaceErrorKey(browseError.code))}
            </AppText>
          ) : null}

          <Button variant="ghost" onPress={clearDiscovery}>
            {t("marketplace.backHome")}
          </Button>
        </View>
      ) : home ? (
        <View style={{ gap: theme.spacing["2xl"] }}>
          {rootCategories.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="heading">{t("marketplace.categories")}</AppText>
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                flexWrap: "wrap", justifyContent: "space-between", gap: theme.spacing.sm
              }}>
                {rootCategories.map((category) => (
                  <MarketplaceCategoryTile grid key={category.id} category={category}
                    onPress={() => chooseCategory(category.id)} />
                ))}
              </View>
            </View>
          ) : null}

          <ProductSection
            title={t("marketplace.recommended")}
            products={home.recommended}
          />
          {home.nearby.length > 0 ? (
            <ProductSection
              title={t("marketplace.nearby")}
              products={home.nearby}
            />
          ) : null}
          <ProductSection
            title={t("marketplace.popular")}
            products={home.popular}
          />
          <ProductSection
            title={t("marketplace.new")}
            products={home.newest}
          />
          {home.deals.length > 0 ? (
            <ProductSection
              title={t("marketplace.deals")}
              products={home.deals}
            />
          ) : null}

          {home.featuredStores.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="heading">
                {t("marketplace.featuredStores")}
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.md }}
              >
                {home.featuredStores.map(({ store, activeProductCount }) => (
                  <Pressable
                    key={store.id}
                    onPress={() =>
                      router.push({
                        pathname: "/marketplace/store/[handle]",
                        params: { handle: store.handle }
                      })
                    }
                    style={({ pressed }) => ({
                      opacity: pressed ? theme.opacity.pressed : 1,
                      width: 220
                    })}
                  >
                    <Card>
                      <View style={{ gap: theme.spacing.sm }}>
                        <AppText variant="heading">{store.name}</AppText>
                        <AppText variant="caption" tone="muted">
                          {store.province} · {store.cityDistrict}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {t("marketplace.productCount")}: {activeProductCount}
                        </AppText>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {home.recentlyViewed.length > 0 ? (
            <ProductSection
              title={t("marketplace.recentlyViewed")}
              products={home.recentlyViewed}
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function ProductSection({
  title,
  products
}: {
  title: string;
  products: MarketplaceHomeResponse["recommended"];
}) {
  const theme = useAppTheme();

  if (products.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="heading">{title}</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.md }}
      >
        {products.map((product) => (
          <MarketplaceProductCard
            key={product.id}
            product={product}
            compact
          />
        ))}
      </ScrollView>
    </View>
  );
}
