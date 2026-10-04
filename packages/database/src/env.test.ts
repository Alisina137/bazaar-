import { describe, expect, it } from "vitest";

import { parseDatabaseConfig } from "./env.js";

describe("database environment", () => {
  it("parses a PostgreSQL URL with safe defaults", () => {
    expect(
      parseDatabaseConfig({
        DATABASE_URL: "postgresql://user:example@localhost:5432/bazaarlink"
      })
    ).toEqual({
      url: "postgresql://user:example@localhost:5432/bazaarlink",
      maxConnections: 5,
      connectTimeoutSeconds: 10,
      idleTimeoutSeconds: 20,
      prepareStatements: false
    });
  });

  it("parses explicit pool settings", () => {
    const parsed = parseDatabaseConfig({
      DATABASE_URL: "postgres://user:example@localhost:5432/bazaarlink",
      DATABASE_MAX_CONNECTIONS: "12",
      DATABASE_CONNECT_TIMEOUT_SECONDS: "15",
      DATABASE_IDLE_TIMEOUT_SECONDS: "30",
      DATABASE_PREPARE_STATEMENTS: "true"
    });

    expect(parsed.maxConnections).toBe(12);
    expect(parsed.connectTimeoutSeconds).toBe(15);
    expect(parsed.idleTimeoutSeconds).toBe(30);
    expect(parsed.prepareStatements).toBe(true);
  });

  it("rejects missing or non-PostgreSQL database URLs", () => {
    expect(() => parseDatabaseConfig({})).toThrow(
      "Invalid database configuration"
    );
    expect(() =>
      parseDatabaseConfig({
        DATABASE_URL: "mysql://localhost/bazaarlink"
      })
    ).toThrow("PostgreSQL protocol");
  });
});
