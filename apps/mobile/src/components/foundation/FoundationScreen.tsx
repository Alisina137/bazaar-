import type { TranslationKey } from "@bazaarlink/localization";
import { View } from "react-native";

import {
  AppText,
  Badge,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

interface FoundationScreenProps {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  statusTitleKey: TranslationKey;
  statusMessageKey: TranslationKey;
}

export function FoundationScreen({
  titleKey,
  descriptionKey,
  statusTitleKey,
  statusMessageKey
}: FoundationScreenProps) {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("common.foundation")} tone="primary" />
        <AppText variant="title">{t(titleKey)}</AppText>
        <AppText tone="muted">{t(descriptionKey)}</AppText>
      </View>

      <Card>
        <StateView
          kind="empty"
          title={t(statusTitleKey)}
          message={t(statusMessageKey)}
        />
      </Card>
    </Screen>
  );
}
