import type {
  AddCartItemInput,
  AppliedCouponRecord,
  ApplyCartCouponInput,
  CartItemPricingRecord,
  CartResponse,
  CheckoutQuoteInput,
  CheckoutQuoteResponse,
  CreateCustomerAddressInput,
  CustomerAddressListResponse,
  CustomerAddressRecord,
  MerchantCartGroup,
  UpdateCartItemInput,
  UpdateCustomerAddressInput
} from "@bazaarlink/contracts";

import { getStoreEntitlements } from "../store/entitlements.js";
import { CartPricingError } from "./errors.js";
import type {
  CartBundle,
  CartPricingRepository,
  CartProductState,
  StoreCouponState
} from "./repository.js";

const CHECKOUT_QUOTE_TTL_MS = 15 * 60 * 1000;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pricesDiffer(left: number | null, right: number | null): boolean {
  if (left === null || right === null) {
    return left !== right;
  }

  return Math.abs(left - right) >= 0.005;
}

function normalizedCompareAt(
  currentPrice: number,
  compareAtPrice: number | null
): number {
  return compareAtPrice !== null && compareAtPrice > currentPrice
    ? compareAtPrice
    : currentPrice;
}

function storeLocale(value: string): "fa-AF" | "ps-AF" | "en" {
  return value === "ps-AF" || value === "en" ? value : "fa-AF";
}

function productVisibilityIssue(
  product: CartProductState | null | undefined
): "product_unavailable" | null {
  if (
    !product ||
    product.storeStatus !== "published" ||
    !["active", "out_of_stock"].includes(product.status) ||
    !["active", "grace_period"].includes(product.subscriptionStatus)
  ) {
    return "product_unavailable";
  }

  return null;
}

function currentSelection(
  product: CartProductState,
  variantId: string | null
): {
  title: string | null;
  price: number;
  imageUrl: string | null;
  freeQuantity: number;
  available: boolean;
  issue: "variant_unavailable" | null;
} {
  if (product.variants.length > 0) {
    if (!variantId) {
      return {
        title: null,
        price: product.price,
        imageUrl: product.imageUrl,
        freeQuantity: 0,
        available: false,
        issue: "variant_unavailable"
      };
    }

    const variant = product.variants.find((item) => item.id === variantId);

    if (!variant || !variant.available) {
      return {
        title: variant?.title ?? null,
        price: variant?.priceOverride ?? product.price,
        imageUrl: variant?.imageUrl ?? product.imageUrl,
        freeQuantity: 0,
        available: false,
        issue: "variant_unavailable"
      };
    }

    return {
      title: variant.title,
      price: variant.priceOverride ?? product.price,
      imageUrl: variant.imageUrl ?? product.imageUrl,
      freeQuantity: Math.max(
        0,
        variant.availableQuantity - variant.reservedQuantity
      ),
      available: true,
      issue: null
    };
  }

  if (variantId) {
    return {
      title: null,
      price: product.price,
      imageUrl: product.imageUrl,
      freeQuantity: 0,
      available: false,
      issue: "variant_unavailable"
    };
  }

  return {
    title: null,
    price: product.price,
    imageUrl: product.imageUrl,
    freeQuantity: Math.max(
      0,
      product.availableQuantity - product.reservedQuantity
    ),
    available: true,
    issue: null
  };
}

