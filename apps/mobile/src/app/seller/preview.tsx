import { useRouter } from "expo-router";
import { View } from "react-native";

import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { storeStatusKey, storeThemeKey } from "@/store/messages";
import { useStores } from "@/store/provider";

export default function SellerPreviewScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const { currentStore } = useStores();

  if (!currentStore) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("seller.dashboard.noStore")}
          message={t("seller.dashboard.noStoreMessage")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("seller.store.preview")} tone="primary" />
        <AppText variant="display">{currentStore.name}</AppText>
        {currentStore.description ? (
          <AppText variant="bodyLarge" tone="muted">
            {currentStore.description}
          </AppText>
        ) : null}
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText>
            {t("storefront.categoryLabel")}: {currentStore.category}
          </AppText>
          <AppText>
            {t("storefront.locationLabel")}: {currentStore.cityDistrict}, {currentStore.province}
          </AppText>
          <AppText>
            {t("storefront.contactLabel")}: {currentStore.phone}
          </AppText>
          {currentStore.businessHours ? (
            <AppText>
              {t("storefront.hoursLabel")}: {currentStore.businessHours}
            </AppText>
          ) : null}
          <AppText tone="muted">
            {t(storeThemeKey(currentStore.theme))} · {t(storeStatusKey(currentStore.status))}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">{t("storefront.emptyTitle")}</AppText>
          <AppText tone="muted">{t("storefront.emptyMessage")}</AppText>
        </View>
      </Card>

      <Button
        variant="secondary"
        onPress={() => router.back()}
      >
        {t("seller.onboarding.back")}
      </Button>
    </Screen>
  );
}
