import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  role: text("role").notNull().default("buyer"), // buyer, vendor, admin
  phone: text("phone"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  loyaltyPoints: true,
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
  
  // Business Profile
  businessName: text("business_name").notNull(),
  displayName: text("display_name"), // defaults to businessName if not provided
  tagline: text("tagline"), // short description (e.g., "Seasonal produce grown with regenerative practices")
  contactName: text("contact_name").notNull(),
  bio: text("bio").notNull(), // min 280 chars enforced in validation
  
  // Categories
  category: text("category").notNull(), // single required: Produce, Baked Goods, etc.
  subcategories: text("subcategories").array().default(sql`'{}'::text[]`),
  
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
  certifications: jsonb("certifications"), // [{name, type, issuedOn, docUrl}]
  
  // Fulfillment & Contact
  fulfillmentOptions: jsonb("fulfillment_options"), // [{type, name, address, days, time, fee}]
  contact: jsonb("contact"), // {email, phone, preferredContact}
  
  // Policies
  policies: jsonb("policies"), // {refund, cancellation, allergen, safety}
  
  // Payment
  paymentMethod: text("payment_method").notNull(), // Direct to Vendor or Through Platform
  paymentHandles: jsonb("payment_handles"), // {venmo: "@username", square: "id", etc.}
  
  // Membership & Verification
  isFoundingMember: boolean("is_founding_member").notNull().default(false), // First 25 vendors
  isVerified: boolean("is_verified").notNull().default(false),
  
  // Restaurant-specific (Eat Local)
  restaurantSources: text("restaurant_sources"), // sources locally from
  localMenuPercent: integer("local_menu_percent"), // % of menu sourced locally
  menuUrl: text("menu_url"),
  
  // Compliance
  termsAccepted: boolean("terms_accepted").notNull().default(true),
  privacyAccepted: boolean("privacy_accepted").notNull().default(true),
  marketingConsent: boolean("marketing_consent").default(false),
  ein: text("ein"), // optional for MVP
  
  // Legacy/Analytics
  followerCount: integer("follower_count").notNull().default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  followerCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull(),
  category: text("category"),
  description: text("description"),
  imageUrl: text("image_url"),
  
  // Sourcing & Transparency
  valueTags: text("value_tags").array().default(sql`'{}'::text[]`), // custom value tags defined by vendor
  sourceFarm: text("source_farm"), // where product is sourced from
  harvestDate: timestamp("harvest_date"), // when product was harvested
  leadTimeDays: integer("lead_time_days").default(0), // days needed to prepare order
  inventoryStatus: text("inventory_status").default("in_stock"), // "in_stock", "limited", "out_of_stock"
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
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
  category: text("category").notNull(),
  ticketsAvailable: integer("tickets_available").notNull(),
  rsvpCount: integer("rsvp_count").notNull().default(0),
}, (table) => ({
  // Check constraint: exactly one of vendorId or restaurantId must be set
  organizerCheck: sql`CHECK ((vendor_id IS NOT NULL AND restaurant_id IS NULL) OR (vendor_id IS NULL AND restaurant_id IS NOT NULL))`
}));

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  rsvpCount: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull().default("pending"),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  shippingMethod: text("shipping_method").notNull(),
  addressJson: jsonb("address_json"),
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
  cuisineType: text("cuisine_type").notNull(), // Italian, Mexican, Farm-to-Table, etc.
  cuisineTypes: text("cuisine_types").array().default(sql`'{}'::text[]`),
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
  
  // Membership & Verification
  isFoundingMember: boolean("is_founding_member").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
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
  restaurantId: varchar("restaurant_id").notNull().references(() => restaurants.id),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  category: text("category").notNull(), // Appetizers, Entrees, Desserts, Drinks, etc.
  dietaryTags: text("dietary_tags").array().default(sql`'{}'::text[]`), // Vegan, Gluten-Free, Spicy, etc.
  ingredients: text("ingredients"),
  allergens: text("allergens").array().default(sql`'{}'::text[]`),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  isFeatured: boolean("is_featured").default(false),
  displayOrder: integer("display_order").default(0),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

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

// Loyalty Tiers
export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // Bronze, Silver, Gold, Platinum
  minPoints: integer("min_points").notNull(), // minimum points to reach this tier
  maxPoints: integer("max_points"), // null for highest tier
  color: text("color").notNull(), // hex color for UI
  benefits: text("benefits").array().notNull(), // list of benefits
  discountPercent: integer("discount_percent").default(0), // percentage discount
  displayOrder: integer("display_order").notNull(),
});

export const insertLoyaltyTierSchema = createInsertSchema(loyaltyTiers).omit({
  id: true,
});

export type InsertLoyaltyTier = z.infer<typeof insertLoyaltyTierSchema>;
export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;

// Loyalty Transactions
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(), // positive for earning, negative for spending
  type: text("type").notNull(), // purchase, signup_bonus, referral, redemption, adjustment
  description: text("description").notNull(),
  relatedOrderId: varchar("related_order_id"), // reference to order if applicable
  balanceAfter: integer("balance_after").notNull(), // point balance after this transaction
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
