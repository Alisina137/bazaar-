CREATE TYPE "public"."app_role" AS ENUM('customer', 'merchant_owner', 'merchant_staff', 'platform_support', 'platform_admin', 'super_admin');--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "app_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
INSERT INTO "user_roles" ("user_id", "role")
SELECT "id", 'customer'::"app_role"
FROM "users"
ON CONFLICT DO NOTHING;
