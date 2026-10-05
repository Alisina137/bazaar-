import type {
  CreateCustomerAddressInput,
  CustomerAddressRecord,
  UpdateCustomerAddressInput
} from "@bazaarlink/contracts";
import {
  cartItems,
  carts,
  cartStoreCoupons,
  checkoutSessions,
  customerAddresses,
  productImages,
  products,
  productVariants,
  storeCoupons,
  storeSubscriptions,
  stores,
  type Cart,
  type CartItem,
  type CartStoreCoupon,
  type CustomerAddress,
  type Database,
  type StoreCoupon
} from "@bazaarlink/database";
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  or,
  sql
} from "drizzle-orm";

export interface CartProductState {
  id: string;
  storeId: string;
  storeName: string;
  storeHandle: string;
  storeProvince: string;
  storeCityDistrict: string;
  storeLogoUrl: string | null;
  storeCoverImageUrl: string | null;
  storeDescription: string | null;
  storePreferredLocale: string;
  storeStatus: "draft" | "published" | "suspended";
  subscriptionPlan: "starter" | "pro" | "business";
  subscriptionStatus: "active" | "grace_period" | "expired" | "canceled";
  name: string;
  price: number;
  compareAtPrice: number | null;
  status:
    | "draft"
    | "active"
    | "out_of_stock"
    | "archived"
    | "plan_restricted";
  availableQuantity: number;
  reservedQuantity: number;
  imageUrl: string | null;
  variants: Array<{
    id: string;
    title: string;
    priceOverride: number | null;
    imageUrl: string | null;
    available: boolean;
    availableQuantity: number;
    reservedQuantity: number;
  }>;
}

export interface CartBundle {
  cart: Cart;
  items: CartItem[];
  coupons: CartStoreCoupon[];
  productStates: CartProductState[];
}

export interface StoreCouponState {
  coupon: StoreCoupon;
  plan: "starter" | "pro" | "business";
  subscriptionStatus: "active" | "grace_period" | "expired" | "canceled";
}

