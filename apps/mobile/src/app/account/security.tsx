import Ionicons from "@expo/vector-icons/Ionicons";
import type { AuthSecuritySession } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { securityErrorKey } from "@/account/security-messages";
import {
  finishEmailVerification,
  listAccountSessions,
  requestEmailVerification,
  revokeAccountSession,
  revokeOtherAccountSessions,
  updateAccountPassword
} from "@/auth/api";
import { useAuth } from "@/auth/provider";
import {
  AppText, Button, Card, Screen, StateView, TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function AccountSecurityScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const { status, user, sessionToken, refreshSession } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [sessions, setSessions] = useState<AuthSecuritySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [verificationRequested, setVerificationRequested] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!sessionToken) return;
    setLoadingSessions(true);
    try {
      const data = await listAccountSessions(sessionToken);
      setSessions(data.sessions);
    } catch (failure) {
      setError(securityErrorKey(failure));
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionToken]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const perform = async (
    fn: () => Promise<void>,
    success: TranslationKey,
    reloadSessions = false
  ) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(success);
      if (reloadSessions) await loadSessions();
    } catch (failure) {
      setError(securityErrorKey(failure));
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return <Screen scrollable={false}>
      <StateView kind="loading" title={t("auth.restoringTitle")}
        message={t("auth.restoringMessage")} />
    </Screen>;
  }
  if (status !== "signedIn" || !user || !sessionToken) {
    return <Redirect href="/(tabs)/account" />;
  }

  const passwordValid = currentPassword.length > 0 &&
    newPassword.length >= 8 && newPassword.length <= 128 &&
    newPassword !== currentPassword && confirmPassword === newPassword;

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("seller.onboarding.back")}
      </Button>

      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="title">{t("account.security.title")}</AppText>
        <AppText tone="muted">{t("account.security.description")}</AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm
          }}>
            <Ionicons name="mail-outline" size={22} color={theme.colors.primary} />
            <AppText variant="heading">{t("account.security.emailHeading")}</AppText>
          </View>
          <AppText style={{ writingDirection: "ltr" }} align="left">
            {user.email ?? ""}
          </AppText>
          <AppText tone={user.emailVerified ? "success" : "muted"}>
            {t(user.emailVerified ? "account.security.emailVerified" : "account.security.emailUnverified")}
          </AppText>
          {!user.emailVerified ? (
            <>
              <Button variant="secondary" disabled={busy}
                onPress={() => void perform(async () => {
                  await requestEmailVerification(sessionToken);
                  setVerificationRequested(true);
                }, "account.security.codeSent")}>
                {t("account.security.sendVerification")}
              </Button>
              {verificationRequested ? (
                <>
                  <TextField
                    label={t("account.security.verificationCode")}
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    forceLTR
                    helperText={t("account.security.codeHint")}
                  />
                  <Button disabled={busy || !/^[A-Za-z0-9_-]{43}$/.test(code.trim())}
                    loading={busy}
                    onPress={() => void perform(async () => {
                      await finishEmailVerification(sessionToken, code.trim());
                      setCode("");
                      await refreshSession();
                    }, "account.security.emailVerified")}>
                    {t("account.security.confirmVerification")}
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm
          }}>
            <Ionicons name="lock-closed-outline" size={22} color={theme.colors.primary} />
            <AppText variant="heading">{t("account.security.passwordHeading")}</AppText>
          </View>
          <TextField label={t("account.security.currentPassword")}
            forceLTR secureTextEntry value={currentPassword}
            autoCapitalize="none" autoCorrect={false}
            onChangeText={setCurrentPassword} />
          <TextField label={t("account.security.newPassword")}
            forceLTR secureTextEntry value={newPassword}
            autoCapitalize="none" autoCorrect={false}
            helperText={t("auth.passwordHint")}
            onChangeText={setNewPassword} />
          <TextField label={t("account.security.confirmPassword")}
            forceLTR secureTextEntry value={confirmPassword}
            autoCapitalize="none" autoCorrect={false}
            onChangeText={setConfirmPassword} />
          <Button fullWidth loading={busy} disabled={busy || !passwordValid}
            onPress={() => void perform(async () => {
              await updateAccountPassword(sessionToken, currentPassword, newPassword);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }, "account.security.passwordChanged", true)}>
            {t("account.security.changePassword")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("account.security.sessionsHeading")}</AppText>
          <AppText variant="caption" tone="muted">
            {t("account.security.sessionsHint")}
          </AppText>
          {loadingSessions ? (
            <AppText tone="muted">{t("account.security.loading")}</AppText>
          ) : sessions.length === 0 ? (
            <AppText tone="muted">{t("account.security.noSessions")}</AppText>
          ) : sessions.map((item) => (
            <View key={item.id} style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: theme.spacing.sm,
              alignItems: "center", paddingVertical: theme.spacing.sm,
              borderBottomWidth: 1, borderBottomColor: theme.colors.border
            }}>
              <Ionicons name="phone-portrait-outline"
                size={20} color={theme.colors.textMuted} />
              <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                <AppText variant="label">
                  {t(item.current ? "account.security.thisSession" : "account.security.otherSession")}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t("account.security.lastActive")}: {new Date(item.lastSeenAt).toLocaleString()}
                </AppText>
              </View>
              {!item.current ? (
                <Button variant="secondary" disabled={busy}
                  onPress={() => void perform(
                    () => revokeAccountSession(sessionToken, item.id),
                    "account.security.sessionRevoked",
                    true
                  )}>
                  {t("account.security.revoke")}
                </Button>
              ) : null}
            </View>
          ))}
          <Button variant="secondary" disabled={busy || sessions.length <= 1}
            onPress={() => void perform(
              () => revokeOtherAccountSessions(sessionToken),
              "account.security.otherSessionsRevoked",
              true
            )}>
            {t("account.security.revokeOthers")}
          </Button>
          <Button variant="ghost" disabled={busy} onPress={() => void loadSessions()}>
            {t("account.security.refresh")}
          </Button>
        </View>
      </Card>

      {error ? <AppText accessibilityRole="alert" tone="danger">{t(error)}</AppText> : null}
      {notice ? <AppText accessibilityRole="alert" tone="success">{t(notice)}</AppText> : null}
    </Screen>
  );
}
