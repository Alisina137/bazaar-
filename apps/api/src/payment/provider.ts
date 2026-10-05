import type { PaymentMethod } from "@bazaarlink/contracts";

import type { PaymentProviderConfig } from "./config.js";
import { PaymentError } from "./errors.js";

export interface HostedPaymentItem {
  id: string;
  name: string;
  price: number;
}

export interface HostedPaymentSessionInput {
  attemptId: string;
  method: Extract<PaymentMethod, "hesabpay" | "card">;
  items: HostedPaymentItem[];
}

export interface HostedPaymentSession {
  url: string;
  sessionId: string | null;
}

export interface PaymentGateway {
  readonly ready: boolean;
  createSession(
    input: HostedPaymentSessionInput
  ): Promise<HostedPaymentSession>;
  verifyWebhook(signature: string, timestamp: string): Promise<boolean>;
}

function sessionIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.pathname.split("/").filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

export class HesabPayGateway implements PaymentGateway {
  constructor(private readonly config: PaymentProviderConfig) {}

  get ready(): boolean {
    return Boolean(this.config.hesabpayApiKey);
  }

  private async postJson(
    path: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!this.config.hesabpayApiKey) {
      throw new PaymentError("provider_unavailable", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs
    );

    try {
      const response = await fetch(this.config.hesabpayBaseUrl + path, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: "API-KEY " + this.config.hesabpayApiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });

      let payload: Record<string, unknown> = {};
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        // Provider returned a non-JSON error body.
      }

      if (!response.ok) {
        throw new PaymentError(
          response.status === 401
            ? "provider_unavailable"
            : "provider_rejected",
          502
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError("provider_unavailable", 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  async createSession(
    input: HostedPaymentSessionInput
  ): Promise<HostedPaymentSession> {
    const body: Record<string, unknown> = {
      user_id: input.attemptId,
      items: input.items.map((item) => ({
        id: item.id.slice(0, 50),
        name: item.name.slice(0, 500),
        price: item.price
      }))
    };

    if (this.config.publicBaseUrl) {
      body.redirect_success_url =
        this.config.publicBaseUrl +
        "/payments/hesabpay/return?result=success";
      body.redirect_failure_url =
        this.config.publicBaseUrl +
        "/payments/hesabpay/return?result=failure";
    }

    const payload = await this.postJson(
      "/api/v1/payment/create-session",
      body
    );
    const url =
      typeof payload.url === "string"
        ? payload.url
        : typeof payload.payment_url === "string"
          ? payload.payment_url
          : null;

    if (!url || !/^https:\/\//i.test(url)) {
      throw new PaymentError("provider_rejected", 502);
    }

    return {
      url,
      sessionId:
        typeof payload.session_id === "string"
          ? payload.session_id
          : sessionIdFromUrl(url)
    };
  }

  async verifyWebhook(
    signature: string,
    timestamp: string
  ): Promise<boolean> {
    const payload = await this.postJson(
      "/api/v1/hesab/webhooks/verify-signature",
      { signature, timestamp }
    );

    return payload.success === true;
  }
}
