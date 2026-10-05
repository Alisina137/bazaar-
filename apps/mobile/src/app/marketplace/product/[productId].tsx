import type {
  MarketplaceProductDetailResponse,
  MarketplaceVariantSummary
} from "@bazaarlink/contracts";
import {
  useLocalSearchParams,
  useRouter
} from "expo-router";
import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Image,
  ScrollView,
  Share,
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
  marketplaceProduct,
  recordMarketplaceView
} from "@/marketplace/api";
import {
  productCacheKey,
  readProductCache,
  rememberProduct,
  writeProductCache
} from "@/marketplace/cache";
import { marketplaceErrorKey } from "@/marketplace/messages";

function storefrontBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_STOREFRONT_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export default function MarketplaceProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { formatAfn, t } = useLocalization();

  const [data, setData] = useState<MarketplaceProductDetailResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MarketplaceApiError | null>(null);
  const [cached, setCached] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setError(new MarketplaceApiError("invalid_request"));
      return;
    }

    let active = true;
    const key = productCacheKey(productId);

    void (async () => {
      setLoading(true);
      setError(null);
      setCached(false);

      try {
        const response = await marketplaceProduct(productId);
        if (!active) return;

        setData(response);
        await Promise.all([
          writeProductCache(key, response),
          rememberProduct(productId),
          recordMarketplaceView(productId).catch(() => undefined)
        ]);
      } catch (requestError) {
        if (!active) return;

        const safeError =
          requestError instanceof MarketplaceApiError
            ? requestError
            : new MarketplaceApiError("service_unavailable");
        const fallback = await readProductCache(key, true);

        if (!active) return;

        if (fallback) {
          setData(fallback);
          setCached(true);
          await rememberProduct(productId);
        } else {
          setError(safeError);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  const selectedVariant = useMemo<MarketplaceVariantSummary | null>(() => {
    if (!data || !selectedVariantId) {
      return null;
    }

    return (
      data.product.variants.find(
        (variant) => variant.id === selectedVariantId
      ) ?? null
    );
  }, [data, selectedVariantId]);

  if (loading && !data) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("marketplace.product.loadingTitle")}
          message={t("marketplace.product.loadingMessage")}
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
            marketplaceErrorKey(
              error?.code ?? "service_unavailable"
            )
          )}
          actionLabel={t("marketplace.backHome")}
          onAction={() => router.replace("/(tabs)/marketplace")}
        />
      </Screen>
    );
  }

  const product = data.product;
  const price =
    selectedVariant?.priceOverride ?? product.price;
  const available =
    selectedVariant !== null
      ? selectedVariant.inStock
      : product.inStock;

  return (
    <Screen contentStyle={{ paddingBottom: theme.spacing["2xl"] * 2 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: theme.spacing.sm
        }}
      >
        <Button
          variant="ghost"
          onPress={() => router.back()}
        >
          {t("marketplace.back")}
        </Button>
        <Button
          variant="ghost"
          onPress={() => {
            void Share.share({
              message:
                product.name +
                " — " +
                storefrontBaseUrl() +
                "/product/" +
                product.id
            });
          }}
        >
          {t("marketplace.share")}
        </Button>
      </View>

      {cached ? (
        <Card muted>
          <AppText variant="caption" tone="muted">
            {t("marketplace.cachedNotice")}
          </AppText>
        </Card>
      ) : null}

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        {product.images.length > 0 ? (
          product.images.map((image) => (
            <Image
              key={image.id}
              source={{ uri: image.url }}
              accessibilityLabel={image.altText ?? product.name}
              resizeMode="cover"
              style={{
                width: 320,
                height: 320,
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.surfaceMuted
              }}
            />
          ))
        ) : product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            accessibilityLabel={product.name}
            resizeMode="cover"
            style={{
              width: 320,
              height: 320,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceMuted
            }}
          />
        ) : (
          <Card
            muted
            style={{
              width: 320,
              height: 240,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <AppText tone="muted">
              {t("marketplace.imageUnavailable")}
            </AppText>
          </Card>
        )}
      </ScrollView>

      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm
          }}
        >
          <Badge
            label={
              available
                ? t("marketplace.inStock")
                : t("marketplace.outOfStock")
            }
            tone={available ? "success" : "warning"}
          />
          {product.hasDiscount ? (
            <Badge label={t("marketplace.dealBadge")} tone="primary" />
          ) : null}
        </View>
        <AppText variant="display">{product.name}</AppText>
        {product.brand ? (
          <AppText tone="muted">{product.brand}</AppText>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: theme.spacing.sm
          }}
        >
          <AppText variant="title">{formatAfn(price)}</AppText>
          {product.hasDiscount && product.compareAtPrice !== null ? (
            <AppText
              variant="body"
              tone="muted"
              style={{ textDecorationLine: "line-through" }}
            >
              {formatAfn(product.compareAtPrice)}
            </AppText>
          ) : null}
        </View>
      </View>

      {product.variants.length > 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="heading">
              {t("marketplace.product.variants")}
            </AppText>
            {product.variants.map((variant) => (
              <Button
                key={variant.id}
                variant={
                  selectedVariantId === variant.id
                    ? "primary"
                    : "secondary"
                }
                disabled={!variant.available}
                onPress={() => setSelectedVariantId(variant.id)}
              >
                {variant.title}
                {variant.priceOverride !== null
                  ? " · " + formatAfn(variant.priceOverride)
                  : ""}
                {!variant.inStock
                  ? " · " + t("marketplace.outOfStock")
                  : ""}
              </Button>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">
            {t("marketplace.product.seller")}
          </AppText>
          <AppText variant="title">{product.store.name}</AppText>
          <AppText tone="muted">
            {product.store.province} · {product.store.cityDistrict}
          </AppText>
          <Button
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/marketplace/store/[handle]",
                params: { handle: product.store.handle }
              })
            }
          >
            {t("marketplace.product.openStore")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">
            {t("marketplace.product.delivery")}
          </AppText>
          <AppText tone="muted">
            {t("marketplace.product.deliveryPending")}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">
            {t("marketplace.product.payment")}
          </AppText>
          <AppText tone="muted">
            {t("marketplace.product.paymentPending")}
          </AppText>
        </View>
      </Card>

      {product.description ? (
        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="heading">
              {t("marketplace.product.description")}
            </AppText>
            <AppText>{product.description}</AppText>
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">
            {t("marketplace.product.purchase")}
          </AppText>
          <AppText tone="muted">
            {t("marketplace.product.cartPhaseReady")}
          </AppText>
          <Button fullWidth disabled>
            {t("marketplace.product.addToCart")}
          </Button>
          <Button fullWidth variant="secondary" disabled>
            {t("marketplace.product.buyNow")}
          </Button>
        </View>
      </Card>

      {data.relatedProducts.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">
            {t("marketplace.product.related")}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.md }}
          >
            {data.relatedProducts.map((related) => (
              <MarketplaceProductCard
                key={related.id}
                product={related}
                compact
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Card muted>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">
            {t("marketplace.product.reviews")}
          </AppText>
          <AppText tone="muted">
            {t("marketplace.product.reviewsPending")}
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}
