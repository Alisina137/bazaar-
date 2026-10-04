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
import { storeStatusKey } from "@/store/messages";
import { useStores } from "@/store/provider";

export default function SellerDashboardScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const { currentStore, status, error, refresh } = useStores();

  if (status === "error") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("store.error.serviceUnavailable")}
          message={
            error
              ? t(storeErrorKey(error.code))
              : t("store.error.serviceUnavailable")
          }
          actionLabel={t("seller.onboarding.continue")}
          onAction={() => {
            void refresh();
          }}
        />
      </Screen>
    );
  }

  if (!currentStore) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("seller.dashboard.noStore")}
          message={t("seller.dashboard.noStoreMessage")}
          actionLabel={t("account.sellOnBazaarLink")}
          onAction={() => {
            router.replace("/seller/onboarding");
          }}
        />
      </Screen>
    );
  }

  const subscription = currentStore.subscription;
  const categoryLimit =
    subscription.entitlements.categoryLimit === null
      ? t("seller.subscription.unlimited")
      : String(subscription.entitlements.categoryLimit);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge
          label={t(storeStatusKey(currentStore.status))}
          tone={currentStore.status === "published" ? "success" : "warning"}
        />
        <AppText variant="title">{t("seller.dashboard.title")}</AppText>
        <AppText tone="muted">{t("seller.dashboard.description")}</AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{currentStore.name}</AppText>
          <AppText tone="muted">
            {t("seller.dashboard.storeStatus")}: {t(storeStatusKey(currentStore.status))}
          </AppText>
          <AppText tone="muted">
            {t("seller.dashboard.plan")}: {subscription.plan.toUpperCase()}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("seller.dashboard.planUsage")}</AppText>
          <AppText>
            {t("seller.dashboard.productsUsage")}: {subscription.entitlements.productLimit}
          </AppText>
          <AppText>
            {t("seller.dashboard.categoriesUsage")}: {categoryLimit}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("seller.dashboard.needsAttention")}</AppText>
          <AppText tone="muted">
            {currentStore.status === "published"
              ? t("seller.dashboard.ready")
              : t("seller.dashboard.publishPrompt")}
          </AppText>
          <Button
            onPress={() => {
              router.push("/seller/(tabs)/store");
            }}
          >
            {t("seller.dashboard.openStore")}
          </Button>
        </View>
      </Card>

      <Button
        variant="ghost"
        onPress={() => {
          router.replace("/(tabs)");
        }}
      >
        {t("seller.backToShopping")}
      </Button>
    </Screen>
  );
}
