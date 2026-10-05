import type {
  MarketplaceBrowseResponse,
  MarketplaceCategoryRecord,
  MarketplaceHomeResponse,
  MarketplaceSearchSuggestion,
  MarketplaceSort
} from "@bazaarlink/contracts";
import { useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Pressable,
  ScrollView,
  View
} from "react-native";

import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
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
import {
  browseMarketplace,
  marketplaceHome,
  MarketplaceApiError,
  searchSuggestions,
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
  const theme = useAppTheme();
  const { locale, t } = useLocalization();

  const [home, setHome] = useState<MarketplaceHomeResponse | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<MarketplaceApiError | null>(null);
  const [usingCachedHome, setUsingCachedHome] = useState(false);

  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [sort, setSort] = useState<MarketplaceSort>("relevance");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [brand, setBrand] = useState<string | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [browse, setBrowse] = useState<MarketplaceBrowseResponse | null>(null);
  const [browseInput, setBrowseInput] = useState<BrowseMarketplaceInput | null>(
    null
  );
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoadingMore, setBrowseLoadingMore] = useState(false);
  const [browseError, setBrowseError] = useState<MarketplaceApiError | null>(null);
  const [usingCachedBrowse, setUsingCachedBrowse] = useState(false);

  const [suggestions, setSuggestions] = useState<MarketplaceSearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

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

  useEffect(() => {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      setSuggestionsLoading(true);

      void searchSuggestions(normalized)
        .then((response) => {
          if (active) {
            setSuggestions(response.suggestions);
          }
        })
        .catch(() => {
          if (active) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (active) {
            setSuggestionsLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const rootCategories = useMemo(
    () => home?.categories.filter((category) => category.parentId === null) ?? [],
    [home]
  );

  const executeBrowse = useCallback(
    async (
      input: BrowseMarketplaceInput,
      append = false
    ) => {
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
        if (append) {
          setBrowseLoadingMore(false);
        } else {
          setBrowseLoading(false);
        }
      }
    },
    []
  );

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
        ...overrides
      };

      setSuggestions([]);
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
      maxPrice,
      minPrice,
      province,
      query,
      sort,
      storeId
    ]
  );

  const clearDiscovery = () => {
    setQuery("");
    setProvince("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setDealsOnly(false);
    setSort("relevance");
    setCategoryId(undefined);
    setStoreId(undefined);
    setBrand(undefined);
    setBrowse(null);
    setBrowseInput(null);
    setBrowseError(null);
    setSuggestions([]);
    void loadHome();
  };

  const chooseSuggestion = (suggestion: MarketplaceSearchSuggestion) => {
    setSuggestions([]);

    if (suggestion.type === "product") {
      router.push({
        pathname: "/marketplace/product/[productId]",
        params: { productId: suggestion.id }
      });
      return;
    }

    if (suggestion.type === "category") {
      setCategoryId(suggestion.id);
      void applyBrowse({ categoryId: suggestion.id, q: undefined });
      return;
    }

    if (suggestion.type === "store") {
      setStoreId(suggestion.id);
      void applyBrowse({ storeId: suggestion.id, q: undefined });
      return;
    }

    setBrand(suggestion.label);
    void applyBrowse({ brand: suggestion.label, q: undefined });
  };

  const categoryLabel = categoryId
    ? home?.categories.find((category) => category.id === categoryId)
    : undefined;

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("marketplace.phaseBadge")} tone="primary" />
        <AppText variant="display">{t("marketplace.title")}</AppText>
        <AppText variant="bodyLarge" tone="muted">
          {t("marketplace.description")}
        </AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <TextField
            label={t("marketplace.searchLabel")}
            placeholder={t("marketplace.searchPlaceholder")}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              void applyBrowse();
            }}
          />

          {suggestionsLoading ? (
            <AppText variant="caption" tone="muted">
              {t("marketplace.searching")}
            </AppText>
          ) : null}

          {suggestions.length > 0 ? (
            <View style={{ gap: theme.spacing.xs }}>
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion.type + ":" + suggestion.id}
                  onPress={() => chooseSuggestion(suggestion)}
                  style={({ pressed }) => ({
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    backgroundColor: pressed
                      ? theme.colors.surfaceMuted
                      : theme.colors.surface
                  })}
                >
                  <AppText variant="label">{suggestion.label}</AppText>
                  {suggestion.secondaryLabel ? (
                    <AppText variant="caption" tone="muted">
                      {suggestion.secondaryLabel}
                    </AppText>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                fullWidth
                loading={browseLoading}
                onPress={() => {
                  void applyBrowse();
                }}
              >
                {t("marketplace.searchAction")}
              </Button>
            </View>
            <Button
              variant="secondary"
              onPress={() => setFiltersOpen((value) => !value)}
            >
              {t("marketplace.filters")}
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

              <AppText variant="label">{t("marketplace.sort.label")}</AppText>
              {(
                [
                  ["relevance", "marketplace.sort.relevance"],
                  ["newest", "marketplace.sort.newest"],
                  ["price_asc", "marketplace.sort.priceLowHigh"],
                  ["price_desc", "marketplace.sort.priceHighLow"],
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

              <AppText variant="caption" tone="muted">
                {t("marketplace.futureFilterHint")}
              </AppText>

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

      {homeLoading && !home ? (
        <StateView
          kind="loading"
          title={t("marketplace.loadingTitle")}
          message={t("marketplace.loadingMessage")}
        />
      ) : null}

      {homeError && !home ? (
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

      {browse ? (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="title">{t("marketplace.results")}</AppText>
            <AppText variant="caption" tone="muted">
              {categoryLabel
                ? localizedCategoryName(categoryLabel, locale)
                : query.trim() || t("marketplace.allProducts")}
            </AppText>
          </View>

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
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="title">{t("marketplace.categories")}</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.sm }}
            >
              {rootCategories.map((category) => (
                <Button
                  key={category.id}
                  variant="secondary"
                  onPress={() => {
                    setCategoryId(category.id);
                    void applyBrowse({
                      categoryId: category.id,
                      q: undefined
                    });
                  }}
                >
                  {localizedCategoryName(category, locale)}
                </Button>
              ))}
            </ScrollView>
          </View>

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
              <AppText variant="title">
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
      <AppText variant="title">{title}</AppText>
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
