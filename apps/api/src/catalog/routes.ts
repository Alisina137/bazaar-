import type {
  AuthSessionResponse,
  CatalogErrorCode,
  CatalogErrorResponse,
  ProductStatus,
  type MerchantStaffPermission
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
import { CatalogError } from "./errors.js";
import type { CatalogServiceContract } from "./service.js";
import type { GrowthServiceContract } from "../growth/service.js";
import { GrowthError } from "../growth/errors.js";

const uuidSchema = z.string().uuid();
const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const optionalUrl = z.string().trim().url().max(2048).nullable().optional();

const categoryInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    parentId: uuidSchema.nullable().optional(),
    imageUrl: optionalUrl,
    icon: nullableText(80),
    sortOrder: z.number().int().min(-100000).max(100000).optional()
  })
  .strict();

const categoryUpdateSchema = categoryInputSchema.partial().strict();

const imageSchema = z
  .object({
    url: z.string().trim().url().max(2048),
    altText: nullableText(200),
    sortOrder: z.number().int().min(-100000).max(100000).optional()
  })
  .strict();

const optionValuesSchema = z.record(
  z.string().trim().min(1).max(80),
  z.string().trim().min(1).max(120)
);

const variantSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    optionValues: optionValuesSchema,
    sku: nullableText(100),
    priceOverride: z.number().min(0).max(999999999).nullable().optional(),
    imageUrl: optionalUrl,
    available: z.boolean().optional(),
    availableQuantity: z.number().int().min(0).max(100000000),
    lowStockThreshold: z.number().int().min(0).max(100000000).optional()
  })
  .strict();

const variantUpdateSchema = variantSchema
  .omit({ availableQuantity: true })
  .partial()
  .strict();

const productBaseSchema = z.object({
  name: z.string().trim().min(1).max(180),
  categoryId: uuidSchema,
  marketplaceCategoryId: uuidSchema.nullable().optional(),
  price: z.number().min(0).max(999999999),
  description: nullableText(5000),
  sku: nullableText(100),
  brand: nullableText(120),
  compareAtPrice: z.number().min(0).max(999999999).nullable().optional(),
  barcode: nullableText(120),
  weightGrams: z.number().int().min(0).max(100000000).nullable().optional(),
  dimensions: nullableText(160),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(30)
    .optional(),
  shippingClass: nullableText(120),
  deliveryRestrictions: nullableText(2000),
  deliveryProfile: z
    .enum([
      "normal",
      "bulky",
      "fragile",
      "pickup_only",
      "no_express",
      "seller_delivery_only",
      "digital_no_delivery"
    ])
    .optional(),
  deliverySurcharge: z.number().min(0).max(999999999).optional(),
  lowStockThreshold: z.number().int().min(0).max(100000000).optional()
});

const createProductSchema = productBaseSchema
  .extend({
    availableQuantity: z.number().int().min(0).max(100000000),
    images: z.array(imageSchema).max(12).optional(),
    variants: z.array(variantSchema).max(100).optional()
  })
  .strict();

const updateProductSchema = productBaseSchema.partial().strict();

const inventoryAdjustmentSchema = z
  .object({
    variantId: uuidSchema.nullable().optional(),
    delta: z.number().int().min(-100000000).max(100000000).refine((value) => value !== 0),
    reason: nullableText(160)
  })
  .strict();

const inventoryReservationSchema = z
  .object({
    variantId: uuidSchema.nullable().optional(),
    quantity: z.number().int().min(1).max(100000000)
  })
  .strict();

const storeParamsSchema = z.object({
  storeId: uuidSchema
});

const categoryParamsSchema = z.object({
  storeId: uuidSchema,
  categoryId: uuidSchema
});

const productParamsSchema = z.object({
  storeId: uuidSchema,
  productId: uuidSchema
});

const imageParamsSchema = z.object({
  storeId: uuidSchema,
  productId: uuidSchema,
  imageId: uuidSchema
});

const variantParamsSchema = z.object({
  storeId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema
});

const productStatusSchema = z.enum([
  "draft",
  "active",
  "out_of_stock",
  "archived",
  "plan_restricted"
]);

const productListQuerySchema = z
  .object({
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: productStatusSchema.optional(),
    categoryId: uuidSchema.optional()
  })
  .strict();

