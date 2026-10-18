import type { MarketplaceCategoryRecord } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, TextField } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { AFGHAN_PROVINCES, isProvinceName, provinceName } from "@/marketplace/provinces";

export interface MarketplaceFilterDraft {
  categoryId?: string | undefined;
  province: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  dealsOnly: boolean;
  minRating?: number | undefined;
  verifiedStoreOnly: boolean;
}

function Choice({
  label, checked, onPress, accessibilityRole = "radio"
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  accessibilityRole?: "radio" | "checkbox";
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48, minWidth: 84,
        borderRadius: theme.radii.md, borderWidth: checked ? 2 : 1,
        borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
        backgroundColor: checked ? theme.colors.primarySoft : theme.colors.surface,
        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
        alignItems: "center", justifyContent: "center",
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      <AppText variant="caption" align="center" tone={checked ? "primary" : "default"}>{label}</AppText>
    </Pressable>
  );
}

/** Draft-only controls: closing without Apply never changes the server query. */
export function MarketplaceFilterSheet({
  visible, draft, categories, priceError, onChange, onReset, onCancel, onApply
}: {
  visible: boolean;
  draft: MarketplaceFilterDraft;
  categories: MarketplaceCategoryRecord[];
  priceError: "invalid" | "range" | null;
  onChange: (patch: Partial<MarketplaceFilterDraft>) => void;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const theme = useAppTheme();
  const { isRTL, locale, t, formatNumber } = useLocalization();
  const insets = useSafeAreaInsets();
  const [provinceExpanded, setProvinceExpanded] = useState(false);
  const visibleCategories = useMemo(() => categories.filter(category =>
    category.parentId === null ||
    category.id === draft.categoryId ||
    category.parentId === draft.categoryId
  ), [categories, draft.categoryId]);
  const selectedProvince = isProvinceName(draft.province)
    ? provinceName(draft.province, locale)
    : t("marketplace.phase3.allProvinces");
  const categoryName = (item: MarketplaceCategoryRecord) =>
    locale === "en" ? item.nameEn : locale === "ps-AF" ? item.namePs : item.nameFa;

  return (
    <Modal
      visible={visible} animationType="slide" transparent
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={{
        flex: 1, justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.48)"
      }}>
        <View style={{
          maxHeight: "92%", backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl,
          paddingTop: theme.spacing.lg,
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg)
        }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md
          }}>
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <AppText variant="heading">{t("marketplace.phase3.filterTitle")}</AppText>
              <AppText variant="caption" tone="muted">{t("marketplace.phase3.filterHint")}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("marketplace.phase3.cancel")}
              onPress={onCancel}
              style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={25} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl,
              gap: theme.spacing.xl
            }}
          >
            {visibleCategories.length > 0 ? (
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="bodyStrong">{t("marketplace.phase3.category")}</AppText>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  flexWrap: "wrap", gap: theme.spacing.sm
                }}>
                  <Choice
                    label={t("marketplace.phase3.allCategories")}
                    checked={!draft.categoryId}
                    onPress={() => onChange({ categoryId: undefined })}
                  />
                  {visibleCategories.map(item => (
                    <Choice
                      key={item.id} label={categoryName(item)}
                      checked={draft.categoryId === item.id}
                      onPress={() => onChange({ categoryId: item.id })}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="bodyStrong">{t("marketplace.filter.province")}</AppText>
              <Button variant="secondary"
                onPress={() => setProvinceExpanded(v => !v)}
                accessibilityState={{ expanded: provinceExpanded }}
              >
                {selectedProvince + " " + (provinceExpanded ? "▲" : "▼")}
              </Button>
              {provinceExpanded ? (
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  flexWrap: "wrap", gap: theme.spacing.sm
                }}>
                  <Choice label={t("marketplace.phase3.allProvinces")}
                    checked={!draft.province}
                    onPress={() => { onChange({ province: "" }); setProvinceExpanded(false); }} />
                  {AFGHAN_PROVINCES.map(([name]) => (
                    <Choice key={name} label={provinceName(name, locale)}
                      checked={draft.province === name}
                      onPress={() => { onChange({ province: name }); setProvinceExpanded(false); }} />
                  ))}
                </View>
              ) : null}
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="bodyStrong">{t("marketplace.phase3.priceRange")}</AppText>
              <View style={{
                flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.md
              }}>
                <View style={{ flex: 1 }}>
                  <TextField label={t("marketplace.filter.minPrice")}
                    value={draft.minPrice} onChangeText={value => onChange({ minPrice: value })}
                    keyboardType="decimal-pad" forceLTR
                    error={priceError ? t("marketplace.phase3." +
                      (priceError === "range" ? "priceRangeError" : "priceError")) : undefined}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label={t("marketplace.filter.maxPrice")}
                    value={draft.maxPrice} onChangeText={value => onChange({ maxPrice: value })}
                    keyboardType="decimal-pad" forceLTR
                  />
                </View>
              </View>
              <AppText variant="caption" tone="muted">{t("marketplace.phase3.priceHint")}</AppText>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="bodyStrong">{t("marketplace.phase3.availability")}</AppText>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                <Choice accessibilityRole="checkbox" label={t("marketplace.filter.inStock")}
                  checked={draft.inStockOnly}
                  onPress={() => onChange({ inStockOnly: !draft.inStockOnly })} />
                <Choice accessibilityRole="checkbox" label={t("marketplace.filter.deals")}
                  checked={draft.dealsOnly}
                  onPress={() => onChange({ dealsOnly: !draft.dealsOnly })} />
                <Choice accessibilityRole="checkbox" label={t("marketplace.filter.verifiedStore")}
                  checked={draft.verifiedStoreOnly}
                  onPress={() => onChange({ verifiedStoreOnly: !draft.verifiedStoreOnly })} />
              </View>
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="bodyStrong">{t("marketplace.filter.rating")}</AppText>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {[undefined, 3, 4, 5].map(value => (
                  <Choice key={value ?? "all"}
                    label={value === undefined ? t("marketplace.phase3.anyRating") : "★ " + formatNumber(value) + "+"}
                    checked={draft.minRating === value}
                    onPress={() => onChange({ minRating: value })} />
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={{
            paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm,
            borderTopWidth: 1, borderTopColor: theme.colors.border,
            flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm
          }}>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" fullWidth onPress={onReset}>
                {t("marketplace.clearFilters")}
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button fullWidth onPress={onApply}>
                {t("marketplace.applyFilters")}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
