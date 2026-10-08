import { platformAuditLogs, platformPlanPrices, platformSettings, type Database } from "@bazaarlink/database";
import { sql, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { getBearerToken } from "../auth/authorization.js";
import { AuthError } from "../auth/errors.js";
import type { AuthServiceContract } from "../auth/service.js";

type Operator = { id: string; roles: string[] };
type Permission = "read" | "moderate" | "manage" | "super";
const operatorRoles = ["platform_support", "platform_admin", "super_admin"];
const idSchema = z.string().uuid();
const listSchema = z.object({
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25)
}).strict();
const actionSchema = z.object({
  action: z.string().min(1).max(40),
  reason: z.string().trim().min(10).max(2000)
}).strict();
const priceSchema = z.object({ monthlyAfn: z.number().min(0).max(1000000) }).strict();
const settingSchema = z.object({ value: z.string().trim().max(2000), reason: z.string().trim().min(10).max(2000) }).strict();
const roleSchema = z.object({ role: z.enum(["platform_admin", "platform_support"]), enabled: z.boolean(), reason: z.string().trim().min(10).max(2000) }).strict();
const settingKeys = ["support_email", "moderation_policy", "maintenance_message"] as const;

function fail(reply: FastifyReply, code: string, status: number) {
  return reply.code(status).send({ error: { code } });
}
async function authenticate(request: FastifyRequest, auth: AuthServiceContract, permission: Permission): Promise<Operator> {
  const token = getBearerToken(request);
  if (!token) throw new AuthError("invalid_session", 401);
  const session = await auth.authenticateToken(token);
  const roles = session.user.roles as string[];
  if (!roles.some(role => operatorRoles.includes(role))) throw new AuthError("forbidden", 403);
  if (permission === "manage" && !roles.some(role => role === "platform_admin" || role === "super_admin")) throw new AuthError("forbidden", 403);
  if (permission === "super" && !roles.includes("super_admin")) throw new AuthError("forbidden", 403);
  return { id: session.user.id, roles };
}

function rows<T extends Record<string, unknown> = Record<string, unknown>>(result: Iterable<T>): T[] {
  return Array.from(result);
}
function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) return fail(reply, error.code, error.statusCode);
  if (error instanceof PlatformError) return fail(reply, error.code, error.statusCode);
  throw error;
}
class PlatformError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number) { super(code); }
}
const sources: Record<string, string> = {
  users: "select u.id, u.display_name as \"name\", u.status, u.preferred_locale as locale, u.created_at, (select array_agg(r.role::text) from user_roles r where r.user_id=u.id) as roles from users u order by u.created_at desc",
  stores: "select s.id, s.name, s.handle, s.status, s.owner_user_id, sub.plan, sub.status as subscription_status, s.created_at from stores s left join store_subscriptions sub on sub.store_id=s.id order by s.created_at desc",
  products: "select p.id, p.name, p.store_id, p.status, p.price, p.created_at from products p order by p.created_at desc",
  orders: "select o.id, o.order_number as name, o.store_id, o.customer_user_id, o.state as status, o.total, o.created_at from orders o order by o.created_at desc",
  payments: "select p.id, p.store_id, p.order_id, p.method, p.state as status, p.refund_state, p.amount, p.refunded_amount, p.currency, p.created_at from payment_attempts p order by p.created_at desc",
  subscriptions: "select s.id, s.store_id, s.plan, s.status, s.current_period_end, s.grace_period_end, s.updated_at from store_subscriptions s order by s.updated_at desc",
  reviews: "select r.id, r.store_id, r.product_id, r.rating, r.text, r.status, r.created_at from product_reviews r order by r.created_at desc",
  reports: "select r.id, r.review_id, r.reason, r.details, r.status, r.created_at from review_reports r order by r.created_at desc",
  tickets: "select t.id, t.subject as name, t.category, t.status, t.store_id, t.user_id, t.created_at from support_tickets t order by t.created_at desc",
  categories: "select c.id, c.store_id, c.name, c.status, c.created_at from categories c order by c.created_at desc",
  promotions: "select p.id, p.store_id, p.product_id, p.name, p.promotional_price, p.active, p.starts_at, p.ends_at from product_promotions p order by p.created_at desc",
  coupons: "select c.id, c.store_id, c.code as name, c.active, c.type, c.value, c.created_at from store_coupons c order by c.created_at desc",
  audit: "select a.id, a.actor_user_id, a.action, a.resource, a.target_id, a.reason, a.before, a.after, a.created_at from platform_audit_logs a order by a.created_at desc"
};

