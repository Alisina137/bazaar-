import type { MarketplaceProductSummary } from "@bazaarlink/contracts";
import { describe, it, expect } from "vitest";
import type { MarketplaceRepository } from "../marketplace/repository.js";
import type { WishlistRepository } from "./repository.js";
import { WishlistService } from "./service.js";

const visible = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Public product"
} as MarketplaceProductSummary;
const hidden = "22222222-2222-4222-8222-222222222222";

function create() {
  const byAccount = new Map<string, Set<string>>();
  const bucket = (id: string) => {
    if (!byAccount.has(id)) byAccount.set(id, new Set());
    return byAccount.get(id)!;
  };
  const repo: WishlistRepository = {
    ids: async id => [...bucket(id)],
    contains: async (id, product) => bucket(id).has(product),
    count: async id => bucket(id).size,
    add: async (id, product) => { bucket(id).add(product); },
    remove: async (id, product) => { bucket(id).delete(product); }
  };
  const marketplace: MarketplaceRepository = {
    findProduct: async productId =>
      productId === visible.id ? ({ ...visible, images: [], variants: [], tags: [] }) : null,
    findProductsByIds: async ids => ids.filter(id => id === visible.id).map(() => visible)
  } as MarketplaceRepository;
  return { service: new WishlistService(repo, marketplace), repo };
}

describe("customer wishlist", () => {
  it("persists independently by user; saves and removes idempotently", async () => {
    const { service } = create();
    const accountA = "account-a", accountB = "account-b";
    await service.add(accountA, visible.id);
    await service.add(accountA, visible.id);
    expect((await service.list(accountA)).savedProductIds).toEqual([visible.id]);
    expect((await service.list(accountB)).products).toEqual([]);
    await service.remove(accountB, visible.id);
    expect((await service.list(accountA)).savedProductIds).toEqual([visible.id]);
    await service.remove(accountA, visible.id);
    expect((await service.list(accountA)).products).toEqual([]);
  });

  it("rejects hidden products and only returns publicly available summaries", async () => {
    const { service, repo } = create();
    await expect(service.add("owner", hidden)).rejects.toMatchObject({
      code: "product_not_found", statusCode: 404
    });
    await repo.add("owner", hidden);
    await service.add("owner", visible.id);
    expect((await service.list("owner")).products.map(p => p.id)).toEqual([visible.id]);
  });

  it("rejects saving a 101st item but allows idempotent existing saves", async () => {
    const { service, repo } = create();
    const owner = "owner";
    for (let i=0;i<100;i++) {
      await repo.add(owner, i.toString(16).padStart(36,"0"));
    }
    await expect(service.add(owner, visible.id)).rejects.toMatchObject({
      code: "wishlist_full", statusCode: 409
    });
  });
});
