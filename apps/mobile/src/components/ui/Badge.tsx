import {
  StyleSheet,
  Text,
  View
} from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  const theme = useAppTheme();
  const { direction } = useLocalization();

  const toneStyle = {
    neutral: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textMuted
    },
    primary: {
      backgroundColor: theme.colors.primarySoft,
      color: theme.colors.primary
    },
    success: {
      backgroundColor: theme.colors.successSoft,
      color: theme.colors.success
    },
    warning: {
      backgroundColor: theme.colors.warningSoft,
      color: theme.colors.warning
    },
    danger: {
      backgroundColor: theme.colors.dangerSoft,
      color: theme.colors.danger
    }
  }[tone];

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.container,
        {
          backgroundColor: toneStyle.backgroundColor,
          borderRadius: theme.radii.full,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs
        }
      ]}
    >
      <Text
        style={{
          color: toneStyle.color,
          fontSize: theme.fontSizes.caption,
          lineHeight: theme.lineHeights.caption,
          fontWeight: theme.fontWeights.semibold,
          writingDirection: direction
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start"
  }
});
