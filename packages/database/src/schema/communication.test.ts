import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  notifications,
  pushDeliveries,
  pushDeviceTokens,
  supportMessages,
  supportTickets
} from "./communication.js";

describe("communication schema", () => {
  it("uses stable Phase 9 notification and support table names", () => {
    expect(getTableName(notifications)).toBe("notifications");
    expect(getTableName(pushDeviceTokens)).toBe("push_device_tokens");
    expect(getTableName(pushDeliveries)).toBe("push_deliveries");
    expect(getTableName(supportTickets)).toBe("support_tickets");
    expect(getTableName(supportMessages)).toBe("support_messages");
  });

  it("starts support and push delivery in safe states", () => {
    expect(supportTickets.status.default).toBe("open");
    expect(pushDeviceTokens.active.default).toBe(true);
    expect(pushDeliveries.state.default).toBe("queued");
  });

  it("keeps notifications and support linked to real users", () => {
    expect(notifications.userId.dataType).toBe("string");
    expect(supportTickets.userId.dataType).toBe("string");
    expect(supportMessages.authorUserId.dataType).toBe("string");
  });
});
