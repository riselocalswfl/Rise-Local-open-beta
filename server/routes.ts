import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertUserSchema, 
  insertVendorSchema, 
  insertProductSchema,
  insertEventSchema,
  insertOrderSchema,
  insertOrderItemWithoutOrderIdSchema,
  insertSpotlightSchema,
  insertVendorReviewSchema,
  insertVendorFAQSchema,
  insertRestaurantSchema,
  insertMenuItemSchema,
  insertRestaurantReviewSchema,
  insertRestaurantFAQSchema,
  insertServiceProviderSchema,
  insertServiceOfferingSchema,
  insertServiceBookingSchema,
  fulfillmentOptionsSchema,
  type FulfillmentOptions
} from "@shared/schema";
import { z } from "zod";

// Helper function to derive serviceOptions from fulfillmentOptions
function deriveServiceOptions(fulfillment: FulfillmentOptions): string[] {
  const serviceOptions: string[] = [];
  
  if (fulfillment.pickup?.enabled) {
    serviceOptions.push("Pickup");
  }
  if (fulfillment.delivery?.enabled) {
    serviceOptions.push("Delivery");
  }
  if (fulfillment.shipping?.enabled) {
    serviceOptions.push("Ship");
  }
  
  return serviceOptions;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth (IMPORTANT: must be done before routes)
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get current user's vendor business
  app.get('/api/auth/my-vendor', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      res.json(vendor || null);
    } catch (error) {
      console.error("Error fetching user's vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor profile" });
    }
  });

  // Get current user's restaurant business
  app.get('/api/auth/my-restaurant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      res.json(restaurant || null);
    } catch (error) {
      console.error("Error fetching user's restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant profile" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/verified", async (req, res) => {
    try {
      const vendors = await storage.getVerifiedVendors();
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch verified vendors" });
    }
  });

  app.get("/api/vendors/stats", async (req, res) => {
    try {
      const verifiedVendors = await storage.getVerifiedVendors();
      res.json({ totalVerifiedVendors: verifiedVendors.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor stats" });
    }
  });

  app.get("/api/vendors/values/all", async (req, res) => {
    try {
      const values = await storage.getAllVendorValues();
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor values" });
    }
  });

  // Get all unique values from both vendors and restaurants
  app.get("/api/values/unique", async (req, res) => {
    try {
      const values = await storage.getAllUniqueValues();
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unique values" });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const validatedData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid vendor data" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[PATCH /api/vendors/:id] userId:", userId, "vendorId:", req.params.id, "body:", req.body);
      
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        console.log("[PATCH /api/vendors/:id] Vendor not found");
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      // Verify ownership
      if (vendor.ownerId !== userId) {
        console.log("[PATCH /api/vendors/:id] Ownership mismatch - vendor.ownerId:", vendor.ownerId, "userId:", userId);
        return res.status(403).json({ error: "Unauthorized to update this vendor" });
      }
      
      const validatedData = insertVendorSchema.partial().parse(req.body);
      console.log("[PATCH /api/vendors/:id] Validated data:", validatedData);
      
      // If fulfillmentOptions is being updated, validate it and derive serviceOptions
      if (validatedData.fulfillmentOptions) {
        try {
          // Validate fulfillmentOptions against the schema
          const fulfillment = fulfillmentOptionsSchema.parse(validatedData.fulfillmentOptions);
          
          // Derive serviceOptions from validated fulfillmentOptions
          const serviceOptions = deriveServiceOptions(fulfillment);
          validatedData.serviceOptions = serviceOptions;
          
          console.log("[PATCH /api/vendors/:id] Validated fulfillmentOptions and derived serviceOptions:", serviceOptions);
        } catch (error) {
          console.error("[PATCH /api/vendors/:id] Invalid fulfillmentOptions:", error);
          return res.status(400).json({ 
            error: "Invalid fulfillment options", 
            details: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      await storage.updateVendor(req.params.id, validatedData);
      console.log("[PATCH /api/vendors/:id] Update successful");
      res.json({ success: true });
    } catch (error) {
      console.error("[PATCH /api/vendors/:id] Error:", error);
      res.status(400).json({ error: "Invalid vendor update data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      // Verify ownership
      if (vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this vendor" });
      }
      
      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  app.patch("/api/vendors/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only admins can verify vendors
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized - admin access required" });
      }
      
      const schema = z.object({ isVerified: z.boolean() });
      const { isVerified } = schema.parse(req.body);
      await storage.updateVendorVerification(req.params.id, isVerified);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid verification data" });
    }
  });

  // Helper function to transform product data for frontend
  const transformProduct = (product: any) => ({
    ...product,
    price: product.priceCents !== undefined && product.priceCents !== null 
      ? (product.priceCents / 100).toFixed(2) 
      : null,
    inventory: product.stock,
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const { vendorId, category } = req.query;
      
      let products;
      if (vendorId) {
        products = await storage.getProductsByVendor(vendorId as string);
      } else if (category) {
        products = await storage.getProductsByCategory(category as string);
      } else {
        products = await storage.getProducts();
      }
      
      res.json(products.map(transformProduct));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(transformProduct(product));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertProductSchema.parse(req.body);
      
      // Verify the user owns the vendor
      const vendor = await storage.getVendor(validatedData.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to create products for this vendor" });
      }
      
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(product.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this product" });
      }
      
      const validatedData = insertProductSchema.partial().parse(req.body);
      await storage.updateProduct(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid product update data" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(product.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this product" });
      }
      
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.patch("/api/products/:id/stock", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(product.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update product stock" });
      }
      
      const schema = z.object({ stock: z.number().int().min(0) });
      const { stock } = schema.parse(req.body);
      await storage.updateProductInventory(req.params.id, stock);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid stock data" });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/upcoming", async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertEventSchema.parse(req.body);
      
      // Verify the user owns the vendor
      if (validatedData.vendorId) {
        const vendor = await storage.getVendor(validatedData.vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to create events for this vendor" });
        }
      }
      
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid event data" });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Verify ownership through vendor
      if (event.vendorId) {
        const vendor = await storage.getVendor(event.vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to update this event" });
        }
      }
      
      const validatedData = insertEventSchema.partial().parse(req.body);
      await storage.updateEvent(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid event update data" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Verify ownership through vendor
      if (event.vendorId) {
        const vendor = await storage.getVendor(event.vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to delete this event" });
        }
      }
      
      await storage.deleteEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/rsvp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      
      // Check if user already RSVPed
      const existingRsvp = await storage.getUserEventRsvp(userId, eventId);
      
      if (existingRsvp) {
        // Un-RSVP: delete the RSVP and decrement count
        await storage.deleteEventRsvp(userId, eventId);
        await storage.updateEventRsvp(eventId, -1);
        res.json({ success: true, isRsvped: false });
      } else {
        // RSVP: create the RSVP and increment count (default to GOING for backward compatibility)
        await storage.createEventRsvp({ userId, eventId, status: "GOING" });
        await storage.updateEventRsvp(eventId, 1);
        res.json({ success: true, isRsvped: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update RSVP" });
    }
  });

  // Get user's RSVPs
  app.get("/api/events/rsvps/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rsvps = await storage.getUserRsvps(userId);
      res.json(rsvps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RSVPs" });
    }
  });

  // Upsert RSVP with status
  app.post("/api/rsvp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { eventId, status } = req.body;

      if (!eventId || !status) {
        return res.status(400).json({ error: "eventId and status are required" });
      }

      if (!["GOING", "INTERESTED", "NOT_GOING"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be GOING, INTERESTED, or NOT_GOING" });
      }

      // Check if event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if RSVP exists
      const existingRsvp = await storage.getUserEventRsvp(userId, eventId);
      
      if (existingRsvp) {
        // Update existing RSVP status
        await storage.updateEventRsvpStatus(userId, eventId, status);
        const updated = await storage.getUserEventRsvp(userId, eventId);
        res.json({ rsvp: updated, event });
      } else {
        // Create new RSVP and increment count
        const newRsvp = await storage.createEventRsvp({ userId, eventId, status });
        await storage.updateEventRsvp(eventId, 1);
        res.json({ rsvp: newRsvp, event });
      }
    } catch (error) {
      console.error("Error upserting RSVP:", error);
      res.status(500).json({ error: "Failed to update RSVP" });
    }
  });

  // Create attendance (check-in)
  app.post("/api/attend", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { eventId } = req.body;

      if (!eventId) {
        return res.status(400).json({ error: "eventId is required" });
      }

      // Check if event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if already attended (keep earliest check-in time)
      const existingAttendance = await storage.getUserAttendance(userId, eventId);
      if (existingAttendance) {
        return res.json({ attendance: existingAttendance, event });
      }

      // Create new attendance
      const attendance = await storage.createAttendance({ userId, eventId });
      res.json({ attendance, event });
    } catch (error) {
      console.error("Error creating attendance:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  // Get my events (RSVPed and/or attended)
  app.get("/api/my-events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type = "all", rsvpStatus } = req.query;

      if (!["all", "rsvped", "attended"].includes(type as string)) {
        return res.status(400).json({ error: "Invalid type. Must be all, rsvped, or attended" });
      }

      if (rsvpStatus && !["GOING", "INTERESTED", "NOT_GOING"].includes(rsvpStatus as string)) {
        return res.status(400).json({ error: "Invalid rsvpStatus" });
      }

      // Fetch user's RSVPs and attendances
      const [rsvps, attendances] = await Promise.all([
        storage.getUserRsvps(userId),
        storage.getUserAttendances(userId)
      ]);

      // Filter RSVPs by status if provided
      const filteredRsvps = rsvpStatus 
        ? rsvps.filter(r => r.status === rsvpStatus)
        : rsvps;

      // Get unique event IDs based on type
      let eventIds: string[] = [];
      if (type === "rsvped") {
        eventIds = filteredRsvps.map(r => r.eventId);
      } else if (type === "attended") {
        eventIds = attendances.map(a => a.eventId);
      } else {
        // "all" - union of both
        const rsvpedIds = filteredRsvps.map(r => r.eventId);
        const attendedIds = attendances.map(a => a.eventId);
        const allIds = [...rsvpedIds, ...attendedIds];
        eventIds = Array.from(new Set(allIds));
      }

      // Fetch events
      const events = await Promise.all(
        eventIds.map(id => storage.getEvent(id))
      );

      // Filter out undefined events and add relation info
      const eventsWithRelations = events
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
        .map(event => {
          const rsvp = rsvps.find(r => r.eventId === event.id);
          const attendance = attendances.find(a => a.eventId === event.id);
          
          return {
            ...event,
            relations: {
              rsvped: !!rsvp,
              rsvpStatus: rsvp?.status || null,
              attended: !!attendance
            }
          };
        });

      // Sort: upcoming first (by dateTime), then past by most recent
      const now = new Date();
      eventsWithRelations.sort((a, b) => {
        const aTime = new Date(a.dateTime).getTime();
        const bTime = new Date(b.dateTime).getTime();
        const aIsFuture = aTime > now.getTime();
        const bIsFuture = bTime > now.getTime();

        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        if (aIsFuture && bIsFuture) return aTime - bTime; // earlier upcoming first
        return bTime - aTime; // more recent past first
      });

      res.json(eventsWithRelations);
    } catch (error) {
      console.error("Error fetching my events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get my event stats
  app.get("/api/my-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [rsvps, attendances] = await Promise.all([
        storage.getUserRsvps(userId),
        storage.getUserAttendances(userId)
      ]);

      const goingCount = rsvps.filter(r => r.status === "GOING").length;
      const interestedCount = rsvps.filter(r => r.status === "INTERESTED").length;
      const notGoingCount = rsvps.filter(r => r.status === "NOT_GOING").length;
      const attendedCount = attendances.length;
      const totalRsvped = rsvps.length;

      res.json({
        totalRsvped,
        goingCount,
        interestedCount,
        notGoingCount,
        attendedCount
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Order routes
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Get authenticated user's orders only
  app.get("/api/orders/me", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      if (!userEmail) {
        return res.status(400).json({ error: "User email not found" });
      }
      const orders = await storage.getOrdersByEmail(userEmail);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const { email } = req.query;
      let orders;
      if (email) {
        orders = await storage.getOrdersByEmail(email as string);
      } else {
        orders = await storage.getOrders();
      }
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      // Strictly require email from authentication claims
      if (!userEmail) {
        return res.status(400).json({ error: "User email not available in authentication token" });
      }
      
      // Get user data for name
      const user = await storage.getUser(userId);
      const userName = user && user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : userEmail.split('@')[0];
      
      // Validate order data (phone, shipping, items, etc.)
      // We use a partial schema that omits email/name since we'll provide those from auth
      const orderDataSchema = insertOrderSchema.omit({ email: true, name: true });
      const validatedOrder = orderDataSchema.parse(req.body);
      
      // Create order with server-trusted user identity
      // Email and name come exclusively from authenticated session, not from client
      const order = await storage.createOrder({
        ...validatedOrder,
        email: userEmail,  // Always from auth token
        name: userName,    // Always from database/auth token
      });
      
      // Award loyalty points (10 points per $1 spent)
      const totalDollars = order.totalCents / 100;
      const pointsEarned = Math.floor(totalDollars * 10);
      
      if (pointsEarned > 0) {
        await storage.earnPoints(
          userId,
          pointsEarned,
          "purchase",
          `Order #${order.id.substring(0, 8)} - $${totalDollars.toFixed(2)}`,
          order.id
        );
      }
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(400).json({ error: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const schema = z.object({ status: z.string() });
      const { status } = schema.parse(req.body);
      await storage.updateOrderStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid status data" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // Order item routes
  app.get("/api/order-items/:orderId", async (req, res) => {
    try {
      const orderItems = await storage.getOrderItems(req.params.orderId);
      res.json(orderItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order items" });
    }
  });

  // Spotlight routes
  app.get("/api/spotlight/active", async (req, res) => {
    try {
      const spotlightData = await storage.getActiveSpotlight();
      if (!spotlightData) {
        return res.status(404).json({ error: "No active spotlight" });
      }
      res.json(spotlightData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch spotlight" });
    }
  });

  app.get("/api/spotlight", async (req, res) => {
    try {
      const spotlights = await storage.getAllSpotlights();
      res.json(spotlights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch spotlights" });
    }
  });

  app.post("/api/spotlight", async (req, res) => {
    try {
      const validatedData = insertSpotlightSchema.parse(req.body);
      const spotlightData = await storage.createSpotlight(validatedData);
      res.status(201).json(spotlightData);
    } catch (error) {
      res.status(400).json({ error: "Invalid spotlight data" });
    }
  });

  app.patch("/api/spotlight/:id", async (req, res) => {
    try {
      const validatedData = insertSpotlightSchema.partial().parse(req.body);
      await storage.updateSpotlight(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid spotlight update data" });
    }
  });

  app.delete("/api/spotlight/:id", async (req, res) => {
    try {
      await storage.deleteSpotlight(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete spotlight" });
    }
  });

  // Buyer signup route
  app.post("/api/users/buyer/signup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email, firstName, lastName, phone, zipCode, travelRadius, dietaryPreferences, userValues } = req.body;
      
      // Update user with buyer info
      await storage.updateUser(userId, {
        email,
        firstName,
        lastName,
        phone,
        zipCode,
        travelRadius,
        dietaryPrefs: dietaryPreferences,
        userValues,
        role: "buyer"
      });

      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Buyer signup error:", error);
      res.status(500).json({ error: "Failed to complete buyer signup" });
    }
  });

  // Vendor signup route
  app.post("/api/vendors/signup", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.user.claims.sub;
      const vendorData = req.body;
      
      // Update user role to vendor
      await storage.updateUser(ownerId, { role: "vendor" });
      
      // Create vendor profile
      const vendor = await storage.createVendor({
        ...vendorData,
        ownerId,
        isVerified: vendorData.isFoundingMember || false,
      });

      res.json(vendor);
    } catch (error) {
      console.error("Vendor signup error:", error);
      res.status(500).json({ error: "Failed to complete vendor signup" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const validatedData = insertUserSchema.partial().parse(req.body);
      await storage.updateUser(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid user update data" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Vendor Review routes
  app.get("/api/vendors/:vendorId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getVendorReviews(req.params.vendorId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/vendor-reviews", async (req, res) => {
    try {
      const validatedData = insertVendorReviewSchema.parse(req.body);
      const review = await storage.createVendorReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ error: "Invalid review data" });
    }
  });

  app.delete("/api/vendor-reviews/:id", async (req, res) => {
    try {
      await storage.deleteVendorReview(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Vendor FAQ routes
  app.get("/api/vendors/:vendorId/faqs", async (req, res) => {
    try {
      const faqs = await storage.getVendorFAQs(req.params.vendorId);
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/vendor-faqs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertVendorFAQSchema.parse(req.body);
      
      // Verify the user owns the vendor
      const vendor = await storage.getVendor(validatedData.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to create FAQs for this vendor" });
      }
      
      const faq = await storage.createVendorFAQ(validatedData);
      res.status(201).json(faq);
    } catch (error) {
      res.status(400).json({ error: "Invalid FAQ data" });
    }
  });

  app.patch("/api/vendor-faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const faq = await storage.getVendorFAQ(req.params.id);
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(faq.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this FAQ" });
      }
      
      const validatedData = insertVendorFAQSchema.partial().parse(req.body);
      await storage.updateVendorFAQ(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid FAQ update data" });
    }
  });

  app.delete("/api/vendor-faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const faq = await storage.getVendorFAQ(req.params.id);
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(faq.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this FAQ" });
      }
      
      await storage.deleteVendorFAQ(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  // Extended vendor routes
  app.get("/api/vendors/:vendorId/events", async (req, res) => {
    try {
      const events = await storage.getEventsByVendor(req.params.vendorId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor events" });
    }
  });

  // ===== RESTAURANT ROUTES =====

  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/verified", async (req, res) => {
    try {
      const restaurants = await storage.getVerifiedRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch verified restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      const validatedData = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(validatedData);
      res.status(201).json(restaurant);
    } catch (error) {
      res.status(400).json({ error: "Invalid restaurant data" });
    }
  });

  app.patch("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      // Verify ownership
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this restaurant" });
      }
      
      const validatedData = insertRestaurantSchema.partial().parse(req.body);
      await storage.updateRestaurant(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid restaurant update data" });
    }
  });

  app.delete("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      // Verify ownership
      if (restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this restaurant" });
      }
      
      await storage.deleteRestaurant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete restaurant" });
    }
  });

  app.patch("/api/restaurants/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only admins can verify restaurants
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized - admin access required" });
      }
      
      const schema = z.object({ isVerified: z.boolean() });
      const { isVerified } = schema.parse(req.body);
      await storage.updateRestaurantVerification(req.params.id, isVerified);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid verification data" });
    }
  });

  // Menu Item routes
  app.get("/api/menu-items", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/restaurants/:restaurantId/menu-items", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItemsByRestaurant(req.params.restaurantId);
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/restaurants/:restaurantId/menu-items/category/:category", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItemsByCategory(
        req.params.restaurantId, 
        req.params.category
      );
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items by category" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const menuItem = await storage.getMenuItem(req.params.id);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu item" });
    }
  });

  app.post("/api/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertMenuItemSchema.parse(req.body);
      
      // Verify the user owns the restaurant
      const restaurant = await storage.getRestaurant(validatedData.restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to create menu items for this restaurant" });
      }
      
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid menu item data" });
    }
  });

  app.patch("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const menuItem = await storage.getMenuItem(req.params.id);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      // Verify ownership through restaurant
      const restaurant = await storage.getRestaurant(menuItem.restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this menu item" });
      }
      
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      await storage.updateMenuItem(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid menu item update data" });
    }
  });

  app.delete("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const menuItem = await storage.getMenuItem(req.params.id);
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      // Verify ownership through restaurant
      const restaurant = await storage.getRestaurant(menuItem.restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this menu item" });
      }
      
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // Restaurant Review routes
  app.get("/api/restaurants/:restaurantId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getRestaurantReviews(req.params.restaurantId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/restaurant-reviews", async (req, res) => {
    try {
      const validatedData = insertRestaurantReviewSchema.parse(req.body);
      const review = await storage.createRestaurantReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ error: "Invalid review data" });
    }
  });

  app.delete("/api/restaurant-reviews/:id", async (req, res) => {
    try {
      await storage.deleteRestaurantReview(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Restaurant FAQ routes
  app.get("/api/restaurants/:restaurantId/faqs", async (req, res) => {
    try {
      const faqs = await storage.getRestaurantFAQs(req.params.restaurantId);
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/restaurant-faqs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertRestaurantFAQSchema.parse(req.body);
      
      // Verify the user owns the restaurant
      const restaurant = await storage.getRestaurant(validatedData.restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to create FAQs for this restaurant" });
      }
      
      const faq = await storage.createRestaurantFAQ(validatedData);
      res.status(201).json(faq);
    } catch (error) {
      res.status(400).json({ error: "Invalid FAQ data" });
    }
  });

  app.patch("/api/restaurant-faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const faq = await storage.getRestaurantFAQ(req.params.id);
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      // Verify ownership through restaurant
      const restaurant = await storage.getRestaurant(faq.restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this FAQ" });
      }
      
      const validatedData = insertRestaurantFAQSchema.partial().parse(req.body);
      await storage.updateRestaurantFAQ(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid FAQ update data" });
    }
  });

  app.delete("/api/restaurant-faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const faq = await storage.getRestaurantFAQ(req.params.id);
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      // Verify ownership through restaurant
      const restaurant = await storage.getRestaurant(faq.restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this FAQ" });
      }
      
      await storage.deleteRestaurantFAQ(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  // Extended restaurant routes
  app.get("/api/restaurants/:restaurantId/events", async (req, res) => {
    try {
      const events = await storage.getEventsByRestaurant(req.params.restaurantId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant events" });
    }
  });

  // ===== SERVICE PROVIDER ROUTES =====
  
  // Get current user's service provider profile
  app.get('/api/auth/my-service-provider', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getServiceProviderByOwnerId(userId);
      res.json(provider || null);
    } catch (error) {
      console.error("Error fetching user's service provider:", error);
      res.status(500).json({ message: "Failed to fetch service provider profile" });
    }
  });

  // Service Provider routes
  app.get("/api/services", async (req, res) => {
    try {
      const { category } = req.query;
      let providers;
      
      if (category && typeof category === 'string') {
        providers = await storage.getServiceProvidersByCategory(category);
      } else {
        providers = await storage.getVerifiedServiceProviders();
      }
      
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service providers" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const provider = await storage.getServiceProvider(req.params.id);
      if (!provider) {
        return res.status(404).json({ error: "Service provider not found" });
      }
      
      // Also fetch offerings for this provider
      const offerings = await storage.getServiceOfferings(req.params.id);
      
      res.json({ ...provider, offerings });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service provider" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has a service provider profile
      const existing = await storage.getServiceProviderByOwnerId(userId);
      if (existing) {
        return res.status(400).json({ error: "User already has a service provider profile" });
      }
      
      const validated = insertServiceProviderSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const provider = await storage.createServiceProvider(validated);
      res.status(201).json(provider);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create service provider" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getServiceProvider(req.params.id);
      
      if (!provider) {
        return res.status(404).json({ error: "Service provider not found" });
      }
      
      if (provider.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this service provider" });
      }
      
      const validated = insertServiceProviderSchema.partial().parse(req.body);
      await storage.updateServiceProvider(req.params.id, validated);
      
      const updated = await storage.getServiceProvider(req.params.id);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update service provider" });
    }
  });

  // Service Offering routes
  app.get("/api/service-offerings/:providerId", async (req, res) => {
    try {
      const offerings = await storage.getServiceOfferings(req.params.providerId);
      res.json(offerings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service offerings" });
    }
  });

  app.post("/api/service-offerings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertServiceOfferingSchema.parse(req.body);
      
      // Verify user owns this service provider
      const provider = await storage.getServiceProvider(validated.serviceProviderId);
      if (!provider || provider.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to create offerings for this provider" });
      }
      
      const offering = await storage.createServiceOffering(validated);
      res.status(201).json(offering);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create service offering" });
    }
  });

  app.patch("/api/service-offerings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const offering = await storage.getServiceOffering(req.params.id);
      
      if (!offering) {
        return res.status(404).json({ error: "Service offering not found" });
      }
      
      // Verify ownership through provider
      const provider = await storage.getServiceProvider(offering.serviceProviderId);
      if (!provider || provider.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this offering" });
      }
      
      const validated = insertServiceOfferingSchema.partial().parse(req.body);
      await storage.updateServiceOffering(req.params.id, validated);
      
      const updated = await storage.getServiceOffering(req.params.id);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update service offering" });
    }
  });

  app.delete("/api/service-offerings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const offering = await storage.getServiceOffering(req.params.id);
      
      if (!offering) {
        return res.status(404).json({ error: "Service offering not found" });
      }
      
      // Verify ownership through provider
      const provider = await storage.getServiceProvider(offering.serviceProviderId);
      if (!provider || provider.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this offering" });
      }
      
      await storage.deleteServiceOffering(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete service offering" });
    }
  });

  // Service Booking routes
  app.get("/api/service-bookings/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getServiceBookings(userId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user bookings" });
    }
  });

  app.get("/api/service-bookings/provider", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getServiceProviderByOwnerId(userId);
      
      if (!provider) {
        return res.status(404).json({ error: "No service provider profile found" });
      }
      
      const bookings = await storage.getProviderBookings(provider.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch provider bookings" });
    }
  });

  app.post("/api/service-bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertServiceBookingSchema.parse({
        ...req.body,
        userId,
        status: 'pending',
      });
      
      const booking = await storage.createServiceBooking(validated);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.patch("/api/service-bookings/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;
      
      if (!status || !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const booking = await storage.getServiceBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Verify ownership through provider
      const provider = await storage.getServiceProvider(booking.serviceProviderId);
      if (!provider || provider.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this booking" });
      }
      
      await storage.updateBookingStatus(req.params.id, status);
      const updated = await storage.getServiceBooking(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  // Loyalty routes
  app.get("/api/loyalty/tiers", async (req, res) => {
    try {
      const tiers = await storage.getLoyaltyTiers();
      res.json(tiers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loyalty tiers" });
    }
  });

  app.get("/api/loyalty/my-tier", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tier = await storage.getUserTier(userId);
      res.json(tier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user tier" });
    }
  });

  app.get("/api/loyalty/my-points", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const tier = await storage.getUserTier(userId);
      const tiers = await storage.getLoyaltyTiers();
      
      // Find next tier
      let nextTier = null;
      if (tier && tier.maxPoints) {
        nextTier = tiers.find(t => t.minPoints > tier!.minPoints);
      }
      
      res.json({
        points: user?.loyaltyPoints || 0,
        currentTier: tier,
        nextTier,
        pointsToNextTier: nextTier ? nextTier.minPoints - (user?.loyaltyPoints || 0) : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch loyalty points" });
    }
  });

  app.get("/api/loyalty/my-transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getLoyaltyTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/loyalty/earn", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { points, type, description, relatedOrderId } = req.body;
      
      if (!points || !type || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      await storage.earnPoints(userId, points, type, description, relatedOrderId);
      const user = await storage.getUser(userId);
      
      res.json({ 
        success: true, 
        newBalance: user?.loyaltyPoints || 0 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to earn points" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
