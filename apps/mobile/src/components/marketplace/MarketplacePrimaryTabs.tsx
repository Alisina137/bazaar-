import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export type MarketplaceView = "products" | "categories" | "stores";

const viewOptions: Array<{
  value: MarketplaceView;
  key: TranslationKey;
  icon: "pricetags-outline" | "grid-outline" | "storefront-outline";
}> = [
  { value: "products", key: "marketplace.nav.products", icon: "pricetags-outline" },
  { value: "categories", key: "marketplace.nav.categories", icon: "grid-outline" },
  { value: "stores", key: "marketplace.nav.stores", icon: "storefront-outline" }
];

export function MarketplacePrimaryTabs({
  selected, onSelect
}: {
  selected: MarketplaceView;
  onSelect: (view: MarketplaceView) => void;
}) {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  return (
    <View
      accessibilityLabel={t("marketplace.nav.title")}
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        borderRadius: theme.radii.md,
        overflow: "hidden"
      }}
    >
      {viewOptions.map(({ value, key, icon }) => {
        const active = selected === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={t(key)}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(value)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: 56,
              paddingHorizontal: theme.spacing.xs,
              paddingVertical: theme.spacing.sm,
              borderBottomWidth: active ? 3 : 3,
              borderBottomColor: active ? theme.colors.primary : "transparent",
              backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.surface,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs
            })}
          >
            <Ionicons
              name={icon}
              size={19}
              color={active ? theme.colors.primary : theme.colors.textMuted}
            />
            <AppText
              variant="caption"
              numberOfLines={1}
              align="center"
              tone={active ? "primary" : "muted"}
            >
              {t(key)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