const publicHandleSchema = z.object({
  handle: z.string().trim().min(1).max(80)
});

function catalogErrorBody(code: CatalogErrorCode): CatalogErrorResponse {
  return {
    error: {
      code
    }
  };
}

function authErrorToCatalogCode(error: AuthError): CatalogErrorCode {
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
    throw new CatalogError("invalid_session", 401);
  }

  try {
    return await authService.authenticateToken(token);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new CatalogError(
        authErrorToCatalogCode(error),
        error.statusCode
      );
    }

    throw error;
  }
}

async function merchantOwner(
  actorUserId: string,
  storeId: string,
  permission: MerchantStaffPermission,
  growthService?: GrowthServiceContract
): Promise<string> {
  if (!growthService) return actorUserId;
  return (
    await growthService.resolveAccess(actorUserId, storeId, permission)
  ).ownerUserId;
}

function sendCatalogError(reply: FastifyReply, error: unknown) {
  if (error instanceof GrowthError) {
    return reply.code(error.statusCode).send({
      error: { code: error.code }
    });
  }

  if (error instanceof CatalogError) {
    return reply.code(error.statusCode).send(catalogErrorBody(error.code));
  }

  reply.log.error(
    { err: error },
    "Unexpected catalog request failure"
  );

  return reply.code(503).send(catalogErrorBody("service_unavailable"));
}

