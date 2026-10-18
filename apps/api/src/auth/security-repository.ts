import {
  authAccounts,
  authSessions,
  authVerificationTokens,
  type Database
} from "@bazaarlink/database";
import {
  and, desc, eq, gt, isNull, ne
} from "drizzle-orm";

type Purpose = "verify_email" | "password_reset";

export interface SessionInfo {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  current: boolean;
}

export class DatabaseAuthSecurityRepository {
  constructor(private readonly db: Database) {}

  async verified(accountId: string): Promise<boolean> {
    const [row] = await this.db.select({ verifiedAt: authAccounts.verifiedAt })
      .from(authAccounts).where(eq(authAccounts.id, accountId)).limit(1);
    return Boolean(row?.verifiedAt);
  }

  async createToken(accountId: string, purpose: Purpose, tokenHash: string): Promise<boolean> {
    const now = new Date();
    // Avoid sending a fresh email repeatedly for one account. Route rate limits
    // also apply to unknown accounts, so callers cannot enumerate emails.
    const [recent] = await this.db.select({ id: authVerificationTokens.id })
      .from(authVerificationTokens)
      .where(and(
        eq(authVerificationTokens.accountId, accountId),
        eq(authVerificationTokens.purpose, purpose),
        isNull(authVerificationTokens.consumedAt),
        gt(authVerificationTokens.createdAt, new Date(now.getTime() - 120_000)),
        gt(authVerificationTokens.expiresAt, now)
      ))
      .limit(1);
    if (recent) return false;

    await this.db.insert(authVerificationTokens).values({
      accountId, purpose, tokenHash,
      expiresAt: new Date(now.getTime() + 15 * 60_000)
    });
    return true;
  }

  async verifyEmail(tokenHash: string): Promise<boolean> {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const [used] = await tx.update(authVerificationTokens)
        .set({ consumedAt: now })
        .where(and(
          eq(authVerificationTokens.tokenHash, tokenHash),
          eq(authVerificationTokens.purpose, "verify_email"),
          isNull(authVerificationTokens.consumedAt),
          gt(authVerificationTokens.expiresAt, now)
        ))
        .returning({ accountId: authVerificationTokens.accountId });
      if (!used) return false;
      await tx.update(authAccounts).set({
        verifiedAt: now, updatedAt: now
      }).where(eq(authAccounts.id, used.accountId));
      await tx.update(authVerificationTokens).set({ consumedAt: now }).where(and(
        eq(authVerificationTokens.accountId, used.accountId),
        eq(authVerificationTokens.purpose, "verify_email"),
        isNull(authVerificationTokens.consumedAt)
      ));
      return true;
    });
  }

  async resetPassword(tokenHash: string, passwordHash: string): Promise<boolean> {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const [used] = await tx.update(authVerificationTokens)
        .set({ consumedAt: now })
        .where(and(
          eq(authVerificationTokens.tokenHash, tokenHash),
          eq(authVerificationTokens.purpose, "password_reset"),
          isNull(authVerificationTokens.consumedAt),
          gt(authVerificationTokens.expiresAt, now)
        ))
        .returning({ accountId: authVerificationTokens.accountId });
      if (!used) return false;
      const [account] = await tx.update(authAccounts).set({
        passwordHash, verifiedAt: now, updatedAt: now
      }).where(eq(authAccounts.id, used.accountId))
        .returning({ userId: authAccounts.userId });
      if (!account) return false;
      await tx.update(authSessions).set({ revokedAt: now })
        .where(and(eq(authSessions.userId, account.userId), isNull(authSessions.revokedAt)));
      await tx.update(authVerificationTokens).set({ consumedAt: now })
        .where(and(
          eq(authVerificationTokens.accountId, used.accountId),
          isNull(authVerificationTokens.consumedAt)
        ));
      return true;
    });
  }

  async changePassword(
    userId: string, oldHash: string, newHash: string, currentTokenHash: string
  ): Promise<boolean> {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const [updated] = await tx.update(authAccounts)
        .set({ passwordHash: newHash, updatedAt: now })
        .where(and(
          eq(authAccounts.userId, userId),
          eq(authAccounts.provider, "email_password"),
          eq(authAccounts.passwordHash, oldHash)
        ))
        .returning({ id: authAccounts.id });
      if (!updated) return false;
      await tx.update(authSessions).set({ revokedAt: now }).where(and(
        eq(authSessions.userId, userId),
        ne(authSessions.tokenHash, currentTokenHash),
        isNull(authSessions.revokedAt)
      ));
      await tx.update(authVerificationTokens).set({ consumedAt: now }).where(and(
        eq(authVerificationTokens.accountId, updated.id),
        isNull(authVerificationTokens.consumedAt)
      ));
      return true;
    });
  }

  async listSessions(userId: string, currentTokenHash: string): Promise<SessionInfo[]> {
    const rows = await this.db.select({
      id: authSessions.id, tokenHash: authSessions.tokenHash,
      createdAt: authSessions.createdAt,
      lastSeenAt: authSessions.lastSeenAt, expiresAt: authSessions.expiresAt
    }).from(authSessions).where(and(
      eq(authSessions.userId, userId),
      isNull(authSessions.revokedAt),
      gt(authSessions.expiresAt, new Date())
    )).orderBy(desc(authSessions.lastSeenAt)).limit(50);
    return rows.map(({ tokenHash, ...rest }) => ({
      ...rest, current: tokenHash === currentTokenHash
    }));
  }

  async revokeSession(userId: string, sessionId: string, currentTokenHash: string): Promise<boolean> {
    const [revoked] = await this.db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(authSessions.userId, userId),
        eq(authSessions.id, sessionId),
        ne(authSessions.tokenHash, currentTokenHash),
        isNull(authSessions.revokedAt)
      ))
      .returning({ id: authSessions.id });
    return Boolean(revoked);
  }

  async revokeOthers(userId: string, currentTokenHash: string): Promise<void> {
    await this.db.update(authSessions).set({ revokedAt: new Date() }).where(and(
      eq(authSessions.userId, userId),
      ne(authSessions.tokenHash, currentTokenHash),
      isNull(authSessions.revokedAt)
    ));
  }
}
