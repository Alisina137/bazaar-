import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { getAuthErrorCode, useAuth } from "@/auth/provider";
import { ProfileAvatar, avatarColors, type AvatarColor } from "@/components/account/ProfileAvatar";
import { AppText, Button, Card, Screen, StateView, TextField } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

function profileErrorKey(code: ReturnType<typeof getAuthErrorCode>): TranslationKey {
  const keys: Record<ReturnType<typeof getAuthErrorCode>, TranslationKey> = {
    invalid_request: "auth.error.invalidRequest",
    email_in_use: "auth.error.emailInUse",
    invalid_credentials: "auth.error.invalidCredentials",
    invalid_session: "auth.error.sessionExpired",
    account_unavailable: "auth.error.accountUnavailable",
    forbidden: "auth.error.forbidden",
    rate_limited: "auth.error.rateLimited",
    service_unavailable: "auth.error.serviceUnavailable"
  };
  return keys[code];
}

export default function EditProfileScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const { status, user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(user?.avatarColor ?? "teal");
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  // Reinitialize only when a different account signs in, not on local edits.
  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setPhone(user?.phone ?? "");
    setAvatarColor(user?.avatarColor ?? "teal");
    setSaved(false);
    setErrorKey(null);
  }, [user?.id]);

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView kind="loading" title={t("auth.restoringTitle")}
          message={t("auth.restoringMessage")} />
      </Screen>
    );
  }
  if (status !== "signedIn" || !user) {
    return <Redirect href="/(tabs)/account" />;
  }

  const safeName = displayName.trim();
  const safePhone = phone.trim();
  const phoneValid = !safePhone || /^\+?[0-9 ()-]{7,24}$/.test(safePhone);
  const nameValid = safeName.length <= 160;
  const unchanged =
    safeName === (user.displayName ?? "") &&
    safePhone === (user.phone ?? "") &&
    avatarColor === (user.avatarColor ?? "teal");

  const save = async () => {
    if (saving) return;
    setTried(true);
    setErrorKey(null);
    setSaved(false);
    if (!phoneValid || !nameValid || unchanged) return;

    setSaving(true);
    try {
      await updateProfile({
        displayName: safeName || null,
        phone: safePhone || null,
        avatarColor
      });
      setSaved(true);
    } catch (error) {
      setErrorKey(profileErrorKey(getAuthErrorCode(error)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("marketplace.back")}
        onPress={() => router.back()}
        style={{
          minHeight: 44,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.xs
        }}
      >
        <Ionicons
          name={isRTL ? "arrow-forward-outline" : "arrow-back-outline"}
          color={theme.colors.primary} size={19}
        />
        <AppText variant="label" tone="primary">{t("marketplace.back")}</AppText>
      </Pressable>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="heading">{t("account.profile.title")}</AppText>
        <AppText tone="muted">{t("account.profile.description")}</AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
            <ProfileAvatar name={displayName} color={avatarColor} size={80} />
            <AppText variant="label" align="center">{t("account.profile.avatar")}</AppText>
            <AppText variant="caption" tone="muted" align="center">
              {t("account.profile.avatarHint")}
            </AppText>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: theme.spacing.md,
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
              {avatarColors.map((color) => {
                const active = avatarColor === color;
                return (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityLabel={t("account.profile.avatar." + color as TranslationKey)}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      setAvatarColor(color);
                      setSaved(false);
                    }}
                    style={{
                      minWidth: 60, minHeight: 60,
                      borderRadius: theme.radii.md,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: theme.colors.surfaceMuted
                    }}
                  >
                    <ProfileAvatar name={displayName} color={color} size={42} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextField
            label={t("account.profile.name")}
            value={displayName}
            onChangeText={(value) => {
              setDisplayName(value);
              setSaved(false);
            }}
            autoCapitalize="words"
            autoComplete="name"
            error={tried && !nameValid ? t("account.profile.nameInvalid") : undefined}
          />

          <TextField
            label={t("account.profile.phone")}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setSaved(false);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            error={tried && !phoneValid ? t("account.profile.phoneInvalid") : undefined}
            helperText={t("account.profile.phoneHint")}
          />

          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="label">{t("auth.email")}</AppText>
            <View style={{
              minHeight: 50, borderRadius: theme.radii.md,
              borderColor: theme.colors.border, borderWidth: 1,
              backgroundColor: theme.colors.surfaceMuted,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg
            }}>
              <Ionicons name="lock-closed-outline" color={theme.colors.textMuted} size={18}/>
              <View style={{ flex: 1 }}>
                <AppText style={{ writingDirection: "ltr" }} align="left">
                  {user.email ?? t("account.profile.emailUnavailable")}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" tone="muted">
              {t("account.profile.emailLocked")}
            </AppText>
          </View>

          {errorKey ? (
            <AppText accessibilityRole="alert" tone="danger">{t(errorKey)}</AppText>
          ) : null}
          {saved ? (
            <AppText accessibilityRole="alert" tone="success">
              {t("account.profile.saved")}
            </AppText>
          ) : null}
          <Button
            fullWidth
            loading={saving}
            disabled={saving || unchanged || !phoneValid || !nameValid}
            onPress={() => { void save(); }}
          >
            {t("account.profile.save")}
          </Button>
        </View>
      </Card>
    </Screen>
  );
}
