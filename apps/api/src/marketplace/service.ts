import type {
  MarketplaceBrowseResponse,
  MarketplaceCategoriesResponse,
  MarketplaceFilterCapabilities,
  MarketplaceHomeResponse,
  MarketplaceProductDetailResponse,
  MarketplaceSearchSuggestionsResponse,
  MarketplaceStorePageResponse
} from "@bazaarlink/contracts";

import { MarketplaceError } from "./errors.js";
import type {
  MarketplaceBrowseQuery,
  MarketplaceRepository
} from "./repository.js";

export const marketplaceFilterCapabilities: MarketplaceFilterCapabilities = {
  category: true,
  price: true,
  province: true,
  store: true,
  inStock: true,
  discount: true,
  rating: true,
  deliveryAvailability: false,
  sameDayDelivery: false,
  paymentMethod: false,
  verifiedStore: true
};

export interface MarketplaceServiceContract {
  categories(): Promise<MarketplaceCategoriesResponse>;
  home(input: {
    province?: string | undefined;
    recentProductIds: string[];
  }): Promise<MarketplaceHomeResponse>;
  browse(query: MarketplaceBrowseQuery): Promise<MarketplaceBrowseResponse>;
  suggestions(query: string): Promise<MarketplaceSearchSuggestionsResponse>;
  product(productId: string): Promise<MarketplaceProductDetailResponse>;
  recordView(productId: string): Promise<void>;
  store(
    handle: string,
    offset: number,
    limit: number
  ): Promise<MarketplaceStorePageResponse>;
}

export class MarketplaceService implements MarketplaceServiceContract {
  constructor(private readonly repository: MarketplaceRepository) {}

  async categories(): Promise<MarketplaceCategoriesResponse> {
    return {
      categories: await this.repository.listCategories()
    };
  }

  async home(input: {
    province?: string | undefined;
    recentProductIds: string[];
  }): Promise<MarketplaceHomeResponse> {
    const [
      categories,
      recommended,
      popular,
      nearby,
      newest,
      deals,
      featuredStores,
      recentlyViewed
    ] = await Promise.all([
      this.repository.listCategories(),
      this.repository.browse({
        sort: "relevance",
        offset: 0,
        limit: 10
      }),
      this.repository.browse({
        sort: "popularity",
        offset: 0,
        limit: 10
      }),
      input.province
        ? this.repository.browse({
            province: input.province,
            sort: "relevance",
            offset: 0,
            limit: 10
          })
        : Promise.resolve({ products: [], total: 0 }),
      this.repository.browse({
        sort: "newest",
        offset: 0,
        limit: 10
      }),
      this.repository.browse({
        discount: true,
        sort: "relevance",
        offset: 0,
        limit: 10
      }),
      this.repository.featuredStores(8),
      this.repository.findProductsByIds(input.recentProductIds.slice(0, 12))
    ]);

    return {
      categories,
      recommended: recommended.products,
      popular: popular.products,
      nearby: nearby.products,
      newest: newest.products,
      deals: deals.products,
      featuredStores,
      recentlyViewed,
      filterCapabilities: marketplaceFilterCapabilities
    };
  }

  async browse(
    query: MarketplaceBrowseQuery
  ): Promise<MarketplaceBrowseResponse> {
    const result = await this.repository.browse(query);

    return {
      products: result.products,
      filterCapabilities: marketplaceFilterCapabilities,
      pageInfo: {
        offset: query.offset,
        limit: query.limit,
        total: result.total,
        hasMore: query.offset + result.products.length < result.total
      }
    };
  }

  async suggestions(
    query: string
  ): Promise<MarketplaceSearchSuggestionsResponse> {
    const normalized = query.trim();

    if (normalized.length < 2) {
      return { suggestions: [] };
    }

    return {
      suggestions: await this.repository.suggestions(normalized, 12)
    };
  }

  async product(productId: string): Promise<MarketplaceProductDetailResponse> {
    const product = await this.repository.findProduct(productId);

    if (!product) {
      throw new MarketplaceError("product_not_found", 404);
    }

    return {
      product,
      relatedProducts: await this.repository.relatedProducts(
        product.id,
        product.marketplaceCategory?.id ?? null,
        product.store.id,
        8
      )
    };
  }

  async recordView(productId: string): Promise<void> {
    const recorded = await this.repository.recordProductView(productId);

    if (!recorded) {
      throw new MarketplaceError("product_not_found", 404);
    }
  }

  async store(
    handle: string,
    offset: number,
    limit: number
  ): Promise<MarketplaceStorePageResponse> {
    const page = await this.repository.getStorePage(
      handle.trim().toLowerCase(),
      offset,
      limit
    );

    if (!page) {
      throw new MarketplaceError("store_not_found", 404);
    }

    return page;
  }
}
