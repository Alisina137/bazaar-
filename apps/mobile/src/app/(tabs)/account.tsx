import type { AuthErrorCode } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useState } from "react";
import { View } from "react-native";

import {
  getAuthErrorCode,
  useAuth
} from "@/auth/provider";
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

type AuthMode = "login" | "register";

function authErrorKey(code: AuthErrorCode): TranslationKey {
  switch (code) {
    case "invalid_request":
      return "auth.error.invalidRequest";
    case "email_in_use":
      return "auth.error.emailInUse";
    case "invalid_credentials":
      return "auth.error.invalidCredentials";
    case "invalid_session":
      return "auth.error.sessionExpired";
    case "account_unavailable":
      return "auth.error.accountUnavailable";
    case "rate_limited":
      return "auth.error.rateLimited";
    case "service_unavailable":
    default:
      return "auth.error.serviceUnavailable";
  }
}

export default function AccountScreen() {
  const theme = useAppTheme();
  const { locale, t } = useLocalization();
  const { status, user, login, register, logout } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("auth.restoringTitle")}
          message={t("auth.restoringMessage")}
        />
      </Screen>
    );
  }

  if (status === "signedIn" && user) {
    return (
      <Screen>
        <View style={{ gap: theme.spacing.sm }}>
          <Badge label={t("auth.activeSession")} tone="success" />
          <AppText variant="title">
            {user.displayName ?? t("auth.signedInTitle")}
          </AppText>
          <AppText tone="muted">{t("auth.signedInMessage")}</AppText>
        </View>

        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <AppText variant="heading">{t("account.title")}</AppText>
            <AppText tone="muted">{t("auth.sessionProtected")}</AppText>
            <Button
              variant="secondary"
              loading={busy}
              onPress={() => {
                setBusy(true);
                void logout().finally(() => {
                  setBusy(false);
                });
              }}
            >
              {t("auth.signOut")}
            </Button>
          </View>
        </Card>
      </Screen>
    );
  }

  const submit = async () => {
    setErrorKey(null);
    setBusy(true);

    try {
      if (mode === "login") {
        await login({
          email,
          password
        });
      } else {
        await register({
          email,
          password,
          displayName: displayName.trim() || null,
          preferredLocale: locale
        });
      }

      setPassword("");
    } catch (error) {
      setErrorKey(authErrorKey(getAuthErrorCode(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("common.brandName")} tone="primary" />
        <AppText variant="title">
          {mode === "login" ? t("auth.signInTitle") : t("auth.registerTitle")}
        </AppText>
        <AppText tone="muted">
          {mode === "login"
            ? t("auth.signInDescription")
            : t("auth.registerDescription")}
        </AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          {mode === "register" ? (
            <TextField
              label={t("auth.displayName")}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          ) : null}

          <TextField
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextField
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            helperText={
              mode === "register" ? t("auth.passwordHint") : undefined
            }
          />

          {errorKey ? (
            <AppText tone="danger">{t(errorKey)}</AppText>
          ) : null}

          <Button
            fullWidth
            loading={busy}
            onPress={() => {
              void submit();
            }}
          >
            {mode === "login"
              ? t("auth.signInAction")
              : t("auth.registerAction")}
          </Button>

          <Button
            fullWidth
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setErrorKey(null);
              setPassword("");
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login"
              ? t("auth.needAccount")
              : t("auth.haveAccount")}
          </Button>
        </View>
      </Card>
    </Screen>
  );
}
