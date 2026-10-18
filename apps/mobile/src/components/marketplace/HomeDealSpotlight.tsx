import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { discountPercentage } from "@/marketplace/card-presentation";

export function HomeDealSpotlight({
  product
}: {
  product: MarketplaceProductSummary;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, isRTL, formatAfn, formatNumber } = useLocalization();
  const [imageFailed, setImageFailed] = useState(false);
  const sale = discountPercentage(product);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("home.featuredDeal") + ": " + product.name}
      onPress={() => router.push({
        pathname: "/marketplace/product/[productId]",
        params: { productId: product.id }
      })}
      style={({ pressed }) => ({
        minHeight: 184,
        padding: theme.spacing.lg,
        flexDirection: isRTL ? "row-reverse" : "row",
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.xl,
        backgroundColor: theme.colors.primarySoft,
        gap: theme.spacing.md,
        alignItems: "center",
        overflow: "hidden",
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      <View style={{
        position: "absolute",
        width: 135, height: 135, borderRadius: 70,
        borderWidth: 18,
        borderColor: theme.colors.border,
        opacity: 0.45,
        top: -62,
        ...(isRTL ? { left: -45 } : { right: -45 })
      }} />
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.sm }}>
        <View style={{
          alignSelf: isRTL ? "flex-end" : "flex-start",
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: theme.spacing.xs,
          alignItems: "center"
        }}>
          <Ionicons name="flash" size={14} color={theme.colors.primary} />
          <AppText variant="caption" tone="primary">{t("home.featuredDeal")}</AppText>
        </View>
        <AppText variant="bodyStrong" numberOfLines={2}>{product.name}</AppText>
        <AppText variant="heading" tone="primary" numberOfLines={1}>
          {formatAfn(product.price)}
        </AppText>
        {sale !== null && product.compareAtPrice !== null ? (
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm,
            flexWrap: "wrap"
          }}>
            <AppText variant="caption" tone="muted"
              style={{ textDecorationLine: "line-through" }}>
              {formatAfn(product.compareAtPrice)}
            </AppText>
            <AppText variant="caption" tone="danger">
              {"−" + formatNumber(sale) + "%"}
            </AppText>
          </View>
        ) : null}
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.xs
        }}>
          <AppText variant="label" tone="primary">{t("home.shopDeal")}</AppText>
          <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={17}
            color={theme.colors.primary} />
        </View>
      </View>
      <View style={{
        width: 118, height: 148,
        borderWidth: 2,
        borderColor: theme.colors.surface,
        borderRadius: theme.radii.lg,
        overflow: "hidden",
        backgroundColor: theme.colors.surface,
        justifyContent: "center", alignItems: "center"
      }}>
        {product.imageUrl && !imageFailed ? (
          <Image source={{ uri: product.imageUrl }} resizeMode="cover"
            accessibilityLabel={product.name}
            onError={() => setImageFailed(true)}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <Ionicons name="pricetags-outline" size={36} color={theme.colors.primary} />
        )}
      </View>
    </Pressable>
  );
}
