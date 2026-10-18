ALTER TABLE "users" ADD COLUMN "phone" varchar(24);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_color" varchar(16) DEFAULT 'teal' NOT NULL;
