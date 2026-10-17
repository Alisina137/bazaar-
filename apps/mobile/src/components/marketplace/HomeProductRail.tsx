import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, View } from "react-native";

import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export function HomeProductRail({
  title, products, onViewAll
}: {
  title: string;
  products: MarketplaceProductSummary[];
  onViewAll?: (() => void) | undefined;
}) {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  if (products.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", gap: theme.spacing.sm
      }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{title}</AppText>
        </View>
        {onViewAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.viewAll") + ": " + title}
            onPress={onViewAll}
            style={({ pressed }) => ({
              minHeight: 44, flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", paddingHorizontal: theme.spacing.xs,
              gap: theme.spacing.xs,
              opacity: pressed ? theme.opacity.pressed : 1
            })}
          >
            <AppText variant="label" tone="primary">{t("home.viewAll")}</AppText>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"}
              size={16} color={theme.colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.md,
          flexDirection: isRTL ? "row-reverse" : "row"
        }}>
        {products.slice(0, 10).map((product) => (
          <MarketplaceProductCard key={product.id} product={product} compact />
        ))}
      </ScrollView>
    </View>
  );
}
