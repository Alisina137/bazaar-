import type {
  CreateDeliveryCheckoutQuoteInput,
  CreateDeliveryDistanceRuleInput,
  CreateDeliverySpeedInput,
  CreateDeliveryZoneInput,
  DeliveryCheckoutQuoteResponse,
  DeliveryDistanceRuleRecord,
  DeliveryMerchantQuote,
  DeliveryOptionQuote,
  DeliveryOptionsResponse,
  DeliveryRuleAudit,
  DeliveryZoneRecord,
  StoreDeliveryConfigurationResponse,
  UpdateDeliveryDistanceRuleInput,
  UpdateDeliverySpeedInput,
  UpdateDeliveryZoneInput,
  UpdateStoreDeliverySettingsInput
} from "@bazaarlink/contracts";

import type { CartPricingServiceContract } from "../cart-pricing/service.js";
import { DeliveryError } from "./errors.js";
import type {
  DeliveryProductState,
  DeliveryRepository,
  DeliveryRuntimeConfiguration
} from "./repository.js";

const QUOTE_TTL_MS = 15 * 60 * 1000;
const AFGHANISTAN_UTC_OFFSET_MINUTES = 270;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeLocation(value: string | null | undefined): string | null {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");

  return normalized ? normalized : null;
}

function trimNullable(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateCoordinatePair(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  currentLatitude?: number | null,
  currentLongitude?: number | null
) {
  const nextLatitude =
    latitude === undefined ? currentLatitude ?? null : latitude;
  const nextLongitude =
    longitude === undefined ? currentLongitude ?? null : longitude;

  if ((nextLatitude === null) !== (nextLongitude === null)) {
    throw new DeliveryError("invalid_request", 400);
  }
}

function validateWeekdays(days: number[]) {
  if (
    days.length === 0 ||
    days.some(
      (day) =>
        !Number.isInteger(day) ||
        day < 0 ||
        day > 6
    )
  ) {
    throw new DeliveryError("invalid_request", 400);
  }
}

function validateTime(value: string | null | undefined) {
  if (
    value !== undefined &&
    value !== null &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  ) {
    throw new DeliveryError("invalid_request", 400);
  }
}

function normalizeSettingsInput(
  input: UpdateStoreDeliverySettingsInput
): UpdateStoreDeliverySettingsInput {
  if (input.operatingWeekdays) {
    validateWeekdays(input.operatingWeekdays);
  }
  validateTime(input.cutoffTime);

  if (
    input.pickupMinMinutes !== undefined &&
    input.pickupMaxMinutes !== undefined &&
    input.pickupMaxMinutes < input.pickupMinMinutes
  ) {
    throw new DeliveryError("invalid_request", 400);
  }

  return {
    ...input,
    originAddress: trimNullable(input.originAddress),
    originProvince: trimNullable(input.originProvince),
    originDistrict: trimNullable(input.originDistrict),
    originArea: trimNullable(input.originArea),
    cutoffTime: trimNullable(input.cutoffTime)
  };
}

function normalizeZoneInput<T extends CreateDeliveryZoneInput | UpdateDeliveryZoneInput>(
  input: T
): T {
  const normalized = {
    ...input,
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    province: trimNullable(input.province),
    districtCity: trimNullable(input.districtCity),
    areaNeighborhood: trimNullable(input.areaNeighborhood)
  } as T;

  if (
    normalized.province == null &&
    normalized.districtCity == null &&
    normalized.areaNeighborhood == null
  ) {
    throw new DeliveryError("invalid_request", 400);
  }

  return normalized;
}

function validateDistanceRule(
  input: CreateDeliveryDistanceRuleInput | UpdateDeliveryDistanceRuleInput
) {
  if (
    input.minDistanceKm !== undefined &&
    input.minDistanceKm < 0
  ) {
    throw new DeliveryError("invalid_request", 400);
  }

  if (
    input.maxDistanceKm !== undefined &&
    input.maxDistanceKm !== null &&
    input.minDistanceKm !== undefined &&
    input.maxDistanceKm <= input.minDistanceKm
  ) {
    throw new DeliveryError("invalid_request", 400);
  }

  if (input.type === "tier") {
    if (input.fee === undefined || input.fee === null || input.fee < 0) {
      throw new DeliveryError("invalid_request", 400);
    }
  }

  if (input.type === "base_per_km") {
    if (
      input.baseFee === undefined ||
      input.baseFee === null ||
      input.baseFee < 0 ||
      input.perKmFee === undefined ||
      input.perKmFee === null ||
      input.perKmFee < 0
    ) {
      throw new DeliveryError("invalid_request", 400);
    }
  }
}

function validateSpeed(
  input: CreateDeliverySpeedInput | UpdateDeliverySpeedInput
) {
  if (
    input.supportedWeekdays !== undefined
  ) {
    validateWeekdays(input.supportedWeekdays);
  }
  validateTime(input.cutoffTime);

  if (
    input.minEtaMinutes !== undefined &&
    input.minEtaMinutes < 0
  ) {
    throw new DeliveryError("invalid_request", 400);
  }

  if (
    input.maxEtaMinutes !== undefined &&
    input.minEtaMinutes !== undefined &&
    input.maxEtaMinutes < input.minEtaMinutes
  ) {
    throw new DeliveryError("invalid_request", 400);
  }

  if (
    input.surchargeType === "multiplier" &&
    input.surchargeValue !== undefined &&
    input.surchargeValue < 1
  ) {
    throw new DeliveryError("invalid_request", 400);
  }
}

function haversineKm(
  originLatitude: number,
  originLongitude: number,
  targetLatitude: number,
  targetLongitude: number
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const latitudeDelta = toRadians(targetLatitude - originLatitude);
  const longitudeDelta = toRadians(targetLongitude - originLongitude);
  const lat1 = toRadians(originLatitude);
  const lat2 = toRadians(targetLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function afghanistanClock(now: Date) {
  const local = new Date(
    now.getTime() + AFGHANISTAN_UTC_OFFSET_MINUTES * 60_000
  );

  return {
    weekday: local.getUTCDay(),
    minuteOfDay: local.getUTCHours() * 60 + local.getUTCMinutes()
  };
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function isCutoffMissed(
  cutoff: string | null,
  minuteOfDay: number
): boolean {
  return cutoff !== null && minuteOfDay > timeToMinutes(cutoff);
}

function zoneSpecificity(zone: DeliveryZoneRecord): number {
  return (
    (zone.province ? 1 : 0) +
    (zone.districtCity ? 2 : 0) +
    (zone.areaNeighborhood ? 4 : 0)
  );
}

function matchingZone(
  config: DeliveryRuntimeConfiguration,
  address: {
    province: string;
    districtCity: string;
    areaNeighborhood: string | null;
  }
): DeliveryZoneRecord | null {
  const province = normalizeLocation(address.province);
  const district = normalizeLocation(address.districtCity);
  const area = normalizeLocation(address.areaNeighborhood);

  return (
    config.zones
      .filter((zone) => zone.active)
      .filter((zone) => {
        const zoneProvince = normalizeLocation(zone.province);
        const zoneDistrict = normalizeLocation(zone.districtCity);
        const zoneArea = normalizeLocation(zone.areaNeighborhood);

        return (
          (!zoneProvince || zoneProvince === province) &&
          (!zoneDistrict || zoneDistrict === district) &&
          (!zoneArea || zoneArea === area)
        );
      })
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          zoneSpecificity(right) - zoneSpecificity(left) ||
          left.id.localeCompare(right.id)
      )[0] ?? null
  );
}

function distanceRule(
  config: DeliveryRuntimeConfiguration,
  distanceKm: number
): DeliveryDistanceRuleRecord | null {
  return (
    config.distanceRules
      .filter((rule) => rule.active)
      .filter(
        (rule) =>
          distanceKm >= rule.minDistanceKm &&
          (rule.maxDistanceKm === null ||
            distanceKm < rule.maxDistanceKm)
      )
      .sort((left, right) => {
        const typePriority =
          left.type === right.type
            ? 0
            : left.type === "tier"
              ? -1
              : 1;

        return (
          right.priority - left.priority ||
          typePriority ||
          right.minDistanceKm - left.minDistanceKm ||
          left.id.localeCompare(right.id)
        );
      })[0] ?? null
  );
}

function baseDeliveryRule(
  config: DeliveryRuntimeConfiguration,
  address: {
    province: string;
    districtCity: string;
    areaNeighborhood: string | null;
    mapLatitude: number | null;
    mapLongitude: number | null;
  }
): {
  fee: number;
  audit: DeliveryRuleAudit;
  distanceKm: number | null;
} | null {
  const zone = matchingZone(config, address);

  if (zone) {
    return {
      fee: zone.fee,
      distanceKm: null,
      audit: {
        type: "zone",
        id: zone.id,
        label: zone.name,
        zoneId: zone.id,
        distanceKm: null,
        distanceSource: "not_required"
      }
    };
  }

  let distanceKm: number | null = null;

  if (
    config.settings.originLatitude !== null &&
    config.settings.originLongitude !== null &&
    address.mapLatitude !== null &&
    address.mapLongitude !== null
  ) {
    distanceKm = haversineKm(
      config.settings.originLatitude,
      config.settings.originLongitude,
      address.mapLatitude,
      address.mapLongitude
    );

    const rule = distanceRule(config, distanceKm);

    if (rule) {
      const fee =
        rule.type === "tier"
          ? rule.fee ?? 0
          : (rule.baseFee ?? 0) + (rule.perKmFee ?? 0) * distanceKm;

      return {
        fee: roundMoney(fee),
        distanceKm,
        audit: {
          type:
            rule.type === "tier"
              ? "distance_tier"
              : "base_per_km",
          id: rule.id,
          label: rule.name,
          zoneId: null,
          distanceKm: roundMoney(distanceKm),
          distanceSource: "straight_line_fallback"
        }
      };
    }
  }

  if (config.settings.defaultDeliveryFee !== null) {
    return {
      fee: config.settings.defaultDeliveryFee,
      distanceKm,
      audit: {
        type: "store_default",
        id: null,
        label: "Store default",
        zoneId: null,
        distanceKm:
          distanceKm === null ? null : roundMoney(distanceKm),
        distanceSource:
          distanceKm === null
            ? "unavailable"
            : "straight_line_fallback"
      }
    };
  }

  return null;
}

function estimate(
  now: Date,
  minMinutes: number,
  maxMinutes: number
) {
  return {
    min: new Date(now.getTime() + minMinutes * 60_000).toISOString(),
    max: new Date(now.getTime() + maxMinutes * 60_000).toISOString()
  };
}

export interface DeliveryServiceContract {
  getConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreDeliveryConfigurationResponse>;
  updateSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreDeliverySettingsInput
  ): Promise<StoreDeliveryConfigurationResponse>;
  createZone(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryZoneInput
  ): Promise<StoreDeliveryConfigurationResponse>;
  updateZone(
    ownerUserId: string,
    storeId: string,
    zoneId: string,
    input: UpdateDeliveryZoneInput
  ): Promise<StoreDeliveryConfigurationResponse>;
  deleteZone(
    ownerUserId: string,
    storeId: string,
    zoneId: string
  ): Promise<StoreDeliveryConfigurationResponse>;
  createDistanceRule(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryDistanceRuleInput
  ): Promise<StoreDeliveryConfigurationResponse>;
  updateDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string,
    input: UpdateDeliveryDistanceRuleInput
  ): Promise<StoreDeliveryConfigurationResponse>;
  deleteDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string
  ): Promise<StoreDeliveryConfigurationResponse>;
  createSpeed(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliverySpeedInput
  ): Promise<StoreDeliveryConfigurationResponse>;
  updateSpeed(
    ownerUserId: string,
    storeId: string,
    speedId: string,
    input: UpdateDeliverySpeedInput
  ): Promise<StoreDeliveryConfigurationResponse>;
  deleteSpeed(
    ownerUserId: string,
    storeId: string,
    speedId: string
  ): Promise<StoreDeliveryConfigurationResponse>;
  options(
    userId: string,
    addressId: string
  ): Promise<DeliveryOptionsResponse>;
  createCheckoutQuote(
    userId: string,
    input: CreateDeliveryCheckoutQuoteInput
  ): Promise<DeliveryCheckoutQuoteResponse>;
  getCheckoutQuote(
    userId: string,
    sessionId: string
  ): Promise<DeliveryCheckoutQuoteResponse>;
}

