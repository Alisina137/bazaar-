import type { MarketplaceCategoryRecord } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { MAX_FAVORITE_CATEGORIES } from "@/marketplace/preferences";

export function HomeInterestPicker({
  categories,
  favorites,
  recentCount,
  onSave,
  onClearHistory
}: {
  categories: MarketplaceCategoryRecord[];
  favorites: string[];
  recentCount: number;
  onSave: (ids: string[]) => void;
  onClearHistory: () => void;
}) {
  const theme = useAppTheme();
  const { isRTL, locale, t, formatNumber } = useLocalization();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [atLimit, setAtLimit] = useState(false);

  const start = () => {
    setDraft(favorites.filter((id) => categories.some((item) => item.id === id)));
    setAtLimit(false);
    setOpen(true);
  };
  const toggle = (id: string) => {
    setAtLimit(false);
    if (draft.includes(id)) {
      setDraft((current) => current.filter((item) => item !== id));
    } else if (draft.length >= MAX_FAVORITE_CATEGORIES) {
      setAtLimit(true);
    } else {
      setDraft((current) => [...current, id]);
    }
  };
  const clearHistory = () => Alert.alert(
    t("home.clearHistory"),
    t("home.clearHistoryConfirm"),
    [
      { text: t("home.cancel"), style: "cancel" },
      {
        text: t("home.clearHistory"),
        style: "destructive",
        onPress: onClearHistory
      }
    ]
  );
  const categoryName = (category: MarketplaceCategoryRecord) =>
    locale === "en" ? category.nameEn :
      locale === "ps-AF" ? category.namePs : category.nameFa;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.preferences")}
        onPress={start}
        style={({ pressed }) => ({
          minHeight: 44, flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.xs,
          borderRadius: theme.radii.full, borderWidth: 1,
          borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.md,
          opacity: pressed ? theme.opacity.pressed : 1
        })}
      >
        <Ionicons name="options-outline" size={18} color={theme.colors.primary} />
        <AppText variant="label">{t("home.preferences")}</AppText>
        {favorites.length ? (
          <AppText variant="caption" tone="primary">
            {formatNumber(favorites.length)}
          </AppText>
        ) : null}
      </Pressable>
      <Modal visible={open} animationType="slide" transparent
        onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{
          flex: 1, justifyContent: "flex-end",
          backgroundColor: theme.colors.overlay
        }}>
          <View style={{
            maxHeight: "85%", padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            gap: theme.spacing.md
          }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center"
            }}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{t("home.preferences")}</AppText>
              </View>
              <Pressable accessibilityRole="button"
                accessibilityLabel={t("home.cancel")}
                onPress={() => setOpen(false)}
                style={{ height: 48, width: 48, justifyContent: "center", alignItems: "center" }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            <AppText variant="caption" tone="muted">
              {t("home.preferencesLocal")}
            </AppText>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", justifyContent: "space-between"
            }}>
              <AppText variant="label">{t("home.interestedCategories")}</AppText>
              <AppText variant="caption" tone="muted">
                {formatNumber(draft.length) + "/" + formatNumber(MAX_FAVORITE_CATEGORIES)}
              </AppText>
            </View>
            {atLimit ? <AppText variant="caption" tone="danger">
              {t("home.interestLimit")}
            </AppText> : null}
            <ScrollView showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
              {categories.map((category) => {
                const checked = draft.includes(category.id);
                return (
                  <Pressable key={category.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={categoryName(category)}
                    onPress={() => toggle(category.id)}
                    style={({ pressed }) => ({
                      flexDirection: isRTL ? "row-reverse" : "row",
                      gap: theme.spacing.sm, alignItems: "center",
                      minHeight: 50, paddingHorizontal: theme.spacing.md,
                      borderBottomWidth: 1, borderBottomColor: theme.colors.border,
                      backgroundColor: checked || pressed ?
                        theme.colors.primarySoft : theme.colors.surface
                    })}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="label" numberOfLines={2}>
                        {categoryName(category)}
                      </AppText>
                    </View>
                    <Ionicons name={checked ? "checkbox" : "square-outline"}
                      color={checked ? theme.colors.primary : theme.colors.textMuted}
                      size={22} />
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ gap: theme.spacing.sm }}>
              <Button fullWidth onPress={() => {
                onSave(draft);
                setOpen(false);
              }}>
                {t("home.saveInterests")}
              </Button>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" fullWidth onPress={() => {
                    setDraft([]);
                    setAtLimit(false);
                  }}>{t("home.resetInterests")}</Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" fullWidth
                    disabled={recentCount === 0}
                    onPress={clearHistory}>
                    {t("home.clearHistory")}
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
