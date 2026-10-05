CREATE TYPE "public"."coupon_discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."checkout_session_status" AS ENUM('draft', 'quoted', 'expired');--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(80),
	"recipient_name" varchar(160) NOT NULL,
	"country" varchar(100) DEFAULT 'Afghanistan' NOT NULL,
	"province" varchar(100) NOT NULL,
	"district_city" varchar(120) NOT NULL,
	"area_neighborhood" varchar(160),
	"address_description" text NOT NULL,
	"nearest_landmark" varchar(240),
	"phone" varchar(32) NOT NULL,
	"map_latitude" double precision,
	"map_longitude" double precision,
	"delivery_instructions" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'AFN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	"unit_price_snapshot" numeric(14, 2) NOT NULL,
	"compare_at_price_snapshot" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" > 0),
	CONSTRAINT "cart_items_unit_price_nonnegative" CHECK ("cart_items"."unit_price_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "store_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"type" "coupon_discount_type" NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"minimum_order_amount" numeric(14, 2),
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_coupons_value_positive" CHECK ("store_coupons"."value" > 0),
	CONSTRAINT "store_coupons_minimum_nonnegative" CHECK ("store_coupons"."minimum_order_amount" is null or "store_coupons"."minimum_order_amount" >= 0),
	CONSTRAINT "store_coupons_percentage_max" CHECK ("store_coupons"."type" <> 'percentage' or "store_coupons"."value" <= 100)
);
--> statement-breakpoint
CREATE TABLE "cart_store_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"coupon_code" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"address_id" uuid,
	"status" "checkout_session_status" DEFAULT 'draft' NOT NULL,
	"pricing_snapshot" jsonb,
	"cart_updated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_coupons" ADD CONSTRAINT "store_coupons_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_store_coupons" ADD CONSTRAINT "cart_store_coupons_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_store_coupons" ADD CONSTRAINT "cart_store_coupons_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_address_id_customer_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_addresses_user_id_idx" ON "customer_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_addresses_user_default_idx" ON "customer_addresses" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_user_id_uidx" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_coupons_store_code_uidx" ON "store_coupons" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "store_coupons_store_active_idx" ON "store_coupons" USING btree ("store_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_store_coupons_cart_store_uidx" ON "cart_store_coupons" USING btree ("cart_id","store_id");--> statement-breakpoint
CREATE INDEX "cart_store_coupons_cart_id_idx" ON "cart_store_coupons" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_user_id_idx" ON "checkout_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_cart_id_idx" ON "checkout_sessions" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_status_idx" ON "checkout_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checkout_sessions_expires_at_idx" ON "checkout_sessions" USING btree ("expires_at");