export function registerCatalogRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  catalogService: CatalogServiceContract,
  growthService?: GrowthServiceContract
) {
  app.get("/seller/stores/:storeId/categories", async (request, reply) => {
    const params = storeParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(catalogErrorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      return await catalogService.listCategories(
        await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
        params.data.storeId
      );
    } catch (error) {
      return sendCatalogError(reply, error);
    }
  });

  app.post(
    "/seller/stores/:storeId/categories",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const params = storeParamsSchema.safeParse(request.params);
      const input = categoryInputSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        const category = await catalogService.createCategory(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          input.data
        );

        return reply.code(201).send(category);
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.patch(
    "/seller/stores/:storeId/categories/:categoryId",
    async (request, reply) => {
      const params = categoryParamsSchema.safeParse(request.params);
      const input = categoryUpdateSchema.safeParse(request.body);

      if (
        !params.success ||
        !input.success ||
        Object.keys(input.data).length === 0
      ) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.updateCategory(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.categoryId,
          input.data
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/categories/:categoryId/archive",
    async (request, reply) => {
      const params = categoryParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.archiveCategory(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.categoryId
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/categories/:categoryId/restore",
    async (request, reply) => {
      const params = categoryParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.restoreCategory(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.categoryId
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.get("/seller/stores/:storeId/products", async (request, reply) => {
    const params = storeParamsSchema.safeParse(request.params);
    const query = productListQuerySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.code(400).send(catalogErrorBody("invalid_request"));
    }

    try {
      const session = await authenticate(request, authService);
      const listQuery: {
        offset: number;
        limit: number;
        status?: ProductStatus | undefined;
        categoryId?: string | undefined;
      } = query.data;

      return await catalogService.listProducts(
        await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
        params.data.storeId,
        listQuery
      );
    } catch (error) {
      return sendCatalogError(reply, error);
    }
  });

  app.post(
    "/seller/stores/:storeId/products",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 hour"
        }
      }
    },
    async (request, reply) => {
      const params = storeParamsSchema.safeParse(request.params);
      const input = createProductSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        const product = await catalogService.createProduct(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          input.data
        );

        return reply.code(201).send(product);
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/products/:productId",
    async (request, reply) => {
      const params = productParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.getProduct(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.productId
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.patch(
    "/seller/stores/:storeId/products/:productId",
    async (request, reply) => {
      const params = productParamsSchema.safeParse(request.params);
      const input = updateProductSchema.safeParse(request.body);

      if (
        !params.success ||
        !input.success ||
        Object.keys(input.data).length === 0
      ) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.updateProduct(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.productId,
          input.data
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  for (const action of ["archive", "restore", "publish"] as const) {
    app.post(
      "/seller/stores/:storeId/products/:productId/" + action,
      async (request, reply) => {
        const params = productParamsSchema.safeParse(request.params);
        if (!params.success) {
          return reply.code(400).send(catalogErrorBody("invalid_request"));
        }

        try {
          const session = await authenticate(request, authService);
          const args = [
            await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
            params.data.storeId,
            params.data.productId
          ] as const;

          if (action === "archive") {
            return await catalogService.archiveProduct(...args);
          }

          if (action === "restore") {
            return await catalogService.restoreProduct(...args);
          }

          return await catalogService.publishProduct(...args);
        } catch (error) {
          return sendCatalogError(reply, error);
        }
      }
    );
  }

  app.post(
    "/seller/stores/:storeId/products/:productId/images",
    async (request, reply) => {
      const params = productParamsSchema.safeParse(request.params);
      const input = imageSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.addImage(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.productId,
          input.data
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/products/:productId/images/:imageId",
    async (request, reply) => {
      const params = imageParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.deleteImage(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.productId,
          params.data.imageId
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/products/:productId/variants",
    async (request, reply) => {
      const params = productParamsSchema.safeParse(request.params);
      const input = variantSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.addVariant(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.productId,
          input.data
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.patch(
    "/seller/stores/:storeId/products/:productId/variants/:variantId",
    async (request, reply) => {
      const params = variantParamsSchema.safeParse(request.params);
      const input = variantUpdateSchema.safeParse(request.body);

      if (
        !params.success ||
        !input.success ||
        Object.keys(input.data).length === 0
      ) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.updateVariant(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.productId,
          params.data.variantId,
          input.data
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.delete(
    "/seller/stores/:storeId/products/:productId/variants/:variantId",
    async (request, reply) => {
      const params = variantParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.deleteVariant(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "products",
          growthService
        ),
          params.data.storeId,
          params.data.productId,
          params.data.variantId
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.post(
    "/seller/stores/:storeId/products/:productId/inventory/adjust",
    async (request, reply) => {
      const params = productParamsSchema.safeParse(request.params);
      const input = inventoryAdjustmentSchema.safeParse(request.body);

      if (!params.success || !input.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.adjustInventory(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "inventory",
          growthService
        ),
          params.data.storeId,
          params.data.productId,
          input.data
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  for (const action of ["reserve", "release"] as const) {
    app.post(
      "/seller/stores/:storeId/products/:productId/inventory/" + action,
      async (request, reply) => {
        const params = productParamsSchema.safeParse(request.params);
        const input = inventoryReservationSchema.safeParse(request.body);

        if (!params.success || !input.success) {
          return reply.code(400).send(catalogErrorBody("invalid_request"));
        }

        try {
          const session = await authenticate(request, authService);
          return action === "reserve"
            ? await catalogService.reserveInventory(
                await merchantOwner(
          session.user.id,
          params.data.storeId,
          "inventory",
          growthService
        ),
                params.data.storeId,
                params.data.productId,
                input.data
              )
            : await catalogService.releaseInventory(
                await merchantOwner(
          session.user.id,
          params.data.storeId,
          "inventory",
          growthService
        ),
                params.data.storeId,
                params.data.productId,
                input.data
              );
        } catch (error) {
          return sendCatalogError(reply, error);
        }
      }
    );
  }

  app.get(
    "/seller/stores/:storeId/products/:productId/inventory/history",
    async (request, reply) => {
      const params = productParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.inventoryHistory(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "inventory",
          growthService
        ),
          params.data.storeId,
          params.data.productId
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.get(
    "/seller/stores/:storeId/inventory/low-stock",
    async (request, reply) => {
      const params = storeParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(catalogErrorBody("invalid_request"));
      }

      try {
        const session = await authenticate(request, authService);
        return await catalogService.lowStock(
          await merchantOwner(
          session.user.id,
          params.data.storeId,
          "inventory",
          growthService
        ),
          params.data.storeId
        );
      } catch (error) {
        return sendCatalogError(reply, error);
      }
    }
  );

  app.get("/stores/:handle/catalog", async (request, reply) => {
    const params = publicHandleSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(catalogErrorBody("invalid_request"));
    }

    try {
      return await catalogService.getPublicCatalog(params.data.handle);
    } catch (error) {
      return sendCatalogError(reply, error);
    }
  });
}
