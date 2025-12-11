import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Unified vendor listing type for displaying all vendor types on the vendors page
export type UnifiedVendorListing = {
  id: string;
  vendorType: "shop" | "dine" | "service";
  businessName: string;
  bio: string;
  city: string;
  categories: string[];
  values?: string[];
  isVerified: boolean;
  followerCount: number;
  logoUrl?: string;
  tagline?: string;
};

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - supports both Replit Auth and legacy fields
// (IMPORTANT) Keep the default config for the id column for Replit Auth compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Replit Auth fields
  email: text("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Legacy fields (keeping for compatibility)
  username: text("username").unique(),
  password: text("password"),
  
  // Common fields
  role: text("role").notNull().default("buyer"), // buyer, vendor, admin (Note: vendor replaces legacy roles: restaurant, service_provider)
  phone: text("phone"),
  
  // Buyer-specific fields
  zipCode: text("zip_code"),
  travelRadius: integer("travel_radius").default(15), // miles
  userValues: text("user_values").array().default(sql`'{}'::text[]`), // buyer's value preferences (custom tags)
  dietaryPrefs: text("dietary_prefs").array().default(sql`'{}'::text[]`), // gluten-free, dairy-free, vegan, etc.
  notifyNewVendors: boolean("notify_new_vendors").default(false),
  notifyWeeklyPicks: boolean("notify_weekly_picks").default(false),
  notifyValueDeals: boolean("notify_value_deals").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fulfillment Options Types
export const pickupFulfillmentSchema = z.object({
  enabled: z.boolean(),
  locations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    days: z.array(z.string()), // ["Monday", "Tuesday", ...]
    timeWindow: z.string(), // "9am-5pm"
    instructions: z.string().optional(),
  })).optional(),
});

export const deliveryFulfillmentSchema = z.object({
  enabled: z.boolean(),
  radiusMiles: z.number().positive().optional(),
  baseFeeCents: z.number().nonnegative().optional(),
  minOrderCents: z.number().nonnegative().optional(),
  leadTimeHours: z.number().positive().optional(),
  instructions: z.string().optional(),
});

export const shippingFulfillmentSchema = z.object({
  enabled: z.boolean(),
  pricingMode: z.enum(["flat", "calculated"]).optional(),
  flatFeeCents: z.number().nonnegative().optional(),
  carriers: z.array(z.string()).optional(),
  instructions: z.string().optional(),
});

export const fulfillmentOptionsSchema = z.object({
  pickup: pickupFulfillmentSchema.optional(),
  delivery: deliveryFulfillmentSchema.optional(),
  shipping: shippingFulfillmentSchema.optional(),
  custom: z.array(z.string()).optional(), // Custom fulfillment methods (e.g., "Curbside Pickup", "Farmers Market Booth")
  lastUpdated: z.string().optional(),
});

export type PickupFulfillment = z.infer<typeof pickupFulfillmentSchema>;
export type DeliveryFulfillment = z.infer<typeof deliveryFulfillmentSchema>;
export type ShippingFulfillment = z.infer<typeof shippingFulfillmentSchema>;
export type FulfillmentOptions = z.infer<typeof fulfillmentOptionsSchema>;

// Fulfillment Details - Buyer-selected fulfillment information for orders
export const pickupDetailsSchema = z.object({
  type: z.literal("Pickup"),
  pickupLocationId: z.string(),
  pickupLocationName: z.string(),
  pickupLocationAddress: z.string(),
  pickupSlot: z.string().optional(), // e.g., "Monday 9am-5pm"
  instructions: z.string().optional(),
});

export const deliveryDetailsSchema = z.object({
  type: z.literal("Delivery"),
  deliveryAddress: z.string(),
  deliveryCity: z.string(),
  deliveryZip: z.string(),
  instructions: z.string().optional(),
});

export const shippingDetailsSchema = z.object({
  type: z.literal("Ship"),
  shippingAddress: z.string(),
  shippingCity: z.string(),
  shippingState: z.string(),
  shippingZip: z.string(),
  carrier: z.string().optional(),
  instructions: z.string().optional(),
});

export const fulfillmentDetailsSchema = z.discriminatedUnion("type", [
  pickupDetailsSchema,
  deliveryDetailsSchema,
  shippingDetailsSchema,
]);

