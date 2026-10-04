import type {
  CreateStoreInput,
  PublicStoreRecord,
  StoreListResponse,
  StorePlansResponse,
  StoreRecord,
  UpdateStoreInput
} from "@bazaarlink/contracts";

import {
  getSubscriptionPlans
} from "./entitlements.js";
import {
  StoreError,
  StoreRepositoryConflictError
} from "./errors.js";
import type { StoreRepository } from "./repository.js";

export interface StoreServiceContract {
  listOwnedStores(ownerUserId: string): Promise<StoreListResponse>;
  getOwnedStore(ownerUserId: string, storeId: string): Promise<StoreRecord>;
  createStore(
    ownerUserId: string,
    input: CreateStoreInput
  ): Promise<StoreRecord>;
  updateStore(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreInput
  ): Promise<StoreRecord>;
  publishStore(ownerUserId: string, storeId: string): Promise<StoreRecord>;
  getPublicStore(handle: string): Promise<PublicStoreRecord>;
  getPlans(): StorePlansResponse;
}

export function normalizeStoreHandle(handle: string): string {
  return handle
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function trimNullable(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCreateInput(input: CreateStoreInput): CreateStoreInput {
  return {
    ...input,
    name: input.name.trim(),
    handle: normalizeStoreHandle(input.handle),
    category: input.category.trim(),
    province: input.province.trim(),
    cityDistrict: input.cityDistrict.trim(),
    phone: input.phone.trim(),
    logoUrl: trimNullable(input.logoUrl),
    coverImageUrl: trimNullable(input.coverImageUrl),
    description: trimNullable(input.description),
    whatsappNumber: trimNullable(input.whatsappNumber),
    physicalAddress: trimNullable(input.physicalAddress),
    businessHours: trimNullable(input.businessHours)
  };
}

function normalizeUpdateInput(input: UpdateStoreInput): UpdateStoreInput {
  const result: UpdateStoreInput = {
    ...input
  };

  if (input.name !== undefined) result.name = input.name.trim();
  if (input.handle !== undefined) result.handle = normalizeStoreHandle(input.handle);
  if (input.category !== undefined) result.category = input.category.trim();
  if (input.province !== undefined) result.province = input.province.trim();
  if (input.cityDistrict !== undefined) result.cityDistrict = input.cityDistrict.trim();
  if (input.phone !== undefined) result.phone = input.phone.trim();
  if (input.logoUrl !== undefined) result.logoUrl = trimNullable(input.logoUrl);
  if (input.coverImageUrl !== undefined) result.coverImageUrl = trimNullable(input.coverImageUrl);
  if (input.description !== undefined) result.description = trimNullable(input.description);
  if (input.whatsappNumber !== undefined) result.whatsappNumber = trimNullable(input.whatsappNumber);
  if (input.physicalAddress !== undefined) result.physicalAddress = trimNullable(input.physicalAddress);
  if (input.businessHours !== undefined) result.businessHours = trimNullable(input.businessHours);

  return result;
}

function toPublicStore(store: StoreRecord): PublicStoreRecord {
  const {
    ownerUserId: _ownerUserId,
    subscription: _subscription,
    ...publicStore
  } = store;

  return publicStore;
}

export class StoreService implements StoreServiceContract {
  constructor(private readonly repository: StoreRepository) {}

  async listOwnedStores(ownerUserId: string): Promise<StoreListResponse> {
    return {
      stores: await this.repository.listOwnedStores(ownerUserId)
    };
  }

  async getOwnedStore(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreRecord> {
    const store = await this.repository.findOwnedStore(ownerUserId, storeId);

    if (!store) {
      throw new StoreError("store_not_found", 404);
    }

    return store;
  }

  async createStore(
    ownerUserId: string,
    input: CreateStoreInput
  ): Promise<StoreRecord> {
    try {
      return await this.repository.createStore(
        ownerUserId,
        normalizeCreateInput(input)
      );
    } catch (error) {
      if (error instanceof StoreRepositoryConflictError) {
        throw new StoreError("handle_in_use", 409);
      }

      throw error;
    }
  }

  async updateStore(
    ownerUserId: string,
    storeId: string,
    input: UpdateStoreInput
  ): Promise<StoreRecord> {
    try {
      const store = await this.repository.updateStore(
        ownerUserId,
        storeId,
        normalizeUpdateInput(input)
      );

      if (!store) {
        throw new StoreError("store_not_found", 404);
      }

      return store;
    } catch (error) {
      if (error instanceof StoreRepositoryConflictError) {
        throw new StoreError("handle_in_use", 409);
      }

      throw error;
    }
  }

  async publishStore(
    ownerUserId: string,
    storeId: string
  ): Promise<StoreRecord> {
    const current = await this.repository.findOwnedStore(ownerUserId, storeId);

    if (!current) {
      throw new StoreError("store_not_found", 404);
    }

    if (current.status === "suspended") {
      throw new StoreError("store_suspended", 403);
    }

    if (
      current.subscription.status !== "active" &&
      current.subscription.status !== "grace_period"
    ) {
      throw new StoreError("subscription_unavailable", 409);
    }

    const published = await this.repository.publishStore(ownerUserId, storeId);

    if (!published) {
      throw new StoreError("store_not_found", 404);
    }

    return published;
  }

  async getPublicStore(handle: string): Promise<PublicStoreRecord> {
    const normalized = normalizeStoreHandle(handle);
    const store = await this.repository.findPublicStoreByHandle(normalized);

    if (!store) {
      throw new StoreError("store_not_found", 404);
    }

    return toPublicStore(store);
  }

  getPlans(): StorePlansResponse {
    return getSubscriptionPlans();
  }
}