export interface CartPricingRepository {
  getOrCreateCart(userId: string): Promise<Cart>;
  getBundle(userId: string): Promise<CartBundle>;
  findPublicProduct(productId: string): Promise<CartProductState | null>;
  addOrIncrementItem(input: {
    userId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPriceSnapshot: number;
    compareAtPriceSnapshot: number | null;
  }): Promise<void>;
  updateItemQuantity(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<boolean>;
  removeItem(userId: string, itemId: string): Promise<boolean>;
  setCoupon(userId: string, storeId: string, code: string): Promise<void>;
  removeCoupon(userId: string, storeId: string): Promise<void>;
  findCoupon(storeId: string, code: string): Promise<StoreCouponState | null>;
  listAddresses(userId: string): Promise<CustomerAddressRecord[]>;
  findAddress(
    userId: string,
    addressId: string
  ): Promise<CustomerAddressRecord | null>;
  createAddress(
    userId: string,
    input: CreateCustomerAddressInput
  ): Promise<CustomerAddressRecord>;
  updateAddress(
    userId: string,
    addressId: string,
    input: UpdateCustomerAddressInput
  ): Promise<CustomerAddressRecord | null>;
  deleteAddress(userId: string, addressId: string): Promise<boolean>;
  createCheckoutQuote(input: {
    userId: string;
    cartId: string;
    addressId: string;
    cartUpdatedAt: Date;
    pricingSnapshot: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }>;
  findCheckoutQuote(
    userId: string,
    sessionId: string
  ): Promise<{
    id: string;
    addressId: string | null;
    status: "draft" | "quoted" | "expired";
    pricingSnapshot: Record<string, unknown> | null;
    expiresAt: Date | null;
  } | null>;
}

function money(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function toAddress(row: CustomerAddress): CustomerAddressRecord {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    recipientName: row.recipientName,
    country: row.country,
    province: row.province,
    districtCity: row.districtCity,
    areaNeighborhood: row.areaNeighborhood,
    addressDescription: row.addressDescription,
    nearestLandmark: row.nearestLandmark,
    phone: row.phone,
    mapLatitude: row.mapLatitude,
    mapLongitude: row.mapLongitude,
    deliveryInstructions: row.deliveryInstructions,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export class DatabaseCartPricingRepository
  implements CartPricingRepository
{
  constructor(private readonly db: Database) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    const [existing] = await this.db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await this.db
      .insert(carts)
      .values({ userId })
      .onConflictDoNothing({ target: carts.userId })
      .returning();

    if (created) {
      return created;
    }

    const [concurrent] = await this.db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (!concurrent) {
      throw new Error("cart_create_failed");
    }

    return concurrent;
  }

  private async loadProductStates(
    productIds: string[]
  ): Promise<CartProductState[]> {
    if (productIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({
        id: products.id,
        storeId: products.storeId,
        storeName: stores.name,
        storeHandle: stores.handle,
        storeProvince: stores.province,
        storeCityDistrict: stores.cityDistrict,
        storeLogoUrl: stores.logoUrl,
        storeCoverImageUrl: stores.coverImageUrl,
        storeDescription: stores.description,
        storePreferredLocale: stores.preferredLocale,
        storeStatus: stores.status,
        subscriptionPlan: storeSubscriptions.plan,
        subscriptionStatus: storeSubscriptions.status,
        name: products.name,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        status: products.status,
        availableQuantity: products.availableQuantity,
        reservedQuantity: products.reservedQuantity
      })
      .from(products)
      .innerJoin(stores, eq(stores.id, products.storeId))
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, stores.id)
      )
      .where(inArray(products.id, productIds));

    const [images, variants] = await Promise.all([
      this.db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt)),
      this.db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds))
        .orderBy(asc(productVariants.createdAt))
    ]);

    return rows.map((row) => ({
      ...row,
      price: Number(row.price),
      compareAtPrice: money(row.compareAtPrice),
      imageUrl:
        images.find((image) => image.productId === row.id)?.url ?? null,
      variants: variants
        .filter((variant) => variant.productId === row.id)
        .map((variant) => ({
          id: variant.id,
          title: variant.title,
          priceOverride: money(variant.priceOverride),
          imageUrl: variant.imageUrl,
          available: variant.available,
          availableQuantity: variant.availableQuantity,
          reservedQuantity: variant.reservedQuantity
        }))
    }));
  }

  async getBundle(userId: string): Promise<CartBundle> {
    const cart = await this.getOrCreateCart(userId);

    const [items, couponRows] = await Promise.all([
      this.db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cart.id))
        .orderBy(asc(cartItems.createdAt)),
      this.db
        .select()
        .from(cartStoreCoupons)
        .where(eq(cartStoreCoupons.cartId, cart.id))
        .orderBy(asc(cartStoreCoupons.createdAt))
    ]);

    return {
      cart,
      items,
      coupons: couponRows,
      productStates: await this.loadProductStates(
        [...new Set(items.map((item) => item.productId))]
      )
    };
  }

  async findPublicProduct(
    productId: string
  ): Promise<CartProductState | null> {
    return (await this.loadProductStates([productId]))[0] ?? null;
  }

  async addOrIncrementItem(input: {
    userId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPriceSnapshot: number;
    compareAtPriceSnapshot: number | null;
  }): Promise<void> {
    const cart = await this.getOrCreateCart(input.userId);

    await this.db.transaction(async (tx) => {
      await tx
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.id, cart.id))
        .for("update");

      const variantCondition =
        input.variantId === null
          ? isNull(cartItems.variantId)
          : eq(cartItems.variantId, input.variantId);

      const [existing] = await tx
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.productId, input.productId),
            variantCondition
          )
        )
        .limit(1);

      const now = new Date();

      if (existing) {
        await tx
          .update(cartItems)
          .set({
            quantity: existing.quantity + input.quantity,
            updatedAt: now
          })
          .where(eq(cartItems.id, existing.id));
      } else {
        await tx.insert(cartItems).values({
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId,
          quantity: input.quantity,
          unitPriceSnapshot: input.unitPriceSnapshot.toFixed(2),
          compareAtPriceSnapshot:
            input.compareAtPriceSnapshot === null
              ? null
              : input.compareAtPriceSnapshot.toFixed(2)
        });
      }

      await tx
        .update(carts)
        .set({ updatedAt: now })
        .where(eq(carts.id, cart.id));
    });
  }

  async updateItemQuantity(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<boolean> {
    const cart = await this.getOrCreateCart(userId);
    const [updated] = await this.db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(
        and(
          eq(cartItems.id, itemId),
          eq(cartItems.cartId, cart.id)
        )
      )
      .returning({ id: cartItems.id });

    if (updated) {
      await this.db
        .update(carts)
        .set({ updatedAt: new Date() })
        .where(eq(carts.id, cart.id));
    }

    return Boolean(updated);
  }

  async removeItem(userId: string, itemId: string): Promise<boolean> {
    const cart = await this.getOrCreateCart(userId);
    const [deleted] = await this.db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.id, itemId),
          eq(cartItems.cartId, cart.id)
        )
      )
      .returning({ id: cartItems.id });

    if (deleted) {
      await this.db
        .update(carts)
        .set({ updatedAt: new Date() })
        .where(eq(carts.id, cart.id));
    }

    return Boolean(deleted);
  }

  async setCoupon(
    userId: string,
    storeId: string,
    code: string
  ): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    const normalized = normalizeCode(code);
    const now = new Date();

    await this.db
      .insert(cartStoreCoupons)
      .values({
        cartId: cart.id,
        storeId,
        couponCode: normalized
      })
      .onConflictDoUpdate({
        target: [
          cartStoreCoupons.cartId,
          cartStoreCoupons.storeId
        ],
        set: {
          couponCode: normalized,
          updatedAt: now
        }
      });

    await this.db
      .update(carts)
      .set({ updatedAt: now })
      .where(eq(carts.id, cart.id));
  }

  async removeCoupon(userId: string, storeId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);

    await this.db
      .delete(cartStoreCoupons)
      .where(
        and(
          eq(cartStoreCoupons.cartId, cart.id),
          eq(cartStoreCoupons.storeId, storeId)
        )
      );

    await this.db
      .update(carts)
      .set({ updatedAt: new Date() })
      .where(eq(carts.id, cart.id));
  }

  async findCoupon(
    storeId: string,
    code: string
  ): Promise<StoreCouponState | null> {
    const [row] = await this.db
      .select({
        coupon: storeCoupons,
        plan: storeSubscriptions.plan,
        subscriptionStatus: storeSubscriptions.status
      })
      .from(storeCoupons)
      .innerJoin(
        storeSubscriptions,
        eq(storeSubscriptions.storeId, storeCoupons.storeId)
      )
      .where(
        and(
          eq(storeCoupons.storeId, storeId),
          eq(storeCoupons.code, normalizeCode(code))
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listAddresses(userId: string): Promise<CustomerAddressRecord[]> {
    const rows = await this.db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.userId, userId))
      .orderBy(
        sql`${customerAddresses.isDefault} desc`,
        asc(customerAddresses.createdAt)
      );

    return rows.map(toAddress);
  }

  async findAddress(
    userId: string,
    addressId: string
  ): Promise<CustomerAddressRecord | null> {
    const [row] = await this.db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.userId, userId)
        )
      )
      .limit(1);

    return row ? toAddress(row) : null;
  }

  async createAddress(
    userId: string,
    input: CreateCustomerAddressInput
  ): Promise<CustomerAddressRecord> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: customerAddresses.id })
        .from(customerAddresses)
        .where(eq(customerAddresses.userId, userId))
        .limit(1);

      const shouldDefault = input.isDefault === true || !existing;
      const now = new Date();

      if (shouldDefault) {
        await tx
          .update(customerAddresses)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(customerAddresses.userId, userId));
      }

      const [created] = await tx
        .insert(customerAddresses)
        .values({
          userId,
          label: input.label ?? null,
          recipientName: input.recipientName,
          country: input.country ?? "Afghanistan",
          province: input.province,
          districtCity: input.districtCity,
          areaNeighborhood: input.areaNeighborhood ?? null,
          addressDescription: input.addressDescription,
          nearestLandmark: input.nearestLandmark ?? null,
          phone: input.phone,
          mapLatitude: input.mapLatitude ?? null,
          mapLongitude: input.mapLongitude ?? null,
          deliveryInstructions: input.deliveryInstructions ?? null,
          isDefault: shouldDefault
        })
        .returning();

      if (!created) {
        throw new Error("address_create_failed");
      }

      return toAddress(created);
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: UpdateCustomerAddressInput
  ): Promise<CustomerAddressRecord | null> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(customerAddresses)
        .where(
          and(
            eq(customerAddresses.id, addressId),
            eq(customerAddresses.userId, userId)
          )
        )
        .limit(1);

      if (!existing) {
        return null;
      }

      const now = new Date();

      if (input.isDefault === true) {
        await tx
          .update(customerAddresses)
          .set({ isDefault: false, updatedAt: now })
          .where(eq(customerAddresses.userId, userId));
      }

      const [updated] = await tx
        .update(customerAddresses)
        .set({
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.recipientName !== undefined
            ? { recipientName: input.recipientName }
            : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.province !== undefined
            ? { province: input.province }
            : {}),
          ...(input.districtCity !== undefined
            ? { districtCity: input.districtCity }
            : {}),
          ...(input.areaNeighborhood !== undefined
            ? { areaNeighborhood: input.areaNeighborhood }
            : {}),
          ...(input.addressDescription !== undefined
            ? { addressDescription: input.addressDescription }
            : {}),
          ...(input.nearestLandmark !== undefined
            ? { nearestLandmark: input.nearestLandmark }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.mapLatitude !== undefined
            ? { mapLatitude: input.mapLatitude }
            : {}),
          ...(input.mapLongitude !== undefined
            ? { mapLongitude: input.mapLongitude }
            : {}),
          ...(input.deliveryInstructions !== undefined
            ? { deliveryInstructions: input.deliveryInstructions }
            : {}),
          ...(input.isDefault !== undefined
            ? { isDefault: input.isDefault }
            : {}),
          updatedAt: now
        })
        .where(eq(customerAddresses.id, existing.id))
        .returning();

      return updated ? toAddress(updated) : null;
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(customerAddresses)
        .where(
          and(
            eq(customerAddresses.id, addressId),
            eq(customerAddresses.userId, userId)
          )
        )
        .limit(1);

      if (!existing) {
        return false;
      }

      await tx
        .delete(customerAddresses)
        .where(eq(customerAddresses.id, existing.id));

      if (existing.isDefault) {
        const [replacement] = await tx
          .select({ id: customerAddresses.id })
          .from(customerAddresses)
          .where(eq(customerAddresses.userId, userId))
          .orderBy(asc(customerAddresses.createdAt))
          .limit(1);

        if (replacement) {
          await tx
            .update(customerAddresses)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(customerAddresses.id, replacement.id));
        }
      }

      return true;
    });
  }

  async createCheckoutQuote(input: {
    userId: string;
    cartId: string;
    addressId: string;
    cartUpdatedAt: Date;
    pricingSnapshot: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }> {
    const [created] = await this.db
      .insert(checkoutSessions)
      .values({
        userId: input.userId,
        cartId: input.cartId,
        addressId: input.addressId,
        status: "quoted",
        pricingSnapshot: input.pricingSnapshot,
        cartUpdatedAt: input.cartUpdatedAt,
        expiresAt: input.expiresAt
      })
      .returning({
        id: checkoutSessions.id,
        expiresAt: checkoutSessions.expiresAt
      });

    if (!created?.expiresAt) {
      throw new Error("checkout_quote_create_failed");
    }

    return {
      id: created.id,
      expiresAt: created.expiresAt
    };
  }

  async findCheckoutQuote(
    userId: string,
    sessionId: string
  ): Promise<{
    id: string;
    addressId: string | null;
    status: "draft" | "quoted" | "expired";
    pricingSnapshot: Record<string, unknown> | null;
    expiresAt: Date | null;
  } | null> {
    const [row] = await this.db
      .select({
        id: checkoutSessions.id,
        addressId: checkoutSessions.addressId,
        status: checkoutSessions.status,
        pricingSnapshot: checkoutSessions.pricingSnapshot,
        expiresAt: checkoutSessions.expiresAt
      })
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.id, sessionId),
          eq(checkoutSessions.userId, userId)
        )
      )
      .limit(1);

    return row ?? null;
  }
}
