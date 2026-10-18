import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export function MarketplaceSearchBox({
  value, onChangeText, onSubmit, onFocusChange, autoFocus = false
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onFocusChange?: (focused: boolean) => void;
  autoFocus?: boolean;
}) {
  const theme = useAppTheme();
  const { isRTL, direction, t } = useLocalization();
  const [focused, setFocused] = useState(false);
  const submit = () => {
    Keyboard.dismiss();
    onSubmit();
  };

  return (
    <View
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        minHeight: 54,
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderWidth: 1,
        borderColor: focused ? theme.colors.primary : theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        backgroundColor: theme.colors.surface
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("marketplace.searchAction")}
        onPress={submit}
        hitSlop={4}
        style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="search-outline" size={22} color={theme.colors.primary} />
      </Pressable>
      <TextInput
        accessibilityLabel={t("marketplace.searchLabel")}
        placeholder={t("marketplace.searchPlaceholder")}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => { setFocused(true); onFocusChange?.(true); }}
        onBlur={() => { setFocused(false); onFocusChange?.(false); }}
        onSubmitEditing={submit}
        returnKeyType="search"
        maxLength={180}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        style={{
          flex: 1, minWidth: 0, minHeight: 52, color: theme.colors.text,
          fontSize: theme.fontSizes.label, lineHeight: theme.lineHeights.label,
          textAlign: isRTL ? "right" : "left", writingDirection: direction
        }}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("marketplace.clearSearch")}
          onPress={() => onChangeText("")}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="close-circle" size={21} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