function couponState(
  row: StoreCouponState | null,
  subtotal: number,
  now: Date
): {
  valid: boolean;
  error: "coupon_invalid" | "coupon_not_eligible" | null;
  discount: number;
  record: AppliedCouponRecord | null;
} {
  if (!row) {
    return {
      valid: false,
      error: "coupon_invalid",
      discount: 0,
      record: null
    };
  }

  const coupon = row.coupon;
  const entitlements = getStoreEntitlements(row.plan);
  const subscriptionEligible = ["active", "grace_period"].includes(
    row.subscriptionStatus
  );
  const startsValid = !coupon.startsAt || coupon.startsAt.getTime() <= now.getTime();
  const endsValid = !coupon.endsAt || coupon.endsAt.getTime() >= now.getTime();

  if (!coupon.active || !startsValid || !endsValid) {
    return {
      valid: false,
      error: "coupon_invalid",
      discount: 0,
      record: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minimumOrderAmount:
          coupon.minimumOrderAmount === null
            ? null
            : Number(coupon.minimumOrderAmount),
        discountAmount: 0,
        valid: false,
        invalidReason: "coupon_invalid"
      }
    };
  }

  const minimum =
    coupon.minimumOrderAmount === null
      ? null
      : Number(coupon.minimumOrderAmount);

  if (
    !entitlements.coupons ||
    !subscriptionEligible ||
    (minimum !== null && subtotal < minimum)
  ) {
    return {
      valid: false,
      error: "coupon_not_eligible",
      discount: 0,
      record: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minimumOrderAmount: minimum,
        discountAmount: 0,
        valid: false,
        invalidReason: "coupon_not_eligible"
      }
    };
  }

  const value = Number(coupon.value);
  const calculated =
    coupon.type === "percentage"
      ? subtotal * (value / 100)
      : value;
  const discount = roundMoney(Math.min(subtotal, calculated));

  return {
    valid: true,
    error: null,
    discount,
    record: {
      code: coupon.code,
      type: coupon.type,
      value,
      minimumOrderAmount: minimum,
      discountAmount: discount,
      valid: true,
      invalidReason: null
    }
  };
}

export interface CartPricingServiceContract {
  getCart(userId: string): Promise<CartResponse>;
  addItem(userId: string, input: AddCartItemInput): Promise<CartResponse>;
  updateItem(
    userId: string,
    itemId: string,
    input: UpdateCartItemInput
  ): Promise<CartResponse>;
  removeItem(userId: string, itemId: string): Promise<CartResponse>;
  applyCoupon(
    userId: string,
    input: ApplyCartCouponInput
  ): Promise<CartResponse>;
  removeCoupon(userId: string, storeId: string): Promise<CartResponse>;
  listAddresses(userId: string): Promise<CustomerAddressListResponse>;
  createAddress(
    userId: string,
    input: CreateCustomerAddressInput
  ): Promise<CustomerAddressRecord>;
  updateAddress(
    userId: string,
    addressId: string,
    input: UpdateCustomerAddressInput
  ): Promise<CustomerAddressRecord>;
  deleteAddress(userId: string, addressId: string): Promise<void>;
  quoteCheckout(
    userId: string,
    input: CheckoutQuoteInput
  ): Promise<CheckoutQuoteResponse>;
  getCheckoutQuote(
    userId: string,
    sessionId: string
  ): Promise<CheckoutQuoteResponse>;
}

export class CartPricingService implements CartPricingServiceContract {
  constructor(private readonly repository: CartPricingRepository) {}

