import type { TranslationKey } from "@bazaarlink/localization";
import type {
  SupportTicketRecord,
  SupportTicketStatus
} from "@bazaarlink/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  CommunicationApiError,
  platformSupportTicket,
  replyPlatformSupportTicket,
  updatePlatformSupportStatus
} from "@/communication/api";
import { communicationErrorKey, supportStatusKey } from "@/communication/messages";
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

const statuses: SupportTicketStatus[] = [
  "open",
  "waiting_support",
  "waiting_customer",
  "closed"
];

export default function PlatformSupportTicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { sessionToken } = useAuth();
  const { t } = useLocalization();
  const [ticket, setTicket] = useState<SupportTicketRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    if (!sessionToken || !ticketId) {
      setTicket(null);
      setLoading(false);
      return;
    }
    setTicket(null);
    setLoading(true);
    setLoadError(null);
    try {
      setTicket(await platformSupportTicket(sessionToken, ticketId));
    } catch (cause) {
      setLoadError(communicationErrorKey(
        cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
      ));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, ticketId, reload]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !ticket) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          loadingVariant="orders"
          title={t("support.platformTitle")}
          message={t("support.tickets")}
        />
      </Screen>
    );
  }

  if (!ticket) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("support.platformTitle")}
          message={t(loadError ?? "support.error.notFound")}
          actionLabel={t(loadError ? "notification.retry" : "marketplace.back")}
          onAction={() => loadError ? setReload(value => value + 1) : router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>
      <AppText variant="display">{ticket.subject}</AppText>
      <Badge label={t(supportStatusKey(ticket.status))} tone="primary" />
      {error ? <Card><AppText tone="danger" accessibilityRole="alert">{t(error)}</AppText></Card> : null}

      {ticket.messages.map((entry) => (
        <Card key={entry.id} muted={entry.authorKind === "user"}>
          <AppText>{entry.body}</AppText>
        </Card>
      ))}

      {ticket.status !== "closed" ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <TextField
              label={t("support.message")}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <Button
              loading={busy}
              disabled={busy || !message.trim()}
              onPress={() => {
                if (!sessionToken || !ticketId) return;
                setBusy(true);
                setError(null);
                void replyPlatformSupportTicket(
                  sessionToken,
                  ticketId,
                  message.trim()
                )
                  .then((result) => {
                    setTicket(result);
                    setMessage("");
                  })
                  .catch(cause => setError(communicationErrorKey(
                    cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
                  )))
                  .finally(() => setBusy(false));
              }}
            >
              {t("support.sendReply")}
            </Button>
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          {statuses.map((status) => (
            <Button
              key={status}
              variant={ticket.status === status ? "primary" : "secondary"}
              disabled={busy}
              onPress={() => {
                if (!sessionToken || !ticketId) return;
                setBusy(true);
                setError(null);
                void updatePlatformSupportStatus(
                  sessionToken,
                  ticketId,
                  status
                )
                  .then(setTicket)
                  .catch(cause => setError(communicationErrorKey(
                    cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
                  )))
                  .finally(() => setBusy(false));
              }}
            >
              {t(supportStatusKey(status))}
            </Button>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
