import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export function HomeDealSpotlight({
  product
}: {
  product: MarketplaceProductSummary;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, isRTL, formatAfn } = useLocalization();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("home.featuredDeal") + ": " + product.name}
      onPress={() => router.push({
        pathname: "/marketplace/product/[productId]",
        params: { productId: product.id }
      })}
      style={({ pressed }) => ({
        padding: theme.spacing.lg,
        flexDirection: isRTL ? "row-reverse" : "row",
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.xl,
        backgroundColor: theme.colors.primarySoft,
        gap: theme.spacing.md,
        alignItems: "center",
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.sm }}>
        <AppText variant="caption" tone="primary">{t("home.featuredDeal")}</AppText>
        <AppText variant="bodyStrong" numberOfLines={2}>{product.name}</AppText>
        <AppText variant="heading" tone="primary">{formatAfn(product.price)}</AppText>
        {product.hasDiscount && product.compareAtPrice !== null ? (
          <AppText variant="caption" tone="muted" style={{ textDecorationLine: "line-through" }}>
            {formatAfn(product.compareAtPrice)}
          </AppText>
        ) : null}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.xs }}>
          <AppText variant="label" tone="primary">{t("home.shopDeal")}</AppText>
          <Ionicons
            name={isRTL ? "arrow-back-outline" : "arrow-forward-outline"}
            size={17} color={theme.colors.primary}
          />
        </View>
      </View>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} resizeMode="cover"
          accessibilityLabel={product.name}
          style={{ width: 116, height: 140, borderRadius: theme.radii.lg, backgroundColor: theme.colors.surface }}
        />
      ) : (
        <View style={{
          width: 94, height: 110, borderRadius: theme.radii.lg,
          alignItems: "center", justifyContent: "center",
          backgroundColor: theme.colors.surface
        }}>
          <Ionicons name="pricetags-outline" size={36} color={theme.colors.primary} />
        </View>
      )}
    </Pressable>
  );
}
