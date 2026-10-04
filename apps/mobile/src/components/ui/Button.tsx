import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/design/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = (() => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderWidth: StyleSheet.hairlineWidth
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderWidth: StyleSheet.hairlineWidth
        };
      case "danger":
        return {
          backgroundColor: theme.colors.danger,
          borderColor: theme.colors.danger,
          borderWidth: StyleSheet.hairlineWidth
        };
      case "primary":
      default:
        return {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
          borderWidth: StyleSheet.hairlineWidth
        };
    }
  })();

  const textColor =
    variant === "primary"
      ? theme.colors.onPrimary
      : variant === "danger"
        ? "#FFFFFF"
        : variant === "ghost"
          ? theme.colors.primary
          : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: theme.sizes.controlHeight,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radii.md,
          opacity: isDisabled
            ? theme.opacity.disabled
            : pressed
              ? theme.opacity.pressed
              : 1
        },
        containerStyle,
        fullWidth && styles.fullWidth
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: textColor,
              fontSize: theme.fontSizes.body,
              lineHeight: theme.lineHeights.body,
              fontWeight: theme.fontWeights.semibold
            }
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  fullWidth: {
    width: "100%"
  },
  label: {
    textAlign: "center"
  }
});