export function registerPlatformRoutes(app: FastifyInstance, auth: AuthServiceContract, db: Database) {
  app.get("/platform/overview", async (request, reply) => {
    try {
      await authenticate(request, auth, "read");
      const values = await db.execute(sql`
        select
          (select count(*)::int from users) as users,
          (select count(*)::int from stores) as stores,
          (select count(*)::int from orders) as orders,
          (select count(*)::int from payment_attempts where state='failed') as failed_payments,
          (select count(*)::int from review_reports where status='open') as open_reports,
          (select count(*)::int from support_tickets where status<>'closed') as open_tickets,
          (select count(*)::int from store_subscriptions where status='active') as active_subscriptions
      `);
      return { overview: rows(values)[0] ?? {} };
    } catch (error) { return handleError(reply, error); }
  });

  app.get("/platform/records/:kind", async (request, reply) => {
    const params = z.object({kind: z.string()}).safeParse(request.params);
    const query = listSchema.safeParse(request.query);
    if (!params.success || !query.success || !Object.hasOwn(sources, params.data.kind)) return fail(reply, "invalid_request", 400);
    try {
      const actor = await authenticate(request, auth, params.data.kind === "users" || params.data.kind === "audit" ? "manage" : "read");
      if (params.data.kind === "audit" && !actor.roles.includes("super_admin")) throw new AuthError("forbidden", 403);
      const source = sql.raw(sources[params.data.kind]!);
      // The source is selected from a fixed server-maintained allowlist, never user input.
      const result = await db.execute(sql`select * from (${source}) as records limit ${query.data.limit} offset ${query.data.offset}`);
      return { items: rows(result), offset: query.data.offset, limit: query.data.limit };
    } catch (error) { return handleError(reply, error); }
  });

  app.post("/platform/actions/:kind/:id", async (request, reply) => {
    const params = z.object({kind: z.enum(["users", "stores", "products", "subscriptions", "reviews", "reports"]), id: idSchema}).safeParse(request.params);
    const input = actionSchema.safeParse(request.body);
    if (!params.success || !input.success) return fail(reply, "invalid_request", 400);
    const { kind, id } = params.data;
    const { action, reason } = input.data;
    try {
      const actor = await authenticate(request, auth, kind === "reviews" || kind === "reports" ? "moderate" : "manage");
      if ((kind === "users" && !["active", "suspended", "disabled"].includes(action)) ||
          (kind === "stores" && !["suspended", "draft"].includes(action)) ||
          (kind === "products" && !["draft", "archived"].includes(action)) ||
          (kind === "subscriptions" && !["active", "grace_period", "expired", "canceled"].includes(action)) ||
          (kind === "reviews" && !["published", "hidden", "removed"].includes(action)) ||
          (kind === "reports" && !["resolved", "dismissed"].includes(action))) return fail(reply, "invalid_request", 400);
      const output = await db.transaction(async tx => {
        // Row locks serialize concurrent moderation and status transitions with their audit entry.
        let previous: Record<string, unknown> | undefined;
        let after: Record<string, unknown> | undefined;
        if (kind === "users") {
          const found = rows(await tx.execute(sql`select id, status from users where id=${id} for update`))[0];
          if (!found) throw new PlatformError("not_found", 404);
          if (id === actor.id) throw new PlatformError("forbidden", 403);
          const operator = rows(await tx.execute(sql`select role from user_roles where user_id=${id} and role in ('platform_support','platform_admin','super_admin')`));
          if (operator.length) throw new PlatformError("forbidden", 403);
          previous = found;
          after = rows(await tx.execute(sql`update users set status=${action}::user_status, updated_at=now() where id=${id} returning id, status`))[0];
          if (action !== "active") await tx.execute(sql`update auth_sessions set revoked_at=now() where user_id=${id} and revoked_at is null`);
        } else if (kind === "stores") {
          previous = rows(await tx.execute(sql`select id, status from stores where id=${id} for update`))[0];
          if (!previous) throw new PlatformError("not_found", 404);
          after = rows(await tx.execute(sql`update stores set status=${action}::store_status, updated_at=now() where id=${id} returning id, status`))[0];
        } else if (kind === "products") {
          previous = rows(await tx.execute(sql`select id, status from products where id=${id} for update`))[0];
          if (!previous) throw new PlatformError("not_found", 404);
          after = rows(await tx.execute(sql`update products set status=${action}::product_status, updated_at=now() where id=${id} returning id, status`))[0];
        } else if (kind === "subscriptions") {
          previous = rows(await tx.execute(sql`select id, status from store_subscriptions where id=${id} for update`))[0];
          if (!previous) throw new PlatformError("not_found", 404);
          after = rows(await tx.execute(sql`update store_subscriptions set status=${action}::subscription_status, updated_at=now() where id=${id} returning id, status`))[0];
        } else if (kind === "reviews") {
          previous = rows(await tx.execute(sql`select id, status from product_reviews where id=${id} for update`))[0];
          if (!previous) throw new PlatformError("not_found", 404);
          after = rows(await tx.execute(sql`update product_reviews set status=${action}::review_status, moderated_by_user_id=${actor.id}, moderated_at=now(), moderation_reason=${reason}, updated_at=now() where id=${id} returning id, status`))[0];
          if (action !== "published") await tx.execute(sql`update review_reports set status='resolved', resolved_by_user_id=${actor.id}, resolution_note=${reason}, resolved_at=now(), updated_at=now() where review_id=${id} and status='open'`);
        } else {
          previous = rows(await tx.execute(sql`select id, status from review_reports where id=${id} for update`))[0];
          if (!previous) throw new PlatformError("not_found", 404);
          after = rows(await tx.execute(sql`update review_reports set status=${action}::review_report_status, resolved_by_user_id=${actor.id}, resolution_note=${reason}, resolved_at=now(), updated_at=now() where id=${id} returning id, status`))[0];
        }
        await tx.insert(platformAuditLogs).values({actorUserId: actor.id, action, resource: kind, targetId: id, reason, before: previous, after});
        return after;
      });
      return { result: output };
    } catch (error) { return handleError(reply, error); }
  });

  app.get("/platform/prices", async (request, reply) => {
    try {
      await authenticate(request, auth, "read");
      return { prices: await db.select({plan: platformPlanPrices.plan, monthlyAfn: platformPlanPrices.monthlyAfn, updatedAt: platformPlanPrices.updatedAt}).from(platformPlanPrices) };
    } catch (error) { return handleError(reply, error); }
  });

  app.put("/platform/prices/:plan", async (request, reply) => {
    const params = z.object({plan: z.enum(["pro","business"])}).safeParse(request.params);
    const input = priceSchema.safeParse(request.body);
    if (!params.success || !input.success) return fail(reply, "invalid_request", 400);
    try {
      const actor = await authenticate(request, auth, "manage");
      const result = await db.transaction(async tx => {
        const found = await tx.select().from(platformPlanPrices).where(eq(platformPlanPrices.plan, params.data.plan));
        const before = found[0] ?? null;
        const values = {plan:params.data.plan, monthlyAfn: String(input.data.monthlyAfn), updatedByUserId:actor.id, updatedAt:new Date()};
        const [after] = await tx.insert(platformPlanPrices).values(values).onConflictDoUpdate({target:platformPlanPrices.plan,set: values}).returning();
        await tx.insert(platformAuditLogs).values({actorUserId:actor.id, action:"set_price", resource:"prices", targetId:params.data.plan, reason:"Platform subscription price configuration", before, after});
        return after;
      });
      return { price: result };
    } catch (error) { return handleError(reply, error); }
  });

  app.get("/platform/settings", async (request, reply) => {
    try {
      await authenticate(request, auth, "read");
      return { settings: await db.select().from(platformSettings) };
    } catch (error) { return handleError(reply, error); }
  });

  app.put("/platform/settings/:key", async (request, reply) => {
    const params = z.object({key: z.enum(settingKeys)}).safeParse(request.params);
    const input = settingSchema.safeParse(request.body);
    if (!params.success || !input.success) return fail(reply, "invalid_request", 400);
    if (params.data.key === "support_email" && input.data.value && !z.email().safeParse(input.data.value).success) return fail(reply, "invalid_request", 400);
    try {
      const actor = await authenticate(request, auth, "super");
      const result = await db.transaction(async tx => {
        const [before] = await tx.select().from(platformSettings).where(eq(platformSettings.key, params.data.key));
        const values = {key:params.data.key, value:input.data.value, updatedByUserId:actor.id, updatedAt:new Date()};
        const [after] = await tx.insert(platformSettings).values(values).onConflictDoUpdate({target: platformSettings.key, set:values}).returning();
        await tx.insert(platformAuditLogs).values({actorUserId:actor.id, action:"set_setting", resource:"settings", targetId:params.data.key, reason:input.data.reason, before, after});
        return after;
      });
      return { setting: result };
    } catch (error) { return handleError(reply, error); }
  });

  app.post("/platform/operator-roles/:id", async (request, reply) => {
    const params = z.object({id:idSchema}).safeParse(request.params);
    const input = roleSchema.safeParse(request.body);
    if (!params.success || !input.success) return fail(reply, "invalid_request", 400);
    try {
      const actor = await authenticate(request, auth, "super");
      const output = await db.transaction(async tx => {
        const found = rows(await tx.execute(sql`select id, status from users where id=${params.data.id} for update`))[0];
        if (!found) throw new PlatformError("not_found", 404);
        if (found.status !== "active" || actor.id === params.data.id) throw new PlatformError("forbidden", 403);
        const before = rows(await tx.execute(sql`select role from user_roles where user_id=${params.data.id}`));
        if (before.some(row => row.role === "super_admin")) throw new PlatformError("forbidden", 403);
        if (input.data.enabled) await tx.execute(sql`insert into user_roles (user_id,role) values (${params.data.id},${input.data.role}::app_role) on conflict do nothing`);
        else await tx.execute(sql`delete from user_roles where user_id=${params.data.id} and role=${input.data.role}::app_role`);
        const after = rows(await tx.execute(sql`select role from user_roles where user_id=${params.data.id}`));
        await tx.insert(platformAuditLogs).values({actorUserId:actor.id,action:input.data.enabled?"grant_role":"revoke_role",resource:"users",targetId:params.data.id,reason:input.data.reason,before:{roles:before},after:{roles:after}});
        return after;
      });
      return {roles:output};
    } catch (error) { return handleError(reply, error); }
  });
}
