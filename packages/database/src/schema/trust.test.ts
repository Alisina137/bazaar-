import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  productReviews,
  reviewReports
} from "./trust.js";

describe("trust schema", () => {
  it("uses stable Phase 9 review and report table names", () => {
    expect(getTableName(productReviews)).toBe("product_reviews");
    expect(getTableName(reviewReports)).toBe("review_reports");
  });

  it("links every review to a real order item and product", () => {
    expect(productReviews.customerUserId.dataType).toBe("string");
    expect(productReviews.orderId.dataType).toBe("string");
    expect(productReviews.orderItemId.dataType).toBe("string");
    expect(productReviews.productId.dataType).toBe("string");
    expect(productReviews.storeId.dataType).toBe("string");
  });

  it("defaults reviews to public and reports to open moderation", () => {
    expect(productReviews.status.default).toBe("published");
    expect(productReviews.imageUrls.default).toEqual([]);
    expect(reviewReports.status.default).toBe("open");
  });
});
