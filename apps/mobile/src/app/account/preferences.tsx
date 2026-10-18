import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";

import { useAuth } from "@/auth/provider";
import { usePushNotifications } from "@/communication/push-provider";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { appearanceOptions, useAppearancePreference, useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  AFGHAN_PROVINCES,
  getDiscoveryProvince,
  provinceName,
  setDiscoveryProvince,
  type ProvinceName
} from "@/marketplace/provinces";

const appearanceLabels: Record<"system" | "light" | "dark", TranslationKey> = {
  system: "account.preferences.system",
  light: "account.preferences.light",
  dark: "account.preferences.dark"
};

export default function AccountPreferencesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t, locale } = useLocalization();
  const { appearance, setAppearance } = useAppearancePreference();
  const { status } = useAuth();
  const push = usePushNotifications();

  const [province, setProvince] = useState<ProvinceName | null>(null);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState(false);
  const [provinceBusy, setProvinceBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getDiscoveryProvince().then(saved => {
      if (active) setProvince(saved);
    });
    return () => { active = false; };
  }, []);

  const chooseProvince = useCallback(async (next: ProvinceName | null) => {
    setProvinceBusy(true);
    setProvince(next);
    try {
      await setDiscoveryProvince(next);
      setProvinceOpen(false);
    } finally {
      setProvinceBusy(false);
    }
  }, []);

  const changePush = async (enabled: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushError(false);
    const success = enabled ? await push.enable() : await push.disable();
    if (!success) setPushError(true);
    setPushBusy(false);
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("seller.onboarding.back")}
      </Button>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="title">{t("account.preferences.title")}</AppText>
        <AppText tone="muted">{t("account.preferences.description")}</AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm
          }}>
            <Ionicons name="language-outline" color={theme.colors.primary} size={22} />
            <AppText variant="heading">{t("account.preferences.language")}</AppText>
          </View>
          <LanguageSwitcher compact />
          <AppText variant="caption" tone="muted">
            {t("account.preferences.languageHint")}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm
          }}>
            <Ionicons name="color-palette-outline" color={theme.colors.primary} size={22} />
            <AppText variant="heading">{t("account.preferences.appearance")}</AppText>
          </View>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            flexWrap: "wrap", gap: theme.spacing.sm
          }}>
            {appearanceOptions.map(option => {
              const active = appearance === option;
              return (
                <Pressable key={option}
                  accessibilityRole="radio"
                  accessibilityLabel={t(appearanceLabels[option])}
                  accessibilityState={{ selected: active }}
                  onPress={() => void setAppearance(option)}
                  style={({ pressed }) => ({
                    flexGrow: 1,
                    minHeight: 48,
                    minWidth: 86,
                    alignItems: "center", justifyContent: "center",
                    paddingHorizontal: theme.spacing.sm,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? theme.colors.primary : theme.colors.borderStrong,
                    backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                    borderRadius: theme.radii.md,
                    opacity: pressed ? theme.opacity.pressed : 1
                  })}
                >
                  <AppText variant="label" align="center"
                    tone={active ? "primary" : "default"}>
                    {t(appearanceLabels[option])}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText variant="caption" tone="muted">
            {t("account.preferences.appearanceHint")}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm
          }}>
            <Ionicons name="location-outline" color={theme.colors.primary} size={22}/>
            <AppText variant="heading">{t("account.preferences.province")}</AppText>
          </View>
          <AppText tone="muted">{t("account.preferences.provinceHint")}</AppText>
          <Button variant="secondary" disabled={provinceBusy}
            onPress={() => setProvinceOpen(current => !current)}>
            {(province ? provinceName(province, locale) : t("account.preferences.allProvinces")) +
              " " + (provinceOpen ? "▲" : "▼")}
          </Button>
          {provinceOpen ? (
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              flexWrap: "wrap", gap: theme.spacing.sm
            }}>
              {([null, ...AFGHAN_PROVINCES.map(item => item[0])] as Array<ProvinceName | null>)
                .map(item => (
                  <Pressable
                    key={item ?? "all"}
                    accessibilityRole="radio"
                    accessibilityLabel={item ? provinceName(item, locale) : t("account.preferences.allProvinces")}
                    accessibilityState={{ selected: province === item, disabled: provinceBusy }}
                    disabled={provinceBusy}
                    onPress={() => void chooseProvince(item)}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      borderRadius: theme.radii.md,
                      borderWidth: province === item ? 2 : 1,
                      borderColor: province === item ? theme.colors.primary : theme.colors.border,
                      backgroundColor: province === item ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                      paddingHorizontal: theme.spacing.md,
                      justifyContent: "center", alignItems: "center",
                      opacity: pressed ? theme.opacity.pressed : 1
                    })}
                  >
                    <AppText variant="caption" tone={province === item ? "primary" : "default"}>
                      {item ? provinceName(item, locale) : t("account.preferences.allProvinces")}
                    </AppText>
                  </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm
          }}>
            <Ionicons name="notifications-outline" color={theme.colors.primary} size={22}/>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{t("account.preferences.pushTitle")}</AppText>
            </View>
            <Switch value={push.status === "enabled"}
              disabled={pushBusy || push.status === "unavailable" || status !== "signedIn"}
              onValueChange={value => { void changePush(value); }}
              trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
              thumbColor={theme.colors.surface}
              accessibilityLabel={t("account.preferences.pushTitle")}
            />
          </View>
          <AppText variant="caption" tone="muted">
            {t(push.status === "unavailable"
              ? "account.preferences.pushUnavailable" : "account.preferences.pushHint")}
          </AppText>
          {pushError ? <AppText tone="danger" accessibilityRole="alert">
            {t("account.preferences.pushError")}
          </AppText> : null}
          <Button variant="secondary" onPress={() => router.push("/notifications")}>
            {t("account.preferences.inbox")}
          </Button>
        </View>
      </Card>
      <AppText variant="caption" tone="muted">
        {t("account.preferences.storageHint")}
      </AppText>
    </Screen>
  );
}
