import type {
  AuthSessionResponse,
  TrustErrorCode,
  TrustErrorResponse
} from "@bazaarlink/contracts";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest
} from "fastify";
import { z } from "zod";

import {
  getBearerToken,
  requireAnyRole
} from "../auth/authorization.js";
import { AuthError } from "../auth/errors.js";
import type { AuthServiceContract } from "../auth/service.js";
import { TrustError } from "./errors.js";
import type { TrustServiceContract } from "./service.js";

const uuid = z.string().uuid();
const productParams = z.object({ productId: uuid });
const storeParams = z.object({ storeId: uuid });
const reviewParams = z.object({ reviewId: uuid });
const editorParams = z.object({ orderItemId: uuid });
const eligibilityQuery = z.object({ orderId: uuid.optional() }).strict();
const imageUrls = z
  .array(z.string().trim().url().max(2048))
  .max(5)
  .optional();

const createReviewSchema = z
  .object({
    orderItemId: uuid,
    rating: z.number().int().min(1).max(5),
    text: z.string().trim().max(4000).nullable().optional(),
    imageUrls
  })
  .strict();

const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    text: z.string().trim().max(4000).nullable().optional(),
    imageUrls
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const reportSchema = z
  .object({
    reason: z.enum([
      "spam",
      "abuse",
      "misleading",
      "inappropriate",
      "other"
    ]),
    details: z.string().trim().max(2000).nullable().optional()
  })
  .strict();

const moderateSchema = z
  .object({
    action: z.enum([
      "publish",
      "hide",
      "remove",
      "dismiss_reports"
    ]),
    reason: z.string().trim().max(2000).nullable().optional()
  })
  .strict();

function errorBody(code: TrustErrorCode): TrustErrorResponse {
  return { error: { code } };
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof TrustError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }
  throw error;
}

async function authenticate(
  request: FastifyRequest,
  authService: AuthServiceContract
): Promise<AuthSessionResponse> {
  const token = getBearerToken(request);
  if (!token) throw new TrustError("invalid_session", 401);
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
      throw new TrustError(code, error.statusCode);
    }
    throw error;
  }
}

export function registerPublicTrustRoutes(
  app: FastifyInstance,
  service: TrustServiceContract
) {
  app.get(
    "/trust/products/:productId/reviews",
    async (request, reply) => {
      const params = productParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        return await service.productReviews(params.data.productId);
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/trust/stores/:storeId", async (request, reply) => {
    const params = storeParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }
    try {
      return await service.sellerTrust(params.data.storeId);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

export function registerTrustRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  service: TrustServiceContract
) {
  app.get("/customer/reviews/eligibility", async (request, reply) => {
    const query = eligibilityQuery.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }
    try {
      const session = await authenticate(request, authService);
      return await service.eligibility(
        session.user.id,
        query.data.orderId
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get(
    "/customer/reviews/editor/:orderItemId",
    async (request, reply) => {
      const params = editorParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.editor(
          session.user.id,
          params.data.orderItemId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/customer/reviews",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 hour" }
      }
    },
    async (request, reply) => {
      const input = createReviewSchema.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return reply
          .code(201)
          .send(await service.createReview(session.user.id, input.data));
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.put(
    "/customer/reviews/:reviewId",
    async (request, reply) => {
      const params = reviewParams.safeParse(request.params);
      const input = updateReviewSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.updateReview(
          session.user.id,
          params.data.reviewId,
          input.data
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/customer/reviews/:reviewId/report",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 hour" }
      }
    },
    async (request, reply) => {
      const params = reviewParams.safeParse(request.params);
      const input = reportSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return reply
          .code(201)
          .send(
            await service.reportReview(
              session.user.id,
              params.data.reviewId,
              input.data
            )
          );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/reviews",
    async (request, reply) => {
      const params = storeParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return {
          reviews: await service.storeReviews(
            session.user.id,
            params.data.storeId
          )
        };
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/platform/review-reports", async (request, reply) => {
    try {
      const session = requireAnyRole(
        await authenticate(request, authService),
        ["platform_support", "platform_admin", "super_admin"]
      );
      void session;
      return await service.moderationQueue();
    } catch (error) {
      if (error instanceof AuthError) {
        return reply
          .code(error.statusCode)
          .send(errorBody(error.code === "forbidden" ? "forbidden" : "service_unavailable"));
      }
      return sendError(reply, error);
    }
  });

  app.post(
    "/platform/reviews/:reviewId/moderate",
    async (request, reply) => {
      const params = reviewParams.safeParse(request.params);
      const input = moderateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }
      try {
        const session = requireAnyRole(
          await authenticate(request, authService),
          ["platform_support", "platform_admin", "super_admin"]
        );
        return await service.moderateReview(
          session.user.id,
          params.data.reviewId,
          input.data
        );
      } catch (error) {
        if (error instanceof AuthError) {
          return reply
            .code(error.statusCode)
            .send(errorBody(error.code === "forbidden" ? "forbidden" : "service_unavailable"));
        }
        return sendError(reply, error);
      }
    }
  );
}
