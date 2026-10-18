import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  SupportTicketCategory,
  SupportTicketRecord,
  SupportTicketStatus
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

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
  AppText, Badge, Button, Card, Screen, StateView, TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

const categories: SupportTicketCategory[] = [
  "order", "payment", "delivery", "product", "account", "merchant", "other"
];
type TicketFilter = "all" | "active" | "waiting_customer" | "closed";
const filters: TicketFilter[] = ["all", "active", "waiting_customer", "closed"];
const filterKeys: Record<TicketFilter, TranslationKey> = {
  all: "support.hub.all",
  active: "support.hub.active",
  waiting_customer: "support.hub.needsReply",
  closed: "support.hub.closed"
};

export default function SupportScreen() {
  const { orderId, storeId } = useLocalSearchParams<{
    orderId?: string; storeId?: string;
  }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { sessionToken, status } = useAuth();
  const { isRTL, t, locale, formatNumber } = useLocalization();
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [category, setCategory] = useState<SupportTicketCategory>(
    orderId ? "order" : storeId ? "merchant" : "other"
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(Boolean(orderId || storeId));
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [listError, setListError] = useState<TranslationKey | null>(null);
  const [reload, setReload] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    // Never display previous-account tickets while fetching for a new session.
    setTickets([]);
    if (status !== "signedIn" || !sessionToken) {
      setTickets([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setListError(null);
    void supportTickets(sessionToken)
      .then(result => {
        if (active) setTickets(result.tickets);
      })
      .catch(cause => {
        if (active) {
          setListError(communicationErrorKey(
            cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
          ));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionToken, status, reload]));

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return [...tickets]
      .filter(ticket => (
        filter === "all" ||
        (filter === "active" && ticket.status !== "closed") ||
        (filter === "waiting_customer" && ticket.status === "waiting_customer") ||
        (filter === "closed" && ticket.status === "closed")
      ))
      .filter(ticket => !term ||
        ticket.subject.toLocaleLowerCase().includes(term) ||
        t(supportCategoryKey(ticket.category)).toLocaleLowerCase().includes(term))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [tickets, filter, search, t]);

  const submit = async () => {
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (busy || !sessionToken || status !== "signedIn" ||
        cleanSubject.length < 3 || cleanSubject.length > 240 ||
        cleanMessage.length < 2 || cleanMessage.length > 6000) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createSupportTicket(sessionToken, {
        category,
        subject: cleanSubject,
        message: cleanMessage,
        ...(orderId ? { orderId } : {}),
        ...(storeId ? { storeId } : {})
      });
      setSubject("");
      setMessage("");
      setShowForm(false);
      router.push({
        pathname: "/support/[ticketId]",
        params: { ticketId: created.id }
      });
    } catch (cause) {
      setError(communicationErrorKey(
        cause instanceof CommunicationApiError ? cause.code : "service_unavailable"
      ));
    } finally {
      setBusy(false);
    }
  };

  const statusTone = (value: SupportTicketStatus) =>
    value === "closed" ? "neutral" as const :
      value === "waiting_customer" ? "warning" as const : "primary" as const;

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="heading">{t("support.hub.title")}</AppText>
        <AppText tone="muted">{t("support.hub.description")}</AppText>
      </View>
      <Card style={{
        backgroundColor: theme.colors.primarySoft,
        borderColor: theme.colors.borderStrong
      }}>
        <View style={{ gap: theme.spacing.md }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: theme.spacing.sm
          }}>
            <Ionicons name="help-circle-outline" size={26} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t("support.faq.title")}</AppText>
              <AppText variant="caption" tone="muted">
                {t("support.hub.faqHint")}
              </AppText>
            </View>
          </View>
          <Button fullWidth variant="secondary" onPress={() => router.push("/support/faq")}>
            {t("support.hub.browseFaq")}
          </Button>
        </View>
      </Card>

      {status !== "signedIn" ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="bodyStrong">{t("support.hub.signInTitle")}</AppText>
            <AppText tone="muted">{t("support.hub.signInHint")}</AppText>
            <Button onPress={() => router.push("/(tabs)/account")}>
              {t("auth.signInAction")}
            </Button>
          </View>
        </Card>
      ) : (
        <>
          <Button fullWidth onPress={() => {
            setShowForm(current => !current);
            setError(null);
          }}>
            {t(showForm ? "support.hub.hideForm" : "support.newTicket")}
          </Button>

          {showForm ? (
            <Card>
              <View style={{ gap: theme.spacing.md }}>
                <AppText variant="title">{t("support.newTicket")}</AppText>
                {orderId || storeId ? (
                  <AppText variant="caption" tone="primary">
                    {t(orderId ? "support.hub.orderContext" : "support.hub.storeContext")}
                  </AppText>
                ) : null}
                <AppText variant="label">{t("support.category")}</AppText>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  flexWrap: "wrap", gap: theme.spacing.xs
                }}>
                  {categories.map(value => (
                    <Pressable key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={t(supportCategoryKey(value))}
                      accessibilityState={{ selected: value === category }}
                      onPress={() => setCategory(value)}
                      style={({ pressed }) => ({
                        minHeight: 44,
                        justifyContent: "center", alignItems: "center",
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.radii.md,
                        borderWidth: category === value ? 2 : 1,
                        borderColor: category === value
                          ? theme.colors.primary : theme.colors.borderStrong,
                        backgroundColor: category === value
                          ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                        opacity: pressed ? theme.opacity.pressed : 1
                      })}
                    >
                      <AppText variant="caption" tone={category === value ? "primary" : "default"}>
                        {t(supportCategoryKey(value))}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <TextField label={t("support.subject")}
                  value={subject} onChangeText={setSubject}
                  maxLength={240} returnKeyType="next"
                  helperText={t("support.hub.subjectHint")}
                  error={subject.length > 0 && subject.trim().length < 3
                    ? t("support.hub.subjectInvalid") : undefined}
                />
                <TextField label={t("support.message")}
                  value={message} onChangeText={setMessage}
                  maxLength={6000} multiline
                  helperText={t("support.hub.messageHint")}
                  error={message.length > 0 && message.trim().length < 2
                    ? t("support.hub.messageInvalid") : undefined}
                />
                {error ? <AppText accessibilityRole="alert" tone="danger">
                  {t(error)}
                </AppText> : null}
                <Button fullWidth loading={busy}
                  disabled={busy || subject.trim().length < 3 ||
                    message.trim().length < 2}
                  onPress={() => void submit()}>
                  {t("support.create")}
                </Button>
              </View>
            </Card>
          ) : null}

          <View style={{ gap: theme.spacing.sm }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", alignItems: "center",
              gap: theme.spacing.sm
            }}>
              <AppText variant="title">{t("support.tickets")}</AppText>
              <AppText variant="caption" tone="muted">
                {formatNumber(tickets.length)} {t("support.hub.total")}
              </AppText>
            </View>
            <TextField label={t("support.hub.search")}
              value={search} onChangeText={setSearch} returnKeyType="search" />
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              flexWrap: "wrap", gap: theme.spacing.xs
            }}>
              {filters.map(value => (
                <Pressable key={value}
                  accessibilityRole="button"
                  accessibilityLabel={t(filterKeys[value])}
                  accessibilityState={{ selected: filter === value }}
                  onPress={() => setFilter(value)}
                  style={{
                    minHeight: 44, borderRadius: theme.radii.full,
                    borderWidth: 1,
                    borderColor: filter === value ? theme.colors.primary : theme.colors.borderStrong,
                    backgroundColor: filter === value ? theme.colors.primarySoft : theme.colors.surface,
                    justifyContent: "center",
                    paddingHorizontal: theme.spacing.md
                  }}
                >
                  <AppText variant="caption" tone={filter === value ? "primary" : "default"}>
                    {t(filterKeys[value])}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          {loading && tickets.length === 0 ? (
            <StateView kind="loading" title={t("support.tickets")}
              message={t("support.hub.loading")} />
          ) : null}
          {listError ? (
            <Card>
              <View style={{ gap: theme.spacing.sm }}>
                <AppText tone="danger" accessibilityRole="alert">{t(listError)}</AppText>
                <Button variant="secondary" onPress={() => setReload(value => value + 1)}>
                  {t("support.hub.retry")}
                </Button>
              </View>
            </Card>
          ) : null}
          {!loading && !listError && filteredTickets.length === 0 ? (
            <Card>
              <View style={{ gap: theme.spacing.sm }}>
                <AppText tone="muted">
                  {tickets.length === 0 ? t("support.empty") : t("support.hub.noMatches")}
                </AppText>
                {tickets.length > 0 ? (
                  <Button variant="secondary" onPress={() => {
                    setFilter("all"); setSearch("");
                  }}>
                    {t("support.hub.clearFilter")}
                  </Button>
                ) : null}
              </View>
            </Card>
          ) : null}
          {!listError && filteredTickets.map(ticket => (
            <Pressable key={ticket.id}
              accessibilityRole="button"
              accessibilityLabel={ticket.subject}
              onPress={() => router.push({
                pathname: "/support/[ticketId]", params: { ticketId: ticket.id }
              })}
              style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : 1 })}
            >
              <Card>
                <View style={{ gap: theme.spacing.sm }}>
                  <View style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center", gap: theme.spacing.sm
                  }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" numberOfLines={2}>
                        {ticket.subject}
                      </AppText>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"}
                      color={theme.colors.textMuted} size={18} />
                  </View>
                  <View style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    flexWrap: "wrap", gap: theme.spacing.xs
                  }}>
                    <Badge label={t(supportStatusKey(ticket.status))}
                      tone={statusTone(ticket.status)} />
                    <Badge label={t(supportCategoryKey(ticket.category))} />
                  </View>
                  <AppText variant="caption" tone="muted">
                    {t("support.hub.updated")} {new Date(ticket.updatedAt).toLocaleDateString(locale)}
                  </AppText>
                  {ticket.status === "waiting_customer" ? (
                    <AppText variant="caption" tone="primary">
                      {t("support.hub.replyRequested")}
                    </AppText>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))}
          <Button variant="ghost" onPress={() => setReload(value => value + 1)}
            disabled={loading}>
            {t("support.hub.refresh")}
          </Button>
          <AppText variant="caption" tone="muted">
            {t("support.hub.noLiveChat")}
          </AppText>
        </>
      )}
    </Screen>
  );
}
