import type { StoreTheme } from "@bazaarlink/contracts";
import {
  localeMetadata,
  supportedLocales,
  type SupportedLocale
} from "@bazaarlink/localization";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View
} from "react-native";

import {
  AppText,
  Button,
  Card,
  Screen,
  StateView,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  getStoreError,
  useStores
} from "@/store/provider";
import {
  storeErrorKey,
  storeThemeKey
} from "@/store/messages";

const themes: StoreTheme[] = [
  "minimal",
  "modern",
  "fashion",
  "electronics",
  "food"
];

export default function SellerSettingsScreen() {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const { currentStore, updateStore } = useStores();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [cityDistrict, setCityDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLocale, setPreferredLocale] =
    useState<SupportedLocale>("fa-AF");
  const [description, setDescription] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [storeTheme, setStoreTheme] = useState<StoreTheme>("minimal");
  const [accentColor, setAccentColor] = useState("#0F766E");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof storeErrorKey> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentStore) {
      return;
    }

    setName(currentStore.name);
    setHandle(currentStore.handle);
    setCategory(currentStore.category);
    setProvince(currentStore.province);
    setCityDistrict(currentStore.cityDistrict);
    setPhone(currentStore.phone);
    setPreferredLocale(currentStore.preferredLocale);
    setDescription(currentStore.description ?? "");
    setWhatsappNumber(currentStore.whatsappNumber ?? "");
    setPhysicalAddress(currentStore.physicalAddress ?? "");
    setBusinessHours(currentStore.businessHours ?? "");
    setStoreTheme(currentStore.theme);
    setAccentColor(currentStore.accentColor);
  }, [currentStore]);

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

  const save = async () => {
    setBusy(true);
    setSaved(false);
    setErrorKey(null);

    try {
      await updateStore(currentStore.id, {
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
        theme: storeTheme,
        accentColor
      });
      setSaved(true);
    } catch (error) {
      setErrorKey(storeErrorKey(getStoreError(error).code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="title">{t("seller.settings.title")}</AppText>
        <AppText tone="muted">{t("seller.settings.description")}</AppText>
      </View>

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
                  accessibilityState={{ selected: preferredLocale === item }}
                  onPress={() => setPreferredLocale(item)}
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
                    tone={preferredLocale === item ? "primary" : "default"}
                  >
                    {localeMetadata[item].languageLabel}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
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
          <TextField
            label={t("seller.onboarding.accent")}
            value={accentColor}
            onChangeText={setAccentColor}
            autoCapitalize="characters"
            autoCorrect={false}
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

          {saved ? (
            <AppText tone="success">{t("seller.settings.saved")}</AppText>
          ) : null}
          {errorKey ? (
            <AppText tone="danger">{t(errorKey)}</AppText>
          ) : null}

          <Button
            fullWidth
            loading={busy}
            onPress={() => {
              void save();
            }}
          >
            {busy ? t("seller.settings.saving") : t("seller.settings.save")}
          </Button>
        </View>
      </Card>
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
