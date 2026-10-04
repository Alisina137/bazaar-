import { Link } from "expo-router";
import { View } from "react-native";

import {
  AppText,
  Card,
  Screen
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function NotFoundScreen() {
  const theme = useAppTheme();
  const { direction, isRTL, t } = useLocalization();

  return (
    <Screen scrollable={false}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="heading">{t("notFound.title")}</AppText>
            <AppText tone="muted">{t("notFound.message")}</AppText>
            <Link
              href="/"
              style={{
                color: theme.colors.primary,
                textAlign: isRTL ? "right" : "left",
                writingDirection: direction
              }}
            >
              {t("notFound.returnHome")}
            </Link>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
