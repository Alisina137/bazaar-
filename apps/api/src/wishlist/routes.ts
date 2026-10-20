import type { AuthServiceContract } from "../auth/service.js";
import { getBearerToken } from "../auth/authorization.js";
import { AuthError } from "../auth/errors.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { WishlistError, type WishlistServiceContract } from "./service.js";

const paramsSchema = z.object({ productId: z.string().uuid() }).strict();

function fail(reply: FastifyReply, code: string, statusCode: number) {
  return reply.code(statusCode).send({ error: { code } });
}

async function actor(request: FastifyRequest, auth: AuthServiceContract): Promise<string> {
  const token = getBearerToken(request);
  if (!token) throw new AuthError("invalid_session", 401);
  return (await auth.authenticateToken(token)).user.id;
}

function handleError(reply: FastifyReply, error: unknown, request: FastifyRequest) {
  if (error instanceof AuthError || error instanceof WishlistError) {
    return fail(reply, error.code, error.statusCode);
  }
  // Log the underlying database/network failure privately instead of
  // masking missing migrations as a customer connectivity problem.
  request.log.error({ err: error }, "Wishlist operation failed; verify database migrations (customer_wishlist table) and connectivity");
  return fail(reply, "service_unavailable", 503);
}

export function registerWishlistRoutes(
  app: FastifyInstance, auth: AuthServiceContract, service: WishlistServiceContract
) {
  app.get("/customer/wishlist", async (request, reply) => {
    try { return await service.list(await actor(request, auth)); }
    catch (error) { return handleError(reply, error, request); }
  });

  app.put("/customer/wishlist/:productId", {
    config: { rateLimit: { max: 100, timeWindow: "10 minutes" } }
  }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return fail(reply, "invalid_request", 400);
    try {
      return await service.add(await actor(request, auth), parsed.data.productId);
    } catch (error) { return handleError(reply, error, request); }
  });

  app.delete("/customer/wishlist/:productId", {
    config: { rateLimit: { max: 100, timeWindow: "10 minutes" } }
  }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return fail(reply, "invalid_request", 400);
    try {
      return await service.remove(await actor(request, auth), parsed.data.productId);
    } catch (error) { return handleError(reply, error, request); }
  });
}
