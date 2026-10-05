import type {
  CreateDeliveryDistanceRuleInput,
  CreateDeliverySpeedInput,
  CreateDeliveryZoneInput,
  DeliveryDistanceRuleRecord,
  DeliverySpeedRecord,
  DeliveryZoneRecord,
  ProductDeliveryProfile,
  StoreDeliveryConfigurationResponse,
  StoreDeliverySettingsRecord,
  SubscriptionPlanCode,
  SubscriptionStatus,
  UpdateDeliveryDistanceRuleInput,
  UpdateDeliverySpeedInput,
  UpdateDeliveryZoneInput,
  UpdateStoreDeliverySettingsInput
} from "@bazaarlink/contracts";
import {
  carts,
  checkoutSessions,
  customerAddresses,
  deliveryDistanceRules,
  deliverySpeeds,
  deliveryZones,
  products,
  storeDeliverySettings,
  storeSubscriptions,
  stores,
  type CustomerAddress,
  type Database,
  type DeliveryDistanceRule,
  type DeliverySpeed,
  type DeliveryZone,
  type StoreDeliverySettings
} from "@bazaarlink/database";
import {
  and,
  asc,
  desc,
  eq,
  inArray
} from "drizzle-orm";

import { getStoreEntitlements } from "../store/entitlements.js";

export interface DeliveryProductState {
  id: string;
  weightGrams: number | null;
  deliveryProfile: ProductDeliveryProfile;
  deliverySurcharge: number;
}

export interface DeliveryStoreContext {
  id: string;
  ownerUserId: string;
  name: string;
  province: string;
  cityDistrict: string;
  physicalAddress: string | null;
  mapLatitude: number | null;
  mapLongitude: number | null;
  status: "draft" | "published" | "suspended";
  plan: SubscriptionPlanCode;
  subscriptionStatus: SubscriptionStatus;
}

export interface DeliveryRuntimeConfiguration {
  store: DeliveryStoreContext;
  settings: StoreDeliverySettingsRecord;
  zones: DeliveryZoneRecord[];
  distanceRules: DeliveryDistanceRuleRecord[];
  speeds: DeliverySpeedRecord[];
}

export interface DeliveryRepository {
  getMerchantConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreDeliveryConfigurationResponse | null>;
  getRuntimeConfiguration(
    storeId: string
  ): Promise<DeliveryRuntimeConfiguration | null>;
  updateSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreDeliverySettingsInput
  ): Promise<StoreDeliverySettingsRecord | null>;
  createZone(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryZoneInput
  ): Promise<DeliveryZoneRecord | null>;
  updateZone(
    ownerUserId: string,
    storeId: string,
    zoneId: string,
    input: UpdateDeliveryZoneInput
  ): Promise<DeliveryZoneRecord | null>;
  deleteZone(
    ownerUserId: string,
    storeId: string,
    zoneId: string
  ): Promise<boolean>;
  createDistanceRule(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryDistanceRuleInput
  ): Promise<DeliveryDistanceRuleRecord | null>;
  updateDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string,
    input: UpdateDeliveryDistanceRuleInput
  ): Promise<DeliveryDistanceRuleRecord | null>;
  deleteDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string
  ): Promise<boolean>;
  createSpeed(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliverySpeedInput
  ): Promise<DeliverySpeedRecord | null>;
  updateSpeed(
    ownerUserId: string,
    storeId: string,
    speedId: string,
    input: UpdateDeliverySpeedInput
  ): Promise<DeliverySpeedRecord | null>;
  deleteSpeed(
    ownerUserId: string,
    storeId: string,
    speedId: string
  ): Promise<boolean>;
  ensureDefaultSpeed(
    ownerUserId: string,
    storeId: string
  ): Promise<void>;
  findAddress(
    userId: string,
    addressId: string
  ): Promise<ReturnType<typeof toAddress> | null>;
  getProductStates(productIds: string[]): Promise<DeliveryProductState[]>;
  persistCheckoutQuote(input: {
    userId: string;
    cartId: string;
    addressId: string;
    cartUpdatedAt: Date;
    snapshot: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }>;
  getPersistedQuote(
    userId: string,
    sessionId: string
  ): Promise<{
    id: string;
    status: "draft" | "quoted" | "expired";
    pricingSnapshot: Record<string, unknown> | null;
    expiresAt: Date | null;
  } | null>;
}

