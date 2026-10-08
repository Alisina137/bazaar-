import type {
  AuthSessionResponse,
  StoreErrorCode,
  StoreErrorResponse
} from "@bazaarlink/contracts";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";
import { z } from "zod";

import {
  getBearerToken
} from "../auth/authorization.js";
import { AuthError } from "../auth/errors.js";
import type { AuthServiceContract } from "../auth/service.js";
import { StoreError } from "./errors.js";
import type { StoreServiceContract } from "./service.js";
import type { GrowthServiceContract } from "../growth/service.js";
import { GrowthError } from "../growth/errors.js";

const localeSchema = z.enum(["fa-AF", "ps-AF", "en"]);
const themeSchema = z.enum([
  "minimal",
  "modern",
  "fashion",
  "electronics",
  "food"
]);

const handleSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$|^[A-Za-z0-9]{3}$/);

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^\+?[0-9 ()-]+$/);

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const createStoreSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    handle: handleSchema,
    category: z.string().trim().min(2).max(100),
    province: z.string().trim().min(2).max(100),
    cityDistrict: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    preferredLocale: localeSchema,
    logoUrl: z.string().trim().url().max(2048).nullable().optional(),
    coverImageUrl: z.string().trim().url().max(2048).nullable().optional(),
    description: optionalText(2000),
    whatsappNumber: phoneSchema.nullable().optional(),
    physicalAddress: optionalText(1000),
    mapLatitude: z.number().min(-90).max(90).nullable().optional(),
    mapLongitude: z.number().min(-180).max(180).nullable().optional(),
    businessHours: optionalText(1000),
    featuredCategoryIds: z.array(z.string().uuid()).max(30).optional(),
    featuredProductIds: z.array(z.string().uuid()).max(30).optional(),
    customDomain: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)
      .max(255)
      .nullable()
      .optional(),
    theme: themeSchema.optional(),
    accentColor: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional()
  })
  .strict();

const updateStoreSchema = createStoreSchema.partial().strict();

const storeIdSchema = z.object({
  storeId: z.string().uuid()
});

const publicHandleSchema = z.object({
  handle: z.string().min(1).max(80)
});

function storeErrorBody(code: StoreErrorCode): StoreErrorResponse {
  return {
    error: {
      code
    }
  };
}

function authErrorToStoreCode(error: AuthError): StoreErrorCode {
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
    throw new StoreError("invalid_session", 401);
  }

  try {
    return await authService.authenticateToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new StoreError(
        authErrorToStoreCode(error),
        error.statusCode
      );
    }

    throw error;
  }
}

function sendStoreError(reply: FastifyReply, error: unknown) {
  if (error instanceof GrowthError) {
    return reply.code(error.statusCode).send({
      error: { code: error.code }
    });
  }

  if (error instanceof StoreError) {
    return reply.code(error.statusCode).send(storeErrorBody(error.code));
  }

  return reply.code(503).send(storeErrorBody("service_unavailable"));
}

export function registerStoreRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  storeService: StoreServiceContract,
  growthService?: GrowthServiceContract
) {
  app.get("/seller/plans", async (request, reply) => {
    try {
      await authenticate(request, authService);
      return storeService.getPlans();
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.get("/seller/stores", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      const own = await storeService.listOwnedStores(session.user.id);
      if (!growthService) return own;

      const assigned = await growthService.assignedAccesses(session.user.id);
      const staffStores = await Promise.all(
        assigned.map((access) =>
          storeService.getOwnedStore(access.ownerUserId, access.storeId)
        )
      );
      const byId = new Map(
        [...own.stores, ...staffStores].map((store) => [store.id, store])
      );
      return { stores: [...byId.values()] };
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.post(
    "/seller/stores",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const parsed = createStoreSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send(storeErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        const store = await storeService.createStore(
          session.user.id,
          parsed.data
        );

        return reply.code(201).send(store);
      } catch (error) {
        return sendStoreError(reply, error);
      }
    }
  );

  app.get("/seller/stores/:storeId", async (request, reply) => {
    const params = storeIdSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send(storeErrorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      const actor = growthService
        ? await growthService.resolveAccess(
            session.user.id,
            params.data.storeId
          )
        : { ownerUserId: session.user.id };
      return await storeService.getOwnedStore(
        actor.ownerUserId,
        params.data.storeId
      );
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.patch("/seller/stores/:storeId", async (request, reply) => {
    const params = storeIdSchema.safeParse(request.params);
    const input = updateStoreSchema.safeParse(request.body);

    if (!params.success || !input.success || Object.keys(input.data).length === 0) {
      return reply.code(400).send(storeErrorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      const actor = growthService
        ? await growthService.resolveAccess(
            session.user.id,
            params.data.storeId,
            "storefront"
          )
        : { ownerUserId: session.user.id };
      return await storeService.updateStore(
        actor.ownerUserId,
        params.data.storeId,
        input.data
      );
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.post("/seller/stores/:storeId/publish", async (request, reply) => {
    const params = storeIdSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send(storeErrorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      const actor = growthService
        ? await growthService.resolveAccess(
            session.user.id,
            params.data.storeId,
            "storefront"
          )
        : { ownerUserId: session.user.id };
      return await storeService.publishStore(
        actor.ownerUserId,
        params.data.storeId
      );
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.get("/stores/:handle", async (request, reply) => {
    const params = publicHandleSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send(storeErrorBody("invalid_request"));
    }

    try {
      return await storeService.getPublicStore(params.data.handle);
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });
}
