/**
 * Fail closed when production configuration is incomplete. Deliberately avoid
 * logging URL strings, credentials, provider keys or env contents.
 */
export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return;
  const failures: string[] = [];
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    failures.push("DATABASE_URL must be a PostgreSQL connection URL");
  }
  const publicUrl = env.API_PUBLIC_BASE_URL?.trim();
  if (!publicUrl || !/^https:\/\//i.test(publicUrl)) {
    failures.push("API_PUBLIC_BASE_URL must use HTTPS");
  }
  // Live merchant payments are opt-in. COD/pickup can work without a key.
  if (env.HESABPAY_API_KEY) {
    if (env.HESABPAY_ENVIRONMENT !== "production") {
      failures.push("HESABPAY_ENVIRONMENT must be production when the payment key is present");
    }
    if (!env.PAYMENT_PUBLIC_BASE_URL || !/^https:\/\//i.test(env.PAYMENT_PUBLIC_BASE_URL)) {
      failures.push("PAYMENT_PUBLIC_BASE_URL must use HTTPS with a payment key");
    }
    if (env.HESABPAY_API_BASE_URL && !/^https:\/\//i.test(env.HESABPAY_API_BASE_URL)) {
      failures.push("HESABPAY_API_BASE_URL must use HTTPS with a payment key");
    }
  }
  if (failures.length) {
    throw new Error("Invalid production configuration: " + failures.join("; "));
  }
}
