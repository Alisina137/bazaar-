CREATE TABLE "platform_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" varchar(100) NOT NULL,
	"name_fa" varchar(120) NOT NULL,
	"name_ps" varchar(120) NOT NULL,
	"name_en" varchar(120) NOT NULL,
	"image_url" text,
	"icon" varchar(80),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_metrics" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "marketplace_category_id" uuid;--> statement-breakpoint
ALTER TABLE "platform_categories" ADD CONSTRAINT "platform_categories_parent_id_platform_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."platform_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_metrics" ADD CONSTRAINT "marketplace_product_metrics_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_marketplace_category_id_platform_categories_id_fk" FOREIGN KEY ("marketplace_category_id") REFERENCES "public"."platform_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_categories_parent_id_idx" ON "platform_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "platform_categories_sort_idx" ON "platform_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "platform_categories_active_idx" ON "platform_categories" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_categories_slug_uidx" ON "platform_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "marketplace_product_metrics_view_count_idx" ON "marketplace_product_metrics" USING btree ("view_count");--> statement-breakpoint
CREATE INDEX "marketplace_product_metrics_last_viewed_idx" ON "marketplace_product_metrics" USING btree ("last_viewed_at");--> statement-breakpoint
CREATE INDEX "products_marketplace_category_idx" ON "products" USING btree ("marketplace_category_id");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "products_published_at_idx" ON "products" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "stores_province_idx" ON "stores" USING btree ("province");--> statement-breakpoint
CREATE INDEX "stores_marketplace_idx" ON "stores" USING btree ("status","province");--> statement-breakpoint
INSERT INTO "platform_categories"
	("id", "parent_id", "slug", "name_fa", "name_ps", "name_en", "sort_order")
VALUES
	('10000000-0000-4000-8000-000000000001'::uuid, NULL, 'electronics', 'الکترونیک', 'برېښنایي توکي', 'Electronics', 10),
	('10000000-0000-4000-8000-000000000002'::uuid, NULL, 'fashion', 'فیشن', 'فېشن', 'Fashion', 20),
	('10000000-0000-4000-8000-000000000003'::uuid, NULL, 'beauty', 'آرایشی و زیبایی', 'ښکلا', 'Beauty', 30),
	('10000000-0000-4000-8000-000000000004'::uuid, NULL, 'home-living', 'خانه و زندگی', 'کور او ژوند', 'Home & Living', 40),
	('10000000-0000-4000-8000-000000000005'::uuid, NULL, 'food-grocery', 'مواد غذایی', 'خوراکي توکي', 'Food & Grocery', 50),
	('10000000-0000-4000-8000-000000000006'::uuid, NULL, 'books-education', 'کتاب و آموزش', 'کتابونه او زده کړه', 'Books & Education', 60),
	('10000000-0000-4000-8000-000000000007'::uuid, NULL, 'sports-outdoors', 'ورزش و فضای باز', 'سپورت او بهر', 'Sports & Outdoors', 70),
	('10000000-0000-4000-8000-000000000008'::uuid, NULL, 'automotive', 'موتر و پرزه جات', 'موټر او پرزې', 'Automotive', 80),
	('10000000-0000-4000-8000-000000000009'::uuid, NULL, 'kids-baby', 'کودک و نوزاد', 'ماشومان او ماشوم', 'Kids & Baby', 90),
	('10000000-0000-4000-8000-000000000010'::uuid, NULL, 'other', 'سایر', 'نور', 'Other', 100),
	('10000000-0000-4000-8000-000000000011'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'phones', 'موبایل', 'موبایلونه', 'Phones', 11),
	('10000000-0000-4000-8000-000000000012'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'laptops', 'لپ‌تاپ', 'لېپټاپونه', 'Laptops', 12),
	('10000000-0000-4000-8000-000000000013'::uuid, '10000000-0000-4000-8000-000000000001'::uuid, 'electronics-accessories', 'لوازم جانبی', 'برېښنایي لوازم', 'Accessories', 13),
	('10000000-0000-4000-8000-000000000014'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, 'clothing', 'لباس', 'کالي', 'Clothing', 21),
	('10000000-0000-4000-8000-000000000015'::uuid, '10000000-0000-4000-8000-000000000002'::uuid, 'shoes', 'کفش', 'بوټان', 'Shoes', 22),
	('10000000-0000-4000-8000-000000000016'::uuid, '10000000-0000-4000-8000-000000000004'::uuid, 'furniture', 'فرنیچر', 'فرنیچر', 'Furniture', 41);
