import type {
  MarketplaceCategoryRecord,
  MarketplaceFeaturedStore,
  MarketplaceProductDetail,
  MarketplaceProductSummary,
  MarketplaceSearchSuggestion,
  MarketplaceStorePageResponse,
  MarketplaceStoreSummary,
  MarketplaceVariantSummary,
  PublicStoreRecord
} from "@bazaarlink/contracts";
import {
  categories,
  marketplaceProductMetrics,
  platformCategories,
  productImages,
  products,
  productVariants,
  stores,
  type Database
} from "@bazaarlink/database";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  ne,
  or,
  sql,
  type SQL
} from "drizzle-orm";

export interface MarketplaceBrowseQuery {
  query?: string | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  province?: string | undefined;
  storeId?: string | undefined;
  brand?: string | undefined;
  inStock?: boolean | undefined;
  discount?: boolean | undefined;
  sort:
    | "relevance"
    | "newest"
    | "price_asc"
    | "price_desc"
    | "rating"
    | "popularity";
  offset: number;
  limit: number;
}

interface PublicProductBase {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  brand: string | null;
  tags: string[];
  status: "active" | "out_of_stock";
  availableQuantity: number;
  reservedQuantity: number;
  publishedAt: Date | null;
  storeName: string;
  storeHandle: string;
  storeProvince: string;
  storeCityDistrict: string;
  storeLogoUrl: string | null;
  storeCoverImageUrl: string | null;
  storeDescription: string | null;
  storePreferredLocale: string;
  marketplaceCategoryId: string | null;
  marketplaceCategoryParentId: string | null;
  marketplaceCategorySlug: string | null;
  marketplaceCategoryNameFa: string | null;
  marketplaceCategoryNamePs: string | null;
  marketplaceCategoryNameEn: string | null;
  marketplaceCategoryImageUrl: string | null;
  marketplaceCategoryIcon: string | null;
  marketplaceCategorySortOrder: number | null;
  viewCount: number | null;
}

function toStoreSummary(row: PublicProductBase): MarketplaceStoreSummary {
  return {
    id: row.storeId,
    name: row.storeName,
    handle: row.storeHandle,
    province: row.storeProvince,
    cityDistrict: row.storeCityDistrict,
    logoUrl: row.storeLogoUrl,
    coverImageUrl: row.storeCoverImageUrl,
    description: row.storeDescription,
    preferredLocale:
      row.storePreferredLocale === "ps-AF" || row.storePreferredLocale === "en"
        ? row.storePreferredLocale
        : "fa-AF"
  };
}

function toMarketplaceCategory(
  row: PublicProductBase
): MarketplaceCategoryRecord | null {
  if (
    !row.marketplaceCategoryId ||
    !row.marketplaceCategorySlug ||
    !row.marketplaceCategoryNameFa ||
    !row.marketplaceCategoryNamePs ||
    !row.marketplaceCategoryNameEn
  ) {
    return null;
  }

  return {
    id: row.marketplaceCategoryId,
    parentId: row.marketplaceCategoryParentId,
    slug: row.marketplaceCategorySlug,
    nameFa: row.marketplaceCategoryNameFa,
    namePs: row.marketplaceCategoryNamePs,
    nameEn: row.marketplaceCategoryNameEn,
    imageUrl: row.marketplaceCategoryImageUrl,
    icon: row.marketplaceCategoryIcon,
    sortOrder: row.marketplaceCategorySortOrder ?? 0
  };
}

function variantFreeStock(
  variant: {
    available: boolean;
    availableQuantity: number;
    reservedQuantity: number;
  }
): number {
  return variant.available
    ? Math.max(0, variant.availableQuantity - variant.reservedQuantity)
    : 0;
}

function toVariantSummary(
  row: typeof productVariants.$inferSelect
): MarketplaceVariantSummary {
  return {
    id: row.id,
    title: row.title,
    optionValues: row.optionValues,
    priceOverride:
      row.priceOverride === null ? null : Number(row.priceOverride),
    imageUrl: row.imageUrl,
    available: row.available,
    inStock: variantFreeStock(row) > 0
  };
}

function lowestSellPrice(
  basePrice: number,
  variants: MarketplaceVariantSummary[]
): number {
  const availablePrices = variants
    .filter((variant) => variant.available)
    .map((variant) => variant.priceOverride)
    .filter((price): price is number => price !== null);

  return availablePrices.length > 0
    ? Math.min(basePrice, ...availablePrices)
    : basePrice;
}

