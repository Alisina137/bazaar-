import Ionicons from "@expo/vector-icons/Ionicons";
import type { SupportTicketRecord } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  closeSupportTicket, CommunicationApiError, replySupportTicket, supportTicket
} from "@/communication/api";
import {
  communicationErrorKey, supportCategoryKey, supportStatusKey
} from "@/communication/messages";
import {
  AppText, Badge, Button, Card, Screen, StateView, TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function SupportTicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { sessionToken, status, user } = useAuth();
  const { isRTL, locale, t } = useLocalization();

  const [ticket, setTicket] = useState<SupportTicketRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setTicket(null);
    setLoadError(null);
    if (!sessionToken || status !== "signedIn" || !ticketId) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void supportTicket(sessionToken, ticketId)
      .then(result => { if (active) setTicket(result); })
      .catch(cause => {
        if (active) setLoadError(communicationErrorKey(
          cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
        ));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionToken, status, ticketId, reload]));

  const send = async () => {
    const text = message.trim();
    if (busy || !sessionToken || !ticketId || !ticket ||
        ticket.status === "closed" || text.length < 2 || text.length > 6000) return;
    setBusy(true);
    setError(null);
    try {
      const result = await replySupportTicket(sessionToken, ticketId, text);
      setTicket(result);
      setMessage("");
    } catch (cause) {
      setError(communicationErrorKey(
        cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
      ));
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (busy || !sessionToken || !ticketId || !ticket || ticket.status === "closed") return;
    setBusy(true);
    setError(null);
    try {
      const result = await closeSupportTicket(sessionToken, ticketId);
      setTicket(result);
    } catch (cause) {
      setError(communicationErrorKey(
        cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
      ));
    } finally { setBusy(false); }
  };

  const confirmClose = () => {
    Alert.alert(
      t("support.hub.closeTitle"),
      t("support.hub.closeDescription"),
      [
        { text: t("support.hub.cancel"), style: "cancel" },
        { text: t("support.close"), style: "destructive", onPress: () => { void close(); } }
      ]
    );
  };

  if (status === "loading" || loading) {
    return <Screen scrollable={false}>
      <StateView kind="loading" title={t("support.title")}
        message={t("support.hub.loading")} />
    </Screen>;
  }

  if (status !== "signedIn" || !user) {
    return <Screen>
      <StateView kind="empty" title={t("support.hub.signInTitle")}
        message={t("support.hub.signInHint")}
        actionLabel={t("auth.signInAction")}
        onAction={() => router.replace("/(tabs)/account")} />
    </Screen>;
  }

  if (!ticket) {
    return <Screen>
      <StateView kind="error" title={t("support.title")}
        message={t(loadError ?? "support.error.notFound")}
        actionLabel={t("support.hub.retry")}
        onAction={() => setReload(value => value + 1)} />
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>
    </Screen>;
  }

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>
      <Card style={{ backgroundColor: theme.colors.primarySoft }}>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">{ticket.subject}</AppText>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            gap: theme.spacing.xs, flexWrap: "wrap"
          }}>
            <Badge label={t(supportCategoryKey(ticket.category))} tone="primary" />
            <Badge label={t(supportStatusKey(ticket.status))}
              tone={ticket.status === "waiting_customer" ? "warning" : "neutral"} />
          </View>
          <AppText variant="caption" tone="muted">
            {t("support.hub.created")} {new Date(ticket.createdAt).toLocaleString(locale)}
          </AppText>
          {ticket.orderId ? (
            <Button variant="secondary" onPress={() => router.push({
              pathname: "/orders/[orderId]", params: { orderId: ticket.orderId! }
            })}>
              {t("support.hub.viewOrder")}
            </Button>
          ) : null}
          {ticket.status === "waiting_customer" ? (
            <AppText tone="primary">{t("support.hub.replyRequested")}</AppText>
          ) : null}
        </View>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="title">{t("support.hub.conversation")}</AppText>
        {[...ticket.messages]
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
          .map(entry => {
            const fromSupport = entry.authorKind === "platform";
            return (
              <View key={entry.id} style={{
                alignSelf: fromSupport
                  ? (isRTL ? "flex-start" : "flex-end")
                  : (isRTL ? "flex-end" : "flex-start"),
                width: "92%",
                maxWidth: 520
              }}>
                <Card muted={fromSupport}>
                  <View style={{ gap: theme.spacing.sm }}>
                    <View style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      gap: theme.spacing.sm, alignItems: "center"
                    }}>
                      <Ionicons name={fromSupport ? "headset-outline" : "person-outline"}
                        color={theme.colors.primary} size={17}/>
                      <AppText variant="label">
                        {t(fromSupport ? "support.hub.agent" : "support.hub.you")}
                      </AppText>
                    </View>
                    <AppText>{entry.body}</AppText>
                    <AppText variant="caption" tone="muted">
                      {new Date(entry.createdAt).toLocaleString(locale)}
                    </AppText>
                  </View>
                </Card>
              </View>
            );
          })}
      </View>

      {ticket.status !== "closed" ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <TextField label={t("support.message")}
              value={message} onChangeText={setMessage}
              multiline maxLength={6000}
              helperText={t("support.hub.messageHint")}
              error={message.length > 0 && message.trim().length < 2
                ? t("support.hub.messageInvalid") : undefined}
            />
            {error ? <AppText tone="danger" accessibilityRole="alert">
              {t(error)}
            </AppText> : null}
            <Button fullWidth loading={busy}
              disabled={busy || message.trim().length < 2}
              onPress={() => { void send(); }}>
              {t("support.sendReply")}
            </Button>
            <Button variant="secondary" disabled={busy}
              onPress={confirmClose}>
              {t("support.close")}
            </Button>
          </View>
        </Card>
      ) : (
        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="bodyStrong">{t("support.hub.closedTitle")}</AppText>
            <AppText tone="muted">{t("support.hub.closedHint")}</AppText>
            <Button variant="secondary" onPress={() => router.push("/support")}>
              {t("support.newTicket")}
            </Button>
          </View>
        </Card>
      )}
      <Button variant="ghost" onPress={() => setReload(value => value + 1)}
        disabled={busy || loading}>
        {t("support.hub.refresh")}
      </Button>
    </Screen>
  );
}
