import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

import { AppText, Button } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

/** Explicit history controls; no history is uploaded to the marketplace API. */
export function MarketplaceRecentSearches({
  searches, onSelect, onRemove, onClear
}: {
  searches: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}) {
  const theme = useAppTheme();
  const { t, isRTL } = useLocalization();
  if (searches.length === 0) return null;

  return (
    <View style={{
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface
    }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        justifyContent: "space-between", alignItems: "center",
        gap: theme.spacing.sm
      }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t("marketplace.phase2.recentSearches")}</AppText>
        </View>
        <Button variant="ghost" onPress={onClear}>
          {t("marketplace.phase2.clearHistory")}
        </Button>
      </View>
      {searches.map(search => (
        <View key={search.toLocaleLowerCase()} style={{
          minHeight: 48,
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: theme.spacing.xs,
          alignItems: "center"
        }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("marketplace.phase2.searchAgain") + ": " + search}
            onPress={() => onSelect(search)}
            style={({ pressed }) => ({
              flex: 1, minWidth: 0, minHeight: 48,
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: theme.spacing.sm, alignItems: "center",
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radii.sm,
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface
            })}
          >
            <Ionicons name="time-outline" size={19} color={theme.colors.textMuted} />
            <View style={{ flex: 1 }}>
              <AppText numberOfLines={1}>{search}</AppText>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("marketplace.phase2.removeSearch") + ": " + search}
            onPress={() => onRemove(search)}
            style={{
              width: 48, height: 48,
              justifyContent: "center", alignItems: "center"
            }}
          >
            <Ionicons name="close-outline" size={20} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ))}
      <AppText variant="caption" tone="muted">
        {t("marketplace.phase2.historyDeviceOnly")}
      </AppText>
    </View>
  );
}
