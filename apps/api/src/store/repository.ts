import type {
  CreateStoreInput,
  StoreRecord,
  SubscriptionPlanCode,
  SubscriptionStatus,
  UpdateStoreInput
} from "@bazaarlink/contracts";
import {
  storeSubscriptions,
  stores,
  type Database,
  userRoles
} from "@bazaarlink/database";
import {
  and,
  eq
} from "drizzle-orm";

import { getStoreEntitlements } from "./entitlements.js";
import { StoreRepositoryConflictError } from "./errors.js";

interface StoreRow {
  id: string;
  ownerUserId: string;
  name: string;
  handle: string;
  category: string;
  province: string;
  cityDistrict: string;
  phone: string;
  preferredLocale: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  whatsappNumber: string | null;
  physicalAddress: string | null;
  mapLatitude: number | null;
  mapLongitude: number | null;
  businessHours: string | null;
  featuredCategoryIds: string[];
  featuredProductIds: string[];
  customDomain: string | null;
  theme: "minimal" | "modern" | "fashion" | "electronics" | "food";
  accentColor: string;
  status: "draft" | "published" | "suspended";
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plan: SubscriptionPlanCode;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  gracePeriodEnd: Date | null;
}

export interface StoreRepository {
  listOwnedStores(ownerUserId: string): Promise<StoreRecord[]>;
  findOwnedStore(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreRecord | null>;
  findPublicStoreByHandle(handle: string): Promise<StoreRecord | null>;
  createStore(
    ownerUserId: string,
    input: CreateStoreInput
  ): Promise<StoreRecord>;
  updateStore(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreInput
  ): Promise<StoreRecord | null>;
  publishStore(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreRecord | null>;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
  };

  if (candidate.code === "23505") {
    return true;
  }

  return candidate.cause ? isUniqueViolation(candidate.cause) : false;
}

function toStoreRecord(row: StoreRow): StoreRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    handle: row.handle,
    category: row.category,
    province: row.province,
    cityDistrict: row.cityDistrict,
    phone: row.phone,
    preferredLocale: row.preferredLocale as StoreRecord["preferredLocale"],
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    description: row.description,
    whatsappNumber: row.whatsappNumber,
    physicalAddress: row.physicalAddress,
    mapLatitude: row.mapLatitude,
    mapLongitude: row.mapLongitude,
    businessHours: row.businessHours,
    featuredCategoryIds: row.featuredCategoryIds,
    featuredProductIds: row.featuredProductIds,
    customDomain: row.customDomain,
    theme: row.theme,
    accentColor: row.accentColor,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subscription: {
      plan: row.plan,
      status: row.subscriptionStatus,
      currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
      gracePeriodEnd: row.gracePeriodEnd?.toISOString() ?? null,
      entitlements: getStoreEntitlements(row.plan)
    }
  };
}

function selection() {
  return {
    id: stores.id,
    ownerUserId: stores.ownerUserId,
    name: stores.name,
    handle: stores.handle,
    category: stores.category,
    province: stores.province,
    cityDistrict: stores.cityDistrict,
    phone: stores.phone,
    preferredLocale: stores.preferredLocale,
    logoUrl: stores.logoUrl,
    coverImageUrl: stores.coverImageUrl,
    description: stores.description,
    whatsappNumber: stores.whatsappNumber,
    physicalAddress: stores.physicalAddress,
    mapLatitude: stores.mapLatitude,
    mapLongitude: stores.mapLongitude,
    businessHours: stores.businessHours,
    featuredCategoryIds: stores.featuredCategoryIds,
    featuredProductIds: stores.featuredProductIds,
    customDomain: stores.customDomain,
    theme: stores.theme,
    accentColor: stores.accentColor,
    status: stores.status,
    publishedAt: stores.publishedAt,
    createdAt: stores.createdAt,
    updatedAt: stores.updatedAt,
    plan: storeSubscriptions.plan,
    subscriptionStatus: storeSubscriptions.status,
    currentPeriodEnd: storeSubscriptions.currentPeriodEnd,
    gracePeriodEnd: storeSubscriptions.gracePeriodEnd
  };
}

export class DatabaseStoreRepository implements StoreRepository {
  constructor(private readonly db: Database) {}

  async listOwnedStores(ownerUserId: string): Promise<StoreRecord[]> {
    const rows = await this.db
      .select(selection())
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(eq(stores.ownerUserId, ownerUserId));

    return rows.map((row) => toStoreRecord(row as StoreRow));
  }

  async findOwnedStore(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreRecord | null> {
    const [row] = await this.db
      .select(selection())
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.ownerUserId, ownerUserId)
        )
      )
      .limit(1);

    return row ? toStoreRecord(row as StoreRow) : null;
  }

  async findPublicStoreByHandle(handle: string): Promise<StoreRecord | null> {
    const [row] = await this.db
      .select(selection())
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(
        and(
          eq(stores.handle, handle),
          eq(stores.status, "published")
        )
      )
      .limit(1);

    return row ? toStoreRecord(row as StoreRow) : null;
  }

  async createStore(
    ownerUserId: string,
    input: CreateStoreInput
  ): Promise<StoreRecord> {
    try {
      return await this.db.transaction(async (tx) => {
        const [store] = await tx
          .insert(stores)
          .values({
            ownerUserId,
            name: input.name,
            handle: input.handle,
            category: input.category,
            province: input.province,
            cityDistrict: input.cityDistrict,
            phone: input.phone,
            preferredLocale: input.preferredLocale,
            logoUrl: input.logoUrl ?? null,
            coverImageUrl: input.coverImageUrl ?? null,
            description: input.description ?? null,
            whatsappNumber: input.whatsappNumber ?? null,
            physicalAddress: input.physicalAddress ?? null,
            mapLatitude: input.mapLatitude ?? null,
            mapLongitude: input.mapLongitude ?? null,
            businessHours: input.businessHours ?? null,
            featuredCategoryIds: input.featuredCategoryIds ?? [],
            featuredProductIds: input.featuredProductIds ?? [],
            customDomain: input.customDomain ?? null,
            theme: input.theme ?? "minimal",
            accentColor: input.accentColor ?? "#0F766E"
          })
          .returning();

        if (!store) {
          throw new Error("store_insert_failed");
        }

        const [subscription] = await tx
          .insert(storeSubscriptions)
          .values({
            storeId: store.id,
            plan: "starter",
            status: "active"
          })
          .returning();

        if (!subscription) {
          throw new Error("store_subscription_insert_failed");
        }

        await tx
          .insert(userRoles)
          .values({
            userId: ownerUserId,
            role: "merchant_owner"
          })
          .onConflictDoNothing();

        return toStoreRecord({
          ...store,
          plan: subscription.plan,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          gracePeriodEnd: subscription.gracePeriodEnd
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new StoreRepositoryConflictError();
      }

      throw error;
    }
  }

  async updateStore(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreInput
  ): Promise<StoreRecord | null> {
    try {
      const [updated] = await this.db
        .update(stores)
        .set({
          ...input,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(stores.id, storeId),
            eq(stores.ownerUserId, ownerUserId)
          )
        )
        .returning({
          id: stores.id
        });

      if (!updated) {
        return null;
      }

      return this.findOwnedStore(ownerUserId, storeId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new StoreRepositoryConflictError();
      }

      throw error;
    }
  }

  async publishStore(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreRecord | null> {
    const [updated] = await this.db
      .update(stores)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.ownerUserId, ownerUserId)
        )
      )
      .returning({
        id: stores.id
      });

    if (!updated) {
      return null;
    }

    return this.findOwnedStore(ownerUserId, storeId);
  }
}
