import { describe, expect, it } from "vitest";

import { describeDatabaseRuntimeError } from "./runtime-error.js";

describe("database runtime error diagnostics", () => {
  it("explains a refused local PostgreSQL connection", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED"
    });

    expect(describeDatabaseRuntimeError(error)).toContain("pnpm db:up");
  });

  it("explains invalid database credentials without exposing secrets", () => {
    const error = Object.assign(new Error("password authentication failed"), {
      code: "28P01"
    });

    const result = describeDatabaseRuntimeError(error);

    expect(result).toContain("Verify the username and password");
    expect(result).not.toContain("postgresql://");
  });

  it("walks nested causes from database libraries", () => {
    const rootCause = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED"
    });

    expect(
      describeDatabaseRuntimeError({
        message: "migration failed",
        cause: rootCause
      })
    ).toContain("pnpm db:up");
  });
});
