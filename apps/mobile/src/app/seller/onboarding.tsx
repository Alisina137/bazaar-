import type {
  StoreTheme,
  SubscriptionPlanCode
} from "@bazaarlink/contracts";
import {
  localeMetadata,
  supportedLocales,
  type SupportedLocale
} from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View
} from "react-native";

import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { getStoreError, useStores } from "@/store/provider";
import {
  storeErrorKey,
  storeThemeKey
} from "@/store/messages";

type OnboardingStep = "plan" | "store" | "details";

const themes: StoreTheme[] = [
  "minimal",
  "modern",
  "fashion",
  "electronics",
  "food"
];

function planTitleKey(plan: SubscriptionPlanCode) {
  return {
    starter: "seller.onboarding.starterTitle",
    pro: "seller.onboarding.proTitle",
    business: "seller.onboarding.businessTitle"
  } as const satisfies Record<SubscriptionPlanCode, string>;
}

function planDescriptionKey(plan: SubscriptionPlanCode) {
  return {
    starter: "seller.onboarding.starterDescription",
    pro: "seller.onboarding.proDescription",
    business: "seller.onboarding.businessDescription"
  } as const satisfies Record<SubscriptionPlanCode, string>;
}

export default function SellerOnboardingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { locale, isRTL, t } = useLocalization();
  const {
    status,
    currentStore,
    plans,
    error,
    refresh,
    createStore
  } = useStores();

  const [step, setStep] = useState<OnboardingStep>("plan");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [cityDistrict, setCityDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLocale, setPreferredLocale] =
    useState<SupportedLocale>(locale);
  const [description, setDescription] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [storeTheme, setStoreTheme] = useState<StoreTheme>("minimal");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const starterPlan = useMemo(
    () => plans.find((plan) => plan.code === "starter"),
    [plans]
  );

  if (currentStore) {
    return <StateViewRedirect />;
  }

  if (status === "loading" || status === "idle") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("seller.onboarding.title")}
          message={t("seller.onboarding.description")}
        />
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("store.error.serviceUnavailable")}
          message={error ? t(storeErrorKey(error.code)) : undefined}
          actionLabel={t("seller.onboarding.continue")}
          onAction={() => {
            void refresh();
          }}
        />
      </Screen>
    );
  }

  const requiredComplete =
    name.trim().length >= 2 &&
    handle.trim().length >= 3 &&
    category.trim().length >= 2 &&
    province.trim().length >= 2 &&
    cityDistrict.trim().length >= 1 &&
    phone.trim().length >= 7;

  const submit = async () => {
    if (!requiredComplete) {
      setErrorKey("store.error.invalidRequest");
      setStep("store");
      return;
    }

    setBusy(true);
    setErrorKey(null);

    try {
      await createStore({
        name,
        handle,
        category,
        province,
        cityDistrict,
        phone,
        preferredLocale,
        description: description || null,
        whatsappNumber: whatsappNumber || null,
        physicalAddress: physicalAddress || null,
        businessHours: businessHours || null,
        theme: storeTheme
      });

      router.replace("/seller/(tabs)");
    } catch (requestError) {
      setErrorKey(storeErrorKey(getStoreError(requestError).code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("account.sellOnBazaarLink")} tone="primary" />
        <AppText variant="title">{t("seller.onboarding.title")}</AppText>
        <AppText tone="muted">{t("seller.onboarding.description")}</AppText>
      </View>

      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          gap: theme.spacing.sm
        }}
      >
        {(["plan", "store", "details"] as OnboardingStep[]).map((item) => (
          <Badge
            key={item}
            tone={step === item ? "primary" : "neutral"}
            label={
              item === "plan"
                ? t("seller.onboarding.planStep")
                : item === "store"
                  ? t("seller.onboarding.storeStep")
                  : t("seller.onboarding.detailsStep")
            }
          />
        ))}
      </View>

      {step === "plan" ? (
        <View style={{ gap: theme.spacing.md }}>
          {(plans.length > 0
            ? plans
            : [
                {
                  code: "starter" as const,
                  entitlements: {
                    productLimit: 15,
                    categoryLimit: 5,
                    staffLimit: 0,
                    advancedInventory: false,
                    advancedDelivery: false,
                    discounts: false,
                    coupons: false,
                    advancedAnalytics: false,
                    premiumStorefront: false,
                    customDomain: false
                  },
                  paidUpgradeAvailable: false
                }
              ]
          ).map((plan) => (
            <Card key={plan.code}>
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="heading">
                  {t(planTitleKey(plan.code))}
                </AppText>
                <AppText tone="muted">
                  {t(planDescriptionKey(plan.code))}
                </AppText>
                {plan.code === "starter" ? (
                  <Badge label={t("seller.subscription.currentPlan")} tone="success" />
                ) : (
                  <Badge label={t("seller.onboarding.futureUpgrade")} tone="neutral" />
                )}
              </View>
            </Card>
          ))}

          <Button
            disabled={!starterPlan && plans.length > 0}
            onPress={() => {
              setStep("store");
            }}
          >
            {t("seller.onboarding.continue")}
          </Button>
        </View>
      ) : null}

      {step === "store" ? (
        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <TextField
              label={t("seller.onboarding.storeName")}
              value={name}
              onChangeText={setName}
            />
            <TextField
              label={t("seller.onboarding.handle")}
              helperText={t("seller.onboarding.handleHint")}
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label={t("seller.onboarding.category")}
              value={category}
              onChangeText={setCategory}
            />
            <TextField
              label={t("seller.onboarding.province")}
              value={province}
              onChangeText={setProvince}
            />
            <TextField
              label={t("seller.onboarding.cityDistrict")}
              value={cityDistrict}
              onChangeText={setCityDistrict}
            />
            <TextField
              label={t("seller.onboarding.phone")}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="label">
                {t("seller.onboarding.preferredLanguage")}
              </AppText>
              <View
                style={[
                  styles.wrap,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    gap: theme.spacing.sm
                  }
                ]}
              >
                {supportedLocales.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: preferredLocale === item
                    }}
                    onPress={() => {
                      setPreferredLocale(item);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        minHeight: theme.sizes.touchTarget,
                        borderRadius: theme.radii.full,
                        borderColor:
                          preferredLocale === item
                            ? theme.colors.primary
                            : theme.colors.borderStrong,
                        backgroundColor:
                          preferredLocale === item
                            ? theme.colors.primarySoft
                            : theme.colors.surface,
                        opacity: pressed ? theme.opacity.pressed : 1,
                        paddingHorizontal: theme.spacing.lg
                      }
                    ]}
                  >
                    <AppText
                      variant="label"
                      tone={
                        preferredLocale === item
                          ? "primary"
                          : "default"
                      }
                    >
                      {localeMetadata[item].languageLabel}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            {errorKey ? (
              <AppText tone="danger">{t(errorKey as never)}</AppText>
            ) : null}

            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                gap: theme.spacing.sm
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  fullWidth
                  variant="secondary"
                  onPress={() => setStep("plan")}
                >
                  {t("seller.onboarding.back")}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  fullWidth
                  disabled={!requiredComplete}
                  onPress={() => setStep("details")}
                >
                  {t("seller.onboarding.continue")}
                </Button>
              </View>
            </View>
          </View>
        </Card>
      ) : null}

      {step === "details" ? (
        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText variant="heading">
                {t("seller.onboarding.optionalDetails")}
              </AppText>
              <AppText tone="muted">
                {t("seller.onboarding.optionalDetailsHint")}
              </AppText>
            </View>

            <TextField
              label={t("seller.onboarding.descriptionField")}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextField
              label={t("seller.onboarding.whatsapp")}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
            <TextField
              label={t("seller.onboarding.address")}
              value={physicalAddress}
              onChangeText={setPhysicalAddress}
              multiline
            />
            <TextField
              label={t("seller.onboarding.businessHours")}
              value={businessHours}
              onChangeText={setBusinessHours}
            />

            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="label">{t("seller.onboarding.theme")}</AppText>
              <View
                style={[
                  styles.wrap,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    gap: theme.spacing.sm
                  }
                ]}
              >
                {themes.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: storeTheme === item }}
                    onPress={() => setStoreTheme(item)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        minHeight: theme.sizes.touchTarget,
                        borderRadius: theme.radii.md,
                        borderColor:
                          storeTheme === item
                            ? theme.colors.primary
                            : theme.colors.borderStrong,
                        backgroundColor:
                          storeTheme === item
                            ? theme.colors.primarySoft
                            : theme.colors.surface,
                        opacity: pressed ? theme.opacity.pressed : 1,
                        paddingHorizontal: theme.spacing.md
                      }
                    ]}
                  >
                    <AppText
                      variant="label"
                      tone={storeTheme === item ? "primary" : "default"}
                    >
                      {t(storeThemeKey(item))}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            {errorKey ? (
              <AppText tone="danger">{t(errorKey as never)}</AppText>
            ) : null}

            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                gap: theme.spacing.sm
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  fullWidth
                  variant="secondary"
                  disabled={busy}
                  onPress={() => setStep("store")}
                >
                  {t("seller.onboarding.back")}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  fullWidth
                  loading={busy}
                  onPress={() => {
                    void submit();
                  }}
                >
                  {busy
                    ? t("seller.onboarding.creating")
                    : t("seller.onboarding.createStore")}
                </Button>
              </View>
            </View>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function StateViewRedirect() {
  const router = useRouter();
  const { t } = useLocalization();

  return (
    <Screen scrollable={false}>
      <StateView
        kind="empty"
        title={t("seller.dashboard.ready")}
        actionLabel={t("account.openSellerDashboard")}
        onAction={() => {
          router.replace("/seller/(tabs)");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexWrap: "wrap"
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth
  }
});
