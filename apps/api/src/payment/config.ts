export interface PaymentProviderConfig {
  hesabpayEnvironment: "sandbox" | "production";
  hesabpayApiKey: string | null;
  hesabpayBaseUrl: string;
  publicBaseUrl: string | null;
  requestTimeoutMs: number;
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parsePaymentProviderConfig(
  env: NodeJS.ProcessEnv = process.env
): PaymentProviderConfig {
  const environment =
    env.HESABPAY_ENVIRONMENT === "production" ? "production" : "sandbox";
  const defaultBaseUrl =
    environment === "production"
      ? "https://api.hesab.com"
      : "https://api-sandbox.hesab.com";
  const baseUrl = clean(env.HESABPAY_API_BASE_URL) ?? defaultBaseUrl;
  const publicBaseUrl = clean(env.PAYMENT_PUBLIC_BASE_URL);
  const timeout = Number(env.PAYMENT_PROVIDER_TIMEOUT_MS ?? 12000);

  return {
    hesabpayEnvironment: environment,
    hesabpayApiKey: clean(env.HESABPAY_API_KEY),
    hesabpayBaseUrl: baseUrl.replace(/\/$/, ""),
    publicBaseUrl: publicBaseUrl?.replace(/\/$/, "") ?? null,
    requestTimeoutMs:
      Number.isFinite(timeout) && timeout >= 1000 && timeout <= 60000
        ? timeout
        : 12000
  };
}
