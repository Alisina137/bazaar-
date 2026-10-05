import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  View
} from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

import { AppText } from "../ui/AppText";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

export function MarketplaceProductCard({
  product,
  compact = false
}: {
  product: MarketplaceProductSummary;
  compact?: boolean;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { formatAfn, t } = useLocalization();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={() =>
        router.push({
          pathname: "/marketplace/product/[productId]",
          params: { productId: product.id }
        })
      }
      style={({ pressed }) => ({
        opacity: pressed ? theme.opacity.pressed : 1,
        width: compact ? 190 : "100%"
      })}
    >
      <Card
        style={{
          padding: 0,
          overflow: "hidden"
        }}
      >
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            accessibilityLabel={product.name}
            resizeMode="cover"
            style={{
              width: "100%",
              height: compact ? 150 : 210,
              backgroundColor: theme.colors.surfaceMuted
            }}
          />
        ) : (
          <View
            style={{
              height: compact ? 150 : 210,
              backgroundColor: theme.colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <AppText variant="caption" tone="muted">
              {t("marketplace.imageUnavailable")}
            </AppText>
          </View>
        )}

        <View style={{ gap: theme.spacing.sm, padding: theme.spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
              alignItems: "flex-start"
            }}
          >
            <AppText
              variant="heading"
              numberOfLines={compact ? 2 : 3}
              style={styles.flex}
            >
              {product.name}
            </AppText>
            {!product.inStock ? (
              <Badge
                label={t("marketplace.outOfStock")}
                tone="warning"
              />
            ) : null}
          </View>

          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {product.store.name} · {product.store.province}
          </AppText>

          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: theme.spacing.sm,
              flexWrap: "wrap"
            }}
          >
            <AppText variant="heading">{formatAfn(product.price)}</AppText>
            {product.hasDiscount && product.compareAtPrice !== null ? (
              <AppText
                variant="caption"
                tone="muted"
                style={styles.strike}
              >
                {formatAfn(product.compareAtPrice)}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  strike: {
    textDecorationLine: "line-through"
  }
});