  private async priceBundle(bundle: CartBundle): Promise<CartResponse> {
    const productById = new Map(
      bundle.productStates.map((product) => [product.id, product])
    );
    const groupMap = new Map<
      string,
      {
        product: CartProductState;
        items: CartItemPricingRecord[];
      }
    >();

    let anyPriceChanged = false;

    for (const item of bundle.items) {
      const product = productById.get(item.productId);
      const visibilityIssue = productVisibilityIssue(product);

      if (!product) {
        // A product row is protected by FK, but keep this safe for future
        // archival/deletion policy changes.
        continue;
      }

      const selection = currentSelection(product, item.variantId);
      const unitPrice = roundMoney(selection.price);
      const listPrice = roundMoney(
        normalizedCompareAt(unitPrice, product.compareAtPrice)
      );
      const quantity = item.quantity;
      const lineItemsSubtotal = roundMoney(listPrice * quantity);
      const lineTotal = roundMoney(unitPrice * quantity);
      const lineProductDiscount = roundMoney(
        lineItemsSubtotal - lineTotal
      );

      let unavailableReason:
        | "product_unavailable"
        | "variant_unavailable"
        | "insufficient_stock"
        | null = visibilityIssue;

      if (!unavailableReason && selection.issue) {
        unavailableReason = selection.issue;
      }

      if (
        !unavailableReason &&
        (!selection.available || selection.freeQuantity < quantity)
      ) {
        unavailableReason = "insufficient_stock";
      }

      const snapshotPrice = Number(item.unitPriceSnapshot);
      const snapshotCompare =
        item.compareAtPriceSnapshot === null
          ? null
          : Number(item.compareAtPriceSnapshot);
      const normalizedCurrentCompare =
        product.compareAtPrice !== null &&
        product.compareAtPrice > unitPrice
          ? product.compareAtPrice
          : null;
      const priceChanged =
        pricesDiffer(snapshotPrice, unitPrice) ||
        pricesDiffer(snapshotCompare, normalizedCurrentCompare);

      anyPriceChanged ||= priceChanged;

      const pricedItem: CartItemPricingRecord = {
        id: item.id,
        productId: product.id,
        variantId: item.variantId,
        name: product.name,
        variantTitle: selection.title,
        imageUrl: selection.imageUrl,
        quantity,
        unitListPrice: listPrice,
        unitPrice,
        lineItemsSubtotal,
        lineProductDiscount,
        lineTotal,
        inStock: unavailableReason === null,
        availableQuantity: selection.freeQuantity,
        priceChanged,
        unavailableReason
      };

      const existing = groupMap.get(product.storeId);

      if (existing) {
        existing.items.push(pricedItem);
      } else {
        groupMap.set(product.storeId, {
          product,
          items: [pricedItem]
        });
      }
    }

    const groups: MerchantCartGroup[] = [];
    const couponByStore = new Map(
      bundle.coupons.map((coupon) => [coupon.storeId, coupon.couponCode])
    );

    for (const [storeId, group] of groupMap.entries()) {
      const itemsSubtotal = roundMoney(
        group.items.reduce(
          (sum, item) => sum + item.lineItemsSubtotal,
          0
        )
      );
      const productDiscount = roundMoney(
        group.items.reduce(
          (sum, item) => sum + item.lineProductDiscount,
          0
        )
      );
      const subtotalAfterProductDiscount = roundMoney(
        itemsSubtotal - productDiscount
      );

      const couponCode = couponByStore.get(storeId);
      let appliedCoupon: AppliedCouponRecord | null = null;
      let couponDiscount = 0;
      let couponBlocking = false;

      if (couponCode) {
        const evaluated = couponState(
          await this.repository.findCoupon(storeId, couponCode),
          subtotalAfterProductDiscount,
          new Date()
        );
        appliedCoupon =
          evaluated.record ?? {
            code: couponCode,
            type: "fixed",
            value: 0,
            minimumOrderAmount: null,
            discountAmount: 0,
            valid: false,
            invalidReason: evaluated.error ?? "coupon_invalid"
          };
        couponDiscount = evaluated.discount;
        couponBlocking = !evaluated.valid;
      }

      groups.push({
        store: {
          id: group.product.storeId,
          name: group.product.storeName,
          handle: group.product.storeHandle,
          province: group.product.storeProvince,
          cityDistrict: group.product.storeCityDistrict,
          logoUrl: group.product.storeLogoUrl,
          coverImageUrl: group.product.storeCoverImageUrl,
          description: group.product.storeDescription,
          preferredLocale: storeLocale(
            group.product.storePreferredLocale
          )
        },
        items: group.items,
        itemsSubtotal,
        productDiscount,
        subtotalAfterProductDiscount,
        coupon: appliedCoupon,
        couponDiscount,
        preDeliveryTotal: roundMoney(
          subtotalAfterProductDiscount - couponDiscount
        ),
        deliveryStatus: "pending_phase_6",
        paymentStatus: "pending_phase_7",
        hasBlockingIssues:
          couponBlocking ||
          group.items.some((item) => item.unavailableReason !== null)
      });
    }

    groups.sort((left, right) =>
      left.store.name.localeCompare(right.store.name)
    );

    const totals = groups.reduce(
      (sum, group) => ({
        itemsSubtotal: roundMoney(
          sum.itemsSubtotal + group.itemsSubtotal
        ),
        productDiscount: roundMoney(
          sum.productDiscount + group.productDiscount
        ),
        couponDiscount: roundMoney(
          sum.couponDiscount + group.couponDiscount
        ),
        preDeliveryTotal: roundMoney(
          sum.preDeliveryTotal + group.preDeliveryTotal
        )
      }),
      {
        itemsSubtotal: 0,
        productDiscount: 0,
        couponDiscount: 0,
        preDeliveryTotal: 0
      }
    );

    return {
      id: bundle.cart.id,
      currency: "AFN",
      groups,
      totals,
      itemCount: bundle.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
      hasBlockingIssues: groups.some(
        (group) => group.hasBlockingIssues
      ),
      priceChanged: anyPriceChanged,
      updatedAt: bundle.cart.updatedAt.toISOString()
    };
  }

