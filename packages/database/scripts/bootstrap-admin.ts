import { eq, and } from "drizzle-orm";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { authAccounts, userRoles, users } from "../src/schema/index.js";
import { createDatabaseClient, closeDatabaseClient } from "../src/client.js";
import { parseDatabaseConfig } from "../src/env.js";

loadEnv({ path: resolve(process.cwd(), "../../.env"), quiet: true });
const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("Set ADMIN_BOOTSTRAP_EMAIL to an existing active BazaarLink account email");
}
const client = createDatabaseClient(parseDatabaseConfig());
try {
  await client.db.transaction(async tx => {
    const existing = await tx.select({userId: userRoles.userId}).from(userRoles).where(eq(userRoles.role, "super_admin")).limit(1);
    if (existing.length) throw new Error("A super administrator already exists; use the authorized operator workflow.");
    const matches = await tx.select({id:users.id,status:users.status}).from(authAccounts)
      .innerJoin(users, eq(authAccounts.userId, users.id))
      .where(and(eq(authAccounts.identifier, email), eq(authAccounts.provider, "email_password"))).limit(1);
    const account = matches[0];
    if (!account || account.status !== "active") throw new Error("Active registered account not found");
    await tx.insert(userRoles).values({userId:account.id, role:"super_admin"}).onConflictDoNothing();
  });
  process.stdout.write("Initial super admin granted to registered account.\n");
} finally {
  await closeDatabaseClient(client);
}
