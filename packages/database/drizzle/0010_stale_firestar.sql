CREATE TYPE "public"."notification_type" AS ENUM('order_placed', 'payment_successful', 'payment_failed', 'order_confirmed', 'order_cancelled', 'order_preparing', 'out_for_delivery', 'delivered', 'review_available', 'low_stock', 'new_review', 'subscription_issue', 'support_reply', 'delivery_failed');--> statement-breakpoint
CREATE TYPE "public"."push_delivery_state" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."push_platform" AS ENUM('android', 'ios');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_category" AS ENUM('order', 'payment', 'delivery', 'product', 'account', 'merchant', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'waiting_support', 'waiting_customer', 'closed');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"event_key" varchar(220) NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deep_link" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"device_token_id" uuid NOT NULL,
	"state" "push_delivery_state" DEFAULT 'queued' NOT NULL,
	"provider_ticket_id" varchar(180),
	"error" text,
	"attempted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" "push_platform" NOT NULL,
	"device_id" varchar(180),
	"active" boolean DEFAULT true NOT NULL,
	"last_registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"author_kind" varchar(20) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"store_id" uuid,
	"order_id" uuid,
	"category" "support_ticket_category" NOT NULL,
	"subject" varchar(240) NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_device_token_id_push_device_tokens_id_fk" FOREIGN KEY ("device_token_id") REFERENCES "public"."push_device_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_device_tokens" ADD CONSTRAINT "push_device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_event_uidx" ON "notifications" USING btree ("user_id","event_key");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_deliveries_notification_token_uidx" ON "push_deliveries" USING btree ("notification_id","device_token_id");--> statement-breakpoint
CREATE INDEX "push_deliveries_state_idx" ON "push_deliveries" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "push_device_tokens_token_uidx" ON "push_device_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_device_tokens_user_active_idx" ON "push_device_tokens" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "support_messages_ticket_created_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_user_updated_idx" ON "support_tickets" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "support_tickets_store_idx" ON "support_tickets" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "support_tickets_order_idx" ON "support_tickets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_updated_idx" ON "support_tickets" USING btree ("status","updated_at");