export type PickupDetails = z.infer<typeof pickupDetailsSchema>;
export type DeliveryDetails = z.infer<typeof deliveryDetailsSchema>;
export type ShippingDetails = z.infer<typeof shippingDetailsSchema>;
export type FulfillmentDetails = z.infer<typeof fulfillmentDetailsSchema>;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// For Replit Auth upserts
export type UpsertUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  vendorType: text("vendor_type").notNull().default("shop"), // "shop" | "dine" | "service" - self-labeled category
  
  // Capabilities - which features this vendor has enabled
  capabilities: jsonb("capabilities").notNull().default(sql`'{"products":false,"services":false,"menu":false}'::jsonb`), // {products: boolean, services: boolean, menu: boolean}
  
  // Business Profile
  businessName: text("business_name").notNull(),
  displayName: text("display_name"), // defaults to businessName if not provided
  tagline: text("tagline"), // short description (e.g., "Seasonal produce grown with regenerative practices")
  contactName: text("contact_name").notNull(),
  bio: text("bio").notNull(), // min 280 chars enforced in validation
  
  // Media
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  heroImageUrl: text("hero_image_url"), // large header image for profile
  gallery: text("gallery").array().default(sql`'{}'::text[]`), // array of image URLs
  
  // Online Presence
  website: text("website"),
  instagram: text("instagram"),
  tiktok: text("tiktok"),
  facebook: text("facebook"),
  
  // Location & Service
  locationType: text("location_type").notNull(), // Physical storefront, Home-based, Pop-up/Market only
  address: text("address"),
  city: text("city").notNull().default("Fort Myers"),
  state: text("state").notNull().default("FL"),
  zipCode: text("zip_code").notNull(),
  serviceOptions: text("service_options").array().notNull(), // Pickup, Delivery, Ship, On-site dining
  serviceRadius: integer("service_radius"), // miles
  hours: jsonb("hours"), // operating hours as JSON object
  
  // Business Values & Trust Signals
  values: text("values").array().default(sql`'{}'::text[]`), // custom value tags defined by vendor
  badges: text("badges").array().default(sql`'{}'::text[]`), // e.g., ["Family-Owned", "Women-Led", "Regenerative"]
  localSourcingPercent: integer("local_sourcing_percent"), // 0-100% of products sourced locally
  showLocalSourcing: boolean("show_local_sourcing").default(false), // whether to display local sourcing % on public profile
  certifications: jsonb("certifications"), // [{name, type, issuedOn, docUrl}]
  
  // Fulfillment & Contact
  fulfillmentOptions: jsonb("fulfillment_options"), // [{type, name, address, days, time, fee}]
  contact: jsonb("contact"), // {email, phone, preferredContact} - DEPRECATED: Use individual columns
  contactEmail: text("contact_email"), // Direct contact email for vendor
  phone: text("phone"), // Contact phone number
  
  // Policies
  policies: jsonb("policies"), // {refund, cancellation, allergen, safety}
  
  // Payment
  paymentMethod: text("payment_method").notNull(), // Direct to Vendor or Through Platform
  paymentPreferences: text("payment_preferences").array().default(sql`'{}'::text[]`), // Multiple payment methods: Direct, Venmo, Zelle, CashApp, PayPal, Cash, custom options
  paymentHandles: jsonb("payment_handles"), // {venmo: "@username", square: "id", etc.}
  
  // Stripe Connect
  stripeConnectAccountId: text("stripe_connect_account_id"), // Stripe Connect account ID for receiving payments
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(false), // Whether vendor completed Stripe onboarding
  
  // Membership & Verification
  isFoundingMember: boolean("is_founding_member").notNull().default(false), // First 25 vendors
  isVerified: boolean("is_verified").notNull().default(false),
  profileStatus: text("profile_status").notNull().default("draft"), // draft or complete
  
  // Type-specific details stored as JSON
  // For "dine" vendors: {dietaryOptions, priceRange, seatingCapacity, reservationsRequired, reservationsUrl, reservationsPhone, restaurantSources, localMenuPercent, menuUrl}
  // For "service" vendors: {serviceAreas, licenses, insurance, yearsInBusiness, availabilityWindows, minBookingNoticeHours, maxBookingAdvanceDays, bookingPreferences, completedBookings, averageRating}
  restaurantDetails: jsonb("restaurant_details"),
  serviceDetails: jsonb("service_details"),
  
  // Legacy restaurant-specific fields (kept for backward compatibility, will be migrated to restaurantDetails)
  restaurantSources: text("restaurant_sources"), // sources locally from
  localMenuPercent: integer("local_menu_percent"), // % of menu sourced locally
  menuUrl: text("menu_url"),
  
  // Migration tracking
  legacySourceTable: text("legacy_source_table"), // tracks which table data came from: "vendors", "restaurants", or "serviceProviders"
  legacySourceId: varchar("legacy_source_id"), // original ID from legacy table
  
  // Compliance
  termsAccepted: boolean("terms_accepted").notNull().default(true),
  privacyAccepted: boolean("privacy_accepted").notNull().default(true),
  marketingConsent: boolean("marketing_consent").default(false),
  ein: text("ein"), // optional for MVP
  paidUntil: timestamp("paid_until"), // membership expiration (migrated from restaurants/serviceProviders)
  
  // Legacy/Analytics
  followerCount: integer("follower_count").notNull().default(0),
  completedBookings: integer("completed_bookings").default(0), // for service providers
  averageRating: integer("average_rating"), // 0-500 (5.00 stars = 500) for service providers
  isFeatured: boolean("is_featured").default(false), // migrated from restaurants/serviceProviders
  
  // Deal Redemption PIN
  vendorPin: text("vendor_pin"), // 4-digit PIN for deal redemption verification
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor capabilities schema - which features are enabled for this vendor
export const vendorCapabilitiesSchema = z.object({
  products: z.boolean().default(false), // Can create and sell products
  services: z.boolean().default(false), // Can offer services
  menu: z.boolean().default(false), // Can create menu items
});

