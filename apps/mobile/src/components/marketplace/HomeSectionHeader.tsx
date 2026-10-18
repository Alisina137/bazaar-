import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function HomeSectionHeader({
  title, icon, onViewAll
}: {
  title: string;
  icon: IconName;
  onViewAll?: (() => void) | undefined;
}) {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  return (
    <View style={{
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: theme.spacing.sm
    }}>
      <View
        accessible={false}
        style={{
          width: 34,
          height: 34,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.primarySoft,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Ionicons name={icon} color={theme.colors.primary} size={19} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>{title}</AppText>
      </View>
      {onViewAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.viewAll") + ": " + title}
          onPress={onViewAll}
          hitSlop={4}
          style={({ pressed }) => ({
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 44,
            paddingHorizontal: theme.spacing.xs,
            gap: theme.spacing.xxs,
            opacity: pressed ? theme.opacity.pressed : 1
          })}
        >
          <AppText tone="primary" variant="label">{t("home.viewAll")}</AppText>
          <Ionicons
            name={isRTL ? "arrow-back" : "arrow-forward"}
            size={16}
            color={theme.colors.primary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
