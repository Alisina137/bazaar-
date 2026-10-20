import type {
  MarketplaceProductDetailResponse,
  MarketplaceVariantSummary,
  ProductReviewsResponse
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter
} from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Share,
  View
} from "react-native";

import { useAuth } from "@/auth/provider";
import { getWishlist, removeWishlistProduct, saveWishlistProduct } from "@/account/wishlist-api";
import {
  addCartItem,
  CartPricingApiError
} from "@/cart-pricing/api";
import { cartPricingErrorKey } from "@/cart-pricing/messages";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { ProductImageGallery } from "@/components/marketplace/ProductImageGallery";
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
import { addCompareProduct, getCompareProductIds, removeCompareProduct } from "@/marketplace/compare";
import { isProvinceName, provinceName } from "@/marketplace/provinces";

function storefrontBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_STOREFRONT_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function ProductAction({
  icon, label, onPress, selected = false, busy = false, disabled = false
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  selected?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, busy, disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 44, minHeight: 44, borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.radii.full,
        backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        alignItems: "center", justifyContent: "center",
        opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1
      })}
    >
      {busy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : (
        <Ionicons name={icon} size={20}
          color={selected ? theme.colors.primary : theme.colors.text} />
      )}
    </Pressable>
  );
}

export default function MarketplaceProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { status: authStatus, sessionToken, user } = useAuth();
  const { isRTL, locale, formatAfn, formatNumber, t } = useLocalization();

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
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [wishlistError, setWishlistError] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareFull, setCompareFull] = useState(false);
  const [compareBusy, setCompareBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setWishlisted(false);
    setWishlistError(false);
    if (authStatus === "signedIn" && sessionToken && productId) {
      void getWishlist(sessionToken).then(response => {
        if (active) setWishlisted(response.savedProductIds.includes(productId));
      }).catch(() => {
        if (active) setWishlistError(true);
      });
    }
    return () => { active = false; };
  }, [authStatus, sessionToken, productId]);

  const toggleWishlist = async () => {
    if (wishlistBusy || !productId) return;
    if (authStatus !== "signedIn" || !sessionToken) {
      router.push("/(tabs)/account");
      return;
    }
    setWishlistBusy(true);
    setWishlistError(false);
    try {
      if (wishlisted) await removeWishlistProduct(sessionToken, productId);
      else await saveWishlistProduct(sessionToken, productId);
      setWishlisted(previous => !previous);
    } catch {
      setWishlistError(true);
    } finally {
      setWishlistBusy(false);
    }
  };


  useFocusEffect(useCallback(() => {
    let active = true;
    setCompareFull(false);
    void getCompareProductIds().then(ids => {
      if (active) setCompareIds(ids);
    });
    return () => { active = false; };
  }, [productId]));

  const toggleCompare = async () => {
    if (!productId || compareBusy) return;
    setCompareBusy(true);
    setCompareFull(false);
    try {
      const latestIds = await getCompareProductIds();
      if (latestIds.includes(productId)) {
        await removeCompareProduct(productId);
        setCompareIds(await getCompareProductIds());
      } else {
        const added = await addCompareProduct(productId);
        const ids = await getCompareProductIds();
        setCompareIds(ids);
        setCompareFull(!added);
      }
    } catch {
      setCompareFull(true);
    } finally {
      setCompareBusy(false);
    }
  };

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setError(new MarketplaceApiError("invalid_request"));
      return;
    }

    let active = true;
    setData(null);
    setSelectedVariantId(null);
    setAddedToCart(false);
    setReviews(null);
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
  const images = product.images.length > 0
    ? product.images.map(image => ({
        id: image.id, url: image.url, altText: image.altText ?? product.name
      }))
    : product.imageUrl
      ? [{ id: product.id, url: product.imageUrl, altText: product.name }]
      : [];
  const galleryImages = selectedVariant?.imageUrl
    ? [{ id: selectedVariant.id, url: selectedVariant.imageUrl, altText: selectedVariant.title },
        ...images.filter(image => image.url !== selectedVariant.imageUrl)]
    : images;
  const originalPrice = product.compareAtPrice !== null &&
    product.compareAtPrice > price ? product.compareAtPrice : null;
  const savingPercent = originalPrice === null
    ? null : Math.round((1 - price / originalPrice) * 100);
  const categoryName = product.marketplaceCategory
    ? locale === "en" ? product.marketplaceCategory.nameEn
      : locale === "ps-AF" ? product.marketplaceCategory.namePs
      : product.marketplaceCategory.nameFa
    : null;
  const sellerProvince = isProvinceName(product.store.province)
    ? provinceName(product.store.province, locale) : product.store.province;
  const ratingCount = reviews?.summary.reviewCount ?? product.reviewCount;
  const ratingAverage = reviews?.summary.averageRating ?? product.averageRating;

  const purchase = async (buyNow: boolean) => {
    if (purchaseBusy !== null) return;
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
    <Screen contentStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing["3xl"] }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", justifyContent: "space-between",
        gap: theme.spacing.sm
      }}>
        <ProductAction icon={isRTL ? "arrow-forward" : "arrow-back"}
          label={t("marketplace.back")} onPress={() => router.back()} />
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: theme.spacing.sm, alignItems: "center"
        }}>
          <ProductAction
            icon={wishlisted ? "heart" : "heart-outline"}
            label={t(wishlisted ? "account.shopping.saved" : "account.shopping.save")}
            selected={wishlisted} busy={wishlistBusy}
            onPress={() => { void toggleWishlist(); }} />
          <ProductAction icon="git-compare-outline"
            label={t(compareIds.includes(product.id) ? "marketplace.compare.remove" : "marketplace.compare.add")}
            selected={compareIds.includes(product.id)} busy={compareBusy}
            onPress={() => { void toggleCompare(); }} />
          <ProductAction icon="share-social-outline"
            label={t("marketplace.share")}
            onPress={() => {
              void Share.share({
                message: product.name + " — " + storefrontBaseUrl() + "/product/" + product.id
              });
            }} />
        </View>
      </View>

      {wishlistError ? (
        <AppText tone="danger" accessibilityRole="alert">{t("account.shopping.saveError")}</AppText>
      ) : null}
      {compareFull ? (
        <AppText tone="danger" accessibilityRole="alert">{t("marketplace.compare.full")}</AppText>
      ) : null}
      {cached ? (
        <Card muted>
          <AppText variant="caption" tone="muted">{t("marketplace.cachedNotice")}</AppText>
        </Card>
      ) : null}

      <ProductImageGallery
        key={product.id + ":" + (selectedVariantId ?? "")}
        images={galleryImages}
        productName={product.name}
      />

      <View style={{ gap: theme.spacing.md }}>
        {categoryName ? (
          <AppText variant="caption" tone="primary">{categoryName}</AppText>
        ) : null}
        <AppText variant="heading">{product.name}</AppText>
        {product.brand ? (
          <AppText tone="muted" variant="label">{product.brand}</AppText>
        ) : null}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          flexWrap: "wrap", alignItems: "center", gap: theme.spacing.sm
        }}>
          <Badge label={available ? t("marketplace.inStock") : t("marketplace.outOfStock")}
            tone={available ? "success" : "warning"} />
          {savingPercent !== null && savingPercent > 0 ? (
            <Badge label={"−" + formatNumber(savingPercent) + "%"} tone="primary" />
          ) : null}
          {ratingAverage !== null && ratingCount > 0 ? (
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", gap: theme.spacing.xs
            }}>
              <Ionicons name="star" size={16} color={theme.colors.warning} />
              <AppText variant="label">{formatNumber(ratingAverage)}</AppText>
              <AppText variant="caption" tone="muted">
                {"(" + formatNumber(ratingCount) + ")"}
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "baseline", flexWrap: "wrap", gap: theme.spacing.md
        }}>
          <AppText variant="title" tone="primary">{formatAfn(price)}</AppText>
          {originalPrice !== null ? (
            <AppText variant="body" tone="muted" style={{ textDecorationLine: "line-through" }}>
              {formatAfn(originalPrice)}
            </AppText>
          ) : null}
        </View>
      </View>

      {product.variants.length > 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="heading">{t("marketplace.product.variants")}</AppText>
            <AppText variant="caption" tone="muted">
              {t("marketplace.product.optionsHint")}
            </AppText>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              flexWrap: "wrap", gap: theme.spacing.sm
            }}>
              {product.variants.map(variant => {
                const selected = selectedVariantId === variant.id;
                const selectable = variant.available && variant.inStock;
                return (
                  <Pressable
                    key={variant.id}
                    accessibilityRole="radio"
                    accessibilityLabel={variant.title}
                    accessibilityState={{ checked: selected, disabled: !selectable }}
                    disabled={!selectable}
                    onPress={() => {
                      setSelectedVariantId(variant.id);
                      setPurchaseError(null);
                      setAddedToCart(false);
                    }}
                    style={({ pressed }) => ({
                      minWidth: "46%", flexGrow: 1, minHeight: 50,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      gap: theme.spacing.xs,
                      justifyContent: "center", alignItems: "center",
                      borderRadius: theme.radii.md, borderWidth: selected ? 2 : 1,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                      opacity: !selectable ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1
                    })}
                  >
                    <AppText variant="label" align="center"
                      tone={selected ? "primary" : "default"}>{variant.title}</AppText>
                    {variant.priceOverride !== null ? (
                      <AppText variant="caption" align="center">{formatAfn(variant.priceOverride)}</AppText>
                    ) : null}
                    {!selectable ? (
                      <AppText variant="caption" align="center" tone="muted">
                        {t("marketplace.outOfStock")}
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "space-between",
            gap: theme.spacing.sm
          }}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{t("marketplace.product.purchase")}</AppText>
              <AppText variant="caption" tone="muted">
                {variantRequired ? t("cart.selectVariant") : t("marketplace.product.cartPhaseReady")}
              </AppText>
            </View>
            <AppText variant="bodyStrong" tone="primary">{formatAfn(price)}</AppText>
          </View>
          {!available ? (
            <Badge label={t("marketplace.outOfStock")} tone="warning" />
          ) : null}
          {addedToCart ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Badge label={t("cart.added")} tone="success" />
              <Button variant="secondary"
                onPress={() => router.push({
                  pathname: "/(tabs)/shopping", params: { section: "cart" }
                })}>
                {t("marketplace.product.viewCart")}
              </Button>
            </View>
          ) : null}
          {purchaseError ? <AppText tone="danger" accessibilityRole="alert">{t(purchaseError)}</AppText> : null}
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            gap: theme.spacing.sm
          }}>
            <View style={{ flex: 1 }}>
              <Button fullWidth
                disabled={purchaseDisabled || purchaseBusy !== null}
                loading={purchaseBusy === "cart"}
                onPress={() => { void purchase(false); }}>
                {t("marketplace.product.addToCart")}
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button fullWidth variant="secondary"
                disabled={purchaseDisabled || purchaseBusy !== null}
                loading={purchaseBusy === "buy"}
                onPress={() => { void purchase(true); }}>
                {t("marketplace.product.buyNow")}
              </Button>
            </View>
          </View>
        </View>
      </Card>

      {compareIds.length > 0 ? (
        <Button variant="ghost" onPress={() => router.push("/marketplace/compare")}>
          {t("marketplace.compare.open")} ({formatNumber(compareIds.length)})
        </Button>
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

      {data.relatedProducts.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">
            {t("marketplace.product.related")}
          </AppText>
          <HorizontalLocaleScroll
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
          </HorizontalLocaleScroll>
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
                    flexDirection: isRTL ? "row-reverse" : "row",
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
