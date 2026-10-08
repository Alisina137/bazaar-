import type {
  CartResponse,
  CustomerAddressRecord,
  DeliveryDistanceRuleRecord,
  DeliverySpeedRecord,
  DeliveryZoneRecord,
  StoreDeliveryConfigurationResponse,
  StoreDeliverySettingsRecord
} from "@bazaarlink/contracts";
import { describe, expect, it } from "vitest";

import type { CartPricingServiceContract } from "../cart-pricing/service.js";
import { getStoreEntitlements } from "../store/entitlements.js";
import { DeliveryError } from "./errors.js";
import type {
  DeliveryRepository,
  DeliveryRuntimeConfiguration
} from "./repository.js";
import { DeliveryService } from "./service.js";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const PRODUCT_ID = "30000000-0000-4000-8000-000000000001";
const ADDRESS_ID = "40000000-0000-4000-8000-000000000001";
const NOW = "2026-10-05T08:00:00.000Z";

const address: CustomerAddressRecord = {
  id: ADDRESS_ID,
  userId: USER_ID,
  label: "Home",
  recipientName: "Customer",
  country: "Afghanistan",
  province: "Kabul",
  districtCity: "District 3",
  areaNeighborhood: "Karte 4",
  addressDescription: "Blue gate",
  nearestLandmark: null,
  phone: "+93700000000",
  mapLatitude: null,
  mapLongitude: null,
  deliveryInstructions: null,
  isDefault: true,
  createdAt: NOW,
  updatedAt: NOW
};

const settings: StoreDeliverySettingsRecord = {
  storeId: STORE_ID,
  deliveryEnabled: true,
  pickupEnabled: false,
  originAddress: "Kabul",
  originProvince: "Kabul",
  originDistrict: "District 3",
  originArea: "Karte 4",
  originLatitude: null,
  originLongitude: null,
  defaultDeliveryFee: null,
  freeDeliveryThreshold: null,
  minimumOrderAmount: null,
  operatingWeekdays: [0, 1, 2, 3, 4, 5, 6],
  cutoffTime: null,
  pickupMinMinutes: 30,
  pickupMaxMinutes: 120,
  createdAt: NOW,
  updatedAt: NOW
};

const standardSpeed: DeliverySpeedRecord = {
  id: "50000000-0000-4000-8000-000000000001",
  storeId: STORE_ID,
  name: "Standard",
  kind: "standard",
  surchargeType: "fixed",
  surchargeValue: 20,
  minEtaMinutes: 60,
  maxEtaMinutes: 120,
  minimumOrderAmount: null,
  maxRangeKm: null,
  cutoffTime: null,
  supportedWeekdays: [0, 1, 2, 3, 4, 5, 6],
  maxWeightGrams: null,
  sortOrder: 0,
  active: true,
  createdAt: NOW,
  updatedAt: NOW
};

const provinceZone: DeliveryZoneRecord = {
  id: "60000000-0000-4000-8000-000000000001",
  storeId: STORE_ID,
  name: "Kabul",
  province: "Kabul",
  districtCity: null,
  areaNeighborhood: null,
  fee: 100,
  priority: 0,
  active: true,
  createdAt: NOW,
  updatedAt: NOW
};

const areaZone: DeliveryZoneRecord = {
  id: "60000000-0000-4000-8000-000000000002",
  storeId: STORE_ID,
  name: "Karte 4",
  province: "Kabul",
  districtCity: "District 3",
  areaNeighborhood: "Karte 4",
  fee: 50,
  priority: 0,
  active: true,
  createdAt: NOW,
  updatedAt: NOW
};

const cart: CartResponse = {
  id: "70000000-0000-4000-8000-000000000001",
  currency: "AFN",
  groups: [
    {
      store: {
        id: STORE_ID,
        name: "Test Store",
        handle: "test-store",
        province: "Kabul",
        cityDistrict: "District 3",
        logoUrl: null,
        coverImageUrl: null,
        description: null,
        preferredLocale: "fa-AF",
        trust: {
          storeId: STORE_ID,
          phoneVerified: false,
          verificationLevel: "unverified"
        }
      },
      items: [
        {
          id: "80000000-0000-4000-8000-000000000001",
          productId: PRODUCT_ID,
          variantId: null,
          name: "Phone",
          variantTitle: null,
          imageUrl: null,
          quantity: 2,
          unitListPrice: 500,
          unitPrice: 500,
          lineItemsSubtotal: 1000,
          lineProductDiscount: 0,
          lineTotal: 1000,
          inStock: true,
          availableQuantity: 5,
          priceChanged: false,
          unavailableReason: null
        }
      ],
      itemsSubtotal: 1000,
      productDiscount: 0,
      subtotalAfterProductDiscount: 1000,
      coupon: null,
      couponDiscount: 0,
      preDeliveryTotal: 1000,
      deliveryStatus: "pending_phase_6",
      paymentStatus: "pending_phase_7",
      hasBlockingIssues: false
    }
  ],
  totals: {
    itemsSubtotal: 1000,
    productDiscount: 0,
    couponDiscount: 0,
    preDeliveryTotal: 1000
  },
  itemCount: 2,
  hasBlockingIssues: false,
  priceChanged: false,
  updatedAt: NOW
};

