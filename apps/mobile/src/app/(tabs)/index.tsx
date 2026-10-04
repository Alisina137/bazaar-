import { View } from "react-native";

import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import {
  AppText,
  Badge,
  Card,
  Screen
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function HomeScreen() {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("common.brandName")} tone="primary" />
        <AppText variant="display">{t("home.title")}</AppText>
        <AppText variant="bodyLarge" tone="muted">
          {t("home.description")}
        </AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">{t("home.statusTitle")}</AppText>
          <AppText tone="muted">{t("home.statusMessage")}</AppText>
        </View>
      </Card>

      <Card>
        <LanguageSwitcher />
      </Card>

      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          flexWrap: "wrap",
          gap: theme.spacing.sm
        }}
      >
        <Badge label={t("home.mobileFirst")} tone="success" />
        <Badge label={t("home.accessibleTargets")} tone="success" />
        <Badge label={t("home.rtlReady")} tone="warning" />
      </View>
    </Screen>
  );
}
