import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, index, jsonb, doublePrecision } from "drizzle-orm/pg-core";
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
  onboardingComplete: boolean("onboarding_complete").default(false), // Whether vendor completed business onboarding
  welcomeCompleted: boolean("welcome_completed").default(false), // Whether user completed welcome carousel intro
  
  // Buyer-specific fields
  zipCode: text("zip_code"),
  travelRadius: integer("travel_radius").default(15), // miles
  userValues: text("user_values").array().default(sql`'{}'::text[]`), // buyer's value preferences (custom tags)
  dietaryPrefs: text("dietary_prefs").array().default(sql`'{}'::text[]`), // gluten-free, dairy-free, vegan, etc.
  notifyNewVendors: boolean("notify_new_vendors").default(false),
  notifyWeeklyPicks: boolean("notify_weekly_picks").default(false),
  notifyValueDeals: boolean("notify_value_deals").default(false),
  marketingConsent: boolean("marketing_consent").default(false),
  
  // Rise Local Pass membership
  isPassMember: boolean("is_pass_member").default(false), // Active Rise Local Pass subscription
  passExpiresAt: timestamp("pass_expires_at"), // When the current subscription period ends
  stripeCustomerId: text("stripe_customer_id"), // For Stripe subscription management
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID
  membershipStatus: text("membership_status").notNull().default("none"), // none | active | trialing | past_due | canceled | unpaid
  membershipPlan: text("membership_plan"), // 'rise_local_monthly' when active
  membershipCurrentPeriodEnd: timestamp("membership_current_period_end"), // End of current billing period
  
  // Email notification preferences
  emailMessageNotifications: boolean("email_message_notifications").default(true), // Receive email when new message arrives
  
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

// Business Categories - single source of truth for vendor categorization
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // e.g., "food_drink", "wellness", "home_services"
  label: text("label").notNull(), // e.g., "Food & Drink"
  icon: text("icon"), // Icon name from lucide-react (e.g., "Utensils", "Heart")
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  vendorType: text("vendor_type").notNull().default("shop"), // "shop" | "dine" | "service" - self-labeled category
  categoryId: varchar("category_id").references(() => categories.id), // Business category from categories table
  
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
  youtube: text("youtube"),
  twitter: text("twitter"),
  
  // Location & Service
  locationType: text("location_type").notNull(), // Physical storefront, Home-based, Pop-up/Market only
  address: text("address"), // addressLine1
  addressLine2: text("address_line_2"), // apt, suite, floor, etc.
  city: text("city").notNull().default("Fort Myers"),
  state: text("state").notNull().default("FL"),
  zipCode: text("zip_code").notNull(),
  serviceOptions: text("service_options").array().notNull(), // Pickup, Delivery, Ship, On-site dining
  serviceRadius: integer("service_radius"), // miles
  hours: jsonb("hours"), // operating hours as JSON object
  
  // GPS Coordinates (for "Near Me" filtering)
  latitude: text("latitude"), // stored as text for precision
  longitude: text("longitude"), // stored as text for precision
  
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
  menuUrl: text("menu_url"), // Link to external menu (ToastTab, website, PDF link)
  menuFileUrl: text("menu_file_url"), // Uploaded menu file URL (PDF/image)
  menuType: text("menu_type"), // "link" | "file" | null - determines which menu option is used
  
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
  
  // Profile Visibility - controls whether business appears in public listings
  isProfileVisible: boolean("is_profile_visible").notNull().default(true), // When false, business is hidden from all consumer views
  
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
  // Rise Local reservation settings
  acceptReservations: z.boolean().optional(), // Whether to show reservation option on profile
  reservationSystem: z.string().optional(), // OpenTable, SevenRooms, Resy, Website, Phone
  reservationLink: z.string().optional(), // URL for reservation system
  offerDeals: z.boolean().optional(), // Whether restaurant participates in Rise Local deals
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

