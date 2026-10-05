CREATE TYPE "public"."fulfillment_state" AS ENUM('pending', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled', 'delivery_failed');--> statement-breakpoint
CREATE TYPE "public"."inventory_reservation_state" AS ENUM('reserved', 'committed', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."order_event_source" AS ENUM('system', 'customer', 'merchant', 'payment');--> statement-breakpoint
CREATE TYPE "public"."order_fulfillment_type" AS ENUM('delivery', 'pickup', 'digital');--> statement-breakpoint
CREATE TYPE "public"."order_state" AS ENUM('pending_payment', 'pending_confirmation', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled', 'payment_failed', 'refund_pending', 'refunded', 'delivery_failed');--> statement-breakpoint
ALTER TYPE "public"."checkout_session_status" ADD VALUE 'ordered';--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	"state" "inventory_reservation_state" DEFAULT 'reserved' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"committed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_quantity_positive" CHECK ("inventory_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "order_fulfillment_type" NOT NULL,
	"state" "fulfillment_state" DEFAULT 'pending' NOT NULL,
	"label" varchar(180) NOT NULL,
	"tracking_code" varchar(120),
	"expected_min_at" timestamp with time zone,
	"expected_max_at" timestamp with time zone,
	"rule_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_name" varchar(180) NOT NULL,
	"variant_title" varchar(180),
	"image_url" text,
	"quantity" integer NOT NULL,
	"unit_list_price" numeric(14, 2) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"line_items_subtotal" numeric(14, 2) NOT NULL,
	"line_product_discount" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_list_price_nonnegative" CHECK ("order_items"."unit_list_price" >= 0),
	CONSTRAINT "order_items_unit_price_nonnegative" CHECK ("order_items"."unit_price" >= 0),
	CONSTRAINT "order_items_line_subtotal_nonnegative" CHECK ("order_items"."line_items_subtotal" >= 0),
	CONSTRAINT "order_items_line_discount_nonnegative" CHECK ("order_items"."line_product_discount" >= 0),
	CONSTRAINT "order_items_line_total_nonnegative" CHECK ("order_items"."line_total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_state_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_state" "order_state",
	"to_state" "order_state" NOT NULL,
	"source" "order_event_source" NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(40) NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"state" "order_state" DEFAULT 'pending_confirmation' NOT NULL,
	"fulfillment_type" "order_fulfillment_type" NOT NULL,
	"currency" varchar(3) DEFAULT 'AFN' NOT NULL,
	"items_subtotal" numeric(14, 2) NOT NULL,
	"product_discount" numeric(14, 2) NOT NULL,
	"coupon_discount" numeric(14, 2) NOT NULL,
	"pre_delivery_total" numeric(14, 2) NOT NULL,
	"delivery_base" numeric(14, 2) NOT NULL,
	"urgency_surcharge" numeric(14, 2) NOT NULL,
	"product_delivery_surcharge" numeric(14, 2) NOT NULL,
	"free_delivery_discount" numeric(14, 2) NOT NULL,
	"delivery_total" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"customer_address_snapshot" jsonb,
	"delivery_snapshot" jsonb NOT NULL,
	"payment_snapshot" jsonb NOT NULL,
	"cancellation_reason" text,
	"cancelled_by" varchar(24),
	"confirmation_expires_at" timestamp with time zone NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"preparing_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_items_subtotal_nonnegative" CHECK ("orders"."items_subtotal" >= 0),
	CONSTRAINT "orders_product_discount_nonnegative" CHECK ("orders"."product_discount" >= 0),
	CONSTRAINT "orders_coupon_discount_nonnegative" CHECK ("orders"."coupon_discount" >= 0),
	CONSTRAINT "orders_pre_delivery_total_nonnegative" CHECK ("orders"."pre_delivery_total" >= 0),
	CONSTRAINT "orders_delivery_base_nonnegative" CHECK ("orders"."delivery_base" >= 0),
	CONSTRAINT "orders_urgency_surcharge_nonnegative" CHECK ("orders"."urgency_surcharge" >= 0),
	CONSTRAINT "orders_product_delivery_surcharge_nonnegative" CHECK ("orders"."product_delivery_surcharge" >= 0),
	CONSTRAINT "orders_free_delivery_discount_nonnegative" CHECK ("orders"."free_delivery_discount" >= 0),
	CONSTRAINT "orders_delivery_total_nonnegative" CHECK ("orders"."delivery_total" >= 0),
	CONSTRAINT "orders_total_nonnegative" CHECK ("orders"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_fulfillments" ADD CONSTRAINT "order_fulfillments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_state_events" ADD CONSTRAINT "order_state_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_state_events" ADD CONSTRAINT "order_state_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_order_item_uidx" ON "inventory_reservations" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_order_id_idx" ON "inventory_reservations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_product_id_idx" ON "inventory_reservations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_variant_id_idx" ON "inventory_reservations" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_state_expiry_idx" ON "inventory_reservations" USING btree ("state","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_fulfillments_order_id_uidx" ON "order_fulfillments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_fulfillments_state_idx" ON "order_fulfillments" USING btree ("state");--> statement-breakpoint
CREATE INDEX "order_fulfillments_tracking_code_idx" ON "order_fulfillments" USING btree ("tracking_code");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_variant_id_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "order_state_events_order_id_idx" ON "order_state_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_state_events_created_at_idx" ON "order_state_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_uidx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_checkout_store_uidx" ON "orders" USING btree ("checkout_session_id","store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_store_uidx" ON "orders" USING btree ("idempotency_key","store_id");--> statement-breakpoint
CREATE INDEX "orders_customer_user_id_idx" ON "orders" USING btree ("customer_user_id");--> statement-breakpoint
CREATE INDEX "orders_store_id_idx" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "orders_store_state_idx" ON "orders" USING btree ("store_id","state");--> statement-breakpoint
CREATE INDEX "orders_customer_state_idx" ON "orders" USING btree ("customer_user_id","state");--> statement-breakpoint
CREATE INDEX "orders_placed_at_idx" ON "orders" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "orders_confirmation_expiry_idx" ON "orders" USING btree ("state","confirmation_expires_at");--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_attempts_order_id_idx" ON "payment_attempts" USING btree ("order_id");