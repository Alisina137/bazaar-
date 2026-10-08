import type {
  CreateMerchantCouponInput,
  CreateMerchantPromotionInput,
  MerchantAnalyticsResponse,
  MerchantCouponRecord,
  MerchantDashboardResponse,
  MerchantPromotionRecord,
  MerchantStaffInviteRecord,
  MerchantStaffPermission,
  MerchantStaffRecord,
  MerchantStaffResponse,
  SubscriptionChangeRecord,
  SubscriptionPlanCode,
  SubscriptionPlanUsage,
  SubscriptionResourcePage,
  SubscriptionResourceType,
  SubscriptionStatus,
  UpdateMerchantCouponInput,
  UpdateMerchantPromotionInput,
  UpdateMerchantStaffInput
} from "@bazaarlink/contracts";
import {
  authAccounts,
  categories,
  growthAnalyticsEvents,
  inventoryMovements,
  marketplaceProductMetrics,
  orderItems,
  orders,
  paymentAttempts,
  productPromotions,
  productReviews,
  products,
  storeCoupons,
  storeStaff,
  storeStaffInvites,
  storeSubscriptions,
  stores,
  subscriptionChanges,
  userRoles,
  users,
  type Database,
  type ProductPromotion,
  type StoreCoupon,
  type StoreStaffInvite
} from "@bazaarlink/database";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  ne,
  sql
} from "drizzle-orm";

import { getStoreEntitlements } from "../store/entitlements.js";
import { GrowthRepositoryConflictError } from "./errors.js";

export interface ResolvedGrowthAccess {
  storeId: string;
  ownerUserId: string;
  plan: SubscriptionPlanCode;
  subscriptionStatus: SubscriptionStatus;
  role: "owner" | "staff";
  permissions: MerchantStaffPermission[];
}

export interface SubscriptionResources {
  products: Array<{
    id: string;
    status: "draft" | "active" | "out_of_stock" | "archived" | "plan_restricted";
  }>;
  activeCategoryIds: string[];
  activeStaffIds: string[];
}

