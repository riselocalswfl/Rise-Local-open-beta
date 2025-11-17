import { 
  type User, type InsertUser, type UpsertUser,
  type Vendor, type InsertVendor,
  type Product, type InsertProduct,
  type Event, type InsertEvent,
  type EventRsvp, type InsertEventRsvp,
  type Attendance, type InsertAttendance,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type MasterOrder, type InsertMasterOrder,
  type VendorOrder, type InsertVendorOrder,
  type Spotlight, type InsertSpotlight,
  type VendorReview, type InsertVendorReview,
  type VendorFAQ, type InsertVendorFAQ,
  type Restaurant, type InsertRestaurant,
  type MenuItem, type InsertMenuItem,
  type RestaurantReview, type InsertRestaurantReview,
  type RestaurantFAQ, type InsertRestaurantFAQ,
  type LoyaltyTier, type InsertLoyaltyTier,
  type LoyaltyTransaction, type InsertLoyaltyTransaction,
  type ServiceProvider, type InsertServiceProvider,
  type ServiceOffering, type InsertServiceOffering,
  type ServiceBooking, type InsertServiceBooking,
  type Service, type InsertService,
  type Message, type InsertMessage,
  type FulfillmentDetails,
  users, vendors, products, events, eventRsvps, attendances, orders, orderItems, masterOrders, vendorOrders, spotlight, vendorReviews, vendorFAQs,
  restaurants, menuItems, restaurantReviews, restaurantFAQs, loyaltyTiers, loyaltyTransactions,
  serviceProviders, serviceOfferings, serviceBookings, services, messages,
  fulfillmentDetailsSchema
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
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>; // For Replit Auth
  updateUser(id: string, data: Partial<InsertUser>): Promise<void>;
  deleteUser(id: string): Promise<void>;
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

  // Menu Item operations
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  getMenuItemsByVendor(vendorId: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<void>;
  deleteMenuItem(id: string): Promise<void>;

  // Service operations
  getService(id: string): Promise<Service | undefined>;
  getServicesByVendor(vendorId: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<InsertService>): Promise<void>;
  deleteService(id: string): Promise<void>;

  // Event operations
  getEvent(id: string): Promise<Event | undefined>;
  getEvents(): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  updateEventRsvp(id: string, increment: number): Promise<void>;

  // Event RSVP operations
  createEventRsvp(rsvp: InsertEventRsvp): Promise<EventRsvp>;
  updateEventRsvpStatus(userId: string, eventId: string, status: string): Promise<void>;
  deleteEventRsvp(userId: string, eventId: string): Promise<void>;
  getUserEventRsvp(userId: string, eventId: string): Promise<EventRsvp | undefined>;
  getUserRsvps(userId: string): Promise<EventRsvp[]>;
  
  // Event Attendance operations
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getUserAttendance(userId: string, eventId: string): Promise<Attendance | undefined>;
  getUserAttendances(userId: string): Promise<Attendance[]>;

  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrders(): Promise<Order[]>;
  getOrdersByEmail(email: string): Promise<Order[]>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrdersByVendor(vendorId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  createOrdersBatch(orderData: Array<{
    userId: string;
    vendorId: string;
    status: string;
    email: string;
    name: string;
    phone: string;
    totals: { subtotalCents: number; taxCents: number; feesCents: number; totalCents: number; };
    fulfillmentDetails: FulfillmentDetails;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      priceCents: number;
      variant?: string;
    }>;
  }>): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<void>;
  deleteOrder(id: string): Promise<void>;

  // Order item operations
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Multi-Vendor Checkout operations
  createMasterOrder(order: InsertMasterOrder): Promise<MasterOrder>;
  getMasterOrder(id: string): Promise<MasterOrder | undefined>;
  getMasterOrdersByBuyer(buyerId: string): Promise<MasterOrder[]>;
  createVendorOrder(order: InsertVendorOrder): Promise<VendorOrder>;
  getVendorOrder(id: string): Promise<VendorOrder | undefined>;
  getVendorOrdersByMaster(masterOrderId: string): Promise<VendorOrder[]>;
  getVendorOrdersByVendor(vendorId: string): Promise<VendorOrder[]>;
  getVendorOrdersByBuyer(buyerId: string): Promise<VendorOrder[]>;
  updateVendorOrderStatus(id: string, status: string): Promise<void>;
  updateVendorOrderPaymentStatus(id: string, paymentStatus: string): Promise<void>;

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
  getVendorFAQ(id: string): Promise<VendorFAQ | undefined>;
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
  getAllRestaurantValues(): Promise<string[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<void>;
  deleteRestaurant(id: string): Promise<void>;
  updateRestaurantVerification(id: string, isVerified: boolean): Promise<void>;
  
  // Combined operations
  getAllUniqueValues(): Promise<string[]>;

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
  getRestaurantFAQ(id: string): Promise<RestaurantFAQ | undefined>;
  getRestaurantFAQs(restaurantId: string): Promise<RestaurantFAQ[]>;
  createRestaurantFAQ(faq: InsertRestaurantFAQ): Promise<RestaurantFAQ>;
  updateRestaurantFAQ(id: string, data: Partial<InsertRestaurantFAQ>): Promise<void>;
  deleteRestaurantFAQ(id: string): Promise<void>;

  // Extended Restaurant Event operations
  getEventsByRestaurant(restaurantId: string): Promise<Event[]>;

  // Service Provider operations
  getServiceProvider(id: string): Promise<ServiceProvider | undefined>;
  getServiceProviderByOwnerId(ownerId: string): Promise<ServiceProvider | undefined>;
  getServiceProviders(): Promise<ServiceProvider[]>;
  getVerifiedServiceProviders(): Promise<ServiceProvider[]>;
  getServiceProvidersByCategory(category: string): Promise<ServiceProvider[]>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(id: string, data: Partial<InsertServiceProvider>): Promise<void>;
  deleteServiceProvider(id: string): Promise<void>;

  // Service Offering operations
  getServiceOffering(id: string): Promise<ServiceOffering | undefined>;
  getServiceOfferings(providerId: string): Promise<ServiceOffering[]>;
  createServiceOffering(offering: InsertServiceOffering): Promise<ServiceOffering>;
  updateServiceOffering(id: string, data: Partial<InsertServiceOffering>): Promise<void>;
  deleteServiceOffering(id: string): Promise<void>;

  // Service Booking operations
  getServiceBooking(id: string): Promise<ServiceBooking | undefined>;
  getServiceBookings(userId: string): Promise<ServiceBooking[]>;
  getProviderBookings(providerId: string): Promise<ServiceBooking[]>;
  createServiceBooking(booking: InsertServiceBooking): Promise<ServiceBooking>;
  updateServiceBooking(id: string, data: Partial<InsertServiceBooking>): Promise<void>;
  updateBookingStatus(id: string, status: string): Promise<void>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversations(userId: string): Promise<Array<{
    otherUserId: string;
    otherUserName: string;
    otherUserEmail: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
  }>>;
  getMessages(userId: string, otherUserId: string): Promise<Message[]>;
  markMessagesAsRead(userId: string, senderId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
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
      // Update existing user (exclude id to prevent FK violations)
      const { id, ...updateData } = userData;
      const [user] = await db
        .update(users)
        .set({
          ...updateData,
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
    // Products no longer have a category field - they inherit from vendors
    // This method is deprecated but kept for interface compatibility
    return [];
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

  // Menu Item operations
  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const result = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return result[0];
  }

  async getMenuItemsByVendor(vendorId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.vendorId, vendorId));
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const result = await db.insert(menuItems).values(menuItem as any).returning();
    return result[0];
  }

  async updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<void> {
    await db.update(menuItems).set(data as any).where(eq(menuItems.id, id));
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Service operations
  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id));
    return result[0];
  }

  async getServicesByVendor(vendorId: string): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.vendorId, vendorId));
  }

  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values(service as any).returning();
    return result[0];
  }

  async updateService(id: string, data: Partial<InsertService>): Promise<void> {
    await db.update(services).set(data as any).where(eq(services.id, id));
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
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

  // Event RSVP operations
  async createEventRsvp(rsvp: InsertEventRsvp): Promise<EventRsvp> {
    const result = await db.insert(eventRsvps).values(rsvp).returning();
    return result[0];
  }

  async updateEventRsvpStatus(userId: string, eventId: string, status: string): Promise<void> {
    await db.update(eventRsvps)
      .set({ status })
      .where(and(eq(eventRsvps.userId, userId), eq(eventRsvps.eventId, eventId)));
  }

  async deleteEventRsvp(userId: string, eventId: string): Promise<void> {
    await db.delete(eventRsvps)
      .where(and(eq(eventRsvps.userId, userId), eq(eventRsvps.eventId, eventId)));
  }

  async getUserEventRsvp(userId: string, eventId: string): Promise<EventRsvp | undefined> {
    const result = await db.select().from(eventRsvps)
      .where(and(eq(eventRsvps.userId, userId), eq(eventRsvps.eventId, eventId)));
    return result[0];
  }

  async getUserRsvps(userId: string): Promise<EventRsvp[]> {
    return await db.select().from(eventRsvps)
      .where(eq(eventRsvps.userId, userId));
  }

  // Event Attendance operations
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendances).values(attendance).returning();
    return result[0];
  }

  async getUserAttendance(userId: string, eventId: string): Promise<Attendance | undefined> {
    const result = await db.select().from(attendances)
      .where(and(eq(attendances.userId, userId), eq(attendances.eventId, eventId)));
    return result[0];
  }

  async getUserAttendances(userId: string): Promise<Attendance[]> {
    return await db.select().from(attendances)
      .where(eq(attendances.userId, userId));
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

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByVendor(vendorId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.vendorId, vendorId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async createOrdersBatch(orderData: Array<{
    userId: string;
    vendorId: string;
    status: string;
    email: string;
    name: string;
    phone: string;
    totals: { subtotalCents: number; taxCents: number; feesCents: number; totalCents: number; };
    fulfillmentDetails: FulfillmentDetails;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      priceCents: number;
      variant?: string;
    }>;
  }>): Promise<Order[]> {
    return await db.transaction(async (tx) => {
      const createdOrders: Order[] = [];
      
      for (const orderInfo of orderData) {
        const { userId, vendorId, status, email, name, phone, totals, fulfillmentDetails, items } = orderInfo;
        
        const validatedFulfillment = fulfillmentDetailsSchema.parse(fulfillmentDetails);
        const fulfillmentType = validatedFulfillment.type;
        
        const itemsJsonSnapshot = items.map(({ productId, productName, quantity, priceCents, variant }) => ({
          productId,
          name: productName,
          quantity,
          priceCents,
          variant,
        }));
        
        const orderInsert: InsertOrder = {
          userId,
          vendorId,
          email,
          name,
          phone,
          status,
          itemsJson: itemsJsonSnapshot,
          subtotalCents: totals.subtotalCents,
          taxCents: totals.taxCents,
          feesCents: totals.feesCents,
          totalCents: totals.totalCents,
          fulfillmentType,
          fulfillmentDetails: validatedFulfillment,
        };
        
        const [createdOrder] = await tx.insert(orders).values(orderInsert).returning();
        
        const orderItemsToInsert: InsertOrderItem[] = items.map(item => ({
          orderId: createdOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: (item.priceCents / 100).toFixed(2),
        }));
        
        await tx.insert(orderItems).values(orderItemsToInsert);
        
        createdOrders.push(createdOrder);
      }
      
      return createdOrders;
    });
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

  // Multi-Vendor Checkout operations
  async createMasterOrder(order: InsertMasterOrder): Promise<MasterOrder> {
    const result = await db.insert(masterOrders).values(order).returning();
    return result[0];
  }

  async getMasterOrder(id: string): Promise<MasterOrder | undefined> {
    const result = await db.select().from(masterOrders).where(eq(masterOrders.id, id));
    return result[0];
  }

  async getMasterOrdersByBuyer(buyerId: string): Promise<MasterOrder[]> {
    return await db.select().from(masterOrders)
      .where(eq(masterOrders.buyerId, buyerId))
      .orderBy(desc(masterOrders.createdAt));
  }

  async createVendorOrder(order: InsertVendorOrder): Promise<VendorOrder> {
    const result = await db.insert(vendorOrders).values(order).returning();
    return result[0];
  }

  async getVendorOrder(id: string): Promise<VendorOrder | undefined> {
    const result = await db.select().from(vendorOrders).where(eq(vendorOrders.id, id));
    return result[0];
  }

  async getVendorOrdersByMaster(masterOrderId: string): Promise<VendorOrder[]> {
    return await db.select().from(vendorOrders)
      .where(eq(vendorOrders.masterOrderId, masterOrderId))
      .orderBy(desc(vendorOrders.createdAt));
  }

  async getVendorOrdersByVendor(vendorId: string): Promise<VendorOrder[]> {
    return await db.select().from(vendorOrders)
      .where(eq(vendorOrders.vendorId, vendorId))
      .orderBy(desc(vendorOrders.createdAt));
  }

  async getVendorOrdersByBuyer(buyerId: string): Promise<VendorOrder[]> {
    return await db.select().from(vendorOrders)
      .where(eq(vendorOrders.buyerId, buyerId))
      .orderBy(desc(vendorOrders.createdAt));
  }

  async updateVendorOrderStatus(id: string, status: string): Promise<void> {
    await db.update(vendorOrders).set({ status, updatedAt: new Date() }).where(eq(vendorOrders.id, id));
  }

  async updateVendorOrderPaymentStatus(id: string, paymentStatus: string): Promise<void> {
    await db.update(vendorOrders).set({ paymentStatus, updatedAt: new Date() }).where(eq(vendorOrders.id, id));
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
  async getVendorFAQ(id: string): Promise<VendorFAQ | undefined> {
    const result = await db.select().from(vendorFAQs).where(eq(vendorFAQs.id, id));
    return result[0];
  }

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
      .where(eq(events.vendorId, vendorId))
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

  async getAllRestaurantValues(): Promise<string[]> {
    const allRestaurants = await db.select().from(restaurants);
    const allValues = new Set<string>();
    
    for (const restaurant of allRestaurants) {
      if (restaurant.badges && Array.isArray(restaurant.badges)) {
        restaurant.badges.forEach((value: string) => {
          if (value && value.trim()) {
            allValues.add(value.trim().toLowerCase());
          }
        });
      }
    }
    
    return Array.from(allValues).sort();
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
  async getRestaurantFAQ(id: string): Promise<RestaurantFAQ | undefined> {
    const result = await db.select().from(restaurantFAQs).where(eq(restaurantFAQs.id, id));
    return result[0];
  }

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

  // Combined operations
  async getAllUniqueValues(): Promise<string[]> {
    const [vendorValues, restaurantValues] = await Promise.all([
      this.getAllVendorValues(),
      this.getAllRestaurantValues()
    ]);
    
    const allValues = new Set([...vendorValues, ...restaurantValues]);
    return Array.from(allValues).sort();
  }

  // Extended Restaurant Event operations
  async getEventsByRestaurant(restaurantId: string): Promise<Event[]> {
    return await db.select().from(events)
      .where(eq(events.restaurantId, restaurantId))
      .orderBy(events.dateTime);
  }

  // Service Provider operations
  async getServiceProvider(id: string): Promise<ServiceProvider | undefined> {
    const result = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id));
    return result[0];
  }

  async getServiceProviderByOwnerId(ownerId: string): Promise<ServiceProvider | undefined> {
    const result = await db.select().from(serviceProviders).where(eq(serviceProviders.ownerId, ownerId));
    return result[0];
  }

  async getServiceProviders(): Promise<ServiceProvider[]> {
    return await db.select().from(serviceProviders).orderBy(desc(serviceProviders.createdAt));
  }

  async getVerifiedServiceProviders(): Promise<ServiceProvider[]> {
    return await db.select().from(serviceProviders)
      .where(eq(serviceProviders.isVerified, true))
      .orderBy(desc(serviceProviders.isFeatured), desc(serviceProviders.createdAt));
  }

  async getServiceProvidersByCategory(category: string): Promise<ServiceProvider[]> {
    // Service providers now use categories array - use client-side filtering instead
    // This method is deprecated but kept for interface compatibility
    return [];
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const result = await db.insert(serviceProviders).values(provider).returning();
    return result[0];
  }

  async updateServiceProvider(id: string, data: Partial<InsertServiceProvider>): Promise<void> {
    await db.update(serviceProviders).set(data).where(eq(serviceProviders.id, id));
  }

  async deleteServiceProvider(id: string): Promise<void> {
    await db.delete(serviceProviders).where(eq(serviceProviders.id, id));
  }

  // Service Offering operations
  async getServiceOffering(id: string): Promise<ServiceOffering | undefined> {
    const result = await db.select().from(serviceOfferings).where(eq(serviceOfferings.id, id));
    return result[0];
  }

  async getServiceOfferings(providerId: string): Promise<ServiceOffering[]> {
    return await db.select().from(serviceOfferings)
      .where(eq(serviceOfferings.serviceProviderId, providerId))
      .orderBy(serviceOfferings.displayOrder, desc(serviceOfferings.createdAt));
  }

  async createServiceOffering(offering: InsertServiceOffering): Promise<ServiceOffering> {
    const result = await db.insert(serviceOfferings).values(offering).returning();
    return result[0];
  }

  async updateServiceOffering(id: string, data: Partial<InsertServiceOffering>): Promise<void> {
    await db.update(serviceOfferings).set(data).where(eq(serviceOfferings.id, id));
  }

  async deleteServiceOffering(id: string): Promise<void> {
    await db.delete(serviceOfferings).where(eq(serviceOfferings.id, id));
  }

  // Service Booking operations
  async getServiceBooking(id: string): Promise<ServiceBooking | undefined> {
    const result = await db.select().from(serviceBookings).where(eq(serviceBookings.id, id));
    return result[0];
  }

  async getServiceBookings(userId: string): Promise<ServiceBooking[]> {
    return await db.select().from(serviceBookings)
      .where(eq(serviceBookings.userId, userId))
      .orderBy(desc(serviceBookings.createdAt));
  }

  async getProviderBookings(providerId: string): Promise<ServiceBooking[]> {
    return await db.select().from(serviceBookings)
      .where(eq(serviceBookings.serviceProviderId, providerId))
      .orderBy(desc(serviceBookings.createdAt));
  }

  async createServiceBooking(booking: InsertServiceBooking): Promise<ServiceBooking> {
    const result = await db.insert(serviceBookings).values(booking).returning();
    return result[0];
  }

  async updateServiceBooking(id: string, data: Partial<InsertServiceBooking>): Promise<void> {
    await db.update(serviceBookings).set(data).where(eq(serviceBookings.id, id));
  }

  async updateBookingStatus(id: string, status: string): Promise<void> {
    await db.update(serviceBookings).set({ status }).where(eq(serviceBookings.id, id));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getConversations(userId: string): Promise<Array<{
    otherUserId: string;
    otherUserName: string;
    otherUserEmail: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
  }>> {
    // Get all distinct conversation partners
    const conversationPartners = await db
      .selectDistinctOn([sql`CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`], {
        otherUserId: sql<string>`CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`,
      })
      .from(messages)
      .where(
        sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`
      );

    // For each partner, get user info and last message
    const conversations = await Promise.all(
      conversationPartners.map(async ({ otherUserId }) => {
        const otherUser = await this.getUser(otherUserId);
        
        // Get last message in conversation
        const lastMsg = await db
          .select()
          .from(messages)
          .where(
            sql`(${messages.senderId} = ${userId} AND ${messages.receiverId} = ${otherUserId}) OR (${messages.senderId} = ${otherUserId} AND ${messages.receiverId} = ${userId})`
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Count unread messages from this person
        const unreadResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, otherUserId),
              eq(messages.receiverId, userId),
              eq(messages.isRead, false)
            )
          );

        return {
          otherUserId,
          otherUserName: otherUser?.firstName && otherUser?.lastName 
            ? `${otherUser.firstName} ${otherUser.lastName}`
            : otherUser?.username || 'Unknown User',
          otherUserEmail: otherUser?.email || '',
          lastMessage: lastMsg[0]?.content || '',
          lastMessageTime: lastMsg[0]?.createdAt || new Date(),
          unreadCount: unreadResult[0]?.count || 0,
        };
      })
    );

    // Sort by last message time
    return conversations.sort((a, b) => 
      b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
    );
  }

  async getMessages(userId: string, otherUserId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        sql`(${messages.senderId} = ${userId} AND ${messages.receiverId} = ${otherUserId}) OR (${messages.senderId} = ${otherUserId} AND ${messages.receiverId} = ${userId})`
      )
      .orderBy(messages.createdAt);
  }

  async markMessagesAsRead(userId: string, senderId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.senderId, senderId),
          eq(messages.isRead, false)
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }
}

export const storage = new DbStorage();