function runtime(
  overrides: Partial<DeliveryRuntimeConfiguration> = {}
): DeliveryRuntimeConfiguration {
  return {
    store: {
      id: STORE_ID,
      ownerUserId: "90000000-0000-4000-8000-000000000001",
      name: "Test Store",
      province: "Kabul",
      cityDistrict: "District 3",
      physicalAddress: "Kabul",
      mapLatitude: null,
      mapLongitude: null,
      status: "published",
      plan: "pro",
      subscriptionStatus: "active"
    },
    settings,
    zones: [provinceZone, areaZone],
    distanceRules: [],
    speeds: [standardSpeed],
    ...overrides
  };
}

function merchantConfig(
  plan: "starter" | "pro" | "business" = "pro"
): StoreDeliveryConfigurationResponse {
  return {
    store: {
      id: STORE_ID,
      name: "Test Store",
      province: "Kabul",
      cityDistrict: "District 3",
      subscription: {
        plan,
        status: "active",
        currentPeriodEnd: null,
        gracePeriodEnd: null,
        entitlements: getStoreEntitlements(plan)
      }
    },
    entitlements: getStoreEntitlements(plan),
    settings,
    zones: [],
    distanceRules: [],
    speeds: []
  };
}

function repository(
  overrides: Partial<DeliveryRepository> = {}
): DeliveryRepository {
  return {
    getMerchantConfiguration: async () => merchantConfig(),
    getRuntimeConfiguration: async () => runtime(),
    updateSettings: async () => settings,
    createZone: async () => areaZone,
    updateZone: async () => areaZone,
    deleteZone: async () => true,
    createDistanceRule: async () => null,
    updateDistanceRule: async () => null,
    deleteDistanceRule: async () => true,
    createSpeed: async () => standardSpeed,
    updateSpeed: async () => standardSpeed,
    deleteSpeed: async () => true,
    ensureDefaultSpeed: async () => undefined,
    findAddress: async () => address,
    getProductStates: async () => [
      {
        id: PRODUCT_ID,
        weightGrams: 200,
        deliveryProfile: "normal",
        deliverySurcharge: 5
      }
    ],
    persistCheckoutQuote: async ({ expiresAt }) => ({
      id: "a0000000-0000-4000-8000-000000000001",
      expiresAt
    }),
    getPersistedQuote: async () => null,
    ...overrides
  };
}

function cartService(): CartPricingServiceContract {
  return {
    getCart: async () => cart
  } as unknown as CartPricingServiceContract;
}

