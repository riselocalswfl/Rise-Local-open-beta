CREATE TABLE "deal_redemptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" varchar NOT NULL,
	"vendor_id" varchar NOT NULL,
	"user_id" varchar,
	"redeemed_at" timestamp DEFAULT now(),
	"verified_by_pin" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"city" text DEFAULT 'Fort Myers',
	"tier" text DEFAULT 'free' NOT NULL,
	"deal_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk";
--> statement-breakpoint
ALTER TABLE "service_bookings" DROP CONSTRAINT "service_bookings_service_provider_id_service_providers_id_fk";
--> statement-breakpoint
ALTER TABLE "service_offerings" DROP CONSTRAINT "service_offerings_service_provider_id_service_providers_id_fk";
--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "vendor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "service_bookings" ALTER COLUMN "service_provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_offerings" ALTER COLUMN "service_provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD COLUMN "vendor_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "service_offerings" ADD COLUMN "vendor_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "capabilities" jsonb DEFAULT '{"products":false,"services":false,"menu":false}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "restaurant_details" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "service_details" jsonb;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "legacy_source_table" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "legacy_source_id" varchar;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "paid_until" timestamp;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "completed_bookings" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "average_rating" integer;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "is_featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "vendor_pin" text;--> statement-breakpoint
ALTER TABLE "deal_redemptions" ADD CONSTRAINT "deal_redemptions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_redemptions" ADD CONSTRAINT "deal_redemptions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_redemptions" ADD CONSTRAINT "deal_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_offerings" ADD CONSTRAINT "service_offerings_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;