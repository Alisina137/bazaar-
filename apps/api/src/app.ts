import Fastify from "fastify";

export interface AppDependencies {
  databaseHealthCheck?: () => Promise<void>;
}

export function buildApp(
  dependencies: AppDependencies = {}
) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test"
  });

  app.get("/health", async () => ({
    service: "bazaarlink-api",
    status: "ok"
  }));

  app.get("/health/database", async (_request, reply) => {
    if (!dependencies.databaseHealthCheck) {
      return reply.code(503).send({
        service: "bazaarlink-database",
        status: "unavailable"
      });
    }

    try {
      await dependencies.databaseHealthCheck();

      return {
        service: "bazaarlink-database",
        status: "ok"
      };
    } catch {
      return reply.code(503).send({
        service: "bazaarlink-database",
        status: "unavailable"
      });
    }
  });

  return app;
}
