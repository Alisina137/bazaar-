import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  cartItems,
  carts,
  cartStoreCoupons,
  checkoutSessions,
  customerAddresses,
  storeCoupons
} from "./commerce.js";

describe("commerce schema", () => {
  it("uses stable Phase 5 table names", () => {
    expect(getTableName(customerAddresses)).toBe("customer_addresses");
    expect(getTableName(carts)).toBe("carts");
    expect(getTableName(cartItems)).toBe("cart_items");
    expect(getTableName(storeCoupons)).toBe("store_coupons");
    expect(getTableName(cartStoreCoupons)).toBe("cart_store_coupons");
    expect(getTableName(checkoutSessions)).toBe("checkout_sessions");
  });

  it("keeps cart ownership and commerce references UUID backed", () => {
    expect(customerAddresses.userId.dataType).toBe("string");
    expect(carts.userId.dataType).toBe("string");
    expect(cartItems.cartId.dataType).toBe("string");
    expect(cartItems.productId.dataType).toBe("string");
    expect(cartItems.variantId.dataType).toBe("string");
    expect(storeCoupons.storeId.dataType).toBe("string");
    expect(checkoutSessions.addressId.dataType).toBe("string");
  });

  it("defaults cart currency and safe lifecycle fields", () => {
    expect(carts.currency.default).toBe("AFN");
    expect(customerAddresses.country.default).toBe("Afghanistan");
    expect(customerAddresses.isDefault.default).toBe(false);
    expect(storeCoupons.active.default).toBe(true);
    expect(checkoutSessions.status.default).toBe("draft");
  });
});
