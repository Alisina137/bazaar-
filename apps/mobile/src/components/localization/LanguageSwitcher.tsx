import {
  Pressable,
  StyleSheet,
  View
} from "react-native";
import {
  localeMetadata,
  supportedLocales
} from "@bazaarlink/localization";

import { AppText } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export function LanguageSwitcher() {
  const theme = useAppTheme();
  const { locale, isRTL, setLocale, t } = useLocalization();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label">{t("language.label")}</AppText>
      <AppText variant="caption" tone="muted">
        {t("language.description")}
      </AppText>

      <View
        style={[
          styles.row,
          {
            flexDirection: isRTL ? "row-reverse" : "row",
            gap: theme.spacing.sm
          }
        ]}
      >
        {supportedLocales.map((item) => {
          const selected = item === locale;

          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                void setLocale(item);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  minHeight: theme.sizes.touchTarget,
                  borderRadius: theme.radii.full,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.borderStrong,
                  backgroundColor: selected
                    ? theme.colors.primarySoft
                    : theme.colors.surface,
                  opacity: pressed ? theme.opacity.pressed : 1,
                  paddingHorizontal: theme.spacing.lg
                }
              ]}
            >
              <AppText
                variant="label"
                tone={selected ? "primary" : "default"}
                align="center"
              >
                {localeMetadata[item].languageLabel}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexWrap: "wrap"
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth
  }
});
