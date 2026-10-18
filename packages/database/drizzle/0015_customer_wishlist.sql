CREATE TABLE IF NOT EXISTS "customer_wishlist" (
  "user_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "customer_wishlist_pk" PRIMARY KEY ("user_id", "product_id")
);
--> statement-breakpoint
ALTER TABLE "customer_wishlist" ADD CONSTRAINT "customer_wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer_wishlist" ADD CONSTRAINT "customer_wishlist_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "customer_wishlist_user_recent_idx" ON "customer_wishlist" USING btree ("user_id", "created_at");
