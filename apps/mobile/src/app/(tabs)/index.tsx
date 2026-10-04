import { useRouter } from "expo-router";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const { status, user } = useAuth();

  const isMerchantOwner =
    status === "signedIn" && Boolean(user?.roles.includes("merchant_owner"));

  const openSellerExperience = () => {
    if (status !== "signedIn" || !user) {
      router.push("/(tabs)/account");
      return;
    }

    router.push(
      isMerchantOwner
        ? "/seller/(tabs)"
        : "/seller/onboarding"
    );
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("common.brandName")} tone="primary" />
        <AppText variant="display">{t("home.title")}</AppText>
        <AppText variant="bodyLarge" tone="muted">
          {t("home.description")}
        </AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">{t("home.statusTitle")}</AppText>
          <AppText tone="muted">{t("home.statusMessage")}</AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">
            {isMerchantOwner
              ? t("account.openSellerDashboard")
              : t("account.sellOnBazaarLink")}
          </AppText>
          <AppText tone="muted">
            {t("seller.onboarding.description")}
          </AppText>
          <Button
            fullWidth
            disabled={status === "loading"}
            onPress={openSellerExperience}
          >
            {isMerchantOwner
              ? t("account.openSellerDashboard")
              : t("account.sellOnBazaarLink")}
          </Button>
        </View>
      </Card>

      <Card>
        <LanguageSwitcher />
      </Card>

      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          flexWrap: "wrap",
          gap: theme.spacing.sm
        }}
      >
        <Badge label={t("home.mobileFirst")} tone="success" />
        <Badge label={t("home.accessibleTargets")} tone="success" />
        <Badge label={t("home.rtlReady")} tone="warning" />
      </View>
    </Screen>
  );
}