// Restaurant-specific details schema
export const restaurantDetailsSchema = z.object({
  dietaryOptions: z.array(z.string()).optional(), // Vegan, Gluten-Free, Keto, etc.
  priceRange: z.string().optional(), // $, $$, $$$, $$$$
  seatingCapacity: z.number().optional(),
  reservationsRequired: z.boolean().optional(),
  reservationsUrl: z.string().optional(),
  reservationsPhone: z.string().optional(),
}).optional();

// Service provider-specific details schema
export const serviceDetailsSchema = z.object({
  serviceAreas: z.array(z.string()).optional(), // Fort Myers, Cape Coral, etc.
  licenses: z.array(z.object({
    type: z.string(),
    number: z.string(),
    issuedBy: z.string(),
    expiresOn: z.string().optional(),
  })).optional(),
  insurance: z.object({
    liability: z.boolean().optional(),
    bonded: z.boolean().optional(),
    amount: z.number().optional(),
  }).optional(),
  yearsInBusiness: z.number().optional(),
  availabilityWindows: z.array(z.object({
    day: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
  minBookingNoticeHours: z.number().optional(),
  maxBookingAdvanceDays: z.number().optional(),
  bookingPreferences: z.object({
    autoConfirm: z.boolean().optional(),
    depositRequired: z.boolean().optional(),
    cancellationPolicy: z.string().optional(),
  }).optional(),
}).optional();

export type VendorCapabilities = z.infer<typeof vendorCapabilitiesSchema>;
export type RestaurantDetails = z.infer<typeof restaurantDetailsSchema>;
export type ServiceDetails = z.infer<typeof serviceDetailsSchema>;

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  followerCount: true,
  completedBookings: true,
  averageRating: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  capabilities: vendorCapabilitiesSchema,
  restaurantDetails: restaurantDetailsSchema,
  serviceDetails: serviceDetailsSchema,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  
  // Product Display
  unitType: text("unit_type").default("per item"), // per lb, per dozen, per item, etc.
  status: text("status").notNull().default("active"), // active or hidden
  isFeatured: boolean("is_featured").notNull().default(false),
  
  // Sourcing & Transparency
  valueTags: text("value_tags").array().default(sql`'{}'::text[]`), // custom value tags defined by vendor
  sourceFarm: text("source_farm"), // where product is sourced from
  harvestDate: timestamp("harvest_date"), // when product was harvested
  leadTimeDays: integer("lead_time_days").default(0), // days needed to prepare order
  inventoryStatus: text("inventory_status").default("in_stock"), // "in_stock", "limited", "out_of_stock"
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  restaurantId: varchar("restaurant_id").references(() => restaurants.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dateTime: timestamp("date_time").notNull(),
  location: text("location").notNull(),
  categories: text("categories").array().default(sql`'{}'::text[]`).notNull(), // hierarchical multi-select event categories
  valueTags: text("value_tags").array().default(sql`'{}'::text[]`), // custom value tags (e.g., Free, Family-Friendly, Community)
  ticketsAvailable: integer("tickets_available").notNull(),
  rsvpCount: integer("rsvp_count").notNull().default(0),
  bannerImageUrl: text("banner_image_url"),
}, (table) => ({
  // Check constraint: exactly one of vendorId or restaurantId must be set
  organizerCheck: sql`CHECK ((vendor_id IS NOT NULL AND restaurant_id IS NULL) OR (vendor_id IS NULL AND restaurant_id IS NOT NULL))`
}));

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  rsvpCount: true,
}).extend({
  // Accept ISO date strings and convert to Date objects, with validation
  dateTime: z.union([
    z.date(),
    z.string().refine((str) => !isNaN(Date.parse(str)), {
      message: "Invalid date format"
    }).transform((str) => new Date(str))
  ]),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  status: text("status").notNull().default("GOING"), // GOING, INTERESTED, NOT_GOING
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint: one RSVP per user per event
  uniqueUserEvent: sql`UNIQUE (user_id, event_id)`
}));

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
});

