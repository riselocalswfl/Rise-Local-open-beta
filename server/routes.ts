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
  insertSpotlightSchema
} from "@shared/schema";
import { z } from "zod";

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

  app.patch("/api/vendors/:id", async (req, res) => {
    try {
      const validatedData = insertVendorSchema.partial().parse(req.body);
      await storage.updateVendor(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid vendor update data" });
    }
  });

  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  app.patch("/api/vendors/:id/verify", async (req, res) => {
    try {
      const schema = z.object({ isVerified: z.boolean() });
      const { isVerified } = schema.parse(req.body);
      await storage.updateVendorVerification(req.params.id, isVerified);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid verification data" });
    }
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
      
      res.json(products);
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
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const validatedData = insertProductSchema.partial().parse(req.body);
      await storage.updateProduct(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid product update data" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.patch("/api/products/:id/stock", async (req, res) => {
    try {
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

  app.post("/api/events", async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid event data" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const validatedData = insertEventSchema.partial().parse(req.body);
      await storage.updateEvent(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid event update data" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.patch("/api/events/:id/rsvp", async (req, res) => {
    try {
      const schema = z.object({ increment: z.number().int() });
      const { increment } = schema.parse(req.body);
      await storage.updateEventRsvp(req.params.id, increment);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid RSVP data" });
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

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedOrder = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedOrder);
      res.status(201).json(order);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
