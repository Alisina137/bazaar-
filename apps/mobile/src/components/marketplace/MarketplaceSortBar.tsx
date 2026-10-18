import type { MarketplaceSort } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { sortValues } from "@/marketplace/filter-utils";

const sortLabels: Record<MarketplaceSort, TranslationKey> = {
  relevance: "marketplace.sort.relevance",
  newest: "marketplace.sort.newest",
  price_asc: "marketplace.sort.priceLowHigh",
  price_desc: "marketplace.sort.priceHighLow",
  rating: "marketplace.sort.rating",
  popularity: "marketplace.sort.popularity"
};

export function MarketplaceSortBar({
  value, onChange, disabled = false
}: {
  value: MarketplaceSort;
  onChange: (next: MarketplaceSort) => void;
  disabled?: boolean;
}) {
  const { t, isRTL } = useLocalization();
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("marketplace.sort.label") + ": " + t(sortLabels[value])}
        accessibilityState={{ expanded, disabled }}
        onPress={() => setExpanded(current => !current)}
        disabled={disabled}
        style={({ pressed }) => ({
          minHeight: 48, borderRadius: theme.radii.md,
          borderWidth: 1, borderColor: theme.colors.borderStrong,
          paddingHorizontal: theme.spacing.md,
          flexDirection: isRTL ? "row-reverse" : "row",
          justifyContent: "space-between", alignItems: "center",
          backgroundColor: theme.colors.surface,
          opacity: pressed ? theme.opacity.pressed : 1
        })}
      >
        <AppText variant="label">{t("marketplace.sort.label") + ": " + t(sortLabels[value])}</AppText>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.primary} />
      </Pressable>
      {expanded ? (
        <View style={{
          borderWidth: 1, borderColor: theme.colors.border,
          borderRadius: theme.radii.md, padding: theme.spacing.xs,
          gap: theme.spacing.xs, backgroundColor: theme.colors.surface
        }}>
          {sortValues.map(option => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={t(sortLabels[option])}
              accessibilityState={{ checked: option === value, disabled }}
              disabled={disabled}
              onPress={() => { setExpanded(false); if (option !== value) onChange(option); }}
              style={({ pressed }) => ({
                flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center",
                justifyContent: "space-between", minHeight: 48,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radii.sm,
                backgroundColor: option === value ? theme.colors.primarySoft : theme.colors.surface,
                opacity: pressed ? theme.opacity.pressed : 1
              })}
            >
              <AppText tone={option === value ? "primary" : "default"} variant="bodyStrong">
                {t(sortLabels[option])}
              </AppText>
              {option === value ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
