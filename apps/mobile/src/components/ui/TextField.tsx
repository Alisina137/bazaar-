import { useState } from "react";
import {
  TextInput,
  View,
  type TextInputProps
} from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

import { AppText } from "./AppText";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string | undefined;
  helperText?: string | undefined;
}

export function TextField({
  label,
  error,
  helperText,
  accessibilityLabel,
  onBlur,
  onFocus,
  ...props
}: TextFieldProps) {
  const theme = useAppTheme();
  const { direction, isRTL } = useLocalization();
  const [focused, setFocused] = useState(false);

  const supportingText = error ?? helperText;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={error ?? helperText ?? props.accessibilityHint}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={theme.colors.textMuted}
        style={{
          minHeight: Math.max(48, theme.sizes.controlHeight),
          borderRadius: theme.radii.md,
          borderColor: error
            ? theme.colors.danger
            : focused
              ? theme.colors.focus
              : theme.colors.borderStrong,
          borderWidth: 1,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          paddingHorizontal: theme.spacing.lg,
          fontSize: theme.fontSizes.body,
          lineHeight: theme.lineHeights.body,
          textAlign: isRTL ? "right" : "left",
          writingDirection: direction
        }}
      />
      {supportingText ? (
        <AppText variant="caption" tone={error ? "danger" : "muted"}>
          {supportingText}
        </AppText>
      ) : null}
    </View>
  );
}
