import type { MarketplaceServiceContract } from "./marketplace/service.js";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("API foundation", () => {
  it("reports a healthy API service", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "bazaarlink-api",
      status: "ok"
    });
  });

  it("reports a healthy database when the dependency succeeds", async () => {
    const app = buildApp({
      databaseHealthCheck: async () => undefined
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/health/database"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "bazaarlink-database",
      status: "ok"
    });
  });

  it("returns a safe unavailable response when database checking fails", async () => {
    const app = buildApp({
      databaseHealthCheck: async () => {
        throw new Error("database connection failed");
      }
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/health/database"
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      service: "bazaarlink-database",
      status: "unavailable"
    });
  });
  it("caches public marketplace GETs briefly but never authenticated GETs", async () => {
    const app=buildApp({
      marketplaceService: {
        categories: async () => ({categories:[]})
      } as unknown as MarketplaceServiceContract
    });
    apps.push(app);
    const shared=await app.inject({method:"GET",url:"/marketplace/categories"});
    expect(shared.statusCode).toBe(200);
    expect(shared.headers["cache-control"]).toContain("max-age=15");
    const authenticated=await app.inject({
      method:"GET",url:"/marketplace/categories",
      headers:{authorization:"Bearer dummy"}
    });
    expect(authenticated.statusCode).toBe(200);
    expect(authenticated.headers["cache-control"]).toBe("no-store");
  });

});
