import type { PropsWithChildren } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/design/theme";

export interface CardProps extends PropsWithChildren {
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, muted = false, style }: CardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: muted
            ? theme.colors.surfaceMuted
            : theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl
        },
        theme.scheme === "light" ? theme.elevation.card : undefined,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth
  }
});