export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;

export const attendances = pgTable("attendances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventId: varchar("event_id").notNull().references(() => events.id),
  checkedInAt: timestamp("checked_in_at").defaultNow(),
}, (table) => ({
  // Unique constraint: one attendance record per user per event
  uniqueUserEvent: sql`UNIQUE (user_id, event_id)`
}));

export const insertAttendanceSchema = createInsertSchema(attendances).omit({
  id: true,
  checkedInAt: true,
});

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendances.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  status: text("status").notNull().default("pending"),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  fulfillmentType: text("fulfillment_type").notNull(), // "Pickup", "Delivery", "Ship"
  fulfillmentDetails: jsonb("fulfillment_details"), // Method-specific details: pickup location, delivery address, etc.
  addressJson: jsonb("address_json"), // Legacy field, can be migrated to fulfillmentDetails
  itemsJson: jsonb("items_json").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  taxCents: integer("tax_cents").notNull(),
  feesCents: integer("fees_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
}).extend({
  fulfillmentDetails: fulfillmentDetailsSchema.optional(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  priceAtPurchase: decimal("price_at_purchase", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertOrderItemWithoutOrderIdSchema = insertOrderItemSchema.omit({
  orderId: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertOrderItemWithoutOrderId = z.infer<typeof insertOrderItemWithoutOrderIdSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// ===== MULTI-VENDOR CHECKOUT TABLES =====

export const masterOrders = pgTable("master_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  totalCents: integer("total_cents").notNull(), // Grand total across all vendor orders
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertMasterOrderSchema = createInsertSchema(masterOrders).omit({
  id: true,
  createdAt: true,
});

export type InsertMasterOrder = z.infer<typeof insertMasterOrderSchema>;
export type MasterOrder = typeof masterOrders.$inferSelect;

export const vendorOrders = pgTable("vendor_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterOrderId: varchar("master_order_id").notNull().references(() => masterOrders.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  
  // Order details
  itemsJson: jsonb("items_json").notNull(), // Cart items for this vendor
  subtotalCents: integer("subtotal_cents").notNull(),
  taxCents: integer("tax_cents").notNull(),
  feesCents: integer("fees_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  
  // Fulfillment
  fulfillmentType: text("fulfillment_type").notNull(), // "Pickup", "Delivery", "Ship"
  fulfillmentDetails: jsonb("fulfillment_details"), // Method-specific details
  
  // Payment
  paymentMethod: text("payment_method"), // "stripe_connect", "venmo", "cashapp", "zelle", "paypal", "cash", "custom"
  paymentLink: text("payment_link"), // For custom payment methods (Venmo, CashApp links, etc.)
  stripePaymentIntentId: text("stripe_payment_intent_id"), // For Stripe Connect
  stripeAccountId: text("stripe_account_id"), // Vendor's Stripe Connect account
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed
  
  // Status
  status: text("status").notNull().default("pending"), // pending, processing, fulfilled, cancelled
  vendorNotified: boolean("vendor_notified").default(false),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertVendorOrderSchema = createInsertSchema(vendorOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fulfillmentDetails: fulfillmentDetailsSchema.optional(),
});

export type InsertVendorOrder = z.infer<typeof insertVendorOrderSchema>;
export type VendorOrder = typeof vendorOrders.$inferSelect;

export const spotlight = pgTable("spotlight", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  city: text("city").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertSpotlightSchema = createInsertSchema(spotlight).omit({
  id: true,
});

export type InsertSpotlight = z.infer<typeof insertSpotlightSchema>;
export type Spotlight = typeof spotlight.$inferSelect;

export const vendorReviews = pgTable("vendor_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorReviewSchema = createInsertSchema(vendorReviews).omit({
  id: true,
  createdAt: true,
});

export type InsertVendorReview = z.infer<typeof insertVendorReviewSchema>;
export type VendorReview = typeof vendorReviews.$inferSelect;

export const vendorFAQs = pgTable("vendor_faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").default(0), // for custom ordering
});

export const insertVendorFAQSchema = createInsertSchema(vendorFAQs).omit({
  id: true,
});

export type InsertVendorFAQ = z.infer<typeof insertVendorFAQSchema>;
export type VendorFAQ = typeof vendorFAQs.$inferSelect;

// ===== RESTAURANT TABLES =====

export const restaurants = pgTable("restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  
  // Restaurant Profile
  restaurantName: text("restaurant_name").notNull(),
  displayName: text("display_name"),
  tagline: text("tagline"),
  contactName: text("contact_name").notNull(),
  bio: text("bio").notNull(),
  
  // Cuisine & Dining
  dietaryOptions: text("dietary_options").array().default(sql`'{}'::text[]`), // Vegan, Gluten-Free, Keto, etc.
  priceRange: text("price_range"), // $, $$, $$$, $$$$
  
  // Media
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  gallery: text("gallery").array().default(sql`'{}'::text[]`),
  
  // Online Presence
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  
  // Location & Service
  locationType: text("location_type").notNull(), // Dine-in, Takeout only, Food truck
  address: text("address"),
  city: text("city").notNull().default("Fort Myers"),
  state: text("state").notNull().default("FL"),
  zipCode: text("zip_code").notNull(),
  serviceOptions: text("service_options").array().notNull(), // Dine-in, Takeout, Delivery, Catering
  hours: jsonb("hours"),
  
  // Dining Details
  seatingCapacity: integer("seating_capacity"),
  reservationsRequired: boolean("reservations_required").default(false),
  reservationsUrl: text("reservations_url"),
  reservationsPhone: text("reservations_phone"),
  
  // Values & Trust Signals
  badges: text("badges").array().default(sql`'{}'::text[]`), // custom value tags defined by restaurant
  localSourcingPercent: integer("local_sourcing_percent"),
  certifications: jsonb("certifications"),
  
  // Contact & Policies
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  policies: jsonb("policies"), // {reservations, cancellation, parking, accessibility}
  
  // Payment
  paymentMethod: text("payment_method").notNull(),
  paymentMethods: text("payment_methods").array().default(sql`'{}'::text[]`),
  
  // Stripe Connect
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(false),
  
  // Membership & Verification
  isFoundingMember: boolean("is_founding_member").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  profileStatus: text("profile_status").notNull().default("draft"), // draft or complete
  isFeatured: boolean("is_featured").default(false),
  
  // Compliance
  termsAccepted: boolean("terms_accepted").notNull().default(true),
  privacyAccepted: boolean("privacy_accepted").notNull().default(true),
  paidUntil: timestamp("paid_until"),
  
  // Analytics
  followerCount: integer("follower_count").notNull().default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  followerCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id), // Links to unified vendors table
  restaurantId: varchar("restaurant_id"), // Legacy field - kept for migration, will be deprecated
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  category: text("category").notNull(), // Appetizers, Entrees, Desserts, Drinks, etc.
  dietaryTags: text("dietary_tags").array().default(sql`'{}'::text[]`), // Vegan, Gluten-Free, Spicy, etc.
  valueTags: text("value_tags").array().default(sql`'{}'::text[]`), // custom value tags (e.g., Local, Organic, Women-Owned)
  ingredients: text("ingredients"),
  allergens: text("allergens").array().default(sql`'{}'::text[]`),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  isFeatured: boolean("is_featured").default(false),
  displayOrder: integer("display_order").default(0),
  isLocallySourced: boolean("is_locally_sourced").default(false),
  sourceFarm: text("source_farm"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Services for Service Provider vendors
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // Wellness, Home Services, Professional Services, Creative Services, etc.
  valueTags: text("value_tags").array().default(sql`'{}'::text[]`), // custom value tags (e.g., Local, Certified, Women-Owned)
  priceRangeMin: integer("price_range_min"), // cents
  priceRangeMax: integer("price_range_max"), // cents
  pricingModel: text("pricing_model"), // hourly, per-session, per-project, flat-rate, etc.
  durationMinutes: integer("duration_minutes"), // typical service duration
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const restaurantReviews = pgTable("restaurant_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRestaurantReviewSchema = createInsertSchema(restaurantReviews).omit({
  id: true,
  createdAt: true,
});

export type InsertRestaurantReview = z.infer<typeof insertRestaurantReviewSchema>;
export type RestaurantReview = typeof restaurantReviews.$inferSelect;

export const serviceProviders = pgTable("service_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  
  // Business Profile
  businessName: text("business_name").notNull(),
  displayName: text("display_name"),
  tagline: text("tagline"),
  contactName: text("contact_name").notNull(),
  bio: text("bio").notNull(),
  
  // Service Categories
  serviceAreas: text("service_areas").array().default(sql`'{}'::text[]`), // Fort Myers, Cape Coral, etc.
  
  // Media
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  gallery: text("gallery").array().default(sql`'{}'::text[]`),
  
  // Online Presence
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  
  // Location & Contact
  address: text("address"),
  city: text("city").notNull().default("Fort Myers"),
  state: text("state").notNull().default("FL"),
  zipCode: text("zip_code").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  
  // Professional Details
  certifications: jsonb("certifications"), // [{name, issuedBy, issuedOn, expiresOn, docUrl}]
  licenses: jsonb("licenses"), // [{type, number, issuedBy, expiresOn}]
  insurance: jsonb("insurance"), // {liability, bonded, amount}
  yearsInBusiness: integer("years_in_business"),
  
  // Availability & Booking
  availabilityWindows: jsonb("availability_windows"), // [{day, startTime, endTime}]
  minBookingNotice: integer("min_booking_notice_hours").default(24), // minimum hours notice for booking
  maxBookingAdvance: integer("max_booking_advance_days").default(90), // how far ahead can book
  bookingPreferences: jsonb("booking_preferences"), // {autoConfirm, depositRequired, cancellationPolicy}
  
  // Trust Signals
  badges: text("badges").array().default(sql`'{}'::text[]`), // Verified, Top Rated, Quick Response
  values: text("values").array().default(sql`'{}'::text[]`),
  
  // Payment
  paymentMethods: text("payment_methods").array().default(sql`'{}'::text[]`),
  
  // Stripe Connect
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(false),
  
  // Membership & Verification
  isFoundingMember: boolean("is_founding_member").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  profileStatus: text("profile_status").notNull().default("draft"), // draft or complete
  isFeatured: boolean("is_featured").default(false),
  
  // Compliance
  termsAccepted: boolean("terms_accepted").notNull().default(true),
  privacyAccepted: boolean("privacy_accepted").notNull().default(true),
  paidUntil: timestamp("paid_until"),
  
  // Analytics
  followerCount: integer("follower_count").notNull().default(0),
  completedBookings: integer("completed_bookings").notNull().default(0),
  averageRating: integer("average_rating"), // 0-500 (5.00 stars = 500)
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  followerCount: true,
  completedBookings: true,
  averageRating: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;

export const serviceOfferings = pgTable("service_offerings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id), // Links to unified vendors table
  serviceProviderId: varchar("service_provider_id"), // Legacy field - kept for migration, will be deprecated
  
  // Offering Details
  offeringName: text("offering_name").notNull(),
  description: text("description").notNull(),
  durationMinutes: integer("duration_minutes"), // estimated duration
  
  // Pricing
  pricingModel: text("pricing_model").notNull(), // "fixed", "hourly", "quote"
  fixedPriceCents: integer("fixed_price_cents"), // for fixed pricing
  hourlyRateCents: integer("hourly_rate_cents"), // for hourly pricing
  startingAtCents: integer("starting_at_cents"), // display price for listings
  
  // Details
  tags: text("tags").array().default(sql`'{}'::text[]`),
  requirements: text("requirements"), // what customer needs to provide/prepare
  includes: text("includes"), // what's included in the service
  
  // Status
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  displayOrder: integer("display_order").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceOfferingSchema = createInsertSchema(serviceOfferings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceOffering = z.infer<typeof insertServiceOfferingSchema>;
export type ServiceOffering = typeof serviceOfferings.$inferSelect;

export const serviceBookings = pgTable("service_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id), // Links to unified vendors table
  serviceProviderId: varchar("service_provider_id"), // Legacy field - kept for migration, will be deprecated
  offeringId: varchar("offering_id").notNull().references(() => serviceOfferings.id),
  
  // Booking Details
  status: text("status").notNull().default("requested"), // requested, confirmed, in_progress, completed, cancelled
  requestedDate: timestamp("requested_date").notNull(), // preferred service date
  requestedTime: text("requested_time"), // preferred time window
  confirmedDate: timestamp("confirmed_date"), // actual confirmed date
  confirmedTime: text("confirmed_time"),
  
  // Customer Info
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address"), // service location if different from profile
  customerNotes: text("customer_notes"),
  
  // Provider Response
  providerNotes: text("provider_notes"),
  providerResponse: text("provider_response"), // message to customer
  
  // Pricing
  quotedPriceCents: integer("quoted_price_cents"), // provider's quote
  depositCents: integer("deposit_cents"), // deposit amount
  totalCents: integer("total_cents"), // final total
  
  // Payment
  paymentStatus: text("payment_status").default("pending"), // pending, deposit_paid, paid, refunded
  paymentId: text("payment_id"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export const insertServiceBookingSchema = createInsertSchema(serviceBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  cancelledAt: true,
});

export type InsertServiceBooking = z.infer<typeof insertServiceBookingSchema>;
export type ServiceBooking = typeof serviceBookings.$inferSelect;

export const restaurantFAQs = pgTable("restaurant_faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").default(0),
});

export const insertRestaurantFAQSchema = createInsertSchema(restaurantFAQs).omit({
  id: true,
});

export type InsertRestaurantFAQ = z.infer<typeof insertRestaurantFAQSchema>;
export type RestaurantFAQ = typeof restaurantFAQs.$inferSelect;

// Messages - Direct messaging between users (consumers and vendors)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Deals - Special offers and promotions from vendors
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  
  // Deal Content
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"), // e.g., "Food & Drink", "Services", "Retail"
  city: text("city").default("Fort Myers"),
  
  // Deal Classification
  tier: text("tier").notNull().default("free"), // "free" | "premium"
  dealType: text("deal_type").notNull(), // "bogo" | "percent" | "addon"
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// Deal Redemptions - Log of redeemed deals
export const dealRedemptions = pgTable("deal_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  userId: varchar("user_id").references(() => users.id), // Optional: may be anonymous redemptions
  
  // Redemption Details
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  verifiedByPin: boolean("verified_by_pin").notNull().default(true),
  
  // Optional metadata
  notes: text("notes"),
});

export const insertDealRedemptionSchema = createInsertSchema(dealRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export type InsertDealRedemption = z.infer<typeof insertDealRedemptionSchema>;
export type DealRedemption = typeof dealRedemptions.$inferSelect;
