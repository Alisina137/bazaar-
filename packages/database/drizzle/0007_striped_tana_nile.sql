CREATE TYPE "public"."payment_event_source" AS ENUM('system', 'customer', 'merchant', 'provider_webhook', 'admin');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash_on_delivery', 'hesabpay', 'card', 'pay_at_store');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('manual', 'hesabpay', 'card_gateway');--> statement-breakpoint
CREATE TYPE "public"."payment_refund_state" AS ENUM('none', 'pending', 'partial', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_state" AS ENUM('created', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'refund_pending', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"state" "payment_state" DEFAULT 'created' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'AFN' NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"provider_session_id" varchar(255),
	"provider_transaction_id" varchar(255),
	"provider_reference" varchar(255),
	"hosted_checkout_url" text,
	"failure_code" varchar(120),
	"failure_reason" text,
	"refund_state" "payment_refund_state" DEFAULT 'none' NOT NULL,
	"refunded_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_amount_nonnegative" CHECK ("payment_attempts"."amount" >= 0),
	CONSTRAINT "payment_attempts_refunded_nonnegative" CHECK ("payment_attempts"."refunded_amount" >= 0),
	CONSTRAINT "payment_attempts_refunded_not_over_amount" CHECK ("payment_attempts"."refunded_amount" <= "payment_attempts"."amount")
);
--> statement-breakpoint
CREATE TABLE "payment_state_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_attempt_id" uuid NOT NULL,
	"from_state" "payment_state",
	"to_state" "payment_state" NOT NULL,
	"source" "payment_event_source" NOT NULL,
	"provider_event_id" varchar(255),
	"deduplication_key" varchar(255),
	"payload_fingerprint" varchar(128),
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_payment_settings" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"cash_on_delivery_enabled" boolean DEFAULT true NOT NULL,
	"hesabpay_enabled" boolean DEFAULT false NOT NULL,
	"card_enabled" boolean DEFAULT false NOT NULL,
	"pay_at_store_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_state_events" ADD CONSTRAINT "payment_state_events_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_payment_settings" ADD CONSTRAINT "store_payment_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_idempotency_uidx" ON "payment_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_tx_uidx" ON "payment_attempts" USING btree ("provider","provider_transaction_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_user_id_idx" ON "payment_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_checkout_session_idx" ON "payment_attempts" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_store_id_idx" ON "payment_attempts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_state_idx" ON "payment_attempts" USING btree ("state");--> statement-breakpoint
CREATE INDEX "payment_attempts_method_idx" ON "payment_attempts" USING btree ("method");--> statement-breakpoint
CREATE INDEX "payment_state_events_attempt_idx" ON "payment_state_events" USING btree ("payment_attempt_id");--> statement-breakpoint
CREATE INDEX "payment_state_events_source_idx" ON "payment_state_events" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_state_events_deduplication_uidx" ON "payment_state_events" USING btree ("deduplication_key");--> statement-breakpoint
CREATE INDEX "store_payment_settings_cod_idx" ON "store_payment_settings" USING btree ("cash_on_delivery_enabled");--> statement-breakpoint
CREATE INDEX "store_payment_settings_hesabpay_idx" ON "store_payment_settings" USING btree ("hesabpay_enabled");--> statement-breakpoint
CREATE INDEX "store_payment_settings_card_idx" ON "store_payment_settings" USING btree ("card_enabled");