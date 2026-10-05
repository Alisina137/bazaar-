import type {
  MarketplaceCategoryRecord,
  ProductDeliveryProfile
} from "@bazaarlink/contracts";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { catalogErrorKey } from "@/catalog/messages";
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
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { marketplaceCategories } from "@/marketplace/api";

function marketplaceCategoryName(
  category: MarketplaceCategoryRecord,
  locale: "fa-AF" | "ps-AF" | "en"
) {
  return locale === "en"
    ? category.nameEn
    : locale === "ps-AF"
      ? category.namePs
      : category.nameFa;
}

function optionalNumber(value: string): number | null | undefined {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function NewProductScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { locale, t } = useLocalization();
  const { categories, createProduct, publishProduct } = useCatalog();

  const activeCategories = useMemo(
    () => categories.filter((category) => category.status === "active"),
    [categories]
  );

  const [categoryId, setCategoryId] = useState(
    activeCategories[0]?.id ?? ""
  );
  const [marketplaceCategoryId, setMarketplaceCategoryId] =
    useState<string | null>(null);
  const [marketplaceCategoryOptions, setMarketplaceCategoryOptions] =
    useState<MarketplaceCategoryRecord[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [tags, setTags] = useState("");
  const [shippingClass, setShippingClass] = useState("");
  const [deliveryRestrictions, setDeliveryRestrictions] = useState("");
  const [deliveryProfile, setDeliveryProfile] =
    useState<ProductDeliveryProfile>("normal");
  const [deliverySurcharge, setDeliverySurcharge] = useState("0");
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof catalogErrorKey> | null>(
    null
  );

  useEffect(() => {
    let active = true;

    void marketplaceCategories()
      .then((response) => {
        if (active) setMarketplaceCategoryOptions(response.categories);
      })
      .catch(() => {
        // Product creation remains available without a platform mapping.
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = async (publish: boolean) => {
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    const parsedThreshold = Number(lowStockThreshold);
    const oldPrice = optionalNumber(compareAtPrice);
    const weight = optionalNumber(weightGrams);
    const parsedDeliverySurcharge = Number(deliverySurcharge);

    if (
      !name.trim() ||
      !categoryId ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0 ||
      !Number.isInteger(parsedStock) ||
      parsedStock < 0 ||
      !Number.isInteger(parsedThreshold) ||
      parsedThreshold < 0 ||
      oldPrice === undefined ||
      weight === undefined ||
      (weight !== null && !Number.isInteger(weight)) ||
      !Number.isFinite(parsedDeliverySurcharge) ||
      parsedDeliverySurcharge < 0
    ) {
      setErrorKey("catalog.error.invalidRequest");
      return;
    }

    setBusy(publish ? "publish" : "draft");
    setErrorKey(null);

    try {
      const product = await createProduct({
        name,
        categoryId,
        marketplaceCategoryId,
        price: parsedPrice,
        availableQuantity: parsedStock,
        lowStockThreshold: parsedThreshold,
        description: description.trim() || null,
        sku: sku.trim() || null,
        brand: brand.trim() || null,
        compareAtPrice: oldPrice,
        barcode: barcode.trim() || null,
        weightGrams: weight,
        dimensions: dimensions.trim() || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        shippingClass: shippingClass.trim() || null,
        deliveryRestrictions: deliveryRestrictions.trim() || null,
        deliveryProfile,
        deliverySurcharge: parsedDeliverySurcharge,
        images: imageUrl.trim()
          ? [{ url: imageUrl.trim(), altText: name.trim() }]
          : []
      });

      if (publish) {
        await publishProduct(product.id);
      }

      router.replace({
        pathname: "/seller/product/[productId]",
        params: { productId: product.id }
      });
    } catch (error) {
      setErrorKey(catalogErrorKey(getCatalogError(error).code));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("catalog.phaseBadge")} tone="primary" />
        <AppText variant="title">{t("catalog.product.createTitle")}</AppText>
        <AppText tone="muted">{t("catalog.product.createDescription")}</AppText>
      </View>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <TextField
            label={t("catalog.product.photoUrl")}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
          />
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

          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label">
              {t("catalog.product.marketplaceCategory")}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t("catalog.product.marketplaceCategoryHint")}
            </AppText>
            <Button
              variant={marketplaceCategoryId === null ? "primary" : "secondary"}
              onPress={() => setMarketplaceCategoryId(null)}
            >
              {t("catalog.product.marketplaceCategoryNone")}
            </Button>
            {marketplaceCategoryOptions.map((category) => (
              <Button
                key={category.id}
                variant={
                  marketplaceCategoryId === category.id
                    ? "primary"
                    : "secondary"
                }
                onPress={() => setMarketplaceCategoryId(category.id)}
              >
                {marketplaceCategoryName(category, locale)}
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
            label={t("catalog.inventory.stock")}
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
          />
          <TextField
            label={t("catalog.inventory.lowStockThreshold")}
            value={lowStockThreshold}
            onChangeText={setLowStockThreshold}
            keyboardType="number-pad"
          />

          <Button
            variant="ghost"
            onPress={() => setShowMore((value) => !value)}
          >
            {showMore
              ? t("catalog.product.hideMore")
              : t("catalog.product.moreOptions")}
          </Button>

          {showMore ? (
            <View style={{ gap: theme.spacing.lg }}>
              <TextField
                label={t("catalog.product.description")}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <TextField
                label={t("catalog.product.sku")}
                value={sku}
                onChangeText={setSku}
                autoCapitalize="characters"
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
                label={t("catalog.product.barcode")}
                value={barcode}
                onChangeText={setBarcode}
              />
              <TextField
                label={t("catalog.product.weight")}
                value={weightGrams}
                onChangeText={setWeightGrams}
                keyboardType="number-pad"
              />
              <TextField
                label={t("catalog.product.dimensions")}
                value={dimensions}
                onChangeText={setDimensions}
              />
              <TextField
                label={t("catalog.product.tags")}
                helperText={t("catalog.product.tagsHint")}
                value={tags}
                onChangeText={setTags}
              />
              <TextField
                label={t("catalog.product.shippingClass")}
                value={shippingClass}
                onChangeText={setShippingClass}
              />
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="label">
                  {t("delivery.product.profile")}
                </AppText>
                {(
                  [
                    "normal",
                    "bulky",
                    "fragile",
                    "pickup_only",
                    "no_express",
                    "seller_delivery_only",
                    "digital_no_delivery"
                  ] as ProductDeliveryProfile[]
                ).map((profile) => (
                  <Button
                    key={profile}
                    variant={
                      deliveryProfile === profile ? "primary" : "secondary"
                    }
                    onPress={() => setDeliveryProfile(profile)}
                  >
                    {t(("delivery.product.profile." + profile) as never)}
                  </Button>
                ))}
              </View>
              <TextField
                label={t("delivery.product.surcharge")}
                helperText={t("delivery.product.surchargeHint")}
                value={deliverySurcharge}
                onChangeText={setDeliverySurcharge}
                keyboardType="decimal-pad"
              />
              <TextField
                label={t("catalog.product.deliveryRestrictions")}
                value={deliveryRestrictions}
                onChangeText={setDeliveryRestrictions}
                multiline
              />
            </View>
          ) : null}

          {errorKey ? (
            <AppText tone="danger">{t(errorKey)}</AppText>
          ) : null}

          <Button
            fullWidth
            variant="secondary"
            loading={busy === "draft"}
            disabled={busy !== null}
            onPress={() => {
              void submit(false);
            }}
          >
            {t("catalog.product.saveDraft")}
          </Button>

          <Button
            fullWidth
            loading={busy === "publish"}
            disabled={busy !== null}
            onPress={() => {
              void submit(true);
            }}
          >
            {t("catalog.product.createAndPublish")}
          </Button>
        </View>
      </Card>
    </Screen>
  );
}
