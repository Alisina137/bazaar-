CREATE TYPE "public"."merchant_staff_invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."merchant_staff_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."subscription_change_direction" AS ENUM('upgrade', 'downgrade');--> statement-breakpoint
CREATE TABLE "growth_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"user_id" uuid,
	"store_id" uuid,
	"product_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"promotional_price" numeric(14, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_promotions_price_nonnegative" CHECK ("product_promotions"."promotional_price" >= 0),
	CONSTRAINT "product_promotions_schedule_valid" CHECK ("product_promotions"."ends_at" > "product_promotions"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "store_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "merchant_staff_status" DEFAULT 'active' NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_staff_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"status" "merchant_staff_invite_status" DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"from_plan" "subscription_plan" NOT NULL,
	"to_plan" "subscription_plan" NOT NULL,
	"direction" "subscription_change_direction" NOT NULL,
	"changed_by_user_id" uuid NOT NULL,
	"grace_period_end" timestamp with time zone,
	"restricted_product_count" integer DEFAULT 0 NOT NULL,
	"restored_product_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "plan_restriction_previous_status" "product_status";--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "featured_category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "featured_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "custom_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "growth_analytics_events" ADD CONSTRAINT "growth_analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_analytics_events" ADD CONSTRAINT "growth_analytics_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_analytics_events" ADD CONSTRAINT "growth_analytics_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_promotions" ADD CONSTRAINT "product_promotions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_promotions" ADD CONSTRAINT "product_promotions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_staff_invites" ADD CONSTRAINT "store_staff_invites_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_staff_invites" ADD CONSTRAINT "store_staff_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "growth_events_name_created_idx" ON "growth_analytics_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "growth_events_store_created_idx" ON "growth_analytics_events" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "growth_events_product_created_idx" ON "growth_analytics_events" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "product_promotions_product_schedule_idx" ON "product_promotions" USING btree ("product_id","active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "product_promotions_store_schedule_idx" ON "product_promotions" USING btree ("store_id","active","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "store_staff_store_user_uidx" ON "store_staff" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE INDEX "store_staff_user_status_idx" ON "store_staff" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "store_staff_store_status_idx" ON "store_staff" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "store_staff_invites_token_uidx" ON "store_staff_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "store_staff_invites_store_status_idx" ON "store_staff_invites" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "store_staff_invites_email_idx" ON "store_staff_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "store_staff_invites_expiry_idx" ON "store_staff_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "subscription_changes_store_created_idx" ON "subscription_changes" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stores_custom_domain_uidx" ON "stores" USING btree ("custom_domain");