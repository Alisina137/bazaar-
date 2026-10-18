import { View } from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

/** Stable placeholders match the first category and product rails without shimmer cost. */
export function HomeLoadingSkeleton() {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t("marketplace.loadingTitle")}
      style={{ gap: theme.spacing.xl }}
    >
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm
      }}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={{
            width: 96,
            height: 104,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radii.lg
          }} />
        ))}
      </View>
      <View style={{
        width: 146,
        alignSelf: isRTL ? "flex-end" : "flex-start",
        height: 20,
        borderRadius: theme.radii.sm,
        backgroundColor: theme.colors.surfaceMuted
      }} />
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.md
      }}>
        {[0, 1].map((index) => (
          <View key={index} style={{
            width: 168,
            height: 242,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: "hidden"
          }}>
            <View style={{
              height: 142,
              backgroundColor: theme.colors.surfaceMuted
            }} />
            <View style={{
              margin: theme.spacing.md,
              width: 112,
              height: 18,
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.surfaceMuted
            }} />
          </View>
        ))}
      </View>
    </View>
  );
}
