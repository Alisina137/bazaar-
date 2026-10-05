import type {
  MerchantPaymentConfigurationResponse
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  getPaymentConfiguration,
  PaymentApiError,
  updatePaymentConfiguration
} from "@/payment/api";
import { paymentErrorKey } from "@/payment/messages";
import { useStores } from "@/store/provider";

type BooleanSetting =
  | "cashOnDeliveryEnabled"
  | "hesabpayEnabled"
  | "cardEnabled"
  | "payAtStoreEnabled";

export default function SellerPaymentsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status: authStatus, sessionToken } = useAuth();
  const { currentStore } = useStores();
  const { t } = useLocalization();

  const [config, setConfig] =
    useState<MerchantPaymentConfigurationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const load = async () => {
    if (
      authStatus !== "signedIn" ||
      !sessionToken ||
      !currentStore
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorKey(null);
    try {
      setConfig(
        await getPaymentConfiguration(sessionToken, currentStore.id)
      );
    } catch (error) {
      const safe =
        error instanceof PaymentApiError
          ? error
          : new PaymentApiError("service_unavailable");
      setErrorKey(paymentErrorKey(safe.code));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [authStatus, sessionToken, currentStore?.id]);

  const toggle = async (key: BooleanSetting) => {
    if (!sessionToken || !currentStore || !config || saving) return;

    setSaving(true);
    setErrorKey(null);
    try {
      const next = !config.settings[key];
      const updated = await updatePaymentConfiguration(
        sessionToken,
        currentStore.id,
        { [key]: next }
      );
      setConfig(updated);
    } catch (error) {
      const safe =
        error instanceof PaymentApiError
          ? error
          : new PaymentApiError("service_unavailable");
      setErrorKey(paymentErrorKey(safe.code));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("payment.seller.loadingTitle")}
          message={t("payment.seller.loadingMessage")}
        />
      </Screen>
    );
  }

  if (!currentStore || !config) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("payment.seller.errorTitle")}
          message={
            errorKey
              ? t(errorKey)
              : t("payment.error.configurationNotFound")
          }
          actionLabel={t("cart.retry")}
          onAction={() => {
            void load();
          }}
        />
      </Screen>
    );
  }

  const digitalReady = config.providerReadiness.hesabpayHostedCheckout;

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>

      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("payment.phaseBadge")} tone="primary" />
        <AppText variant="display">{t("payment.seller.title")}</AppText>
        <AppText tone="muted">
          {t("payment.seller.description")}
        </AppText>
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">
            {t("payment.seller.providerStatus")}
          </AppText>
          <Badge
            label={
              digitalReady
                ? t("payment.seller.providerReady")
                : t("payment.seller.providerNotReady")
            }
            tone={digitalReady ? "success" : "warning"}
          />
          <AppText tone="muted">
            {t("payment.seller.providerHint")}
          </AppText>
        </View>
      </Card>

      <PaymentSetting
        title={t("payment.method.cod")}
        description={t("payment.seller.codHint")}
        enabled={config.settings.cashOnDeliveryEnabled}
        saving={saving}
        onToggle={() => {
          void toggle("cashOnDeliveryEnabled");
        }}
      />
      <PaymentSetting
        title={t("payment.method.hesabpay")}
        description={t("payment.seller.hesabpayHint")}
        enabled={config.settings.hesabpayEnabled}
        saving={saving}
        disabled={!digitalReady && !config.settings.hesabpayEnabled}
        onToggle={() => {
          void toggle("hesabpayEnabled");
        }}
      />
      <PaymentSetting
        title={t("payment.method.card")}
        description={t("payment.seller.cardHint")}
        enabled={config.settings.cardEnabled}
        saving={saving}
        disabled={
          !config.providerReadiness.cardViaHesabPay &&
          !config.settings.cardEnabled
        }
        onToggle={() => {
          void toggle("cardEnabled");
        }}
      />
      <PaymentSetting
        title={t("payment.method.payAtStore")}
        description={t("payment.seller.payAtStoreHint")}
        enabled={config.settings.payAtStoreEnabled}
        saving={saving}
        onToggle={() => {
          void toggle("payAtStoreEnabled");
        }}
      />

      <Card muted>
        <AppText variant="caption" tone="muted">
          {t("payment.seller.securityHint")}
        </AppText>
      </Card>
    </Screen>
  );
}

function PaymentSetting({
  title,
  description,
  enabled,
  saving,
  disabled = false,
  onToggle
}: {
  title: string;
  description: string;
  enabled: boolean;
  saving: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <Card>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="title">{title}</AppText>
          <Badge
            label={
              enabled
                ? t("payment.seller.enabled")
                : t("payment.seller.disabled")
            }
            tone={enabled ? "success" : "neutral"}
          />
          <AppText tone="muted">{description}</AppText>
        </View>
        <Button
          variant={enabled ? "secondary" : "primary"}
          loading={saving}
          disabled={disabled || saving}
          onPress={onToggle}
        >
          {enabled
            ? t("payment.seller.disable")
            : t("payment.seller.enable")}
        </Button>
      </View>
    </Card>
  );
}
