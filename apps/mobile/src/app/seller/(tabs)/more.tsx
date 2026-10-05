import { useRouter } from "expo-router";
import { View } from "react-native";

import {
  AppText,
  Button,
  Card,
  Screen
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function SellerMoreScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocalization();

  const futureItems = [
    "seller.more.customers",
    "seller.more.delivery",
    "seller.more.payments",
    "seller.more.discounts",
    "seller.more.analytics",
    "seller.more.staff"
  ] as const;

  return (
    <Screen>
      <AppText variant="title">{t("seller.more.title")}</AppText>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Button
            variant="secondary"
            onPress={() => {
              router.push("/seller/inventory");
            }}
          >
            {t("seller.more.inventory")}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              router.push("/seller/settings");
            }}
          >
            {t("seller.more.settings")}
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              router.push("/seller/subscription");
            }}
          >
            {t("seller.more.subscription")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          {futureItems.map((key) => (
            <View key={key} style={{ gap: theme.spacing.xs }}>
              <AppText variant="bodyStrong">{t(key)}</AppText>
              <AppText variant="caption" tone="muted">
                {t("seller.more.futureFeature")}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <Button
        variant="ghost"
        onPress={() => {
          router.replace("/(tabs)");
        }}
      >
        {t("seller.backToShopping")}
      </Button>
    </Screen>
  );
}
