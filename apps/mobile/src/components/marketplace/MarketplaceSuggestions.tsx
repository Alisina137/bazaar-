import type { MarketplaceCategoryRecord, MarketplaceSearchSuggestion } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type IconName = ComponentProps<typeof Ionicons>["name"];
const typeIcons: Record<MarketplaceSearchSuggestion["type"], IconName> = {
  product: "cube-outline",
  store: "storefront-outline",
  category: "grid-outline",
  brand: "pricetag-outline"
};

export function MarketplaceSuggestions({
  query, items, loading, categories, onSelect, onSearchAll
}: {
  query: string;
  items: MarketplaceSearchSuggestion[];
  loading: boolean;
  categories?: MarketplaceCategoryRecord[] | undefined;
  onSelect: (item: MarketplaceSearchSuggestion) => void;
  onSearchAll: () => void;
}) {
  const theme = useAppTheme();
  const { isRTL, locale, t } = useLocalization();
  const normalized = query.trim();
  if (normalized.length < 2) return null;

  const labelFor = (item: MarketplaceSearchSuggestion) => {
    if (item.type !== "category") return item.label;
    const category = categories?.find((row) => row.id === item.id);
    if (!category) return item.label;
    return locale === "en" ? category.nameEn :
      locale === "ps-AF" ? category.namePs : category.nameFa;
  };

  return (
    <View style={{
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      gap: theme.spacing.xs
    }}>
      {loading ? (
        <View style={{ paddingVertical: theme.spacing.sm, alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary} accessibilityLabel={t("marketplace.searching")} />
        </View>
      ) : (
        items.slice(0, 8).map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labelFor(item)}
            key={item.type + ":" + item.id}
            onPress={() => onSelect(item)}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: theme.radii.sm,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.sm,
              opacity: pressed ? theme.opacity.pressed : 1,
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface
            })}
          >
            <Ionicons name={typeIcons[item.type]} size={20} color={theme.colors.primary} />
            <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
              <AppText variant="label" numberOfLines={1}>{labelFor(item)}</AppText>
              {item.secondaryLabel ? (
                <AppText variant="caption" tone="muted" numberOfLines={1}>{item.secondaryLabel}</AppText>
              ) : null}
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              color={theme.colors.textMuted}
              size={17}
            />
          </Pressable>
        ))
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("marketplace.searchAll")}
        onPress={onSearchAll}
        style={({ pressed }) => ({
          minHeight: 48, borderTopColor: theme.colors.border, borderTopWidth: 1,
          paddingHorizontal: theme.spacing.md,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.sm,
          opacity: pressed ? theme.opacity.pressed : 1
        })}
      >
        <Ionicons name="search-outline" size={19} color={theme.colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" tone="primary" numberOfLines={1}>
            {t("marketplace.searchAll")}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}
