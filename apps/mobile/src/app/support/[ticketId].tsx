import type { SupportTicketRecord } from "@bazaarlink/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  closeSupportTicket,
  replySupportTicket,
  supportTicket
} from "@/communication/api";
import {
  supportCategoryKey,
  supportStatusKey
} from "@/communication/messages";
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

export default function SupportTicketScreen() {
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
      setTicket(await supportTicket(sessionToken, ticketId));
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
          title={t("support.title")}
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
          title={t("support.title")}
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
      <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
        <Badge label={t(supportCategoryKey(ticket.category))} tone="primary" />
        <Badge label={t(supportStatusKey(ticket.status))} tone="neutral" />
      </View>

      {ticket.messages.map((entry) => (
        <Card key={entry.id} muted={entry.authorKind === "platform"}>
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
                void replySupportTicket(sessionToken, ticketId, message.trim())
                  .then((result) => {
                    setTicket(result);
                    setMessage("");
                  })
                  .finally(() => setBusy(false));
              }}
            >
              {t("support.sendReply")}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onPress={() => {
                if (!sessionToken || !ticketId) return;
                setBusy(true);
                void closeSupportTicket(sessionToken, ticketId)
                  .then(setTicket)
                  .finally(() => setBusy(false));
              }}
            >
              {t("support.close")}
            </Button>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
