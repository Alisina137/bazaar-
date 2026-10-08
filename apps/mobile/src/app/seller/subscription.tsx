import type {
  SubscriptionPlanCode,
  SubscriptionResourceItem,
  SubscriptionResourceType
} from "@bazaarlink/contracts";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

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
  changeSubscription,
  GrowthApiError,
  subscriptionResources
} from "@/growth/api";
import { growthErrorKey } from "@/growth/messages";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

const PLAN_ORDER: Record<SubscriptionPlanCode, number> = {
  starter: 0,
  pro: 1,
  business: 2
};

interface ResourceState {
  items: SubscriptionResourceItem[];
  total: number;
  hasMore: boolean;
}

const emptyResources = (): Record<SubscriptionResourceType, ResourceState> => ({
  products: { items: [], total: 0, hasMore: false },
  categories: { items: [], total: 0, hasMore: false },
  staff: { items: [], total: 0, hasMore: false }
});

export default function SellerSubscriptionScreen() {
  const theme = useAppTheme();
  const { formatNumber, t } = useLocalization();
  const { sessionToken, user } = useAuth();
  const { currentStore, plans, refresh } = useStores();

  const [targetPlan, setTargetPlan] =
    useState<SubscriptionPlanCode | null>(null);
  const [resources, setResources] =
    useState<Record<SubscriptionResourceType, ResourceState>>(emptyResources);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GrowthApiError | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (currentStore) {
      setTargetPlan(currentStore.subscription.plan);
      setResources(emptyResources());
      setSelectedProducts([]);
      setSelectedCategories([]);
      setSelectedStaff([]);
    }
  }, [currentStore?.id, currentStore?.subscription.plan]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === targetPlan) ?? null,
    [plans, targetPlan]
  );

  const isOwner = Boolean(
    currentStore && user && currentStore.ownerUserId === user.id
  );

  const isDowngrade =
    Boolean(currentStore && targetPlan) &&
    PLAN_ORDER[targetPlan as SubscriptionPlanCode] <
      PLAN_ORDER[currentStore!.subscription.plan];

  const loadPage = async (
    type: SubscriptionResourceType,
    reset = false
  ) => {
    if (!sessionToken || !currentStore || !isOwner) return;
    const current = resources[type];
    const offset = reset ? 0 : current.items.length;
    const page = await subscriptionResources(
      sessionToken,
      currentStore.id,
      type,
      offset,
      50
    );

    setResources((value) => ({
      ...value,
      [type]: {
        items: reset
          ? page.items
          : [
              ...value[type].items,
              ...page.items.filter(
                (item) =>
                  !value[type].items.some((known) => known.id === item.id)
              )
            ],
        total: page.pageInfo.total,
        hasMore: page.pageInfo.hasMore
      }
    }));
  };

  useEffect(() => {
    if (!isDowngrade || !isOwner) return;
    setLoadingResources(true);
    setError(null);
    setResources(emptyResources());
    setSelectedProducts([]);
    setSelectedCategories([]);
    setSelectedStaff([]);
    void Promise.all([
      loadPage("products", true),
      loadPage("categories", true),
      loadPage("staff", true)
    ])
      .catch((requestError) => {
        setError(
          requestError instanceof GrowthApiError
            ? requestError
            : new GrowthApiError("service_unavailable")
        );
      })
      .finally(() => setLoadingResources(false));
  }, [targetPlan, currentStore?.id, isOwner]);

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

  const target = selectedPlan?.entitlements;
  const productRequired =
    isDowngrade &&
    target &&
    resources.products.total > target.productLimit
      ? target.productLimit
      : null;
  const categoryRequired =
    isDowngrade &&
    target &&
    target.categoryLimit !== null &&
    resources.categories.total > target.categoryLimit
      ? target.categoryLimit
      : null;
  const staffRequired =
    isDowngrade &&
    target &&
    resources.staff.total > target.staffLimit
      ? target.staffLimit
      : null;

  const ready =
    targetPlan !== null &&
    targetPlan !== currentStore.subscription.plan &&
    (productRequired === null ||
      selectedProducts.length === productRequired) &&
    (categoryRequired === null ||
      selectedCategories.length === categoryRequired) &&
    (staffRequired === null || selectedStaff.length === staffRequired);

  const toggleSelection = (
    id: string,
    current: string[],
    setter: (next: string[]) => void,
    required: number | null
  ) => {
    if (required === null) return;
    if (current.includes(id)) {
      setter(current.filter((item) => item !== id));
      return;
    }
    if (current.length < required) {
      setter([...current, id]);
    }
  };

  const apply = async () => {
    if (!sessionToken || !targetPlan || !ready) return;
    setBusy(true);
    setError(null);
    setChanged(false);

    try {
      await changeSubscription(sessionToken, currentStore.id, {
        plan: targetPlan,
        ...(productRequired !== null
          ? { keepProductIds: selectedProducts }
          : {}),
        ...(categoryRequired !== null
          ? { keepCategoryIds: selectedCategories }
          : {}),
        ...(staffRequired !== null ? { keepStaffIds: selectedStaff } : {})
      });
      await refresh();
      setChanged(true);
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    } finally {
      setBusy(false);
    }
  };

  const resourceCard = (
    type: SubscriptionResourceType,
    title: string,
    required: number | null,
    selected: string[],
    setter: (next: string[]) => void
  ) => {
    if (required === null) return null;
    const resource = resources[type];

    return (
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{title}</AppText>
          <AppText tone="muted">
            {formatNumber(selected.length)} / {formatNumber(required)}
          </AppText>
          {required === 0 ? (
            <AppText tone="muted">
              {t("growth.subscription.selectionRequired")}
            </AppText>
          ) : (
            resource.items.map((item) => {
              const active = selected.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    toggleSelection(
                      item.id,
                      selected,
                      setter,
                      required
                    )
                  }
                  style={{
                    padding: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    borderColor: active
                      ? theme.colors.primary
                      : theme.colors.borderStrong,
                    backgroundColor: active
                      ? theme.colors.primarySoft
                      : theme.colors.surface
                  }}
                >
                  <AppText variant="bodyStrong">{item.label}</AppText>
                  <AppText tone="muted">{item.status}</AppText>
                </Pressable>
              );
            })
          )}
          {resource.hasMore && selected.length < required ? (
            <Button
              variant="secondary"
              loading={loadingResources}
              onPress={() => {
                setLoadingResources(true);
                void loadPage(type)
                  .catch((requestError) => {
                    setError(
                      requestError instanceof GrowthApiError
                        ? requestError
                        : new GrowthApiError("service_unavailable")
                    );
                  })
                  .finally(() => setLoadingResources(false));
              }}
            >
              +
            </Button>
          ) : null}
        </View>
      </Card>
    );
  };

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
            {t("growth.subscription.current")}
          </AppText>
          <AppText>
            {t("seller.subscription.productLimit")}: {formatNumber(currentStore.subscription.entitlements.productLimit)}
          </AppText>
          <AppText>
            {t("seller.subscription.categoryLimit")}:{" "}
            {currentStore.subscription.entitlements.categoryLimit === null
              ? t("seller.subscription.unlimited")
              : formatNumber(
                  currentStore.subscription.entitlements.categoryLimit
                )}
          </AppText>
          <AppText>
            {t("seller.subscription.staffLimit")}:{" "}
            {formatNumber(currentStore.subscription.entitlements.staffLimit)}
          </AppText>
        </View>
      </Card>

      {!isOwner ? (
        <Card muted>
          <AppText tone="muted">{t("growth.error.forbidden")}</AppText>
        </Card>
      ) : (
        <>
          <AppText variant="heading">
            {t("growth.subscription.changePlan")}
          </AppText>

          {plans.map((plan) => {
            const selected = targetPlan === plan.code;
            const direction =
              PLAN_ORDER[plan.code] >
              PLAN_ORDER[currentStore.subscription.plan]
                ? t("growth.subscription.upgrade")
                : PLAN_ORDER[plan.code] <
                    PLAN_ORDER[currentStore.subscription.plan]
                  ? t("growth.subscription.downgrade")
                  : t("growth.subscription.current");

            return (
              <Pressable
                key={plan.code}
                onPress={() => setTargetPlan(plan.code)}
                style={{
                  padding: theme.spacing.lg,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.borderStrong,
                  backgroundColor: selected
                    ? theme.colors.primarySoft
                    : theme.colors.surface
                }}
              >
                <View style={{ gap: theme.spacing.sm }}>
                  <AppText variant="heading">
                    {plan.code.toUpperCase()}
                  </AppText>
                  <AppText tone="muted">{direction}</AppText>
                  <AppText>
                    {t("seller.subscription.productLimit")}: {formatNumber(plan.entitlements.productLimit)}
                  </AppText>
                  <AppText>
                    {t("seller.subscription.staffLimit")}: {formatNumber(plan.entitlements.staffLimit)}
                  </AppText>
                </View>
              </Pressable>
            );
          })}

          {isDowngrade ? (
            <Card muted>
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="bodyStrong">
                  {t("growth.subscription.dataSafe")}
                </AppText>
                <AppText tone="muted">
                  {t("growth.subscription.selectionRequired")}
                </AppText>
              </View>
            </Card>
          ) : null}

          {resourceCard(
            "products",
            t("growth.subscription.keepProducts"),
            productRequired,
            selectedProducts,
            setSelectedProducts
          )}
          {resourceCard(
            "categories",
            t("growth.subscription.keepCategories"),
            categoryRequired,
            selectedCategories,
            setSelectedCategories
          )}
          {resourceCard(
            "staff",
            t("growth.subscription.keepStaff"),
            staffRequired,
            selectedStaff,
            setSelectedStaff
          )}

          {error ? (
            <Card muted>
              <AppText tone="danger">{t(growthErrorKey(error.code))}</AppText>
            </Card>
          ) : null}

          {changed ? (
            <Card>
              <AppText tone="success">
                {t("growth.subscription.dataSafe")}
              </AppText>
            </Card>
          ) : null}

          <Button
            fullWidth
            loading={busy || loadingResources}
            disabled={!ready}
            onPress={() => void apply()}
          >
            {t("growth.subscription.confirm")}
          </Button>

          <AppText tone="muted">
            {t("growth.subscription.pricingAdmin")}
          </AppText>
        </>
      )}
    </Screen>
  );
}
