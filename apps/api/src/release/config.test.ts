import { describe, expect, it } from "vitest";
import { validateProductionConfig } from "./config.js";

describe("Production configuration release gate", () => {
  const safe = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@db.example.test:5432/bazaar",
    API_PUBLIC_BASE_URL: "https://api.example.test"
  } as NodeJS.ProcessEnv;

  it("does not prevent local development", () => {
    expect(() => validateProductionConfig({NODE_ENV:"development"})).not.toThrow();
  });
  it("accepts live HTTPS API with PostgreSQL and manual payments", () => {
    expect(() => validateProductionConfig(safe)).not.toThrow();
  });
  it("fails closed on missing production DB or insecure public URL", () => {
    expect(() => validateProductionConfig({NODE_ENV:"production"})).toThrow("DATABASE_URL");
    expect(() => validateProductionConfig({...safe, API_PUBLIC_BASE_URL:"http://localhost:4000"})).toThrow("HTTPS");
  });
  it("refuses sandbox payment configuration with a live API", () => {
    expect(() => validateProductionConfig({...safe, HESABPAY_API_KEY:"key",HESABPAY_ENVIRONMENT:"sandbox"})).toThrow("HESABPAY_ENVIRONMENT");
  });
  it("requires HTTPS payment redirect when live gateway configured", () => {
    expect(() => validateProductionConfig({...safe,HESABPAY_API_KEY:"key",HESABPAY_ENVIRONMENT:"production"})).toThrow("PAYMENT_PUBLIC_BASE_URL");
    expect(() => validateProductionConfig({...safe,HESABPAY_API_KEY:"key",HESABPAY_ENVIRONMENT:"production",PAYMENT_PUBLIC_BASE_URL:"https://api.example.test"})).not.toThrow();
  });
});
