import type {
  AuthSessionResponse,
  GrowthErrorCode,
  GrowthErrorResponse,
  MerchantStaffPermission
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
import { GrowthError } from "./errors.js";
import type { GrowthServiceContract } from "./service.js";

const uuid = z.string().uuid();
const storeParams = z.object({ storeId: uuid });
const couponParams = z.object({ storeId: uuid, couponId: uuid });
const promotionParams = z.object({
  storeId: uuid,
  promotionId: uuid
});
const staffParams = z.object({ storeId: uuid, staffId: uuid });
const inviteParams = z.object({ storeId: uuid, inviteId: uuid });

const permissionSchema = z.enum([
  "products",
  "inventory",
  "orders",
  "customers",
  "discounts",
  "analytics",
  "delivery",
  "storefront"
]);

const couponBase = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive().max(999_999_999),
  minimumOrderAmount: z.number().min(0).max(999_999_999).nullable().optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional()
});

const createCoupon = couponBase.strict();
const updateCoupon = couponBase
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const promotionBase = z.object({
  name: z.string().trim().min(1).max(160),
  promotionalPrice: z.number().min(0).max(999_999_999),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  active: z.boolean().optional()
});

const createPromotion = promotionBase
  .extend({ productId: uuid })
  .strict();

const updatePromotion = promotionBase
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const staffInvite = z
  .object({
    email: z.string().trim().email().max(320),
    permissions: z.array(permissionSchema).min(1).max(8)
  })
  .strict()
  .refine(
    (value) => new Set(value.permissions).size === value.permissions.length
  );

const staffUpdate = z
  .object({
    permissions: z.array(permissionSchema).min(1).max(8).optional(),
    status: z.enum(["active", "suspended"]).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const acceptInvite = z
  .object({
    inviteCode: z.string().trim().min(20).max(200)
  })
  .strict();

const changeSubscription = z
  .object({
    plan: z.enum(["starter", "pro", "business"]),
    keepProductIds: z.array(uuid).max(1200).optional(),
    keepCategoryIds: z.array(uuid).max(1000).optional(),
    keepStaffIds: z.array(uuid).max(10).optional()
  })
  .strict();

const analyticsQuery = z
  .object({
    days: z.coerce.number().int().min(1).max(365).default(30)
  })
  .strict();

function errorBody(code: GrowthErrorCode): GrowthErrorResponse {
  return { error: { code } };
}

async function authenticate(
  request: FastifyRequest,
  authService: AuthServiceContract
): Promise<AuthSessionResponse> {
  const token = getBearerToken(request);
  if (!token) throw new GrowthError("invalid_session", 401);

  try {
    return await authService.authenticateToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      const code: GrowthErrorCode =
        error.code === "invalid_session" ||
        error.code === "account_unavailable" ||
        error.code === "forbidden" ||
        error.code === "rate_limited"
          ? error.code
          : "service_unavailable";
      throw new GrowthError(code, error.statusCode);
    }
    throw error;
  }
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof GrowthError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }
  throw error;
}

export function registerGrowthRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  service: GrowthServiceContract
) {
  app.get(
    "/seller/stores/:storeId/access",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.resolveAccess(
          session.user.id,
          params.data.storeId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/dashboard",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.dashboard(
          session.user.id,
          params.data.storeId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/analytics",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const query = analyticsQuery.safeParse(request.query);
      if (!params.success || !query.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.analytics(
          session.user.id,
          params.data.storeId,
          query.data.days
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/coupons",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return {
          coupons: await service.listCoupons(
            session.user.id,
            params.data.storeId
          )
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/coupons",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 hour" } }
    },
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = createCoupon.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createCoupon(
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
    "/seller/stores/:storeId/coupons/:couponId",
    async (request, reply) => {
      const params = couponParams.safeParse(request.params);
      const input = updateCoupon.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.updateCoupon(
          session.user.id,
          params.data.storeId,
          params.data.couponId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/coupons/:couponId",
    async (request, reply) => {
      const params = couponParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        await service.deleteCoupon(
          session.user.id,
          params.data.storeId,
          params.data.couponId
        );
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/promotions",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return {
          promotions: await service.listPromotions(
            session.user.id,
            params.data.storeId
          )
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/promotions",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = createPromotion.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createPromotion(
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
    "/seller/stores/:storeId/promotions/:promotionId",
    async (request, reply) => {
      const params = promotionParams.safeParse(request.params);
      const input = updatePromotion.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.updatePromotion(
          session.user.id,
          params.data.storeId,
          params.data.promotionId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/promotions/:promotionId",
    async (request, reply) => {
      const params = promotionParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        await service.deletePromotion(
          session.user.id,
          params.data.storeId,
          params.data.promotionId
        );
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/staff",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.listStaff(
          session.user.id,
          params.data.storeId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/staff/invites",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = staffInvite.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return reply.code(201).send(
          await service.createStaffInvite(
            session.user.id,
            params.data.storeId,
            input.data.email,
            input.data.permissions as MerchantStaffPermission[]
          )
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/staff/invites/:inviteId/revoke",
    async (request, reply) => {
      const params = inviteParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        await service.revokeStaffInvite(
          session.user.id,
          params.data.storeId,
          params.data.inviteId
        );
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/staff-invites/accept",
    async (request, reply) => {
      const input = acceptInvite.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.acceptStaffInvite(
          session.user.id,
          input.data.inviteCode
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.patch(
    "/seller/stores/:storeId/staff/:staffId",
    async (request, reply) => {
      const params = staffParams.safeParse(request.params);
      const input = staffUpdate.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.updateStaff(
          session.user.id,
          params.data.storeId,
          params.data.staffId,
          input.data as {
            permissions?: MerchantStaffPermission[];
            status?: "active" | "suspended";
          }
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/staff/:staffId",
    async (request, reply) => {
      const params = staffParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        await service.removeStaff(
          session.user.id,
          params.data.storeId,
          params.data.staffId
        );
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/subscription/change",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      const input = changeSubscription.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.changeSubscription(
          session.user.id,
          params.data.storeId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );
}
