import type { ReactNode } from "react";
import {
  Text,
  type TextProps,
  type TextStyle
} from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type TextVariant =
  | "display"
  | "title"
  | "heading"
  | "bodyLarge"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption";

type TextTone = "default" | "muted" | "primary" | "danger" | "success";

export interface AppTextProps extends TextProps {
  children: ReactNode;
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle["textAlign"];
}

export function AppText({
  children,
  variant = "body",
  tone = "default",
  align,
  style,
  ...props
}: AppTextProps) {
  const theme = useAppTheme();
  const { direction, isRTL } = useLocalization();

  const variantStyle: TextStyle = (() => {
    switch (variant) {
      case "display":
        return {
          fontSize: theme.fontSizes.display,
          lineHeight: theme.lineHeights.display,
          fontWeight: theme.fontWeights.bold
        };
      case "title":
        return {
          fontSize: theme.fontSizes.title,
          lineHeight: theme.lineHeights.title,
          fontWeight: theme.fontWeights.bold
        };
      case "heading":
        return {
          fontSize: theme.fontSizes.heading,
          lineHeight: theme.lineHeights.heading,
          fontWeight: theme.fontWeights.semibold
        };
      case "bodyLarge":
        return {
          fontSize: theme.fontSizes.bodyLarge,
          lineHeight: theme.lineHeights.bodyLarge,
          fontWeight: theme.fontWeights.regular
        };
      case "bodyStrong":
        return {
          fontSize: theme.fontSizes.body,
          lineHeight: theme.lineHeights.body,
          fontWeight: theme.fontWeights.semibold
        };
      case "label":
        return {
          fontSize: theme.fontSizes.label,
          lineHeight: theme.lineHeights.label,
          fontWeight: theme.fontWeights.semibold
        };
      case "caption":
        return {
          fontSize: theme.fontSizes.caption,
          lineHeight: theme.lineHeights.caption,
          fontWeight: theme.fontWeights.medium
        };
      case "body":
      default:
        return {
          fontSize: theme.fontSizes.body,
          lineHeight: theme.lineHeights.body,
          fontWeight: theme.fontWeights.regular
        };
    }
  })();

  const color = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    danger: theme.colors.danger,
    success: theme.colors.success
  }[tone];

  return (
    <Text
      {...props}
      style={[
        variantStyle,
        {
          color,
          textAlign: align ?? (isRTL ? "right" : "left"),
          writingDirection: direction
        },
        style
      ]}
    >
      {children}
    </Text>
  );
}
