import { describe, expect, it, vi } from "vitest";

import { CommunicationService } from "./service.js";
import type { CommunicationRepository } from "./repository.js";

describe("communication service", () => {
  it("keeps duplicate business events idempotent through event keys", async () => {
    const createNotification = vi.fn().mockResolvedValue({
      id: "n",
      userId: "u",
      type: "order_placed",
      data: {},
      deepLink: "/orders/o",
      readAt: null,
      createdAt: new Date().toISOString()
    });
    const repository = {
      createNotification,
      activePushTokens: vi.fn().mockResolvedValue([]),
      storeOwner: vi.fn().mockResolvedValue("m")
    } as unknown as CommunicationRepository;

    const service = new CommunicationService(repository, {
      send: vi.fn()
    });

    await service.orderPlaced({
      id: "o",
      orderNumber: "BZ-1",
      customerUserId: "u",
      storeId: "s"
    });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: "order:o:placed:customer"
      })
    );
  });

  it("persists notifications even when no push token exists", async () => {
    const repository = {
      createNotification: vi.fn().mockResolvedValue({
        id: "n",
        userId: "u",
        type: "payment_failed",
        data: {},
        deepLink: "/checkout",
        readAt: null,
        createdAt: new Date().toISOString()
      }),
      activePushTokens: vi.fn().mockResolvedValue([])
    } as unknown as CommunicationRepository;
    const push = { send: vi.fn() };
    const service = new CommunicationService(repository, push);

    await service.paymentResult({
      attemptId: "a",
      userId: "u",
      storeId: "s",
      checkoutSessionId: "c",
      result: "failed"
    });

    expect(repository.createNotification).toHaveBeenCalledTimes(1);
    expect(push.send).not.toHaveBeenCalled();
  });
});
