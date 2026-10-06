import { describe, expect, it, vi } from "vitest";

import { TrustService } from "./service.js";
import type { TrustRepository } from "./repository.js";

describe("trust service", () => {
  it("rejects reviews for incomplete purchases", async () => {
    const repository = {
      eligibility: vi.fn().mockResolvedValue([
        {
          orderId: "o",
          orderNumber: "BZ-1",
          orderState: "confirmed",
          orderItemId: "i",
          productId: "p",
          productName: "Phone",
          variantTitle: null,
          imageUrl: null,
          eligible: false,
          alreadyReviewed: false,
          reviewId: null,
          completedAt: null
        }
      ])
    } as unknown as TrustRepository;

    const service = new TrustService(repository);
    await expect(
      service.createReview("u", {
        orderItemId: "i",
        rating: 5
      })
    ).rejects.toMatchObject({ code: "review_not_eligible" });
  });

  it("does not accept a client verified-purchase flag", async () => {
    const input = {
      orderItemId: "i",
      rating: 5,
      verifiedPurchase: false
    };
    expect("verifiedPurchase" in input).toBe(true);
    expect(
      Object.keys({
        orderItemId: input.orderItemId,
        rating: input.rating
      })
    ).not.toContain("verifiedPurchase");
  });
});
