import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { discountPercentage } from "@/marketplace/card-presentation";

interface MarketplaceProductCardProps {
  product: MarketplaceProductSummary;
  compact?: boolean;
  grid?: boolean;
}

export function MarketplaceProductCard({
  product, compact = false, grid = false
}: MarketplaceProductCardProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, formatAfn, formatNumber, t } = useLocalization();
  const [imageFailed, setImageFailed] = useState(false);
  const discount = discountPercentage(product);
  const compareAt = discount !== null ? product.compareAtPrice : null;
  const imageHeight = compact ? 148 : grid ? 152 : 218;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name + ", " + formatAfn(product.price) +
        (product.inStock ? "" : ", " + t("marketplace.outOfStock"))}
      onPress={() => router.push({
        pathname: "/marketplace/product/[productId]",
        params: { productId: product.id }
      })}
      style={({ pressed }) => ({
        width: compact ? 182 : grid ? "48%" : "100%",
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.lg,
        overflow: "hidden",
        backgroundColor: theme.colors.surface,
        ...(theme.scheme === "light" ? theme.elevation.card : {}),
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      <View style={{ height: imageHeight, position: "relative" }}>
        {product.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: product.imageUrl }}
            accessibilityLabel={product.name}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            style={{
              width: "100%", height: "100%",
              backgroundColor: theme.colors.surfaceMuted
            }}
          />
        ) : (
          <View style={{
            flex: 1, alignItems: "center", justifyContent: "center",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.surfaceMuted
          }}>
            <Ionicons name="image-outline" size={32} color={theme.colors.textMuted} />
            <AppText variant="caption" tone="muted" align="center">
              {t("marketplace.imageUnavailable")}
            </AppText>
          </View>
        )}

        {discount !== null ? (
          <View style={{
            position: "absolute", top: theme.spacing.sm,
            ...(isRTL ? { right: theme.spacing.sm } : { left: theme.spacing.sm }),
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.dangerSoft,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs
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
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs
          }}>
            <AppText variant="caption">{t("marketplace.outOfStock")}</AppText>
          </View>
        ) : null}
      </View>

      <View style={{
        padding: theme.spacing.md, gap: theme.spacing.xs,
        minHeight: compact || grid ? 155 : 142
      }}>
        <AppText variant="label" numberOfLines={2}
          style={{ minHeight: theme.lineHeights.label * 2 }}>
          {product.name}
        </AppText>

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
              {product.store.province}
            </AppText>
          </View>
          {product.averageRating !== null && product.reviewCount > 0 ? (
            <>
              <Ionicons name="star" size={12} color={theme.colors.warning} />
              <AppText variant="caption" numberOfLines={1}>
                {formatNumber(product.averageRating)}
              </AppText>
            </>
          ) : null}
        </View>

        <View style={{ gap: theme.spacing.xxs, marginTop: theme.spacing.xs }}>
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
      </View>
    </Pressable>
  );
}
