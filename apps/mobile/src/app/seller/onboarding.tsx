import type { MarketplaceCategoryRecord, StoreTheme } from "@bazaarlink/contracts";
import {
  localeMetadata,
  supportedLocales,
  type SupportedLocale,
  type TranslationKey
} from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { OnboardingPlanCards } from "@/components/seller/OnboardingPlanCards";
import { useEffect, useState } from "react";
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
  SelectField,
  Screen,
  StateView,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { marketplaceCategories } from "@/marketplace/api";
import { AFGHAN_PROVINCES, provinceName } from "@/marketplace/provinces";
import { districtOptionsForProvince } from "@/store/location-options";
import { getStoreError, useStores } from "@/store/provider";
import {
  storeErrorKey,
  storeThemeKey
} from "@/store/messages";

type OnboardingStep = "plan" | "store" | "details";
const OTHER_DISTRICT = "__other__";

const themes: StoreTheme[] = [
  "minimal",
  "modern",
  "fashion",
  "electronics",
  "food"
];

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
  const [customDistrict, setCustomDistrict] = useState("");
  const [platformCategories, setPlatformCategories] = useState<MarketplaceCategoryRecord[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoriesReload, setCategoriesReload] = useState(0);
  const [phone, setPhone] = useState("");
  const [preferredLocale, setPreferredLocale] =
    useState<SupportedLocale>(locale);
  const [description, setDescription] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [storeTheme, setStoreTheme] = useState<StoreTheme>("minimal");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  // Use the same platform categories offered in Marketplace, never invented names.
  // A failed/empty response stays retryable and cannot create an invalid store.
  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    setCategoriesError(false);
    void marketplaceCategories().then(result => {
      if (!active) return;
      setPlatformCategories(result.categories);
    }).catch(() => {
      if (!active) return;
      setPlatformCategories([]);
      setCategoriesError(true);
    }).finally(() => {
      if (active) setCategoriesLoading(false);
    });
    return () => { active = false; };
  }, [categoriesReload]);

  const roots = platformCategories.filter(item => item.parentId === null);
  const categories = roots.length > 0 ? roots : platformCategories;
  const selectedCategory = categories.find(item => item.id === category);
  const districtOptions = districtOptionsForProvince(province, locale);
  const enteredDistrict = cityDistrict === OTHER_DISTRICT
    ? customDistrict.trim()
    : cityDistrict;
  const validDistrict = cityDistrict === OTHER_DISTRICT
    ? customDistrict.trim().length > 0
    : districtOptions.some(item => item.value === cityDistrict);

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

  const requiredComplete =
    name.trim().length >= 2 &&
    handle.trim().length >= 3 &&
    Boolean(selectedCategory?.nameEn.trim()) &&
    AFGHAN_PROVINCES.some(([value]) => value === province) &&
    validDistrict &&
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
        category: selectedCategory!.nameEn,
        province,
        cityDistrict: enteredDistrict,
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
        plans.length > 0 ? (
          <OnboardingPlanCards
            plans={plans}
            onStartStarter={() => setStep("store")}
          />
        ) : (
          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <AppText tone="muted">{t("seller.plans.unavailable")}</AppText>
              <Button variant="secondary" onPress={() => void refresh()}>
                {t("seller.plans.retry")}
              </Button>
            </View>
          </Card>
        )
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
            <SelectField
              label={t("seller.onboarding.category")}
              placeholder={t("seller.onboarding.categoryPlaceholder")}
              value={category}
              options={categories.map(item => ({
                value: item.id,
                label: locale === "en" ? item.nameEn : locale === "ps-AF" ? item.namePs : item.nameFa
              }))}
              onChange={setCategory}
              disabled={categoriesLoading || categoriesError || categories.length === 0}
              helperText={categoriesLoading ? t("seller.onboarding.categoryLoading") : undefined}
            />
            {!categoriesLoading && (categoriesError || categories.length === 0) ? (
              <View style={{ gap: theme.spacing.sm }}>
                <AppText tone="muted">
                  {t(categoriesError ? "seller.onboarding.categoryUnavailable" : "seller.onboarding.categoryEmpty")}
                </AppText>
                <Button variant="secondary" onPress={() => setCategoriesReload(n => n + 1)}>
                  {t("seller.onboarding.retryCategories")}
                </Button>
              </View>
            ) : null}
            <SelectField
              label={t("seller.onboarding.province")}
              placeholder={t("seller.onboarding.provincePlaceholder")}
              value={province}
              options={AFGHAN_PROVINCES.map(([value]) => ({
                value,
                label: provinceName(value, locale)
              }))}
              onChange={value => {
                setProvince(value);
                setCityDistrict("");
                setCustomDistrict("");
              }}
            />
            <SelectField
              label={t("seller.onboarding.cityDistrict")}
              placeholder={t("seller.onboarding.districtPlaceholder")}
              value={cityDistrict}
              options={[
                ...districtOptions,
                ...(province ? [{ value: OTHER_DISTRICT, label: t("seller.onboarding.otherDistrict") }] : [])
              ]}
              onChange={setCityDistrict}
              disabled={!province}
              helperText={!province ? t("seller.onboarding.selectProvinceFirst") : undefined}
            />
            {cityDistrict === OTHER_DISTRICT && province ? (
              <TextField
                label={t("seller.onboarding.customDistrict")}
                value={customDistrict}
                onChangeText={setCustomDistrict}
                maxLength={120}
              />
            ) : null}
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
              <AppText tone="danger">{t(errorKey)}</AppText>
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
              <AppText variant="caption" tone="muted">{t("seller.plans.themeNotice")}</AppText>
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
                    accessibilityState={{
                      selected: storeTheme === item,
                      disabled: item !== "minimal"
                    }}
                    disabled={item !== "minimal"}
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
                        opacity: item !== "minimal" ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
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
              <AppText tone="danger">{t(errorKey)}</AppText>
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
