import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/design/theme";

import { AppText } from "./AppText";
import { LoadingSkeleton, type SkeletonVariant } from "./LoadingSkeleton";
import { Button } from "./Button";

type StateKind = "loading" | "empty" | "error";

export interface StateViewProps {
  kind: StateKind;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  loadingVariant?: SkeletonVariant;
}

export function StateView({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  loadingVariant = "list"
}: StateViewProps) {
  const theme = useAppTheme();

  if (kind === "loading") {
    return (
      <View
        style={{
          flex: 1,
          width: "100%",
          gap: theme.spacing.lg,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.lg
        }}
      >
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm
        }}>
          <ActivityIndicator
            accessibilityLabel={title}
            size="small"
            color={theme.colors.primary}
          />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <AppText variant="bodyStrong">{title}</AppText>
            {message ? (
              <AppText variant="caption" tone="muted" numberOfLines={2}>{message}</AppText>
            ) : null}
          </View>
        </View>
        <LoadingSkeleton variant={loadingVariant} label={title} />
      </View>
    );
  }

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
