import { afterEach, describe, expect, it, vi } from "vitest";

import type { PaymentProviderConfig } from "./config.js";
import { HesabPayGateway } from "./provider.js";

function config(): PaymentProviderConfig {
  return {
    hesabpayEnvironment: "sandbox",
    hesabpayApiKey: "sandbox-key",
    hesabpayBaseUrl: "https://api-sandbox.hesab.com",
    publicBaseUrl: "https://api.example.test",
    requestTimeoutMs: 5000
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HesabPayGateway", () => {
  it("creates hosted checkout from the backend with API-key authentication", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            url: "https://checkout.hesab.com/checkout/session-123"
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      );

    const gateway = new HesabPayGateway(config());
    const result = await gateway.createSession({
      attemptId: "11111111-1111-4111-8111-111111111111",
      method: "card",
      items: [
        {
          id: "item-1",
          name: "Product",
          price: 1200
        }
      ]
    });

    expect(result).toEqual({
      url: "https://checkout.hesab.com/checkout/session-123",
      sessionId: "session-123"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api-sandbox.hesab.com/api/v1/payment/create-session"
    );

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({
      authorization: "API-KEY sandbox-key",
      "content-type": "application/json"
    });

    const body = JSON.parse(String(init?.body)) as {
      user_id: string;
      items: Array<{ id: string; name: string; price: number }>;
      redirect_success_url: string;
      redirect_failure_url: string;
    };
    expect(body.user_id).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(body.items).toEqual([
      { id: "item-1", name: "Product", price: 1200 }
    ]);
    expect(body.redirect_success_url).toContain(
      "/payments/hesabpay/return?result=success"
    );
  });

  it("verifies webhook signatures through the documented server endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const gateway = new HesabPayGateway(config());

    await expect(
      gateway.verifyWebhook("received-signature", "1707719607")
    ).resolves.toBe(true);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api-sandbox.hesab.com/api/v1/hesab/webhooks/verify-signature"
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      signature: "received-signature",
      timestamp: "1707719607"
    });
  });

  it("stays unavailable when the server API key is not configured", () => {
    const gateway = new HesabPayGateway({
      ...config(),
      hesabpayApiKey: null
    });

    expect(gateway.ready).toBe(false);
  });

  it("rejects gateway declines without leaking provider internals", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({error:"sensitive provider detail"}),{status:402}));
    await expect(new HesabPayGateway(config()).createSession({
      attemptId:"11111111-1111-4111-8111-111111111111",
      method:"hesabpay",
      items:[{id:"item",name:"Phone",price:100}]
    })).rejects.toMatchObject({code:"provider_rejected",statusCode:502});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects network failures and timed-out provider requests", async () => {
    vi.spyOn(globalThis,"fetch").mockRejectedValue(new DOMException("Aborted", "AbortError"));
    await expect(new HesabPayGateway(config()).createSession({
      attemptId:"11111111-1111-4111-8111-111111111111",
      method:"hesabpay",
      items:[{id:"item",name:"Phone",price:100}]
    })).rejects.toMatchObject({code:"provider_unavailable",statusCode:503});
  });

  it("never exposes an insecure HTTP checkout redirect to the buyer", async () => {
    vi.spyOn(globalThis,"fetch").mockResolvedValue(
      new Response(JSON.stringify({url:"http://fake-checkout.example.test"}),{status:200})
    );
    await expect(new HesabPayGateway(config()).createSession({
      attemptId:"11111111-1111-4111-8111-111111111111",
      method:"card",
      items:[{id:"item",name:"Phone",price:100}]
    })).rejects.toMatchObject({code:"provider_rejected",statusCode:502});
  });

});
