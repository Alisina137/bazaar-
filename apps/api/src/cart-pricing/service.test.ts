import type {
  CreateCustomerAddressInput,
  CustomerAddressRecord
} from "@bazaarlink/contracts";
import { describe, expect, it } from "vitest";

import { CartPricingError } from "./errors.js";
import type {
  CartBundle,
  CartPricingRepository,
  CartProductState,
  StoreCouponState
} from "./repository.js";
import { CartPricingService } from "./service.js";

const now = new Date("2026-10-05T00:00:00.000Z");

const product: CartProductState = {
  id: "10000000-0000-4000-8000-000000000001",
  storeId: "20000000-0000-4000-8000-000000000001",
  storeName: "Kabul Mobile",
  storeHandle: "kabul-mobile",
  storeProvince: "Kabul",
  storeCityDistrict: "District 3",
  storeLogoUrl: null,
  storeCoverImageUrl: null,
  storeDescription: null,
  storePreferredLocale: "fa-AF",
  storePhoneVerified: false,
  storeStatus: "published",
  subscriptionPlan: "pro",
  subscriptionStatus: "active",
  name: "Phone",
  price: 23000,
  compareAtPrice: 24000,
  status: "active",
  availableQuantity: 5,
  reservedQuantity: 0,
  imageUrl: null,
  variants: []
};

const address: CustomerAddressRecord = {
  id: "30000000-0000-4000-8000-000000000001",
  userId: "40000000-0000-4000-8000-000000000001",
  label: "Home",
  recipientName: "Customer",
  country: "Afghanistan",
  province: "Kabul",
  districtCity: "District 3",
  areaNeighborhood: "Karte 4",
  addressDescription: "Second street",
  nearestLandmark: "Mosque",
  phone: "+93700000000",
  mapLatitude: null,
  mapLongitude: null,
  deliveryInstructions: null,
  isDefault: true,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString()
};

function bundle(
  overrides: Partial<CartBundle> = {}
): CartBundle {
  return {
    cart: {
      id: "50000000-0000-4000-8000-000000000001",
      userId: address.userId,
      currency: "AFN",
      createdAt: now,
      updatedAt: now
    },
    items: [
      {
        id: "60000000-0000-4000-8000-000000000001",
        cartId: "50000000-0000-4000-8000-000000000001",
        productId: product.id,
        variantId: null,
        quantity: 2,
        unitPriceSnapshot: "23000.00",
        compareAtPriceSnapshot: "24000.00",
        createdAt: now,
        updatedAt: now
      }
    ],
    coupons: [],
    productStates: [product],
    ...overrides
  };
}

function validCoupon(): StoreCouponState {
  return {
    plan: "pro",
    subscriptionStatus: "active",
    coupon: {
      id: "70000000-0000-4000-8000-000000000001",
      storeId: product.storeId,
      code: "SAVE10",
      type: "percentage",
      value: "10.00",
      minimumOrderAmount: "1000.00",
      active: true,
      startsAt: null,
      endsAt: null,
      createdAt: now,
      updatedAt: now
    }
  };
}

function repository(
  overrides: Partial<CartPricingRepository> = {}
): CartPricingRepository {
  let state = bundle();
  let quoteSequence = 0;

  return {
    getOrCreateCart: async () => state.cart,
    getBundle: async () => state,
    findPublicProduct: async () => product,
    addOrIncrementItem: async () => undefined,
    updateItemQuantity: async () => true,
    removeItem: async () => true,
    setCoupon: async (_userId, storeId, code) => {
      state = {
        ...state,
        coupons: [
          {
            id: "80000000-0000-4000-8000-000000000001",
            cartId: state.cart.id,
            storeId,
            couponCode: code.trim().toUpperCase(),
            createdAt: now,
            updatedAt: now
          }
        ]
      };
    },
    removeCoupon: async () => {
      state = { ...state, coupons: [] };
    },
    findCoupon: async () => validCoupon(),
    listAddresses: async () => [address],
    findAddress: async () => address,
    createAddress: async (_userId, input: CreateCustomerAddressInput) => ({
      ...address,
      recipientName: input.recipientName
    }),
    updateAddress: async () => address,
    deleteAddress: async () => true,
    createCheckoutQuote: async ({ expiresAt }) => ({
      id:
        "90000000-0000-4000-8000-" +
        String(++quoteSequence).padStart(12, "0"),
      expiresAt
    }),
    findCheckoutQuote: async () => null,
    ...overrides
  };
}

