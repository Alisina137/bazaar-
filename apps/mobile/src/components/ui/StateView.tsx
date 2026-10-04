import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/design/theme";

import { AppText } from "./AppText";
import { Button } from "./Button";

type StateKind = "loading" | "empty" | "error";

export interface StateViewProps {
  kind: StateKind;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StateView({
  kind,
  title,
  message,
  actionLabel,
  onAction
}: StateViewProps) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityRole={kind === "error" ? "alert" : undefined}
      style={[
        styles.container,
        {
          minHeight: 220,
          gap: theme.spacing.md,
          padding: theme.spacing["2xl"]
        }
      ]}
    >
      {kind === "loading" ? (
        <ActivityIndicator
          accessibilityLabel={title}
          size="large"
          color={theme.colors.primary}
        />
      ) : null}
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" tone="muted" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button variant={kind === "error" ? "primary" : "secondary"} onPress={onAction}>
            {actionLabel}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  }
});
