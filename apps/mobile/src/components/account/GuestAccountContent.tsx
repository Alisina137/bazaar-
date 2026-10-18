import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps
} from "react-native";

import {
  validateAuthForm,
  type AuthField,
  type AuthMode,
  type AuthFormValues,
  type AuthValidationCode
} from "@/account/auth-validation";
import { getAuthErrorCode, useAuth } from "@/auth/provider";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

const EMPTY_VALUES: AuthFormValues = {
  displayName: "",
  email: "",
  password: "",
  confirmPassword: ""
};

const fieldErrorKeys: Record<AuthValidationCode, TranslationKey> = {
  emailRequired: "account.auth.emailRequired",
  emailInvalid: "account.auth.emailInvalid",
  passwordRequired: "account.auth.passwordRequired",
  passwordTooShort: "account.auth.passwordTooShort",
  passwordTooLong: "account.auth.passwordTooLong",
  nameTooLong: "account.auth.nameTooLong",
  confirmationRequired: "account.auth.confirmationRequired",
  confirmationMismatch: "account.auth.confirmationMismatch"
};

function authErrorKey(code: ReturnType<typeof getAuthErrorCode>): TranslationKey {
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

interface AuthInputProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string | undefined;
  helperText?: string | undefined;
  fieldRef?: RefObject<TextInput | null> | undefined;
  forceLTR?: boolean | undefined;
  trailing?: ReactNode;
}

function AuthInput({
  label,
  error,
  helperText,
  fieldRef,
  forceLTR = false,
  trailing,
  onFocus,
  onBlur,
  ...props
}: AuthInputProps) {
  const theme = useAppTheme();
  const { isRTL, direction } = useLocalization();
  const [focused, setFocused] = useState(false);
  const writingDirection = forceLTR ? "ltr" : direction;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        minHeight: Math.max(50, theme.sizes.controlHeight),
        borderWidth: 1,
        borderColor: error
          ? theme.colors.danger
          : focused ? theme.colors.focus : theme.colors.borderStrong,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.surface,
        overflow: "hidden"
      }}>
        <TextInput
          {...props}
          ref={fieldRef}
          accessibilityLabel={label}
          accessibilityHint={error ?? helperText}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={theme.colors.textMuted}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 50,
            paddingHorizontal: theme.spacing.md,
            color: theme.colors.text,
            fontSize: theme.fontSizes.body,
            lineHeight: theme.lineHeights.body,
            textAlign: forceLTR ? "left" : (isRTL ? "right" : "left"),
            writingDirection
          }}
        />
        {trailing}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" tone="muted">{helperText}</AppText>
      ) : null}
    </View>
  );
}

