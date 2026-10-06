import type { PublicStoreRecord } from "./store.js";
import type { SellerTrustRecord } from "./trust.js";

export type MarketplaceSort =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "popularity";

export interface MarketplaceCategoryRecord {
  id: string;
  parentId: string | null;
  slug: string;
  nameFa: string;
  namePs: string;
  nameEn: string;
  imageUrl: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface MarketplaceStoreSummary {
  id: string;
  name: string;
  handle: string;
  province: string;
  cityDistrict: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  preferredLocale: "fa-AF" | "ps-AF" | "en";
  trust: SellerTrustRecord;
}

export interface MarketplaceVariantSummary {
  id: string;
  title: string;
  optionValues: Record<string, string>;
  priceOverride: number | null;
  imageUrl: string | null;
  available: boolean;
  inStock: boolean;
}

export interface MarketplaceProductSummary {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  brand: string | null;
  status: "active" | "out_of_stock";
  imageUrl: string | null;
  inStock: boolean;
  hasDiscount: boolean;
  averageRating: number | null;
  reviewCount: number;
  publishedAt: string | null;
  store: MarketplaceStoreSummary;
  marketplaceCategory: MarketplaceCategoryRecord | null;
}

export interface MarketplaceProductDetail extends MarketplaceProductSummary {
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    sortOrder: number;
  }>;
  variants: MarketplaceVariantSummary[];
  tags: string[];
}

export interface MarketplaceFilterCapabilities {
  category: true;
  price: true;
  province: true;
  store: true;
  inStock: true;
  discount: true;
  rating: true;
  deliveryAvailability: false;
  sameDayDelivery: false;
  paymentMethod: false;
  verifiedStore: true;
}

export interface MarketplaceBrowseResponse {
  products: MarketplaceProductSummary[];
  filterCapabilities: MarketplaceFilterCapabilities;
  pageInfo: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface MarketplaceFeaturedStore {
  store: MarketplaceStoreSummary;
  activeProductCount: number;
}

export interface MarketplaceCategoriesResponse {
  categories: MarketplaceCategoryRecord[];
}

export interface MarketplaceHomeResponse {
  categories: MarketplaceCategoryRecord[];
  recommended: MarketplaceProductSummary[];
  popular: MarketplaceProductSummary[];
  nearby: MarketplaceProductSummary[];
  newest: MarketplaceProductSummary[];
  deals: MarketplaceProductSummary[];
  featuredStores: MarketplaceFeaturedStore[];
  recentlyViewed: MarketplaceProductSummary[];
  filterCapabilities: MarketplaceFilterCapabilities;
}

export interface MarketplaceSearchSuggestion {
  type: "product" | "store" | "category" | "brand";
  id: string;
  label: string;
  secondaryLabel: string | null;
}

export interface MarketplaceSearchSuggestionsResponse {
  suggestions: MarketplaceSearchSuggestion[];
}

export interface MarketplaceProductDetailResponse {
  product: MarketplaceProductDetail;
  relatedProducts: MarketplaceProductSummary[];
}

export interface MarketplaceStorePageResponse {
  store: PublicStoreRecord;
  trust: SellerTrustRecord;
  categories: Array<{
    id: string;
    parentId: string | null;
    name: string;
    imageUrl: string | null;
    icon: string | null;
    sortOrder: number;
  }>;
  products: MarketplaceProductSummary[];
  pageInfo: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export const marketplaceErrorCodes = [
  "invalid_request",
  "product_not_found",
  "store_not_found",
  "service_unavailable"
] as const;

export type MarketplaceErrorCode =
  (typeof marketplaceErrorCodes)[number];

export interface MarketplaceErrorResponse {
  error: {
    code: MarketplaceErrorCode;
  };
}