describe("CartPricingService", () => {
  it("groups live prices by merchant and exposes product discounts", async () => {
    const service = new CartPricingService(repository());
    const cart = await service.getCart(address.userId);

    expect(cart.groups).toHaveLength(1);
    expect(cart.groups[0]).toMatchObject({
      itemsSubtotal: 48000,
      productDiscount: 2000,
      subtotalAfterProductDiscount: 46000,
      couponDiscount: 0,
      preDeliveryTotal: 46000,
      deliveryStatus: "pending_phase_6",
      paymentStatus: "pending_phase_7",
      hasBlockingIssues: false
    });
    expect(cart.totals).toEqual({
      itemsSubtotal: 48000,
      productDiscount: 2000,
      couponDiscount: 0,
      preDeliveryTotal: 46000
    });
  });

  it("applies one eligible merchant coupon and caps pricing on the server", async () => {
    const repo = repository();
    const service = new CartPricingService(repo);

    const cart = await service.applyCoupon(address.userId, {
      storeId: product.storeId,
      code: "save10"
    });

    expect(cart.groups[0]?.coupon).toMatchObject({
      code: "SAVE10",
      type: "percentage",
      valid: true,
      discountAmount: 4600
    });
    expect(cart.totals.couponDiscount).toBe(4600);
    expect(cart.totals.preDeliveryTotal).toBe(41400);
  });

  it("detects catalog price changes without trusting cart snapshots", async () => {
    const changedProduct: CartProductState = {
      ...product,
      price: 23500,
      compareAtPrice: 24500
    };
    const service = new CartPricingService(
      repository({
        getBundle: async () =>
          bundle({ productStates: [changedProduct] })
      })
    );

    const cart = await service.getCart(address.userId);

    expect(cart.priceChanged).toBe(true);
    expect(cart.groups[0]?.items[0]).toMatchObject({
      unitPrice: 23500,
      unitListPrice: 24500,
      priceChanged: true
    });
  });

  it("blocks checkout when inventory becomes insufficient", async () => {
    const depleted: CartProductState = {
      ...product,
      availableQuantity: 1
    };
    const service = new CartPricingService(
      repository({
        getBundle: async () =>
          bundle({ productStates: [depleted] })
      })
    );

    const cart = await service.getCart(address.userId);
    expect(cart.hasBlockingIssues).toBe(true);
    expect(cart.groups[0]?.items[0]?.unavailableReason).toBe(
      "insufficient_stock"
    );

    await expect(
      service.quoteCheckout(address.userId, {
        addressId: address.id
      })
    ).rejects.toMatchObject({
      code: "checkout_unavailable",
      statusCode: 409
    } satisfies Partial<CartPricingError>);
  });

  it("creates an address-bound pricing quote while keeping later phases explicit", async () => {
    const service = new CartPricingService(repository());

    const quote = await service.quoteCheckout(address.userId, {
      addressId: address.id
    });

    expect(quote.status).toBe("quoted");
    expect(quote.address.id).toBe(address.id);
    expect(quote.cart.totals.preDeliveryTotal).toBe(46000);
    expect(quote.steps).toEqual({
      address: "ready",
      delivery: "pending_phase_6",
      payment: "pending_phase_7",
      review: "pricing_ready",
      placeOrder: "blocked_until_delivery_payment"
    });
    expect(quote.canProceedToDelivery).toBe(true);
    expect(quote.canPlaceOrder).toBe(false);
  });

  it("rejects coupons when the merchant plan is not eligible", async () => {
    const service = new CartPricingService(
      repository({
        findCoupon: async () => ({
          ...validCoupon(),
          plan: "starter"
        })
      })
    );

    await expect(
      service.applyCoupon(address.userId, {
        storeId: product.storeId,
        code: "SAVE10"
      })
    ).rejects.toMatchObject({
      code: "coupon_not_eligible",
      statusCode: 409
    });
  });
  it("rejects a partial map pin when editing a saved address", async () => {
    const service = new CartPricingService(repository());

    await expect(
      service.updateAddress(address.userId, address.id, {
        mapLatitude: 34.5
      })
    ).rejects.toMatchObject({
      code: "invalid_request",
      statusCode: 400
    });
  });

});
