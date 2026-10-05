import type {
  AuthSessionResponse,
  CartPricingErrorCode,
  CartPricingErrorResponse
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
import { CartPricingError } from "./errors.js";
import type { CartPricingServiceContract } from "./service.js";

const uuidSchema = z.string().uuid();
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^\+?[0-9 ()-]+$/);

const optionalTrimmed = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const addressBaseSchema = z
  .object({
    label: optionalTrimmed(80),
    recipientName: z.string().trim().min(1).max(160),
    country: z.string().trim().min(1).max(100).optional(),
    province: z.string().trim().min(1).max(100),
    districtCity: z.string().trim().min(1).max(120),
    areaNeighborhood: optionalTrimmed(160),
    addressDescription: z.string().trim().min(1).max(2000),
    nearestLandmark: optionalTrimmed(240),
    phone: phoneSchema,
    mapLatitude: z.number().min(-90).max(90).nullable().optional(),
    mapLongitude: z.number().min(-180).max(180).nullable().optional(),
    deliveryInstructions: optionalTrimmed(2000),
    isDefault: z.boolean().optional()
  })
  .strict()
  .refine(
    (value) =>
      (value.mapLatitude == null && value.mapLongitude == null) ||
      (value.mapLatitude != null && value.mapLongitude != null),
    { message: "map_pin_pair_required" }
  );

const addressUpdateSchema = z
  .object({
    label: optionalTrimmed(80),
    recipientName: z.string().trim().min(1).max(160).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    province: z.string().trim().min(1).max(100).optional(),
    districtCity: z.string().trim().min(1).max(120).optional(),
    areaNeighborhood: optionalTrimmed(160),
    addressDescription: z.string().trim().min(1).max(2000).optional(),
    nearestLandmark: optionalTrimmed(240),
    phone: phoneSchema.optional(),
    mapLatitude: z.number().min(-90).max(90).nullable().optional(),
    mapLongitude: z.number().min(-180).max(180).nullable().optional(),
    deliveryInstructions: optionalTrimmed(2000),
    isDefault: z.boolean().optional()
  })
  .strict()
  .refine(
    (value) =>
      !(
        (value.mapLatitude === null && typeof value.mapLongitude === "number") ||
        (value.mapLongitude === null && typeof value.mapLatitude === "number")
      ),
    { message: "map_pin_pair_required" }
  );

const addItemSchema = z
  .object({
    productId: uuidSchema,
    variantId: uuidSchema.nullable().optional(),
    quantity: z.number().int().min(1).max(100000)
  })
  .strict();

const updateItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(100000)
  })
  .strict();

const couponSchema = z
  .object({
    code: z.string().trim().min(1).max(64)
  })
  .strict();

const checkoutQuoteSchema = z
  .object({
    addressId: uuidSchema
  })
  .strict();

const itemParamsSchema = z.object({ itemId: uuidSchema });
const addressParamsSchema = z.object({ addressId: uuidSchema });
const storeParamsSchema = z.object({ storeId: uuidSchema });
const sessionParamsSchema = z.object({ sessionId: uuidSchema });

function errorBody(
  code: CartPricingErrorCode
): CartPricingErrorResponse {
  return {
    error: {
      code
    }
  };
}

function authErrorCode(error: AuthError): CartPricingErrorCode {
  switch (error.code) {
    case "invalid_session":
      return "invalid_session";
    case "account_unavailable":
      return "account_unavailable";
    case "forbidden":
      return "forbidden";
    case "rate_limited":
      return "rate_limited";
    default:
      return "service_unavailable";
  }
}

async function authenticate(
  request: FastifyRequest,
  authService: AuthServiceContract
): Promise<AuthSessionResponse> {
  const token = getBearerToken(request);

  if (!token) {
    throw new CartPricingError("invalid_session", 401);
  }

  try {
    return await authService.authenticateToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new CartPricingError(
        authErrorCode(error),
        error.statusCode
      );
    }

    throw error;
  }
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof CartPricingError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }

  reply.log.error({ err: error }, "Unexpected cart/pricing request failure");
  return reply.code(503).send(errorBody("service_unavailable"));
}

export function registerCartPricingRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  service: CartPricingServiceContract
) {
  app.get("/customer/cart", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      return await service.getCart(session.user.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/customer/cart/items", async (request, reply) => {
    const input = addItemSchema.safeParse(request.body);

    if (!input.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return reply.code(201).send(
        await service.addItem(session.user.id, input.data)
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/customer/cart/items/:itemId", async (request, reply) => {
    const params = itemParamsSchema.safeParse(request.params);
    const input = updateItemSchema.safeParse(request.body);

    if (!params.success || !input.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return await service.updateItem(
        session.user.id,
        params.data.itemId,
        input.data
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/customer/cart/items/:itemId", async (request, reply) => {
    const params = itemParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return await service.removeItem(
        session.user.id,
        params.data.itemId
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.put("/customer/cart/coupons/:storeId", async (request, reply) => {
    const params = storeParamsSchema.safeParse(request.params);
    const input = couponSchema.safeParse(request.body);

    if (!params.success || !input.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return await service.applyCoupon(session.user.id, {
        storeId: params.data.storeId,
        code: input.data.code
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete(
    "/customer/cart/coupons/:storeId",
    async (request, reply) => {
      const params = storeParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.removeCoupon(
          session.user.id,
          params.data.storeId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/customer/addresses", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      return await service.listAddresses(session.user.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/customer/addresses", async (request, reply) => {
    const input = addressBaseSchema.safeParse(request.body);

    if (!input.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return reply.code(201).send(
        await service.createAddress(session.user.id, input.data)
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch(
    "/customer/addresses/:addressId",
    async (request, reply) => {
      const params = addressParamsSchema.safeParse(request.params);
      const input = addressUpdateSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.updateAddress(
          session.user.id,
          params.data.addressId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete(
    "/customer/addresses/:addressId",
    async (request, reply) => {
      const params = addressParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        await service.deleteAddress(
          session.user.id,
          params.data.addressId
        );
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/customer/checkout/quote",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const input = checkoutQuoteSchema.safeParse(request.body);

      if (!input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.quoteCheckout(session.user.id, input.data)
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/customer/checkout/:sessionId",
    async (request, reply) => {
      const params = sessionParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.getCheckoutQuote(
          session.user.id,
          params.data.sessionId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );
}
