import {
  getAvailableAppModes,
  type AppMode,
  type AppRole,
  type AuthErrorCode
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
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
    case "forbidden":
      return "auth.error.forbidden";
    case "rate_limited":
      return "auth.error.rateLimited";
    case "service_unavailable":
    default:
      return "auth.error.serviceUnavailable";
  }
}

function roleKey(role: AppRole): TranslationKey {
  const keys: Record<AppRole, TranslationKey> = {
    customer: "role.customer",
    merchant_owner: "role.merchantOwner",
    merchant_staff: "role.merchantStaff",
    platform_support: "role.platformSupport",
    platform_admin: "role.platformAdmin",
    super_admin: "role.superAdmin"
  };

  return keys[role];
}

function modeKey(mode: AppMode): TranslationKey {
  const keys: Record<AppMode, TranslationKey> = {
    shopping: "auth.mode.shopping",
    seller: "auth.mode.seller",
    platform: "auth.mode.platform"
  };

  return keys[mode];
}

export default function AccountScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, locale, t } = useLocalization();
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
    const availableModes = getAvailableAppModes(user.roles);

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
            <AppText variant="heading">{t("auth.rolesLabel")}</AppText>
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                flexWrap: "wrap",
                gap: theme.spacing.sm
              }}
            >
              {user.roles.map((role) => (
                <Badge
                  key={role}
                  label={t(roleKey(role))}
                  tone="primary"
                />
              ))}
            </View>

            <AppText variant="heading">{t("auth.authorizedModesLabel")}</AppText>
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                flexWrap: "wrap",
                gap: theme.spacing.sm
              }}
            >
              {availableModes.map((appMode) => (
                <Badge
                  key={appMode}
                  label={t(modeKey(appMode))}
                  tone="neutral"
                />
              ))}
            </View>

            <AppText variant="caption" tone="muted">
              {t("auth.rolesManagedByServer")}
            </AppText>
          </View>
        </Card>

        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <AppText variant="heading">{t("account.title")}</AppText>
            <Button
              onPress={() => {
                router.push(
                  user.roles.includes("merchant_owner")
                    ? "/seller/(tabs)"
                    : "/seller/onboarding"
                );
              }}
            >
              {user.roles.includes("merchant_owner")
                ? t("account.openSellerDashboard")
                : t("account.sellOnBazaarLink")}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                router.push("/checkout/addresses");
              }}
            >
              {t("address.manage")}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                router.push("/notifications");
              }}
            >
              {t("account.notifications")}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                router.push("/support");
              }}
            >
              {t("account.support")}
            </Button>
            {user.roles.some((role) =>
              ["platform_support", "platform_admin", "super_admin"].includes(role)
            ) ? (
              <>
                <AppText variant="heading">{t("account.platformTools")}</AppText>
                <Button
                  variant="secondary"
                  onPress={() => {
                    router.push("/platform/reviews");
                  }}
                >
                  {t("review.moderationTitle")}
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => {
                    router.push("/platform/support");
                  }}
                >
                  {t("support.platformTitle")}
                </Button>
              </>
            ) : null}
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
