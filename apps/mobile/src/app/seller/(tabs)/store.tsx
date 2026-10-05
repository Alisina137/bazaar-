import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

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
import {
  getStoreError,
  useStores
} from "@/store/provider";
import {
  storeErrorKey,
  storeStatusKey
} from "@/store/messages";

export default function SellerStoreScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { formatNumber, t } = useLocalization();
  const { currentStore, publishStore } = useStores();
  const { products, usage } = useCatalog();
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof storeErrorKey> | null>(null);

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

  const publish = async () => {
    setBusy(true);
    setErrorKey(null);

    try {
      await publishStore(currentStore.id);
    } catch (error) {
      setErrorKey(storeErrorKey(getStoreError(error).code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge
          label={t(storeStatusKey(currentStore.status))}
          tone={currentStore.status === "published" ? "success" : "warning"}
        />
        <AppText variant="title">{t("seller.store.title")}</AppText>
        <AppText tone="muted">{"/store/" + currentStore.handle}</AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{currentStore.name}</AppText>
          {currentStore.description ? (
            <AppText tone="muted">{currentStore.description}</AppText>
          ) : null}
          <AppText>
            {t("seller.store.category")}: {currentStore.category}
          </AppText>
          <AppText>
            {t("seller.store.location")}: {currentStore.cityDistrict}, {currentStore.province}
          </AppText>
          <AppText>
            {t("seller.store.contact")}: {currentStore.phone}
          </AppText>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("catalog.products.title")}</AppText>
          <AppText tone="muted">
            {products.length === 0
              ? t("seller.store.emptyMessage")
              : t("catalog.products.description")}
          </AppText>
          <AppText>
            {t("catalog.usage.products")}: {formatNumber(usage?.productCount ?? products.length)}
          </AppText>

          <Button
            variant="secondary"
            onPress={() => {
              router.push("/seller/(tabs)/products");
            }}
          >
            {t("catalog.product.manage")}
          </Button>

          <Button
            variant="secondary"
            onPress={() => {
              router.push("/seller/preview");
            }}
          >
            {t("seller.store.preview")}
          </Button>

          <Button
            variant="secondary"
            onPress={() => {
              router.push("/seller/settings");
            }}
          >
            {t("seller.store.editSettings")}
          </Button>

          {currentStore.status === "draft" ? (
            <Button
              loading={busy}
              onPress={() => {
                void publish();
              }}
            >
              {busy
                ? t("seller.store.publishing")
                : t("seller.store.publish")}
            </Button>
          ) : null}

          {errorKey ? (
            <AppText tone="danger">{t(errorKey)}</AppText>
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}
