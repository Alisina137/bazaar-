import type {
  MarketplaceCategoryRecord,
  MarketplaceProductDetail,
  MarketplaceProductSummary,
  MarketplaceStorePageResponse
} from "@bazaarlink/contracts";
import { describe, expect, it } from "vitest";

import { MarketplaceError } from "./errors.js";
import type {
  MarketplaceRepository
} from "./repository.js";
import {
  MarketplaceService,
  marketplaceFilterCapabilities
} from "./service.js";

const category: MarketplaceCategoryRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  parentId: null,
  slug: "electronics",
  nameFa: "الکترونیک",
  namePs: "برېښنایي توکي",
  nameEn: "Electronics",
  imageUrl: null,
  icon: null,
  sortOrder: 10
};

const summary: MarketplaceProductSummary = {
  id: "20000000-0000-4000-8000-000000000001",
  name: "Phone",
  description: "Test phone",
  price: 100,
  compareAtPrice: 120,
  brand: "Test",
  status: "active",
  imageUrl: null,
  inStock: true,
  hasDiscount: true,
  averageRating: 4.5,
  reviewCount: 2,
  publishedAt: new Date().toISOString(),
  store: {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Test Store",
    handle: "test-store",
    province: "Kabul",
    cityDistrict: "District 3",
    logoUrl: null,
    coverImageUrl: null,
    description: null,
    preferredLocale: "fa-AF",
    trust: {
      storeId: "30000000-0000-4000-8000-000000000001",
      phoneVerified: false,
      verificationLevel: "unverified"
    }
  },
  marketplaceCategory: category
};

const detail: MarketplaceProductDetail = {
  ...summary,
  images: [],
  variants: [],
  tags: ["phone"]
};

function repository(
  overrides: Partial<MarketplaceRepository> = {}
): MarketplaceRepository {
  return {
    listCategories: async () => [category],
    browse: async () => ({
      products: [summary],
      total: 1
    }),
    featuredStores: async () => [
      {
        store: summary.store,
        activeProductCount: 1
      }
    ],
    suggestions: async () => [
      {
        type: "product",
        id: summary.id,
        label: summary.name,
        secondaryLabel: summary.store.name
      }
    ],
    findProduct: async () => detail,
    relatedProducts: async () => [summary],
    findProductsByIds: async () => [summary],
    recordProductView: async () => true,
    getStorePage: async (): Promise<MarketplaceStorePageResponse> => ({
      store: {
        id: summary.store.id,
        name: summary.store.name,
        handle: summary.store.handle,
        category: "Electronics",
        province: "Kabul",
        cityDistrict: "District 3",
        phone: "+93700000000",
        preferredLocale: "fa-AF",
        logoUrl: null,
        coverImageUrl: null,
        description: null,
        whatsappNumber: null,
        physicalAddress: null,
        mapLatitude: null,
        mapLongitude: null,
        businessHours: null,
        theme: "minimal",
        accentColor: "#0F766E",
        status: "published",
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      trust: summary.store.trust,
      categories: [],
      products: [summary],
      pageInfo: {
        offset: 0,
        limit: 20,
        total: 1,
        hasMore: false
      }
    }),
    ...overrides
  };
}

describe("MarketplaceService", () => {
  it("builds home sections without fabricating future filter capabilities", async () => {
    const service = new MarketplaceService(repository());

    const home = await service.home({
      province: "Kabul",
      recentProductIds: [summary.id]
    });

    expect(home.categories).toEqual([category]);
    expect(home.recommended).toEqual([summary]);
    expect(home.nearby).toEqual([summary]);
    expect(home.recentlyViewed).toEqual([summary]);
    expect(home.filterCapabilities).toEqual(marketplaceFilterCapabilities);
    expect(home.filterCapabilities.rating).toBe(true);
    expect(home.filterCapabilities.deliveryAvailability).toBe(false);
  });

  it("returns authoritative pagination from repository counts", async () => {
    const service = new MarketplaceService(
      repository({
        browse: async () => ({
          products: [summary],
          total: 5
        })
      })
    );

    const result = await service.browse({
      sort: "relevance",
      offset: 0,
      limit: 1
    });

    expect(result.pageInfo).toEqual({
      offset: 0,
      limit: 1,
      total: 5,
      hasMore: true
    });
  });

  it("rejects hidden products and stores through public not-found errors", async () => {
    const service = new MarketplaceService(
      repository({
        findProduct: async () => null,
        getStorePage: async () => null
      })
    );

    await expect(service.product(summary.id)).rejects.toMatchObject({
      code: "product_not_found",
      statusCode: 404
    } satisfies Partial<MarketplaceError>);

    await expect(service.store("missing", 0, 20)).rejects.toMatchObject({
      code: "store_not_found",
      statusCode: 404
    } satisfies Partial<MarketplaceError>);
  });

  it("does not record views for products that are not public", async () => {
    const service = new MarketplaceService(
      repository({
        recordProductView: async () => false
      })
    );

    await expect(service.recordView(summary.id)).rejects.toMatchObject({
      code: "product_not_found",
      statusCode: 404
    });
  });
});
