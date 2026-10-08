import type {
  MarketplaceErrorCode,
  MarketplaceErrorResponse,
  MarketplaceSort
} from "@bazaarlink/contracts";
import type {
  FastifyInstance,
  FastifyReply
} from "fastify";
import { z } from "zod";

import { MarketplaceError } from "./errors.js";
import type {
  MarketplaceBrowseQuery
} from "./repository.js";
import type { MarketplaceServiceContract } from "./service.js";

const uuidSchema = z.string().uuid();
const optionalBoolean = z.preprocess(
  (value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  },
  z.boolean().optional()
);
const sortSchema = z.enum([
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "rating",
  "popularity"
]);

const homeQuerySchema = z
  .object({
    province: z.string().trim().min(1).max(100).optional(),
    recentProductIds: z
      .string()
      .trim()
      .max(1200)
      .optional()
  })
  .strict();

const browseQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(180).optional(),
    categoryId: uuidSchema.optional(),
    minPrice: z.coerce.number().min(0).max(999999999).optional(),
    maxPrice: z.coerce.number().min(0).max(999999999).optional(),
    province: z.string().trim().min(1).max(100).optional(),
    storeId: uuidSchema.optional(),
    brand: z.string().trim().min(1).max(120).optional(),
    inStock: optionalBoolean,
    discount: optionalBoolean,
    minRating: z.coerce.number().min(1).max(5).optional(),
    verifiedStore: optionalBoolean,
    sort: sortSchema.default("relevance"),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
  .strict()
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    { message: "invalid_price_range" }
  );

const suggestionsQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(180)
  })
  .strict();

const productParamsSchema = z.object({
  productId: uuidSchema
});

const storeParamsSchema = z.object({
  handle: z.string().trim().min(1).max(80)
});

const storeQuerySchema = z
  .object({
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
  .strict();

function errorBody(code: MarketplaceErrorCode): MarketplaceErrorResponse {
  return {
    error: {
      code
    }
  };
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof MarketplaceError) {
    return reply.code(error.statusCode).send(errorBody(error.code));
  }

  reply.log.error({ err: error }, "Unexpected marketplace request failure");
  return reply.code(503).send(errorBody("service_unavailable"));
}

function parseRecentIds(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 12);

  return ids.filter((id) => uuidSchema.safeParse(id).success);
}

export function registerMarketplaceRoutes(
  app: FastifyInstance,
  service: MarketplaceServiceContract
) {
  app.get("/marketplace/categories", async (_request, reply) => {
    try {
      return await service.categories();
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/marketplace/home", async (request, reply) => {
    const query = homeQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      return await service.home({
        ...(query.data.province
          ? { province: query.data.province }
          : {}),
        recentProductIds: parseRecentIds(query.data.recentProductIds)
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/marketplace/products", {
    config: {rateLimit: {max: 240, timeWindow: "1 minute"}}
  }, async (request, reply) => {
    const query = browseQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    const browse: MarketplaceBrowseQuery = {
      sort: query.data.sort as MarketplaceSort,
      offset: query.data.offset,
      limit: query.data.limit,
      ...(query.data.q ? { query: query.data.q } : {}),
      ...(query.data.categoryId
        ? { categoryId: query.data.categoryId }
        : {}),
      ...(query.data.minPrice !== undefined
        ? { minPrice: query.data.minPrice }
        : {}),
      ...(query.data.maxPrice !== undefined
        ? { maxPrice: query.data.maxPrice }
        : {}),
      ...(query.data.province
        ? { province: query.data.province }
        : {}),
      ...(query.data.storeId
        ? { storeId: query.data.storeId }
        : {}),
      ...(query.data.brand ? { brand: query.data.brand } : {}),
      ...(query.data.inStock !== undefined
        ? { inStock: query.data.inStock }
        : {}),
      ...(query.data.discount !== undefined
        ? { discount: query.data.discount }
        : {}),
      ...(query.data.minRating !== undefined
        ? { minRating: query.data.minRating }
        : {}),
      ...(query.data.verifiedStore !== undefined
        ? { verifiedStore: query.data.verifiedStore }
        : {})
    };

    try {
      return await service.browse(browse);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/marketplace/search/suggestions", {
    config: {rateLimit: {max: 120, timeWindow: "1 minute"}}
  }, async (request, reply) => {
    const query = suggestionsQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      return await service.suggestions(query.data.q);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/marketplace/products/:productId", async (request, reply) => {
    const params = productParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      return await service.product(params.data.productId);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post(
    "/marketplace/products/:productId/view",
    {
      config: {
        rateLimit: {
          max: 240,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const params = productParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send(errorBody("invalid_request"));
      }

      try {
        await service.recordView(params.data.productId);
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/marketplace/stores/:handle", async (request, reply) => {
    const params = storeParamsSchema.safeParse(request.params);
    const query = storeQuerySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.code(400).send(errorBody("invalid_request"));
    }

    try {
      return await service.store(
        params.data.handle,
        query.data.offset,
        query.data.limit
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
