import type { SellerTrustRecord } from "@bazaarlink/contracts";
import { useEffect, useState } from "react";
import { View } from "react-native";

import {
  AppText,
  Badge,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { sellerTrust } from "@/trust/api";
import { useStores } from "@/store/provider";

export default function SellerTrustScreen() {
  const theme = useAppTheme();
  const { currentStore } = useStores();
  const { t } = useLocalization();
  const [trust, setTrust] = useState<SellerTrustRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) {
      setLoading(false);
      return;
    }
    let active = true;
    void sellerTrust(currentStore.id)
      .then((result) => {
        if (active) setTrust(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentStore]);

  if (loading) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("seller.trust.title")}
          message={t("seller.trust.basic")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="display">{t("seller.trust.title")}</AppText>
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="title">{t("seller.trust.basic")}</AppText>
          <Badge
            label={t(
              trust?.phoneVerified
                ? "trust.phoneVerified"
                : "trust.phoneNotVerified"
            )}
            tone={trust?.phoneVerified ? "success" : "neutral"}
          />
          <AppText tone="muted">{t("trust.planNotVerification")}</AppText>
        </View>
      </Card>
      <Card muted>
        <AppText tone="muted">{t("seller.trust.future")}</AppText>
      </Card>
    </Screen>
  );
}
