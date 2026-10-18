import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, PropsWithChildren } from "react";
import { Pressable, View } from "react-native";

import { AppText, Card } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function AccountSection({
  title, children
}: PropsWithChildren<{ title: string }>) {
  const theme = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="bodyStrong">{title}</AppText>
      <Card style={{ padding: 0, overflow: "hidden" }}>{children}</Card>
    </View>
  );
}

export function AccountMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
  disabled = false,
  destructive = false,
  trailingLabel
}: {
  icon: IconName;
  title: string;
  subtitle?: string | undefined;
  onPress?: (() => void) | undefined;
  last?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  trailingLabel?: string;
}) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  const actionable = Boolean(onPress) && !disabled;
  const foreground = destructive ? theme.colors.danger : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={onPress ? { disabled } : undefined}
      disabled={!actionable}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: 64,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: pressed && actionable
          ? theme.colors.surfaceMuted
          : theme.colors.surface,
        opacity: disabled ? theme.opacity.disabled : 1
      })}
    >
      <View style={{
        width: 38, height: 38, borderRadius: theme.radii.md,
        backgroundColor: destructive
          ? theme.colors.dangerSoft
          : theme.colors.primarySoft,
        justifyContent: "center", alignItems: "center"
      }}>
        <Ionicons name={icon} color={foreground} size={20} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xxs }}>
        <AppText variant="label" style={destructive ? { color: foreground } : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">{subtitle}</AppText>
        ) : null}
      </View>
      {trailingLabel ? (
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {trailingLabel}
        </AppText>
      ) : null}
      {actionable ? (
        <Ionicons
          name={isRTL ? "chevron-back" : "chevron-forward"}
          size={18}
          color={theme.colors.textMuted}
        />
      ) : null}
    </Pressable>
  );
}
