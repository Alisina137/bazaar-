interface ErrorLike {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
}

function asErrorLike(value: unknown): ErrorLike | null {
  return value !== null && typeof value === "object" ? (value as ErrorLike) : null;
}

function findCode(error: unknown): string | undefined {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = asErrorLike(current);
    if (!candidate) return undefined;

    if (typeof candidate.code === "string") {
      return candidate.code;
    }

    current = candidate.cause;
  }

  return undefined;
}

function findMessage(error: unknown): string {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = asErrorLike(current);
    if (!candidate) break;

    if (typeof candidate.message === "string" && candidate.message.length > 0) {
      return candidate.message;
    }

    current = candidate.cause;
  }

  return "Unknown database error";
}

export function describeDatabaseRuntimeError(error: unknown): string {
  const code = findCode(error);
  const message = findMessage(error);
  const normalized = message.toLowerCase();

  if (
    code === "ECONNREFUSED" ||
    normalized.includes("econnrefused") ||
    normalized.includes("connection refused")
  ) {
    return [
      "Cannot connect to PostgreSQL.",
      "If DATABASE_URL points to localhost, start the BazaarLink development database with pnpm db:up, then run the command again.",
      "If you use a hosted PostgreSQL database, verify DATABASE_URL and network access."
    ].join(" ");
  }

  if (code === "28P01" || normalized.includes("password authentication failed")) {
    return "PostgreSQL rejected the configured credentials. Verify the username and password in DATABASE_URL.";
  }

  if (
    code === "3D000" ||
    (normalized.includes("database") && normalized.includes("does not exist"))
  ) {
    return "The configured PostgreSQL database does not exist. For local development run pnpm db:up; for a hosted database create or select the database referenced by DATABASE_URL.";
  }

  if (code === "ENOTFOUND" || normalized.includes("getaddrinfo")) {
    return "The PostgreSQL host could not be resolved. Verify the hostname in DATABASE_URL and your network connection.";
  }

  if (
    normalized.includes("ssl") &&
    (normalized.includes("required") || normalized.includes("certificate"))
  ) {
    return "The PostgreSQL connection has an SSL configuration problem. Use the connection string supplied by your database provider and preserve its SSL parameters.";
  }

  return "Database operation failed: " + message;
}
