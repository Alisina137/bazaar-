import type { CatalogCategoryRecord } from "@bazaarlink/contracts";
import { useState } from "react";
import { View } from "react-native";

import {
  catalogErrorKey,
  categoryStatusKey
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
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

function CategoryForm({
  category,
  categories,
  onCancel,
  onSaved
}: {
  category?: CatalogCategoryRecord | undefined;
  categories: CatalogCategoryRecord[];
  onCancel?: (() => void) | undefined;
  onSaved: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const { createCategory, updateCategory } = useCatalog();
  const [name, setName] = useState(category?.name ?? "");
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(
    String(category?.sortOrder ?? 0)
  );
  const [parentId, setParentId] = useState<string | null>(
    category?.parentId ?? null
  );
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof catalogErrorKey> | null>(
    null
  );

  const activeParents = categories.filter(
    (item) =>
      item.status === "active" &&
      item.id !== category?.id
  );

  const save = async () => {
    const parsedSort = Number(sortOrder);

    if (!name.trim() || !Number.isInteger(parsedSort)) {
      setErrorKey("catalog.error.invalidRequest");
      return;
    }

    setBusy(true);
    setErrorKey(null);

    try {
      const input = {
        name,
        parentId,
        imageUrl: imageUrl.trim() || null,
        icon: icon.trim() || null,
        sortOrder: parsedSort
      };

      if (category) {
        await updateCategory(category.id, input);
      } else {
        await createCategory(input);
        setName("");
        setImageUrl("");
        setIcon("");
        setSortOrder("0");
        setParentId(null);
      }

      onSaved();
    } catch (error) {
      setErrorKey(catalogErrorKey(getCatalogError(error).code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: theme.spacing.lg }}>
        <AppText variant="heading">
          {category
            ? t("catalog.category.edit")
            : t("catalog.category.create")}
        </AppText>

        <TextField
          label={t("catalog.category.name")}
          value={name}
          onChangeText={setName}
        />
        <TextField
          label={t("catalog.category.imageUrl")}
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
        />
        <TextField
          label={t("catalog.category.icon")}
          value={icon}
          onChangeText={setIcon}
        />
        <TextField
          label={t("catalog.category.sortOrder")}
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="number-pad"
        />

        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="label">{t("catalog.category.parent")}</AppText>
          <Button
            variant={parentId === null ? "primary" : "secondary"}
            onPress={() => setParentId(null)}
          >
            {t("catalog.category.noParent")}
          </Button>
          {activeParents.map((item) => (
            <Button
              key={item.id}
              variant={parentId === item.id ? "primary" : "secondary"}
              onPress={() => setParentId(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </View>

        {errorKey ? (
          <AppText tone="danger">{t(errorKey)}</AppText>
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

        {onCancel ? (
          <Button
            fullWidth
            variant="ghost"
            disabled={busy}
            onPress={onCancel}
          >
            {t("catalog.action.cancel")}
          </Button>
        ) : null}
      </View>
    </Card>
  );
}

export default function SellerCategoriesScreen() {
  const theme = useAppTheme();
  const { formatNumber, t } = useLocalization();
  const {
    categories,
    usage,
    refresh,
    archiveCategory,
    restoreCategory,
    updateCategory
  } = useCatalog();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof catalogErrorKey> | null>(
    null
  );

  const active = categories.filter((item) => item.status === "active");
  const archived = categories.filter((item) => item.status === "archived");

  const act = async (
    category: CatalogCategoryRecord,
    action: "archive" | "restore" | "up" | "down"
  ) => {
    setBusyId(category.id);
    setErrorKey(null);

    try {
      if (action === "archive") {
        await archiveCategory(category.id);
      } else if (action === "restore") {
        await restoreCategory(category.id);
      } else {
        await updateCategory(category.id, {
          sortOrder:
            category.sortOrder + (action === "up" ? -1 : 1)
        });
        await refresh();
      }
    } catch (error) {
      setErrorKey(catalogErrorKey(getCatalogError(error).code));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("catalog.phaseBadge")} tone="primary" />
        <AppText variant="title">{t("catalog.category.title")}</AppText>
        <AppText tone="muted">{t("catalog.category.description")}</AppText>
      </View>

      {usage ? (
        <Card>
          <AppText>
            {t("catalog.usage.categories")}:{" "}
            {formatNumber(usage.activeCategoryCount)} /{" "}
            {usage.categoryLimit === null
              ? t("seller.subscription.unlimited")
              : formatNumber(usage.categoryLimit)}
          </AppText>
        </Card>
      ) : null}

      <CategoryForm
        categories={categories}
        onSaved={() => {
          void refresh();
        }}
      />

      {errorKey ? (
        <AppText tone="danger">{t(errorKey)}</AppText>
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        <AppText variant="heading">{t("catalog.category.activeList")}</AppText>

        {active.length === 0 ? (
          <AppText tone="muted">{t("catalog.category.empty")}</AppText>
        ) : null}

        {active.map((category) =>
          editingId === category.id ? (
            <CategoryForm
              key={category.id}
              category={category}
              categories={categories}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                void refresh();
              }}
            />
          ) : (
            <Card key={category.id}>
              <View style={{ gap: theme.spacing.sm }}>
                <Badge
                  label={t(categoryStatusKey(category.status))}
                  tone="success"
                />
                <AppText variant="heading">{category.name}</AppText>
                {category.parentId ? (
                  <AppText variant="caption" tone="muted">
                    {t("catalog.category.parent")}:{" "}
                    {categories.find((item) => item.id === category.parentId)
                      ?.name ?? t("catalog.category.noParent")}
                  </AppText>
                ) : null}
                <AppText variant="caption" tone="muted">
                  {t("catalog.category.sortOrder")}:{" "}
                  {formatNumber(category.sortOrder)}
                </AppText>

                <Button
                  variant="secondary"
                  onPress={() => setEditingId(category.id)}
                >
                  {t("catalog.category.edit")}
                </Button>
                <View style={{ gap: theme.spacing.sm }}>
                  <Button
                    variant="ghost"
                    disabled={busyId === category.id}
                    onPress={() => {
                      void act(category, "up");
                    }}
                  >
                    {t("catalog.category.moveUp")}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busyId === category.id}
                    onPress={() => {
                      void act(category, "down");
                    }}
                  >
                    {t("catalog.category.moveDown")}
                  </Button>
                </View>
                <Button
                  variant="danger"
                  loading={busyId === category.id}
                  onPress={() => {
                    void act(category, "archive");
                  }}
                >
                  {t("catalog.category.archive")}
                </Button>
              </View>
            </Card>
          )
        )}
      </View>

      {archived.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">{t("catalog.category.archivedList")}</AppText>
          {archived.map((category) => (
            <Card key={category.id}>
              <View style={{ gap: theme.spacing.sm }}>
                <Badge
                  label={t(categoryStatusKey(category.status))}
                  tone="warning"
                />
                <AppText variant="heading">{category.name}</AppText>
                <Button
                  variant="secondary"
                  loading={busyId === category.id}
                  onPress={() => {
                    void act(category, "restore");
                  }}
                >
                  {t("catalog.category.restore")}
                </Button>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
