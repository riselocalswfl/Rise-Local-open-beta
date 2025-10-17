import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { ValueTag } from "./values";

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
  userValues: text("user_values").array().default(sql`'{}'::text[]`).$type<ValueTag[]>(), // buyer's value preferences
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
  contactName: text("contact_name").notNull(),
  bio: text("bio").notNull(), // min 280 chars enforced in validation
  
  // Categories
  category: text("category").notNull(), // single required: Produce, Baked Goods, etc.
  subcategories: text("subcategories").array().default(sql`'{}'::text[]`),
  
  // Media
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  
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
  hours: text("hours"), // JSON string of operating hours
  
  // Business Values (custom tags created by vendor)
  values: text("values").array().default(sql`'{}'::text[]`), // custom value tags vendors create themselves
  
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
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizerId: varchar("organizer_id").notNull().references(() => vendors.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dateTime: timestamp("date_time").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull(),
  ticketsAvailable: integer("tickets_available").notNull(),
  rsvpCount: integer("rsvp_count").notNull().default(0),
});

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