  async getCart(userId: string): Promise<CartResponse> {
    return this.priceBundle(await this.repository.getBundle(userId));
  }

  async addItem(
    userId: string,
    input: AddCartItemInput
  ): Promise<CartResponse> {
    const product = await this.repository.findPublicProduct(input.productId);

    if (productVisibilityIssue(product)) {
      throw new CartPricingError("product_unavailable", 409);
    }

    if (!product) {
      throw new CartPricingError("product_unavailable", 409);
    }

    const selection = currentSelection(
      product,
      input.variantId ?? null
    );

    if (selection.issue) {
      throw new CartPricingError(selection.issue, 409);
    }

    const bundle = await this.repository.getBundle(userId);
    const existingQuantity = bundle.items
      .filter(
        (item) =>
          item.productId === input.productId &&
          item.variantId === (input.variantId ?? null)
      )
      .reduce((sum, item) => sum + item.quantity, 0);
    const targetQuantity = existingQuantity + input.quantity;

    if (
      !selection.available ||
      targetQuantity > selection.freeQuantity
    ) {
      throw new CartPricingError("insufficient_stock", 409);
    }

    await this.repository.addOrIncrementItem({
      userId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      quantity: input.quantity,
      unitPriceSnapshot: roundMoney(selection.price),
      compareAtPriceSnapshot:
        product.compareAtPrice !== null &&
        product.compareAtPrice > selection.price
          ? roundMoney(product.compareAtPrice)
          : null
    });

    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    input: UpdateCartItemInput
  ): Promise<CartResponse> {
    const bundle = await this.repository.getBundle(userId);
    const item = bundle.items.find((candidate) => candidate.id === itemId);

    if (!item) {
      throw new CartPricingError("cart_item_not_found", 404);
    }

    const product = bundle.productStates.find(
      (candidate) => candidate.id === item.productId
    );

    if (productVisibilityIssue(product)) {
      throw new CartPricingError("product_unavailable", 409);
    }

    if (!product) {
      throw new CartPricingError("product_unavailable", 409);
    }

    const selection = currentSelection(product, item.variantId);

    if (selection.issue) {
      throw new CartPricingError(selection.issue, 409);
    }

    if (
      !selection.available ||
      input.quantity > selection.freeQuantity
    ) {
      throw new CartPricingError("insufficient_stock", 409);
    }

    if (
      !(await this.repository.updateItemQuantity(
        userId,
        itemId,
        input.quantity
      ))
    ) {
      throw new CartPricingError("cart_item_not_found", 404);
    }

    return this.getCart(userId);
  }

  async removeItem(
    userId: string,
    itemId: string
  ): Promise<CartResponse> {
    if (!(await this.repository.removeItem(userId, itemId))) {
      throw new CartPricingError("cart_item_not_found", 404);
    }

    return this.getCart(userId);
  }

  async applyCoupon(
    userId: string,
    input: ApplyCartCouponInput
  ): Promise<CartResponse> {
    const cart = await this.getCart(userId);
    const group = cart.groups.find(
      (candidate) => candidate.store.id === input.storeId
    );

    if (!group) {
      throw new CartPricingError("invalid_request", 400);
    }

    const evaluated = couponState(
      await this.repository.findCoupon(input.storeId, input.code),
      group.subtotalAfterProductDiscount,
      new Date()
    );

    if (!evaluated.valid) {
      throw new CartPricingError(
        evaluated.error ?? "coupon_invalid",
        409
      );
    }

    await this.repository.setCoupon(
      userId,
      input.storeId,
      input.code
    );

    return this.getCart(userId);
  }

