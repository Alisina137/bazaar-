import type { MarketplaceCategoryRecord } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

import { AppText, HorizontalLocaleScroll } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import type { BrowseMarketplaceInput } from "@/marketplace/api";
import { appliedFilterKeys, type AppliedFilterKey } from "@/marketplace/filter-utils";
import { isProvinceName, provinceName } from "@/marketplace/provinces";

export function MarketplaceActiveFilters({
  input, categories, onRemove, onClear
}: {
  input: BrowseMarketplaceInput | null;
  categories: MarketplaceCategoryRecord[];
  onRemove: (key: AppliedFilterKey) => void;
  onClear: () => void;
}) {
  const theme = useAppTheme();
  const { t, locale, formatAfn, formatNumber, isRTL } = useLocalization();
  const keys = appliedFilterKeys(input);
  if (!input || keys.length === 0) return null;

  const labelFor = (key: AppliedFilterKey) => {
    switch (key) {
      case "categoryId": {
        const selected = categories.find(item => item.id === input.categoryId);
        const label = selected ? (
          locale === "en" ? selected.nameEn : locale === "ps-AF" ? selected.namePs : selected.nameFa
        ) : t("marketplace.phase3.category");
        return label;
      }
      case "province":
        return input.province && isProvinceName(input.province)
          ? provinceName(input.province, locale) : input.province ?? "";
      case "minPrice": return t("marketplace.phase3.priceFrom") + " " + formatAfn(input.minPrice ?? 0);
      case "maxPrice": return t("marketplace.phase3.priceTo") + " " + formatAfn(input.maxPrice ?? 0);
      case "inStock": return t("marketplace.filter.inStock");
      case "discount": return t("marketplace.filter.deals");
      case "minRating": return "★ " + formatNumber(input.minRating ?? 0) + "+";
      case "verifiedStore": return t("marketplace.filter.verifiedStore");
      case "brand": return t("marketplace.phase3.brand") + ": " + (input.brand ?? "");
      case "storeId": return t("marketplace.phase3.store");
    }
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        justifyContent: "space-between", alignItems: "center"
      }}>
        <AppText variant="label">{t("marketplace.phase3.appliedFilters") + " · " + formatNumber(keys.length)}</AppText>
        <Pressable accessibilityRole="button" onPress={onClear} style={{ minHeight: 48, justifyContent: "center" }}>
          <AppText variant="caption" tone="primary">{t("marketplace.clearFilters")}</AppText>
        </Pressable>
      </View>
      <HorizontalLocaleScroll
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        {keys.map(key => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={t("marketplace.phase3.removeFilter") + ": " + labelFor(key)}
            onPress={() => onRemove(key)}
            style={({ pressed }) => ({
              minHeight: 48, maxWidth: 240, borderWidth: 1,
              borderColor: theme.colors.primary, borderRadius: theme.radii.lg,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", paddingHorizontal: theme.spacing.md,
              gap: theme.spacing.sm, backgroundColor: theme.colors.primarySoft,
              opacity: pressed ? theme.opacity.pressed : 1
            })}
          >
            <AppText variant="caption" numberOfLines={1} tone="primary">{labelFor(key)}</AppText>
            <Ionicons name="close-circle" size={17} color={theme.colors.primary} />
          </Pressable>
        ))}
      </HorizontalLocaleScroll>
    </View>
  );
}
