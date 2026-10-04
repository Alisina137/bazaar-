import { z } from "zod";

const authConfigSchema = z.object({
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  AUTH_SESSION_TOUCH_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(5)
});

export interface AuthConfig {
  sessionTtlDays: number;
  sessionTouchIntervalMinutes: number;
}

export function parseAuthConfig(
  source: Record<string, string | undefined> = process.env
): AuthConfig {
  const parsed = authConfigSchema.parse(source);

  return {
    sessionTtlDays: parsed.AUTH_SESSION_TTL_DAYS,
    sessionTouchIntervalMinutes: parsed.AUTH_SESSION_TOUCH_INTERVAL_MINUTES
  };
}
