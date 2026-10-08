import type { MerchantDashboardResponse } from "@bazaarlink/contracts";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import { useCatalog } from "@/catalog/provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import {
  GrowthApiError,
  merchantDashboard
} from "@/growth/api";
import { growthErrorKey } from "@/growth/messages";
import { useLocalization } from "@/localization/provider";
import {
  storeErrorKey,
  storeStatusKey
} from "@/store/messages";
import { useStores } from "@/store/provider";

export default function SellerDashboardScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { formatNumber, t } = useLocalization();
  const { sessionToken } = useAuth();
  const { currentStore, status, error, refresh } = useStores();
  const { usage } = useCatalog();
  const [dashboard, setDashboard] =
    useState<MerchantDashboardResponse | null>(null);
  const [dashboardError, setDashboardError] =
    useState<GrowthApiError | null>(null);

  const loadDashboard = async () => {
    if (!sessionToken || !currentStore) return;
    setDashboardError(null);
    try {
      setDashboard(
        await merchantDashboard(sessionToken, currentStore.id)
      );
    } catch (requestError) {
      setDashboardError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [sessionToken, currentStore?.id]);

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
      : formatNumber(subscription.entitlements.categoryLimit);

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

      {dashboardError ? (
        <Card muted>
          <AppText tone="danger">
            {t(growthErrorKey(dashboardError.code))}
          </AppText>
          <Button
            variant="secondary"
            onPress={() => void loadDashboard()}
          >
            {t("seller.onboarding.continue")}
          </Button>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("growth.dashboard.today")}</AppText>
          <AppText>
            {t("growth.dashboard.orders")}: {formatNumber(dashboard?.today.orders ?? 0)}
          </AppText>
          <AppText>
            {t("growth.dashboard.sales")}: {formatNumber(dashboard?.today.sales ?? 0)} AFN
          </AppText>
          <AppText>
            {t("growth.dashboard.customers")}: {formatNumber(dashboard?.today.customers ?? 0)}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("seller.dashboard.needsAttention")}</AppText>
          <AppText>
            {t("growth.dashboard.newOrders")}: {formatNumber(dashboard?.needsAttention.newOrders ?? 0)}
          </AppText>
          <AppText>
            {t("growth.dashboard.lowStock")}: {formatNumber(dashboard?.needsAttention.lowStock ?? 0)}
          </AppText>
          <AppText>
            {t("growth.dashboard.failedPayments")}: {formatNumber(dashboard?.needsAttention.failedPayments ?? 0)}
          </AppText>
          <AppText>
            {t("growth.dashboard.deliveryIssues")}: {formatNumber(dashboard?.needsAttention.deliveryIssues ?? 0)}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{currentStore.name}</AppText>
          <AppText tone="muted">
            {t("seller.dashboard.storeStatus")}: {t(storeStatusKey(currentStore.status))}
          </AppText>
          <AppText tone="muted">
            {t("seller.dashboard.plan")}: {subscription.plan.toUpperCase()}
          </AppText>
          <AppText>
            {t("growth.dashboard.activeProducts")}: {formatNumber(dashboard?.store.activeProducts ?? 0)}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("seller.dashboard.planUsage")}</AppText>
          <AppText>
            {t("seller.dashboard.productsUsage")}:{" "}
            {usage
              ? formatNumber(usage.productCount) + " / " + formatNumber(usage.productLimit)
              : formatNumber(subscription.entitlements.productLimit)}
          </AppText>
          <AppText>
            {t("seller.dashboard.categoriesUsage")}:{" "}
            {usage
              ? formatNumber(usage.activeCategoryCount) + " / " +
                (usage.categoryLimit === null
                  ? t("seller.subscription.unlimited")
                  : formatNumber(usage.categoryLimit))
              : categoryLimit}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("growth.dashboard.recentActivity")}</AppText>
          {(dashboard?.recentActivity ?? []).length === 0 ? (
            <AppText tone="muted">—</AppText>
          ) : (
            dashboard?.recentActivity.map((item) => (
              <View key={item.type + ":" + item.id} style={{ gap: theme.spacing.xs }}>
                <AppText variant="bodyStrong">{item.label}</AppText>
                <AppText tone="muted">{item.createdAt}</AppText>
              </View>
            ))
          )}
        </View>
      </Card>

      <Button
        onPress={() => {
          router.push("/seller/(tabs)/store");
        }}
      >
        {t("seller.dashboard.openStore")}
      </Button>

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
