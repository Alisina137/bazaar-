import {
  closeDatabaseClient,
  createDatabaseClient,
  parseDatabaseConfig,
  stores,
  users
} from "@bazaarlink/database";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  afterAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { buildApp } from "../app.js";
import { parseAuthConfig } from "../auth/config.js";
import { DatabaseAuthRepository } from "../auth/repository.js";
import { AuthService } from "../auth/service.js";
import { DatabaseStoreRepository } from "../store/repository.js";
import { StoreService } from "../store/service.js";
import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";
import { DatabaseGrowthRepository } from "./repository.js";
import { GrowthService } from "./service.js";

vi.setConfig({ testTimeout: INTEGRATION_TEST_TIMEOUT_MS });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)(
  "database-backed Phase 10 Merchant Growth",
  () => {
    const client = createDatabaseClient(parseDatabaseConfig());
    const authService = new AuthService(
      new DatabaseAuthRepository(client.db),
      parseAuthConfig()
    );
    const storeService = new StoreService(
      new DatabaseStoreRepository(client.db)
    );
    const growthService = new GrowthService(
      new DatabaseGrowthRepository(client.db)
    );
    const app = buildApp({
      authService,
      storeService,
      growthService
    });

    const userIds: string[] = [];
    let storeId: string | null = null;

    afterAll(async () => {
      if (storeId) {
        await client.db.delete(stores).where(eq(stores.id, storeId));
      }
      if (userIds.length > 0) {
        await client.db.delete(users).where(inArray(users.id, userIds));
      }
      await app.close();
      await closeDatabaseClient(client);
    });

    it(
      "gates Starter growth tools, upgrades to Pro, manages coupons and staff, then downgrades safely",
      async () => {
        const owner = await authService.register({
          email: "phase10-owner-" + randomUUID() + "@example.com",
          password: "phase10-password",
          displayName: "Phase 10 Owner",
          preferredLocale: "fa-AF"
        });
        const staffEmail =
          "phase10-staff-" + randomUUID() + "@example.com";
        const staffUser = await authService.register({
          email: staffEmail,
          password: "phase10-password",
          displayName: "Phase 10 Staff",
          preferredLocale: "en"
        });
        userIds.push(owner.user.id, staffUser.user.id);

        const createStore = await app.inject({
          method: "POST",
          url: "/seller/stores",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            name: "Phase 10 Growth Store",
            handle: "phase10-" + randomUUID().slice(0, 8),
            category: "Retail",
            province: "Kabul",
            cityDistrict: "District 4",
            phone: "+93700000010",
            preferredLocale: "fa-AF"
          }
        });
        expect(createStore.statusCode).toBe(201);
        const store = createStore.json();
        storeId = store.id;
        expect(store.subscription.plan).toBe("starter");

        const starterCoupon = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/coupons",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            code: "STARTER10",
            type: "percentage",
            value: 10
          }
        });
        expect(starterCoupon.statusCode).toBe(409);
        expect(starterCoupon.json()).toMatchObject({
          error: { code: "feature_not_available" }
        });

        const upgrade = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/subscription/change",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: { plan: "pro" }
        });
        expect(upgrade.statusCode).toBe(200);
        expect(upgrade.json()).toMatchObject({
          change: {
            fromPlan: "starter",
            toPlan: "pro",
            direction: "upgrade"
          },
          usage: {
            productLimit: 300,
            staffLimit: 3
          }
        });

        const coupon = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/coupons",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            code: "PRO10",
            type: "percentage",
            value: 10,
            minimumOrderAmount: 100
          }
        });
        expect(coupon.statusCode).toBe(201);
        expect(coupon.json()).toMatchObject({
          code: "PRO10",
          active: true
        });

        const invite = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/staff/invites",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            email: staffEmail,
            permissions: ["analytics", "products"]
          }
        });
        expect(invite.statusCode).toBe(201);
        const inviteBody = invite.json();
        expect(inviteBody.inviteCode).toBeTruthy();

        const accepted = await app.inject({
          method: "POST",
          url: "/seller/staff-invites/accept",
          headers: {
            authorization: "Bearer " + staffUser.session.token
          },
          payload: {
            inviteCode: inviteBody.inviteCode
          }
        });
        expect(accepted.statusCode).toBe(200);
        expect(accepted.json()).toMatchObject({
          userId: staffUser.user.id,
          status: "active",
          permissions: ["analytics", "products"]
        });

        const staffStores = await app.inject({
          method: "GET",
          url: "/seller/stores",
          headers: {
            authorization: "Bearer " + staffUser.session.token
          }
        });
        expect(staffStores.statusCode).toBe(200);
        expect(
          staffStores.json().stores.some(
            (candidate: { id: string }) => candidate.id === store.id
          )
        ).toBe(true);

        const staffAnalytics = await app.inject({
          method: "GET",
          url: "/seller/stores/" + store.id + "/analytics?days=30",
          headers: {
            authorization: "Bearer " + staffUser.session.token
          }
        });
        expect(staffAnalytics.statusCode).toBe(200);
        expect(staffAnalytics.json()).toMatchObject({
          storeId: store.id,
          plan: "pro",
          advanced: true
        });

        const downgrade = await app.inject({
          method: "POST",
          url: "/seller/stores/" + store.id + "/subscription/change",
          headers: {
            authorization: "Bearer " + owner.session.token
          },
          payload: {
            plan: "starter",
            keepStaffIds: []
          }
        });
        expect(downgrade.statusCode).toBe(200);
        expect(downgrade.json()).toMatchObject({
          change: {
            fromPlan: "pro",
            toPlan: "starter",
            direction: "downgrade"
          },
          usage: {
            productLimit: 15,
            staffLimit: 0,
            activeStaffCount: 0
          }
        });

        const couponAfterDowngrade = await app.inject({
          method: "GET",
          url: "/seller/stores/" + store.id + "/coupons",
          headers: {
            authorization: "Bearer " + owner.session.token
          }
        });
        expect(couponAfterDowngrade.statusCode).toBe(409);
        expect(couponAfterDowngrade.json()).toMatchObject({
          error: { code: "feature_not_available" }
        });

        const staffAfterDowngrade = await app.inject({
          method: "GET",
          url: "/seller/stores/" + store.id + "/analytics?days=30",
          headers: {
            authorization: "Bearer " + staffUser.session.token
          }
        });
        expect(staffAfterDowngrade.statusCode).toBe(404);
      }
    );
  }
);
