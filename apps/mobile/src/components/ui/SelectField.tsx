import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export interface SelectOption {
  value: string;
  label: string;
}

/** Accessible, searchable mobile select. The selected value is always an option value. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  helperText
}: {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  helperText?: string;
}) {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedLabel = options.find(option => option.value === value)?.label;
  const matching = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term
      ? options.filter(option =>
          option.label.toLocaleLowerCase().includes(term) ||
          option.value.toLocaleLowerCase().includes(term))
      : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    close();
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + ": " + (selectedLabel ?? placeholder)}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 52,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: value ? theme.colors.primary : theme.colors.borderStrong,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.md,
          gap: theme.spacing.sm,
          opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1
        })}
      >
        <View style={{ flex: 1 }}>
          <AppText tone={selectedLabel ? "default" : "muted"} numberOfLines={1}>
            {selectedLabel ?? placeholder}
          </AppText>
        </View>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
      </Pressable>
      {helperText ? <AppText variant="caption" tone="muted">{helperText}</AppText> : null}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={close}
      >
        <SafeAreaView style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: theme.colors.overlay
        }}>
          <View style={{
            maxHeight: "84%",
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            gap: theme.spacing.md
          }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: theme.spacing.sm
            }}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{label}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("seller.onboarding.selectClose")}
                onPress={close}
                style={{
                  minHeight: 48,
                  minWidth: 48,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("seller.onboarding.searchOptions")}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={t("seller.onboarding.searchOptions")}
              autoCorrect={false}
              style={{
                minHeight: 48,
                color: theme.colors.text,
                borderWidth: 1,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.md,
                paddingHorizontal: theme.spacing.md,
                textAlign: isRTL ? "right" : "left",
                backgroundColor: theme.colors.background
              }}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
            >
              {matching.length === 0 ? (
                <AppText tone="muted">{t("seller.onboarding.noMatches")}</AppText>
              ) : matching.map(option => {
                const selected = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: selected }}
                    onPress={() => selectOption(option.value)}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: theme.spacing.md,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderBottomWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: pressed || selected
                        ? theme.colors.primarySoft
                        : theme.colors.surface
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText tone={selected ? "primary" : "default"}>{option.label}</AppText>
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
