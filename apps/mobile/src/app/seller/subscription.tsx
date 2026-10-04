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
import { useStores } from "@/store/provider";

export default function SellerSubscriptionScreen() {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const { currentStore, plans } = useStores();

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
      <AppText variant="title">{t("seller.subscription.title")}</AppText>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Badge
            label={currentStore.subscription.plan.toUpperCase()}
            tone="success"
          />
          <AppText variant="heading">
            {t("seller.subscription.currentPlan")}
          </AppText>
          <AppText>
            {t("seller.subscription.productLimit")}: {currentStore.subscription.entitlements.productLimit}
          </AppText>
          <AppText>
            {t("seller.subscription.categoryLimit")}: {
              currentStore.subscription.entitlements.categoryLimit === null
                ? t("seller.subscription.unlimited")
                : currentStore.subscription.entitlements.categoryLimit
            }
          </AppText>
          <AppText>
            {t("seller.subscription.staffLimit")}: {
              currentStore.subscription.entitlements.staffLimit === 0
                ? t("seller.subscription.ownerOnly")
                : currentStore.subscription.entitlements.staffLimit
            }
          </AppText>
        </View>
      </Card>

      {plans
        .filter((plan) => plan.code !== currentStore.subscription.plan)
        .map((plan) => (
          <Card key={plan.code} muted>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="heading">{plan.code.toUpperCase()}</AppText>
              <AppText>
                {t("seller.subscription.productLimit")}: {plan.entitlements.productLimit}
              </AppText>
              <AppText>
                {t("seller.subscription.categoryLimit")}: {
                  plan.entitlements.categoryLimit === null
                    ? t("seller.subscription.unlimited")
                    : plan.entitlements.categoryLimit
                }
              </AppText>
              <Badge
                label={t("seller.onboarding.futureUpgrade")}
                tone="neutral"
              />
            </View>
          </Card>
        ))}

      <AppText tone="muted">
        {t("seller.subscription.upgradeLater")}
      </AppText>
    </Screen>
  );
}
