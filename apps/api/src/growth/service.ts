import {
  createHash,
  randomBytes
} from "node:crypto";

import type {
  CreateMerchantCouponInput,
  CreateMerchantPromotionInput,
  GrowthAnalyticsEvent,
  MerchantAnalyticsResponse,
  MerchantCouponRecord,
  MerchantDashboardResponse,
  MerchantPromotionRecord,
  MerchantStaffInviteRecord,
  MerchantStaffPermission,
  MerchantStaffRecord,
  MerchantStaffResponse,
  SubscriptionChangeInput,
  SubscriptionGrowthResponse,
  SubscriptionResourcePage,
  SubscriptionResourceType,
  UpdateMerchantCouponInput,
  UpdateMerchantPromotionInput,
  UpdateMerchantStaffInput
} from "@bazaarlink/contracts";

import { getStoreEntitlements } from "../store/entitlements.js";
import { unpaidUpgradeBlocked } from "./paid-plan-policy.js";
import {
  GrowthError,
  GrowthRepositoryConflictError
} from "./errors.js";
import type {
  GrowthRepository,
  ResolvedGrowthAccess
} from "./repository.js";

const PLAN_ORDER = {
  starter: 0,
  pro: 1,
  business: 2
} as const;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export interface GrowthServiceContract {
  resolveAccess(
    actorUserId: string,
    storeId: string,
    permission?: MerchantStaffPermission
  ): Promise<ResolvedGrowthAccess>;
  assignedAccesses(actorUserId: string): Promise<ResolvedGrowthAccess[]>;
  dashboard(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantDashboardResponse>;
  analytics(
    actorUserId: string,
    storeId: string,
    days: number
  ): Promise<MerchantAnalyticsResponse>;
  listCoupons(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantCouponRecord[]>;
  createCoupon(
    actorUserId: string,
    storeId: string,
    input: CreateMerchantCouponInput
  ): Promise<MerchantCouponRecord>;
  updateCoupon(
    actorUserId: string,
    storeId: string,
    couponId: string,
    input: UpdateMerchantCouponInput
  ): Promise<MerchantCouponRecord>;
  deleteCoupon(
    actorUserId: string,
    storeId: string,
    couponId: string
  ): Promise<void>;
  listPromotions(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantPromotionRecord[]>;
  createPromotion(
    actorUserId: string,
    storeId: string,
    input: CreateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord>;
  updatePromotion(
    actorUserId: string,
    storeId: string,
    promotionId: string,
    input: UpdateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord>;
  deletePromotion(
    actorUserId: string,
    storeId: string,
    promotionId: string
  ): Promise<void>;
  listStaff(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantStaffResponse>;
  createStaffInvite(
    actorUserId: string,
    storeId: string,
    email: string,
    permissions: MerchantStaffPermission[]
  ): Promise<MerchantStaffInviteRecord>;
  revokeStaffInvite(
    actorUserId: string,
    storeId: string,
    inviteId: string
  ): Promise<void>;
  acceptStaffInvite(
    actorUserId: string,
    inviteCode: string
  ): Promise<MerchantStaffRecord>;
  updateStaff(
    actorUserId: string,
    storeId: string,
    staffId: string,
    input: UpdateMerchantStaffInput
  ): Promise<MerchantStaffRecord>;
  removeStaff(
    actorUserId: string,
    storeId: string,
    staffId: string
  ): Promise<void>;
  subscriptionResources(
    actorUserId: string,
    storeId: string,
    type: SubscriptionResourceType,
    offset: number,
    limit: number
  ): Promise<SubscriptionResourcePage>;
  changeSubscription(
    actorUserId: string,
    storeId: string,
    input: SubscriptionChangeInput
  ): Promise<SubscriptionGrowthResponse>;
  recordEvent(input: {
    name: GrowthAnalyticsEvent;
    userId?: string | null;
    storeId?: string | null;
    productId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export class GrowthService implements GrowthServiceContract {
  constructor(private readonly repository: GrowthRepository) {}

  async resolveAccess(
    actorUserId: string,
    storeId: string,
    permission?: MerchantStaffPermission
  ): Promise<ResolvedGrowthAccess> {
    const access = await this.repository.resolveAccess(actorUserId, storeId);
    if (!access) throw new GrowthError("store_not_found", 404);

    if (
      access.subscriptionStatus !== "active" &&
      access.subscriptionStatus !== "grace_period"
    ) {
      throw new GrowthError("subscription_unavailable", 409);
    }

    if (
      permission &&
      access.role === "staff" &&
      !access.permissions.includes(permission)
    ) {
      throw new GrowthError("forbidden", 403);
    }

    return access;
  }

  async assignedAccesses(
    actorUserId: string
  ): Promise<ResolvedGrowthAccess[]> {
    return this.repository.assignedStoreAccesses(actorUserId);
  }

  private async owner(
    actorUserId: string,
    storeId: string
  ): Promise<ResolvedGrowthAccess> {
    const access = await this.resolveAccess(actorUserId, storeId);
    if (access.role !== "owner") throw new GrowthError("forbidden", 403);
    return access;
  }

  private requireFeature(
    access: ResolvedGrowthAccess,
    feature:
      | "coupons"
      | "promotions"
      | "advancedAnalytics"
      | "premiumStorefront"
      | "customDomain"
  ) {
    if (!getStoreEntitlements(access.plan)[feature]) {
      throw new GrowthError("feature_not_available", 409);
    }
  }

  async dashboard(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantDashboardResponse> {
    await this.resolveAccess(actorUserId, storeId, "analytics");
    return this.repository.dashboard(storeId);
  }

  async analytics(
    actorUserId: string,
    storeId: string,
    days: number
  ): Promise<MerchantAnalyticsResponse> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "analytics"
    );
    return this.repository.analytics(
      storeId,
      access.plan,
      Math.min(365, Math.max(1, days))
    );
  }

  async listCoupons(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantCouponRecord[]> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "coupons");
    return this.repository.listCoupons(storeId);
  }

  private validateCoupon(
    input: CreateMerchantCouponInput | UpdateMerchantCouponInput
  ) {
    if (input.value !== undefined) {
      if (input.value <= 0) throw new GrowthError("invalid_request", 400);
      if (input.type === "percentage" && input.value > 100) {
        throw new GrowthError("invalid_request", 400);
      }
    }
    if (
      input.minimumOrderAmount !== undefined &&
      input.minimumOrderAmount !== null &&
      input.minimumOrderAmount < 0
    ) {
      throw new GrowthError("invalid_request", 400);
    }
    const starts = validDate(input.startsAt);
    const ends = validDate(input.endsAt);
    if (input.startsAt && !starts) throw new GrowthError("invalid_request", 400);
    if (input.endsAt && !ends) throw new GrowthError("invalid_request", 400);
    if (starts && ends && ends <= starts) {
      throw new GrowthError("invalid_request", 400);
    }
  }

  async createCoupon(
    actorUserId: string,
    storeId: string,
    input: CreateMerchantCouponInput
  ): Promise<MerchantCouponRecord> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "coupons");
    this.validateCoupon(input);
    try {
      return await this.repository.createCoupon(storeId, input);
    } catch (error) {
      if (
        error instanceof GrowthRepositoryConflictError &&
        error.kind === "coupon"
      ) {
        throw new GrowthError("coupon_code_in_use", 409);
      }
      throw error;
    }
  }

  async updateCoupon(
    actorUserId: string,
    storeId: string,
    couponId: string,
    input: UpdateMerchantCouponInput
  ): Promise<MerchantCouponRecord> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "coupons");
    this.validateCoupon(input);
    try {
      const coupon = await this.repository.updateCoupon(
        storeId,
        couponId,
        input
      );
      if (!coupon) throw new GrowthError("coupon_not_found", 404);
      return coupon;
    } catch (error) {
      if (
        error instanceof GrowthRepositoryConflictError &&
        error.kind === "coupon"
      ) {
        throw new GrowthError("coupon_code_in_use", 409);
      }
      throw error;
    }
  }

  async deleteCoupon(
    actorUserId: string,
    storeId: string,
    couponId: string
  ): Promise<void> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "coupons");
    if (!(await this.repository.deleteCoupon(storeId, couponId))) {
      throw new GrowthError("coupon_not_found", 404);
    }
  }

  async listPromotions(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantPromotionRecord[]> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "promotions");
    return this.repository.listPromotions(storeId);
  }

  private async validatePromotion(
    storeId: string,
    input: CreateMerchantPromotionInput,
    excludingId?: string
  ) {
    const product = await this.repository.productForPromotion(
      storeId,
      input.productId
    );
    if (!product) throw new GrowthError("product_not_found", 404);
    const startsAt = validDate(input.startsAt);
    const endsAt = validDate(input.endsAt);
    if (!startsAt || !endsAt || endsAt <= startsAt) {
      throw new GrowthError("invalid_request", 400);
    }
    if (
      input.promotionalPrice < 0 ||
      input.promotionalPrice >= product.price
    ) {
      throw new GrowthError("invalid_request", 400);
    }
    if (
      (input.active ?? true) &&
      (await this.repository.overlappingPromotion(
        input.productId,
        startsAt,
        endsAt,
        excludingId
      ))
    ) {
      throw new GrowthError("promotion_conflict", 409);
    }
  }

  async createPromotion(
    actorUserId: string,
    storeId: string,
    input: CreateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "promotions");
    await this.validatePromotion(storeId, input);
    const promotion = await this.repository.createPromotion(storeId, input);
    if (!promotion) throw new GrowthError("product_not_found", 404);
    return promotion;
  }

  async updatePromotion(
    actorUserId: string,
    storeId: string,
    promotionId: string,
    input: UpdateMerchantPromotionInput
  ): Promise<MerchantPromotionRecord> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "promotions");

    const existing = (await this.repository.listPromotions(storeId)).find(
      (item) => item.id === promotionId
    );
    if (!existing) throw new GrowthError("promotion_not_found", 404);

    const merged: CreateMerchantPromotionInput = {
      productId: existing.productId,
      name: input.name ?? existing.name,
      promotionalPrice:
        input.promotionalPrice ?? existing.promotionalPrice,
      active: input.active ?? existing.active,
      startsAt: input.startsAt ?? existing.startsAt,
      endsAt: input.endsAt ?? existing.endsAt
    };
    await this.validatePromotion(storeId, merged, promotionId);

    const promotion = await this.repository.updatePromotion(
      storeId,
      promotionId,
      input
    );
    if (!promotion) throw new GrowthError("promotion_not_found", 404);
    return promotion;
  }

  async deletePromotion(
    actorUserId: string,
    storeId: string,
    promotionId: string
  ): Promise<void> {
    const access = await this.resolveAccess(
      actorUserId,
      storeId,
      "discounts"
    );
    this.requireFeature(access, "promotions");
    if (!(await this.repository.deletePromotion(storeId, promotionId))) {
      throw new GrowthError("promotion_not_found", 404);
    }
  }

  async listStaff(
    actorUserId: string,
    storeId: string
  ): Promise<MerchantStaffResponse> {
    await this.owner(actorUserId, storeId);
    return this.repository.listStaff(storeId);
  }

  async createStaffInvite(
    actorUserId: string,
    storeId: string,
    email: string,
    permissions: MerchantStaffPermission[]
  ): Promise<MerchantStaffInviteRecord> {
    const access = await this.owner(actorUserId, storeId);
    const entitlement = getStoreEntitlements(access.plan);
    const current = await this.repository.listStaff(storeId);
    if (
      entitlement.staffLimit <= 0 ||
      current.activeStaffCount >= entitlement.staffLimit
    ) {
      throw new GrowthError("staff_limit_reached", 409);
    }

    const safePermissions = unique(permissions);
    if (safePermissions.length === 0) {
      throw new GrowthError("invalid_request", 400);
    }

    const inviteCode = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256")
      .update(inviteCode)
      .digest("hex");

    try {
      return await this.repository.createInvite({
        storeId,
        email: email.trim().toLowerCase(),
        permissions: safePermissions,
        tokenHash,
        inviteCode,
        invitedByUserId: actorUserId,
        expiresAt: new Date(Date.now() + 7 * 86_400_000)
      });
    } catch (error) {
      if (
        error instanceof GrowthRepositoryConflictError &&
        error.kind === "staff"
      ) {
        throw new GrowthError("invalid_request", 409);
      }
      throw error;
    }
  }

  async revokeStaffInvite(
    actorUserId: string,
    storeId: string,
    inviteId: string
  ): Promise<void> {
    await this.owner(actorUserId, storeId);
    if (!(await this.repository.revokeInvite(storeId, inviteId))) {
      throw new GrowthError("staff_invite_not_found", 404);
    }
  }

  async acceptStaffInvite(
    actorUserId: string,
    inviteCode: string
  ): Promise<MerchantStaffRecord> {
    const tokenHash = createHash("sha256")
      .update(inviteCode.trim())
      .digest("hex");
    const result = await this.repository.acceptInvite({
      actorUserId,
      tokenHash,
      now: new Date()
    });
    if (result === "email_mismatch") {
      throw new GrowthError("staff_invite_email_mismatch", 403);
    }
    if (result === "expired") {
      throw new GrowthError("staff_invite_expired", 409);
    }
    if (result === "limit") {
      throw new GrowthError("staff_limit_reached", 409);
    }
    if (!result) throw new GrowthError("staff_invite_not_found", 404);
    return result;
  }

  async updateStaff(
    actorUserId: string,
    storeId: string,
    staffId: string,
    input: UpdateMerchantStaffInput
  ): Promise<MerchantStaffRecord> {
    const access = await this.owner(actorUserId, storeId);
    const entitlement = getStoreEntitlements(access.plan);
    if (input.status === "active") {
      const current = await this.repository.listStaff(storeId);
      const target = current.staff.find((item) => item.id === staffId);
      if (
        target?.status !== "active" &&
        current.activeStaffCount >= entitlement.staffLimit
      ) {
        throw new GrowthError("staff_limit_reached", 409);
      }
    }
    const result = await this.repository.updateStaff(storeId, staffId, {
      ...input,
      ...(input.permissions
        ? { permissions: unique(input.permissions) }
        : {})
    });
    if (!result) throw new GrowthError("staff_not_found", 404);
    return result;
  }

  async removeStaff(
    actorUserId: string,
    storeId: string,
    staffId: string
  ): Promise<void> {
    await this.owner(actorUserId, storeId);
    if (!(await this.repository.removeStaff(storeId, staffId))) {
      throw new GrowthError("staff_not_found", 404);
    }
  }

  async subscriptionResources(
    actorUserId: string,
    storeId: string,
    type: SubscriptionResourceType,
    offset: number,
    limit: number
  ): Promise<SubscriptionResourcePage> {
    await this.owner(actorUserId, storeId);
    return this.repository.subscriptionResourcePage(
      storeId,
      type,
      Math.max(0, offset),
      Math.min(100, Math.max(1, limit))
    );
  }

  async changeSubscription(
    actorUserId: string,
    storeId: string,
    input: SubscriptionChangeInput
  ): Promise<SubscriptionGrowthResponse> {
    const access = await this.owner(actorUserId, storeId);
    if (access.plan === input.plan) {
      throw new GrowthError("same_subscription_plan", 409);
    }

    const target = getStoreEntitlements(input.plan);
    const usage = await this.repository.planUsage(storeId);
    const direction =
      PLAN_ORDER[input.plan] > PLAN_ORDER[access.plan]
        ? "upgrade"
        : "downgrade";

    if (unpaidUpgradeBlocked(access.plan, input.plan)) {
      throw new GrowthError("feature_not_available", 409);
    }

    let keepProductIds: string[] | null = null;
    let keepCategoryIds: string[] | null = null;
    let keepStaffIds: string[] | null = null;

    if (direction === "downgrade") {
      if (usage.productCount > target.productLimit) {
        keepProductIds = unique(input.keepProductIds ?? []);
        if (
          keepProductIds.length !== target.productLimit ||
          !(await this.repository.validateSubscriptionResourceIds(
            storeId,
            "products",
            keepProductIds
          ))
        ) {
          throw new GrowthError("invalid_request", 400);
        }
      }

      if (
        target.categoryLimit !== null &&
        usage.activeCategoryCount > target.categoryLimit
      ) {
        keepCategoryIds = unique(input.keepCategoryIds ?? []);
        if (
          keepCategoryIds.length !== target.categoryLimit ||
          !(await this.repository.validateSubscriptionResourceIds(
            storeId,
            "categories",
            keepCategoryIds
          ))
        ) {
          throw new GrowthError("invalid_request", 400);
        }
      }

      if (usage.activeStaffCount > target.staffLimit) {
        keepStaffIds = unique(input.keepStaffIds ?? []);
        if (
          keepStaffIds.length !== target.staffLimit ||
          !(await this.repository.validateSubscriptionResourceIds(
            storeId,
            "staff",
            keepStaffIds
          ))
        ) {
          throw new GrowthError("invalid_request", 400);
        }
      }
    }

    const hasRestriction =
      keepProductIds !== null ||
      keepCategoryIds !== null ||
      keepStaffIds !== null;

    await this.recordEvent({
      name: "upgrade_started",
      userId: actorUserId,
      storeId,
      metadata: {
        fromPlan: access.plan,
        toPlan: input.plan,
        direction
      }
    });

    const change = await this.repository.applySubscriptionChange({
      ownerUserId: actorUserId,
      storeId,
      toPlan: input.plan,
      keepProductIds,
      keepCategoryIds,
      keepStaffIds,
      gracePeriodEnd: hasRestriction
        ? new Date(Date.now() + 14 * 86_400_000)
        : null
    });

    await this.recordEvent({
      name:
        direction === "upgrade"
          ? "subscription_upgraded"
          : "subscription_downgraded",
      userId: actorUserId,
      storeId,
      metadata: {
        fromPlan: access.plan,
        toPlan: input.plan,
        restrictedProductCount: change.restrictedProductCount,
        restoredProductCount: change.restoredProductCount
      }
    });

    return {
      change,
      usage: await this.repository.planUsage(storeId)
    };
  }

  async recordEvent(input: {
    name: GrowthAnalyticsEvent;
    userId?: string | null;
    storeId?: string | null;
    productId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.repository.recordEvent(input);
  }
}