  async removeCoupon(
    userId: string,
    storeId: string
  ): Promise<CartResponse> {
    await this.repository.removeCoupon(userId, storeId);
    return this.getCart(userId);
  }

  async listAddresses(
    userId: string
  ): Promise<CustomerAddressListResponse> {
    return {
      addresses: await this.repository.listAddresses(userId)
    };
  }

  async createAddress(
    userId: string,
    input: CreateCustomerAddressInput
  ): Promise<CustomerAddressRecord> {
    return this.repository.createAddress(userId, input);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: UpdateCustomerAddressInput
  ): Promise<CustomerAddressRecord> {
    const existing = await this.repository.findAddress(userId, addressId);

    if (!existing) {
      throw new CartPricingError("address_not_found", 404);
    }

    const nextLatitude =
      input.mapLatitude !== undefined
        ? input.mapLatitude
        : existing.mapLatitude;
    const nextLongitude =
      input.mapLongitude !== undefined
        ? input.mapLongitude
        : existing.mapLongitude;

    if ((nextLatitude === null) !== (nextLongitude === null)) {
      throw new CartPricingError("invalid_request", 400);
    }

    const updated = await this.repository.updateAddress(
      userId,
      addressId,
      input
    );

    if (!updated) {
      throw new CartPricingError("address_not_found", 404);
    }

    return updated;
  }

  async deleteAddress(
    userId: string,
    addressId: string
  ): Promise<void> {
    if (!(await this.repository.deleteAddress(userId, addressId))) {
      throw new CartPricingError("address_not_found", 404);
    }
  }

  async quoteCheckout(
    userId: string,
    input: CheckoutQuoteInput
  ): Promise<CheckoutQuoteResponse> {
    const address = await this.repository.findAddress(
      userId,
      input.addressId
    );

    if (!address) {
      throw new CartPricingError("address_not_found", 404);
    }

    const bundle = await this.repository.getBundle(userId);
    const cart = await this.priceBundle(bundle);

    if (cart.itemCount === 0) {
      throw new CartPricingError("cart_empty", 409);
    }

    if (cart.hasBlockingIssues) {
      throw new CartPricingError("checkout_unavailable", 409);
    }

    const expiresAt = new Date(Date.now() + CHECKOUT_QUOTE_TTL_MS);
    const snapshot = {
      address,
      cart,
      steps: {
        address: "ready",
        delivery: "pending_phase_6",
        payment: "pending_phase_7",
        review: "pricing_ready",
        placeOrder: "blocked_until_phase_8"
      },
      canProceedToDelivery: true,
      canPlaceOrder: false
    } satisfies Omit<
      CheckoutQuoteResponse,
      "sessionId" | "status" | "expiresAt"
    >;

    const session = await this.repository.createCheckoutQuote({
      userId,
      cartId: bundle.cart.id,
      addressId: address.id,
      cartUpdatedAt: bundle.cart.updatedAt,
      pricingSnapshot: snapshot as unknown as Record<string, unknown>,
      expiresAt
    });

    return {
      sessionId: session.id,
      status: "quoted",
      ...snapshot,
      expiresAt: session.expiresAt.toISOString()
    };
  }

  async getCheckoutQuote(
    userId: string,
    sessionId: string
  ): Promise<CheckoutQuoteResponse> {
    const row = await this.repository.findCheckoutQuote(
      userId,
      sessionId
    );

    if (
      !row ||
      row.status !== "quoted" ||
      !row.pricingSnapshot ||
      !row.expiresAt ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      throw new CartPricingError("checkout_unavailable", 404);
    }

    return {
      sessionId: row.id,
      status: "quoted",
      ...(row.pricingSnapshot as unknown as Omit<
        CheckoutQuoteResponse,
        "sessionId" | "status" | "expiresAt"
      >),
      expiresAt: row.expiresAt.toISOString()
    };
  }
}
