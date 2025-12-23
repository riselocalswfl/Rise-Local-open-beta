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
  type MenuItem, type InsertMenuItem,
  type ServiceOffering, type InsertServiceOffering,
  type ServiceBooking, type InsertServiceBooking,
  type Service, type InsertService,
  type Message, type InsertMessage,
  type Deal, type InsertDeal,
  type DealRedemption, type InsertDealRedemption,
  type Reservation, type InsertReservation,
  type Restaurant,
  type FulfillmentDetails,
  type Conversation, type InsertConversation,
  type ConversationMessage, type InsertConversationMessage,
  type SenderRole,
  type Notification, type InsertNotification,
  type Category,
  type Favorite, type InsertFavorite,
  users, vendors, products, events, eventRsvps, attendances, orders, orderItems, masterOrders, vendorOrders, spotlight, vendorReviews, vendorFAQs,
  menuItems, serviceOfferings, serviceBookings, services, messages, deals, dealRedemptions,
  restaurants, serviceProviders, reservations, preferredPlacements, placementImpressions, placementClicks,
  conversations, conversationMessages, notifications, categories, favorites,
  fulfillmentDetailsSchema,
  type PreferredPlacement, type InsertPreferredPlacement, type PlacementImpression, type InsertPlacementImpression, type PlacementClick, type InsertPlacementClick
} from "@shared/schema";
import { eq, desc, and, sql, gte, lte, isNull } from "drizzle-orm";
import { calculateDistanceMiles } from "./geocoding";

