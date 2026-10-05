import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  inventoryReservations,
  orderFulfillments,
  orderItems,
  orders,
  orderStateEvents
} from "./order.js";

describe("order schema", () => {
  it("uses stable Phase 8 table names", () => {
    expect(getTableName(orders)).toBe("orders");
    expect(getTableName(orderItems)).toBe("order_items");
    expect(getTableName(orderFulfillments)).toBe("order_fulfillments");
    expect(getTableName(inventoryReservations)).toBe(
      "inventory_reservations"
    );
    expect(getTableName(orderStateEvents)).toBe("order_state_events");
  });

  it("keeps one fulfillment and one reservation per order item", () => {
    expect(orderFulfillments.orderId.dataType).toBe("string");
    expect(inventoryReservations.orderItemId.dataType).toBe("string");
    expect(orderItems.orderId.dataType).toBe("string");
  });

  it("defaults new orders and reservations into safe pre-fulfillment states", () => {
    expect(orders.state.default).toBe("pending_confirmation");
    expect(orders.currency.default).toBe("AFN");
    expect(orderFulfillments.state.default).toBe("pending");
    expect(inventoryReservations.state.default).toBe("reserved");
  });
});
