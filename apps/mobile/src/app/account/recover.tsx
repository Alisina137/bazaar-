import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { securityErrorKey } from "@/account/security-messages";
import { finishPasswordReset, requestPasswordReset } from "@/auth/api";
import { AppText, Button, Card, Screen, TextField } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function PasswordRecoveryScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, isRTL } = useLocalization();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [requested, setRequested] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  const send = async () => {
    if (busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestPasswordReset(email.trim());
      setRequested(true);
      setNotice("account.security.recoverySent");
    } catch (failure) {
      setError(securityErrorKey(failure));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (busy || password.length < 8 || password.length > 128 ||
        password !== confirmation || !/^[A-Za-z0-9_-]{43}$/.test(code.trim())) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await finishPasswordReset(code.trim(), password);
      setPassword("");
      setConfirmation("");
      setCode("");
      setCompleted(true);
      setNotice("account.security.recoveryDone");
    } catch (failure) {
      setError(securityErrorKey(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("seller.onboarding.back")}
      </Button>
      <View style={{ gap: theme.spacing.sm, alignItems: "center" }}>
        <Ionicons name="key-outline" size={48} color={theme.colors.primary} />
        <AppText variant="title" align="center">{t("account.security.recoveryTitle")}</AppText>
        <AppText tone="muted" align="center">
          {t("account.security.recoveryDescription")}
        </AppText>
      </View>
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          {completed ? (
            <Button onPress={() => router.replace("/(tabs)/account")}>
              {t("account.security.backToLogin")}
            </Button>
          ) : (
            <>
              <TextField label={t("auth.email")} value={email}
                forceLTR keyboardType="email-address" autoCapitalize="none"
                autoCorrect={false} autoComplete="email" editable={!requested}
                onChangeText={setEmail} />
              {!requested ? (
                <Button fullWidth disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                  loading={busy} onPress={() => void send()}>
                  {t("account.security.sendRecovery")}
                </Button>
              ) : (
                <>
                  <AppText variant="caption" tone="muted">
                    {t("account.security.recoveryHint")}
                  </AppText>
                  <TextField label={t("account.security.verificationCode")}
                    value={code} onChangeText={setCode} forceLTR autoCapitalize="none"
                    autoCorrect={false} />
                  <TextField label={t("account.security.newPassword")}
                    value={password} onChangeText={setPassword}
                    forceLTR secureTextEntry autoCapitalize="none"
                    autoCorrect={false} helperText={t("auth.passwordHint")} />
                  <TextField label={t("account.security.confirmPassword")}
                    value={confirmation} onChangeText={setConfirmation}
                    forceLTR secureTextEntry autoCapitalize="none" autoCorrect={false} />
                  <Button fullWidth loading={busy}
                    disabled={busy || password.length < 8 || password.length > 128 ||
                      password !== confirmation || !/^[A-Za-z0-9_-]{43}$/.test(code.trim())}
                    onPress={() => void finish()}>
                    {t("account.security.resetPassword")}
                  </Button>
                  <Button variant="ghost" disabled={busy}
                    onPress={() => { setRequested(false); setCode(""); setError(null); }}>
                    {t("account.security.changeEmail")}
                  </Button>
                </>
              )}
            </>
          )}
          {error ? <AppText accessibilityRole="alert" tone="danger">{t(error)}</AppText> : null}
          {notice ? <AppText accessibilityRole="alert" tone="success">{t(notice)}</AppText> : null}
        </View>
      </Card>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row",
        gap: theme.spacing.sm, alignItems: "center" }}>
        <Ionicons name="shield-checkmark-outline" color={theme.colors.textMuted} size={18} />
        <AppText style={{ flex: 1 }} variant="caption" tone="muted">
          {t("account.security.recoverySafety")}
        </AppText>
      </View>
    </Screen>
  );
}
