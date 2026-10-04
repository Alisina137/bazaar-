import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  authAccounts,
  authSessions,
  authVerificationTokens,
  userRoles,
  users
} from "./auth.js";

describe("authentication schema foundation", () => {
  it("uses stable table names for migration compatibility", () => {
    expect(getTableName(users)).toBe("users");
    expect(getTableName(userRoles)).toBe("user_roles");
    expect(getTableName(authAccounts)).toBe("auth_accounts");
    expect(getTableName(authSessions)).toBe("auth_sessions");
    expect(getTableName(authVerificationTokens)).toBe(
      "auth_verification_tokens"
    );
  });

  it("keeps authentication and role records linked to UUID identifiers", () => {
    expect(users.id.dataType).toBe("string");
    expect(userRoles.userId.dataType).toBe("string");
    expect(authAccounts.userId.dataType).toBe("string");
    expect(authSessions.userId.dataType).toBe("string");
    expect(authVerificationTokens.accountId.dataType).toBe("string");
  });
});
