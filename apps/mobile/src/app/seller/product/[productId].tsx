import type {
  CatalogProductRecord,
  InventoryMovementRecord
} from "@bazaarlink/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import {
  catalogErrorKey,
  productStatusKey
} from "@/catalog/messages";
import {
  getCatalogError,
  useCatalog
} from "@/catalog/provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

function stockFor(product: CatalogProductRecord): number {
  if (product.variants.length > 0) {
    return product.variants.reduce(
      (sum, variant) =>
        sum + Math.max(0, variant.availableQuantity - variant.reservedQuantity),
      0
    );
  }

  return Math.max(0, product.availableQuantity - product.reservedQuantity);
}

function parseOptionalNumber(value: string): number | null | undefined {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function ProductManagementScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { formatAfn, formatNumber, t } = useLocalization();
  const catalog = useCatalog();

  const product = catalog.products.find((item) => item.id === productId);
  const [loading, setLoading] = useState(!product);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof catalogErrorKey> | null>(
    null
  );

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compareAtPrice === null || product?.compareAtPrice === undefined
      ? ""
      : String(product.compareAtPrice)
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(product?.lowStockThreshold ?? 0)
  );
  const [showMore, setShowMore] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  const [variantTitle, setVariantTitle] = useState("");
  const [variantOptionName, setVariantOptionName] = useState("");
  const [variantOptionValue, setVariantOptionValue] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantStock, setVariantStock] = useState("0");
  const [variantImage, setVariantImage] = useState("");

  const [inventoryTarget, setInventoryTarget] = useState<string | null>(null);
  const [inventoryDelta, setInventoryDelta] = useState("");
  const [inventoryReason, setInventoryReason] = useState("");
  const [history, setHistory] = useState<InventoryMovementRecord[] | null>(null);

  useEffect(() => {
    if (!productId || product) {
      setLoading(false);
      return;
    }

    let active = true;

    void catalog
      .getProduct(productId)
      .catch((error) => {
        if (active) {
          setErrorKey(catalogErrorKey(getCatalogError(error).code));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [catalog, product, productId]);

  const current = catalog.products.find((item) => item.id === productId);

  useEffect(() => {
    if (!current) return;

    setName(current.name);
    setCategoryId(current.categoryId);
    setPrice(String(current.price));
    setDescription(current.description ?? "");
    setSku(current.sku ?? "");
    setBrand(current.brand ?? "");
    setCompareAtPrice(
      current.compareAtPrice === null ? "" : String(current.compareAtPrice)
    );
    setLowStockThreshold(String(current.lowStockThreshold));
  }, [current?.id, current?.updatedAt]);

  const activeCategories = useMemo(
    () => catalog.categories.filter((category) => category.status === "active"),
    [catalog.categories]
  );

  if (loading) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("catalog.product.manage")}
          message={t("catalog.products.loading")}
        />
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("catalog.products.errorTitle")}
          message={
            errorKey
              ? t(errorKey)
              : t("catalog.error.productNotFound")
          }
        />
      </Screen>
    );
  }

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setErrorKey(null);

    try {
      await action();
    } catch (error) {
      setErrorKey(catalogErrorKey(getCatalogError(error).code));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const parsedPrice = Number(price);
      const threshold = Number(lowStockThreshold);
      const oldPrice = parseOptionalNumber(compareAtPrice);

      if (
        !name.trim() ||
        !categoryId ||
        !Number.isFinite(parsedPrice) ||
        parsedPrice < 0 ||
        !Number.isInteger(threshold) ||
        threshold < 0 ||
        oldPrice === undefined
      ) {
        throw getCatalogError({
          code: "invalid_request"
        });
      }

      await catalog.updateProduct(current.id, {
        name,
        categoryId,
        price: parsedPrice,
        description: description.trim() || null,
        sku: sku.trim() || null,
        brand: brand.trim() || null,
        compareAtPrice: oldPrice,
        lowStockThreshold: threshold
      });
    });

  const addImage = () =>
    run(async () => {
      if (!imageUrl.trim()) {
        throw getCatalogError({ code: "invalid_request" });
      }

      await catalog.addImage(current.id, {
        url: imageUrl.trim(),
        altText: imageAlt.trim() || null,
        sortOrder: current.images.length
      });
      setImageUrl("");
      setImageAlt("");
    });

  const addVariant = () =>
    run(async () => {
      const stock = Number(variantStock);
      const override = parseOptionalNumber(variantPrice);

      if (
        !variantTitle.trim() ||
        !variantOptionName.trim() ||
        !variantOptionValue.trim() ||
        !Number.isInteger(stock) ||
        stock < 0 ||
        override === undefined
      ) {
        throw getCatalogError({ code: "invalid_request" });
      }

      await catalog.addVariant(current.id, {
        title: variantTitle,
        optionValues: {
          [variantOptionName]: variantOptionValue
        },
        sku: variantSku.trim() || null,
        priceOverride: override,
        imageUrl: variantImage.trim() || null,
        available: true,
        availableQuantity: stock,
        lowStockThreshold: 0
      });

      setVariantTitle("");
      setVariantOptionName("");
      setVariantOptionValue("");
      setVariantSku("");
      setVariantPrice("");
      setVariantStock("0");
      setVariantImage("");
    });

  const adjust = () =>
    run(async () => {
      const delta = Number(inventoryDelta);

      if (!Number.isInteger(delta) || delta === 0) {
        throw getCatalogError({ code: "invalid_request" });
      }

      await catalog.adjustInventory(current.id, {
        variantId: inventoryTarget,
        delta,
        reason: inventoryReason.trim() || null
      });
      setInventoryDelta("");
      setInventoryReason("");
      setHistory(await catalog.inventoryHistory(current.id));
    });

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge
          label={t(productStatusKey(current.status))}
          tone={
            current.status === "active"
              ? "success"
              : current.status === "archived" ||
                  current.status === "plan_restricted"
                ? "danger"
                : "warning"
          }
        />
        <AppText variant="title">{current.name}</AppText>
        <AppText tone="muted">
          {t("catalog.inventory.stock")}: {formatNumber(stockFor(current))}
        </AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="heading">{t("catalog.product.details")}</AppText>
          <TextField
            label={t("catalog.product.name")}
            value={name}
            onChangeText={setName}
          />
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label">{t("catalog.product.category")}</AppText>
            {activeCategories.map((category) => (
              <Button
                key={category.id}
                variant={categoryId === category.id ? "primary" : "secondary"}
                onPress={() => setCategoryId(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </View>
          <TextField
            label={t("catalog.product.price")}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("catalog.product.description")}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Button variant="ghost" onPress={() => setShowMore((value) => !value)}>
            {showMore
              ? t("catalog.product.hideMore")
              : t("catalog.product.moreOptions")}
          </Button>

          {showMore ? (
            <View style={{ gap: theme.spacing.lg }}>
              <TextField
                label={t("catalog.product.sku")}
                value={sku}
                onChangeText={setSku}
              />
              <TextField
                label={t("catalog.product.brand")}
                value={brand}
                onChangeText={setBrand}
              />
              <TextField
                label={t("catalog.product.compareAtPrice")}
                value={compareAtPrice}
                onChangeText={setCompareAtPrice}
                keyboardType="decimal-pad"
              />
              <TextField
                label={t("catalog.inventory.lowStockThreshold")}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="number-pad"
              />
            </View>
          ) : null}

          <Button
            fullWidth
            loading={busy}
            onPress={() => {
              void save();
            }}
          >
            {t("catalog.action.save")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("catalog.product.stateActions")}</AppText>
          {current.status === "archived" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onPress={() => {
                void run(() => catalog.restoreProduct(current.id));
              }}
            >
              {t("catalog.product.restore")}
            </Button>
          ) : (
            <>
              <Button
                disabled={busy || current.status === "plan_restricted"}
                onPress={() => {
                  void run(() => catalog.publishProduct(current.id));
                }}
              >
                {t("catalog.product.publish")}
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onPress={() => {
                  void run(() => catalog.archiveProduct(current.id));
                }}
              >
                {t("catalog.product.archive")}
              </Button>
            </>
          )}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="heading">{t("catalog.images.title")}</AppText>
          {current.images.map((image, index) => (
            <View key={image.id} style={{ gap: theme.spacing.sm }}>
              <AppText>
                {formatNumber(index + 1)}. {image.altText ?? current.name}
              </AppText>
              <AppText variant="caption" tone="muted">{image.url}</AppText>
              <Button
                variant="danger"
                disabled={busy}
                onPress={() => {
                  void run(() => catalog.deleteImage(current.id, image.id));
                }}
              >
                {t("catalog.images.remove")}
              </Button>
            </View>
          ))}
          <TextField
            label={t("catalog.product.photoUrl")}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
          />
          <TextField
            label={t("catalog.images.altText")}
            value={imageAlt}
            onChangeText={setImageAlt}
          />
          <Button
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void addImage();
            }}
          >
            {t("catalog.images.add")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="heading">{t("catalog.variants.title")}</AppText>

          {current.variants.map((variant) => (
            <View key={variant.id} style={{ gap: theme.spacing.sm }}>
              <AppText variant="bodyStrong">{variant.title}</AppText>
              <AppText tone="muted">
                {Object.entries(variant.optionValues)
                  .map(([key, value]) => key + ": " + value)
                  .join(" · ")}
              </AppText>
              <AppText>
                {variant.priceOverride === null
                  ? formatAfn(current.price)
                  : formatAfn(variant.priceOverride)}
              </AppText>
              <AppText tone="muted">
                {t("catalog.inventory.stock")}:{" "}
                {formatNumber(
                  Math.max(
                    0,
                    variant.availableQuantity - variant.reservedQuantity
                  )
                )}
              </AppText>
              <Button
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  void run(() =>
                    catalog.updateVariant(current.id, variant.id, {
                      available: !variant.available
                    })
                  );
                }}
              >
                {variant.available
                  ? t("catalog.variants.makeUnavailable")
                  : t("catalog.variants.makeAvailable")}
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onPress={() => {
                  void run(() =>
                    catalog.deleteVariant(current.id, variant.id)
                  );
                }}
              >
                {t("catalog.variants.remove")}
              </Button>
            </View>
          ))}

          <AppText variant="bodyStrong">{t("catalog.variants.add")}</AppText>
          <TextField
            label={t("catalog.variants.titleField")}
            value={variantTitle}
            onChangeText={setVariantTitle}
          />
          <TextField
            label={t("catalog.variants.optionName")}
            value={variantOptionName}
            onChangeText={setVariantOptionName}
          />
          <TextField
            label={t("catalog.variants.optionValue")}
            value={variantOptionValue}
            onChangeText={setVariantOptionValue}
          />
          <TextField
            label={t("catalog.product.sku")}
            value={variantSku}
            onChangeText={setVariantSku}
          />
          <TextField
            label={t("catalog.variants.priceOverride")}
            value={variantPrice}
            onChangeText={setVariantPrice}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("catalog.inventory.stock")}
            value={variantStock}
            onChangeText={setVariantStock}
            keyboardType="number-pad"
          />
          <TextField
            label={t("catalog.variants.imageUrl")}
            value={variantImage}
            onChangeText={setVariantImage}
            autoCapitalize="none"
          />
          <Button
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void addVariant();
            }}
          >
            {t("catalog.variants.add")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="heading">{t("catalog.inventory.title")}</AppText>
          {current.variants.length > 0 ? (
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="label">{t("catalog.inventory.target")}</AppText>
              {current.variants.map((variant) => (
                <Button
                  key={variant.id}
                  variant={
                    inventoryTarget === variant.id
                      ? "primary"
                      : "secondary"
                  }
                  onPress={() => setInventoryTarget(variant.id)}
                >
                  {variant.title}
                </Button>
              ))}
            </View>
          ) : (
            <Badge
              label={t("catalog.inventory.productLevel")}
              tone="neutral"
            />
          )}

          <TextField
            label={t("catalog.inventory.adjustment")}
            helperText={t("catalog.inventory.adjustmentHint")}
            value={inventoryDelta}
            onChangeText={setInventoryDelta}
            keyboardType="numbers-and-punctuation"
          />
          <TextField
            label={t("catalog.inventory.reason")}
            value={inventoryReason}
            onChangeText={setInventoryReason}
          />
          <Button
            variant="secondary"
            disabled={busy || (current.variants.length > 0 && !inventoryTarget)}
            onPress={() => {
              void adjust();
            }}
          >
            {t("catalog.inventory.apply")}
          </Button>

          <Button
            variant="ghost"
            disabled={busy}
            onPress={() => {
              void run(async () => {
                setHistory(await catalog.inventoryHistory(current.id));
              });
            }}
          >
            {t("catalog.inventory.history")}
          </Button>

          {history?.map((movement) => (
            <View key={movement.id} style={{ gap: theme.spacing.xs }}>
              <AppText>
                {movement.delta > 0 ? "+" : ""}
                {formatNumber(movement.delta)} ·{" "}
                {formatNumber(movement.previousQuantity)} →{" "}
                {formatNumber(movement.newQuantity)}
              </AppText>
              {movement.reason ? (
                <AppText variant="caption" tone="muted">
                  {movement.reason}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      </Card>

      {errorKey ? (
        <AppText tone="danger">{t(errorKey)}</AppText>
      ) : null}

      <Button
        variant="ghost"
        onPress={() => {
          router.replace("/seller/(tabs)/products");
        }}
      >
        {t("catalog.action.backToProducts")}
      </Button>
    </Screen>
  );
}
