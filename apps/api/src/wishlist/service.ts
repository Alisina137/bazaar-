import type { CustomerWishlistResponse, WishlistMutationResponse } from "@bazaarlink/contracts";

import type { MarketplaceRepository } from "../marketplace/repository.js";
import type { WishlistRepository } from "./repository.js";

export class WishlistError extends Error {
  constructor(public readonly code: "product_not_found" | "wishlist_full", public readonly statusCode: number) {
    super(code);
  }
}

export interface WishlistServiceContract {
  list(userId: string): Promise<CustomerWishlistResponse>;
  add(userId: string, productId: string): Promise<WishlistMutationResponse>;
  remove(userId: string, productId: string): Promise<WishlistMutationResponse>;
}

export class WishlistService implements WishlistServiceContract {
  constructor(
    private readonly wishlist: WishlistRepository,
    private readonly marketplace: MarketplaceRepository
  ) {}

  async list(userId: string): Promise<CustomerWishlistResponse> {
    const ids = await this.wishlist.ids(userId);
    // Public product lookup excludes unpublished, restricted or suspended items.
    const products = await this.marketplace.findProductsByIds(ids);
    return { products, savedProductIds: products.map(p => p.id) };
  }

  async add(userId: string, productId: string): Promise<WishlistMutationResponse> {
    // Idempotent saves should succeed without consuming another quota.
    if (await this.wishlist.contains(userId, productId)) {
      return { saved: true, productId };
    }
    const product = await this.marketplace.findProduct(productId);
    if (!product) throw new WishlistError("product_not_found", 404);
    if (await this.wishlist.count(userId) >= 100) {
      throw new WishlistError("wishlist_full", 409);
    }
    await this.wishlist.add(userId, productId);
    return { saved: true, productId };
  }

  async remove(userId: string, productId: string): Promise<WishlistMutationResponse> {
    await this.wishlist.remove(userId, productId);
    return { saved: false, productId };
  }
}
