import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import { View } from "react-native";

import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

/** Responsive two-column catalog grid; rail cards use compact mode instead. */
export function MarketplaceProductGrid({
  products
}: {
  products: MarketplaceProductSummary[];
}) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  return (
    <View style={{
      flexDirection: isRTL ? "row-reverse" : "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: theme.spacing.md
    }}>
      {products.map((product) => (
        <MarketplaceProductCard key={product.id} product={product} grid />
      ))}
    </View>
  );
}
