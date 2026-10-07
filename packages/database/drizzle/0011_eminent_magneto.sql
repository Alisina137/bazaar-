ALTER TABLE "product_reviews" ADD COLUMN "merchant_response" text;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "merchant_responded_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "merchant_responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_merchant_responded_by_user_id_users_id_fk" FOREIGN KEY ("merchant_responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;