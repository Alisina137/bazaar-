import type { CatalogProductRecord } from "@bazaarlink/contracts";
import { useRouter } from "expo-router";
import { View } from "react-native";

import {
  catalogErrorKey,
  categoryStatusKey,
  productStatusKey
} from "@/catalog/messages";
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

function productStock(product: CatalogProductRecord): number {
  if (product.variants.length > 0) {
    return product.variants.reduce(
      (sum, variant) =>
        sum + Math.max(0, variant.availableQuantity - variant.reservedQuantity),
      0
    );
  }

  return Math.max(
    0,
    product.availableQuantity - product.reservedQuantity
  );
}

export default function SellerProductsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { formatAfn, formatNumber, t } = useLocalization();
  const {
    status,
    categories,
    products,
    usage,
    hasMore,
    loadingMore,
    error,
    refresh,
    loadMore
  } = useCatalog();

  if (status === "loading" || status === "idle") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("catalog.products.title")}
          message={t("catalog.products.loading")}
        />
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("catalog.products.errorTitle")}
          message={t(
            error
              ? catalogErrorKey(error.code)
              : "catalog.error.serviceUnavailable"
          )}
          actionLabel={t("catalog.action.retry")}
          onAction={() => {
            void refresh();
          }}
        />
      </Screen>
    );
  }

  const activeCategories = categories.filter(
    (category) => category.status === "active"
  );

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("catalog.phaseBadge")} tone="primary" />
        <AppText variant="title">{t("catalog.products.title")}</AppText>
        <AppText tone="muted">{t("catalog.products.description")}</AppText>
      </View>

      {usage ? (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="heading">{t("catalog.usage.title")}</AppText>
            <AppText>
              {t("catalog.usage.products")}:{" "}
              {formatNumber(usage.productCount)} /{" "}
              {formatNumber(usage.productLimit)}
            </AppText>
            <AppText>
              {t("catalog.usage.categories")}:{" "}
              {formatNumber(usage.activeCategoryCount)} /{" "}
              {usage.categoryLimit === null
                ? t("seller.subscription.unlimited")
                : formatNumber(usage.categoryLimit)}
            </AppText>
          </View>
        </Card>
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        <Button
          fullWidth
          variant="secondary"
          onPress={() => {
            router.push("/seller/categories");
          }}
        >
          {t("catalog.category.manage")}
        </Button>
        <Button
          fullWidth
          disabled={activeCategories.length === 0}
          onPress={() => {
            router.push("/seller/product/new");
          }}
        >
          {t("catalog.product.add")}
        </Button>
        {activeCategories.length === 0 ? (
          <AppText variant="caption" tone="muted">
            {t("catalog.product.needCategory")}
          </AppText>
        ) : null}
      </View>

      {products.length === 0 ? (
        <StateView
          kind="empty"
          title={t("catalog.products.emptyTitle")}
          message={t("catalog.products.emptyMessage")}
          actionLabel={t("catalog.product.add")}
          onAction={() => {
            if (activeCategories.length > 0) {
              router.push("/seller/product/new");
            } else {
              router.push("/seller/categories");
            }
          }}
        />
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {products.map((product) => {
            const category = categories.find(
              (item) => item.id === product.categoryId
            );

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
                          : product.status === "archived" ||
                              product.status === "plan_restricted"
                            ? "danger"
                            : "warning"
                      }
                    />
                    {category ? (
                      <Badge
                        label={category.name}
                        tone={
                          category.status === "active"
                            ? "neutral"
                            : "warning"
                        }
                      />
                    ) : null}
                  </View>

                  <AppText variant="heading">{product.name}</AppText>
                  <AppText>{formatAfn(product.price)}</AppText>
                  <AppText tone="muted">
                    {t("catalog.inventory.stock")}:{" "}
                    {formatNumber(productStock(product))}
                  </AppText>
                  {category ? (
                    <AppText variant="caption" tone="muted">
                      {t(categoryStatusKey(category.status))}
                    </AppText>
                  ) : null}

                  <Button
                    variant="secondary"
                    onPress={() => {
                      router.push({
                        pathname: "/seller/product/[productId]",
                        params: { productId: product.id }
                      });
                    }}
                  >
                    {t("catalog.product.manage")}
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
