import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  stores,
  storeSubscriptions
} from "./store.js";

describe("store schema", () => {
  it("uses stable store table names", () => {
    expect(getTableName(stores)).toBe("stores");
    expect(getTableName(storeSubscriptions)).toBe("store_subscriptions");
  });

  it("keeps store ownership and subscription identifiers as UUID strings", () => {
    expect(stores.id.dataType).toBe("string");
    expect(stores.ownerUserId.dataType).toBe("string");
    expect(storeSubscriptions.storeId.dataType).toBe("string");
  });

  it("defaults new stores to draft with a Starter subscription", () => {
    expect(stores.status.default).toBe("draft");
    expect(stores.theme.default).toBe("minimal");
    expect(storeSubscriptions.plan.default).toBe("starter");
    expect(storeSubscriptions.status.default).toBe("active");
  });
});
