import { 
  type User, type InsertUser, type UpsertUser,
  type Vendor, type InsertVendor,
  type Product, type InsertProduct,
  type Event, type InsertEvent,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Spotlight, type InsertSpotlight,
  type VendorReview, type InsertVendorReview,
  type VendorFAQ, type InsertVendorFAQ,
  type Restaurant, type InsertRestaurant,
  type MenuItem, type InsertMenuItem,
  type RestaurantReview, type InsertRestaurantReview,
  type RestaurantFAQ, type InsertRestaurantFAQ,
  users, vendors, products, events, orders, orderItems, spotlight, vendorReviews, vendorFAQs,
  restaurants, menuItems, restaurantReviews, restaurantFAQs
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL!;
const client = neon(connectionString);
const db = drizzle(client);

// Export db for seed scripts
export { db };

const SALT_ROUNDS = 10;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>; // For Replit Auth
  updateUser(id: string, data: Partial<InsertUser>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  updateUserLoyaltyPoints(userId: string, points: number): Promise<void>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;

  // Vendor operations
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByOwnerId(ownerId: string): Promise<Vendor | undefined>;
  getVendors(): Promise<Vendor[]>;
  getVerifiedVendors(): Promise<Vendor[]>;
  getAllVendorValues(): Promise<string[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, data: Partial<InsertVendor>): Promise<void>;
  deleteVendor(id: string): Promise<void>;
  updateVendorVerification(id: string, isVerified: boolean): Promise<void>;

  // Product operations
  getProduct(id: string): Promise<Product | undefined>;
  getProducts(): Promise<Product[]>;
  getProductsByVendor(vendorId: string): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  updateProductInventory(id: string, inventory: number): Promise<void>;

  // Event operations
  getEvent(id: string): Promise<Event | undefined>;
  getEvents(): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  updateEventRsvp(id: string, increment: number): Promise<void>;

  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrders(): Promise<Order[]>;
  getOrdersByEmail(email: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<void>;
  deleteOrder(id: string): Promise<void>;

  // Order item operations
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Spotlight operations
  getActiveSpotlight(): Promise<Spotlight | undefined>;
  getAllSpotlights(): Promise<Spotlight[]>;
  createSpotlight(spotlightData: InsertSpotlight): Promise<Spotlight>;
  updateSpotlight(id: string, data: Partial<InsertSpotlight>): Promise<void>;
  deleteSpotlight(id: string): Promise<void>;

  // Vendor Review operations
  getVendorReviews(vendorId: string): Promise<VendorReview[]>;
  createVendorReview(review: InsertVendorReview): Promise<VendorReview>;
  deleteVendorReview(id: string): Promise<void>;

  // Vendor FAQ operations
  getVendorFAQs(vendorId: string): Promise<VendorFAQ[]>;
  createVendorFAQ(faq: InsertVendorFAQ): Promise<VendorFAQ>;
  updateVendorFAQ(id: string, data: Partial<InsertVendorFAQ>): Promise<void>;
  deleteVendorFAQ(id: string): Promise<void>;

  // Extended Event operations
  getEventsByVendor(vendorId: string): Promise<Event[]>;

  // Restaurant operations
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | undefined>;
  getRestaurants(): Promise<Restaurant[]>;
  getVerifiedRestaurants(): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<void>;
  deleteRestaurant(id: string): Promise<void>;
  updateRestaurantVerification(id: string, isVerified: boolean): Promise<void>;

  // Menu Item operations
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByRestaurant(restaurantId: string): Promise<MenuItem[]>;
  getMenuItemsByCategory(restaurantId: string, category: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<void>;
  deleteMenuItem(id: string): Promise<void>;

  // Restaurant Review operations
  getRestaurantReviews(restaurantId: string): Promise<RestaurantReview[]>;
  createRestaurantReview(review: InsertRestaurantReview): Promise<RestaurantReview>;
  deleteRestaurantReview(id: string): Promise<void>;

  // Restaurant FAQ operations
  getRestaurantFAQs(restaurantId: string): Promise<RestaurantFAQ[]>;
  createRestaurantFAQ(faq: InsertRestaurantFAQ): Promise<RestaurantFAQ>;
  updateRestaurantFAQ(id: string, data: Partial<InsertRestaurantFAQ>): Promise<void>;
  deleteRestaurantFAQ(id: string): Promise<void>;

  // Extended Restaurant Event operations
  getEventsByRestaurant(restaurantId: string): Promise<Event[]>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const values: any = { ...user };
    if (user.password) {
      values.password = await bcrypt.hash(user.password, SALT_ROUNDS);
    }
    const result = await db.insert(users).values(values).returning();
    return result[0];
  }

  // Upsert user for Replit Auth (IMPORTANT for Replit Auth integration)
  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by id (sub) or email
    const existing = await db.select().from(users).where(
      sql`${users.id} = ${userData.id} OR ${users.email} = ${userData.email}`
    ).limit(1);

    if (existing.length > 0) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      return user;
    } else {
      // Insert new user
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<void> {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }
    await db.update(users).set(updateData).where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserLoyaltyPoints(userId: string, points: number): Promise<void> {
    await db.update(users)
      .set({ loyaltyPoints: sql`${users.loyaltyPoints} + ${points}` })
      .where(eq(users.id, userId));
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Vendor operations
  async getVendor(id: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.id, id));
    return result[0];
  }

  async getVendorByOwnerId(ownerId: string): Promise<Vendor | undefined> {
    const result = await db.select().from(vendors).where(eq(vendors.ownerId, ownerId));
    return result[0];
  }

  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVerifiedVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.isVerified, true));
  }

  async getAllVendorValues(): Promise<string[]> {
    const allVendors = await db.select().from(vendors);
    const allValues = new Set<string>();
    
    for (const vendor of allVendors) {
      if (vendor.values && Array.isArray(vendor.values)) {
        vendor.values.forEach((value: string) => {
          if (value && value.trim()) {
            allValues.add(value.trim().toLowerCase());
          }
        });
      }
    }
    
    return Array.from(allValues).sort();
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const result = await db.insert(vendors).values(vendor as any).returning();
    return result[0];
  }

  async updateVendor(id: string, data: Partial<InsertVendor>): Promise<void> {
    await db.update(vendors).set(data as any).where(eq(vendors.id, id));
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  async updateVendorVerification(id: string, isVerified: boolean): Promise<void> {
    await db.update(vendors).set({ isVerified }).where(eq(vendors.id, id));
  }

  // Product operations
  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProductsByVendor(vendorId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.vendorId, vendorId));
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.category, category));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product as any).returning();
    return result[0];
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<void> {
    await db.update(products).set(data as any).where(eq(products.id, id));
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async updateProductInventory(id: string, stock: number): Promise<void> {
    await db.update(products).set({ stock }).where(eq(products.id, id));
  }

  // Event operations
  async getEvent(id: string): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }

  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return await db.select().from(events)
      .where(sql`${events.dateTime} > NOW()`)
      .orderBy(events.dateTime);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<void> {
    await db.update(events).set(data).where(eq(events.id, id));
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async updateEventRsvp(id: string, increment: number): Promise<void> {
    await db.update(events)
      .set({ rsvpCount: sql`${events.rsvpCount} + ${increment}` })
      .where(eq(events.id, id));
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.email, email))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await db.update(orders).set({ status }).where(eq(orders.id, id));
  }

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  // Order item operations
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  // Spotlight operations
  async getActiveSpotlight(): Promise<Spotlight | undefined> {
    const result = await db.select().from(spotlight)
      .where(eq(spotlight.isActive, true))
      .limit(1);
    return result[0];
  }

  async getAllSpotlights(): Promise<Spotlight[]> {
    return await db.select().from(spotlight);
  }

  async createSpotlight(spotlightData: InsertSpotlight): Promise<Spotlight> {
    const result = await db.insert(spotlight).values(spotlightData).returning();
    return result[0];
  }

  async updateSpotlight(id: string, data: Partial<InsertSpotlight>): Promise<void> {
    await db.update(spotlight).set(data).where(eq(spotlight.id, id));
  }

  async deleteSpotlight(id: string): Promise<void> {
    await db.delete(spotlight).where(eq(spotlight.id, id));
  }

  // Vendor Review operations
  async getVendorReviews(vendorId: string): Promise<VendorReview[]> {
    return await db.select().from(vendorReviews)
      .where(eq(vendorReviews.vendorId, vendorId))
      .orderBy(desc(vendorReviews.createdAt));
  }

  async createVendorReview(review: InsertVendorReview): Promise<VendorReview> {
    const result = await db.insert(vendorReviews).values(review).returning();
    return result[0];
  }

  async deleteVendorReview(id: string): Promise<void> {
    await db.delete(vendorReviews).where(eq(vendorReviews.id, id));
  }

  // Vendor FAQ operations
  async getVendorFAQs(vendorId: string): Promise<VendorFAQ[]> {
    return await db.select().from(vendorFAQs)
      .where(eq(vendorFAQs.vendorId, vendorId))
      .orderBy(vendorFAQs.displayOrder);
  }

  async createVendorFAQ(faq: InsertVendorFAQ): Promise<VendorFAQ> {
    const result = await db.insert(vendorFAQs).values(faq).returning();
    return result[0];
  }

  async updateVendorFAQ(id: string, data: Partial<InsertVendorFAQ>): Promise<void> {
    await db.update(vendorFAQs).set(data).where(eq(vendorFAQs.id, id));
  }

  async deleteVendorFAQ(id: string): Promise<void> {
    await db.delete(vendorFAQs).where(eq(vendorFAQs.id, id));
  }

  // Extended Event operations
  async getEventsByVendor(vendorId: string): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.organizerId, vendorId))
      .orderBy(events.dateTime);
  }

  // Restaurant operations
  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const result = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return result[0];
  }

  async getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | undefined> {
    const result = await db.select().from(restaurants).where(eq(restaurants.ownerId, ownerId));
    return result[0];
  }

  async getRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants);
  }

  async getVerifiedRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(eq(restaurants.isVerified, true));
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const result = await db.insert(restaurants).values(restaurant).returning();
    return result[0];
  }

  async updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<void> {
    await db.update(restaurants).set(data).where(eq(restaurants.id, id));
  }

  async deleteRestaurant(id: string): Promise<void> {
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  async updateRestaurantVerification(id: string, isVerified: boolean): Promise<void> {
    await db.update(restaurants).set({ isVerified }).where(eq(restaurants.id, id));
  }

  // Menu Item operations
  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const result = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return result[0];
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
  }

  async getMenuItemsByRestaurant(restaurantId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .orderBy(menuItems.displayOrder);
  }

  async getMenuItemsByCategory(restaurantId: string, category: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems)
      .where(and(
        eq(menuItems.restaurantId, restaurantId),
        eq(menuItems.category, category)
      ))
      .orderBy(menuItems.displayOrder);
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const result = await db.insert(menuItems).values(menuItem).returning();
    return result[0];
  }

  async updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<void> {
    await db.update(menuItems).set(data).where(eq(menuItems.id, id));
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Restaurant Review operations
  async getRestaurantReviews(restaurantId: string): Promise<RestaurantReview[]> {
    return await db.select().from(restaurantReviews)
      .where(eq(restaurantReviews.restaurantId, restaurantId))
      .orderBy(desc(restaurantReviews.createdAt));
  }

  async createRestaurantReview(review: InsertRestaurantReview): Promise<RestaurantReview> {
    const result = await db.insert(restaurantReviews).values(review).returning();
    return result[0];
  }

  async deleteRestaurantReview(id: string): Promise<void> {
    await db.delete(restaurantReviews).where(eq(restaurantReviews.id, id));
  }

  // Restaurant FAQ operations
  async getRestaurantFAQs(restaurantId: string): Promise<RestaurantFAQ[]> {
    return await db.select().from(restaurantFAQs)
      .where(eq(restaurantFAQs.restaurantId, restaurantId))
      .orderBy(restaurantFAQs.displayOrder);
  }

  async createRestaurantFAQ(faq: InsertRestaurantFAQ): Promise<RestaurantFAQ> {
    const result = await db.insert(restaurantFAQs).values(faq).returning();
    return result[0];
  }

  async updateRestaurantFAQ(id: string, data: Partial<InsertRestaurantFAQ>): Promise<void> {
    await db.update(restaurantFAQs).set(data).where(eq(restaurantFAQs.id, id));
  }

  async deleteRestaurantFAQ(id: string): Promise<void> {
    await db.delete(restaurantFAQs).where(eq(restaurantFAQs.id, id));
  }

  // Extended Restaurant Event operations
  async getEventsByRestaurant(restaurantId: string): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.organizerId, restaurantId))
      .orderBy(events.dateTime);
  }
}

export const storage = new DbStorage();
