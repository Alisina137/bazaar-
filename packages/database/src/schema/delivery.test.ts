import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  deliveryDistanceRules,
  deliverySpeeds,
  deliveryZones,
  storeDeliverySettings
} from "./delivery.js";
import { products } from "./catalog.js";

describe("delivery schema", () => {
  it("uses stable Phase 6 table names", () => {
    expect(getTableName(storeDeliverySettings)).toBe(
      "store_delivery_settings"
    );
    expect(getTableName(deliveryZones)).toBe("delivery_zones");
    expect(getTableName(deliveryDistanceRules)).toBe(
      "delivery_distance_rules"
    );
    expect(getTableName(deliverySpeeds)).toBe("delivery_speeds");
  });

  it("keeps delivery ownership and references UUID backed", () => {
    expect(storeDeliverySettings.storeId.dataType).toBe("string");
    expect(deliveryZones.storeId.dataType).toBe("string");
    expect(deliveryDistanceRules.storeId.dataType).toBe("string");
    expect(deliverySpeeds.storeId.dataType).toBe("string");
  });

  it("defaults simple stores to pickup-safe delivery configuration", () => {
    expect(storeDeliverySettings.deliveryEnabled.default).toBe(false);
    expect(storeDeliverySettings.pickupEnabled.default).toBe(true);
    expect(storeDeliverySettings.pickupMinMinutes.default).toBe(30);
    expect(storeDeliverySettings.pickupMaxMinutes.default).toBe(120);
    expect(products.deliveryProfile.default).toBe("normal");
    expect(products.deliverySurcharge.default).toBe("0");
  });
});
