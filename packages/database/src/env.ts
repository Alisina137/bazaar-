import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must use the PostgreSQL protocol"
    ),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(50).default(5),
  DATABASE_CONNECT_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(10),
  DATABASE_IDLE_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(300)
    .default(20),
  DATABASE_PREPARE_STATEMENTS: booleanFromString.default(false)
});

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectTimeoutSeconds: number;
  idleTimeoutSeconds: number;
  prepareStatements: boolean;
}

export function parseDatabaseConfig(
  environment: NodeJS.ProcessEnv = process.env
): DatabaseConfig {
  const result = databaseEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid database configuration: ${details}`);
  }

  return {
    url: result.data.DATABASE_URL,
    maxConnections: result.data.DATABASE_MAX_CONNECTIONS,
    connectTimeoutSeconds: result.data.DATABASE_CONNECT_TIMEOUT_SECONDS,
    idleTimeoutSeconds: result.data.DATABASE_IDLE_TIMEOUT_SECONDS,
    prepareStatements: result.data.DATABASE_PREPARE_STATEMENTS
  };
}
