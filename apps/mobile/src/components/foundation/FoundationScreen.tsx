import { View } from "react-native";

import {
  AppText,
  Badge,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";

interface FoundationScreenProps {
  title: string;
  description: string;
  statusTitle: string;
  statusMessage: string;
}

export function FoundationScreen({
  title,
  description,
  statusTitle,
  statusMessage
}: FoundationScreenProps) {
  const theme = useAppTheme();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label="Foundation" tone="primary" />
        <AppText variant="title">{title}</AppText>
        <AppText tone="muted">{description}</AppText>
      </View>

      <Card>
        <StateView
          kind="empty"
          title={statusTitle}
          message={statusMessage}
        />
      </Card>
    </Screen>
  );
}
