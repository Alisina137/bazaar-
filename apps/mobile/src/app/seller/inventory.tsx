import type { CatalogProductRecord } from "@bazaarlink/contracts";
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

function availableStock(product: CatalogProductRecord): number {
  if (product.variants.length > 0) {
    return product.variants.reduce(
      (sum, variant) =>
        sum + Math.max(0, variant.availableQuantity - variant.reservedQuantity),
      0
    );
  }

  return Math.max(0, product.availableQuantity - product.reservedQuantity);
}

function isLow(product: CatalogProductRecord): boolean {
  if (product.variants.length > 0) {
    return product.variants.some(
      (variant) =>
        variant.available &&
        Math.max(0, variant.availableQuantity - variant.reservedQuantity) <=
          variant.lowStockThreshold
    );
  }

  return availableStock(product) <= product.lowStockThreshold;
}

export default function SellerInventoryScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { formatNumber, t } = useLocalization();
  const {
    status,
    products,
    lowStockItems,
    hasMore,
    loadingMore,
    refresh,
    loadMore
  } = useCatalog();

  if (status === "loading" || status === "idle") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("catalog.inventory.title")}
          message={t("catalog.inventory.loading")}
        />
      </Screen>
    );
  }

  const tracked = products.filter(
    (product) => product.status !== "archived"
  );

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("catalog.phaseBadge")} tone="primary" />
        <AppText variant="title">{t("catalog.inventory.title")}</AppText>
        <AppText tone="muted">{t("catalog.inventory.description")}</AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">
            {t("catalog.inventory.lowStockList")}
          </AppText>
          {lowStockItems.length === 0 ? (
            <AppText tone="muted">
              {t("catalog.inventory.noLowStock")}
            </AppText>
          ) : (
            lowStockItems.map((item) => (
              <View
                key={item.productId + ":" + (item.variantId ?? "product")}
                style={{ gap: theme.spacing.xs }}
              >
                <Badge
                  label={t("catalog.inventory.lowStock")}
                  tone="warning"
                />
                <AppText variant="bodyStrong">
                  {item.productName}
                  {item.variantTitle ? " · " + item.variantTitle : ""}
                </AppText>
                <AppText tone="muted">
                  {t("catalog.inventory.available")}:{" "}
                  {formatNumber(
                    Math.max(
                      0,
                      item.availableQuantity - item.reservedQuantity
                    )
                  )}
                </AppText>
                <Button
                  variant="secondary"
                  onPress={() => {
                    router.push({
                      pathname: "/seller/product/[productId]",
                      params: { productId: item.productId }
                    });
                  }}
                >
                  {t("catalog.inventory.manage")}
                </Button>
              </View>
            ))
          )}
        </View>
      </Card>

      {tracked.length === 0 ? (
        <StateView
          kind="empty"
          title={t("catalog.inventory.emptyTitle")}
          message={t("catalog.inventory.emptyMessage")}
          actionLabel={t("catalog.action.retry")}
          onAction={() => {
            void refresh();
          }}
        />
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {tracked.map((product) => {
            const low = isLow(product);
            const stock = availableStock(product);

            return (
              <Card key={product.id}>
                <View style={{ gap: theme.spacing.sm }}>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: theme.spacing.sm
                    }}
                  >
                    <Badge
                      label={t(productStatusKey(product.status))}
                      tone={
                        product.status === "active"
                          ? "success"
                          : "warning"
                      }
                    />
                    {low ? (
                      <Badge
                        label={t("catalog.inventory.lowStock")}
                        tone="warning"
                      />
                    ) : null}
                  </View>
                  <AppText variant="heading">{product.name}</AppText>
                  <AppText>
                    {t("catalog.inventory.available")}:{" "}
                    {formatNumber(stock)}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {t("catalog.inventory.variantCount")}:{" "}
                    {formatNumber(product.variants.length)}
                  </AppText>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      router.push({
                        pathname: "/seller/product/[productId]",
                        params: { productId: product.id }
                      });
                    }}
                  >
                    {t("catalog.inventory.manage")}
                  </Button>
                </View>
              </Card>
            );
          })}

          {hasMore ? (
            <Button
              variant="secondary"
              loading={loadingMore}
              onPress={() => {
                void loadMore();
              }}
            >
              {t("catalog.action.loadMore")}
            </Button>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
