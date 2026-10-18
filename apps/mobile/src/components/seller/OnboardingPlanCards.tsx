import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  StoreEntitlements,
  SubscriptionPlanCode,
  SubscriptionPlanSummary
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useWindowDimensions, View } from "react-native";

import {
  AppText,
  Badge,
  Button,
  HorizontalLocaleScroll
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

const planCodes: readonly SubscriptionPlanCode[] = [
  "starter", "pro", "business"
];

const featureKeys = [
  "advancedInventory",
  "advancedDelivery",
  "discounts",
  "coupons",
  "promotions",
  "advancedAnalytics",
  "premiumStorefront",
  "customDomain"
] as const satisfies readonly (keyof StoreEntitlements)[];

const planColors: Record<SubscriptionPlanCode, string> = {
  starter: "#64748B",
  pro: "#16A34A",
  business: "#6366F1"
};

const planTitles: Record<SubscriptionPlanCode, TranslationKey> = {
  starter: "seller.onboarding.starterTitle",
  pro: "seller.onboarding.proTitle",
  business: "seller.onboarding.businessTitle"
};

const planDescriptions: Record<SubscriptionPlanCode, TranslationKey> = {
  starter: "seller.onboarding.starterDescription",
  pro: "seller.onboarding.proDescription",
  business: "seller.onboarding.businessDescription"
};

const featureLabels: Record<(typeof featureKeys)[number], TranslationKey> = {
  advancedInventory: "seller.plans.advancedInventory",
  advancedDelivery: "seller.plans.advancedDelivery",
  discounts: "seller.plans.discounts",
  coupons: "seller.plans.coupons",
  promotions: "seller.plans.promotions",
  advancedAnalytics: "seller.plans.advancedAnalytics",
  premiumStorefront: "seller.plans.premiumStorefront",
  customDomain: "seller.plans.customDomain"
};

function PlanFeatureRow({
  title,
  included,
  accent,
  value
}: {
  title: string;
  included: boolean;
  accent: string;
  value?: string | undefined;
}) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();

  return (
    <View style={{
      minHeight: 30,
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      gap: theme.spacing.sm
    }}>
      <Ionicons
        name={included ? "checkmark-circle" : "close-circle-outline"}
        color={included ? accent : theme.colors.textMuted}
        size={16}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" tone={included ? "default" : "muted"}>
          {title}{value === undefined ? "" : ": " + value}
        </AppText>
      </View>
    </View>
  );
}

/**
 * Display features directly from the server-supplied entitlements. Paid pricing
 * is intentionally NOT invented: no public seller-pricing endpoint exists yet.
 * New stores always start on Starter; paid tiers are informational at signup.
 */
export function OnboardingPlanCards({
  plans,
  onStartStarter
}: {
  plans: readonly SubscriptionPlanSummary[];
  onStartStarter: () => void;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const { isRTL, t, formatNumber } = useLocalization();
  const cardWidth = Math.min(296, Math.max(236, width * 0.72));
  const orderedPlans = planCodes
    .map((code) => plans.find((plan) => plan.code === code))
    .filter((plan): plan is SubscriptionPlanSummary => Boolean(plan));

  if (orderedPlans.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="heading">{t("seller.plans.compareTitle")}</AppText>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: theme.spacing.xs, alignItems: "center"
        }}>
          <Ionicons
            name="swap-horizontal-outline"
            color={theme.colors.textMuted}
            size={16}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">
              {t("seller.plans.scrollHint")}
            </AppText>
          </View>
        </View>
      </View>

      <HorizontalLocaleScroll
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        style={{ marginHorizontal: -theme.spacing.xl }}
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing.xs,
          alignItems: "stretch"
        }}
        accessibilityLabel={t("seller.plans.compareTitle")}
      >
        {orderedPlans.map((plan) => {
          const { entitlements: limits, code } = plan;
          const starter = code === "starter";
          const accent = planColors[code];

          return (
            <View
              key={code}
              style={{
                width: cardWidth,
                minHeight: 560,
                borderWidth: starter ? 1.5 : 1,
                borderColor: starter ? theme.colors.primary : theme.colors.borderStrong,
                borderTopLeftRadius: 28,
                borderTopRightRadius: theme.radii.md,
                borderBottomRightRadius: 28,
                borderBottomLeftRadius: theme.radii.md,
                backgroundColor: theme.colors.surface,
                overflow: "hidden",
                padding: theme.spacing.lg
              }}
            >
              <View style={{
                position: "absolute",
                top: 90,
                right: isRTL ? undefined : -31,
                left: isRTL ? -31 : undefined,
                width: 72,
                height: 72,
                borderColor: accent,
                borderTopWidth: 5,
                borderLeftWidth: isRTL ? 5 : 0,
                borderRightWidth: isRTL ? 0 : 5,
                borderTopLeftRadius: isRTL ? 18 : 0,
                borderTopRightRadius: isRTL ? 0 : 18,
                opacity: 0.65,
                transform: [{ rotate: "45deg" }]
              }} />

              <View style={{ flex: 1, gap: theme.spacing.md }}>
                <View style={{ gap: theme.spacing.xs }}>
                  <View style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center", justifyContent: "space-between",
                    gap: theme.spacing.sm
                  }}>
                    <AppText variant="heading" style={{ flex: 1 }}>
                      {t(planTitles[code])}
                    </AppText>
                    <Badge
                      label={starter ? t("seller.plans.freeTier") : t("seller.plans.paidTier")}
                      tone={starter ? "success" : "neutral"}
                    />
                  </View>
                  <AppText variant="bodyStrong" style={{ color: accent }}>
                    {starter
                      ? t("seller.plans.free")
                      : t("seller.plans.pricingConfigured")}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {t(planDescriptions[code])}
                  </AppText>
                </View>

                <View style={{ height: 1, backgroundColor: theme.colors.border }} />

                <View style={{ gap: theme.spacing.xs }}>
                  <PlanFeatureRow
                    title={t("seller.subscription.productLimit")}
                    value={formatNumber(limits.productLimit)}
                    included
                    accent={accent}
                  />
                  <PlanFeatureRow
                    title={t("seller.subscription.categoryLimit")}
                    value={limits.categoryLimit === null
                      ? t("seller.subscription.unlimited")
                      : formatNumber(limits.categoryLimit)}
                    included
                    accent={accent}
                  />
                  <PlanFeatureRow
                    title={t("seller.subscription.staffLimit")}
                    value={formatNumber(limits.staffLimit)}
                    included={limits.staffLimit > 0}
                    accent={accent}
                  />
                  {featureKeys.map((feature) => (
                    <PlanFeatureRow
                      key={feature}
                      title={t(featureLabels[feature])}
                      included={limits[feature]}
                      accent={accent}
                    />
                  ))}
                </View>
              </View>

              <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
                {starter ? (
                  <Button fullWidth onPress={onStartStarter}>
                    {t("seller.plans.startFree")}
                  </Button>
                ) : (
                  <View
                    accessible
                    accessibilityRole="text"
                    style={{
                      minHeight: Math.max(48, theme.sizes.controlHeight),
                      paddingHorizontal: theme.spacing.sm,
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      borderColor: theme.colors.borderStrong,
                      justifyContent: "center",
                      backgroundColor: theme.colors.surfaceMuted
                    }}
                  >
                    <AppText variant="label" tone="muted" align="center">
                      {t("seller.plans.upgradeAfterSetup")}
                    </AppText>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </HorizontalLocaleScroll>

      <AppText variant="caption" tone="muted">
        {t("seller.plans.newStoreNotice")}
      </AppText>
    </View>
  );
}
