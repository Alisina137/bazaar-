import type {
  AuthSessionResponse,
  CommunicationErrorCode,
  CommunicationErrorResponse
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
import { CommunicationError } from "./errors.js";
import type { CommunicationService } from "./service.js";

const uuid = z.string().uuid();
const notificationParams = z.object({ notificationId: uuid });
const ticketParams = z.object({ ticketId: uuid });
const pushTokenSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(20)
      .max(512)
      .regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/),
    platform: z.enum(["android", "ios"]),
    deviceId: z.string().trim().max(180).nullable().optional()
  })
  .strict();
const createTicketSchema = z
  .object({
    category: z.enum([
      "order",
      "payment",
      "delivery",
      "product",
      "account",
      "merchant",
      "other"
    ]),
    subject: z.string().trim().min(3).max(240),
    message: z.string().trim().min(2).max(6000),
    orderId: uuid.nullable().optional(),
    storeId: uuid.nullable().optional()
  })
  .strict();
const replySchema = z
  .object({
    message: z.string().trim().min(2).max(6000)
  })
  .strict();
const statusSchema = z
  .object({
    status: z.enum([
      "open",
      "waiting_support",
      "waiting_customer",
      "closed"
    ])
  })
  .strict();
const platformListQuery = z
  .object({
    status: z
      .enum([
        "open",
        "waiting_support",
        "waiting_customer",
        "closed"
      ])
      .optional()
  })
  .strict();

function body(code: CommunicationErrorCode): CommunicationErrorResponse {
  return { error: { code } };
}

async function authenticate(
  request: FastifyRequest,
  authService: AuthServiceContract
): Promise<AuthSessionResponse> {
  const token = getBearerToken(request);
  if (!token) throw new CommunicationError("invalid_session", 401);
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
      throw new CommunicationError(code, error.statusCode);
    }
    throw error;
  }
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof CommunicationError) {
    return reply.code(error.statusCode).send(body(error.code));
  }
  throw error;
}

function platformSession(session: AuthSessionResponse): AuthSessionResponse {
  try {
    return requireAnyRole(session, [
      "platform_support",
      "platform_admin",
      "super_admin"
    ]);
  } catch {
    throw new CommunicationError("forbidden", 403);
  }
}

export function registerCommunicationRoutes(
  app: FastifyInstance,
  authService: AuthServiceContract,
  service: CommunicationService
) {
  app.get("/notifications", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      return await service.listNotifications(session.user.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/notifications/unread-count", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      return { unreadCount: await service.unreadCount(session.user.id) };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post(
    "/notifications/:notificationId/read",
    async (request, reply) => {
      const params = notificationParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        await service.markRead(
          session.user.id,
          params.data.notificationId
        );
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post("/notifications/read-all", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      await service.markAllRead(session.user.id);
      return reply.code(204).send();
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post(
    "/notifications/push-token",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 hour" }
      }
    },
    async (request, reply) => {
      const input = pushTokenSchema.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        await service.registerPushToken(session.user.id, input.data);
        return reply.code(204).send();
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/support/tickets",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 hour" }
      }
    },
    async (request, reply) => {
      const input = createTicketSchema.safeParse(request.body);
      if (!input.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return reply
          .code(201)
          .send(
            await service.createSupportTicket(
              session.user.id,
              input.data
            )
          );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/support/tickets", async (request, reply) => {
    try {
      const session = await authenticate(request, authService);
      return await service.listSupportTickets(session.user.id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/support/tickets/:ticketId", async (request, reply) => {
    const params = ticketParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(body("invalid_request"));
    }
    try {
      const session = await authenticate(request, authService);
      return await service.getSupportTicket(
        session.user.id,
        params.data.ticketId
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post(
    "/support/tickets/:ticketId/messages",
    async (request, reply) => {
      const params = ticketParams.safeParse(request.params);
      const input = replySchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.replySupportTicket(
          session.user.id,
          params.data.ticketId,
          input.data.message
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/support/tickets/:ticketId/close",
    async (request, reply) => {
      const params = ticketParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        const session = await authenticate(request, authService);
        return await service.closeSupportTicket(
          session.user.id,
          params.data.ticketId
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.get("/platform/support/tickets", async (request, reply) => {
    const query = platformListQuery.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(body("invalid_request"));
    }
    try {
      platformSession(await authenticate(request, authService));
      return await service.listPlatformTickets(query.data.status);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get(
    "/platform/support/tickets/:ticketId",
    async (request, reply) => {
      const params = ticketParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        platformSession(await authenticate(request, authService));
        return await service.getPlatformTicket(params.data.ticketId);
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.post(
    "/platform/support/tickets/:ticketId/messages",
    async (request, reply) => {
      const params = ticketParams.safeParse(request.params);
      const input = replySchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        const session = platformSession(
          await authenticate(request, authService)
        );
        return await service.replyPlatformTicket(
          session.user.id,
          params.data.ticketId,
          input.data.message
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );

  app.put(
    "/platform/support/tickets/:ticketId/status",
    async (request, reply) => {
      const params = ticketParams.safeParse(request.params);
      const input = statusSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.code(400).send(body("invalid_request"));
      }
      try {
        platformSession(await authenticate(request, authService));
        return await service.setPlatformTicketStatus(
          params.data.ticketId,
          input.data.status
        );
      } catch (error) {
        return sendError(reply, error);
      }
    }
  );
}