function productInStock(
  row: PublicProductBase,
  variants: MarketplaceVariantSummary[]
): boolean {
  if (variants.length > 0) {
    return variants.some((variant) => variant.inStock);
  }

  return (
    row.status === "active" &&
    row.availableQuantity - row.reservedQuantity > 0
  );
}

function publicStoreRecord(
  row: typeof stores.$inferSelect
): PublicStoreRecord {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    category: row.category,
    province: row.province,
    cityDistrict: row.cityDistrict,
    phone: row.phone,
    preferredLocale:
      row.preferredLocale === "ps-AF" || row.preferredLocale === "en"
        ? row.preferredLocale
        : "fa-AF",
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    description: row.description,
    whatsappNumber: row.whatsappNumber,
    physicalAddress: row.physicalAddress,
    mapLatitude: row.mapLatitude,
    mapLongitude: row.mapLongitude,
    businessHours: row.businessHours,
    theme: row.theme,
    accentColor: row.accentColor,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export interface MarketplaceRepository {
  listCategories(): Promise<MarketplaceCategoryRecord[]>;
  browse(
    query: MarketplaceBrowseQuery
  ): Promise<{ products: MarketplaceProductSummary[]; total: number }>;
  featuredStores(limit: number): Promise<MarketplaceFeaturedStore[]>;
  suggestions(query: string, limit: number): Promise<MarketplaceSearchSuggestion[]>;
  findProduct(productId: string): Promise<MarketplaceProductDetail | null>;
  relatedProducts(
    productId: string,
    categoryId: string | null,
    storeId: string,
    limit: number
  ): Promise<MarketplaceProductSummary[]>;
  findProductsByIds(productIds: string[]): Promise<MarketplaceProductSummary[]>;
  recordProductView(productId: string): Promise<boolean>;
  getStorePage(
    handle: string,
    offset: number,
    limit: number
  ): Promise<MarketplaceStorePageResponse | null>;
}

export class DatabaseMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly db: Database) {}

  private publicConditions(): SQL[] {
    return [
      eq(stores.status, "published"),
      or(eq(products.status, "active"), eq(products.status, "out_of_stock"))!
    ];
  }

  private baseSelect() {
    return {
      id: products.id,
      storeId: products.storeId,
      name: products.name,
      description: products.description,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      brand: products.brand,
      tags: products.tags,
      status: products.status,
      availableQuantity: products.availableQuantity,
      reservedQuantity: products.reservedQuantity,
      publishedAt: products.publishedAt,
      storeName: stores.name,
      storeHandle: stores.handle,
      storeProvince: stores.province,
      storeCityDistrict: stores.cityDistrict,
      storeLogoUrl: stores.logoUrl,
      storeCoverImageUrl: stores.coverImageUrl,
      storeDescription: stores.description,
      storePreferredLocale: stores.preferredLocale,
      marketplaceCategoryId: platformCategories.id,
      marketplaceCategoryParentId: platformCategories.parentId,
      marketplaceCategorySlug: platformCategories.slug,
      marketplaceCategoryNameFa: platformCategories.nameFa,
      marketplaceCategoryNamePs: platformCategories.namePs,
      marketplaceCategoryNameEn: platformCategories.nameEn,
      marketplaceCategoryImageUrl: platformCategories.imageUrl,
      marketplaceCategoryIcon: platformCategories.icon,
      marketplaceCategorySortOrder: platformCategories.sortOrder,
      viewCount: marketplaceProductMetrics.viewCount
    };
  }

  private async hydrate(
    rows: PublicProductBase[]
  ): Promise<{
    summaries: MarketplaceProductSummary[];
    details: Map<string, {
      images: Array<{
        id: string;
        url: string;
        altText: string | null;
        sortOrder: number;
      }>;
      variants: MarketplaceVariantSummary[];
    }>;
  }> {
    if (rows.length === 0) {
      return { summaries: [], details: new Map() };
    }

    const productIds = rows.map((row) => row.id);
    const [images, variants] = await Promise.all([
      this.db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt)),
      this.db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds))
        .orderBy(asc(productVariants.createdAt))
    ]);

    const detailMap = new Map<string, {
      images: Array<{
        id: string;
        url: string;
        altText: string | null;
        sortOrder: number;
      }>;
      variants: MarketplaceVariantSummary[];
    }>();

    for (const id of productIds) {
      detailMap.set(id, {
        images: images
          .filter((image) => image.productId === id)
          .map((image) => ({
            id: image.id,
            url: image.url,
            altText: image.altText,
            sortOrder: image.sortOrder
          })),
        variants: variants
          .filter((variant) => variant.productId === id)
          .map(toVariantSummary)
      });
    }

    const summaries = rows.map((row) => {
      const detail = detailMap.get(row.id);
      const productVariants = detail?.variants ?? [];
      const basePrice = Number(row.price);
      const displayPrice = lowestSellPrice(basePrice, productVariants);
      const compareAtPrice =
        row.compareAtPrice === null ? null : Number(row.compareAtPrice);
      const inStock = productInStock(row, productVariants);

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: displayPrice,
        compareAtPrice,
        brand: row.brand,
        status: inStock ? "active" : "out_of_stock",
        imageUrl: detail?.images[0]?.url ?? productVariants.find((v) => v.imageUrl)?.imageUrl ?? null,
        inStock,
        hasDiscount:
          compareAtPrice !== null && compareAtPrice > displayPrice,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        store: toStoreSummary(row),
        marketplaceCategory: toMarketplaceCategory(row)
      } satisfies MarketplaceProductSummary;
    });

    return { summaries, details: detailMap };
  }

  private async publicRows(
    query: MarketplaceBrowseQuery
  ): Promise<{ rows: PublicProductBase[]; total: number }> {
    const conditions = this.publicConditions();

    if (query.query) {
      const term = `%${query.query}%`;
      conditions.push(
        or(
          ilike(products.name, term),
          ilike(stores.name, term),
          ilike(stores.handle, term),
          ilike(products.brand, term),
          ilike(products.description, term),
          ilike(platformCategories.nameFa, term),
          ilike(platformCategories.namePs, term),
          ilike(platformCategories.nameEn, term),
          sql`${products.tags}::text ilike ${term}`
        )!
      );
    }

    if (query.categoryId) {
      conditions.push(
        or(
          eq(products.marketplaceCategoryId, query.categoryId),
          sql`${products.marketplaceCategoryId} in (
            select id from ${platformCategories}
            where ${platformCategories.parentId} = ${query.categoryId}
              and ${platformCategories.active} = true
          )`
        )!
      );
    }

    if (query.minPrice !== undefined) {
      conditions.push(gte(products.price, query.minPrice.toFixed(2)));
    }

    if (query.maxPrice !== undefined) {
      conditions.push(lte(products.price, query.maxPrice.toFixed(2)));
    }

    if (query.province) {
      conditions.push(ilike(stores.province, query.province));
    }

    if (query.storeId) {
      conditions.push(eq(stores.id, query.storeId));
    }

    if (query.brand) {
      conditions.push(ilike(products.brand, query.brand));
    }

    if (query.inStock !== undefined) {
      conditions.push(
        eq(products.status, query.inStock ? "active" : "out_of_stock")
      );
    }

    if (query.discount === true) {
      conditions.push(
        and(
          isNotNull(products.compareAtPrice),
          sql`${products.compareAtPrice} > ${products.price}`
        )!
      );
    }

    const searchRank = query.query
      ? sql<number>`case
          when lower(${products.name}) = lower(${query.query}) then 100
          when lower(${products.name}) like lower(${query.query + "%"}) then 80
          when lower(${stores.name}) like lower(${query.query + "%"}) then 60
          else 20
        end
        + case when ${products.status} = 'active' then 10 else 0 end
        + least(coalesce(${marketplaceProductMetrics.viewCount}, 0), 1000) / 100.0`
      : sql<number>`case when ${products.status} = 'active' then 10 else 0 end
        + least(coalesce(${marketplaceProductMetrics.viewCount}, 0), 1000) / 100.0`;

    const orderBy = (() => {
      switch (query.sort) {
        case "price_asc":
          return [asc(products.price), desc(products.publishedAt)];
        case "price_desc":
          return [desc(products.price), desc(products.publishedAt)];
        case "newest":
          return [desc(products.publishedAt), desc(products.createdAt)];
        case "popularity":
          return [
            desc(sql`coalesce(${marketplaceProductMetrics.viewCount}, 0)`),
            desc(products.publishedAt)
          ];
        case "rating":
          // Reviews are introduced in the trust phase. Keep stable organic
          // ordering until rating data exists instead of fabricating ratings.
          return [desc(searchRank), desc(products.publishedAt)];
        case "relevance":
        default:
          return [desc(searchRank), desc(products.publishedAt)];
      }
    })();

    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select(this.baseSelect())
        .from(products)
        .innerJoin(stores, eq(stores.id, products.storeId))
        .leftJoin(
          platformCategories,
          eq(platformCategories.id, products.marketplaceCategoryId)
        )
        .leftJoin(
          marketplaceProductMetrics,
          eq(marketplaceProductMetrics.productId, products.id)
        )
        .where(where)
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(products)
        .innerJoin(stores, eq(stores.id, products.storeId))
        .leftJoin(
          platformCategories,
          eq(platformCategories.id, products.marketplaceCategoryId)
        )
        .where(where)
    ]);

    return {
      rows: rows as PublicProductBase[],
      total: totalRows[0]?.value ?? 0
    };
  }

  async listCategories(): Promise<MarketplaceCategoryRecord[]> {
    const rows = await this.db
      .select()
      .from(platformCategories)
      .where(eq(platformCategories.active, true))
      .orderBy(asc(platformCategories.sortOrder), asc(platformCategories.nameEn));

    return rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      slug: row.slug,
      nameFa: row.nameFa,
      namePs: row.namePs,
      nameEn: row.nameEn,
      imageUrl: row.imageUrl,
      icon: row.icon,
      sortOrder: row.sortOrder
    }));
  }

  async browse(
    query: MarketplaceBrowseQuery
  ): Promise<{ products: MarketplaceProductSummary[]; total: number }> {
    const { rows, total } = await this.publicRows(query);
    const hydrated = await this.hydrate(rows);

    return {
      products: hydrated.summaries,
      total
    };
  }

  async featuredStores(limit: number): Promise<MarketplaceFeaturedStore[]> {
    const rows = await this.db
      .select({
        store: stores,
        activeProductCount: count(products.id)
      })
      .from(stores)
      .innerJoin(
        products,
        and(
          eq(products.storeId, stores.id),
          or(eq(products.status, "active"), eq(products.status, "out_of_stock"))
        )
      )
      .where(eq(stores.status, "published"))
      .groupBy(stores.id)
      .orderBy(desc(count(products.id)), desc(stores.publishedAt))
      .limit(limit);

    return rows.map(({ store, activeProductCount }) => ({
      store: {
        id: store.id,
        name: store.name,
        handle: store.handle,
        province: store.province,
        cityDistrict: store.cityDistrict,
        logoUrl: store.logoUrl,
        coverImageUrl: store.coverImageUrl,
        description: store.description,
        preferredLocale:
          store.preferredLocale === "ps-AF" || store.preferredLocale === "en"
            ? store.preferredLocale
            : "fa-AF"
      },
      activeProductCount
    }));
  }

  async suggestions(
    query: string,
    limit: number
  ): Promise<MarketplaceSearchSuggestion[]> {
    const term = `%${query}%`;
    const perType = Math.max(1, Math.ceil(limit / 4));

    const [productRows, storeRows, categoryRows, brandRows] = await Promise.all([
      this.db
        .select({ id: products.id, label: products.name, secondary: stores.name })
        .from(products)
        .innerJoin(stores, eq(stores.id, products.storeId))
        .where(
          and(
            ...this.publicConditions(),
            ilike(products.name, term)
          )
        )
        .orderBy(desc(products.publishedAt))
        .limit(perType),
      this.db
        .select({ id: stores.id, label: stores.name, secondary: stores.province })
        .from(stores)
        .where(
          and(
            eq(stores.status, "published"),
            or(ilike(stores.name, term), ilike(stores.handle, term))
          )
        )
        .orderBy(desc(stores.publishedAt))
        .limit(perType),
      this.db
        .select({
          id: platformCategories.id,
          label: platformCategories.nameEn,
          secondary: platformCategories.nameFa
        })
        .from(platformCategories)
        .where(
          and(
            eq(platformCategories.active, true),
            or(
              ilike(platformCategories.nameEn, term),
              ilike(platformCategories.nameFa, term),
              ilike(platformCategories.namePs, term)
            )
          )
        )
        .orderBy(asc(platformCategories.sortOrder))
        .limit(perType),
      this.db
        .selectDistinct({ label: products.brand })
        .from(products)
        .innerJoin(stores, eq(stores.id, products.storeId))
        .where(
          and(
            ...this.publicConditions(),
            isNotNull(products.brand),
            ilike(products.brand, term)
          )
        )
        .limit(perType)
    ]);

    const result: MarketplaceSearchSuggestion[] = [
      ...productRows.map((row) => ({
        type: "product" as const,
        id: row.id,
        label: row.label,
        secondaryLabel: row.secondary
      })),
      ...storeRows.map((row) => ({
        type: "store" as const,
        id: row.id,
        label: row.label,
        secondaryLabel: row.secondary
      })),
      ...categoryRows.map((row) => ({
        type: "category" as const,
        id: row.id,
        label: row.label,
        secondaryLabel: row.secondary
      })),
      ...brandRows
        .filter((row): row is { label: string } => Boolean(row.label))
        .map((row) => ({
          type: "brand" as const,
          id: "brand:" + row.label,
          label: row.label,
          secondaryLabel: null
        }))
    ];

    return result.slice(0, limit);
  }

  async findProduct(productId: string): Promise<MarketplaceProductDetail | null> {
    const [row] = await this.db
      .select(this.baseSelect())
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .leftJoin(
        platformCategories,
        eq(platformCategories.id, products.marketplaceCategoryId)
      )
      .leftJoin(
        marketplaceProductMetrics,
        eq(marketplaceProductMetrics.productId, products.id)
      )
      .where(and(...this.publicConditions(), eq(products.id, productId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const hydrated = await this.hydrate([row as PublicProductBase]);
    const summary = hydrated.summaries[0];
    const detail = hydrated.details.get(productId);

    if (!summary || !detail) {
      return null;
    }

    return {
      ...summary,
      images: detail.images,
      variants: detail.variants,
      tags: row.tags
    };
  }

  async relatedProducts(
    productId: string,
    categoryId: string | null,
    storeId: string,
    limit: number
  ): Promise<MarketplaceProductSummary[]> {
    const categoryCondition = categoryId
      ? eq(products.marketplaceCategoryId, categoryId)
      : eq(products.storeId, storeId);

    const rows = await this.db
      .select(this.baseSelect())
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .leftJoin(
        platformCategories,
        eq(platformCategories.id, products.marketplaceCategoryId)
      )
      .leftJoin(
        marketplaceProductMetrics,
        eq(marketplaceProductMetrics.productId, products.id)
      )
      .where(
        and(
          ...this.publicConditions(),
          ne(products.id, productId),
          categoryCondition
        )
      )
      .orderBy(
        desc(sql`coalesce(${marketplaceProductMetrics.viewCount}, 0)`),
        desc(products.publishedAt)
      )
      .limit(limit);

    return (await this.hydrate(rows as PublicProductBase[])).summaries;
  }

  async findProductsByIds(
    productIds: string[]
  ): Promise<MarketplaceProductSummary[]> {
    if (productIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select(this.baseSelect())
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .leftJoin(
        platformCategories,
        eq(platformCategories.id, products.marketplaceCategoryId)
      )
      .leftJoin(
        marketplaceProductMetrics,
        eq(marketplaceProductMetrics.productId, products.id)
      )
      .where(
        and(
          ...this.publicConditions(),
          inArray(products.id, productIds)
        )
      );

    const summaries = (await this.hydrate(rows as PublicProductBase[])).summaries;
    const byId = new Map(summaries.map((product) => [product.id, product]));

    return productIds
      .map((id) => byId.get(id))
      .filter((product): product is MarketplaceProductSummary => Boolean(product));
  }

  async recordProductView(productId: string): Promise<boolean> {
    const [visible] = await this.db
      .select({ id: products.id })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .where(and(...this.publicConditions(), eq(products.id, productId)))
      .limit(1);

    if (!visible) {
      return false;
    }

    await this.db
      .insert(marketplaceProductMetrics)
      .values({
        productId,
        viewCount: 1,
        lastViewedAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: marketplaceProductMetrics.productId,
        set: {
          viewCount: sql`${marketplaceProductMetrics.viewCount} + 1`,
          lastViewedAt: new Date(),
          updatedAt: new Date()
        }
      });

    return true;
  }

  async getStorePage(
    handle: string,
    offset: number,
    limit: number
  ): Promise<MarketplaceStorePageResponse | null> {
    const [store] = await this.db
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.handle, handle),
          eq(stores.status, "published")
        )
      )
      .limit(1);

    if (!store) {
      return null;
    }

    const [categoryRows, browseResult] = await Promise.all([
      this.db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.storeId, store.id),
            eq(categories.status, "active")
          )
        )
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
      this.browse({
        storeId: store.id,
        sort: "newest",
        offset,
        limit
      })
    ]);

    return {
      store: publicStoreRecord(store),
      categories: categoryRows.map((category) => ({
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        imageUrl: category.imageUrl,
        icon: category.icon,
        sortOrder: category.sortOrder
      })),
      products: browseResult.products,
      pageInfo: {
        offset,
        limit,
        total: browseResult.total,
        hasMore: offset + browseResult.products.length < browseResult.total
      }
    };
  }
}
