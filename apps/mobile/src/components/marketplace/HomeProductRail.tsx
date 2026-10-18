import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FlatList, View } from "react-native";

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
      <FlatList
        horizontal
        inverted={isRTL}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={title}
        data={products.slice(0, 10)}
        keyExtractor={(product) => product.id}
        renderItem={({ item }) => (
          <MarketplaceProductCard product={item} compact />
        )}
        ItemSeparatorComponent={() => <View style={{ width: theme.spacing.md }} />}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={3}
        contentContainerStyle={{
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.sm
        }}
      />
    </View>
  );
}
