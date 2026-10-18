import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { discountPercentage, ratingSummary } from "@/marketplace/card-presentation";
import { isProvinceName, provinceName } from "@/marketplace/provinces";

interface MarketplaceProductCardProps {
  product: MarketplaceProductSummary;
  compact?: boolean;
  grid?: boolean;
  /** Omit the control when no authenticated wishlist controller is provided. */
  onSavePress?: (() => void) | undefined;
  saved?: boolean | undefined;
  saving?: boolean | undefined;
  saveDisabled?: boolean | undefined;
}

export function MarketplaceProductCard({
  product, compact = false, grid = false, onSavePress,
  saved = false, saving = false, saveDisabled = false
}: MarketplaceProductCardProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, locale, formatAfn, formatNumber, t } = useLocalization();

  // Key the error by URL so a reused card does not inherit a prior image error.
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const imageUrl = product.imageUrl;
  const imageFailed = imageUrl !== null && failedImageUrl === imageUrl;
  const imageLoading = imageUrl !== null && loadedImageUrl !== imageUrl && !imageFailed;

  const discount = discountPercentage(product);
  const compareAt = discount !== null ? product.compareAtPrice : null;
  const rating = ratingSummary(product);
  const location = isProvinceName(product.store.province)
    ? provinceName(product.store.province, locale)
    : product.store.province;
  const category = product.marketplaceCategory;
  const categoryName = category
    ? locale === "ps-AF" ? category.namePs
      : locale === "en" ? category.nameEn : category.nameFa
    : null;

  const viewProduct = () => router.push({
    pathname: "/marketplace/product/[productId]",
    params: { productId: product.id }
  });

  return (
    <View style={{
      width: compact ? 182 : grid ? "48%" : "100%",
      alignSelf: "flex-start", position: "relative"
    }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          product.name + ", " + formatAfn(product.price) +
          (product.inStock ? "" : ", " + t("marketplace.outOfStock")) +
          (rating ? ", " + t("marketplace.rating") + " " + formatNumber(rating.average) : "")
        }
        accessibilityHint={t("marketplace.phase4.openDetails")}
        onPress={viewProduct}
        style={({ pressed }) => ({
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          overflow: "hidden",
          backgroundColor: theme.colors.surface,
          ...(theme.scheme === "light" ? theme.elevation.card : {}),
          opacity: pressed ? theme.opacity.pressed : 1
        })}
      >
        <View style={{
          aspectRatio: compact ? 1.18 : grid ? 1 : 1.5,
          position: "relative",
          backgroundColor: theme.colors.surfaceMuted,
          alignItems: "center", justifyContent: "center"
        }}>
          {imageUrl && !imageFailed ? (
            <Image
              key={imageUrl}
              source={{ uri: imageUrl }}
              accessibilityLabel={product.name}
              resizeMode="contain"
              onLoad={() => setLoadedImageUrl(imageUrl)}
              onError={() => setFailedImageUrl(imageUrl)}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View style={{
              flex: 1, alignItems: "center", justifyContent: "center",
              gap: theme.spacing.xs, padding: theme.spacing.sm
            }}>
              <Ionicons name="image-outline" size={30} color={theme.colors.textMuted} />
              <AppText variant="caption" tone="muted" align="center">
                {t("marketplace.imageUnavailable")}
              </AppText>
            </View>
          )}

          {imageLoading ? (
            <View pointerEvents="none" style={{
              position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
              justifyContent: "center", alignItems: "center",
              backgroundColor: theme.colors.surfaceMuted
            }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null}

          {discount !== null ? (
            <View style={{
              position: "absolute", top: theme.spacing.sm,
              ...(isRTL ? { right: theme.spacing.sm } : { left: theme.spacing.sm }),
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.dangerSoft,
              paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs
            }}>
              <AppText variant="caption" tone="danger">
                {"−" + formatNumber(discount) + "%"}
              </AppText>
            </View>
          ) : null}
          {!product.inStock ? (
            <View style={{
              position: "absolute", bottom: theme.spacing.sm,
              ...(isRTL ? { right: theme.spacing.sm } : { left: theme.spacing.sm }),
              backgroundColor: theme.colors.warningSoft,
              borderRadius: theme.radii.sm,
              paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs
            }}>
              <AppText variant="caption">{t("marketplace.outOfStock")}</AppText>
            </View>
          ) : null}
        </View>

        <View style={{
          padding: theme.spacing.md, gap: theme.spacing.xs,
          minHeight: compact || grid ? 180 : 158
        }}>
          {categoryName ? (
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {categoryName}
            </AppText>
          ) : null}

          <AppText variant="label" numberOfLines={2}
            style={{ minHeight: theme.lineHeights.label * 2 }}>
            {product.name}
          </AppText>

          <View style={{ gap: theme.spacing.xxs, minHeight: 42 }}>
            <AppText variant="bodyStrong" tone="primary" numberOfLines={1}>
              {formatAfn(product.price)}
            </AppText>
            {compareAt !== null ? (
              <AppText variant="caption" tone="muted"
                style={{ textDecorationLine: "line-through" }} numberOfLines={1}>
                {formatAfn(compareAt)}
              </AppText>
            ) : null}
          </View>

          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.xs, minHeight: 20
          }}>
            {rating ? (
              <>
                <Ionicons name="star" size={14} color={theme.colors.warning} />
                <AppText variant="caption" numberOfLines={1}>
                  {formatNumber(rating.average)}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {"(" + formatNumber(rating.count) + ")"}
                </AppText>
              </>
            ) : (
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {t("marketplace.phase4.noReviews")}
              </AppText>
            )}
          </View>

          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.xs
          }}>
            <Ionicons name="storefront-outline" size={13} color={theme.colors.textMuted} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {product.store.name}
              </AppText>
            </View>
            {product.store.trust.phoneVerified ? (
              <Ionicons name="checkmark-circle" size={15}
                color={theme.colors.success}
                accessibilityLabel={t("trust.phoneVerified")} />
            ) : null}
          </View>

          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.xs
          }}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {location}
              </AppText>
            </View>
            {!compact && !grid ? (
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={17}
                color={theme.colors.primary} />
            ) : null}
          </View>
        </View>
      </Pressable>

      {onSavePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(saved ? "account.shopping.saved" : "account.shopping.save")}
          accessibilityHint={t("marketplace.phase4.saveHint")}
          accessibilityState={{ disabled: saveDisabled || saving, busy: saving, selected: saved }}
          disabled={saveDisabled || saving}
          onPress={onSavePress}
          style={({ pressed }) => ({
            position: "absolute", top: theme.spacing.xs,
            ...(isRTL ? { left: theme.spacing.xs } : { right: theme.spacing.xs }),
            minHeight: 48, minWidth: 48, borderRadius: theme.radii.full,
            alignItems: "center", justifyContent: "center",
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border, borderWidth: 1,
            opacity: saveDisabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1
          })}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name={saved ? "heart" : "heart-outline"} size={23}
              color={saved ? theme.colors.danger : theme.colors.text} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
