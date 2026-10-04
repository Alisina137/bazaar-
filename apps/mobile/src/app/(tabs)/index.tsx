import { View } from "react-native";

import {
  AppText,
  Badge,
  Card,
  Screen
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";

export default function HomeScreen() {
  const theme = useAppTheme();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label="BazaarLink" tone="primary" />
        <AppText variant="display">Commerce built for local businesses.</AppText>
        <AppText variant="bodyLarge" tone="muted">
          The mobile application shell and shared design system are ready for
          the product features that follow.
        </AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">Foundation status</AppText>
          <AppText tone="muted">
            Reusable typography, surfaces, form controls, state views, safe
            areas, keyboard handling, dark mode, and bottom navigation now
            share one token system.
          </AppText>
        </View>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
        <Badge label="Mobile first" tone="success" />
        <Badge label="Accessible targets" tone="success" />
        <Badge label="RTL ready" tone="warning" />
      </View>
    </Screen>
  );
}
