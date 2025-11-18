CREATE TABLE "attendances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"checked_in_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"status" text DEFAULT 'GOING' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar,
	"restaurant_id" varchar,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"date_time" timestamp NOT NULL,
	"location" text NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"value_tags" text[] DEFAULT '{}'::text[],
	"tickets_available" integer NOT NULL,
	"rsvp_count" integer DEFAULT 0 NOT NULL,
	"banner_image_url" text
);
--> statement-breakpoint
CREATE TABLE "master_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" varchar NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"total_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar,
	"restaurant_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"category" text NOT NULL,
	"dietary_tags" text[] DEFAULT '{}'::text[],
	"value_tags" text[] DEFAULT '{}'::text[],
	"ingredients" text,
	"allergens" text[] DEFAULT '{}'::text[],
	"image_url" text,
	"is_available" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"is_locally_sourced" boolean DEFAULT false,
	"source_farm" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" integer NOT NULL,
	"price_at_purchase" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"vendor_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"fulfillment_type" text NOT NULL,
	"fulfillment_details" jsonb,
	"address_json" jsonb,
	"items_json" jsonb NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"tax_cents" integer NOT NULL,
	"fees_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"stock" integer NOT NULL,
	"description" text,
	"image_url" text,
	"unit_type" text DEFAULT 'per item',
	"status" text DEFAULT 'active' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"value_tags" text[] DEFAULT '{}'::text[],
	"source_farm" text,
	"harvest_date" timestamp,
	"lead_time_days" integer DEFAULT 0,
	"inventory_status" text DEFAULT 'in_stock',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurant_faqs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "restaurant_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"author_name" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"restaurant_name" text NOT NULL,
	"display_name" text,
	"tagline" text,
	"contact_name" text NOT NULL,
	"bio" text NOT NULL,
	"dietary_options" text[] DEFAULT '{}'::text[],
	"price_range" text,
	"logo_url" text,
	"hero_image_url" text,
	"gallery" text[] DEFAULT '{}'::text[],
	"website" text,
	"instagram" text,
	"facebook" text,
	"location_type" text NOT NULL,
	"address" text,
	"city" text DEFAULT 'Fort Myers' NOT NULL,
	"state" text DEFAULT 'FL' NOT NULL,
	"zip_code" text NOT NULL,
	"service_options" text[] NOT NULL,
	"hours" jsonb,
	"seating_capacity" integer,
	"reservations_required" boolean DEFAULT false,
	"reservations_url" text,
	"reservations_phone" text,
	"badges" text[] DEFAULT '{}'::text[],
	"local_sourcing_percent" integer,
	"certifications" jsonb,
	"contact_email" text,
	"contact_phone" text,
	"policies" jsonb,
	"payment_method" text NOT NULL,
	"payment_methods" text[] DEFAULT '{}'::text[],
	"stripe_connect_account_id" text,
	"stripe_onboarding_complete" boolean DEFAULT false,
	"is_founding_member" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"profile_status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false,
	"terms_accepted" boolean DEFAULT true NOT NULL,
	"privacy_accepted" boolean DEFAULT true NOT NULL,
	"paid_until" timestamp,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"service_provider_id" varchar NOT NULL,
	"offering_id" varchar NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"requested_date" timestamp NOT NULL,
	"requested_time" text,
	"confirmed_date" timestamp,
	"confirmed_time" text,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_address" text,
	"customer_notes" text,
	"provider_notes" text,
	"provider_response" text,
	"quoted_price_cents" integer,
	"deposit_cents" integer,
	"total_cents" integer,
	"payment_status" text DEFAULT 'pending',
	"payment_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "service_offerings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_provider_id" varchar NOT NULL,
	"offering_name" text NOT NULL,
	"description" text NOT NULL,
	"duration_minutes" integer,
	"pricing_model" text NOT NULL,
	"fixed_price_cents" integer,
	"hourly_rate_cents" integer,
	"starting_at_cents" integer,
	"tags" text[] DEFAULT '{}'::text[],
	"requirements" text,
	"includes" text,
	"is_active" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"business_name" text NOT NULL,
	"display_name" text,
	"tagline" text,
	"contact_name" text NOT NULL,
	"bio" text NOT NULL,
	"service_areas" text[] DEFAULT '{}'::text[],
	"logo_url" text,
	"hero_image_url" text,
	"gallery" text[] DEFAULT '{}'::text[],
	"website" text,
	"instagram" text,
	"facebook" text,
	"address" text,
	"city" text DEFAULT 'Fort Myers' NOT NULL,
	"state" text DEFAULT 'FL' NOT NULL,
	"zip_code" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"certifications" jsonb,
	"licenses" jsonb,
	"insurance" jsonb,
	"years_in_business" integer,
	"availability_windows" jsonb,
	"min_booking_notice_hours" integer DEFAULT 24,
	"max_booking_advance_days" integer DEFAULT 90,
	"booking_preferences" jsonb,
	"badges" text[] DEFAULT '{}'::text[],
	"values" text[] DEFAULT '{}'::text[],
	"payment_methods" text[] DEFAULT '{}'::text[],
	"stripe_connect_account_id" text,
	"stripe_onboarding_complete" boolean DEFAULT false,
	"is_founding_member" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"profile_status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false,
	"terms_accepted" boolean DEFAULT true NOT NULL,
	"privacy_accepted" boolean DEFAULT true NOT NULL,
	"paid_until" timestamp,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"completed_bookings" integer DEFAULT 0 NOT NULL,
	"average_rating" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"value_tags" text[] DEFAULT '{}'::text[],
	"price_range_min" integer,
	"price_range_max" integer,
	"pricing_model" text,
	"duration_minutes" integer,
	"image_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spotlight" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"city" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"username" text,
	"password" text,
	"role" text DEFAULT 'buyer' NOT NULL,
	"phone" text,
	"zip_code" text,
	"travel_radius" integer DEFAULT 15,
	"user_values" text[] DEFAULT '{}'::text[],
	"dietary_prefs" text[] DEFAULT '{}'::text[],
	"notify_new_vendors" boolean DEFAULT false,
	"notify_weekly_picks" boolean DEFAULT false,
	"notify_value_deals" boolean DEFAULT false,
	"marketing_consent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vendor_faqs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "vendor_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_order_id" varchar NOT NULL,
	"vendor_id" varchar NOT NULL,
	"buyer_id" varchar NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"items_json" jsonb NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"tax_cents" integer NOT NULL,
	"fees_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"fulfillment_type" text NOT NULL,
	"fulfillment_details" jsonb,
	"payment_method" text,
	"payment_link" text,
	"stripe_payment_intent_id" text,
	"stripe_account_id" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"vendor_notified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" varchar NOT NULL,
	"author_name" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"vendor_type" text DEFAULT 'shop' NOT NULL,
	"business_name" text NOT NULL,
	"display_name" text,
	"tagline" text,
	"contact_name" text NOT NULL,
	"bio" text NOT NULL,
	"logo_url" text,
	"banner_url" text,
	"hero_image_url" text,
	"gallery" text[] DEFAULT '{}'::text[],
	"website" text,
	"instagram" text,
	"tiktok" text,
	"facebook" text,
	"location_type" text NOT NULL,
	"address" text,
	"city" text DEFAULT 'Fort Myers' NOT NULL,
	"state" text DEFAULT 'FL' NOT NULL,
	"zip_code" text NOT NULL,
	"service_options" text[] NOT NULL,
	"service_radius" integer,
	"hours" jsonb,
	"values" text[] DEFAULT '{}'::text[],
	"badges" text[] DEFAULT '{}'::text[],
	"local_sourcing_percent" integer,
	"show_local_sourcing" boolean DEFAULT false,
	"certifications" jsonb,
	"fulfillment_options" jsonb,
	"contact" jsonb,
	"contact_email" text,
	"phone" text,
	"policies" jsonb,
	"payment_method" text NOT NULL,
	"payment_preferences" text[] DEFAULT '{}'::text[],
	"payment_handles" jsonb,
	"stripe_connect_account_id" text,
	"stripe_onboarding_complete" boolean DEFAULT false,
	"is_founding_member" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"profile_status" text DEFAULT 'draft' NOT NULL,
	"restaurant_sources" text,
	"local_menu_percent" integer,
	"menu_url" text,
	"terms_accepted" boolean DEFAULT true NOT NULL,
	"privacy_accepted" boolean DEFAULT true NOT NULL,
	"marketing_consent" boolean DEFAULT false,
	"ein" text,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_orders" ADD CONSTRAINT "master_orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_faqs" ADD CONSTRAINT "restaurant_faqs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_reviews" ADD CONSTRAINT "restaurant_reviews_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_offering_id_service_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."service_offerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_offerings" ADD CONSTRAINT "service_offerings_service_provider_id_service_providers_id_fk" FOREIGN KEY ("service_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_faqs" ADD CONSTRAINT "vendor_faqs_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_master_order_id_master_orders_id_fk" FOREIGN KEY ("master_order_id") REFERENCES "public"."master_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_reviews" ADD CONSTRAINT "vendor_reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");