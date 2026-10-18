import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  AFGHAN_PROVINCES,
  provinceName,
  type ProvinceName
} from "@/marketplace/provinces";

export function HomeProvinceSelector({
  value, onChange
}: {
  value: ProvinceName | null;
  onChange: (value: ProvinceName | null) => void;
}) {
  const theme = useAppTheme();
  const { locale, isRTL, t } = useLocalization();
  const [open, setOpen] = useState(false);
  const choose = (province: ProvinceName | null) => {
    onChange(province);
    setOpen(false);
  };
  const location = value ? provinceName(value, locale) : t("home.allAfghanistan");

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.selectProvince") + ": " + location}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.xs, minHeight: 44,
          alignSelf: "flex-start",
          borderRadius: theme.radii.full,
          borderWidth: 1, borderColor: value ? theme.colors.primary : theme.colors.border,
          backgroundColor: value ? theme.colors.primarySoft : theme.colors.surface,
          paddingHorizontal: theme.spacing.md,
          opacity: pressed ? theme.opacity.pressed : 1
        })}
      >
        <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
        <AppText variant="label" numberOfLines={1}>{location}</AppText>
        <Ionicons name="chevron-down" size={15} color={theme.colors.textMuted} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{
          flex: 1, justifyContent: "flex-end",
          backgroundColor: theme.colors.overlay
        }}>
          <View style={{
            maxHeight: "82%",
            padding: theme.spacing.lg,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            backgroundColor: theme.colors.surface,
            gap: theme.spacing.md
          }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: theme.spacing.md
            }}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{t("home.selectProvince")}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("marketplace.back")}
                onPress={() => setOpen(false)}
                style={{ minHeight: 48, minWidth: 48, justifyContent: "center", alignItems: "center" }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {([null, ...AFGHAN_PROVINCES.map((item) => item[0])] as Array<ProvinceName | null>).map((item) => {
                const label = item ? provinceName(item, locale) : t("home.allAfghanistan");
                const selected = item === value;
                return (
                  <Pressable
                    key={item ?? "all"}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected }}
                    onPress={() => choose(item)}
                    style={({ pressed }) => ({
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      minHeight: 48,
                      paddingHorizontal: theme.spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                      backgroundColor: pressed || selected ? theme.colors.primarySoft : theme.colors.surface
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText variant="label">{label}</AppText>
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
