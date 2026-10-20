import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, PropsWithChildren } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Compact, theme-aware checkout selection used for addresses and delivery/payment methods. */
export function CheckoutChoice({
  title,
  subtitle,
  secondary,
  trailing,
  icon = "location-outline",
  selected,
  disabled = false,
  onPress,
  children
}: PropsWithChildren<{
  title: string;
  subtitle?: string | undefined;
  secondary?: string | undefined;
  trailing?: string | undefined;
  icon?: IconName;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}>) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={[title, subtitle, trailing].filter(Boolean).join(", ")}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
        borderRadius: theme.radii.md,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
        opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1
      })}
    >
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center", gap: theme.spacing.md
      }}>
        <View style={{
          width: 36, height: 36,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surface,
          alignItems: "center", justifyContent: "center"
        }}>
          <Ionicons name={icon} size={19} color={selected ? theme.colors.primary : theme.colors.textMuted} />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="bodyStrong" style={{ fontSize: 14, lineHeight: 20 }}
            numberOfLines={2}>{title}</AppText>
          {subtitle ? <AppText variant="caption" tone="muted" numberOfLines={2}>{subtitle}</AppText> : null}
          {secondary ? <AppText variant="caption" tone="muted" numberOfLines={2}>{secondary}</AppText> : null}
        </View>
        {trailing ? (
          <AppText variant="label" tone={selected ? "primary" : "default"}
            style={{ maxWidth: 112 }} numberOfLines={2}>{trailing}</AppText>
        ) : null}
        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={21}
          color={selected ? theme.colors.primary : theme.colors.borderStrong}
        />
      </View>
      {children}
    </Pressable>
  );
}

export function CheckoutSectionHeading({
  step, title, subtitle
}: {
  step: number;
  title: string;
  subtitle?: string | undefined;
}) {
  const theme = useAppTheme();
  const { isRTL, formatNumber } = useLocalization();
  return (
    <View style={{
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center", gap: theme.spacing.md
    }}>
      <View style={{
        width: 28, height: 28, borderRadius: theme.radii.full,
        alignItems: "center", justifyContent: "center",
        backgroundColor: theme.colors.primarySoft
      }}>
        <AppText variant="caption" tone="primary">{formatNumber(step)}</AppText>
      </View>
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <AppText variant="bodyStrong" style={{ fontSize: 17, lineHeight: 23 }}>{title}</AppText>
        {subtitle ? <AppText variant="caption" tone="muted">{subtitle}</AppText> : null}
      </View>
    </View>
  );
}