// Reservation method enum values
export const RESERVATION_METHODS = ["OPENTABLE", "SEVENROOMS", "RESY", "WEBSITE", "PHONE", "NONE"] as const;
export type ReservationMethod = typeof RESERVATION_METHODS[number];

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
  
  // Reservation Integration (NEW - for Rise Local reservation experience)
  reservationMethod: text("reservation_method").default("NONE"), // OPENTABLE, SEVENROOMS, RESY, WEBSITE, PHONE, NONE
  supportsDeals: boolean("supports_deals").default(false), // Whether restaurant participates in Rise Local deals
  
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

// B2C Conversations - Consumer to Business messaging
export const SENDER_ROLES = ["consumer", "vendor"] as const;
export type SenderRole = typeof SENDER_ROLES[number];

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consumerId: varchar("consumer_id").notNull().references(() => users.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  dealId: varchar("deal_id").references(() => deals.id), // Optional context
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  lastMessageAt: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// B2C Conversation Messages
export const conversationMessages = pgTable("conversation_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  senderRole: text("sender_role").notNull(), // "consumer" | "vendor"
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationMessageSchema = createInsertSchema(conversationMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;

// Notifications - In-app notifications for users
export const NOTIFICATION_TYPES = ["new_message", "deal_redeemed", "deal_expiring", "pass_renewal", "business_reply", "system"] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  actorId: varchar("actor_id").references(() => users.id), // The user who triggered the notification
  type: text("type").notNull(), // "new_message" | "deal_redeemed" | "deal_expiring" | "pass_renewal" | "business_reply" | "system"
  title: text("title").notNull(),
  message: text("message").notNull(),
  referenceId: varchar("reference_id"), // Links to conversation, deal, etc.
  referenceType: text("reference_type"), // "conversation" | "deal" | etc.
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Email jobs - Queue for delayed email notifications
export const EMAIL_JOB_STATUSES = ["pending", "sent", "failed", "cancelled"] as const;
export type EmailJobStatus = typeof EMAIL_JOB_STATUSES[number];

export const emailJobs = pgTable("email_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  recipientEmail: text("recipient_email").notNull(),
  jobType: text("job_type").notNull(), // "new_message"
  referenceId: varchar("reference_id"), // conversationId for message emails
  actorId: varchar("actor_id").references(() => users.id), // sender
  subject: text("subject").notNull(),
  bodyPreview: text("body_preview"), // Message preview for email body
  status: text("status").notNull().default("pending"), // pending | sent | failed | cancelled
  scheduledFor: timestamp("scheduled_for").notNull(), // When to send (5 min delay)
  sentAt: timestamp("sent_at"),
  lastAttemptAt: timestamp("last_attempt_at"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailJobSchema = createInsertSchema(emailJobs).omit({
  id: true,
  sentAt: true,
  lastAttemptAt: true,
  attempts: true,
  createdAt: true,
});

export type InsertEmailJob = z.infer<typeof insertEmailJobSchema>;
export type EmailJob = typeof emailJobs.$inferSelect;

// Membership Events - Audit log for subscription changes
export const membershipEvents = pgTable("membership_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeEventId: text("stripe_event_id"), // Stripe event ID for deduplication
  eventType: text("event_type").notNull(), // checkout.session.completed, subscription.updated, etc.
  previousStatus: text("previous_status"), // membership status before event
  newStatus: text("new_status"), // membership status after event
  previousPlan: text("previous_plan"),
  newPlan: text("new_plan"),
  metadata: text("metadata"), // JSON string for additional context
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMembershipEventSchema = createInsertSchema(membershipEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertMembershipEvent = z.infer<typeof insertMembershipEventSchema>;
export type MembershipEvent = typeof membershipEvents.$inferSelect;

// Deal redemption status enum values (for unified code system)
export const DEAL_REDEMPTION_STATUSES = ["issued", "verified", "voided", "expired"] as const;
export type DealRedemptionStatus = typeof DEAL_REDEMPTION_STATUSES[number];

// Deal status enum values (for vendor management)
export const DEAL_STATUSES = ["draft", "published", "paused", "expired"] as const;
export type DealStatus = typeof DEAL_STATUSES[number];

// Deal redemption method enum values
export const DEAL_REDEMPTION_METHODS = ["time_locked_code"] as const;
export type DealRedemptionMethod = typeof DEAL_REDEMPTION_METHODS[number];

// Reservation status enum values
export const RESERVATION_STATUSES = ["INITIATED", "BOOKED_EXTERNALLY", "CANCELLED"] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

// Redemption type enum values
export const REDEMPTION_TYPES = ["IN_PERSON"] as const;
export type RedemptionType = typeof REDEMPTION_TYPES[number];

// Discount type enum values
export const DISCOUNT_TYPES = ["PERCENT", "AMOUNT", "BOGO", "OTHER"] as const;
export type DiscountType = typeof DISCOUNT_TYPES[number];

// Deals - Special offers and promotions from vendors
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  vendorUserId: varchar("vendor_user_id").references(() => users.id), // Direct link to vendor's user account
  restaurantId: varchar("restaurant_id").references(() => restaurants.id), // For restaurant-specific deals
  
  // Deal Content
  title: varchar("title", { length: 80 }).notNull(),
  description: text("description").notNull(),
  finePrint: text("fine_print"), // Terms and conditions
  imageUrl: text("image_url"), // Deal image (original field)
  heroImageUrl: text("hero_image_url"), // Deal hero image (new field)
  category: varchar("category", { length: 32 }), // restaurant, retail, service, other
  city: text("city").default("Fort Myers"),
  valueLabel: varchar("value_label", { length: 50 }), // e.g., "$5+ value", "BOGO", etc.
  
  // Deal Value
  savingsAmount: integer("savings_amount"), // Dollar value saved (e.g., 5 = "Save $5")
  discountType: text("discount_type").default("OTHER"), // PERCENT, AMOUNT, BOGO, OTHER
  discountValue: doublePrecision("discount_value"), // Numeric value (e.g., 20 for 20% off)
  discountCode: varchar("discount_code", { length: 50 }), // Optional promo/discount code for the deal
  
  // Deal Classification
  tier: text("tier").notNull().default("free"), // "free" | "premium" (legacy support)
  isFree: boolean("is_free").notNull().default(false), // Free deal shown to everyone
  isPassLocked: boolean("is_pass_locked").notNull().default(true), // Locked unless subscribed
  dealType: varchar("deal_type", { length: 32 }).notNull().default("other"), // percent_off, amount_off, bogo, free_item, fixed_price, other
  redemptionType: text("redemption_type").default("IN_PERSON"), // How deal is redeemed
  
  // Vendor Deal Management
  status: varchar("status", { length: 16 }).notNull().default("published"), // published, paused, draft
  
  // Redemption Limits
  maxRedemptionsTotal: integer("max_redemptions_total"), // Total redemptions allowed for this deal
  maxRedemptionsPerUser: integer("max_redemptions_per_user").notNull().default(1), // Per-user limit
  cooldownHours: integer("cooldown_hours").default(168), // Hours before same user can claim again (default 1 week)
  redemptionFrequency: text("redemption_frequency").notNull().default("unlimited"), // "once" | "weekly" | "monthly" | "unlimited" | "custom" - user-friendly redemption limit
  customRedemptionDays: integer("custom_redemption_days"), // Number of days for custom redemption frequency
  
  // Availability
  startsAt: timestamp("starts_at"), // When deal becomes valid
  endsAt: timestamp("ends_at"), // When deal expires
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("deals_vendor_user_id_idx").on(table.vendorUserId),
  index("deals_status_idx").on(table.status),
]);

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// Deal Redemptions - Simple button-based redemption system
export const dealRedemptions = pgTable("deal_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id), // Business that owns the deal
  userId: varchar("user_id").notNull().references(() => users.id), // Consumer who redeemed
  
  // Status tracking: redeemed | voided
  status: varchar("status", { length: 16 }).notNull().default("redeemed"),
  
  // Source tracking (mobile, web, etc.)
  source: varchar("source", { length: 16 }),
  
  // Redemption timestamp
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  voidedAt: timestamp("voided_at"),
  voidReason: text("void_reason"),
  
  // Future points system support (do not implement points logic yet)
  pointsEarned: integer("points_earned").notNull().default(0),
  pointsStatus: varchar("points_status", { length: 16 }), // pending | approved | reversed
  
  // Flexible metadata for future expansion
  metadata: jsonb("metadata"),
  
  // Legacy fields kept for backward compatibility (deprecated)
  code: varchar("code", { length: 16 }),
  vendorUserId: varchar("vendor_user_id").references(() => users.id),
  issuedAt: timestamp("issued_at"),
  expiresAt: timestamp("expires_at"),
  verifiedAt: timestamp("verified_at"),
  redemptionCode: varchar("redemption_code", { length: 16 }),
  claimedAt: timestamp("claimed_at"),
  claimExpiresAt: timestamp("claim_expires_at"),
  verifiedByPin: boolean("verified_by_pin").default(true),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Indexes for efficient querying
  index("redemptions_user_redeemed_idx").on(table.userId, table.redeemedAt),
  index("redemptions_vendor_redeemed_idx").on(table.vendorId, table.redeemedAt),
  index("redemptions_deal_redeemed_idx").on(table.dealId, table.redeemedAt),
  index("redemptions_deal_user_status_idx").on(table.dealId, table.userId, table.status),
]);

export const insertDealRedemptionSchema = createInsertSchema(dealRedemptions).omit({
  id: true,
  redeemedAt: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  // Legacy fields - omit from insert
  code: true,
  vendorUserId: true,
  issuedAt: true,
  expiresAt: true,
  verifiedAt: true,
  redemptionCode: true,
  claimedAt: true,
  claimExpiresAt: true,
  verifiedByPin: true,
  notes: true,
});

export type InsertDealRedemption = z.infer<typeof insertDealRedemptionSchema>;
export type DealRedemption = typeof dealRedemptions.$inferSelect;

// ===== USER FAVORITES =====

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("favorites_user_idx").on(table.userId),
  index("favorites_deal_idx").on(table.dealId),
  index("favorites_user_deal_idx").on(table.userId, table.dealId),
]);

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// ===== RESTAURANT RESERVATION SYSTEM =====

// Reservations - Rise Local tracking only (not inventory control)
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  dealRedemptionId: varchar("deal_redemption_id").references(() => dealRedemptions.id), // Optional: linked deal redemption
  
  // Reservation Details
  partySize: integer("party_size").notNull(),
  requestedTime: timestamp("requested_time").notNull(),
  status: text("status").notNull().default("INITIATED"), // INITIATED, BOOKED_EXTERNALLY, CANCELLED
  
  // External Provider Tracking
  externalProvider: text("external_provider"), // OPENTABLE, SEVENROOMS, RESY, WEBSITE, PHONE
  externalReference: text("external_reference"), // Confirmation number or reference from external system
  
  // Notes
  specialRequests: text("special_requests"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;

// ===== PREFERRED PLACEMENTS (PAID ADVERTISING) =====

// Placement status enum values
export const PLACEMENT_STATUSES = ["active", "scheduled", "expired", "paused"] as const;
export type PlacementStatus = typeof PLACEMENT_STATUSES[number];

// Preferred Placements - Paid advertising spots for vendors
export const preferredPlacements = pgTable("preferred_placements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  
  // Placement Details
  placement: text("placement").notNull(), // e.g., "discover_spotlight"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("scheduled"), // active, scheduled, expired, paused
  
  // Pricing
  pricePerDay: integer("price_per_day").notNull().default(20), // In dollars
  
  // Priority (higher = shown first when multiple active)
  priority: integer("priority").notNull().default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPreferredPlacementSchema = createInsertSchema(preferredPlacements).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.union([
    z.date(),
    z.string().refine((str) => !isNaN(Date.parse(str)), {
      message: "Invalid date format"
    }).transform((str) => new Date(str))
  ]),
  endDate: z.union([
    z.date(),
    z.string().refine((str) => !isNaN(Date.parse(str)), {
      message: "Invalid date format"
    }).transform((str) => new Date(str))
  ]),
});

export type InsertPreferredPlacement = z.infer<typeof insertPreferredPlacementSchema>;
export type PreferredPlacement = typeof preferredPlacements.$inferSelect;

// Placement Impressions - Track views of placements
export const placementImpressions = pgTable("placement_impressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placementId: varchar("placement_id").notNull().references(() => preferredPlacements.id),
  userId: varchar("user_id").references(() => users.id), // Optional: may be anonymous
  sessionId: text("session_id"), // For deduplication
  viewedAt: timestamp("viewed_at").defaultNow(),
});

export const insertPlacementImpressionSchema = createInsertSchema(placementImpressions).omit({
  id: true,
  viewedAt: true,
});

export type InsertPlacementImpression = z.infer<typeof insertPlacementImpressionSchema>;
export type PlacementImpression = typeof placementImpressions.$inferSelect;

// Placement Clicks - Track clicks on placements
export const placementClicks = pgTable("placement_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placementId: varchar("placement_id").notNull().references(() => preferredPlacements.id),
  userId: varchar("user_id").references(() => users.id), // Optional: may be anonymous
  clickedAt: timestamp("clicked_at").defaultNow(),
});

