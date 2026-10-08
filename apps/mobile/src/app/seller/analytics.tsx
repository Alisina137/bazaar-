import type { MerchantAnalyticsResponse } from "@bazaarlink/contracts";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
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
  merchantAnalytics
} from "@/growth/api";
import { growthErrorKey } from "@/growth/messages";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

export default function SellerAnalyticsScreen() {
  const theme = useAppTheme();
  const { formatNumber, t } = useLocalization();
  const { sessionToken } = useAuth();
  const { currentStore } = useStores();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<MerchantAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GrowthApiError | null>(null);

  const load = async (period = days) => {
    if (!sessionToken || !currentStore) return;
    setLoading(true);
    setError(null);
    try {
      setData(
        await merchantAnalytics(
          sessionToken,
          currentStore.id,
          period
        )
      );
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [sessionToken, currentStore?.id]);

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

  if (error && !data) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("growth.analytics.title")}
          message={t(growthErrorKey(error.code))}
          actionLabel={t("seller.onboarding.continue")}
          onAction={() => void load()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="title">{t("growth.analytics.title")}</AppText>
        <Badge
          label={
            data?.advanced
              ? t("growth.analytics.advanced")
              : t("growth.analytics.basic")
          }
          tone={data?.advanced ? "success" : "neutral"}
        />
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
            {[7, 30, 90].map((period) => (
              <Button
                key={period}
                variant={days === period ? "primary" : "secondary"}
                loading={loading && days === period}
                onPress={() => {
                  setDays(period);
                  void load(period);
                }}
              >
                {formatNumber(period)}
              </Button>
            ))}
          </View>
          <AppText tone="muted">
            {formatNumber(data?.periodDays ?? days)}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("growth.analytics.totalSales")}</AppText>
          <AppText variant="title">
            {formatNumber(data?.totalSales ?? 0)} AFN
          </AppText>
          <AppText>
            {t("growth.analytics.totalOrders")}: {formatNumber(data?.totalOrders ?? 0)}
          </AppText>
          <AppText>
            {t("growth.analytics.totalCustomers")}: {formatNumber(data?.totalCustomers ?? 0)}
          </AppText>
        </View>
      </Card>

      {data?.advanced ? (
        <>
          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="heading">{t("growth.analytics.advanced")}</AppText>
              <AppText>
                {t("growth.analytics.repeatCustomers")}: {formatNumber(data.repeatCustomers ?? 0)}
              </AppText>
              <AppText>
                {t("growth.analytics.repeatRate")}: {formatNumber(data.repeatCustomerRate ?? 0)}%
              </AppText>
              <AppText>
                {t("growth.analytics.productDiscounts")}: {formatNumber(data.productDiscountTotal)} AFN
              </AppText>
              <AppText>
                {t("growth.analytics.couponDiscounts")}: {formatNumber(data.couponDiscountTotal)} AFN
              </AppText>
              <AppText>
                {t("growth.analytics.deliveryCompleted")}: {formatNumber(data.deliveryCompletedCount ?? 0)}
              </AppText>
              <AppText>
                {t("growth.analytics.deliveryFailed")}: {formatNumber(data.deliveryFailedCount ?? 0)}
              </AppText>
            </View>
          </Card>

          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="heading">{t("growth.analytics.trends")}</AppText>
              {(data.revenueTrend ?? []).map((point) => (
                <View
                  key={point.date}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: theme.spacing.md
                  }}
                >
                  <AppText tone="muted">{point.date}</AppText>
                  <AppText>{formatNumber(point.value)} AFN</AppText>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : (
        <Card muted>
          <AppText tone="muted">
            {t("growth.analytics.advancedLocked")}
          </AppText>
        </Card>
      )}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("growth.analytics.topProducts")}</AppText>
          {(data?.topProducts ?? []).length === 0 ? (
            <AppText tone="muted">—</AppText>
          ) : (
            data?.topProducts.map((product) => (
              <View
                key={product.productId}
                style={{ gap: theme.spacing.xs }}
              >
                <AppText variant="bodyStrong">{product.name}</AppText>
                <AppText tone="muted">
                  {formatNumber(product.unitsSold)} · {formatNumber(product.revenue)} AFN · {formatNumber(product.views)}
                </AppText>
              </View>
            ))
          )}
        </View>
      </Card>
    </Screen>
  );
}
