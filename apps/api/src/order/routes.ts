import type {
  AuthSessionResponse,
  OrderErrorCode,
  OrderErrorResponse
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
import { OrderError } from "./errors.js";
import type { OrderServiceContract } from "./service.js";

const uuidSchema = z.string().uuid();
const orderParams = z.object({ orderId: uuidSchema });
const storeParams = z.object({ storeId: uuidSchema });
const merchantOrderParams = z.object({
  storeId: uuidSchema,
  orderId: uuidSchema
});

const placeOrderSchema = z
  .object({
    checkoutSessionId: uuidSchema,
    idempotencyKey: z.string().trim().min(8).max(80)
  })
  .strict();

const cancelSchema = z
  .object({
    reason: z.string().trim().min(2).max(1000)
  })
  .strict();

const merchantActionSchema = z
  .object({
    action: z.enum([
      "confirm",
      "reject",
      "start_preparing",
      "mark_ready",
      "dispatch",
      "deliver",
      "mark_picked_up",
      "mark_delivery_failed",
      "cancel",
      "request_refund"
    ]),
    reason: z.string().trim().max(1000).nullable().optional()
  })
  .strict();

function errorBody(code: OrderErrorCode): OrderErrorResponse {
  return { error: { code } };
}

async function authenticate(
  request: FastifyRequest,
  authService: AuthServiceContract
): Promise<AuthSessionResponse> {
  const token = getBearerToken(request);
  if (!token) throw new OrderError("invalid_session", 401);

  try {
    return await authService.authenticateToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new OrderError(error.code, error.statusCode);
    }
    throw error;
  }
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof OrderError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }
  throw error;
}

export function registerOrderRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  service: OrderServiceContract
) {
  app.post(
    "/customer/orders/place",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 hour" }
      }
    },
    async (request, reply) => {
      const input = placeOrderSchema.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.placeOrder(session.user.id, input.data)
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/customer/orders", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      return await service.listCustomerOrders(session.user.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/customer/orders/:orderId", async (request, reply) => {
    const params = orderParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return await service.getCustomerOrder(
        session.user.id,
        params.data.orderId
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post(
    "/customer/orders/:orderId/cancel",
    async (request, reply) => {
      const params = orderParams.safeParse(request.params);
      const input = cancelSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.cancelCustomerOrder(
          session.user.id,
          params.data.orderId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/orders",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.listMerchantOrders(
          session.user.id,
          params.data.storeId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/orders/:orderId",
    async (request, reply) => {
      const params = merchantOrderParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.getMerchantOrder(
          session.user.id,
          params.data.storeId,
          params.data.orderId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/orders/:orderId/action",
    async (request, reply) => {
      const params = merchantOrderParams.safeParse(request.params);
      const input = merchantActionSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.merchantAction(
          session.user.id,
          params.data.storeId,
          params.data.orderId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );
}
