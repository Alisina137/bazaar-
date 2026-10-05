import type {
  AuthSessionResponse,
  PaymentErrorCode,
  PaymentErrorResponse
} from "@bazaarlink/contracts";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";
import { z } from "zod";

import { getBearerToken } from "../auth/authorization.js";
import { AuthError } from "../auth/errors.js";
import type { AuthServiceContract } from "../auth/service.js";
import { PaymentError } from "./errors.js";
import type { PaymentServiceContract } from "./service.js";

const uuidSchema = z.string().uuid();
const storeParams = z.object({ storeId: uuidSchema });
const attemptParams = z.object({
  storeId: uuidSchema,
  attemptId: uuidSchema
});
const customerAttemptParams = z.object({ attemptId: uuidSchema });
const checkoutParams = z.object({ sessionId: uuidSchema });
const settingsSchema = z
  .object({
    cashOnDeliveryEnabled: z.boolean().optional(),
    hesabpayEnabled: z.boolean().optional(),
    cardEnabled: z.boolean().optional(),
    payAtStoreEnabled: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const createAttemptsSchema = z
  .object({
    checkoutSessionId: uuidSchema,
    idempotencyKey: z.string().trim().min(8).max(80),
    selections: z
      .array(
        z.object({
          storeId: uuidSchema,
          method: z.enum([
            "cash_on_delivery",
            "hesabpay",
            "card",
            "pay_at_store"
          ])
        })
      )
      .min(1)
      .max(50)
  })
  .strict();

const refundSchema = z
  .object({
    amount: z.number().positive().max(999_999_999).optional()
  })
  .strict();

const webhookSchema = z
  .object({
    signature: z.string().min(1),
    timestamp: z.union([z.string().min(1), z.number()]),
    user_id: z.string().uuid(),
    amount: z.union([z.number(), z.string()]),
    transaction_id: z.string().optional(),
    sender_account: z.string().optional(),
    event: z.string().optional(),
    type: z.string().optional(),
    success: z.boolean().optional(),
    message: z.string().optional()
  })
  .passthrough();

function errorBody(code: PaymentErrorCode): PaymentErrorResponse {
  return { error: { code } };
}

async function authenticate(
  request: FastifyRequest,
  authService: AuthServiceContract
): Promise<AuthSessionResponse> {
  const token = getBearerToken(request);
  if (!token) throw new PaymentError("invalid_session", 401);

  try {
    return await authService.authenticateToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      const code =
        error.code === "invalid_session" ||
        error.code === "account_unavailable" ||
        error.code === "forbidden" ||
        error.code === "rate_limited"
          ? error.code
          : "service_unavailable";
      throw new PaymentError(code, error.statusCode);
    }
    throw error;
  }
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof PaymentError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }
  throw error;
}

export function registerPaymentRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  service: PaymentServiceContract
) {
  app.get(
    "/seller/stores/:storeId/payments",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.getMerchantConfiguration(
          session.user.id,
          params.data.storeId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.put(
    "/seller/stores/:storeId/payments",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = settingsSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.updateMerchantSettings(
          session.user.id,
          params.data.storeId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/customer/payments/options/:sessionId",
    async (request, reply) => {
      const params = checkoutParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.options(
          session.user.id,
          params.data.sessionId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/customer/payments/attempts",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 hour" }
      }
    },
    async (request, reply) => {
      const input = createAttemptsSchema.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createAttempts(session.user.id, input.data)
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/customer/payments/status/:sessionId",
    async (request, reply) => {
      const params = checkoutParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.status(
          session.user.id,
          params.data.sessionId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/customer/payments/:attemptId/cancel",
    async (request, reply) => {
      const params = customerAttemptParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.cancel(
          session.user.id,
          params.data.attemptId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/payments/:attemptId/refund",
    async (request, reply) => {
      const params = attemptParams.safeParse(request.params);
      const input = refundSchema.safeParse(request.body ?? {});
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.requestRefund(
          session.user.id,
          params.data.storeId,
          params.data.attemptId,
          input.data.amount
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/webhooks/hesabpay",
    {
      config: {
        rateLimit: { max: 300, timeWindow: "1 minute" }
      }
    },
    async (request, reply) => {
      const input = webhookSchema.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const attempt = await service.processHesabPayWebhook(input.data);
        return {
          received: true,
          attemptId: attempt.id,
          state: attempt.state
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/payments/hesabpay/return", async (request) => {
    const query = request.query as { result?: unknown };
    const result =
      typeof query?.result === "string" ? query.result : "unknown";

    return {
      provider: "hesabpay",
      result,
      authoritative: false,
      message:
        "Return to BazaarLink and refresh payment status. Only the verified provider webhook can confirm payment."
    };
  });
}
