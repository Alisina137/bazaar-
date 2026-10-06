import type {
  MarketplaceProductDetailResponse,
  MarketplaceVariantSummary,
  ProductReviewsResponse
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
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

import { useAuth } from "@/auth/provider";
import {
  addCartItem,
  CartPricingApiError
} from "@/cart-pricing/api";
import { cartPricingErrorKey } from "@/cart-pricing/messages";
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
import { productReviews } from "@/trust/api";

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
  const { status: authStatus, sessionToken, user } = useAuth();
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
  const [purchaseBusy, setPurchaseBusy] = useState<"cart" | "buy" | null>(null);
  const [purchaseError, setPurchaseError] = useState<TranslationKey | null>(
    null
  );
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviews, setReviews] = useState<ProductReviewsResponse | null>(null);

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

  useEffect(() => {
    if (!productId) return;
    let active = true;
    void productReviews(productId)
      .then((result) => {
        if (active) setReviews(result);
      })
      .catch(() => undefined);
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
  const variantRequired =
    product.variants.length > 0 && selectedVariant === null;
  const purchaseDisabled = !available || variantRequired;

  const purchase = async (buyNow: boolean) => {
    setPurchaseError(null);
    setAddedToCart(false);

    if (authStatus !== "signedIn" || !sessionToken) {
      router.push("/(tabs)/account");
      return;
    }

    if (variantRequired) {
      setPurchaseError("cart.selectVariant");
      return;
    }

    setPurchaseBusy(buyNow ? "buy" : "cart");

    try {
      await addCartItem(sessionToken, {
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        quantity: 1
      });

      if (buyNow) {
        router.push("/checkout");
      } else {
        setAddedToCart(true);
      }
    } catch (requestError) {
      const error =
        requestError instanceof CartPricingApiError
          ? requestError
          : new CartPricingApiError("service_unavailable");
      setPurchaseError(cartPricingErrorKey(error.code));
    } finally {
      setPurchaseBusy(null);
    }
  };

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
                disabled={!variant.available || !variant.inStock}
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
          <Badge
            label={t(
              product.store.trust.phoneVerified
                ? "trust.phoneVerified"
                : "trust.phoneNotVerified"
            )}
            tone={product.store.trust.phoneVerified ? "success" : "neutral"}
          />
          <AppText variant="caption" tone="muted">
            {t("trust.planNotVerification")}
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
          {variantRequired ? (
            <AppText variant="caption" tone="muted">
              {t("cart.selectVariant")}
            </AppText>
          ) : null}
          {addedToCart ? (
            <Badge label={t("cart.added")} tone="success" />
          ) : null}
          {purchaseError ? (
            <AppText tone="danger">{t(purchaseError)}</AppText>
          ) : null}
          <Button
            fullWidth
            disabled={purchaseDisabled || purchaseBusy !== null}
            loading={purchaseBusy === "cart"}
            onPress={() => {
              void purchase(false);
            }}
          >
            {t("marketplace.product.addToCart")}
          </Button>
          <Button
            fullWidth
            variant="secondary"
            disabled={purchaseDisabled || purchaseBusy !== null}
            loading={purchaseBusy === "buy"}
            onPress={() => {
              void purchase(true);
            }}
          >
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

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("review.summary")}</AppText>
          {reviews?.summary.averageRating !== null &&
          reviews?.summary.averageRating !== undefined ? (
            <Badge
              label={
                "★ " +
                reviews.summary.averageRating +
                " · " +
                reviews.summary.reviewCount +
                " " +
                t("marketplace.reviewsCount")
              }
              tone="primary"
            />
          ) : null}
          {!reviews || reviews.reviews.length === 0 ? (
            <AppText tone="muted">{t("review.noReviews")}</AppText>
          ) : (
            reviews.reviews.map((review) => (
              <View
                key={review.id}
                style={{
                  gap: theme.spacing.sm,
                  paddingVertical: theme.spacing.sm
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    gap: theme.spacing.sm,
                    flexWrap: "wrap"
                  }}
                >
                  <Badge label={"★ " + review.rating} tone="primary" />
                  <Badge
                    label={t("trust.verifiedPurchase")}
                    tone="success"
                  />
                </View>
                {review.customerDisplayName ? (
                  <AppText variant="bodyStrong">
                    {review.customerDisplayName}
                  </AppText>
                ) : null}
                {review.text ? <AppText>{review.text}</AppText> : null}
                {review.merchantResponse ? (
                  <Card muted>
                    <AppText variant="bodyStrong">
                      {t("review.merchantResponse")}
                    </AppText>
                    <AppText>{review.merchantResponse}</AppText>
                  </Card>
                ) : null}
                {review.imageUrls.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={{
                      width: "100%",
                      height: 180,
                      borderRadius: theme.radii.md,
                      backgroundColor: theme.colors.surfaceMuted
                    }}
                    resizeMode="cover"
                  />
                ))}
                {authStatus === "signedIn" &&
                user?.id !== review.customerUserId ? (
                  <Button
                    variant="ghost"
                    onPress={() =>
                      router.push({
                        pathname: "/reviews/[reviewId]/report",
                        params: { reviewId: review.id }
                      })
                    }
                  >
                    {t("review.report")}
                  </Button>
                ) : null}
              </View>
            ))
          )}
        </View>
      </Card>
    </Screen>
  );
}