export function GuestAccountContent() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, locale, t } = useLocalization();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [values, setValues] = useState<AuthFormValues>(EMPTY_VALUES);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState<TranslationKey | null>(null);
  const submitting = useRef(false);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);

  const errors = useMemo(() => validateAuthForm(mode, values), [mode, values]);

  const edit = (field: AuthField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setRequestError(null);
  };

  const fieldError = (field: AuthField) => {
    const code = errors[field];
    return code && (attempted || touched[field]) ? t(fieldErrorKeys[code]) : undefined;
  };

  const switchMode = (next: AuthMode) => {
    if (busy || next === mode) return;
    setMode(next);
    setValues((current) => ({ ...current, password: "", confirmPassword: "" }));
    setPasswordVisible(false);
    setTouched({});
    setAttempted(false);
    setRequestError(null);
  };

  const submit = async () => {
    if (submitting.current) return;
    setAttempted(true);
    setRequestError(null);

    const problems = validateAuthForm(mode, values);
    if (Object.keys(problems).length > 0) {
      if (problems.displayName) nameRef.current?.focus();
      else if (problems.email) emailRef.current?.focus();
      else if (problems.password) passwordRef.current?.focus();
      else confirmationRef.current?.focus();
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      if (mode === "login") {
        await login({ email: values.email.trim(), password: values.password });
      } else {
        await register({
          email: values.email.trim(),
          password: values.password,
          displayName: values.displayName.trim() || null,
          preferredLocale: locale
        });
      }
      setValues((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (error) {
      setRequestError(authErrorKey(getAuthErrorCode(error)));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const passwordToggle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(passwordVisible ? "account.auth.hidePassword" : "account.auth.showPassword")}
      accessibilityState={{ selected: passwordVisible }}
      onPress={() => setPasswordVisible((current) => !current)}
      style={{
        height: 50, width: 50,
        alignItems: "center", justifyContent: "center"
      }}
    >
      <Ionicons
        name={passwordVisible ? "eye-off-outline" : "eye-outline"}
        color={theme.colors.textMuted}
        size={22}
      />
    </Pressable>
  );

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <View style={{ alignItems: "center", gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
        <View style={{
          width: 70, height: 70,
          borderRadius: theme.radii.full,
          alignItems: "center", justifyContent: "center",
          backgroundColor: theme.colors.primarySoft,
          borderWidth: 1, borderColor: theme.colors.border
        }}>
          <Ionicons name="person-circle-outline" size={40} color={theme.colors.primary} />
        </View>
        <AppText variant="title" align="center">{t("account.title")}</AppText>
        <AppText variant="body" tone="muted" align="center">
          {t("account.auth.guestIntro")}
        </AppText>
      </View>

      <Card style={{ padding: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.lg }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            padding: theme.spacing.xs, borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceMuted,
            gap: theme.spacing.xs
          }}>
            {(["login", "register"] as const).map((tab) => {
              const active = mode === tab;
              const label = t(tab === "login" ? "auth.signInAction" : "auth.registerAction");
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active, disabled: busy }}
                  disabled={busy}
                  onPress={() => switchMode(tab)}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    paddingHorizontal: theme.spacing.sm,
                    borderRadius: theme.radii.sm,
                    justifyContent: "center",
                    backgroundColor: active ? theme.colors.surface : theme.colors.surfaceMuted,
                    borderWidth: active ? 1 : 0,
                    borderColor: theme.colors.borderStrong,
                    opacity: busy ? theme.opacity.disabled : 1
                  }}
                >
                  <AppText variant="label" align="center" tone={active ? "primary" : "muted"}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="heading">
              {t(mode === "login" ? "auth.signInTitle" : "auth.registerTitle")}
            </AppText>
            <AppText tone="muted">
              {t(mode === "login" ? "auth.signInDescription" : "auth.registerDescription")}
            </AppText>
          </View>

          {mode === "register" ? (
            <AuthInput
              label={t("auth.displayName")}
              fieldRef={nameRef}
              value={values.displayName}
              onChangeText={(v) => edit("displayName", v)}
              onBlur={() => setTouched((prev) => ({ ...prev, displayName: true }))}
              error={fieldError("displayName")}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          ) : null}

          <AuthInput
            label={t("auth.email")}
            fieldRef={emailRef}
            forceLTR
            value={values.email}
            onChangeText={(v) => edit("email", v)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            error={fieldError("email")}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <AuthInput
            label={t("auth.password")}
            fieldRef={passwordRef}
            forceLTR
            value={values.password}
            onChangeText={(v) => edit("password", v)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            error={fieldError("password")}
            helperText={mode === "register" ? t("auth.passwordHint") : undefined}
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            returnKeyType={mode === "login" ? "go" : "next"}
            onSubmitEditing={() => mode === "login"
              ? void submit() : confirmationRef.current?.focus()}
            trailing={passwordToggle}
          />

          {mode === "register" ? (
            <AuthInput
              label={t("account.auth.confirmPassword")}
              fieldRef={confirmationRef}
              forceLTR
              value={values.confirmPassword}
              onChangeText={(v) => edit("confirmPassword", v)}
              onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
              error={fieldError("confirmPassword")}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              trailing={passwordToggle}
            />
          ) : null}

          {requestError ? (
            <View
              accessibilityRole="alert"
              style={{
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.dangerSoft,
                padding: theme.spacing.md,
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center", gap: theme.spacing.sm
              }}
            >
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.danger} />
              <View style={{ flex: 1 }}>
                <AppText tone="danger">{t(requestError)}</AppText>
              </View>
            </View>
          ) : null}

          <Button
            fullWidth
            loading={busy}
            disabled={busy}
            onPress={() => { void submit(); }}
          >
            {t(mode === "login" ? "auth.signInAction" : "auth.registerAction")}
          </Button>
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("account.auth.continueShopping")}
        onPress={() => router.push("/(tabs)/marketplace")}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: isRTL ? "row-reverse" : "row",
          justifyContent: "center", alignItems: "center",
          gap: theme.spacing.sm,
          opacity: pressed ? theme.opacity.pressed : 1
        })}
      >
        <AppText variant="label" tone="primary">
          {t("account.auth.continueShopping")}
        </AppText>
        <Ionicons
          name={isRTL ? "arrow-back-outline" : "arrow-forward-outline"}
          size={18} color={theme.colors.primary}
        />
      </Pressable>

      <Card style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
        <AppText variant="label">{t("language.label")}</AppText>
        <LanguageSwitcher compact />
      </Card>
    </Screen>
  );
}
