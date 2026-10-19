import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

/** Lightweight fixed-layout placeholders avoid a blank jump while discovery loads. */
export function MarketplaceDiscoverySkeleton({
  title,
  variant = "product",
  count = 4
}: {
  title: string;
  variant?: "product" | "store";
  count?: number;
}) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  const placeholder = theme.colors.surfaceMuted;

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={title} style={{ gap: theme.spacing.md }}>
      <AppText variant="bodyStrong">{title}</AppText>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: theme.spacing.md
      }}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} style={{
            width: "48%",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surface
          }}>
            <View style={{
              aspectRatio: variant === "product" ? 1 : 1.7,
              backgroundColor: placeholder
            }} />
            <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
              <View style={{ height: 12, width: "84%", borderRadius: theme.radii.sm, backgroundColor: placeholder }} />
              <View style={{ height: 12, width: "62%", borderRadius: theme.radii.sm, backgroundColor: placeholder }} />
              <View style={{ height: 16, width: "48%", borderRadius: theme.radii.sm, backgroundColor: placeholder }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
