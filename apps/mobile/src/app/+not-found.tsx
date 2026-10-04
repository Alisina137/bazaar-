import { Link } from "expo-router";
import { View } from "react-native";

import {
  AppText,
  Card,
  Screen
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";

export default function NotFoundScreen() {
  const theme = useAppTheme();

  return (
    <Screen scrollable={false}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="heading">Page not found</AppText>
            <AppText tone="muted">
              The requested screen does not exist in the current application.
            </AppText>
            <Link href="/" style={{ color: theme.colors.primary }}>
              Return home
            </Link>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
