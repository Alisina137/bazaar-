import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, View } from "react-native";

import { HomeSectionHeader } from "@/components/marketplace/HomeSectionHeader";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function HomeProductRail({
  title, products, onViewAll, icon = "albums-outline"
}: {
  title: string;
  products: MarketplaceProductSummary[];
  onViewAll?: (() => void) | undefined;
  icon?: IconName;
}) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  if (products.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <HomeSectionHeader title={title} icon={icon} onViewAll={onViewAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm,
          flexDirection: isRTL ? "row-reverse" : "row"
        }}
      >
        {products.slice(0, 10).map((product) => (
          <MarketplaceProductCard key={product.id} product={product} compact />
        ))}
      </ScrollView>
    </View>
  );
}
