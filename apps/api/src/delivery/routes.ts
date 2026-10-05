import type {
  AuthSessionResponse,
  DeliveryErrorCode,
  DeliveryErrorResponse
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
import { DeliveryError } from "./errors.js";
import type { DeliveryServiceContract } from "./service.js";

const uuidSchema = z.string().uuid();
const moneySchema = z.number().min(0).max(999_999_999);
const distanceSchema = z.number().min(0).max(100_000);
const weekdaySchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine((days) => new Set(days).size === days.length);
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const settingsSchema = z
  .object({
    deliveryEnabled: z.boolean().optional(),
    pickupEnabled: z.boolean().optional(),
    originAddress: z.string().trim().max(2000).nullable().optional(),
    originProvince: z.string().trim().max(100).nullable().optional(),
    originDistrict: z.string().trim().max(120).nullable().optional(),
    originArea: z.string().trim().max(160).nullable().optional(),
    originLatitude: z.number().min(-90).max(90).nullable().optional(),
    originLongitude: z.number().min(-180).max(180).nullable().optional(),
    defaultDeliveryFee: moneySchema.nullable().optional(),
    freeDeliveryThreshold: moneySchema.nullable().optional(),
    minimumOrderAmount: moneySchema.nullable().optional(),
    operatingWeekdays: weekdaySchema.optional(),
    cutoffTime: timeSchema.nullable().optional(),
    pickupMinMinutes: z.number().int().min(0).max(100_800).optional(),
    pickupMaxMinutes: z.number().int().min(0).max(100_800).optional()
  })
  .strict();

const zoneShape = {
  name: z.string().trim().min(1).max(160),
  province: z.string().trim().max(100).nullable().optional(),
  districtCity: z.string().trim().max(120).nullable().optional(),
  areaNeighborhood: z.string().trim().max(160).nullable().optional(),
  fee: moneySchema,
  priority: z.number().int().min(-100_000).max(100_000).optional(),
  active: z.boolean().optional()
};

const zoneCreateSchema = z
  .object(zoneShape)
  .strict()
  .refine(
    (value) =>
      Boolean(
        value.province?.trim() ||
          value.districtCity?.trim() ||
          value.areaNeighborhood?.trim()
      ),
    { message: "zone_matcher_required" }
  );

const zoneUpdateSchema = z
  .object(zoneShape)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const distanceRuleCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    type: z.enum(["tier", "base_per_km"]),
    minDistanceKm: distanceSchema.optional(),
    maxDistanceKm: distanceSchema.nullable().optional(),
    fee: moneySchema.nullable().optional(),
    baseFee: moneySchema.nullable().optional(),
    perKmFee: moneySchema.nullable().optional(),
    priority: z.number().int().min(-100_000).max(100_000).optional(),
    active: z.boolean().optional()
  })
  .strict();

const distanceRuleUpdateSchema = distanceRuleCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

const speedCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    kind: z.enum([
      "economy",
      "standard",
      "same_day",
      "express",
      "custom"
    ]),
    surchargeType: z.enum(["fixed", "multiplier"]).optional(),
    surchargeValue: z.number().min(0).max(999_999_999).optional(),
    minEtaMinutes: z.number().int().min(0).max(100_800),
    maxEtaMinutes: z.number().int().min(0).max(100_800),
    minimumOrderAmount: moneySchema.nullable().optional(),
    maxRangeKm: distanceSchema.nullable().optional(),
    cutoffTime: timeSchema.nullable().optional(),
    supportedWeekdays: weekdaySchema.optional(),
    maxWeightGrams: z.number().int().positive().max(100_000_000).nullable().optional(),
    sortOrder: z.number().int().min(-100_000).max(100_000).optional(),
    active: z.boolean().optional()
  })
  .strict();

const speedUpdateSchema = speedCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

const deliveryOptionsSchema = z
  .object({
    addressId: uuidSchema
  })
  .strict();

