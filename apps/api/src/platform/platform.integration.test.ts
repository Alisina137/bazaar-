import { authAccounts, closeDatabaseClient, createDatabaseClient, parseDatabaseConfig, platformAuditLogs, platformPlanPrices, platformSettings, userRoles, users } from "@bazaarlink/database";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { parseAuthConfig } from "../auth/config.js";
import { DatabaseAuthRepository } from "../auth/repository.js";
import { AuthService } from "../auth/service.js";
import { INTEGRATION_TEST_TIMEOUT_MS } from "../test/load-integration-env.js";

vi.setConfig({testTimeout:INTEGRATION_TEST_TIMEOUT_MS});
describe.skipIf(!process.env.DATABASE_URL)("Phase 11 platform operations (PostgreSQL)",()=>{
  const client=createDatabaseClient(parseDatabaseConfig());
  const auth=new AuthService(new DatabaseAuthRepository(client.db),parseAuthConfig());
  const app=buildApp({authService:auth,platformDatabase:client.db});
  const userIds:string[]=[];
  afterAll(async()=>{
    if(userIds.length){
      await client.db.delete(platformAuditLogs).where(inArray(platformAuditLogs.actorUserId,userIds));
      await client.db.delete(platformPlanPrices).where(inArray(platformPlanPrices.updatedByUserId,userIds));
      await client.db.delete(platformSettings).where(inArray(platformSettings.updatedByUserId,userIds));
      await client.db.delete(authAccounts).where(inArray(authAccounts.userId,userIds));
      await client.db.delete(users).where(inArray(users.id,userIds));
    }
    await app.close();
    await closeDatabaseClient(client);
  });
  it("requires operator roles, protects status mutations and audits each change",async()=>{
    const admin=await auth.register({email:"admin11-"+randomUUID()+"@example.com",password:"pass123456!!",displayName:"Administrator",preferredLocale:"en"});
    const customer=await auth.register({email:"customer11-"+randomUUID()+"@example.com",password:"pass123456!!",displayName:"Customer",preferredLocale:"en"});
    userIds.push(admin.user.id,customer.user.id);
    const noPermission=await app.inject({method:"GET",url:"/platform/overview",headers:{authorization:"Bearer "+customer.session.token}});
    expect(noPermission.statusCode).toBe(403);
    await client.db.insert(userRoles).values({userId:admin.user.id,role:"super_admin"});
    const authHeader={authorization:"Bearer "+admin.session.token};
    const overview=await app.inject({method:"GET",url:"/platform/overview",headers:authHeader});
    expect(overview.statusCode).toBe(200);
    const badReason=await app.inject({method:"POST",url:"/platform/actions/users/"+customer.user.id,headers:authHeader,payload:{action:"suspended",reason:"no"}});
    expect(badReason.statusCode).toBe(400);
    const suspended=await app.inject({method:"POST",url:"/platform/actions/users/"+customer.user.id,headers:authHeader,payload:{action:"suspended",reason:"Policy violation - repeated spam reports"}});
    expect(suspended.statusCode).toBe(200);
    expect(suspended.json().result.status).toBe("suspended");
    await expect(auth.authenticateToken(customer.session.token)).rejects.toMatchObject({code:"invalid_session"});
    const audit=await app.inject({method:"GET",url:"/platform/records/audit",headers:authHeader});
    expect(audit.statusCode).toBe(200);
    expect(audit.json().items.some((row:{target_id:string,action:string})=>row.target_id===customer.user.id && row.action==="suspended")).toBe(true);
    const self=await app.inject({method:"POST",url:"/platform/actions/users/"+admin.user.id,headers:authHeader,payload:{action:"suspended",reason:"should not suspend self"}});
    expect(self.statusCode).toBe(403);
    const reinstated=await app.inject({method:"POST",url:"/platform/actions/users/"+customer.user.id,headers:authHeader,payload:{action:"active",reason:"Appeal reviewed and accepted"}});
    expect(reinstated.statusCode).toBe(200);
    const grant=await app.inject({method:"POST",url:"/platform/operator-roles/"+customer.user.id,headers:authHeader,payload:{role:"platform_support",enabled:true,reason:"Approved support staff onboarding"}});
    expect(grant.statusCode).toBe(200);
    const support=await auth.login({email:(await client.db.select({email:authAccounts.identifier}).from(authAccounts).where(eq(authAccounts.userId,customer.user.id)))[0]!.email,password:"pass123456!!"});
    const supportHead={authorization:"Bearer "+support.session.token};
    expect((await app.inject({method:"GET",url:"/platform/overview",headers:supportHead})).statusCode).toBe(200);
    expect((await app.inject({method:"PUT",url:"/platform/prices/pro",headers:supportHead,payload:{monthlyAfn:900}})).statusCode).toBe(403);
    const price=await app.inject({method:"PUT",url:"/platform/prices/pro",headers:authHeader,payload:{monthlyAfn:900}});
    expect(price.statusCode).toBe(200);
    const setting=await app.inject({method:"PUT",url:"/platform/settings/support_email",headers:authHeader,payload:{value:"support@example.com",reason:"Updated verified support contact"}});
    expect(setting.statusCode).toBe(200);
    const settings=await app.inject({method:"GET",url:"/platform/settings",headers:authHeader});
    expect(settings.json().settings.some((row:{key:string})=>row.key==="support_email")).toBe(true);
  });
});
