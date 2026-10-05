import { useRouter } from "expo-router";
import { View } from "react-native";

import { productStatusKey } from "@/catalog/messages";
import { useCatalog } from "@/catalog/provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { storeStatusKey, storeThemeKey } from "@/store/messages";
import { useStores } from "@/store/provider";

export default function SellerPreviewScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { formatAfn, t } = useLocalization();
  const { currentStore } = useStores();
  const { products } = useCatalog();

  if (!currentStore) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("seller.dashboard.noStore")}
          message={t("seller.dashboard.noStoreMessage")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("seller.store.preview")} tone="primary" />
        <AppText variant="display">{currentStore.name}</AppText>
        {currentStore.description ? (
          <AppText variant="bodyLarge" tone="muted">
            {currentStore.description}
          </AppText>
        ) : null}
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText>
            {t("storefront.categoryLabel")}: {currentStore.category}
          </AppText>
          <AppText>
            {t("storefront.locationLabel")}: {currentStore.cityDistrict}, {currentStore.province}
          </AppText>
          <AppText>
            {t("storefront.contactLabel")}: {currentStore.phone}
          </AppText>
          {currentStore.businessHours ? (
            <AppText>
              {t("storefront.hoursLabel")}: {currentStore.businessHours}
            </AppText>
          ) : null}
          <AppText tone="muted">
            {t(storeThemeKey(currentStore.theme))} · {t(storeStatusKey(currentStore.status))}
          </AppText>
        </View>
      </Card>

      {products.filter((product) => product.status !== "archived").length === 0 ? (
        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="heading">{t("storefront.emptyTitle")}</AppText>
            <AppText tone="muted">{t("storefront.emptyMessage")}</AppText>
          </View>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("storefront.catalogTitle")}</AppText>
          {products
            .filter((product) => product.status !== "archived")
            .map((product) => (
              <Card key={product.id}>
                <View style={{ gap: theme.spacing.sm }}>
                  <Badge
                    label={t(productStatusKey(product.status))}
                    tone={
                      product.status === "active"
                        ? "success"
                        : "warning"
                    }
                  />
                  <AppText variant="heading">{product.name}</AppText>
                  <AppText>{formatAfn(product.price)}</AppText>
                  {product.description ? (
                    <AppText tone="muted">{product.description}</AppText>
                  ) : null}
                </View>
              </Card>
            ))}
        </View>
      )}

      <Button
        variant="secondary"
        onPress={() => router.back()}
      >
        {t("seller.onboarding.back")}
      </Button>
    </Screen>
  );
}
