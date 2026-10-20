import type { MarketplaceStorePageResponse } from "@bazaarlink/contracts";
import {
  useLocalSearchParams,
  useRouter
} from "expo-router";
import {
  useEffect,
  useState
} from "react";
import {
  Image,
  View
} from "react-native";

import { MarketplaceProductGrid } from "@/components/marketplace/MarketplaceProductGrid";
import {
  AppText,
  Badge,
  Button,
  Card,
  HorizontalLocaleScroll,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { StoreMapPreview } from "@/store/StoreMapPicker";
import {
  MarketplaceApiError,
  marketplaceStore
} from "@/marketplace/api";
import {
  readStoreCache,
  storeCacheKey,
  writeStoreCache
} from "@/marketplace/cache";
import { marketplaceErrorKey } from "@/marketplace/messages";

export default function MarketplaceStoreScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  const [data, setData] = useState<MarketplaceStorePageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<MarketplaceApiError | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!handle) {
      setLoading(false);
      setError(new MarketplaceApiError("invalid_request"));
      return;
    }

    let active = true;
    const key = storeCacheKey(handle, 0);

    void (async () => {
      setLoading(true);
      setError(null);
      setCached(false);

      try {
        const response = await marketplaceStore(handle, 0, 20);
        if (!active) return;
        setData(response);
        await writeStoreCache(key, response);
      } catch (requestError) {
        if (!active) return;

        const safeError =
          requestError instanceof MarketplaceApiError
            ? requestError
            : new MarketplaceApiError("service_unavailable");
        const fallback = await readStoreCache(key, true);

        if (!active) return;

        if (fallback) {
          setData(fallback);
          setCached(true);
        } else {
          setError(safeError);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [handle]);

  const loadMore = async () => {
    if (!data || !data.pageInfo.hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const next = await marketplaceStore(
        data.store.handle,
        data.products.length,
        data.pageInfo.limit
      );
      const known = new Set(data.products.map((product) => product.id));

      setData({
        ...data,
        products: [
          ...data.products,
          ...next.products.filter((product) => !known.has(product.id))
        ],
        pageInfo: next.pageInfo
      });
    } catch {
      // Keep the current store page usable if loading another page fails.
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && !data) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          loadingVariant="store"
          title={t("marketplace.store.loadingTitle")}
          message={t("marketplace.store.loadingMessage")}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("marketplace.errorTitle")}
          message={t(
            marketplaceErrorKey(error?.code ?? "service_unavailable")
          )}
          actionLabel={t("marketplace.backHome")}
          onAction={() => router.replace("/(tabs)/marketplace")}
        />
      </Screen>
    );
  }

  const store = data.store;

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>

      {cached ? (
        <Card muted>
          <AppText variant="caption" tone="muted">
            {t("marketplace.cachedNotice")}
          </AppText>
        </Card>
      ) : null}

      {store.coverImageUrl ? (
        <Image
          source={{ uri: store.coverImageUrl }}
          accessibilityLabel={store.name}
          resizeMode="cover"
          style={{
            height: 200,
            width: "100%",
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surfaceMuted
          }}
        />
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: theme.spacing.md
            }}
          >
            {store.logoUrl ? (
              <Image
                source={{ uri: store.logoUrl }}
                accessibilityLabel={store.name}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.colors.surfaceMuted
                }}
              />
            ) : null}
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Badge label={store.category} tone="primary" />
              <AppText variant="title">{store.name}</AppText>
              <AppText variant="caption" tone="muted">
                {store.province} · {store.cityDistrict}
              </AppText>
            </View>
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="heading">{t("trust.sellerTrust")}</AppText>
            <Badge
              label={t(
                data.trust.phoneVerified
                  ? "trust.phoneVerified"
                  : "trust.phoneNotVerified"
              )}
              tone={data.trust.phoneVerified ? "success" : "neutral"}
            />
            <AppText variant="caption" tone="muted">
              {t("trust.planNotVerification")}
            </AppText>
          </View>

          {store.description ? (
            <AppText>{store.description}</AppText>
          ) : null}

          {store.physicalAddress ? (
            <AppText tone="muted">{t("seller.onboarding.address")}: {store.physicalAddress}</AppText>
          ) : null}

          {store.businessHours ? (
            <AppText variant="caption" tone="muted">
              {t("storefront.hoursLabel")}: {store.businessHours}
            </AppText>
          ) : null}
        </View>
      </Card>

      {store.mapLatitude !== null && store.mapLongitude !== null ? (
        <Card><StoreMapPreview coordinates={{ latitude: store.mapLatitude, longitude: store.mapLongitude }} /></Card>
      ) : null}

      {data.categories.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("marketplace.store.categories")}</AppText>
          <HorizontalLocaleScroll
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.sm }}
          >
            {data.categories.map((category) => (
              <Badge key={category.id} label={category.name} tone="neutral" />
            ))}
          </HorizontalLocaleScroll>
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <AppText variant="heading">{t("marketplace.store.products")}</AppText>

        {data.products.length === 0 ? (
          <StateView
            kind="empty"
            title={t("marketplace.store.emptyTitle")}
            message={t("marketplace.store.emptyMessage")}
          />
        ) : (
          <MarketplaceProductGrid products={data.products} />
        )}

        {data.pageInfo.hasMore ? (
          <Button
            variant="secondary"
            loading={loadingMore}
            onPress={() => {
              void loadMore();
            }}
          >
            {t("marketplace.loadMore")}
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}
