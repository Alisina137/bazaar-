CREATE TYPE "public"."delivery_distance_rule_type" AS ENUM('tier', 'base_per_km');--> statement-breakpoint
CREATE TYPE "public"."delivery_surcharge_type" AS ENUM('fixed', 'multiplier');--> statement-breakpoint
CREATE TYPE "public"."delivery_speed_kind" AS ENUM('economy', 'standard', 'same_day', 'express', 'custom');--> statement-breakpoint
CREATE TYPE "public"."delivery_product_profile" AS ENUM('normal', 'bulky', 'fragile', 'pickup_only', 'no_express', 'seller_delivery_only', 'digital_no_delivery');--> statement-breakpoint
CREATE TABLE "delivery_distance_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"type" "delivery_distance_rule_type" NOT NULL,
	"min_distance_km" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_distance_km" numeric(10, 2),
	"fee" numeric(14, 2),
	"base_fee" numeric(14, 2),
	"per_km_fee" numeric(14, 2),
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_distance_rules_min_nonnegative" CHECK ("delivery_distance_rules"."min_distance_km" >= 0),
	CONSTRAINT "delivery_distance_rules_max_valid" CHECK ("delivery_distance_rules"."max_distance_km" is null or "delivery_distance_rules"."max_distance_km" > "delivery_distance_rules"."min_distance_km"),
	CONSTRAINT "delivery_distance_rules_tier_fee" CHECK (("delivery_distance_rules"."type" <> 'tier') or ("delivery_distance_rules"."fee" is not null and "delivery_distance_rules"."fee" >= 0)),
	CONSTRAINT "delivery_distance_rules_base_per_km" CHECK (("delivery_distance_rules"."type" <> 'base_per_km') or (
        "delivery_distance_rules"."base_fee" is not null and "delivery_distance_rules"."base_fee" >= 0
        and "delivery_distance_rules"."per_km_fee" is not null and "delivery_distance_rules"."per_km_fee" >= 0
      ))
);
--> statement-breakpoint
CREATE TABLE "delivery_speeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"kind" "delivery_speed_kind" NOT NULL,
	"surcharge_type" "delivery_surcharge_type" DEFAULT 'fixed' NOT NULL,
	"surcharge_value" numeric(14, 2) DEFAULT '0' NOT NULL,
	"min_eta_minutes" integer NOT NULL,
	"max_eta_minutes" integer NOT NULL,
	"minimum_order_amount" numeric(14, 2),
	"max_range_km" numeric(10, 2),
	"cutoff_time" varchar(5),
	"supported_weekdays" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL,
	"max_weight_grams" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_speeds_surcharge_nonnegative" CHECK ("delivery_speeds"."surcharge_value" >= 0),
	CONSTRAINT "delivery_speeds_multiplier_minimum" CHECK ("delivery_speeds"."surcharge_type" <> 'multiplier' or "delivery_speeds"."surcharge_value" >= 1),
	CONSTRAINT "delivery_speeds_eta_valid" CHECK ("delivery_speeds"."min_eta_minutes" >= 0 and "delivery_speeds"."max_eta_minutes" >= "delivery_speeds"."min_eta_minutes"),
	CONSTRAINT "delivery_speeds_minimum_order_nonnegative" CHECK ("delivery_speeds"."minimum_order_amount" is null or "delivery_speeds"."minimum_order_amount" >= 0),
	CONSTRAINT "delivery_speeds_range_positive" CHECK ("delivery_speeds"."max_range_km" is null or "delivery_speeds"."max_range_km" > 0),
	CONSTRAINT "delivery_speeds_weight_positive" CHECK ("delivery_speeds"."max_weight_grams" is null or "delivery_speeds"."max_weight_grams" > 0)
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"province" varchar(100),
	"district_city" varchar(120),
	"area_neighborhood" varchar(160),
	"fee" numeric(14, 2) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_zones_fee_nonnegative" CHECK ("delivery_zones"."fee" >= 0),
	CONSTRAINT "delivery_zones_matcher_required" CHECK ("delivery_zones"."province" is not null or "delivery_zones"."district_city" is not null or "delivery_zones"."area_neighborhood" is not null)
);
--> statement-breakpoint
CREATE TABLE "store_delivery_settings" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"delivery_enabled" boolean DEFAULT false NOT NULL,
	"pickup_enabled" boolean DEFAULT true NOT NULL,
	"origin_address" text,
	"origin_province" varchar(100),
	"origin_district" varchar(120),
	"origin_area" varchar(160),
	"origin_latitude" double precision,
	"origin_longitude" double precision,
	"default_delivery_fee" numeric(14, 2),
	"free_delivery_threshold" numeric(14, 2),
	"minimum_order_amount" numeric(14, 2),
	"operating_weekdays" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL,
	"cutoff_time" varchar(5),
	"pickup_min_minutes" integer DEFAULT 30 NOT NULL,
	"pickup_max_minutes" integer DEFAULT 120 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_delivery_settings_default_fee_nonnegative" CHECK ("store_delivery_settings"."default_delivery_fee" is null or "store_delivery_settings"."default_delivery_fee" >= 0),
	CONSTRAINT "store_delivery_settings_free_threshold_nonnegative" CHECK ("store_delivery_settings"."free_delivery_threshold" is null or "store_delivery_settings"."free_delivery_threshold" >= 0),
	CONSTRAINT "store_delivery_settings_minimum_order_nonnegative" CHECK ("store_delivery_settings"."minimum_order_amount" is null or "store_delivery_settings"."minimum_order_amount" >= 0),
	CONSTRAINT "store_delivery_settings_pickup_eta_valid" CHECK ("store_delivery_settings"."pickup_min_minutes" >= 0 and "store_delivery_settings"."pickup_max_minutes" >= "store_delivery_settings"."pickup_min_minutes")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "delivery_profile" "delivery_product_profile" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "delivery_surcharge" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_distance_rules" ADD CONSTRAINT "delivery_distance_rules_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_speeds" ADD CONSTRAINT "delivery_speeds_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_delivery_settings" ADD CONSTRAINT "store_delivery_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_distance_rules_store_id_idx" ON "delivery_distance_rules" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "delivery_distance_rules_store_active_idx" ON "delivery_distance_rules" USING btree ("store_id","active");--> statement-breakpoint
CREATE INDEX "delivery_distance_rules_priority_idx" ON "delivery_distance_rules" USING btree ("store_id","priority");--> statement-breakpoint
CREATE INDEX "delivery_speeds_store_id_idx" ON "delivery_speeds" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "delivery_speeds_store_active_idx" ON "delivery_speeds" USING btree ("store_id","active");--> statement-breakpoint
CREATE INDEX "delivery_speeds_sort_idx" ON "delivery_speeds" USING btree ("store_id","sort_order");--> statement-breakpoint
CREATE INDEX "delivery_zones_store_id_idx" ON "delivery_zones" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "delivery_zones_store_active_idx" ON "delivery_zones" USING btree ("store_id","active");--> statement-breakpoint
CREATE INDEX "delivery_zones_priority_idx" ON "delivery_zones" USING btree ("store_id","priority");--> statement-breakpoint
CREATE INDEX "store_delivery_settings_enabled_idx" ON "store_delivery_settings" USING btree ("delivery_enabled");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_delivery_surcharge_nonnegative" CHECK ("products"."delivery_surcharge" >= 0);