export class DeliveryService implements DeliveryServiceContract {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly cartPricingService: CartPricingServiceContract
  ) {}

  private async merchantConfig(
    ownerUserId: string,
    storeId: string
  ) {
    const config = await this.repository.getMerchantConfiguration(
      ownerUserId,
      storeId
    );

    if (!config) {
      throw new DeliveryError("store_not_found", 404);
    }

    if (
      !["active", "grace_period"].includes(
        config.store.subscription.status
      )
    ) {
      throw new DeliveryError("subscription_unavailable", 409);
    }

    return config;
  }

  private requireAdvanced(config: StoreDeliveryConfigurationResponse) {
    if (!config.entitlements.advancedDelivery) {
      throw new DeliveryError("advanced_delivery_unavailable", 409);
    }
  }

  async getConfiguration(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreDeliveryConfigurationResponse> {
    return this.merchantConfig(ownerUserId, storeId);
  }

  async updateSettings(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreDeliverySettingsInput
  ): Promise<StoreDeliveryConfigurationResponse> {
    const current = await this.merchantConfig(ownerUserId, storeId);
    validateCoordinatePair(
      input.originLatitude,
      input.originLongitude,
      current.settings.originLatitude,
      current.settings.originLongitude
    );

    const normalized = normalizeSettingsInput(input);

    if (
      normalized.pickupMinMinutes !== undefined &&
      normalized.pickupMaxMinutes === undefined &&
      normalized.pickupMinMinutes > current.settings.pickupMaxMinutes
    ) {
      throw new DeliveryError("invalid_request", 400);
    }

    if (
      normalized.pickupMaxMinutes !== undefined &&
      normalized.pickupMinMinutes === undefined &&
      normalized.pickupMaxMinutes < current.settings.pickupMinMinutes
    ) {
      throw new DeliveryError("invalid_request", 400);
    }

    const updated = await this.repository.updateSettings(
      ownerUserId,
      storeId,
      normalized
    );

    if (!updated) {
      throw new DeliveryError("store_not_found", 404);
    }

    if (
      (normalized.deliveryEnabled ?? current.settings.deliveryEnabled) ===
      true
    ) {
      await this.repository.ensureDefaultSpeed(ownerUserId, storeId);
    }

    return this.merchantConfig(ownerUserId, storeId);
  }

  async createZone(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryZoneInput
  ) {
    await this.merchantConfig(ownerUserId, storeId);
    const zone = await this.repository.createZone(
      ownerUserId,
      storeId,
      normalizeZoneInput(input)
    );
    if (!zone) throw new DeliveryError("store_not_found", 404);
    return this.merchantConfig(ownerUserId, storeId);
  }

  async updateZone(
    ownerUserId: string,
    storeId: string,
    zoneId: string,
    input: UpdateDeliveryZoneInput
  ) {
    const current = await this.merchantConfig(ownerUserId, storeId);
    const existing = current.zones.find((zone) => zone.id === zoneId);
    if (!existing) throw new DeliveryError("delivery_zone_not_found", 404);

    const merged = normalizeZoneInput({
      name: input.name ?? existing.name,
      province:
        input.province !== undefined ? input.province : existing.province,
      districtCity:
        input.districtCity !== undefined
          ? input.districtCity
          : existing.districtCity,
      areaNeighborhood:
        input.areaNeighborhood !== undefined
          ? input.areaNeighborhood
          : existing.areaNeighborhood,
      fee: input.fee ?? existing.fee,
      priority: input.priority ?? existing.priority,
      active: input.active ?? existing.active
    });

    const updated = await this.repository.updateZone(
      ownerUserId,
      storeId,
      zoneId,
      merged
    );
    if (!updated) throw new DeliveryError("delivery_zone_not_found", 404);
    return this.merchantConfig(ownerUserId, storeId);
  }

  async deleteZone(ownerUserId: string, storeId: string, zoneId: string) {
    await this.merchantConfig(ownerUserId, storeId);
    if (!(await this.repository.deleteZone(ownerUserId, storeId, zoneId))) {
      throw new DeliveryError("delivery_zone_not_found", 404);
    }
    return this.merchantConfig(ownerUserId, storeId);
  }

  async createDistanceRule(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliveryDistanceRuleInput
  ) {
    const config = await this.merchantConfig(ownerUserId, storeId);
    this.requireAdvanced(config);
    validateDistanceRule(input);
    const created = await this.repository.createDistanceRule(
      ownerUserId,
      storeId,
      { ...input, name: input.name.trim() }
    );
    if (!created) throw new DeliveryError("store_not_found", 404);
    return this.merchantConfig(ownerUserId, storeId);
  }

  async updateDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string,
    input: UpdateDeliveryDistanceRuleInput
  ) {
    const config = await this.merchantConfig(ownerUserId, storeId);
    this.requireAdvanced(config);
    const existing = config.distanceRules.find((rule) => rule.id === ruleId);
    if (!existing) {
      throw new DeliveryError("delivery_distance_rule_not_found", 404);
    }

    const merged: CreateDeliveryDistanceRuleInput = {
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      minDistanceKm:
        input.minDistanceKm ?? existing.minDistanceKm,
      maxDistanceKm:
        input.maxDistanceKm !== undefined
          ? input.maxDistanceKm
          : existing.maxDistanceKm,
      fee: input.fee !== undefined ? input.fee : existing.fee,
      baseFee:
        input.baseFee !== undefined ? input.baseFee : existing.baseFee,
      perKmFee:
        input.perKmFee !== undefined ? input.perKmFee : existing.perKmFee,
      priority: input.priority ?? existing.priority,
      active: input.active ?? existing.active
    };
    validateDistanceRule(merged);

    const updated = await this.repository.updateDistanceRule(
      ownerUserId,
      storeId,
      ruleId,
      merged
    );
    if (!updated) {
      throw new DeliveryError("delivery_distance_rule_not_found", 404);
    }
    return this.merchantConfig(ownerUserId, storeId);
  }

  async deleteDistanceRule(
    ownerUserId: string,
    storeId: string,
    ruleId: string
  ) {
    const config = await this.merchantConfig(ownerUserId, storeId);
    this.requireAdvanced(config);
    if (
      !(await this.repository.deleteDistanceRule(
        ownerUserId,
        storeId,
        ruleId
      ))
    ) {
      throw new DeliveryError("delivery_distance_rule_not_found", 404);
    }
    return this.merchantConfig(ownerUserId, storeId);
  }

  private validateSpeedEntitlement(
    config: StoreDeliveryConfigurationResponse,
    input: CreateDeliverySpeedInput | UpdateDeliverySpeedInput
  ) {
    const advanced =
      input.surchargeType === "multiplier" ||
      input.maxRangeKm != null ||
      input.maxWeightGrams != null;

    if (advanced) {
      this.requireAdvanced(config);
    }
  }

  async createSpeed(
    ownerUserId: string,
    storeId: string,
    input: CreateDeliverySpeedInput
  ) {
    const config = await this.merchantConfig(ownerUserId, storeId);
    validateSpeed(input);
    this.validateSpeedEntitlement(config, input);

    const created = await this.repository.createSpeed(
      ownerUserId,
      storeId,
      { ...input, name: input.name.trim() }
    );
    if (!created) throw new DeliveryError("store_not_found", 404);
    return this.merchantConfig(ownerUserId, storeId);
  }

  async updateSpeed(
    ownerUserId: string,
    storeId: string,
    speedId: string,
    input: UpdateDeliverySpeedInput
  ) {
    const config = await this.merchantConfig(ownerUserId, storeId);
    const existing = config.speeds.find((speed) => speed.id === speedId);
    if (!existing) {
      throw new DeliveryError("delivery_speed_not_found", 404);
    }

    const merged: CreateDeliverySpeedInput = {
      name: input.name ?? existing.name,
      kind: input.kind ?? existing.kind,
      surchargeType:
        input.surchargeType ?? existing.surchargeType,
      surchargeValue:
        input.surchargeValue ?? existing.surchargeValue,
      minEtaMinutes:
        input.minEtaMinutes ?? existing.minEtaMinutes,
      maxEtaMinutes:
        input.maxEtaMinutes ?? existing.maxEtaMinutes,
      minimumOrderAmount:
        input.minimumOrderAmount !== undefined
          ? input.minimumOrderAmount
          : existing.minimumOrderAmount,
      maxRangeKm:
        input.maxRangeKm !== undefined
          ? input.maxRangeKm
          : existing.maxRangeKm,
      cutoffTime:
        input.cutoffTime !== undefined
          ? input.cutoffTime
          : existing.cutoffTime,
      supportedWeekdays:
        input.supportedWeekdays ?? existing.supportedWeekdays,
      maxWeightGrams:
        input.maxWeightGrams !== undefined
          ? input.maxWeightGrams
          : existing.maxWeightGrams,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      active: input.active ?? existing.active
    };

    validateSpeed(merged);
    this.validateSpeedEntitlement(config, merged);

    const updated = await this.repository.updateSpeed(
      ownerUserId,
      storeId,
      speedId,
      merged
    );
    if (!updated) throw new DeliveryError("delivery_speed_not_found", 404);
    return this.merchantConfig(ownerUserId, storeId);
  }

  async deleteSpeed(ownerUserId: string, storeId: string, speedId: string) {
    await this.merchantConfig(ownerUserId, storeId);
    if (!(await this.repository.deleteSpeed(ownerUserId, storeId, speedId))) {
      throw new DeliveryError("delivery_speed_not_found", 404);
    }
    return this.merchantConfig(ownerUserId, storeId);
  }

  private async buildOptions(
    userId: string,
    addressId: string,
    now = new Date()
  ): Promise<DeliveryOptionsResponse> {
    const [address, cart] = await Promise.all([
      this.repository.findAddress(userId, addressId),
      this.cartPricingService.getCart(userId)
    ]);

    if (!address) {
      throw new DeliveryError("address_not_found", 404);
    }

    if (cart.itemCount === 0) {
      throw new DeliveryError("cart_empty", 409);
    }

    if (cart.hasBlockingIssues) {
      throw new DeliveryError("checkout_unavailable", 409);
    }

    const productIds = [
      ...new Set(
        cart.groups.flatMap((group) =>
          group.items.map((item) => item.productId)
        )
      )
    ];
    const productStates = await this.repository.getProductStates(productIds);
    const productById = new Map(
      productStates.map((product) => [product.id, product])
    );
    const merchantGroups: DeliveryMerchantQuote[] = [];
    const clock = afghanistanClock(now);

    for (const group of cart.groups) {
      const config = await this.repository.getRuntimeConfiguration(
        group.store.id
      );

      if (
        !config ||
        config.store.status !== "published" ||
        !["active", "grace_period"].includes(
          config.store.subscriptionStatus
        )
      ) {
        merchantGroups.push({
          storeId: group.store.id,
          storeName: group.store.name,
          available: false,
          unavailableReason: "delivery_disabled",
          options: []
        });
        continue;
      }

      const itemStates = group.items
        .map((item) => ({
          item,
          product: productById.get(item.productId)
        }))
        .filter(
          (entry): entry is {
            item: (typeof group.items)[number];
            product: DeliveryProductState;
          } => Boolean(entry.product)
        );

      if (itemStates.length !== group.items.length) {
        throw new DeliveryError("checkout_unavailable", 409);
      }

      const physical = itemStates.filter(
        ({ product }) =>
          product.deliveryProfile !== "digital_no_delivery"
      );

      if (physical.length === 0) {
        merchantGroups.push({
          storeId: group.store.id,
          storeName: group.store.name,
          available: true,
          unavailableReason: null,
          options: [
            {
              optionId: "digital:" + group.store.id,
              storeId: group.store.id,
              fulfillmentType: "digital",
              label: "Digital / no delivery",
              speedKind: null,
              price: {
                baseDelivery: 0,
                urgencySurcharge: 0,
                productDeliverySurcharge: 0,
                freeDeliveryDiscount: 0,
                finalDeliveryPrice: 0
              },
              estimatedMinAt: now.toISOString(),
              estimatedMaxAt: now.toISOString(),
              ruleUsed: {
                type: "digital",
                id: null,
                label: "Digital / no delivery",
                zoneId: null,
                distanceKm: null,
                distanceSource: "not_required"
              }
            }
          ]
        });
        continue;
      }

      const hasPickupOnly = physical.some(
        ({ product }) => product.deliveryProfile === "pickup_only"
      );
      const hasSellerDeliveryOnly = physical.some(
        ({ product }) =>
          product.deliveryProfile === "seller_delivery_only"
      );
      const hasNoExpress = physical.some(
        ({ product }) => product.deliveryProfile === "no_express"
      );
      const totalWeightKnown = physical.every(
        ({ product }) => product.weightGrams !== null
      );
      const totalWeight = totalWeightKnown
        ? physical.reduce(
            (sum, { item, product }) =>
              sum + (product.weightGrams ?? 0) * item.quantity,
            0
          )
        : null;
      const productSurcharge = roundMoney(
        physical.reduce(
          (sum, { item, product }) =>
            sum + product.deliverySurcharge * item.quantity,
          0
        )
      );

      const options: DeliveryOptionQuote[] = [];
      const operatingDay =
        config.settings.operatingWeekdays.includes(clock.weekday);
      const storeCutoffMissed = isCutoffMissed(
        config.settings.cutoffTime,
        clock.minuteOfDay
      );

      if (
        config.settings.pickupEnabled &&
        !hasSellerDeliveryOnly &&
        operatingDay &&
        !storeCutoffMissed
      ) {
        const eta = estimate(
          now,
          config.settings.pickupMinMinutes,
          config.settings.pickupMaxMinutes
        );

        options.push({
          optionId: "pickup:" + group.store.id,
          storeId: group.store.id,
          fulfillmentType: "pickup",
          label: "Store pickup",
          speedKind: null,
          price: {
            baseDelivery: 0,
            urgencySurcharge: 0,
            productDeliverySurcharge: 0,
            freeDeliveryDiscount: 0,
            finalDeliveryPrice: 0
          },
          estimatedMinAt: eta.min,
          estimatedMaxAt: eta.max,
          ruleUsed: {
            type: "pickup",
            id: null,
            label: "Store pickup",
            zoneId: null,
            distanceKm: null,
            distanceSource: "not_required"
          }
        });
      }

      let deliveryUnavailableReason:
        DeliveryMerchantQuote["unavailableReason"] = null;

      if (!config.settings.deliveryEnabled) {
        deliveryUnavailableReason = "delivery_disabled";
      } else if (hasPickupOnly) {
        deliveryUnavailableReason = "product_restriction";
      } else if (!operatingDay) {
        deliveryUnavailableReason = "operating_day";
      } else if (storeCutoffMissed) {
        deliveryUnavailableReason = "cutoff_missed";
      } else if (
        config.settings.minimumOrderAmount !== null &&
        group.preDeliveryTotal < config.settings.minimumOrderAmount
      ) {
        deliveryUnavailableReason = "minimum_order";
      } else {
        const base = baseDeliveryRule(config, address);

        if (!base) {
          const coordinatesMissing =
            address.mapLatitude === null ||
            address.mapLongitude === null ||
            config.settings.originLatitude === null ||
            config.settings.originLongitude === null;

          deliveryUnavailableReason =
            coordinatesMissing &&
            config.distanceRules.some((rule) => rule.active) &&
            !matchingZone(config, address) &&
            config.settings.defaultDeliveryFee === null
              ? "address_location_required"
              : "outside_coverage";
        } else {
          const activeSpeeds = config.speeds.filter((speed) => speed.active);

          for (const speed of activeSpeeds) {
            if (!speed.supportedWeekdays.includes(clock.weekday)) continue;
            if (isCutoffMissed(speed.cutoffTime, clock.minuteOfDay)) continue;
            if (
              speed.minimumOrderAmount !== null &&
              group.preDeliveryTotal < speed.minimumOrderAmount
            ) {
              continue;
            }
            if (
              speed.maxRangeKm !== null &&
              (base.distanceKm === null ||
                base.distanceKm > speed.maxRangeKm)
            ) {
              continue;
            }
            if (
              speed.maxWeightGrams !== null &&
              (totalWeight === null ||
                totalWeight > speed.maxWeightGrams)
            ) {
              continue;
            }
            if (hasNoExpress && speed.kind === "express") continue;

            const urgencySurcharge =
              speed.surchargeType === "fixed"
                ? speed.surchargeValue
                : roundMoney(
                    base.fee * Math.max(0, speed.surchargeValue - 1)
                  );
            const deliveryBeforeFree = roundMoney(
              base.fee + urgencySurcharge + productSurcharge
            );
            const freeEligible =
              config.settings.freeDeliveryThreshold !== null &&
              group.preDeliveryTotal >=
                config.settings.freeDeliveryThreshold;
            const freeDeliveryDiscount = freeEligible
              ? deliveryBeforeFree
              : 0;
            const finalDeliveryPrice = roundMoney(
              deliveryBeforeFree - freeDeliveryDiscount
            );
            const eta = estimate(
              now,
              speed.minEtaMinutes,
              speed.maxEtaMinutes
            );

            options.push({
              optionId: speed.id,
              storeId: group.store.id,
              fulfillmentType: "delivery",
              label: speed.name,
              speedKind: speed.kind,
              price: {
                baseDelivery: roundMoney(base.fee),
                urgencySurcharge,
                productDeliverySurcharge: productSurcharge,
                freeDeliveryDiscount,
                finalDeliveryPrice
              },
              estimatedMinAt: eta.min,
              estimatedMaxAt: eta.max,
              ruleUsed: freeEligible
                ? {
                    ...base.audit,
                    type: "free_delivery",
                    label: "Free delivery via " + base.audit.label
                  }
                : base.audit
            });
          }

          if (activeSpeeds.length > 0 && options.every(
            (option) => option.fulfillmentType !== "delivery"
          )) {
            deliveryUnavailableReason = "product_restriction";
          }
        }
      }

      merchantGroups.push({
        storeId: group.store.id,
        storeName: group.store.name,
        available: options.length > 0,
        unavailableReason:
          options.length > 0 ? null : deliveryUnavailableReason,
        options
      });
    }

    return {
      address,
      cart,
      merchantGroups,
      canContinue: merchantGroups.every((group) => group.available),
      quotedAt: now.toISOString()
    };
  }

  async options(
    userId: string,
    addressId: string
  ): Promise<DeliveryOptionsResponse> {
    return this.buildOptions(userId, addressId);
  }

  async createCheckoutQuote(
    userId: string,
    input: CreateDeliveryCheckoutQuoteInput
  ): Promise<DeliveryCheckoutQuoteResponse> {
    const optionsResponse = await this.buildOptions(
      userId,
      input.addressId
    );

    if (!optionsResponse.canContinue) {
      throw new DeliveryError("delivery_unavailable", 409);
    }

    const selectionByStore = new Map(
      input.selections.map((selection) => [
        selection.storeId,
        selection.optionId
      ])
    );

    if (
      selectionByStore.size !== optionsResponse.merchantGroups.length
    ) {
      throw new DeliveryError("delivery_option_invalid", 409);
    }

    const selectedOptions: DeliveryOptionQuote[] = [];

    for (const group of optionsResponse.merchantGroups) {
      const optionId = selectionByStore.get(group.storeId);
      const option = group.options.find(
        (candidate) => candidate.optionId === optionId
      );

      if (!option) {
        throw new DeliveryError("delivery_option_invalid", 409);
      }

      selectedOptions.push(option);
    }

    const deliveryBase = roundMoney(
      selectedOptions.reduce(
        (sum, option) => sum + option.price.baseDelivery,
        0
      )
    );
    const urgencySurcharge = roundMoney(
      selectedOptions.reduce(
        (sum, option) => sum + option.price.urgencySurcharge,
        0
      )
    );
    const productDeliverySurcharge = roundMoney(
      selectedOptions.reduce(
        (sum, option) =>
          sum + option.price.productDeliverySurcharge,
        0
      )
    );
    const freeDeliveryDiscount = roundMoney(
      selectedOptions.reduce(
        (sum, option) =>
          sum + option.price.freeDeliveryDiscount,
        0
      )
    );
    const deliveryTotal = roundMoney(
      selectedOptions.reduce(
        (sum, option) => sum + option.price.finalDeliveryPrice,
        0
      )
    );

    const totals = {
      ...optionsResponse.cart.totals,
      deliveryBase,
      urgencySurcharge,
      productDeliverySurcharge,
      freeDeliveryDiscount,
      deliveryTotal,
      disclosedFees: 0,
      configuredTax: 0,
      finalBeforePaymentTotal: roundMoney(
        optionsResponse.cart.totals.preDeliveryTotal + deliveryTotal
      )
    };

    const snapshot = {
      address: optionsResponse.address,
      cart: optionsResponse.cart,
      deliverySelections: selectedOptions,
      totals,
      steps: {
        address: "ready",
        delivery: "ready",
        payment: "pending_phase_7",
        review: "delivery_pricing_ready",
        placeOrder: "blocked_until_phase_8"
      },
      canProceedToPayment: true,
      canPlaceOrder: false
    } satisfies Omit<
      DeliveryCheckoutQuoteResponse,
      "sessionId" | "status" | "expiresAt"
    >;

    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
    const session = await this.repository.persistCheckoutQuote({
      userId,
      cartId: optionsResponse.cart.id,
      addressId: optionsResponse.address.id,
      cartUpdatedAt: new Date(optionsResponse.cart.updatedAt),
      snapshot: snapshot as unknown as Record<string, unknown>,
      expiresAt
    });

    return {
      sessionId: session.id,
      status: "quoted",
      ...snapshot,
      expiresAt: session.expiresAt.toISOString()
    };
  }

  async getCheckoutQuote(
    userId: string,
    sessionId: string
  ): Promise<DeliveryCheckoutQuoteResponse> {
    const row = await this.repository.getPersistedQuote(
      userId,
      sessionId
    );

    if (
      !row ||
      row.status !== "quoted" ||
      !row.pricingSnapshot ||
      !row.expiresAt ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      throw new DeliveryError("checkout_unavailable", 404);
    }

    const snapshot = row.pricingSnapshot as unknown as Omit<
      DeliveryCheckoutQuoteResponse,
      "sessionId" | "status" | "expiresAt"
    >;

    if (
      snapshot.steps?.delivery !== "ready" ||
      !Array.isArray(snapshot.deliverySelections)
    ) {
      throw new DeliveryError("checkout_unavailable", 404);
    }

    return {
      sessionId: row.id,
      status: "quoted",
      ...snapshot,
      expiresAt: row.expiresAt.toISOString()
    };
  }
}