export interface GrowthRepository {
  resolveAccess(
    actorUserId: string,
    storeId: string
  ): Promise<ResolvedGrowthAccess | null>;
  assignedStoreAccesses(
    actorUserId: string
  ): Promise<ResolvedGrowthAccess[]>;
  dashboard(storeId: string): Promise<MerchantDashboardResponse>;
  analytics(
    storeId: string,
    plan: SubscriptionPlanCode,
    days: number
  ): Promise<MerchantAnalyticsResponse>;
  listCoupons(storeId: string): Promise<MerchantCouponRecord[]>;
  createCoupon(
    storeId: string,
    input: CreateMerchantCouponInput
  ): Promise<MerchantCouponRecord>;
  updateCoupon(
    storeId: string,
    couponId: string,
    input: UpdateMerchantCouponInput
  ): Promise<MerchantCouponRecord | null>;
  deleteCoupon(storeId: string, couponId: string): Promise<boolean>;
  listPromotions(storeId: string): Promise<MerchantPromotionRecord[]>;
  createPromotion(
    storeId: string,
    input: CreateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord | null>;
  updatePromotion(
    storeId: string,
    promotionId: string,
    input: UpdateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord | null>;
  deletePromotion(storeId: string, promotionId: string): Promise<boolean>;
  productForPromotion(
    storeId: string,
    productId: string
  ): Promise<{ id: string; price: number } | null>;
  overlappingPromotion(
    productId: string,
    startsAt: Date,
    endsAt: Date,
    excludingId?: string
  ): Promise<boolean>;
  listStaff(storeId: string): Promise<MerchantStaffResponse>;
  createInvite(input: {
    storeId: string;
    email: string;
    permissions: MerchantStaffPermission[];
    tokenHash: string;
    inviteCode: string;
    invitedByUserId: string;
    expiresAt: Date;
  }): Promise<MerchantStaffInviteRecord>;
  revokeInvite(storeId: string, inviteId: string): Promise<boolean>;
  acceptInvite(input: {
    actorUserId: string;
    tokenHash: string;
    now: Date;
  }): Promise<
    MerchantStaffRecord | "email_mismatch" | "expired" | "limit" | null
  >;
  updateStaff(
    storeId: string,
    staffId: string,
    input: UpdateMerchantStaffInput
  ): Promise<MerchantStaffRecord | null>;
  removeStaff(storeId: string, staffId: string): Promise<boolean>;
  subscriptionResources(storeId: string): Promise<SubscriptionResources>;
  subscriptionResourcePage(
    storeId: string,
    type: SubscriptionResourceType,
    offset: number,
    limit: number
  ): Promise<SubscriptionResourcePage>;
  validateSubscriptionResourceIds(
    storeId: string,
    type: SubscriptionResourceType,
    ids: string[]
  ): Promise<boolean>;
  applySubscriptionChange(input: {
    ownerUserId: string;
    storeId: string;
    toPlan: SubscriptionPlanCode;
    keepProductIds: string[] | null;
    keepCategoryIds: string[] | null;
    keepStaffIds: string[] | null;
    gracePeriodEnd: Date | null;
  }): Promise<SubscriptionChangeRecord>;
  planUsage(storeId: string): Promise<SubscriptionPlanUsage>;
  recordEvent(input: {
    name: string;
    userId?: string | null;
    storeId?: string | null;
    productId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (candidate.code === "23505") return true;
  return candidate.cause ? isUniqueViolation(candidate.cause) : false;
}

function money(value: string | number | null): number {
  return value === null ? 0 : Number(value);
}

function toCoupon(row: StoreCoupon): MerchantCouponRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    minimumOrderAmount:
      row.minimumOrderAmount === null ? null : Number(row.minimumOrderAmount),
    active: row.active,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toPromotion(
  row: ProductPromotion,
  productName: string
): MerchantPromotionRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    productId: row.productId,
    productName,
    name: row.name,
    promotionalPrice: Number(row.promotionalPrice),
    active: row.active,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function normalizedPermissions(
  values: unknown
): MerchantStaffPermission[] {
  const allowed = new Set<MerchantStaffPermission>([
    "products",
    "inventory",
    "orders",
    "customers",
    "discounts",
    "analytics",
    "delivery",
    "storefront"
  ]);
  return Array.isArray(values)
    ? values.filter(
        (value): value is MerchantStaffPermission =>
          typeof value === "string" &&
          allowed.has(value as MerchantStaffPermission)
      )
    : [];
}

export class DatabaseGrowthRepository implements GrowthRepository {
  constructor(private readonly db: Database) {}

  async resolveAccess(
    actorUserId: string,
    storeId: string
  ): Promise<ResolvedGrowthAccess | null> {
    const [store] = await this.db
      .select({
        storeId: stores.id,
        ownerUserId: stores.ownerUserId,
        plan: storeSubscriptions.plan,
        subscriptionStatus: storeSubscriptions.status
      })
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!store) return null;
    if (store.ownerUserId === actorUserId) {
      return {
        ...store,
        role: "owner",
        permissions: [
          "products",
          "inventory",
          "orders",
          "customers",
          "discounts",
          "analytics",
          "delivery",
          "storefront"
        ]
      };
    }

    const [staff] = await this.db
      .select({
        permissions: storeStaff.permissions
      })
      .from(storeStaff)
      .where(
        and(
          eq(storeStaff.storeId, storeId),
          eq(storeStaff.userId, actorUserId),
          eq(storeStaff.status, "active")
        )
      )
      .limit(1);

    if (!staff) return null;

    return {
      ...store,
      role: "staff",
      permissions: normalizedPermissions(staff.permissions)
    };
  }

  async assignedStoreAccesses(
    actorUserId: string
  ): Promise<ResolvedGrowthAccess[]> {
    const rows = await this.db
      .select({
        storeId: stores.id,
        ownerUserId: stores.ownerUserId,
        plan: storeSubscriptions.plan,
        subscriptionStatus: storeSubscriptions.status,
        permissions: storeStaff.permissions
      })
      .from(storeStaff)
      .innerJoin(stores, eq(stores.id, storeStaff.storeId))
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(
        and(
          eq(storeStaff.userId, actorUserId),
          eq(storeStaff.status, "active")
        )
      );

    return rows.map((row) => ({
      storeId: row.storeId,
      ownerUserId: row.ownerUserId,
      plan: row.plan,
      subscriptionStatus: row.subscriptionStatus,
      role: "staff" as const,
      permissions: normalizedPermissions(row.permissions)
    }));
  }

  async dashboard(storeId: string): Promise<MerchantDashboardResponse> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [
      storeRows,
      todayRows,
      newOrders,
      lowStock,
      failedPayments,
      deliveryIssues,
      recentOrders,
      recentReviews,
      recentInventory
    ] = await Promise.all([
      this.db
        .select({
          status: stores.status,
          plan: storeSubscriptions.plan,
          productLimit: sql<number>`0`,
          activeProducts: sql<number>`(
            select count(*)::int from "products" p
            where p."store_id" = ${storeId}
              and p."status" in ('active', 'out_of_stock')
          )`,
          productCount: sql<number>`(
            select count(*)::int from "products" p
            where p."store_id" = ${storeId}
              and p."status" not in ('archived', 'plan_restricted')
          )`
        })
        .from(stores)
        .innerJoin(
          storeSubscriptions,
          eq(storeSubscriptions.storeId, stores.id)
        )
        .where(eq(stores.id, storeId))
        .limit(1),
      this.db
        .select({
          orders: sql<number>`count(*)::int`,
          sales: sql<string>`coalesce(sum(
            case when ${orders.state} in ('delivered','picked_up')
              then ${orders.total} else 0 end
          ),0)`,
          customers: sql<number>`count(distinct ${orders.customerUserId})::int`
        })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), gte(orders.placedAt, start))),
      this.db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, storeId),
            eq(orders.state, "pending_confirmation")
          )
        ),
      this.db
        .select({
          value: sql<number>`count(*)::int`
        })
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            sql`${products.status} <> 'archived'`,
            sql`greatest(${products.availableQuantity} - ${products.reservedQuantity}, 0) <= ${products.lowStockThreshold}`
          )
        ),
      this.db
        .select({ value: count() })
        .from(paymentAttempts)
        .where(
          and(
            eq(paymentAttempts.storeId, storeId),
            eq(paymentAttempts.state, "failed")
          )
        ),
      this.db
        .select({ value: count() })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, storeId),
            eq(orders.state, "delivery_failed")
          )
        ),
      this.db
        .select({
          id: orders.id,
          label: orders.orderNumber,
          createdAt: orders.updatedAt
        })
        .from(orders)
        .where(eq(orders.storeId, storeId))
        .orderBy(desc(orders.updatedAt))
        .limit(5),
      this.db
        .select({
          id: productReviews.id,
          label: products.name,
          createdAt: productReviews.createdAt
        })
        .from(productReviews)
        .innerJoin(products, eq(products.id, productReviews.productId))
        .where(eq(productReviews.storeId, storeId))
        .orderBy(desc(productReviews.createdAt))
        .limit(5),
      this.db
        .select({
          id: inventoryMovements.id,
          label: products.name,
          createdAt: inventoryMovements.createdAt
        })
        .from(inventoryMovements)
        .innerJoin(products, eq(products.id, inventoryMovements.productId))
        .where(eq(inventoryMovements.storeId, storeId))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(5)
    ]);

    const store = storeRows[0];
    if (!store) throw new Error("growth_store_missing");
    const entitlements = getStoreEntitlements(store.plan);
    const today = todayRows[0];

    const activity = [
      ...recentOrders.map((row) => ({
        id: row.id,
        type: "order" as const,
        label: row.label,
        createdAt: row.createdAt.toISOString()
      })),
      ...recentReviews.map((row) => ({
        id: row.id,
        type: "review" as const,
        label: row.label,
        createdAt: row.createdAt.toISOString()
      })),
      ...recentInventory.map((row) => ({
        id: row.id,
        type: "inventory" as const,
        label: row.label,
        createdAt: row.createdAt.toISOString()
      }))
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);

    return {
      storeId,
      today: {
        orders: today?.orders ?? 0,
        sales: money(today?.sales ?? 0),
        customers: today?.customers ?? 0
      },
      needsAttention: {
        newOrders: newOrders[0]?.value ?? 0,
        lowStock: lowStock[0]?.value ?? 0,
        failedPayments: failedPayments[0]?.value ?? 0,
        deliveryIssues: deliveryIssues[0]?.value ?? 0
      },
      store: {
        activeProducts: store.activeProducts,
        plan: store.plan,
        productLimit: entitlements.productLimit,
        productCount: store.productCount,
        storeStatus: store.status
      },
      recentActivity: activity
    };
  }

  async analytics(
    storeId: string,
    plan: SubscriptionPlanCode,
    days: number
  ): Promise<MerchantAnalyticsResponse> {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const advanced = getStoreEntitlements(plan).advancedAnalytics;

    const [summaryRows, topRows, trendRows, deliveryRows] =
      await Promise.all([
        this.db
          .select({
            totalOrders: sql<number>`count(*)::int`,
            totalSales: sql<string>`coalesce(sum(
              case when ${orders.state} in ('delivered','picked_up')
                then ${orders.total} else 0 end
            ),0)`,
            totalCustomers: sql<number>`count(distinct ${orders.customerUserId})::int`,
            productDiscount: sql<string>`coalesce(sum(${orders.productDiscount}),0)`,
            couponDiscount: sql<string>`coalesce(sum(${orders.couponDiscount}),0)`
          })
          .from(orders)
          .where(
            and(eq(orders.storeId, storeId), gte(orders.placedAt, cutoff))
          ),
        this.db
          .select({
            productId: orderItems.productId,
            name: sql<string>`max(${orderItems.productName})`,
            unitsSold: sql<number>`sum(${orderItems.quantity})::int`,
            revenue: sql<string>`sum(${orderItems.lineTotal})`,
            views: sql<number>`coalesce(max(${marketplaceProductMetrics.viewCount}),0)::int`
          })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .leftJoin(
            marketplaceProductMetrics,
            eq(marketplaceProductMetrics.productId, orderItems.productId)
          )
          .where(
            and(
              eq(orders.storeId, storeId),
              inArray(orders.state, ["delivered", "picked_up"]),
              gte(orders.placedAt, cutoff)
            )
          )
          .groupBy(orderItems.productId)
          .orderBy(desc(sql`sum(${orderItems.quantity})`))
          .limit(10),
        advanced
          ? this.db
              .select({
                date: sql<string>`to_char(${orders.placedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
                orders: sql<number>`count(*)::int`,
                revenue: sql<string>`coalesce(sum(
                  case when ${orders.state} in ('delivered','picked_up')
                    then ${orders.total} else 0 end
                ),0)`
              })
              .from(orders)
              .where(
                and(
                  eq(orders.storeId, storeId),
                  gte(orders.placedAt, cutoff)
                )
              )
              .groupBy(
                sql`to_char(${orders.placedAt} at time zone 'UTC', 'YYYY-MM-DD')`
              )
              .orderBy(
                asc(sql`to_char(${orders.placedAt} at time zone 'UTC', 'YYYY-MM-DD')`)
              )
          : Promise.resolve([]),
        advanced
          ? this.db
              .select({
                delivered: sql<number>`count(*) filter (
                  where ${orders.state} in ('delivered','picked_up')
                )::int`,
                failed: sql<number>`count(*) filter (
                  where ${orders.state} = 'delivery_failed'
                )::int`
              })
              .from(orders)
              .where(
                and(
                  eq(orders.storeId, storeId),
                  gte(orders.placedAt, cutoff)
                )
              )
          : Promise.resolve([])
      ]);

    const summary = summaryRows[0];
    let repeatCustomers: number | null = null;
    if (advanced) {
      const customerOrderCounts = await this.db
        .select({
          customerUserId: orders.customerUserId,
          orderCount: sql<number>`count(*)::int`
        })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, storeId),
            gte(orders.placedAt, cutoff)
          )
        )
        .groupBy(orders.customerUserId);

      repeatCustomers = customerOrderCounts.filter(
        (row) => row.orderCount > 1
      ).length;
    }

    const totalCustomers = summary?.totalCustomers ?? 0;
    const delivered = deliveryRows[0]?.delivered ?? null;
    const failed = deliveryRows[0]?.failed ?? null;

    return {
      storeId,
      plan,
      advanced,
      periodDays: days,
      totalOrders: summary?.totalOrders ?? 0,
      totalSales: money(summary?.totalSales ?? 0),
      totalCustomers,
      repeatCustomers,
      repeatCustomerRate:
        advanced && totalCustomers > 0 && repeatCustomers !== null
          ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10
          : null,
      conversionRate: null,
      productDiscountTotal: money(summary?.productDiscount ?? 0),
      couponDiscountTotal: money(summary?.couponDiscount ?? 0),
      deliveryCompletedCount: delivered,
      deliveryFailedCount: failed,
      topProducts: topRows.map((row) => ({
        productId: row.productId,
        name: row.name,
        unitsSold: row.unitsSold,
        revenue: money(row.revenue),
        views: row.views
      })),
      revenueTrend: advanced
        ? trendRows.map((row) => ({
            date: row.date,
            value: money(row.revenue)
          }))
        : null,
      orderTrend: advanced
        ? trendRows.map((row) => ({
            date: row.date,
            value: row.orders
          }))
        : null,
      trafficSourceAvailable: false
    };
  }

  async listCoupons(storeId: string): Promise<MerchantCouponRecord[]> {
    return (
      await this.db
        .select()
        .from(storeCoupons)
        .where(eq(storeCoupons.storeId, storeId))
        .orderBy(desc(storeCoupons.createdAt))
    ).map(toCoupon);
  }

  async createCoupon(
    storeId: string,
    input: CreateMerchantCouponInput
  ): Promise<MerchantCouponRecord> {
    try {
      const [row] = await this.db
        .insert(storeCoupons)
        .values({
          storeId,
          code: input.code.trim().toUpperCase(),
          type: input.type,
          value: input.value.toFixed(2),
          minimumOrderAmount:
            input.minimumOrderAmount === null ||
            input.minimumOrderAmount === undefined
              ? null
              : input.minimumOrderAmount.toFixed(2),
          active: input.active ?? true,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null
        })
        .returning();
      if (!row) throw new Error("coupon_create_failed");
      return toCoupon(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new GrowthRepositoryConflictError("coupon");
      }
      throw error;
    }
  }

  async updateCoupon(
    storeId: string,
    couponId: string,
    input: UpdateMerchantCouponInput
  ): Promise<MerchantCouponRecord | null> {
    try {
      const [row] = await this.db
        .update(storeCoupons)
        .set({
          ...(input.code !== undefined
            ? { code: input.code.trim().toUpperCase() }
            : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.value !== undefined
            ? { value: input.value.toFixed(2) }
            : {}),
          ...(input.minimumOrderAmount !== undefined
            ? {
                minimumOrderAmount:
                  input.minimumOrderAmount === null
                    ? null
                    : input.minimumOrderAmount.toFixed(2)
              }
            : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.startsAt !== undefined
            ? {
                startsAt: input.startsAt
                  ? new Date(input.startsAt)
                  : null
              }
            : {}),
          ...(input.endsAt !== undefined
            ? {
                endsAt: input.endsAt ? new Date(input.endsAt) : null
              }
            : {}),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(storeCoupons.id, couponId),
            eq(storeCoupons.storeId, storeId)
          )
        )
        .returning();
      return row ? toCoupon(row) : null;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new GrowthRepositoryConflictError("coupon");
      }
      throw error;
    }
  }

  async deleteCoupon(storeId: string, couponId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(storeCoupons)
      .where(
        and(
          eq(storeCoupons.id, couponId),
          eq(storeCoupons.storeId, storeId)
        )
      )
      .returning({ id: storeCoupons.id });
    return Boolean(row);
  }

  async listPromotions(storeId: string): Promise<MerchantPromotionRecord[]> {
    const rows = await this.db
      .select({
        promotion: productPromotions,
        productName: products.name
      })
      .from(productPromotions)
      .innerJoin(products, eq(products.id, productPromotions.productId))
      .where(eq(productPromotions.storeId, storeId))
      .orderBy(desc(productPromotions.createdAt));

    return rows.map((row) =>
      toPromotion(row.promotion, row.productName)
    );
  }

  async productForPromotion(
    storeId: string,
    productId: string
  ): Promise<{ id: string; price: number } | null> {
    const [row] = await this.db
      .select({ id: products.id, price: products.price })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.storeId, storeId),
          ne(products.status, "archived")
        )
      )
      .limit(1);
    return row ? { id: row.id, price: Number(row.price) } : null;
  }

  async overlappingPromotion(
    productId: string,
    startsAt: Date,
    endsAt: Date,
    excludingId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(productPromotions.productId, productId),
      eq(productPromotions.active, true),
      sql`${productPromotions.startsAt} < ${endsAt}`,
      sql`${productPromotions.endsAt} > ${startsAt}`
    ];
    if (excludingId) conditions.push(ne(productPromotions.id, excludingId));
    const [row] = await this.db
      .select({ id: productPromotions.id })
      .from(productPromotions)
      .where(and(...conditions))
      .limit(1);
    return Boolean(row);
  }

  async createPromotion(
    storeId: string,
    input: CreateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord | null> {
    const [product] = await this.db
      .select({ name: products.name })
      .from(products)
      .where(
        and(eq(products.id, input.productId), eq(products.storeId, storeId))
      )
      .limit(1);
    if (!product) return null;
    const [row] = await this.db
      .insert(productPromotions)
      .values({
        storeId,
        productId: input.productId,
        name: input.name.trim(),
        promotionalPrice: input.promotionalPrice.toFixed(2),
        active: input.active ?? true,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt)
      })
      .returning();
    return row ? toPromotion(row, product.name) : null;
  }

  async updatePromotion(
    storeId: string,
    promotionId: string,
    input: UpdateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord | null> {
    const [row] = await this.db
      .update(productPromotions)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.promotionalPrice !== undefined
          ? { promotionalPrice: input.promotionalPrice.toFixed(2) }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: new Date(input.startsAt) }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: new Date(input.endsAt) }
          : {}),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(productPromotions.id, promotionId),
          eq(productPromotions.storeId, storeId)
        )
      )
      .returning();
    if (!row) return null;
    const [product] = await this.db
      .select({ name: products.name })
      .from(products)
      .where(eq(products.id, row.productId))
      .limit(1);
    return toPromotion(row, product?.name ?? "");
  }

  async deletePromotion(
    storeId: string,
    promotionId: string
  ): Promise<boolean> {
    const [row] = await this.db
      .delete(productPromotions)
      .where(
        and(
          eq(productPromotions.id, promotionId),
          eq(productPromotions.storeId, storeId)
        )
      )
      .returning({ id: productPromotions.id });
    return Boolean(row);
  }

  private async staffRecord(staffId: string): Promise<MerchantStaffRecord | null> {
    const [row] = await this.db
      .select({
        staff: storeStaff,
        displayName: users.displayName,
        email: sql<string | null>`(
          select aa.identifier
          from ${authAccounts} aa
          where aa.user_id = ${storeStaff.userId}
            and aa.provider = 'email_password'
          order by aa.created_at asc
          limit 1
        )`
      })
      .from(storeStaff)
      .innerJoin(users, eq(users.id, storeStaff.userId))
      .where(eq(storeStaff.id, staffId))
      .limit(1);

    if (!row) return null;
    return {
      id: row.staff.id,
      storeId: row.staff.storeId,
      userId: row.staff.userId,
      displayName: row.displayName,
      email: row.email,
      permissions: normalizedPermissions(row.staff.permissions),
      status: row.staff.status,
      createdAt: row.staff.createdAt.toISOString(),
      updatedAt: row.staff.updatedAt.toISOString()
    };
  }

  async listStaff(storeId: string): Promise<MerchantStaffResponse> {
    const [staffRows, inviteRows, subscription] = await Promise.all([
      this.db
        .select({ id: storeStaff.id })
        .from(storeStaff)
        .where(eq(storeStaff.storeId, storeId))
        .orderBy(asc(storeStaff.createdAt)),
      this.db
        .select()
        .from(storeStaffInvites)
        .where(eq(storeStaffInvites.storeId, storeId))
        .orderBy(desc(storeStaffInvites.createdAt)),
      this.db
        .select({ plan: storeSubscriptions.plan })
        .from(storeSubscriptions)
        .where(eq(storeSubscriptions.storeId, storeId))
        .limit(1)
    ]);

    const staff = (
      await Promise.all(staffRows.map((row) => this.staffRecord(row.id)))
    ).filter((row): row is MerchantStaffRecord => Boolean(row));

    return {
      staff,
      invites: inviteRows.map((row) => this.inviteRecord(row, null)),
      staffLimit: getStoreEntitlements(subscription[0]?.plan ?? "starter")
        .staffLimit,
      activeStaffCount: staff.filter((row) => row.status === "active").length
    };
  }

  private inviteRecord(
    row: StoreStaffInvite,
    inviteCode: string | null
  ): MerchantStaffInviteRecord {
    return {
      id: row.id,
      storeId: row.storeId,
      email: row.email,
      permissions: normalizedPermissions(row.permissions),
      status: row.status,
      inviteCode,
      expiresAt: row.expiresAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    };
  }

  async createInvite(input: {
    storeId: string;
    email: string;
    permissions: MerchantStaffPermission[];
    tokenHash: string;
    inviteCode: string;
    invitedByUserId: string;
    expiresAt: Date;
  }): Promise<MerchantStaffInviteRecord> {
    try {
      const [row] = await this.db
        .insert(storeStaffInvites)
        .values({
          storeId: input.storeId,
          email: input.email.toLowerCase(),
          permissions: input.permissions,
          tokenHash: input.tokenHash,
          invitedByUserId: input.invitedByUserId,
          expiresAt: input.expiresAt
        })
        .returning();
      if (!row) throw new Error("staff_invite_create_failed");
      return this.inviteRecord(row, input.inviteCode);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new GrowthRepositoryConflictError("staff");
      }
      throw error;
    }
  }

  async revokeInvite(storeId: string, inviteId: string): Promise<boolean> {
    const [row] = await this.db
      .update(storeStaffInvites)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(
        and(
          eq(storeStaffInvites.id, inviteId),
          eq(storeStaffInvites.storeId, storeId),
          eq(storeStaffInvites.status, "pending")
        )
      )
      .returning({ id: storeStaffInvites.id });
    return Boolean(row);
  }

  async acceptInvite(input: {
    actorUserId: string;
    tokenHash: string;
    now: Date;
  }): Promise<
    MerchantStaffRecord | "email_mismatch" | "expired" | "limit" | null
  > {
    return this.db.transaction(async (tx) => {
      const [invite] = await tx
        .select()
        .from(storeStaffInvites)
        .where(eq(storeStaffInvites.tokenHash, input.tokenHash))
        .limit(1);
      if (!invite || invite.status !== "pending") return null;

      if (invite.expiresAt.getTime() < input.now.getTime()) {
        await tx
          .update(storeStaffInvites)
          .set({ status: "expired", updatedAt: input.now })
          .where(eq(storeStaffInvites.id, invite.id));
        return "expired";
      }

      const [email] = await tx
        .select({ identifier: authAccounts.identifier })
        .from(authAccounts)
        .where(
          and(
            eq(authAccounts.userId, input.actorUserId),
            eq(authAccounts.provider, "email_password")
          )
        )
        .limit(1);

      if (!email || email.identifier.toLowerCase() !== invite.email.toLowerCase()) {
        return "email_mismatch";
      }

      const [subscription] = await tx
        .select({ plan: storeSubscriptions.plan })
        .from(storeSubscriptions)
        .where(eq(storeSubscriptions.storeId, invite.storeId))
        .limit(1);
      const entitlements = getStoreEntitlements(
        subscription?.plan ?? "starter"
      );
      const [activeStaff] = await tx
        .select({ value: count() })
        .from(storeStaff)
        .where(
          and(
            eq(storeStaff.storeId, invite.storeId),
            eq(storeStaff.status, "active")
          )
        );
      if ((activeStaff?.value ?? 0) >= entitlements.staffLimit) {
        return "limit";
      }

      const [staff] = await tx
        .insert(storeStaff)
        .values({
          storeId: invite.storeId,
          userId: input.actorUserId,
          permissions: normalizedPermissions(invite.permissions),
          invitedByUserId: invite.invitedByUserId
        })
        .onConflictDoUpdate({
          target: [storeStaff.storeId, storeStaff.userId],
          set: {
            permissions: normalizedPermissions(invite.permissions),
            status: "active",
            updatedAt: input.now
          }
        })
        .returning();

      await tx
        .update(storeStaffInvites)
        .set({
          status: "accepted",
          acceptedAt: input.now,
          updatedAt: input.now
        })
        .where(eq(storeStaffInvites.id, invite.id));

      await tx
        .insert(userRoles)
        .values({ userId: input.actorUserId, role: "merchant_staff" })
        .onConflictDoNothing();

      if (!staff) throw new Error("staff_accept_failed");
      return {
        id: staff.id,
        storeId: staff.storeId,
        userId: staff.userId,
        displayName: null,
        email: email.identifier,
        permissions: normalizedPermissions(staff.permissions),
        status: staff.status,
        createdAt: staff.createdAt.toISOString(),
        updatedAt: staff.updatedAt.toISOString()
      };
    });
  }

  async updateStaff(
    storeId: string,
    staffId: string,
    input: UpdateMerchantStaffInput
  ): Promise<MerchantStaffRecord | null> {
    const [row] = await this.db
      .update(storeStaff)
      .set({
        ...(input.permissions !== undefined
          ? { permissions: input.permissions }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(storeStaff.id, staffId), eq(storeStaff.storeId, storeId)))
      .returning({ id: storeStaff.id });
    return row ? this.staffRecord(row.id) : null;
  }

  async removeStaff(storeId: string, staffId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(storeStaff)
      .where(and(eq(storeStaff.id, staffId), eq(storeStaff.storeId, storeId)))
      .returning({ id: storeStaff.id, userId: storeStaff.userId });
    if (!row) return false;

    const [other] = await this.db
      .select({ id: storeStaff.id })
      .from(storeStaff)
      .where(eq(storeStaff.userId, row.userId))
      .limit(1);
    if (!other) {
      await this.db
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, row.userId),
            eq(userRoles.role, "merchant_staff")
          )
        );
    }
    return true;
  }

  async subscriptionResources(
    storeId: string
  ): Promise<SubscriptionResources> {
    const [productRows, categoryRows, staffRows] = await Promise.all([
      this.db
        .select({ id: products.id, status: products.status })
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            ne(products.status, "archived"),
            ne(products.status, "plan_restricted")
          )
        )
        .orderBy(asc(products.createdAt)),
      this.db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(eq(categories.storeId, storeId), eq(categories.status, "active"))
        )
        .orderBy(asc(categories.createdAt)),
      this.db
        .select({ id: storeStaff.id })
        .from(storeStaff)
        .where(
          and(eq(storeStaff.storeId, storeId), eq(storeStaff.status, "active"))
        )
        .orderBy(asc(storeStaff.createdAt))
    ]);

    return {
      products: productRows,
      activeCategoryIds: categoryRows.map((row) => row.id),
      activeStaffIds: staffRows.map((row) => row.id)
    };
  }

  async subscriptionResourcePage(
    storeId: string,
    type: SubscriptionResourceType,
    offset: number,
    limit: number
  ): Promise<SubscriptionResourcePage> {
    if (type === "products") {
      const [items, total] = await Promise.all([
        this.db
          .select({
            id: products.id,
            label: products.name,
            status: products.status
          })
          .from(products)
          .where(
            and(
              eq(products.storeId, storeId),
              ne(products.status, "archived"),
              ne(products.status, "plan_restricted")
            )
          )
          .orderBy(asc(products.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ value: count() })
          .from(products)
          .where(
            and(
              eq(products.storeId, storeId),
              ne(products.status, "archived"),
              ne(products.status, "plan_restricted")
            )
          )
      ]);
      const value = total[0]?.value ?? 0;
      return {
        type,
        items,
        pageInfo: {
          offset,
          limit,
          total: value,
          hasMore: offset + items.length < value
        }
      };
    }

    if (type === "categories") {
      const [items, total] = await Promise.all([
        this.db
          .select({
            id: categories.id,
            label: categories.name,
            status: categories.status
          })
          .from(categories)
          .where(
            and(
              eq(categories.storeId, storeId),
              eq(categories.status, "active")
            )
          )
          .orderBy(asc(categories.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ value: count() })
          .from(categories)
          .where(
            and(
              eq(categories.storeId, storeId),
              eq(categories.status, "active")
            )
          )
      ]);
      const value = total[0]?.value ?? 0;
      return {
        type,
        items,
        pageInfo: {
          offset,
          limit,
          total: value,
          hasMore: offset + items.length < value
        }
      };
    }

    const [staffRows, total] = await Promise.all([
      this.db
        .select({
          id: storeStaff.id,
          label: sql<string>`coalesce(${users.displayName}, 'Staff')`,
          status: storeStaff.status
        })
        .from(storeStaff)
        .innerJoin(users, eq(users.id, storeStaff.userId))
        .where(
          and(
            eq(storeStaff.storeId, storeId),
            eq(storeStaff.status, "active")
          )
        )
        .orderBy(asc(storeStaff.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(storeStaff)
        .where(
          and(
            eq(storeStaff.storeId, storeId),
            eq(storeStaff.status, "active")
          )
        )
    ]);
    const value = total[0]?.value ?? 0;
    return {
      type,
      items: staffRows,
      pageInfo: {
        offset,
        limit,
        total: value,
        hasMore: offset + staffRows.length < value
      }
    };
  }

  async validateSubscriptionResourceIds(
    storeId: string,
    type: SubscriptionResourceType,
    ids: string[]
  ): Promise<boolean> {
    if (ids.length === 0) return true;
    if (type === "products") {
      const [row] = await this.db
        .select({ value: count() })
        .from(products)
        .where(
          and(
            eq(products.storeId, storeId),
            inArray(products.id, ids),
            ne(products.status, "archived"),
            ne(products.status, "plan_restricted")
          )
        );
      return (row?.value ?? 0) === ids.length;
    }
    if (type === "categories") {
      const [row] = await this.db
        .select({ value: count() })
        .from(categories)
        .where(
          and(
            eq(categories.storeId, storeId),
            inArray(categories.id, ids),
            eq(categories.status, "active")
          )
        );
      return (row?.value ?? 0) === ids.length;
    }
    const [row] = await this.db
      .select({ value: count() })
      .from(storeStaff)
      .where(
        and(
          eq(storeStaff.storeId, storeId),
          inArray(storeStaff.id, ids),
          eq(storeStaff.status, "active")
        )
      );
    return (row?.value ?? 0) === ids.length;
  }

  async applySubscriptionChange(input: {
    ownerUserId: string;
    storeId: string;
    toPlan: SubscriptionPlanCode;
    keepProductIds: string[] | null;
    keepCategoryIds: string[] | null;
    keepStaffIds: string[] | null;
    gracePeriodEnd: Date | null;
  }): Promise<SubscriptionChangeRecord> {
    return this.db.transaction(async (tx) => {
      const [store] = await tx
        .select({
          ownerUserId: stores.ownerUserId,
          plan: storeSubscriptions.plan
        })
        .from(stores)
        .innerJoin(
          storeSubscriptions,
          eq(storeSubscriptions.storeId, stores.id)
        )
        .where(eq(stores.id, input.storeId))
        .for("update")
        .limit(1);

      if (!store || store.ownerUserId !== input.ownerUserId) {
        throw new Error("subscription_store_missing");
      }

      const order: Record<SubscriptionPlanCode, number> = {
        starter: 0,
        pro: 1,
        business: 2
      };
      const direction =
        order[input.toPlan] > order[store.plan] ? "upgrade" : "downgrade";
      const target = getStoreEntitlements(input.toPlan);
      let restrictedProductCount = 0;
      let restoredProductCount = 0;

      if (direction === "downgrade") {
        const restricted = await tx
          .update(products)
          .set({
            status: "plan_restricted",
            planRestrictionPreviousStatus: sql`${products.status}`,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(products.storeId, input.storeId),
              ne(products.status, "archived"),
              ne(products.status, "plan_restricted"),
              input.keepProductIds === null
                ? sql`false`
                : input.keepProductIds.length > 0
                  ? sql`${products.id} not in (${sql.join(
                      input.keepProductIds.map((id) => sql`${id}`),
                      sql`, `
                    )})`
                  : sql`true`
            )
          )
          .returning({ id: products.id });
        restrictedProductCount = restricted.length;

        if (target.categoryLimit !== null && input.keepCategoryIds !== null) {
          await tx
            .update(categories)
            .set({ status: "archived", updatedAt: new Date() })
            .where(
              and(
                eq(categories.storeId, input.storeId),
                eq(categories.status, "active"),
                input.keepCategoryIds.length > 0
                  ? sql`${categories.id} not in (${sql.join(
                      input.keepCategoryIds.map((id) => sql`${id}`),
                      sql`, `
                    )})`
                  : sql`true`
              )
            );
        }

        if (input.keepStaffIds !== null) {
          await tx
          .update(storeStaff)
          .set({ status: "suspended", updatedAt: new Date() })
          .where(
            and(
              eq(storeStaff.storeId, input.storeId),
              eq(storeStaff.status, "active"),
              input.keepStaffIds.length > 0
                ? sql`${storeStaff.id} not in (${sql.join(
                    input.keepStaffIds.map((id) => sql`${id}`),
                    sql`, `
                  )})`
                : sql`true`
            )
          );
        }
      } else {
        const currentlyAllowed = await tx
          .select({ value: count() })
          .from(products)
          .where(
            and(
              eq(products.storeId, input.storeId),
              ne(products.status, "archived"),
              ne(products.status, "plan_restricted")
            )
          );
        const slots = Math.max(
          0,
          target.productLimit - (currentlyAllowed[0]?.value ?? 0)
        );
        if (slots > 0) {
          const restore = await tx
            .select({
              id: products.id,
              previous: products.planRestrictionPreviousStatus
            })
            .from(products)
            .where(
              and(
                eq(products.storeId, input.storeId),
                eq(products.status, "plan_restricted")
              )
            )
            .orderBy(asc(products.updatedAt))
            .limit(slots);

          for (const product of restore) {
            await tx
              .update(products)
              .set({
                status:
                  product.previous &&
                  product.previous !== "archived" &&
                  product.previous !== "plan_restricted"
                    ? product.previous
                    : "draft",
                planRestrictionPreviousStatus: null,
                updatedAt: new Date()
              })
              .where(eq(products.id, product.id));
            restoredProductCount += 1;
          }
        }
      }

      await tx
        .update(storeSubscriptions)
        .set({
          plan: input.toPlan,
          status: "active",
          gracePeriodEnd: input.gracePeriodEnd,
          updatedAt: new Date()
        })
        .where(eq(storeSubscriptions.storeId, input.storeId));

      const [change] = await tx
        .insert(subscriptionChanges)
        .values({
          storeId: input.storeId,
          fromPlan: store.plan,
          toPlan: input.toPlan,
          direction,
          changedByUserId: input.ownerUserId,
          gracePeriodEnd: input.gracePeriodEnd,
          restrictedProductCount,
          restoredProductCount
        })
        .returning();

      if (!change) throw new Error("subscription_change_failed");

      return {
        id: change.id,
        storeId: change.storeId,
        fromPlan: change.fromPlan,
        toPlan: change.toPlan,
        direction: change.direction,
        changedAt: change.createdAt.toISOString(),
        gracePeriodEnd: change.gracePeriodEnd?.toISOString() ?? null,
        restrictedProductCount,
        restoredProductCount,
        entitlements: target
      };
    });
  }

  async planUsage(storeId: string): Promise<SubscriptionPlanUsage> {
    const [sub, productRows, categoryRows, staffRows, restrictedRows] =
      await Promise.all([
        this.db
          .select({ plan: storeSubscriptions.plan })
          .from(storeSubscriptions)
          .where(eq(storeSubscriptions.storeId, storeId))
          .limit(1),
        this.db
          .select({ value: count() })
          .from(products)
          .where(
            and(
              eq(products.storeId, storeId),
              ne(products.status, "archived"),
              ne(products.status, "plan_restricted")
            )
          ),
        this.db
          .select({ value: count() })
          .from(categories)
          .where(
            and(eq(categories.storeId, storeId), eq(categories.status, "active"))
          ),
        this.db
          .select({ value: count() })
          .from(storeStaff)
          .where(
            and(eq(storeStaff.storeId, storeId), eq(storeStaff.status, "active"))
          ),
        this.db
          .select({ value: count() })
          .from(products)
          .where(
            and(
              eq(products.storeId, storeId),
              eq(products.status, "plan_restricted")
            )
          )
      ]);

    const plan = sub[0]?.plan ?? "starter";
    const entitlement = getStoreEntitlements(plan);
    return {
      productCount: productRows[0]?.value ?? 0,
      productLimit: entitlement.productLimit,
      activeCategoryCount: categoryRows[0]?.value ?? 0,
      categoryLimit: entitlement.categoryLimit,
      activeStaffCount: staffRows[0]?.value ?? 0,
      staffLimit: entitlement.staffLimit,
      restrictedProductCount: restrictedRows[0]?.value ?? 0
    };
  }

  async recordEvent(input: {
    name: string;
    userId?: string | null;
    storeId?: string | null;
    productId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(growthAnalyticsEvents).values({
      name: input.name,
      userId: input.userId ?? null,
      storeId: input.storeId ?? null,
      productId: input.productId ?? null,
      metadata: input.metadata ?? {}
    });
  }
}