export const insertPlacementClickSchema = createInsertSchema(placementClicks).omit({
  id: true,
  clickedAt: true,
});

export type InsertPlacementClick = z.infer<typeof insertPlacementClickSchema>;
export type PlacementClick = typeof placementClicks.$inferSelect;

// ===== VENDOR PROFILE API TYPES =====

// Deal type for vendor profile responses
export type VendorDeal = {
  id: string;
  title: string;
  description: string;
  dealType: string;
  tier: string;
  category: string | null;
  isActive: boolean;
  discountType: string | null;
  discountValue: number | null;
  isPassLocked: boolean | null;
  finePrint: string | null;
};

// Vendor profile with all public fields
export type VendorProfile = {
  id: string;
  vendorType: string;
  businessName: string;
  displayName: string | null;
  tagline: string | null;
  bio: string;
  
  // Images
  logoUrl: string | null;
  bannerUrl: string | null;
  heroImageUrl: string | null;
  gallery: string[];
  
  // Contact
  contactEmail: string | null;
  phone: string | null;
  
  // Social/Online
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  twitter: string | null;
  
  // Location
  address: string | null;
  city: string;
  state: string;
  zipCode: string;
  latitude: string | null;
  longitude: string | null;
  
  // Business details
  hours: unknown;
  locationType: string;
  serviceOptions: string[];
  
  // Menu (for dine vendors)
  menuUrl: string | null;
  menuFileUrl: string | null;
  menuType: string | null;
  
  // Trust signals
  values: string[];
  badges: string[];
  isVerified: boolean;
  followerCount: number;
};

// Full vendor profile response including deals
export type VendorProfileResponse = {
  vendor: VendorProfile;
  deals: VendorDeal[];
};

// Zod schema for PATCH /api/vendors/me validation
export const updateVendorProfileSchema = z.object({
  // Business info
  businessName: z.string().min(1).optional(),
  displayName: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  bio: z.string().min(1).optional(),
  
  // Images (stored as URLs)
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  heroImageUrl: z.string().url().nullable().optional(),
  gallery: z.array(z.string().url()).optional(),
  
  // Contact
  contactEmail: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  
  // Social links
  website: z.string().url().nullable().optional(),
  instagram: z.string().nullable().optional(),
  tiktok: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  youtube: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  
  // Address
  address: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  
  // Hours
  hours: z.record(z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().optional(),
  })).nullable().optional(),
  
  // Menu options
  menuUrl: z.string().url().nullable().optional(),
  menuFileUrl: z.string().url().nullable().optional(),
  menuType: z.enum(["link", "file"]).nullable().optional(),
  
  // Values/badges
  values: z.array(z.string()).optional(),
}).strict();

export type UpdateVendorProfile = z.infer<typeof updateVendorProfileSchema>;
