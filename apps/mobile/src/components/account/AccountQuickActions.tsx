import Ionicons from "@expo/vector-icons/Ionicons";
import type { TranslationKey } from "@bazaarlink/localization";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type QuickAction = {
  icon: "receipt-outline" | "heart-outline" | "help-circle-outline";
  title: TranslationKey;
  onPress: () => void;
};

export function AccountQuickActions({
  onOrders, onSaved, onSupport
}: {
  onOrders: () => void;
  onSaved: () => void;
  onSupport: () => void;
}) {
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const actions: QuickAction[] = [
    { icon: "receipt-outline", title: "account.myOrders", onPress: onOrders },
    { icon: "heart-outline", title: "account.shopping.wishlist", onPress: onSaved },
    { icon: "help-circle-outline", title: "account.support", onPress: onSupport }
  ];

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="bodyStrong">{t("account.phase8.quickActions")}</AppText>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        gap: theme.spacing.sm
      }}>
        {actions.map(action => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            accessibilityLabel={t(action.title)}
            onPress={action.onPress}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: 108,
              paddingHorizontal: theme.spacing.xs,
              paddingVertical: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              backgroundColor: pressed ? theme.colors.primarySoft : theme.colors.surface,
              opacity: pressed ? theme.opacity.pressed : 1,
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm
            })}
          >
            <View style={{
              width: 40, height: 40,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.primarySoft,
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Ionicons name={action.icon} size={22} color={theme.colors.primary} />
            </View>
            <AppText variant="caption" align="center" numberOfLines={2}>
              {t(action.title)}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