describe("DeliveryService", () => {
  it("uses the most specific overlapping zone deterministically", async () => {
    const service = new DeliveryService(repository(), cartService());
    const response = await service.options(USER_ID, ADDRESS_ID);

    const option = response.merchantGroups[0]?.options.find(
      (candidate) => candidate.fulfillmentType === "delivery"
    );

    expect(option).toMatchObject({
      ruleUsed: {
        type: "zone",
        id: areaZone.id,
        label: "Karte 4"
      },
      price: {
        baseDelivery: 50,
        urgencySurcharge: 20,
        productDeliverySurcharge: 10,
        freeDeliveryDiscount: 0,
        finalDeliveryPrice: 80
      }
    });
    expect(response.canContinue).toBe(true);
  });

  it("keeps zone delivery usable when map coordinates are unavailable", async () => {
    const service = new DeliveryService(repository(), cartService());
    const response = await service.options(USER_ID, ADDRESS_ID);

    const option = response.merchantGroups[0]?.options[0];

    expect(option?.ruleUsed.distanceSource).toBe("not_required");
    expect(option?.ruleUsed.type).toBe("zone");
  });

  it("uses deterministic straight-line distance fallback for distance rules", async () => {
    const distanceAddress = {
      ...address,
      areaNeighborhood: null,
      mapLatitude: 34.5553,
      mapLongitude: 69.2075
    };
    const rule: DeliveryDistanceRuleRecord = {
      id: "b0000000-0000-4000-8000-000000000001",
      storeId: STORE_ID,
      name: "0-20 km",
      type: "tier",
      minDistanceKm: 0,
      maxDistanceKm: 20,
      fee: 70,
      baseFee: null,
      perKmFee: null,
      priority: 0,
      active: true,
      createdAt: NOW,
      updatedAt: NOW
    };

    const service = new DeliveryService(
      repository({
        findAddress: async () => distanceAddress,
        getRuntimeConfiguration: async () =>
          runtime({
            settings: {
              ...settings,
              originLatitude: 34.5253,
              originLongitude: 69.1783
            },
            zones: [],
            distanceRules: [rule]
          })
      }),
      cartService()
    );

    const response = await service.options(USER_ID, ADDRESS_ID);
    const option = response.merchantGroups[0]?.options[0];

    expect(option?.ruleUsed.type).toBe("distance_tier");
    expect(option?.ruleUsed.distanceSource).toBe(
      "straight_line_fallback"
    );
    expect(option?.ruleUsed.distanceKm).toBeGreaterThan(0);
    expect(option?.price.baseDelivery).toBe(70);
  });

  it("applies the free-delivery threshold after urgency and product adjustments", async () => {
    const service = new DeliveryService(
      repository({
        getRuntimeConfiguration: async () =>
          runtime({
            settings: {
              ...settings,
              freeDeliveryThreshold: 1000
            }
          })
      }),
      cartService()
    );

    const response = await service.options(USER_ID, ADDRESS_ID);
    const option = response.merchantGroups[0]?.options[0];

    expect(option).toMatchObject({
      ruleUsed: {
        type: "free_delivery"
      },
      price: {
        baseDelivery: 50,
        urgencySurcharge: 20,
        productDeliverySurcharge: 10,
        freeDeliveryDiscount: 80,
        finalDeliveryPrice: 0
      }
    });
  });

  it("rejects advanced distance pricing for Starter merchants", async () => {
    const repo = repository({
      getMerchantConfiguration: async () => merchantConfig("starter")
    });
    const service = new DeliveryService(repo, cartService());

    await expect(
      service.createDistanceRule(
        "90000000-0000-4000-8000-000000000001",
        STORE_ID,
        {
          name: "Advanced",
          type: "tier",
          minDistanceKm: 0,
          maxDistanceKm: 10,
          fee: 100
        }
      )
    ).rejects.toMatchObject({
      code: "advanced_delivery_unavailable",
      statusCode: 409
    } satisfies Partial<DeliveryError>);
  });

  it("returns outside coverage when no zone, distance, or default rule can price delivery", async () => {
    const service = new DeliveryService(
      repository({
        getRuntimeConfiguration: async () =>
          runtime({
            settings: {
              ...settings,
              defaultDeliveryFee: null
            },
            zones: [],
            distanceRules: []
          })
      }),
      cartService()
    );

    const response = await service.options(USER_ID, ADDRESS_ID);
    expect(response.canContinue).toBe(false);
    expect(response.merchantGroups[0]).toMatchObject({
      available: false,
      unavailableReason: "outside_coverage",
      options: []
    });
  });

  it("stops delivery after the store cutoff without charging a stale delivery price", async () => {
    const service = new DeliveryService(repository({
      getRuntimeConfiguration: async () => runtime({
        settings: {...settings, cutoffTime:"00:00",pickupEnabled:false}
      })
    }),cartService());
    const response = await service.options(USER_ID,ADDRESS_ID);
    expect(response.canContinue).toBe(false);
    expect(response.merchantGroups[0]).toMatchObject({
      available:false,unavailableReason:"cutoff_missed",options:[]
    });
  });

  it("rejects coordinate-dependent delivery when no location or zone can price it",async()=>{
    const service = new DeliveryService(repository({
      getRuntimeConfiguration: async () => runtime({
        zones:[],
        distanceRules: [{
          id:"b0000000-0000-4000-8000-000000000002",
          storeId:STORE_ID,name:"Distance tier",type:"tier",minDistanceKm:0,
          maxDistanceKm:20,fee:80,baseFee:null,perKmFee:null,priority:0,
          active:true,createdAt:NOW,updatedAt:NOW
        }],
        settings:{...settings,originLatitude:34.5253,originLongitude:69.1783,defaultDeliveryFee:null}
      })
    }),cartService());
    const response = await service.options(USER_ID,ADDRESS_ID);
    expect(response.canContinue).toBe(false);
    expect(response.merchantGroups[0]?.unavailableReason).toBe("address_location_required");
  });

  it("blocks checkout when the merchant is suspended",async()=>{
    const service = new DeliveryService(repository({
      getRuntimeConfiguration: async () => runtime({store:{...runtime().store,status:"suspended"}})
    }),cartService());
    const response=await service.options(USER_ID,ADDRESS_ID);
    expect(response.canContinue).toBe(false);
    expect(response.merchantGroups[0]?.unavailableReason).toBe("delivery_disabled");
  });

  it("disables expired same-day delivery while preserving eligible standard delivery",async()=>{
    const sameDay: DeliverySpeedRecord={
      ...standardSpeed,id:"50000000-0000-4000-8000-000000000003",
      name:"Same Day",kind:"same_day",cutoffTime:"00:00"
    };
    const service=new DeliveryService(repository({
      getRuntimeConfiguration:async()=>runtime({speeds:[standardSpeed,sameDay]})
    }),cartService());
    const response=await service.options(USER_ID,ADDRESS_ID);
    const options=response.merchantGroups[0]?.options??[];
    expect(response.canContinue).toBe(true);
    expect(options.some(option=>option.optionId===sameDay.id)).toBe(false);
    expect(options.some(option=>option.optionId===standardSpeed.id)).toBe(true);
  });

});
