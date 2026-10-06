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
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
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
  const { t } = useLocalization();

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
              flexDirection: "row",
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

          {store.businessHours ? (
            <AppText variant="caption" tone="muted">
              {t("storefront.hoursLabel")}: {store.businessHours}
            </AppText>
          ) : null}
        </View>
      </Card>

      {data.categories.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("marketplace.store.categories")}</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.sm }}
          >
            {data.categories.map((category) => (
              <Badge key={category.id} label={category.name} tone="neutral" />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <AppText variant="title">{t("marketplace.store.products")}</AppText>

        {data.products.length === 0 ? (
          <StateView
            kind="empty"
            title={t("marketplace.store.emptyTitle")}
            message={t("marketplace.store.emptyMessage")}
          />
        ) : (
          data.products.map((product) => (
            <MarketplaceProductCard key={product.id} product={product} />
          ))
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