function money(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function toSettings(row: StoreDeliverySettings): StoreDeliverySettingsRecord {
  return {
    storeId: row.storeId,
    deliveryEnabled: row.deliveryEnabled,
    pickupEnabled: row.pickupEnabled,
    originAddress: row.originAddress,
    originProvince: row.originProvince,
    originDistrict: row.originDistrict,
    originArea: row.originArea,
    originLatitude: row.originLatitude,
    originLongitude: row.originLongitude,
    defaultDeliveryFee: money(row.defaultDeliveryFee),
    freeDeliveryThreshold: money(row.freeDeliveryThreshold),
    minimumOrderAmount: money(row.minimumOrderAmount),
    operatingWeekdays: row.operatingWeekdays,
    cutoffTime: row.cutoffTime,
    pickupMinMinutes: row.pickupMinMinutes,
    pickupMaxMinutes: row.pickupMaxMinutes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toZone(row: DeliveryZone): DeliveryZoneRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    name: row.name,
    province: row.province,
    districtCity: row.districtCity,
    areaNeighborhood: row.areaNeighborhood,
    fee: Number(row.fee),
    priority: row.priority,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toDistanceRule(
  row: DeliveryDistanceRule
): DeliveryDistanceRuleRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    name: row.name,
    type: row.type,
    minDistanceKm: Number(row.minDistanceKm),
    maxDistanceKm: money(row.maxDistanceKm),
    fee: money(row.fee),
    baseFee: money(row.baseFee),
    perKmFee: money(row.perKmFee),
    priority: row.priority,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toSpeed(row: DeliverySpeed): DeliverySpeedRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    name: row.name,
    kind: row.kind,
    surchargeType: row.surchargeType,
    surchargeValue: Number(row.surchargeValue),
    minEtaMinutes: row.minEtaMinutes,
    maxEtaMinutes: row.maxEtaMinutes,
    minimumOrderAmount: money(row.minimumOrderAmount),
    maxRangeKm: money(row.maxRangeKm),
    cutoffTime: row.cutoffTime,
    supportedWeekdays: row.supportedWeekdays,
    maxWeightGrams: row.maxWeightGrams,
    sortOrder: row.sortOrder,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toAddress(row: CustomerAddress) {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    recipientName: row.recipientName,
    country: row.country,
    province: row.province,
    districtCity: row.districtCity,
    areaNeighborhood: row.areaNeighborhood,
    addressDescription: row.addressDescription,
    nearestLandmark: row.nearestLandmark,
    phone: row.phone,
    mapLatitude: row.mapLatitude,
    mapLongitude: row.mapLongitude,
    deliveryInstructions: row.deliveryInstructions,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export class DatabaseDeliveryRepository implements DeliveryRepository {
  constructor(private readonly db: Database) {}

  private async storeContext(
    storeId: string,
    ownerUserId?: string
  ): Promise<DeliveryStoreContext | null> {
    const conditions = [eq(stores.id, storeId)];

    if (ownerUserId) {
      conditions.push(eq(stores.ownerUserId, ownerUserId));
    }

    const [row] = await this.db
      .select({
        id: stores.id,
        ownerUserId: stores.ownerUserId,
        name: stores.name,
        province: stores.province,
        cityDistrict: stores.cityDistrict,
        physicalAddress: stores.physicalAddress,
        mapLatitude: stores.mapLatitude,
        mapLongitude: stores.mapLongitude,
        status: stores.status,
        plan: storeSubscriptions.plan,
        subscriptionStatus: storeSubscriptions.status
      })
      .from(stores)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  private async ensureSettings(
    store: DeliveryStoreContext
  ): Promise<StoreDeliverySettingsRecord> {
    const [existing] = await this.db
      .select()
      .from(storeDeliverySettings)
      .where(eq(storeDeliverySettings.storeId, store.id))
      .limit(1);

    if (existing) {
      return toSettings(existing);
    }

    const [created] = await this.db
      .insert(storeDeliverySettings)
      .values({
        storeId: store.id,
        originAddress: store.physicalAddress,
        originProvince: store.province,
        originDistrict: store.cityDistrict,
        originLatitude: store.mapLatitude,
        originLongitude: store.mapLongitude
      })
      .onConflictDoNothing({ target: storeDeliverySettings.storeId })
      .returning();

    if (created) {
      return toSettings(created);
    }

    const [concurrent] = await this.db
      .select()
      .from(storeDeliverySettings)
      .where(eq(storeDeliverySettings.storeId, store.id))
      .limit(1);

    if (!concurrent) {
      throw new Error("delivery_settings_create_failed");
    }

    return toSettings(concurrent);
  }

  private async configParts(storeId: string) {
    const [zones, rules, speeds] = await Promise.all([
      this.db
        .select()
        .from(deliveryZones)
        .where(eq(deliveryZones.storeId, storeId))
        .orderBy(desc(deliveryZones.priority), asc(deliveryZones.createdAt)),
      this.db
        .select()
        .from(deliveryDistanceRules)
        .where(eq(deliveryDistanceRules.storeId, storeId))
        .orderBy(
          desc(deliveryDistanceRules.priority),
          asc(deliveryDistanceRules.createdAt)
        ),
      this.db
        .select()
        .from(deliverySpeeds)
        .where(eq(deliverySpeeds.storeId, storeId))
        .orderBy(asc(deliverySpeeds.sortOrder), asc(deliverySpeeds.createdAt))
    ]);

    return {
      zones: zones.map(toZone),
      distanceRules: rules.map(toDistanceRule),
      speeds: speeds.map(toSpeed)
    };
  }

  async getMerchantConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreDeliveryConfigurationResponse | null> {
    const store = await this.storeContext(storeId, ownerUserId);

    if (!store) {
      return null;
    }

    const [settings, parts] = await Promise.all([
      this.ensureSettings(store),
      this.configParts(store.id)
    ]);

    return {
      store: {
        id: store.id,
        name: store.name,
        province: store.province,
        cityDistrict: store.cityDistrict,
        subscription: {
          plan: store.plan,
          status: store.subscriptionStatus,
          currentPeriodEnd: null,
          gracePeriodEnd: null,
          entitlements: getStoreEntitlements(store.plan)
        }
      },
      entitlements: getStoreEntitlements(store.plan),
      settings,
      ...parts
    };
  }

  async getRuntimeConfiguration(
    storeId: string
  ): Promise<DeliveryRuntimeConfiguration | null> {
    const store = await this.storeContext(storeId);

    if (!store) {
      return null;
    }

    const [settings, parts] = await Promise.all([
      this.ensureSettings(store),
      this.configParts(store.id)
    ]);

    return {
      store,
      settings,
      ...parts
    };
  }

  async updateSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreDeliverySettingsInput
  ): Promise<StoreDeliverySettingsRecord | null> {
    const store = await this.storeContext(storeId, ownerUserId);

    if (!store) {
      return null;
    }

    await this.ensureSettings(store);

    const [updated] = await this.db
      .update(storeDeliverySettings)
      .set({
        ...input,
        ...(input.defaultDeliveryFee !== undefined
          ? {
              defaultDeliveryFee:
                input.defaultDeliveryFee === null
                  ? null
                  : input.defaultDeliveryFee.toFixed(2)
            }
          : {}),
        ...(input.freeDeliveryThreshold !== undefined
          ? {
              freeDeliveryThreshold:
                input.freeDeliveryThreshold === null
                  ? null
                  : input.freeDeliveryThreshold.toFixed(2)
            }
          : {}),
        ...(input.minimumOrderAmount !== undefined
          ? {
              minimumOrderAmount:
                input.minimumOrderAmount === null
                  ? null
                  : input.minimumOrderAmount.toFixed(2)
            }
          : {}),
        updatedAt: new Date()
      })
      .where(eq(storeDeliverySettings.storeId, storeId))
      .returning();

    return updated ? toSettings(updated) : null;
  }

  async createZone(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryZoneInput
  ): Promise<DeliveryZoneRecord | null> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return null;
    }

    const [created] = await this.db
      .insert(deliveryZones)
      .values({
        storeId,
        name: input.name,
        province: input.province ?? null,
        districtCity: input.districtCity ?? null,
        areaNeighborhood: input.areaNeighborhood ?? null,
        fee: input.fee.toFixed(2),
        priority: input.priority ?? 0,
        active: input.active ?? true
      })
      .returning();

    return created ? toZone(created) : null;
  }

  async updateZone(
    ownerUserId: string,
    storeId: string,
    zoneId: string,
    input: UpdateDeliveryZoneInput
  ): Promise<DeliveryZoneRecord | null> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return null;
    }

    const [updated] = await this.db
      .update(deliveryZones)
      .set({
        ...input,
        ...(input.fee !== undefined ? { fee: input.fee.toFixed(2) } : {}),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(deliveryZones.id, zoneId),
          eq(deliveryZones.storeId, storeId)
        )
      )
      .returning();

    return updated ? toZone(updated) : null;
  }

  async deleteZone(
    ownerUserId: string,
    storeId: string,
    zoneId: string
  ): Promise<boolean> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return false;
    }

    const [deleted] = await this.db
      .delete(deliveryZones)
      .where(
        and(
          eq(deliveryZones.id, zoneId),
          eq(deliveryZones.storeId, storeId)
        )
      )
      .returning({ id: deliveryZones.id });

    return Boolean(deleted);
  }

  async createDistanceRule(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryDistanceRuleInput
  ): Promise<DeliveryDistanceRuleRecord | null> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return null;
    }

    const [created] = await this.db
      .insert(deliveryDistanceRules)
      .values({
        storeId,
        name: input.name,
        type: input.type,
        minDistanceKm: (input.minDistanceKm ?? 0).toFixed(2),
        maxDistanceKm:
          input.maxDistanceKm === null || input.maxDistanceKm === undefined
            ? null
            : input.maxDistanceKm.toFixed(2),
        fee:
          input.fee === null || input.fee === undefined
            ? null
            : input.fee.toFixed(2),
        baseFee:
          input.baseFee === null || input.baseFee === undefined
            ? null
            : input.baseFee.toFixed(2),
        perKmFee:
          input.perKmFee === null || input.perKmFee === undefined
            ? null
            : input.perKmFee.toFixed(2),
        priority: input.priority ?? 0,
        active: input.active ?? true
      })
      .returning();

    return created ? toDistanceRule(created) : null;
  }

  async updateDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string,
    input: UpdateDeliveryDistanceRuleInput
  ): Promise<DeliveryDistanceRuleRecord | null> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return null;
    }

    const [updated] = await this.db
      .update(deliveryDistanceRules)
      .set({
        ...input,
        ...(input.minDistanceKm !== undefined
          ? { minDistanceKm: input.minDistanceKm.toFixed(2) }
          : {}),
        ...(input.maxDistanceKm !== undefined
          ? {
              maxDistanceKm:
                input.maxDistanceKm === null
                  ? null
                  : input.maxDistanceKm.toFixed(2)
            }
          : {}),
        ...(input.fee !== undefined
          ? {
              fee: input.fee === null ? null : input.fee.toFixed(2)
            }
          : {}),
        ...(input.baseFee !== undefined
          ? {
              baseFee:
                input.baseFee === null ? null : input.baseFee.toFixed(2)
            }
          : {}),
        ...(input.perKmFee !== undefined
          ? {
              perKmFee:
                input.perKmFee === null ? null : input.perKmFee.toFixed(2)
            }
          : {}),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(deliveryDistanceRules.id, ruleId),
          eq(deliveryDistanceRules.storeId, storeId)
        )
      )
      .returning();

    return updated ? toDistanceRule(updated) : null;
  }

  async deleteDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string
  ): Promise<boolean> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return false;
    }

    const [deleted] = await this.db
      .delete(deliveryDistanceRules)
      .where(
        and(
          eq(deliveryDistanceRules.id, ruleId),
          eq(deliveryDistanceRules.storeId, storeId)
        )
      )
      .returning({ id: deliveryDistanceRules.id });

    return Boolean(deleted);
  }

  async createSpeed(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliverySpeedInput
  ): Promise<DeliverySpeedRecord | null> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return null;
    }

    const [created] = await this.db
      .insert(deliverySpeeds)
      .values({
        storeId,
        name: input.name,
        kind: input.kind,
        surchargeType: input.surchargeType ?? "fixed",
        surchargeValue: (input.surchargeValue ?? 0).toFixed(2),
        minEtaMinutes: input.minEtaMinutes,
        maxEtaMinutes: input.maxEtaMinutes,
        minimumOrderAmount:
          input.minimumOrderAmount === null ||
          input.minimumOrderAmount === undefined
            ? null
            : input.minimumOrderAmount.toFixed(2),
        maxRangeKm:
          input.maxRangeKm === null || input.maxRangeKm === undefined
            ? null
            : input.maxRangeKm.toFixed(2),
        cutoffTime: input.cutoffTime ?? null,
        supportedWeekdays:
          input.supportedWeekdays ?? [0, 1, 2, 3, 4, 5, 6],
        maxWeightGrams: input.maxWeightGrams ?? null,
        sortOrder: input.sortOrder ?? 0,
        active: input.active ?? true
      })
      .returning();

    return created ? toSpeed(created) : null;
  }

  async updateSpeed(
    ownerUserId: string,
    storeId: string,
    speedId: string,
    input: UpdateDeliverySpeedInput
  ): Promise<DeliverySpeedRecord | null> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return null;
    }

    const [updated] = await this.db
      .update(deliverySpeeds)
      .set({
        ...input,
        ...(input.surchargeValue !== undefined
          ? { surchargeValue: input.surchargeValue.toFixed(2) }
          : {}),
        ...(input.minimumOrderAmount !== undefined
          ? {
              minimumOrderAmount:
                input.minimumOrderAmount === null
                  ? null
                  : input.minimumOrderAmount.toFixed(2)
            }
          : {}),
        ...(input.maxRangeKm !== undefined
          ? {
              maxRangeKm:
                input.maxRangeKm === null
                  ? null
                  : input.maxRangeKm.toFixed(2)
            }
          : {}),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(deliverySpeeds.id, speedId),
          eq(deliverySpeeds.storeId, storeId)
        )
      )
      .returning();

    return updated ? toSpeed(updated) : null;
  }

  async deleteSpeed(
    ownerUserId: string,
    storeId: string,
    speedId: string
  ): Promise<boolean> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return false;
    }

    const [deleted] = await this.db
      .delete(deliverySpeeds)
      .where(
        and(
          eq(deliverySpeeds.id, speedId),
          eq(deliverySpeeds.storeId, storeId)
        )
      )
      .returning({ id: deliverySpeeds.id });

    return Boolean(deleted);
  }

  async ensureDefaultSpeed(
    ownerUserId: string,
    storeId: string
  ): Promise<void> {
    if (!(await this.storeContext(storeId, ownerUserId))) {
      return;
    }

    const [existing] = await this.db
      .select({ id: deliverySpeeds.id })
      .from(deliverySpeeds)
      .where(eq(deliverySpeeds.storeId, storeId))
      .limit(1);

    if (existing) {
      return;
    }

    await this.db.insert(deliverySpeeds).values({
      storeId,
      name: "Standard",
      kind: "standard",
      surchargeType: "fixed",
      surchargeValue: "0",
      minEtaMinutes: 1440,
      maxEtaMinutes: 2880,
      supportedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      sortOrder: 0,
      active: true
    });
  }

  async findAddress(userId: string, addressId: string) {
    const [row] = await this.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.userId, userId)
        )
      )
      .limit(1);

    return row ? toAddress(row) : null;
  }

  async getProductStates(
    productIds: string[]
  ): Promise<DeliveryProductState[]> {
    if (productIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({
        id: products.id,
        weightGrams: products.weightGrams,
        deliveryProfile: products.deliveryProfile,
        deliverySurcharge: products.deliverySurcharge
      })
      .from(products)
      .where(inArray(products.id, productIds));

    return rows.map((row) => ({
      id: row.id,
      weightGrams: row.weightGrams,
      deliveryProfile: row.deliveryProfile,
      deliverySurcharge: Number(row.deliverySurcharge)
    }));
  }

  async persistCheckoutQuote(input: {
    userId: string;
    cartId: string;
    addressId: string;
    cartUpdatedAt: Date;
    snapshot: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }> {
    const [created] = await this.db
      .insert(checkoutSessions)
      .values({
        userId: input.userId,
        cartId: input.cartId,
        addressId: input.addressId,
        status: "quoted",
        pricingSnapshot: input.snapshot,
        cartUpdatedAt: input.cartUpdatedAt,
        expiresAt: input.expiresAt
      })
      .returning({
        id: checkoutSessions.id,
        expiresAt: checkoutSessions.expiresAt
      });

    if (!created?.expiresAt) {
      throw new Error("delivery_checkout_quote_create_failed");
    }

    return {
      id: created.id,
      expiresAt: created.expiresAt
    };
  }

  async getPersistedQuote(
    userId: string,
    sessionId: string
  ): Promise<{
    id: string;
    status: "draft" | "quoted" | "expired";
    pricingSnapshot: Record<string, unknown> | null;
    expiresAt: Date | null;
  } | null> {
    const [row] = await this.db
      .select({
        id: checkoutSessions.id,
        status: checkoutSessions.status,
        pricingSnapshot: checkoutSessions.pricingSnapshot,
        expiresAt: checkoutSessions.expiresAt
      })
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.id, sessionId),
          eq(checkoutSessions.userId, userId)
        )
      )
      .limit(1);

    return row ?? null;
  }
}
