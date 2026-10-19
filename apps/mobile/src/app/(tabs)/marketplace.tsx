import type {
  MarketplaceBrowseResponse,
  MarketplaceCategoryRecord,
  MarketplaceHomeResponse,
  MarketplaceSearchSuggestion,
  MarketplaceSort,
  MarketplaceStoreDirectoryResponse
} from "@bazaarlink/contracts";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  TextInput,
  View
} from "react-native";

import { MarketplaceProductGrid } from "@/components/marketplace/MarketplaceProductGrid";
import { MarketplaceCategoryTile } from "@/components/marketplace/MarketplaceCategoryTile";
import { MarketplaceSearchBox } from "@/components/marketplace/MarketplaceSearchBox";
import { MarketplaceRecentSearches } from "@/components/marketplace/MarketplaceRecentSearches";
import { MarketplaceSuggestions } from "@/components/marketplace/MarketplaceSuggestions";
import { MarketplaceStoreCard } from "@/components/marketplace/MarketplaceStoreCard";
import { MarketplaceFilterSheet, type MarketplaceFilterDraft } from "@/components/marketplace/MarketplaceFilterSheet";
import { MarketplaceActiveFilters } from "@/components/marketplace/MarketplaceActiveFilters";
import { MarketplaceSortBar } from "@/components/marketplace/MarketplaceSortBar";
import { appliedFilterKeys, removeAppliedFilter, validatePriceRange, type AppliedFilterKey } from "@/marketplace/filter-utils";
import {
  MarketplacePrimaryTabs, type MarketplaceView
} from "@/components/marketplace/MarketplacePrimaryTabs";
import {
  AppText,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  browseMarketplace,
  marketplaceHome,
  marketplaceStores,
  MarketplaceApiError,
  type BrowseMarketplaceInput
} from "@/marketplace/api";
import {
  browseCacheKey,
  getRecentProductIds,
  homeCacheKey,
  readBrowseCache,
  readHomeCache,
  readStoreDirectoryCache,
  storeDirectoryCacheKey,
  writeStoreDirectoryCache,
  writeBrowseCache,
  writeHomeCache
} from "@/marketplace/cache";
import { marketplaceErrorKey } from "@/marketplace/messages";
import {
  clearRecentSearches,
  getRecentSearches,
  normalizeSearchTerm,
  rememberSearch,
  removeRecentSearch
} from "@/marketplace/search-history";
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
  const {
    categoryId: linkedCategoryId, q: linkedQuery, brand: linkedBrand,
    storeId: linkedStoreId, sort: linkedSort,
    discount: linkedDiscount, province: linkedProvince
  } = useLocalSearchParams<{
    categoryId?: string; q?: string; brand?: string; storeId?: string;
    sort?: string; discount?: string; province?: string;
  }>();
  const validSort: MarketplaceSort =
    linkedSort === "popularity" || linkedSort === "newest" ||
    linkedSort === "price_asc" || linkedSort === "price_desc" ||
    linkedSort === "rating"
      ? linkedSort
      : "relevance";
  const theme = useAppTheme();
  const { locale, isRTL, formatNumber, t } = useLocalization();

  // Keep each view's browsing state when switching between the three sub-tabs.
  // Deep-linked searches and category selections always open Products.
  const [selectedView, setSelectedView] = useState<MarketplaceView>("products");

  const [home, setHome] = useState<MarketplaceHomeResponse | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<MarketplaceApiError | null>(null);
  const [usingCachedHome, setUsingCachedHome] = useState(false);

  const [storeSearchText, setStoreSearchText] = useState("");
  const [storeDirectoryQuery, setStoreDirectoryQuery] = useState("");
  const [storeDirectory, setStoreDirectory] = useState<MarketplaceStoreDirectoryResponse | null>(null);
  const [storeDirectoryLoading, setStoreDirectoryLoading] = useState(false);
  const [storeDirectoryError, setStoreDirectoryError] = useState(false);
  const [usingCachedStoreDirectory, setUsingCachedStoreDirectory] = useState(false);
  const storeDirectoryRequestId = useRef(0);
  const [categoryParentId, setCategoryParentId] = useState<string | null>(null);

  const [query, setQuery] = useState(linkedQuery ?? "");
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(linkedQuery?.trim() ?? null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [province, setProvince] = useState(linkedProvince ?? "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(linkedDiscount === "true");
  const [minRating, setMinRating] = useState<number | undefined>();
  const [verifiedStoreOnly, setVerifiedStoreOnly] = useState(false);
  const [sort, setSort] = useState<MarketplaceSort>(validSort);
  const [categoryId, setCategoryId] = useState<string | undefined>(linkedCategoryId);
  const [storeId, setStoreId] = useState<string | undefined>(linkedStoreId);
  const [brand, setBrand] = useState<string | undefined>(linkedBrand);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceError, setPriceError] = useState<"invalid" | "range" | null>(null);
  const browseRequestId = useRef(0);
  const lastRequestedBrowseInput = useRef<BrowseMarketplaceInput | null>(null);
  const homeRequestId = useRef(0);
  const activeHomeProvince = useRef<string | undefined>(undefined);

  const [browse, setBrowse] = useState<MarketplaceBrowseResponse | null>(null);
  const [browseInput, setBrowseInput] = useState<BrowseMarketplaceInput | null>(
    null
  );
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseLoadingMore, setBrowseLoadingMore] = useState(false);
  const [browseLoadMoreError, setBrowseLoadMoreError] = useState(false);
  const [browseError, setBrowseError] = useState<MarketplaceApiError | null>(null);
  const [usingCachedBrowse, setUsingCachedBrowse] = useState(false);

  const loadStoreDirectory = useCallback(async (input: {
    q?: string | undefined;
    offset: number;
    append?: boolean;
  }) => {
    const requestId = ++storeDirectoryRequestId.current;
    const cacheKey = storeDirectoryCacheKey(input.q, input.offset);
    if (!input.append) {
      setStoreDirectory(null);
      setUsingCachedStoreDirectory(false);
    }
    setStoreDirectoryLoading(true);
    setStoreDirectoryError(false);

    // Read cache alongside the request so previously browsed results can
    // appear quickly on slow connections; request ids prevent stale searches winning.
    const cachedPromise = input.append
      ? Promise.resolve(null)
      : readStoreDirectoryCache(cacheKey, true);
    try {
      const response = await marketplaceStores({
        ...(input.q ? { q: input.q } : {}),
        offset: input.offset,
        limit: 20
      });
      if (requestId !== storeDirectoryRequestId.current) return;
      if (input.append) {
        setStoreDirectory(current => {
          if (!current) return response;
          const known = new Set(current.stores.map(item => item.store.id));
          return {
            ...response,
            stores: [
              ...current.stores,
              ...response.stores.filter(item => !known.has(item.store.id))
            ]
          };
        });
      } else {
        setStoreDirectory(response);
        setUsingCachedStoreDirectory(false);
        void writeStoreDirectoryCache(cacheKey, response);
      }
    } catch {
      if (requestId !== storeDirectoryRequestId.current) return;
      if (!input.append) {
        const cached = await cachedPromise;
        if (requestId !== storeDirectoryRequestId.current) return;
        if (cached) {
          setStoreDirectory(cached);
          setUsingCachedStoreDirectory(true);
        }
      }
      setStoreDirectoryError(true);
    } finally {
      if (requestId === storeDirectoryRequestId.current) setStoreDirectoryLoading(false);
    }

    // Populate a cold/slow screen from cache without letting it overwrite
    // a newer server response.
    if (!input.append) {
      void cachedPromise.then(cached => {
        if (cached && requestId === storeDirectoryRequestId.current &&
            storeDirectoryRequestId.current > 0) {
          setStoreDirectory(current => current ?? cached);
          setUsingCachedStoreDirectory(current => current || !storeDirectory);
        }
      });
    }
  }, [storeDirectory]);

  const submitStoreSearch = () => {
    const submitted = normalizeSearchTerm(storeSearchText);
    setStoreDirectoryQuery(submitted);
    void loadStoreDirectory({ q: submitted || undefined, offset: 0 });
  };

  const selectMarketplaceView = (view: MarketplaceView) => {
    setSelectedView(view);
    if (view === "stores" && !storeDirectory && !storeDirectoryLoading) {
      void loadStoreDirectory({ q: storeDirectoryQuery || undefined, offset: 0 });
    }
  };

  const { suggestions, suggestionsLoading } = useMarketplaceSuggestions(query);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getRecentSearches().then(items => {
      if (active) setRecentSearches(items);
    });
    return () => { active = false; };
  }, []));

  const recordHistory = (term: string) => {
    if (normalizeSearchTerm(term).length < 2) return;
    void rememberSearch(term).then(setRecentSearches).catch(() => setHistoryError(true));
  };

  const clearHistory = async () => {
    setHistoryError(false);
    try {
      await clearRecentSearches();
      setRecentSearches([]);
    } catch {
      setHistoryError(true);
    }
  };

  const removeHistoryItem = async (term: string) => {
    setHistoryError(false);
    try {
      setRecentSearches(await removeRecentSearch(term));
    } catch {
      setHistoryError(true);
    }
  };

  const loadHome = useCallback(async (nearbyProvince?: string) => {
    const requestId = ++homeRequestId.current;
    const scopeChanged = activeHomeProvince.current !== nearbyProvince;
    activeHomeProvince.current = nearbyProvince;
    if (scopeChanged) setHome(null);
    setHomeLoading(true);
    setHomeError(null);
    setUsingCachedHome(false);

    const key = homeCacheKey(nearbyProvince);

    try {
      const recentProductIds = await getRecentProductIds();
      if (requestId !== homeRequestId.current) return;
      const response = await marketplaceHome({
        ...(nearbyProvince ? { province: nearbyProvince } : {}),
        recentProductIds
      });
      if (requestId !== homeRequestId.current) return;

      setHome(response);
      void writeHomeCache(key, response);
    } catch (error) {
      if (requestId !== homeRequestId.current) return;
      const safeError =
        error instanceof MarketplaceApiError
          ? error
          : new MarketplaceApiError("service_unavailable");
      const cached = await readHomeCache(key, true);
      if (requestId !== homeRequestId.current) return;

      if (cached) {
        setHome(cached);
        setUsingCachedHome(true);
      } else {
        setHome(null);
        setHomeError(safeError);
      }
    } finally {
      if (requestId === homeRequestId.current) setHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    // A single province-scoped request owns the Marketplace discovery Home.
    // The latest response wins when deep links change in quick succession.
    void loadHome(linkedProvince);
  }, [loadHome, linkedProvince]);

  const rootCategories = useMemo(
    () => home?.categories.filter((category) => category.parentId === null) ?? [],
    [home]
  );
  const activeCategory = home?.categories.find(category => category.id === categoryParentId);
  const visibleCategories = useMemo(
    () => categoryParentId
      ? home?.categories.filter(category => category.parentId === categoryParentId) ?? []
      : rootCategories,
    [categoryParentId, home, rootCategories]
  );

  const executeBrowse = useCallback(
    async (
      input: BrowseMarketplaceInput,
      append = false
    ) => {
      const requestId = ++browseRequestId.current;
      if (!append) lastRequestedBrowseInput.current = input;
      if (append) {
        setBrowseLoadMoreError(false);
        setBrowseLoadingMore(true);
      } else {
        // Do not present the previous query's product cards as if they
        // matched the next set of filters while the network is pending.
        setBrowse(null);
        setBrowseInput(null);
        setBrowseLoading(true);
        setBrowseError(null);
        setUsingCachedBrowse(false);
      }

      const key = browseCacheKey(input);

      try {
        const response = await browseMarketplace(input);
        if (requestId !== browseRequestId.current) return;

        if (append) {
          setBrowseLoadMoreError(false);
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

        if (append) {
          setBrowseLoadMoreError(true);
        } else {
          const cached = await readBrowseCache(key, true);
          if (requestId !== browseRequestId.current) return;
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
    // Marketplace opens to the full, real product catalog by default,
    // rather than duplicating the personalized Home recommendation rails.
    // This effect runs before deep-link handling; request ids ensure that
    // a more specific deep-linked request takes precedence.
    void executeBrowse({ sort: "relevance", offset: 0, limit: 20 });
  }, [executeBrowse]);

  useEffect(() => {
    if (!linkedCategoryId && !linkedQuery && !linkedBrand && !linkedStoreId &&
        !linkedSort && !linkedDiscount && !linkedProvince) return;
    setSelectedView("products");
    setCategoryId(linkedCategoryId);
    setStoreId(linkedStoreId);
    setBrand(linkedBrand);
    setQuery(linkedQuery ?? "");
    setDismissedQuery(linkedQuery?.trim() ?? null);
    setSort(validSort);
    setDealsOnly(linkedDiscount === "true");
    setProvince(linkedProvince ?? "");
    void executeBrowse({
      ...(linkedCategoryId ? { categoryId: linkedCategoryId } : {}),
      ...(linkedQuery ? { q: linkedQuery } : {}),
      ...(linkedBrand ? { brand: linkedBrand } : {}),
      ...(linkedStoreId ? { storeId: linkedStoreId } : {}),
      ...(linkedDiscount === "true" ? { discount: true } : {}),
      ...(linkedProvince ? { province: linkedProvince } : {}),
      sort: validSort, offset: 0, limit: 20
    });
  }, [
    linkedCategoryId, linkedQuery, linkedBrand, linkedStoreId,
    linkedSort, linkedDiscount, linkedProvince, validSort,
    executeBrowse
  ]);

  const applyBrowse = useCallback(
    async (overrides: Partial<BrowseMarketplaceInput> = {}) => {
      const parsedMin = optionalPrice(minPrice);
      const parsedMax = optionalPrice(maxPrice);

      if (validatePriceRange(minPrice, maxPrice)) {
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
      } else {
        void loadHome();
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
    setUsingCachedBrowse(false);
    if (linkedCategoryId || linkedQuery || linkedBrand || linkedStoreId ||
        linkedSort || linkedDiscount || linkedProvince) {
      router.replace("/(tabs)/marketplace");
    }
    void loadHome();
    void executeBrowse({ sort: "relevance", offset: 0, limit: 20 });
    setSelectedView("products");
  };

  const submitSearch = () => {
    const submitted = normalizeSearchTerm(query);
    setSearchFocused(false);
    setSelectedView("products");
    setDismissedQuery(submitted);
    recordHistory(submitted);
    setCategoryId(undefined);
    setStoreId(undefined);
    setBrand(undefined);
    void applyBrowse({ q: submitted || undefined, categoryId: undefined, storeId: undefined, brand: undefined });
  };

  const runRecentSearch = (term: string) => {
    const submitted = normalizeSearchTerm(term);
    setSearchFocused(false);
    setSelectedView("products");
    setQuery(submitted);
    setDismissedQuery(submitted);
    setCategoryId(undefined);
    setStoreId(undefined);
    setBrand(undefined);
    recordHistory(submitted);
    void applyBrowse({
      q: submitted || undefined,
      categoryId: undefined,
      storeId: undefined,
      brand: undefined
    });
  };

  const browseCategoryHierarchy = (id: string) => {
    const children = home?.categories.filter(category => category.parentId === id) ?? [];
    if (children.length > 0) {
      setCategoryParentId(id);
      return;
    }
    chooseCategory(id);
  };

  const chooseCategory = (id: string) => {
    setSelectedView("products");
    setQuery("");
    setCategoryId(id);
    setStoreId(undefined);
    setBrand(undefined);
    void applyBrowse({ categoryId: id, q: undefined, storeId: undefined, brand: undefined });
  };

  const chooseSuggestion = (suggestion: MarketplaceSearchSuggestion) => {
    setSearchFocused(false);
    setQuery("");
    if (suggestion.type === "product") {
      router.push({ pathname: "/marketplace/product/[productId]", params: { productId: suggestion.id } });
    } else if (suggestion.type === "category") {
      chooseCategory(suggestion.id);
    } else if (suggestion.type === "store" && suggestion.handle) {
      router.push({ pathname: "/marketplace/store/[handle]", params: { handle: suggestion.handle } });
    } else if (suggestion.type === "store") {
      setSelectedView("products");
      setStoreId(suggestion.id);
      setCategoryId(undefined);
      setBrand(undefined);
      void applyBrowse({ storeId: suggestion.id, categoryId: undefined, q: undefined, brand: undefined });
    } else {
      setSelectedView("products");
      setBrand(suggestion.label);
      setStoreId(undefined);
      setCategoryId(undefined);
      void applyBrowse({ brand: suggestion.label, storeId: undefined, categoryId: undefined, q: undefined });
    }
  };

  // Sheet fields are drafts. Every result chip is derived from the last
  // applied request, not from edits the shopper has not confirmed.
  const restoreDraftFromApplied = (input: BrowseMarketplaceInput | null) => {
    setCategoryId(input?.categoryId);
    setStoreId(input?.storeId);
    setBrand(input?.brand);
    setProvince(input?.province ?? "");
    setMinPrice(input?.minPrice !== undefined ? String(input.minPrice) : "");
    setMaxPrice(input?.maxPrice !== undefined ? String(input.maxPrice) : "");
    setInStockOnly(input?.inStock === true);
    setDealsOnly(input?.discount === true);
    setMinRating(input?.minRating);
    setVerifiedStoreOnly(input?.verifiedStore === true);
  };

  const changeFilterDraft = (patch: Partial<MarketplaceFilterDraft>) => {
    if ("categoryId" in patch) setCategoryId(patch.categoryId);
    if ("province" in patch && patch.province !== undefined) setProvince(patch.province);
    if ("minPrice" in patch && patch.minPrice !== undefined) setMinPrice(patch.minPrice);
    if ("maxPrice" in patch && patch.maxPrice !== undefined) setMaxPrice(patch.maxPrice);
    if ("inStockOnly" in patch && patch.inStockOnly !== undefined) setInStockOnly(patch.inStockOnly);
    if ("dealsOnly" in patch && patch.dealsOnly !== undefined) setDealsOnly(patch.dealsOnly);
    if ("minRating" in patch) setMinRating(patch.minRating);
    if ("verifiedStoreOnly" in patch && patch.verifiedStoreOnly !== undefined)
      setVerifiedStoreOnly(patch.verifiedStoreOnly);
    setPriceError(null);
  };

  const openFilters = () => {
    restoreDraftFromApplied(browseInput);
    setPriceError(null);
    setFiltersOpen(true);
  };

  const cancelFilters = () => {
    restoreDraftFromApplied(browseInput);
    setPriceError(null);
    setFiltersOpen(false);
  };

  const applyFilterDraft = () => {
    const error = validatePriceRange(minPrice, maxPrice);
    if (error) { setPriceError(error); return; }
    setPriceError(null);
    setFiltersOpen(false);
    // Don't accidentally submit text typed in an unfinished search.
    void applyBrowse({ q: browseInput?.q });
  };

  const removeFilter = (key: AppliedFilterKey) => {
    if (!browseInput) return;
    const next = removeAppliedFilter(browseInput, key);
    restoreDraftFromApplied(next);
    void executeBrowse(next);
    if (key === "province") void loadHome();
  };

  const clearAppliedFilters = () => {
    if (!browseInput) return;
    const next: BrowseMarketplaceInput = {
      ...(browseInput.q ? { q: browseInput.q } : {}),
      sort: browseInput.sort ?? "relevance", offset: 0, limit: 20
    };
    restoreDraftFromApplied(next);
    void executeBrowse(next);
    void loadHome();
  };

  const changeSort = (nextSort: MarketplaceSort) => {
    if (!browseInput) return;
    setSort(nextSort);
    void executeBrowse({ ...browseInput, sort: nextSort, offset: 0, limit: 20 });
  };

  const refreshMarketplace = () => {
    if (selectedView === "stores") {
      void loadStoreDirectory({ q: storeDirectoryQuery || undefined, offset: 0 });
    } else if (selectedView === "products") {
      const current = browseInput ?? lastRequestedBrowseInput.current;
      if (current) void executeBrowse({ ...current, offset: 0, limit: 20 });
      else void executeBrowse({ sort: "relevance", offset: 0, limit: 20 });
    } else {
      void loadHome(linkedProvince);
    }
  };

  const categoryLabel = browseInput?.categoryId
    ? home?.categories.find(category => category.id === browseInput.categoryId)
    : undefined;
  const childCategories = home?.categories.filter(
    category => category.parentId === browseInput?.categoryId
  ) ?? [];
  const activeFilterCount = appliedFilterKeys(browseInput).length;

  return (
    <Screen
      refreshing={selectedView === "stores" ? storeDirectoryLoading : selectedView === "products" ? browseLoading : homeLoading}
      onRefresh={refreshMarketplace}
      scrollKey="marketplace-main"
    >
      <AppText variant="heading">{t("marketplace.title")}</AppText>

      <MarketplacePrimaryTabs
        selected={selectedView}
        onSelect={selectMarketplaceView}
      />

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <MarketplaceSearchBox
            value={query}
            onChangeText={(text) => { setQuery(text); setDismissedQuery(null); }}
            onSubmit={submitSearch}
            onFocusChange={setSearchFocused}
          />
          {searchFocused && !query.trim() ? (
            <MarketplaceRecentSearches
              searches={recentSearches}
              onSelect={runRecentSearch}
              onRemove={(term) => { void removeHistoryItem(term); }}
              onClear={() => { void clearHistory(); }}
            />
          ) : null}
          {historyError ? (
            <AppText accessibilityRole="alert" variant="caption" tone="danger">
              {t("marketplace.phase2.historyError")}
            </AppText>
          ) : null}
          {dismissedQuery !== query.trim() ? (
            <MarketplaceSuggestions
              query={query} items={suggestions} loading={suggestionsLoading}
              categories={home?.categories} onSelect={chooseSuggestion} onSearchAll={submitSearch}
            />
          ) : null}

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                fullWidth
                loading={browseLoading && selectedView === "products"}
                onPress={submitSearch}
              >
                {t("marketplace.searchAction")}
              </Button>
            </View>
            {selectedView === "products" ? <Button
              variant="secondary"
              onPress={openFilters}
            >
              {t("marketplace.filters") + (activeFilterCount ? " · " + formatNumber(activeFilterCount) : "")}
            </Button> : null}
          </View>

        </View>
      </Card>

      <MarketplaceFilterSheet
        visible={filtersOpen && selectedView === "products"}
        draft={{ categoryId, province, minPrice, maxPrice, inStockOnly,
          dealsOnly, minRating, verifiedStoreOnly }}
        categories={home?.categories ?? []}
        priceError={priceError}
        onChange={changeFilterDraft}
        onReset={() => { restoreDraftFromApplied(null); setPriceError(null); }}
        onCancel={cancelFilters}
        onApply={applyFilterDraft}
      />

      {selectedView === "products" && browseInput ? (
        <View style={{ gap: theme.spacing.md }}>
          <MarketplaceSortBar value={browseInput.sort ?? "relevance"} onChange={changeSort} />
          <MarketplaceActiveFilters input={browseInput}
            categories={home?.categories ?? []}
            onRemove={removeFilter}
            onClear={clearAppliedFilters} />
        </View>
      ) : null}

      {selectedView !== "products" && homeLoading && !home ? (
        <StateView
          kind="loading"
          title={t("marketplace.loadingTitle")}
          message={t("marketplace.loadingMessage")}
        />
      ) : null}

      {selectedView !== "products" && homeError && !home ? (
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

      {(selectedView === "products" ? usingCachedBrowse : selectedView === "stores" ? usingCachedStoreDirectory : usingCachedHome) ? (
        <Card muted>
          <AppText variant="caption" tone="muted">
            {t("marketplace.cachedNotice")}
          </AppText>
        </Card>
      ) : null}

      {selectedView === "products" && browseLoading && !browse ? <StateView kind="loading" title={t("marketplace.searching")} /> : null}
      {selectedView === "products" && browseError && !browse ? (
        <StateView kind="error" title={t("marketplace.errorTitle")}
          message={t(marketplaceErrorKey(browseError.code))}
          actionLabel={t("marketplace.retry")} onAction={() => {
            if (lastRequestedBrowseInput.current)
              void executeBrowse(lastRequestedBrowseInput.current);
            else submitSearch();
          }} />
      ) : null}

      {selectedView === "products" && browse ? (
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="heading">{t("marketplace.results")}</AppText>
            <AppText variant="caption" tone="muted">{t("marketplace.productCount") + ": " + formatNumber(browse.pageInfo.total)}</AppText>
            <AppText variant="caption" tone="muted">
              {categoryLabel
                ? localizedCategoryName(categoryLabel, locale)
                : browseInput?.q
                  ? t("marketplace.phase2.searchResultsFor") + ' "' + browseInput.q + '"'
                  : t("marketplace.allProducts")}
            </AppText>
            {activeFilterCount > 0 ? (
              <AppText variant="caption" tone="muted">
                {t("marketplace.phase2.activeFilters") + ": " + formatNumber(activeFilterCount)}
              </AppText>
            ) : null}
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
              message={t("marketplace.phase2.noResultsHelp")}
              actionLabel={t(activeFilterCount > 0 ? "marketplace.clearFilters" : "marketplace.clearSearch")}
              onAction={activeFilterCount > 0 ? clearAppliedFilters : clearDiscovery}
            />
          ) : (
            <View style={{ gap: theme.spacing.lg }}>
              <MarketplaceProductGrid products={browse.products} />

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

          {browseLoadMoreError && browseInput ? (
            <View style={{ gap: theme.spacing.sm }}>
              <AppText tone="danger" accessibilityRole="alert">{t("marketplace.error.serviceUnavailable")}</AppText>
              <Button variant="secondary" loading={browseLoadingMore} onPress={() => void executeBrowse({ ...browseInput, offset: browse.products.length }, true)}>{t("marketplace.retry")}</Button>
            </View>
          ) : null}

          {browseError ? (
            <AppText tone="danger">
              {t(marketplaceErrorKey(browseError.code))}
            </AppText>
          ) : null}

          <Button variant="ghost" onPress={clearDiscovery}>
            {t("marketplace.backHome")}
          </Button>
        </View>
      ) : null}

      {selectedView === "categories" && home ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">
            {activeCategory ? localizedCategoryName(activeCategory, locale) : t("marketplace.nav.categories")}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t("marketplace.nav.categoriesHint")}
          </AppText>
          {activeCategory ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Button variant="secondary" onPress={() => setCategoryParentId(activeCategory.parentId)}>
                {t("marketplace.phase5.backToCategories")}
              </Button>
              <Button onPress={() => chooseCategory(activeCategory.id)}>
                {t("marketplace.phase5.viewCategoryProducts")}
              </Button>
            </View>
          ) : null}
          {visibleCategories.length > 0 ? (
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              flexWrap: "wrap", justifyContent: "space-between",
              gap: theme.spacing.sm
            }}>
              {visibleCategories.map(category => (
                <MarketplaceCategoryTile
                  key={category.id}
                  grid
                  category={category}
                  onPress={() => browseCategoryHierarchy(category.id)}
                />
              ))}
            </View>
          ) : (
            <StateView
              kind="empty"
              title={t("marketplace.nav.emptyCategories")}
              actionLabel={t("marketplace.nav.browseProducts")}
              onAction={() => setSelectedView("products")}
            />
          )}
        </View>
      ) : null}

      {selectedView === "stores" ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("marketplace.nav.stores")}</AppText>
          <AppText variant="caption" tone="muted">
            {t("marketplace.phase5.storesHint")}
          </AppText>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextInput
                accessibilityLabel={t("marketplace.phase5.storeSearchLabel")}
                placeholder={t("marketplace.phase5.storeSearchPlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                value={storeSearchText}
                onChangeText={setStoreSearchText}
                onSubmitEditing={submitStoreSearch}
                returnKeyType="search"
                maxLength={120}
                style={{
                  minHeight: 48, borderWidth: 1, borderColor: theme.colors.border,
                  borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.md,
                  color: theme.colors.text, backgroundColor: theme.colors.surface,
                  textAlign: isRTL ? "right" : "left"
                }}
              />
            </View>
            <Button onPress={submitStoreSearch} loading={storeDirectoryLoading && !storeDirectory}>
              {t("marketplace.searchAction")}
            </Button>
          </View>
          {usingCachedStoreDirectory ? (
            <Card muted><AppText variant="caption" tone="muted">{t("marketplace.cachedNotice")}</AppText></Card>
          ) : null}
          {storeDirectoryQuery ? (
            <AppText variant="caption" tone="muted">
              {t("marketplace.phase5.storeResultsFor") + ' "' + storeDirectoryQuery + '"'}
            </AppText>
          ) : null}
          {storeDirectoryError && !storeDirectory ? (
            <StateView
              kind="error"
              title={t("marketplace.errorTitle")}
              message={t("marketplace.error.serviceUnavailable")}
              actionLabel={t("marketplace.retry")}
              onAction={() => loadStoreDirectory({ q: storeDirectoryQuery || undefined, offset: 0 })}
            />
          ) : null}
          {storeDirectoryLoading && !storeDirectory ? (
            <StateView kind="loading" title={t("marketplace.phase5.loadingStores")} />
          ) : null}
          {storeDirectory && storeDirectory.stores.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="caption" tone="muted">
                {t("marketplace.phase5.storeCount") + ": " + formatNumber(storeDirectory.pageInfo.total)}
              </AppText>
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                flexWrap: "wrap", justifyContent: "space-between",
                rowGap: theme.spacing.md
              }}>
                {storeDirectory.stores.map(featured => (
                  <MarketplaceStoreCard key={featured.store.id} featured={featured} grid />
                ))}
              </View>
              {storeDirectory.pageInfo.hasMore ? (
                <Button variant="secondary" loading={storeDirectoryLoading}
                  onPress={() => loadStoreDirectory({
                    q: storeDirectoryQuery || undefined,
                    offset: storeDirectory.stores.length,
                    append: true
                  })}>
                  {t("marketplace.loadMore")}
                </Button>
              ) : null}
            </View>
          ) : null}
          {storeDirectory && storeDirectory.stores.length === 0 && !storeDirectoryLoading ? (
            <StateView
              kind="empty"
              title={t("marketplace.phase5.noStoresTitle")}
              message={t("marketplace.phase5.noStoresMessage")}
              actionLabel={t("marketplace.phase5.clearStoreSearch")}
              onAction={() => {
                setStoreSearchText("");
                setStoreDirectoryQuery("");
                void loadStoreDirectory({ offset: 0 });
              }}
            />
          ) : null}
          {storeDirectoryError && storeDirectory ? (
            <AppText variant="caption" tone="danger" accessibilityRole="alert">
              {t("marketplace.error.serviceUnavailable")}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
