import type {
  SupportTicketRecord,
  SupportTicketStatus
} from "@bazaarlink/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  platformSupportTicket,
  replyPlatformSupportTicket,
  updatePlatformSupportStatus
} from "@/communication/api";
import { supportStatusKey } from "@/communication/messages";
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

  const load = useCallback(async () => {
    if (!sessionToken || !ticketId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTicket(await platformSupportTicket(sessionToken, ticketId));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !ticket) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
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
          message={t("support.error.notFound")}
          actionLabel={t("marketplace.back")}
          onAction={() => router.back()}
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
                void replyPlatformSupportTicket(
                  sessionToken,
                  ticketId,
                  message.trim()
                )
                  .then((result) => {
                    setTicket(result);
                    setMessage("");
                  })
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
                void updatePlatformSupportStatus(
                  sessionToken,
                  ticketId,
                  status
                )
                  .then(setTicket)
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
