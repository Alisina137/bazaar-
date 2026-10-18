import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

import { AppText } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

/** A consistent, accessible way out of Account stack pages with hidden headers. */
export function AccountBackLink() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("marketplace.back")}
      onPress={() => router.back()}
      style={({ pressed }) => ({
        alignSelf: isRTL ? "flex-end" : "flex-start",
        minHeight: 48,
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.md,
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      <Ionicons
        name={isRTL ? "arrow-forward-outline" : "arrow-back-outline"}
        color={theme.colors.primary}
        size={20}
      />
      <AppText variant="label" tone="primary">{t("marketplace.back")}</AppText>
    </Pressable>
  );
}
