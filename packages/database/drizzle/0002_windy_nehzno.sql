CREATE TYPE "public"."store_status" AS ENUM('draft', 'published', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."store_theme" AS ENUM('minimal', 'modern', 'fashion', 'electronics', 'food');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'pro', 'business');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'grace_period', 'expired', 'canceled');--> statement-breakpoint
CREATE TABLE "store_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'starter' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone,
	"grace_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"handle" varchar(80) NOT NULL,
	"category" varchar(100) NOT NULL,
	"province" varchar(100) NOT NULL,
	"city_district" varchar(120) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"preferred_locale" varchar(10) DEFAULT 'fa-AF' NOT NULL,
	"logo_url" text,
	"cover_image_url" text,
	"description" text,
	"whatsapp_number" varchar(32),
	"physical_address" text,
	"map_latitude" double precision,
	"map_longitude" double precision,
	"business_hours" text,
	"theme" "store_theme" DEFAULT 'minimal' NOT NULL,
	"accent_color" varchar(7) DEFAULT '#0F766E' NOT NULL,
	"status" "store_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_subscriptions_store_id_uidx" ON "store_subscriptions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "store_subscriptions_plan_idx" ON "store_subscriptions" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "store_subscriptions_status_idx" ON "store_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_handle_uidx" ON "stores" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "stores_owner_user_id_idx" ON "stores" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "stores_status_idx" ON "stores" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stores_created_at_idx" ON "stores" USING btree ("created_at");