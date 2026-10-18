import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

/** Compact, image-independent banner; its CTA navigates to actual listings. */
export function HomeHeroBanner() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("home.exploreProducts")}
      onPress={() => router.push("/(tabs)/marketplace")}
      style={({ pressed }) => ({
        minHeight: 150,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.xl,
        backgroundColor: theme.colors.primarySoft,
        overflow: "hidden",
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      <View style={{
        position: "absolute",
        width: 144,
        height: 144,
        borderRadius: 72,
        borderWidth: 20,
        borderColor: theme.colors.border,
        opacity: 0.45,
        top: -68,
        ...(isRTL ? { left: -54 } : { right: -54 })
      }} />
      <View style={{
        padding: theme.spacing.xl,
        gap: theme.spacing.lg,
        minHeight: 150,
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center"
      }}>
        <View style={{ flex: 1, gap: theme.spacing.md }}>
          <AppText variant="heading" numberOfLines={2}>
            {t("home.shopLocal")}
          </AppText>
          <View style={{
            alignSelf: isRTL ? "flex-end" : "flex-start",
            borderRadius: theme.radii.full,
            paddingHorizontal: theme.spacing.md,
            minHeight: 40,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            backgroundColor: theme.colors.primary,
            gap: theme.spacing.xs
          }}>
            <AppText variant="label" style={{ color: theme.colors.onPrimary }}>
              {t("home.exploreProducts")}
            </AppText>
            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"}
              color={theme.colors.onPrimary} size={16} />
          </View>
        </View>
        <View style={{
          width: 82,
          height: 96,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          justifyContent: "center",
          alignItems: "center"
        }}>
          <Ionicons name="bag-handle" color={theme.colors.primary} size={42} />
        </View>
      </View>
    </Pressable>
  );
}
