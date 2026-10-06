import type {
  SupportTicketCategory,
  SupportTicketRecord
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  CommunicationApiError,
  createSupportTicket,
  supportTickets
} from "@/communication/api";
import {
  communicationErrorKey,
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

const categories: SupportTicketCategory[] = [
  "order",
  "payment",
  "delivery",
  "product",
  "account",
  "merchant",
  "other"
];

export default function SupportScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { sessionToken } = useAuth();
  const { t } = useLocalization();
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [category, setCategory] = useState<SupportTicketCategory>("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const load = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTickets((await supportTickets(sessionToken)).tickets);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!sessionToken || !subject.trim() || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createSupportTicket(sessionToken, {
        category,
        subject: subject.trim(),
        message: message.trim()
      });
      setSubject("");
      setMessage("");
      await load();
    } catch (requestError) {
      const safe =
        requestError instanceof CommunicationApiError
          ? requestError
          : new CommunicationApiError("service_unavailable");
      setError(communicationErrorKey(safe.code));
    } finally {
      setBusy(false);
    }
  };

  if (loading && tickets.length === 0) {
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

  return (
    <Screen>
      <AppText variant="display">{t("support.title")}</AppText>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("support.newTicket")}</AppText>
          <AppText variant="label">{t("support.category")}</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {categories.map((value) => (
              <Button
                key={value}
                variant={category === value ? "primary" : "secondary"}
                onPress={() => setCategory(value)}
              >
                {t(supportCategoryKey(value))}
              </Button>
            ))}
          </View>
          <TextField
            label={t("support.subject")}
            value={subject}
            onChangeText={setSubject}
          />
          <TextField
            label={t("support.message")}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          {error ? <AppText tone="danger">{t(error)}</AppText> : null}
          <Button
            fullWidth
            loading={busy}
            disabled={busy || !subject.trim() || !message.trim()}
            onPress={() => void create()}
          >
            {t("support.create")}
          </Button>
        </View>
      </Card>

      <AppText variant="title">{t("support.tickets")}</AppText>
      {tickets.length === 0 ? (
        <StateView
          kind="empty"
          title={t("support.tickets")}
          message={t("support.empty")}
        />
      ) : (
        tickets.map((ticket) => (
          <Card key={ticket.id}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="bodyStrong">{ticket.subject}</AppText>
              <Badge label={t(supportStatusKey(ticket.status))} tone="neutral" />
              <Button
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/support/[ticketId]",
                    params: { ticketId: ticket.id }
                  })
                }
              >
                {t("support.reply")}
              </Button>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
