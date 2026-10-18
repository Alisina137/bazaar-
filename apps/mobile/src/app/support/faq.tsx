import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText, Button, Card, Screen, TextField } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type FaqGroup = "orders" | "shopping" | "account" | "selling";
type FaqEntry = { id: string; group: FaqGroup; question: TranslationKey; answer: TranslationKey };

const entries: FaqEntry[] = [
  { id: "tracking", group: "orders", question: "support.faq.tracking.q", answer: "support.faq.tracking.a" },
  { id: "payment", group: "orders", question: "support.faq.payment.q", answer: "support.faq.payment.a" },
  { id: "delivery", group: "orders", question: "support.faq.delivery.q", answer: "support.faq.delivery.a" },
  { id: "returns", group: "orders", question: "support.faq.returns.q", answer: "support.faq.returns.a" },
  { id: "wishlist", group: "shopping", question: "support.faq.wishlist.q", answer: "support.faq.wishlist.a" },
  { id: "province", group: "shopping", question: "support.faq.province.q", answer: "support.faq.province.a" },
  { id: "password", group: "account", question: "support.faq.password.q", answer: "support.faq.password.a" },
  { id: "notifications", group: "account", question: "support.faq.notifications.q", answer: "support.faq.notifications.a" },
  { id: "seller", group: "selling", question: "support.faq.seller.q", answer: "support.faq.seller.a" }
];
const groups: FaqGroup[] = ["orders", "shopping", "account", "selling"];

export default function SupportFaqScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<FaqGroup | "all">("all");
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const filtered = useMemo(() =>
    entries.filter(item => groupFilter === "all" || item.group === groupFilter)
      .filter(item => !normalizedQuery ||
      (t(item.question) + " " + t(item.answer) + " " +
        t(("support.faq.group." + item.group) as TranslationKey))
        .toLocaleLowerCase().includes(normalizedQuery)),
    [groupFilter, normalizedQuery, t]
  );

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="heading">{t("support.faq.title")}</AppText>
        <AppText tone="muted">{t("support.faq.description")}</AppText>
      </View>
      <TextField
        label={t("support.faq.search")}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        gap: theme.spacing.sm,
        flexWrap: "wrap"
      }}>
        {(["all", ...groups] as Array<FaqGroup | "all">).map(group => (
          <Pressable key={group}
            accessibilityRole="button"
            accessibilityLabel={t(group === "all" ? "support.hub.all" :
              (("support.faq.group." + group) as TranslationKey))}
            accessibilityState={{ selected: groupFilter === group }}
            onPress={() => { setGroupFilter(group); setExpanded(null); }}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radii.full,
              borderWidth: groupFilter === group ? 2 : 1,
              borderColor: groupFilter === group ? theme.colors.primary : theme.colors.border,
              backgroundColor: groupFilter === group ? theme.colors.primarySoft : theme.colors.surface,
              alignItems: "center", justifyContent: "center",
              opacity: pressed ? theme.opacity.pressed : 1
            })}
          >
            <AppText variant="caption"
              tone={groupFilter === group ? "primary" : "default"}>
              {t(group === "all" ? "support.hub.all" :
                (("support.faq.group." + group) as TranslationKey))}
            </AppText>
          </Pressable>
        ))}
      </View>
      {filtered.length === 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText tone="muted">{t("support.faq.noResults")}</AppText>
            <Button variant="secondary" onPress={() => { setQuery(""); setGroupFilter("all"); }}>
              {t("support.hub.clearFilter")}
            </Button>
          </View>
        </Card>
      ) : null}
      {groups.map(group => {
        const items = filtered.filter(entry => entry.group === group);
        if (items.length === 0) return null;
        return (
          <View key={group} style={{ gap: theme.spacing.sm }}>
            <AppText variant="bodyStrong">
              {t(("support.faq.group." + group) as TranslationKey)}
            </AppText>
            <Card style={{ padding: theme.spacing.sm }}>
              {items.map((item, i) => {
                const open = item.id === expanded;
                return (
                  <View key={item.id} style={{
                    borderBottomWidth: i === items.length - 1 ? 0 : 1,
                    borderBottomColor: theme.colors.border
                  }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      accessibilityLabel={t(item.question)}
                      onPress={() => setExpanded(open ? null : item.id)}
                      style={({ pressed }) => ({
                        flexDirection: isRTL ? "row-reverse" : "row",
                        minHeight: 56,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.md,
                        alignItems: "center",
                        gap: theme.spacing.sm,
                        opacity: pressed ? theme.opacity.pressed : 1
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText variant="label">{t(item.question)}</AppText>
                      </View>
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        color={theme.colors.primary}
                        size={20}
                      />
                    </Pressable>
                    {open ? (
                      <View style={{
                        paddingHorizontal: theme.spacing.md,
                        paddingBottom: theme.spacing.lg
                      }}>
                        <AppText tone="muted">{t(item.answer)}</AppText>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          </View>
        );
      })}
      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="bodyStrong">{t("support.hub.stillNeedHelp")}</AppText>
          <AppText variant="caption" tone="muted">
            {t("support.hub.noLiveChat")}
          </AppText>
          <Button onPress={() => router.push("/support")}>
            {t("support.hub.contact")}
          </Button>
        </View>
      </Card>
    </Screen>
  );
}
