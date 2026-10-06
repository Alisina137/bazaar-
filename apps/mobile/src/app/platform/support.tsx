import type { SupportTicketRecord } from "@bazaarlink/contracts";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import { platformSupportTickets } from "@/communication/api";
import { supportStatusKey } from "@/communication/messages";
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

export default function PlatformSupportScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { sessionToken } = useAuth();
  const { t } = useLocalization();
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTickets((await platformSupportTickets(sessionToken)).tickets);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
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

  return (
    <Screen>
      <AppText variant="display">{t("support.platformTitle")}</AppText>
      {tickets.length === 0 ? (
        <StateView
          kind="empty"
          title={t("support.platformTitle")}
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
                    pathname: "/platform/support/[ticketId]",
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
