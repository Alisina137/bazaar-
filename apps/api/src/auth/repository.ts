import {
  appRoles,
  type AppRole,
  type AuthUser,
  type UpdateAuthProfileInput
} from "@bazaarlink/contracts";
import {
  authAccounts,
  authSessions,
  type Database,
  userRoles,
  users
} from "@bazaarlink/database";
import { and, eq } from "drizzle-orm";

import { AuthRepositoryConflictError } from "./errors.js";

export interface EmailIdentity {
  accountId: string;
  user: AuthUser;
  passwordHash: string;
}

export interface SessionIdentity {
  sessionId: string;
  user: AuthUser;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export interface AuthRepository {
  findEmailIdentity(email: string): Promise<EmailIdentity | null>;
  createEmailIdentity(input: {
    email: string;
    passwordHash: string;
    displayName: string | null;
    preferredLocale: AuthUser["preferredLocale"];
  }): Promise<AuthUser>;
  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findSession(tokenHash: string): Promise<SessionIdentity | null>;
  revokeSession(tokenHash: string, revokedAt: Date): Promise<void>;
  touchSession(sessionId: string, lastSeenAt: Date): Promise<void>;
  updateProfile(userId: string, input: UpdateAuthProfileInput): Promise<AuthUser>;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
  };

  if (candidate.code === "23505") {
    return true;
  }

  return candidate.cause ? isUniqueViolation(candidate.cause) : false;
}

function sortRoles(roles: AppRole[]): AppRole[] {
  return [...roles].sort(
    (left, right) => appRoles.indexOf(left) - appRoles.indexOf(right)
  );
}

function isProfileColor(value: unknown): value is NonNullable<AuthUser["avatarColor"]> {
  return value === "teal" || value === "blue" || value === "purple" || value === "orange";
}

function toAuthUser(
  row: {
    id: string;
    displayName: string | null;
    phone?: string | null;
    avatarColor?: string;
    email?: string | null;
    preferredLocale: string;
    status: "active" | "suspended" | "disabled";
  },
  roles: AppRole[]
): AuthUser {
  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email ?? null,
    phone: row.phone ?? null,
    avatarColor: isProfileColor(row.avatarColor) ? row.avatarColor : "teal",
    preferredLocale: row.preferredLocale as AuthUser["preferredLocale"],
    status: row.status,
    roles: sortRoles(roles)
  };
}

export class DatabaseAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

  private async findRoles(userId: string): Promise<AppRole[]> {
    const rows = await this.db
      .select({
        role: userRoles.role
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    return sortRoles(rows.map((row) => row.role));
  }

  async findEmailIdentity(email: string): Promise<EmailIdentity | null> {
    const [row] = await this.db
      .select({
        accountId: authAccounts.id,
        passwordHash: authAccounts.passwordHash,
        email: authAccounts.identifier,
        id: users.id,
        phone: users.phone,
        avatarColor: users.avatarColor,
        displayName: users.displayName,
        preferredLocale: users.preferredLocale,
        status: users.status
      })
      .from(authAccounts)
      .innerJoin(users, eq(authAccounts.userId, users.id))
      .where(
        and(
          eq(authAccounts.provider, "email_password"),
          eq(authAccounts.identifier, email)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      accountId: row.accountId,
      passwordHash: row.passwordHash,
      user: toAuthUser(row, await this.findRoles(row.id))
    };
  }

  async createEmailIdentity(input: {
    email: string;
    passwordHash: string;
    displayName: string | null;
    preferredLocale: AuthUser["preferredLocale"];
  }): Promise<AuthUser> {
    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            displayName: input.displayName,
            preferredLocale: input.preferredLocale
          })
          .returning({
            id: users.id,
            displayName: users.displayName,
            preferredLocale: users.preferredLocale,
            status: users.status
          });

        if (!user) {
          throw new Error("user_insert_failed");
        }

        await tx.insert(authAccounts).values({
          userId: user.id,
          provider: "email_password",
          identifier: input.email,
          passwordHash: input.passwordHash
        });

        await tx.insert(userRoles).values({
          userId: user.id,
          role: "customer"
        });

        return toAuthUser({ ...user, email: input.email }, ["customer"]);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuthRepositoryConflictError();
      }

      throw error;
    }
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.insert(authSessions).values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt
    });
  }

  async findSession(tokenHash: string): Promise<SessionIdentity | null> {
    const [row] = await this.db
      .select({
        sessionId: authSessions.id,
        email: authAccounts.identifier,
        phone: users.phone,
        avatarColor: users.avatarColor,
        expiresAt: authSessions.expiresAt,
        lastSeenAt: authSessions.lastSeenAt,
        revokedAt: authSessions.revokedAt,
        id: users.id,
        displayName: users.displayName,
        preferredLocale: users.preferredLocale,
        status: users.status
      })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .leftJoin(authAccounts, and(
        eq(authAccounts.userId, users.id),
        eq(authAccounts.provider, "email_password")
      ))
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      sessionId: row.sessionId,
      expiresAt: row.expiresAt,
      lastSeenAt: row.lastSeenAt,
      revokedAt: row.revokedAt,
      user: toAuthUser(row, await this.findRoles(row.id))
    };
  }

  async revokeSession(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt })
      .where(eq(authSessions.tokenHash, tokenHash));
  }

  async touchSession(sessionId: string, lastSeenAt: Date): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ lastSeenAt })
      .where(eq(authSessions.id, sessionId));
  }

  async updateProfile(userId: string, input: UpdateAuthProfileInput): Promise<AuthUser> {
    const [user] = await this.db
      .update(users)
      .set({
        displayName: input.displayName,
        phone: input.phone,
        avatarColor: input.avatarColor,
        updatedAt: new Date()
      })
      .where(and(eq(users.id, userId), eq(users.status, "active")))
      .returning({
        id: users.id,
        displayName: users.displayName,
        phone: users.phone,
        avatarColor: users.avatarColor,
        preferredLocale: users.preferredLocale,
        status: users.status
      });

    if (!user) {
      throw new Error("profile_user_not_active");
    }

    const [emailAccount] = await this.db
      .select({ email: authAccounts.identifier })
      .from(authAccounts)
      .where(and(
        eq(authAccounts.userId, userId),
        eq(authAccounts.provider, "email_password")
      ))
      .limit(1);

    return toAuthUser(
      { ...user, email: emailAccount?.email ?? null },
      await this.findRoles(userId)
    );
  }

}