const deliveryCheckoutSchema = z
  .object({
    addressId: uuidSchema,
    selections: z
      .array(
        z
          .object({
            storeId: uuidSchema,
            optionId: z.string().trim().min(1).max(160)
          })
          .strict()
      )
      .min(1)
      .max(50)
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.selections.map((selection) => selection.storeId)).size ===
      value.selections.length,
    { message: "duplicate_store_selection" }
  );

const storeParams = z.object({ storeId: uuidSchema });
const zoneParams = z.object({
  storeId: uuidSchema,
  zoneId: uuidSchema
});
const ruleParams = z.object({
  storeId: uuidSchema,
  ruleId: uuidSchema
});
const speedParams = z.object({
  storeId: uuidSchema,
  speedId: uuidSchema
});
const sessionParams = z.object({ sessionId: uuidSchema });

function errorBody(code: DeliveryErrorCode): DeliveryErrorResponse {
  return { error: { code } };
}

function authErrorCode(error: AuthError): DeliveryErrorCode {
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
    throw new DeliveryError("invalid_session", 401);
  }

  try {
    return await authService.authenticateToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new DeliveryError(authErrorCode(error), error.statusCode);
    }
    throw error;
  }
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof DeliveryError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }

  reply.log.error({ err: error }, "Unexpected delivery request failure");
  return reply.code(503).send(errorBody("service_unavailable"));
}

export function registerDeliveryRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  service: DeliveryServiceContract
) {
  app.get("/seller/stores/:storeId/delivery", async (request, reply) => {
    const params = storeParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return await service.getConfiguration(
        session.user.id,
        params.data.storeId
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.put(
    "/seller/stores/:storeId/delivery/settings",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = settingsSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.updateSettings(
          session.user.id,
          params.data.storeId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/delivery/zones",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = zoneCreateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createZone(
            session.user.id,
            params.data.storeId,
            input.data
          )
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.patch(
    "/seller/stores/:storeId/delivery/zones/:zoneId",
    async (request, reply) => {
      const params = zoneParams.safeParse(request.params);
      const input = zoneUpdateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.updateZone(
          session.user.id,
          params.data.storeId,
          params.data.zoneId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/delivery/zones/:zoneId",
    async (request, reply) => {
      const params = zoneParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.deleteZone(
          session.user.id,
          params.data.storeId,
          params.data.zoneId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/delivery/distance-rules",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = distanceRuleCreateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createDistanceRule(
            session.user.id,
            params.data.storeId,
            input.data
          )
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.patch(
    "/seller/stores/:storeId/delivery/distance-rules/:ruleId",
    async (request, reply) => {
      const params = ruleParams.safeParse(request.params);
      const input = distanceRuleUpdateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.updateDistanceRule(
          session.user.id,
          params.data.storeId,
          params.data.ruleId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/delivery/distance-rules/:ruleId",
    async (request, reply) => {
      const params = ruleParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.deleteDistanceRule(
          session.user.id,
          params.data.storeId,
          params.data.ruleId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/delivery/speeds",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = speedCreateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createSpeed(
            session.user.id,
            params.data.storeId,
            input.data
          )
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.patch(
    "/seller/stores/:storeId/delivery/speeds/:speedId",
    async (request, reply) => {
      const params = speedParams.safeParse(request.params);
      const input = speedUpdateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.updateSpeed(
          session.user.id,
          params.data.storeId,
          params.data.speedId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/delivery/speeds/:speedId",
    async (request, reply) => {
      const params = speedParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await service.deleteSpeed(
          session.user.id,
          params.data.storeId,
          params.data.speedId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post("/customer/delivery/options", async (request, reply) => {
    const input = deliveryOptionsSchema.safeParse(request.body);
    if (!input.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return await service.options(
        session.user.id,
        input.data.addressId
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post(
    "/customer/delivery/checkout-quote",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const input = deliveryCheckoutSchema.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createCheckoutQuote(
            session.user.id,
            input.data
          )
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/customer/delivery/checkout-quote/:sessionId",
    async (request, reply) => {
      const params = sessionParams.safeParse(request.params);
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