// Type for deals with distance information
export interface DealWithDistance extends Deal {
  distanceMiles?: number;
  vendorLatitude?: string | null;
  vendorLongitude?: string | null;
}
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
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>; // For Replit Auth
  updateUser(id: string, data: Partial<InsertUser>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;

  // Vendor operations
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByOwnerId(ownerId: string): Promise<Vendor | undefined>;
  getVendors(): Promise<Vendor[]>;
  getAllVendorListings(): Promise<import("@shared/schema").UnifiedVendorListing[]>;
  getVerifiedVendors(): Promise<Vendor[]>;
  getAllVendorValues(): Promise<string[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, data: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: string): Promise<void>;
  updateVendorVerification(id: string, isVerified: boolean): Promise<void>;

  // Category operations
  getCategories(activeOnly?: boolean): Promise<import("@shared/schema").Category[]>;
  getCategory(id: string): Promise<import("@shared/schema").Category | undefined>;
  getCategoryByKey(key: string): Promise<import("@shared/schema").Category | undefined>;

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
  getMenuItems(): Promise<MenuItem[]>;
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

  // Message operations (legacy direct messaging)
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

  // B2C Conversation operations
  getOrCreateConversation(consumerId: string, vendorId: string, dealId?: string): Promise<Conversation>;
  getConversation(conversationId: string): Promise<Conversation | undefined>;
  getB2CConversationsForConsumer(consumerId: string): Promise<Array<{
    conversation: Conversation;
    vendorName: string;
    vendorLogoUrl: string | null;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
  }>>;
  getB2CConversationsForVendor(vendorId: string): Promise<Array<{
    conversation: Conversation;
    consumerName: string;
    consumerProfileImageUrl: string | null;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
  }>>;
  getConversationMessages(conversationId: string): Promise<ConversationMessage[]>;
  createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  markConversationMessagesAsRead(conversationId: string, recipientId: string): Promise<void>;
  getUnreadB2CMessageCount(userId: string, role: 'consumer' | 'vendor', vendorId?: string): Promise<number>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  markNotificationsByReferenceAsRead(userId: string, referenceId: string, referenceType: string): Promise<void>;

  // Deal operations
  listDeals(filters?: { category?: string; city?: string; tier?: string; isActive?: boolean; vendorId?: string; status?: string; includeAll?: boolean }): Promise<Deal[]>;
  listDealsWithLocation(filters: { 
    lat?: number; 
    lng?: number; 
    radiusMiles?: number; 
    category?: string; 
    city?: string; 
    tier?: string; 
    isActive?: boolean; 
    vendorId?: string;
    status?: string;
    includeAll?: boolean;
  }): Promise<DealWithDistance[]>;
  getDealById(id: string): Promise<Deal | undefined>;
  getDealByIdWithStatus(id: string): Promise<Deal | undefined>; // Returns deal even if deleted/inactive
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal>;
  redeemDeal(dealId: string, vendorPinEntered: string, userId?: string): Promise<{ success: boolean; message: string; redemption?: DealRedemption }>;
  getDealRedemptions(dealId: string): Promise<DealRedemption[]>;
  getVendorDealRedemptions(vendorId: string): Promise<DealRedemption[]>;

  // Reservation operations
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  getReservation(id: string): Promise<Reservation | undefined>;
  getReservationsByUser(userId: string): Promise<Reservation[]>;
  updateReservationStatus(id: string, status: string, externalRef?: string): Promise<void>;
  
  // Restaurant reservation info
  getRestaurantReservationInfo(restaurantId: string): Promise<{ 
    reservationMethod: string | null; 
    reservationUrl: string | null; 
    reservationsPhone: string | null;
    restaurantName: string;
  } | undefined>;

  // Deal Redemption operations (unified code system)
  issueDealCode(dealId: string, vendorId: string, userId: string): Promise<{ 
    success: boolean; 
    message: string; 
    redemption?: DealRedemption;
    code?: string;
    expiresAt?: Date;
  }>;
  getRedemption(id: string): Promise<DealRedemption | undefined>;
  getRedemptionByCode(code: string): Promise<DealRedemption | undefined>;
  getUserRedemptions(userId: string): Promise<DealRedemption[]>;
  getActiveRedemptionForUserDeal(userId: string, dealId: string): Promise<DealRedemption | undefined>;
  verifyRedemptionCode(code: string, vendorId: string): Promise<{ success: boolean; message: string; redemption?: DealRedemption }>;
  voidRedemption(redemptionId: string, reason?: string): Promise<DealRedemption | undefined>;
  getDealsByVendorId(vendorId: string): Promise<Deal[]>;
  getVendorRedemptions(vendorId: string): Promise<DealRedemption[]>;
  getUserVerifiedCountForDeal(userId: string, dealId: string): Promise<number>;
  getLastVerifiedRedemptionForUserDeal(userId: string, dealId: string): Promise<DealRedemption | undefined>;
  getTotalVerifiedCountForDeal(dealId: string): Promise<number>;

  // Preferred Placement operations
  getActiveDiscoverSpotlight(): Promise<{ placement: PreferredPlacement; vendor: Vendor; deals: Deal[] } | null>;
  createPreferredPlacement(placement: InsertPreferredPlacement): Promise<PreferredPlacement>;
  updatePlacementStatus(id: string, status: string): Promise<void>;
  recordPlacementImpression(placementId: string, userId?: string, sessionId?: string): Promise<PlacementImpression>;
  recordPlacementClick(placementId: string, userId?: string): Promise<PlacementClick>;
  pauseOtherSpotlights(excludePlacementId: string): Promise<void>;

  // Favorites operations
  addFavorite(userId: string, dealId: string): Promise<Favorite>;
  removeFavorite(userId: string, dealId: string): Promise<void>;
  getUserFavorites(userId: string): Promise<Favorite[]>;
  isFavorite(userId: string, dealId: string): Promise<boolean>;
  getUserFavoriteDeals(userId: string): Promise<Deal[]>;

  // Email job operations
  scheduleEmailNotification(job: {
    recipientId: string;
    recipientEmail: string;
    jobType: string;
    referenceId?: string;
    actorId?: string;
    subject: string;
    bodyPreview?: string;
    status: string;
    scheduledFor: Date;
  }): Promise<void>;
  getPendingEmailJobs(): Promise<Array<{
    id: string;
    recipientId: string;
    recipientEmail: string;
    jobType: string;
    referenceId: string | null;
    actorId: string | null;
    subject: string;
    bodyPreview: string | null;
    scheduledFor: Date;
  }>>;
  markEmailJobSent(jobId: string): Promise<void>;
  markEmailJobFailed(jobId: string): Promise<void>;
  cancelEmailJobsForConversation(conversationId: string, recipientId: string): Promise<void>;

  // User public profile
  getUserPublicProfile(userId: string): Promise<{
    id: string;
    displayName: string;
    profileImageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
  } | undefined>;
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

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
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

  async getVendorWithDeals(vendorId: string): Promise<{ vendor: Vendor; deals: Deal[] } | null> {
    const vendorResult = await db.select().from(vendors).where(eq(vendors.id, vendorId));
    if (vendorResult.length === 0) return null;

    const vendor = vendorResult[0];

    // Get active deals for this vendor
    const vendorDeals = await db
      .select()
      .from(deals)
      .where(and(
        eq(deals.vendorId, vendorId),
        eq(deals.isActive, true)
      ))
      .orderBy(desc(deals.createdAt));

    return { vendor, deals: vendorDeals };
  }

  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getAllVendorListings(): Promise<import("@shared/schema").UnifiedVendorListing[]> {
    // Fetch from unified vendors table (only completed profiles that are visible)
    const completedVendors = await db.select().from(vendors).where(
      and(
        eq(vendors.profileStatus, "complete"),
        eq(vendors.isProfileVisible, true)
      )
    );

    // Map unified vendors to listing format
    return completedVendors.map(v => ({
      id: v.id,
      vendorType: v.vendorType as "shop" | "dine" | "service",
      businessName: v.businessName,
      bio: v.bio,
      city: v.city,
      categories: [], // Categories removed from platform per replit.md
      values: (v.values as string[]) || [],
      isVerified: v.isVerified,
      followerCount: v.followerCount,
      logoUrl: v.logoUrl || undefined,
      tagline: v.tagline || undefined,
    }));
  }

  async getServiceVendors(): Promise<Vendor[]> {
    // Fetch service vendors with completed profiles that are visible
    return await db.select().from(vendors)
      .where(and(
        eq(vendors.vendorType, "service"),
        eq(vendors.profileStatus, "complete"),
        eq(vendors.isProfileVisible, true)
      ));
  }

  async getVerifiedVendors(): Promise<Vendor[]> {
    // Only return verified vendors that are visible
    return await db.select().from(vendors).where(
      and(
        eq(vendors.isVerified, true),
        eq(vendors.isProfileVisible, true)
      )
    );
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

  async updateVendor(id: string, data: Partial<InsertVendor>): Promise<Vendor> {
    // Skip update if data is empty
    if (Object.keys(data).length === 0) {
      const existing = await db.select().from(vendors).where(eq(vendors.id, id));
      return existing[0];
    }
    
    await db.update(vendors).set(data as any).where(eq(vendors.id, id));
    const updated = await db.select().from(vendors).where(eq(vendors.id, id));
    return updated[0];
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  async updateVendorVerification(id: string, isVerified: boolean): Promise<void> {
    await db.update(vendors).set({ isVerified }).where(eq(vendors.id, id));
  }

  // Category operations
  async getCategories(activeOnly: boolean = true): Promise<Category[]> {
    if (activeOnly) {
      return await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.sortOrder);
    }
    return await db.select().from(categories).orderBy(categories.sortOrder);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async getCategoryByKey(key: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.key, key));
    return result[0];
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

  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
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

  async getAllVendorOrders(): Promise<VendorOrder[]> {
    return await db.select().from(vendorOrders).orderBy(desc(vendorOrders.createdAt));
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

  // Service Offering operations
  async getServiceOffering(id: string): Promise<ServiceOffering | undefined> {
    const result = await db.select().from(serviceOfferings).where(eq(serviceOfferings.id, id));
    return result[0];
  }

  async getServiceOfferings(providerId: string): Promise<ServiceOffering[]> {
    return await db.select().from(serviceOfferings)
      .where(eq(serviceOfferings.vendorId, providerId))
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

  async getAllServiceOfferings(): Promise<ServiceOffering[]> {
    return await db.select().from(serviceOfferings);
  }

  async getAllServiceOfferingsWithProvider(): Promise<any[]> {
    // Get all active service offerings
    const offerings = await db.select().from(serviceOfferings)
      .where(eq(serviceOfferings.isActive, true))
      .orderBy(desc(serviceOfferings.isFeatured), serviceOfferings.displayOrder);
    
    // Get vendor info for each offering
    const offeringsWithProvider = await Promise.all(
      offerings.map(async (offering) => {
        const vendor = await this.getVendor(offering.vendorId);
        return {
          ...offering,
          provider: vendor ? {
            id: vendor.id,
            businessName: vendor.businessName,
            logoUrl: vendor.logoUrl,
            city: vendor.city,
            isVerified: vendor.isVerified,
          } : null,
        };
      })
    );
    
    return offeringsWithProvider;
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
      .where(eq(serviceBookings.vendorId, providerId))
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

  // B2C Conversation operations
  async getOrCreateConversation(consumerId: string, vendorId: string, dealId?: string): Promise<Conversation> {
    // Check for existing conversation (one per consumer + vendor)
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.consumerId, consumerId),
          eq(conversations.vendorId, vendorId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new conversation
    const result = await db
      .insert(conversations)
      .values({
        consumerId,
        vendorId,
        dealId: dealId || null,
      })
      .returning();

    return result[0];
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    return result[0];
  }

  async getB2CConversationsForConsumer(consumerId: string): Promise<Array<{
    conversation: Conversation;
    vendorName: string;
    vendorLogoUrl: string | null;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
  }>> {
    const consumerConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.consumerId, consumerId))
      .orderBy(desc(conversations.lastMessageAt));

    const results = await Promise.all(
      consumerConversations.map(async (conv) => {
        const vendor = await this.getVendor(conv.vendorId);
        
        // Get last message
        const lastMsg = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conv.id))
          .orderBy(desc(conversationMessages.createdAt))
          .limit(1);

        // Count unread messages from vendor
        const unreadResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.conversationId, conv.id),
              eq(conversationMessages.senderRole, 'vendor'),
              eq(conversationMessages.isRead, false)
            )
          );

        return {
          conversation: conv,
          vendorName: vendor?.businessName || 'Unknown Business',
          vendorLogoUrl: vendor?.logoUrl || null,
          lastMessage: lastMsg[0]?.content || '',
          lastMessageAt: lastMsg[0]?.createdAt || conv.createdAt || new Date(),
          unreadCount: unreadResult[0]?.count || 0,
        };
      })
    );

    return results;
  }

  async getB2CConversationsForVendor(vendorId: string): Promise<Array<{
    conversation: Conversation;
    consumerName: string;
    consumerProfileImageUrl: string | null;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
  }>> {
    const vendorConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.vendorId, vendorId))
      .orderBy(desc(conversations.lastMessageAt));

    const results = await Promise.all(
      vendorConversations.map(async (conv) => {
        const consumer = await this.getUser(conv.consumerId);
        
        // Get last message
        const lastMsg = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conv.id))
          .orderBy(desc(conversationMessages.createdAt))
          .limit(1);

        // Count unread messages from consumer
        const unreadResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.conversationId, conv.id),
              eq(conversationMessages.senderRole, 'consumer'),
              eq(conversationMessages.isRead, false)
            )
          );

        const consumerName = consumer?.firstName && consumer?.lastName
          ? `${consumer.firstName} ${consumer.lastName}`
          : consumer?.username || 'Unknown Customer';

        return {
          conversation: conv,
          consumerName,
          consumerProfileImageUrl: consumer?.profileImageUrl || null,
          lastMessage: lastMsg[0]?.content || '',
          lastMessageAt: lastMsg[0]?.createdAt || conv.createdAt || new Date(),
          unreadCount: unreadResult[0]?.count || 0,
        };
      })
    );

    return results;
  }

  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    return await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.createdAt);
  }

  async createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage> {
    // Insert message
    const result = await db
      .insert(conversationMessages)
      .values(message)
      .returning();

    // Update lastMessageAt on conversation
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return result[0];
  }

  async markConversationMessagesAsRead(conversationId: string, recipientId: string): Promise<void> {
    // Mark all messages as read where the recipient is not the sender
    await db
      .update(conversationMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(conversationMessages.conversationId, conversationId),
          sql`${conversationMessages.senderId} != ${recipientId}`,
          eq(conversationMessages.isRead, false)
        )
      );
  }

  async getUnreadB2CMessageCount(userId: string, role: 'consumer' | 'vendor', vendorId?: string): Promise<number> {
    if (role === 'consumer') {
      // Count unread messages from vendors in all consumer's conversations
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversationMessages)
        .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.consumerId, userId),
            eq(conversationMessages.senderRole, 'vendor'),
            eq(conversationMessages.isRead, false)
          )
        );
      return result[0]?.count || 0;
    } else {
      // Count unread messages from consumers in vendor's conversations
      if (!vendorId) return 0;
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversationMessages)
        .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.vendorId, vendorId),
            eq(conversationMessages.senderRole, 'consumer'),
            eq(conversationMessages.isRead, false)
          )
        );
      return result[0]?.count || 0;
    }
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return result[0];
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }

  async markNotificationsByReferenceAsRead(userId: string, referenceId: string, referenceType: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.referenceId, referenceId),
          eq(notifications.referenceType, referenceType),
          eq(notifications.isRead, false)
        )
      );
  }

  // Deal operations
  async listDeals(filters?: { category?: string; city?: string; tier?: string; isActive?: boolean; vendorId?: string; status?: string; includeAll?: boolean; includeHiddenVendors?: boolean }): Promise<Deal[]> {
    let conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(deals.category, filters.category));
    }
    if (filters?.city) {
      conditions.push(eq(deals.city, filters.city));
    }
    if (filters?.tier) {
      conditions.push(eq(deals.tier, filters.tier));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(deals.isActive, filters.isActive));
    }
    if (filters?.vendorId) {
      conditions.push(eq(deals.vendorId, filters.vendorId));
    }
    
    // Status filter - if includeAll is true, show all statuses, otherwise filter by status
    if (!filters?.includeAll) {
      if (filters?.status) {
        conditions.push(eq(deals.status, filters.status));
      } else {
        // Default to published only for consumer pages
        conditions.push(eq(deals.status, 'published'));
      }
    }
    
    // Filter out deals from hidden vendors (unless explicitly including hidden or filtering by specific vendorId)
    if (!filters?.includeHiddenVendors && !filters?.vendorId) {
      // Join with vendors to filter by visibility
      conditions.push(eq(vendors.isProfileVisible, true));
      
      const query = db
        .select({ deal: deals })
        .from(deals)
        .innerJoin(vendors, eq(deals.vendorId, vendors.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(deals.createdAt));
      
      const results = await query;
      return results.map(r => r.deal);
    }

    if (conditions.length === 0) {
      return await db.select().from(deals).orderBy(desc(deals.createdAt));
    }

    return await db
      .select()
      .from(deals)
      .where(and(...conditions))
      .orderBy(desc(deals.createdAt));
  }

  async listDealsWithLocation(filters: { 
    lat?: number; 
    lng?: number; 
    radiusMiles?: number; 
    category?: string; 
    city?: string; 
    tier?: string; 
    isActive?: boolean; 
    vendorId?: string;
    status?: string;
    includeAll?: boolean;
    includeHiddenVendors?: boolean;
    includeVendorsWithoutCoordinates?: boolean; // For regional apps like Rise Local (SWFL)
  }): Promise<DealWithDistance[]> {
    // Build base conditions for deals
    let conditions = [];
    
    if (filters.category) {
      conditions.push(eq(deals.category, filters.category));
    }
    if (filters.tier) {
      conditions.push(eq(deals.tier, filters.tier));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(deals.isActive, filters.isActive));
    }
    if (filters.vendorId) {
      conditions.push(eq(deals.vendorId, filters.vendorId));
    }
    
    // Status filter - if includeAll is true, show all statuses, otherwise filter by status
    if (!filters.includeAll) {
      if (filters.status) {
        conditions.push(eq(deals.status, filters.status));
      } else {
        // Default to published only for consumer pages
        conditions.push(eq(deals.status, 'published'));
      }
    }
    
    // Filter out deals from hidden vendors (unless explicitly including hidden or filtering by specific vendorId)
    if (!filters.includeHiddenVendors && !filters.vendorId) {
      conditions.push(eq(vendors.isProfileVisible, true));
    }

    // If no location provided, fall back to city-based filtering with vendor visibility
    if (!filters.lat || !filters.lng) {
      if (filters.city) {
        conditions.push(eq(deals.city, filters.city));
      }
      
      // Join with vendors to filter by visibility
      const query = db
        .select({ deal: deals })
        .from(deals)
        .innerJoin(vendors, eq(deals.vendorId, vendors.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(deals.createdAt));
      
      const results = await query;
      return results.map(r => r.deal) as DealWithDistance[];
    }

    // Location-based filtering: join with vendors to get coordinates (already includes visibility filter)
    const query = conditions.length === 0
      ? db.select({
          deal: deals,
          vendorLatitude: vendors.latitude,
          vendorLongitude: vendors.longitude
        })
        .from(deals)
        .innerJoin(vendors, eq(deals.vendorId, vendors.id))
      : db.select({
          deal: deals,
          vendorLatitude: vendors.latitude,
          vendorLongitude: vendors.longitude
        })
        .from(deals)
        .innerJoin(vendors, eq(deals.vendorId, vendors.id))
        .where(and(...conditions));

    const results = await query;

    // Calculate distance for each deal and filter by radius
    const radiusMiles = filters.radiusMiles || 10;
    const dealsWithDistance: DealWithDistance[] = [];

    for (const row of results) {
      const vendorLat = row.vendorLatitude ? parseFloat(row.vendorLatitude) : null;
      const vendorLng = row.vendorLongitude ? parseFloat(row.vendorLongitude) : null;

      // Handle vendors without coordinates
      // For regional apps (like Rise Local SWFL), include them at end of results
      // Otherwise, skip them in radius-filtered queries
      if (vendorLat === null || vendorLng === null) {
        if (filters.includeVendorsWithoutCoordinates) {
          dealsWithDistance.push({
            ...row.deal,
            distanceMiles: undefined, // No distance available - will show as "SWFL"
            vendorLatitude: row.vendorLatitude,
            vendorLongitude: row.vendorLongitude
          });
        }
        continue;
      }

      const distance = calculateDistanceMiles(
        filters.lat,
        filters.lng,
        vendorLat,
        vendorLng
      );

      // Only include deals within the radius
      if (distance <= radiusMiles) {
        dealsWithDistance.push({
          ...row.deal,
          distanceMiles: Math.round(distance * 10) / 10, // Round to 1 decimal
          vendorLatitude: row.vendorLatitude,
          vendorLongitude: row.vendorLongitude
        });
      }
    }

    // Sort by distance (closest first, undefined distances at end)
    dealsWithDistance.sort((a, b) => {
      if (a.distanceMiles === undefined && b.distanceMiles === undefined) return 0;
      if (a.distanceMiles === undefined) return 1; // undefined goes to end
      if (b.distanceMiles === undefined) return -1;
      return a.distanceMiles - b.distanceMiles;
    });

    return dealsWithDistance;
  }

  async getDealById(id: string): Promise<Deal | undefined> {
    const result = await db.select().from(deals).where(eq(deals.id, id));
    return result[0];
  }

  // Returns deal even if deleted/inactive - for status checking
  async getDealByIdWithStatus(id: string): Promise<Deal | undefined> {
    const result = await db.select().from(deals).where(eq(deals.id, id));
    return result[0];
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const result = await db.insert(deals).values(deal).returning();
    return result[0];
  }

  async updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal> {
    console.log("[STORAGE] updateDeal called with id:", id, "data:", JSON.stringify(data));
    const result = await db
      .update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    console.log("[STORAGE] updateDeal result:", result.length > 0 ? { id: result[0].id, status: result[0].status, isActive: result[0].isActive } : "NO RESULT");
    return result[0];
  }

  // Legacy method - deprecated, use issueDealCode and verifyRedemptionCode instead
  async redeemDealLegacy(dealId: string, vendorPinEntered: string, userId?: string): Promise<{ success: boolean; message: string; redemption?: DealRedemption }> {
    return { success: false, message: "This redemption method is deprecated. Please use the new code-based system." };
  }

  async getDealRedemptions(dealId: string): Promise<DealRedemption[]> {
    return await db
      .select()
      .from(dealRedemptions)
      .where(eq(dealRedemptions.dealId, dealId))
      .orderBy(desc(dealRedemptions.issuedAt));
  }

  // Legacy method - use getVendorRedemptions with vendorId instead
  async getVendorDealRedemptions(vendorUserId: string): Promise<DealRedemption[]> {
    return await db
      .select()
      .from(dealRedemptions)
      .where(eq(dealRedemptions.vendorUserId, vendorUserId))
      .orderBy(desc(dealRedemptions.issuedAt));
  }

  // Reservation operations
  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const result = await db.insert(reservations).values(reservation).returning();
    return result[0];
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    const result = await db.select().from(reservations).where(eq(reservations.id, id));
    return result[0];
  }

  async getReservationsByUser(userId: string): Promise<Reservation[]> {
    return await db
      .select()
      .from(reservations)
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.createdAt));
  }

  async updateReservationStatus(id: string, status: string, externalRef?: string): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (externalRef) {
      updateData.externalReference = externalRef;
    }
    await db.update(reservations).set(updateData).where(eq(reservations.id, id));
  }

  async getRestaurantReservationInfo(restaurantId: string): Promise<{ 
    reservationMethod: string | null; 
    reservationUrl: string | null; 
    reservationsPhone: string | null;
    restaurantName: string;
  } | undefined> {
    const result = await db
      .select({
        reservationMethod: restaurants.reservationMethod,
        reservationUrl: restaurants.reservationsUrl,
        reservationsPhone: restaurants.reservationsPhone,
        restaurantName: restaurants.restaurantName,
      })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));
    return result[0];
  }

  // Deal Redemption operations (unified code system)
  
  // Generate a unique redemption code in RL-XXXXXX format
  private generateRedemptionCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude easily confused chars (0, O, 1, I)
    let code = 'RL-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Issue a deal code - generates a time-locked code for customer redemption
  async issueDealCode(dealId: string, vendorId: string, userId: string): Promise<{ 
    success: boolean; 
    message: string; 
    redemption?: DealRedemption;
    code?: string;
    expiresAt?: Date;
  }> {
    // Get the deal to check claim window
    const deal = await this.getDealById(dealId);
    if (!deal) {
      return { success: false, message: "Deal not found" };
    }

    if (!deal.isActive) {
      return { success: false, message: "This deal is no longer active" };
    }
    
    const claimWindowMinutes = deal.claimWindowMinutes || 10;
    
    // Check for existing active (issued) code for this user/deal
    const existingClaim = await this.getActiveRedemptionForUserDeal(userId, dealId);
    if (existingClaim) {
      return { 
        success: true, 
        message: "You already have an active code for this deal",
        redemption: existingClaim,
        code: existingClaim.code || undefined,
        expiresAt: existingClaim.expiresAt || undefined
      };
    }
    
    // Check user's redemption limit for this deal
    const userVerifiedCount = await this.getUserVerifiedCountForDeal(userId, dealId);
    const maxPerUser = deal.maxRedemptionsPerUser || 1;
    if (userVerifiedCount >= maxPerUser) {
      return { success: false, message: "You have reached the maximum redemptions for this deal" };
    }

    // Check cooldown period
    if (deal.cooldownHours && deal.cooldownHours > 0) {
      const lastRedemption = await this.getLastVerifiedRedemptionForUserDeal(userId, dealId);
      if (lastRedemption?.verifiedAt) {
        const cooldownEnd = new Date(lastRedemption.verifiedAt.getTime() + deal.cooldownHours * 60 * 60 * 1000);
        if (cooldownEnd > new Date()) {
          const hoursLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60));
          return { success: false, message: `You can redeem this deal again in ${hoursLeft} hours` };
        }
      }
    }

    // Check total redemption limit
    if (deal.maxRedemptionsTotal) {
      const totalVerified = await this.getTotalVerifiedCountForDeal(dealId);
      if (totalVerified >= deal.maxRedemptionsTotal) {
        return { success: false, message: "This deal has reached its maximum redemptions" };
      }
    }
    
    // Generate unique code (retry if collision - using globally unique codes)
    let code = '';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      code = this.generateRedemptionCode();
      const existing = await this.getRedemptionByCode(code);
      if (!existing) {
        break;
      }
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      return { success: false, message: "Unable to generate unique code. Please try again." };
    }
    
    const expiresAt = new Date(Date.now() + claimWindowMinutes * 60 * 1000);
    
    const [redemption] = await db.insert(dealRedemptions).values({
      dealId,
      vendorId,
      userId,
      code,
      status: 'issued',
      expiresAt,
    }).returning();
    
    return { 
      success: true, 
      message: "Code issued successfully",
      redemption,
      code: redemption.code || undefined,
      expiresAt: redemption.expiresAt || undefined
    };
  }

  async getRedemption(id: string): Promise<DealRedemption | undefined> {
    const result = await db.select().from(dealRedemptions).where(eq(dealRedemptions.id, id));
    return result[0];
  }

  // Get redemption by code (globally unique, not per-deal)
  async getRedemptionByCode(code: string): Promise<DealRedemption | undefined> {
    const result = await db.select().from(dealRedemptions)
      .where(eq(dealRedemptions.code, code));
    return result[0];
  }

  async getUserRedemptions(userId: string): Promise<DealRedemption[]> {
    return await db.select().from(dealRedemptions)
      .where(eq(dealRedemptions.userId, userId))
      .orderBy(desc(dealRedemptions.issuedAt));
  }

  async getActiveRedemptionForUserDeal(userId: string, dealId: string): Promise<DealRedemption | undefined> {
    const now = new Date();
    const result = await db.select().from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.userId, userId),
        eq(dealRedemptions.dealId, dealId),
        eq(dealRedemptions.status, 'issued'),
        gte(dealRedemptions.expiresAt, now)
      ));
    return result[0];
  }

  // Verify a redemption code - vendor enters customer's code to complete redemption
  async verifyRedemptionCode(code: string, vendorId: string): Promise<{ success: boolean; message: string; redemption?: DealRedemption }> {
    const redemption = await this.getRedemptionByCode(code);
    
    if (!redemption) {
      return { success: false, message: "Invalid redemption code" };
    }
    
    if (redemption.vendorId !== vendorId) {
      return { success: false, message: "This code is not for your business" };
    }
    
    if (redemption.status === 'verified') {
      return { success: false, message: "This code has already been verified" };
    }
    
    if (redemption.status === 'voided') {
      return { success: false, message: "This code has been voided" };
    }

    if (redemption.status === 'expired') {
      return { success: false, message: "This code has expired" };
    }
    
    if (redemption.expiresAt && new Date(redemption.expiresAt) < new Date()) {
      // Mark as expired
      await db.update(dealRedemptions)
        .set({ status: 'expired' })
        .where(eq(dealRedemptions.id, redemption.id));
      return { success: false, message: "This code has expired. Customer needs to get a new code." };
    }
    
    // Atomically update to verified status
    const [updated] = await db.update(dealRedemptions)
      .set({ status: 'verified', verifiedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(dealRedemptions.id, redemption.id),
        eq(dealRedemptions.status, 'issued') // Ensure atomic update
      ))
      .returning();
    
    if (!updated) {
      return { success: false, message: "Unable to verify. The code may have already been used." };
    }
    
    return { success: true, message: "Deal verified successfully!", redemption: updated };
  }

  async voidRedemption(redemptionId: string, reason?: string): Promise<DealRedemption | undefined> {
    const [updated] = await db.update(dealRedemptions)
      .set({ 
        status: 'voided', 
        voidedAt: new Date(),
        updatedAt: new Date(),
        voidReason: reason || null
      })
      .where(eq(dealRedemptions.id, redemptionId))
      .returning();
    return updated;
  }

  async getDealsByVendorId(vendorId: string): Promise<Deal[]> {
    return await db.select().from(deals)
      .where(and(
        eq(deals.vendorId, vendorId),
        isNull(deals.deletedAt)
      ))
      .orderBy(desc(deals.createdAt));
  }

  async getVendorRedemptions(vendorId: string): Promise<DealRedemption[]> {
    return await db.select().from(dealRedemptions)
      .where(eq(dealRedemptions.vendorId, vendorId))
      .orderBy(desc(dealRedemptions.issuedAt));
  }

  async getUserVerifiedCountForDeal(userId: string, dealId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.userId, userId),
        eq(dealRedemptions.dealId, dealId),
        eq(dealRedemptions.status, 'verified')
      ));
    return Number(result[0]?.count || 0);
  }

  async getLastVerifiedRedemptionForUserDeal(userId: string, dealId: string): Promise<DealRedemption | undefined> {
    const result = await db.select().from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.userId, userId),
        eq(dealRedemptions.dealId, dealId),
        eq(dealRedemptions.status, 'verified')
      ))
      .orderBy(desc(dealRedemptions.verifiedAt))
      .limit(1);
    return result[0];
  }

  async getTotalVerifiedCountForDeal(dealId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.dealId, dealId),
        eq(dealRedemptions.status, 'verified')
      ));
    return Number(result[0]?.count || 0);
  }

  // ===== BUTTON-BASED REDEMPTION SYSTEM =====
  
  // Simple one-tap redemption - consumer clicks redeem button to record usage
  async redeemDeal(dealId: string, userId: string, source?: string): Promise<{
    success: boolean;
    message: string;
    redemption?: DealRedemption;
  }> {
    // Get the deal
    const deal = await this.getDealById(dealId);
    if (!deal) {
      return { success: false, message: "Deal not found" };
    }

    if (!deal.isActive) {
      return { success: false, message: "This deal is no longer active" };
    }

    // Check deal availability dates
    const now = new Date();
    if (deal.startsAt && new Date(deal.startsAt) > now) {
      return { success: false, message: "This deal hasn't started yet" };
    }
    if (deal.endsAt && new Date(deal.endsAt) < now) {
      return { success: false, message: "This deal has expired" };
    }

    // Check redemption frequency limits (weekly, monthly, unlimited)
    const frequency = deal.redemptionFrequency || 'weekly';
    if (frequency !== 'unlimited') {
      const windowDays = frequency === 'weekly' ? 7 : 30;
      const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
      
      const recentRedemption = await this.getRecentRedemptionForUserDeal(userId, dealId, windowStart);
      if (recentRedemption) {
        const daysRemaining = Math.ceil(
          (windowStart.getTime() + windowDays * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const periodName = frequency === 'weekly' ? 'week' : 'month';
        return { 
          success: false, 
          message: `You can redeem this deal once per ${periodName}. Try again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.` 
        };
      }
    }

    // Check total redemption limit for the deal
    if (deal.maxRedemptionsTotal) {
      const totalRedeemed = await this.getTotalRedeemedCountForDeal(dealId);
      if (totalRedeemed >= deal.maxRedemptionsTotal) {
        return { success: false, message: "This deal has reached its maximum redemptions" };
      }
    }

    // Create the redemption record
    const [redemption] = await db.insert(dealRedemptions).values({
      dealId,
      vendorId: deal.vendorId,
      userId,
      status: 'redeemed',
      source: source || 'web',
      pointsEarned: 0, // Points system placeholder
      pointsStatus: null, // Not tracking points yet
    }).returning();

    return {
      success: true,
      message: "Deal redeemed successfully! Show this screen to the business.",
      redemption
    };
  }

  // Check if user has already redeemed a deal within a time window
  async getRecentRedemptionForUserDeal(userId: string, dealId: string, since: Date): Promise<DealRedemption | undefined> {
    const result = await db.select().from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.userId, userId),
        eq(dealRedemptions.dealId, dealId),
        eq(dealRedemptions.status, 'redeemed'),
        gte(dealRedemptions.redeemedAt, since)
      ))
      .orderBy(desc(dealRedemptions.redeemedAt))
      .limit(1);
    return result[0];
  }

  // Get total redeemed count for a deal (new button-based system)
  async getTotalRedeemedCountForDeal(dealId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.dealId, dealId),
        eq(dealRedemptions.status, 'redeemed')
      ));
    return Number(result[0]?.count || 0);
  }

  // Get consumer's redemption history (button-based)
  async getConsumerRedemptionHistory(userId: string, limit?: number): Promise<DealRedemption[]> {
    const query = db.select().from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.userId, userId),
        eq(dealRedemptions.status, 'redeemed')
      ))
      .orderBy(desc(dealRedemptions.redeemedAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  // Get business's redemption history (button-based)
  async getBusinessRedemptionHistory(vendorId: string, limit?: number): Promise<DealRedemption[]> {
    const query = db.select().from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.vendorId, vendorId),
        eq(dealRedemptions.status, 'redeemed')
      ))
      .orderBy(desc(dealRedemptions.redeemedAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  // Check if user can redeem a deal (for UI display)
  async canUserRedeemDeal(userId: string, dealId: string): Promise<{ canRedeem: boolean; reason?: string }> {
    const deal = await this.getDealById(dealId);
    if (!deal) {
      return { canRedeem: false, reason: "Deal not found" };
    }

    if (!deal.isActive) {
      return { canRedeem: false, reason: "Deal is no longer active" };
    }

    const now = new Date();
    if (deal.startsAt && new Date(deal.startsAt) > now) {
      return { canRedeem: false, reason: "Deal hasn't started yet" };
    }
    if (deal.endsAt && new Date(deal.endsAt) < now) {
      return { canRedeem: false, reason: "Deal has expired" };
    }

    // Check frequency limits
    const frequency = deal.redemptionFrequency || 'weekly';
    if (frequency !== 'unlimited') {
      const windowDays = frequency === 'weekly' ? 7 : 30;
      const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
      
      const recentRedemption = await this.getRecentRedemptionForUserDeal(userId, dealId, windowStart);
      if (recentRedemption) {
        const daysRemaining = Math.ceil(
          (windowStart.getTime() + windowDays * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return { 
          canRedeem: false, 
          reason: `Can redeem again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` 
        };
      }
    }

    return { canRedeem: true };
  }

  // Preferred Placement operations
  async getActiveDiscoverSpotlight(): Promise<{ placement: PreferredPlacement; vendor: Vendor; deals: Deal[] } | null> {
    const now = new Date();
    
    // Get active discover_spotlight placement
    const placements = await db
      .select()
      .from(preferredPlacements)
      .where(and(
        eq(preferredPlacements.placement, "discover_spotlight"),
        eq(preferredPlacements.status, "active"),
        lte(preferredPlacements.startDate, now),
        gte(preferredPlacements.endDate, now)
      ))
      .orderBy(desc(preferredPlacements.priority), desc(preferredPlacements.createdAt))
      .limit(1);

    if (placements.length === 0) return null;

    const placement = placements[0];

    // Get vendor info
    const vendorResult = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, placement.vendorId));

    if (vendorResult.length === 0) return null;

    const vendor = vendorResult[0];

    // Get up to 2 active deals for this vendor
    const vendorDeals = await db
      .select()
      .from(deals)
      .where(and(
        eq(deals.vendorId, placement.vendorId),
        eq(deals.isActive, true)
      ))
      .limit(2);

    return { placement, vendor, deals: vendorDeals };
  }

  async createPreferredPlacement(placement: InsertPreferredPlacement): Promise<PreferredPlacement> {
    const result = await db.insert(preferredPlacements).values(placement).returning();
    return result[0];
  }

  async updatePlacementStatus(id: string, status: string): Promise<void> {
    await db.update(preferredPlacements)
      .set({ status })
      .where(eq(preferredPlacements.id, id));
  }

  async recordPlacementImpression(placementId: string, userId?: string, sessionId?: string): Promise<PlacementImpression> {
    const result = await db.insert(placementImpressions).values({
      placementId,
      userId: userId || null,
      sessionId: sessionId || null,
    }).returning();
    return result[0];
  }

  async recordPlacementClick(placementId: string, userId?: string): Promise<PlacementClick> {
    const result = await db.insert(placementClicks).values({
      placementId,
      userId: userId || null,
    }).returning();
    return result[0];
  }

  async pauseOtherSpotlights(excludePlacementId: string): Promise<void> {
    await db.update(preferredPlacements)
      .set({ status: "paused" })
      .where(and(
        eq(preferredPlacements.placement, "discover_spotlight"),
        eq(preferredPlacements.status, "active"),
        sql`${preferredPlacements.id} != ${excludePlacementId}`
      ));
  }

  // Favorites operations
  async addFavorite(userId: string, dealId: string): Promise<Favorite> {
    // Check if already favorited
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.dealId, dealId)));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const result = await db.insert(favorites).values({ userId, dealId }).returning();
    return result[0];
  }

  async removeFavorite(userId: string, dealId: string): Promise<void> {
    await db.delete(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.dealId, dealId))
    );
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async isFavorite(userId: string, dealId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.dealId, dealId)));
    return result.length > 0;
  }

  async getUserFavoriteDeals(userId: string): Promise<Deal[]> {
    const userFavorites = await this.getUserFavorites(userId);
    if (userFavorites.length === 0) return [];
    
    const dealIds = userFavorites.map(f => f.dealId);
    const result = await db
      .select()
      .from(deals)
      .where(sql`${deals.id} IN ${dealIds}`);
    
    return result;
  }

  // Email job operations
  async scheduleEmailNotification(job: {
    recipientId: string;
    recipientEmail: string;
    jobType: string;
    referenceId?: string;
    actorId?: string;
    subject: string;
    bodyPreview?: string;
    status: string;
    scheduledFor: Date;
  }): Promise<void> {
    // Check for rate limiting - don't schedule if there's a pending job for same conversation in last 30 mins
    if (job.referenceId && job.jobType === 'new_message') {
      const existingJobs = await db.execute(sql`
        SELECT id FROM email_jobs 
        WHERE reference_id = ${job.referenceId} 
        AND recipient_id = ${job.recipientId}
        AND status = 'pending'
        AND created_at > NOW() - INTERVAL '30 minutes'
        LIMIT 1
      `);
      
      if (existingJobs.rows && existingJobs.rows.length > 0) {
        console.log('[EMAIL] Skipping duplicate email job for conversation:', job.referenceId);
        return;
      }
    }

    await db.execute(sql`
      INSERT INTO email_jobs (recipient_id, recipient_email, job_type, reference_id, actor_id, subject, body_preview, status, scheduled_for)
      VALUES (${job.recipientId}, ${job.recipientEmail}, ${job.jobType}, ${job.referenceId || null}, ${job.actorId || null}, ${job.subject}, ${job.bodyPreview || null}, ${job.status}, ${job.scheduledFor})
    `);
    console.log('[EMAIL] Scheduled email notification for:', job.recipientEmail, 'at:', job.scheduledFor);
  }

  async getPendingEmailJobs(): Promise<Array<{
    id: string;
    recipientId: string;
    recipientEmail: string;
    jobType: string;
    referenceId: string | null;
    actorId: string | null;
    subject: string;
    bodyPreview: string | null;
    scheduledFor: Date;
  }>> {
    const result = await db.execute(sql`
      SELECT id, recipient_id, recipient_email, job_type, reference_id, actor_id, subject, body_preview, scheduled_for
      FROM email_jobs
      WHERE status = 'pending'
      AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT 50
    `);
    
    return (result.rows || []).map((row: any) => ({
      id: row.id,
      recipientId: row.recipient_id,
      recipientEmail: row.recipient_email,
      jobType: row.job_type,
      referenceId: row.reference_id,
      actorId: row.actor_id,
      subject: row.subject,
      bodyPreview: row.body_preview,
      scheduledFor: new Date(row.scheduled_for),
    }));
  }

  async markEmailJobSent(jobId: string): Promise<void> {
    await db.execute(sql`
      UPDATE email_jobs SET status = 'sent', sent_at = NOW(), attempts = attempts + 1 WHERE id = ${jobId}
    `);
  }

  async markEmailJobFailed(jobId: string): Promise<void> {
    await db.execute(sql`
      UPDATE email_jobs SET status = 'failed', last_attempt_at = NOW(), attempts = attempts + 1 WHERE id = ${jobId}
    `);
  }

  async cancelEmailJobsForConversation(conversationId: string, recipientId: string): Promise<void> {
    await db.execute(sql`
      UPDATE email_jobs SET status = 'cancelled' 
      WHERE reference_id = ${conversationId} 
      AND recipient_id = ${recipientId}
      AND status = 'pending'
    `);
  }

  // User public profile
  async getUserPublicProfile(userId: string): Promise<{
    id: string;
    displayName: string;
    profileImageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
  } | undefined> {
    const result = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      username: users.username,
    }).from(users).where(eq(users.id, userId));
    
    if (result.length === 0) return undefined;
    
    const user = result[0];
    const displayName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.firstName || user.username || 'User';
    
    return {
      id: user.id,
      displayName,
      profileImageUrl: user.profileImageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}

export const storage = new DbStorage();
