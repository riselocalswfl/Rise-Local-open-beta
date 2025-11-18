import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import Stripe from "stripe";
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
  insertServiceSchema,
  insertMessageSchema,
  fulfillmentOptionsSchema,
  type FulfillmentOptions
} from "@shared/schema";
import { z } from "zod";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  // Get vendor type from session (for onboarding wizard)
  app.get('/api/auth/vendor-type', isAuthenticated, async (req: any, res) => {
    try {
      const vendorType = (req.session as any).vendorType;
      res.json({ vendorType: vendorType || null });
    } catch (error) {
      console.error("Error fetching vendor type:", error);
      res.status(500).json({ message: "Failed to fetch vendor type" });
    }
  });

  // Public route to fetch basic user info by ID (for vendor profile role determination)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Return only non-sensitive user data
      const { password, ...publicUserData } = user;
      res.json(publicUserData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object Storage Routes
  // Serve uploaded images with ACL check
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get presigned URL for image upload
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Set ACL policy after image upload with server-side validation
  app.put("/api/images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user?.claims?.sub;
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

    try {
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the URL to get the object path
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.imageURL);
      
      // Get the file to validate it before making it public
      const file = await objectStorageService.getObjectEntityFile(normalizedPath);
      const [metadata] = await file.getMetadata();
      
      // Validate content type
      if (!metadata.contentType || !ALLOWED_IMAGE_TYPES.includes(metadata.contentType.toLowerCase())) {
        return res.status(400).json({ 
          error: `Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP, SVG). Received: ${metadata.contentType}` 
        });
      }
      
      // Validate file size
      const fileSize = typeof metadata.size === 'string' ? parseInt(metadata.size) : metadata.size;
      if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({ 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Received: ${(fileSize / 1024 / 1024).toFixed(2)}MB` 
        });
      }
      
      // Only set public ACL if validation passes
      // trySetObjectEntityAclPolicy normalizes the URL and returns the canonical /objects/... path
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      // Return the normalized path (not the presigned URL) so clients persist stable /objects/... paths
      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting image ACL:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Internal server error" });
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
      // Fetch all vendor types (shop, dine, service) in unified format
      const allVendors = await storage.getAllVendorListings();
      res.json(allVendors);
    } catch (error) {
      console.error("[GET /api/vendors] Error fetching vendors:", error);
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

  // Admin statistics endpoint
  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[/api/admin/stats] Request from user: ${userId}`);
      
      const user = await storage.getUser(userId);
      console.log(`[/api/admin/stats] User found:`, user ? `${user.email} (role: ${user.role})` : 'NOT FOUND');
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        console.log(`[/api/admin/stats] Access DENIED - User is not admin`);
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      console.log(`[/api/admin/stats] Access GRANTED - Fetching statistics`);
      // Fetch all data in parallel
      const [
        allUsers,
        allVendors,
        allRestaurants,
        allServiceProviders,
        allProducts,
        allMenuItems,
        allServiceOfferings,
        allEvents,
        allVendorOrders,
      ] = await Promise.all([
        storage.getUsers(),
        storage.getVendors(),
        storage.getRestaurants(),
        storage.getServiceProviders(),
        storage.getProducts(),
        storage.getMenuItems(),
        storage.getAllServiceOfferings(),
        storage.getEvents(),
        storage.getAllVendorOrders(),
      ]);

      // Calculate statistics
      const totalUsers = allUsers.length;
      const totalVendors = allVendors.length;
      const totalRestaurants = allRestaurants.length;
      const totalServiceProviders = allServiceProviders.length;
      const totalProducts = allProducts.length;
      const totalMenuItems = allMenuItems.length;
      const totalServiceOfferings = allServiceOfferings.length;
      const totalEvents = allEvents.length;
      const totalOrders = allVendorOrders.length;

      // Verified counts
      const verifiedVendors = allVendors.filter(v => v.isVerified).length;
      const unverifiedVendors = allVendors.filter(v => !v.isVerified).length;
      const verifiedRestaurants = allRestaurants.filter(r => r.isVerified).length;
      const unverifiedRestaurants = allRestaurants.filter(r => !r.isVerified).length;
      const verifiedServiceProviders = allServiceProviders.filter(sp => sp.isVerified).length;
      const unverifiedServiceProviders = allServiceProviders.filter(sp => !sp.isVerified).length;

      // Revenue calculations
      const totalRevenueCents = allVendorOrders.reduce((sum, order) => sum + order.totalCents, 0);
      const paidOrders = allVendorOrders.filter(o => o.paymentStatus === 'paid');
      const paidRevenueCents = paidOrders.reduce((sum, order) => sum + order.totalCents, 0);
      const pendingRevenueCents = totalRevenueCents - paidRevenueCents;

      // Pending verifications
      const pendingVendorVerifications = allVendors.filter(v => !v.isVerified);
      const pendingRestaurantVerifications = allRestaurants.filter(r => !r.isVerified);
      const pendingServiceProviderVerifications = allServiceProviders.filter(sp => !sp.isVerified);

      res.json({
        users: {
          total: totalUsers,
        },
        vendors: {
          total: totalVendors,
          verified: verifiedVendors,
          unverified: unverifiedVendors,
          pendingVerifications: pendingVendorVerifications.map(v => ({
            id: v.id,
            businessName: v.businessName,
            contactEmail: v.contactEmail,
            city: v.city,
            type: 'vendor' as const,
          })),
        },
        restaurants: {
          total: totalRestaurants,
          verified: verifiedRestaurants,
          unverified: unverifiedRestaurants,
          pendingVerifications: pendingRestaurantVerifications.map(r => ({
            id: r.id,
            businessName: r.restaurantName,
            contactEmail: r.contactEmail,
            city: r.city,
            type: 'restaurant' as const,
          })),
        },
        serviceProviders: {
          total: totalServiceProviders,
          verified: verifiedServiceProviders,
          unverified: unverifiedServiceProviders,
          pendingVerifications: pendingServiceProviderVerifications.map(sp => ({
            id: sp.id,
            businessName: sp.businessName,
            contactEmail: sp.contactEmail,
            city: sp.city,
            type: 'service_provider' as const,
          })),
        },
        products: {
          total: totalProducts,
        },
        menuItems: {
          total: totalMenuItems,
        },
        serviceOfferings: {
          total: totalServiceOfferings,
        },
        events: {
          total: totalEvents,
        },
        orders: {
          total: totalOrders,
          paid: paidOrders.length,
          pending: totalOrders - paidOrders.length,
        },
        revenue: {
          totalCents: totalRevenueCents,
          paidCents: paidRevenueCents,
          pendingCents: pendingRevenueCents,
        },
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin statistics" });
    }
  });

  // Admin vendor verification endpoints
  app.patch("/api/admin/vendors/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const { isVerified } = req.body;
      await storage.updateVendorVerification(req.params.id, isVerified);
      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying vendor:", error);
      res.status(500).json({ error: "Failed to verify vendor" });
    }
  });

  app.patch("/api/admin/restaurants/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const { isVerified } = req.body;
      await storage.updateRestaurantVerification(req.params.id, isVerified);
      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying restaurant:", error);
      res.status(500).json({ error: "Failed to verify restaurant" });
    }
  });

  app.patch("/api/admin/service-providers/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const { isVerified } = req.body;
      await storage.updateServiceProviderVerification(req.params.id, isVerified);
      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying service provider:", error);
      res.status(500).json({ error: "Failed to verify service provider" });
    }
  });

  // Switch vendor type for a user
  app.post("/api/admin/users/:userId/switch-vendor-type", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      
      // Check if user is admin
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const { userId } = req.params;
      const { targetType } = req.body; // 'vendor', 'restaurant', or 'service_provider'

      if (!['vendor', 'restaurant', 'service_provider'].includes(targetType)) {
        return res.status(400).json({ error: "Invalid target type. Must be 'vendor', 'restaurant', or 'service_provider'" });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get existing profiles
      const existingVendor = await storage.getVendorByOwnerId(userId);
      const existingRestaurant = await storage.getRestaurantByOwnerId(userId);
      const existingServiceProvider = await storage.getServiceProviderByOwnerId(userId);

      // Determine source profile based on user's CURRENT role (not just first available)
      let sourceProfile: any = null;
      let sourceType: string = '';

      if (targetUser.role === 'vendor' && existingVendor) {
        sourceProfile = existingVendor;
        sourceType = 'vendor';
      } else if (targetUser.role === 'restaurant' && existingRestaurant) {
        sourceProfile = existingRestaurant;
        sourceType = 'restaurant';
      } else if (targetUser.role === 'service_provider' && existingServiceProvider) {
        sourceProfile = existingServiceProvider;
        sourceType = 'service_provider';
      } else {
        // Fallback: use first available profile if current role doesn't match any profile
        if (existingVendor) {
          sourceProfile = existingVendor;
          sourceType = 'vendor';
        } else if (existingRestaurant) {
          sourceProfile = existingRestaurant;
          sourceType = 'restaurant';
        } else if (existingServiceProvider) {
          sourceProfile = existingServiceProvider;
          sourceType = 'service_provider';
        }
      }

      if (!sourceProfile) {
        return res.status(400).json({ error: "User has no existing vendor profile to switch from" });
      }

      // Create new profile based on target type
      try {
        if (targetType === 'vendor') {
          // If vendor profile already exists, just update the user role
          if (existingVendor) {
            await storage.updateUser(userId, { role: 'vendor' });
            return res.json({ success: true, newProfile: existingVendor, message: 'User switched to shop vendor (existing profile)' });
          }

          // Create vendor profile from source
          const newVendor = await storage.createVendor({
            ownerId: userId,
            vendorType: 'shop',
            businessName: sourceType === 'restaurant' ? sourceProfile.restaurantName : sourceProfile.businessName,
            contactName: sourceProfile.contactName,
            bio: sourceProfile.bio || '',
            tagline: sourceProfile.tagline || '',
            displayName: sourceProfile.displayName || null,
            logoUrl: sourceProfile.logoUrl || null,
            bannerUrl: sourceProfile.bannerUrl || null,
            heroImageUrl: sourceProfile.heroImageUrl || null,
            gallery: sourceProfile.gallery || [],
            website: sourceProfile.website || null,
            instagram: sourceProfile.instagram || null,
            tiktok: sourceProfile.tiktok || null,
            facebook: sourceProfile.facebook || null,
            locationType: sourceProfile.locationType,
            address: sourceProfile.address || null,
            city: sourceProfile.city,
            state: sourceProfile.state,
            zipCode: sourceProfile.zipCode,
            serviceOptions: sourceProfile.serviceOptions || [],
            serviceRadius: sourceProfile.serviceRadius || null,
            hours: sourceProfile.hours || null,
            values: sourceProfile.values || sourceProfile.badges || [],
            badges: sourceProfile.badges || [],
            contactEmail: sourceProfile.contactEmail || null,
            phone: sourceProfile.phone || null,
            fulfillmentOptions: sourceProfile.fulfillmentOptions || null,
            isVerified: sourceProfile.isVerified || false,
            profileStatus: sourceProfile.profileStatus || 'complete',
          });

          await storage.updateUser(userId, { role: 'vendor' });
          return res.json({ success: true, newProfile: newVendor, message: 'User switched to shop vendor' });

        } else if (targetType === 'restaurant') {
          // If restaurant profile already exists, just update the user role
          if (existingRestaurant) {
            await storage.updateUser(userId, { role: 'restaurant' });
            return res.json({ success: true, newProfile: existingRestaurant, message: 'User switched to restaurant (existing profile)' });
          }

          // Create restaurant profile from source
          const newRestaurant = await storage.createRestaurant({
            ownerId: userId,
            restaurantName: sourceProfile.businessName || sourceProfile.restaurantName,
            contactName: sourceProfile.contactName,
            bio: sourceProfile.bio || '',
            tagline: sourceProfile.tagline || '',
            displayName: sourceProfile.displayName || null,
            logoUrl: sourceProfile.logoUrl || null,
            heroImageUrl: sourceProfile.heroImageUrl || null,
            gallery: sourceProfile.gallery || [],
            website: sourceProfile.website || null,
            instagram: sourceProfile.instagram || null,
            facebook: sourceProfile.facebook || null,
            locationType: sourceProfile.locationType,
            address: sourceProfile.address || null,
            city: sourceProfile.city,
            state: sourceProfile.state,
            zipCode: sourceProfile.zipCode,
            hours: sourceProfile.hours || null,
            badges: sourceProfile.badges || sourceProfile.values || [],
            contactEmail: sourceProfile.contactEmail || null,
            phone: sourceProfile.phone || null,
            isVerified: sourceProfile.isVerified || false,
            profileStatus: sourceProfile.profileStatus || 'complete',
          });

          await storage.updateUser(userId, { role: 'restaurant' });
          return res.json({ success: true, newProfile: newRestaurant, message: 'User switched to restaurant' });

        } else if (targetType === 'service_provider') {
          // If service provider profile already exists, just update the user role
          if (existingServiceProvider) {
            await storage.updateUser(userId, { role: 'service_provider' });
            return res.json({ success: true, newProfile: existingServiceProvider, message: 'User switched to service provider (existing profile)' });
          }

          // Create service provider profile from source
          const newServiceProvider = await storage.createServiceProvider({
            ownerId: userId,
            businessName: sourceType === 'restaurant' ? sourceProfile.restaurantName : sourceProfile.businessName,
            contactName: sourceProfile.contactName,
            bio: sourceProfile.bio || '',
            tagline: sourceProfile.tagline || '',
            displayName: sourceProfile.displayName || null,
            logoUrl: sourceProfile.logoUrl || null,
            heroImageUrl: sourceProfile.heroImageUrl || null,
            gallery: sourceProfile.gallery || [],
            website: sourceProfile.website || null,
            instagram: sourceProfile.instagram || null,
            facebook: sourceProfile.facebook || null,
            locationType: sourceProfile.locationType,
            address: sourceProfile.address || null,
            city: sourceProfile.city,
            state: sourceProfile.state,
            zipCode: sourceProfile.zipCode,
            serviceRadius: sourceProfile.serviceRadius || null,
            hours: sourceProfile.hours || null,
            badges: sourceProfile.badges || sourceProfile.values || [],
            contactEmail: sourceProfile.contactEmail || null,
            phone: sourceProfile.phone || null,
            isVerified: sourceProfile.isVerified || false,
            profileStatus: sourceProfile.profileStatus || 'complete',
          });

          await storage.updateUser(userId, { role: 'service_provider' });
          return res.json({ success: true, newProfile: newServiceProvider, message: 'User switched to service provider' });
        }
      } catch (error) {
        console.error("Error creating new profile:", error);
        return res.status(500).json({ error: "Failed to create new vendor profile" });
      }
    } catch (error) {
      console.error("Error switching vendor type:", error);
      res.status(500).json({ error: "Failed to switch vendor type" });
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

  // ============================================================================
  // Draft Vendor Profile Routes (Auto-save Support)
  // NOTE: These MUST be defined BEFORE /api/vendors/:id to avoid route conflicts
  // ============================================================================

  // Get or create draft vendor profile for current user
  app.get("/api/vendors/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[DRAFT-GET] Fetching draft vendor for userId:", userId);
      
      // Check if vendor already exists for this user
      const existingVendor = await storage.getVendorByOwnerId(userId);
      if (existingVendor) {
        console.log("[DRAFT-GET] Found existing vendor:", existingVendor.id, "status:", existingVendor.profileStatus);
        return res.json(existingVendor);
      }
      
      // No vendor found - return null so frontend can create one
      console.log("[DRAFT-GET] No vendor found for userId:", userId);
      res.json(null);
    } catch (error) {
      console.error("[DRAFT-GET ERROR]", error);
      res.status(500).json({ error: "Failed to fetch draft vendor" });
    }
  });

  // Create draft vendor profile (called on Step 1)
  app.post("/api/vendors/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vendorType, ...data } = req.body;
      
      console.log("[DRAFT-POST] Creating draft vendor for userId:", userId, "businessName:", data.businessName);
      
      // Get user info
      const user = await storage.getUser(userId);
      const email = user?.email || "";
      
      // Create minimal draft vendor
      const vendorData = {
        ownerId: userId,
        vendorType: vendorType || "shop",
        businessName: data.businessName || "Draft Vendor",
        contactName: data.contactName || "",
        bio: data.bio || "",
        tagline: data.tagline || "",
        city: data.city || "Fort Myers",
        state: "FL",
        zipCode: data.zipCode || "",
        categories: data.categories || [],
        contactEmail: data.email || email,
        phone: data.phone || "",
        website: data.website || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        locationType: "Local Business",
        serviceOptions: [],
        paymentMethod: "",
        profileStatus: "draft",
      };
      
      const vendor = await storage.createVendor(vendorData);
      console.log("[DRAFT-POST] Created draft vendor:", vendor.id, "for ownerId:", userId);
      
      res.status(201).json(vendor);
    } catch (error) {
      console.error("[DRAFT-POST ERROR]", error);
      res.status(400).json({ 
        error: "Failed to create draft vendor",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update draft vendor profile (auto-save during onboarding)
  app.patch("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendorId = req.params.id;
      
      console.log("[DRAFT-PATCH] Updating vendor:", vendorId, "for userId:", userId);
      
      // Verify vendor belongs to user
      const vendor = await storage.getVendor(vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        console.log("[DRAFT-PATCH] Unauthorized - vendor not found or wrong owner");
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[DRAFT-PATCH] Updating vendor with fields:", Object.keys(req.body));
      
      // Update vendor with provided fields
      const updatedVendor = await storage.updateVendor(vendorId, req.body);
      
      res.json(updatedVendor);
    } catch (error) {
      console.error("[DRAFT-PATCH ERROR]", error);
      res.status(400).json({ 
        error: "Failed to update vendor",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Mark vendor profile as complete
  app.post("/api/vendors/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendorId = req.params.id;
      
      console.log("[COMPLETE] Completing vendor profile:", vendorId, "for userId:", userId);
      
      // Verify vendor belongs to user
      const vendor = await storage.getVendor(vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        console.log("[COMPLETE] Unauthorized - vendor not found or wrong owner");
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Update vendor to complete status
      const updatedVendor = await storage.updateVendor(vendorId, { 
        profileStatus: "complete" 
      });
      
      // Update user role
      await storage.updateUser(userId, { role: "vendor" });
      
      console.log("[COMPLETE] Vendor profile completed successfully");
      res.json({ success: true, vendor: updatedVendor });
    } catch (error) {
      console.error("[COMPLETE ERROR]", error);
      res.status(400).json({ 
        error: "Failed to complete vendor profile",
        details: error instanceof Error ? error.message : String(error)
      });
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

  // Unified vendor onboarding endpoint
  app.post("/api/vendors/onboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vendorType, paymentMethods, fulfillmentMethods, ...data } = req.body;
      
      console.log("[ONBOARD] Creating vendor profile for userId:", userId, "vendorType:", vendorType);
      
      // Get user info
      const user = await storage.getUser(userId);
      const email = user?.email || "";
      
      // Derive service options from fulfillment methods
      const fulfillment = fulfillmentOptionsSchema.parse(fulfillmentMethods);
      const serviceOptions = deriveServiceOptions(fulfillment);
      
      // Convert payment methods array to string
      const paymentMethod = paymentMethods.join(", ");
      
      // Create vendor profile based on type
      if (vendorType === "shop") {
        // Create shop vendor
        const vendorData = {
          ownerId: userId,
          vendorType: "shop",
          businessName: data.businessName,
          contactName: data.contactName,
          bio: data.bio,
          tagline: data.tagline || "",
          city: data.city,
          state: "FL",
          zipCode: data.zipCode,
          categories: data.categories || [],
          localSourcingPercent: data.localSourcingPercent || 0,
          showLocalSourcing: data.showLocalSourcing || false,
          contact: {
            email: data.email || email,
            phone: data.phone || "",
            website: data.website || "",
            instagram: data.instagram || "",
            facebook: data.facebook || "",
          },
          locationType: "Local Business",
          serviceOptions,
          paymentMethod,
          fulfillmentOptions: fulfillment,
        };
        
        await storage.createVendor(vendorData);
        await storage.updateUser(userId, { role: "vendor" });
        console.log("[ONBOARD] Created shop vendor profile");
        
      } else if (vendorType === "restaurant") {
        // Create restaurant vendor
        const restaurantData = {
          ownerId: userId,
          restaurantName: data.businessName,
          contactName: data.contactName,
          bio: data.bio,
          tagline: data.tagline || "",
          city: data.city,
          state: "FL",
          zipCode: data.zipCode,
          categories: data.categories || [],
          contact: {
            email: data.email || email,
            phone: data.phone || "",
            website: data.website || "",
            instagram: data.instagram || "",
            facebook: data.facebook || "",
          },
          locationType: "Dine-in",
          serviceOptions,
          paymentMethod,
        };
        
        await storage.createRestaurant(restaurantData);
        await storage.updateUser(userId, { role: "restaurant" });
        console.log("[ONBOARD] Created restaurant vendor profile");
        
      } else if (vendorType === "service") {
        // Create service provider
        const serviceData = {
          ownerId: userId,
          businessName: data.businessName,
          contactName: data.contactName,
          bio: data.bio,
          tagline: data.tagline || "",
          city: data.city,
          state: "FL",
          zipCode: data.zipCode,
          categories: data.categories || [],
          serviceAreas: [data.city],
          contactEmail: data.email || email,
          contactPhone: data.phone || "",
          contact: {
            website: data.website || "",
            instagram: data.instagram || "",
            facebook: data.facebook || "",
          },
        };
        
        await storage.createServiceProvider(serviceData);
        await storage.updateUser(userId, { role: "service_provider" });
        console.log("[ONBOARD] Created service provider profile");
      } else {
        return res.status(400).json({ message: "Invalid vendor type" });
      }
      
      // Clear onboarding session data
      delete (req.session as any).needsOnboarding;
      delete (req.session as any).vendorType;
      
      // Return success with redirect URL based on vendor type
      let redirectUrl = "/dashboard";
      if (vendorType === "service") {
        redirectUrl = "/service-provider-dashboard";
      } else if (vendorType === "restaurant") {
        redirectUrl = "/restaurant-dashboard";
      } else if (vendorType === "shop") {
        redirectUrl = "/vendor-dashboard";
      }
      
      res.status(201).json({ success: true, message: "Vendor profile created successfully", redirectUrl });
    } catch (error) {
      console.error("[ONBOARD] Error creating vendor profile:", error);
      res.status(400).json({ 
        message: "Failed to create vendor profile", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // ============================================================================
  // Draft Restaurant Profile Routes (Auto-save Support)
  // ============================================================================

  app.get("/api/restaurants/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingRestaurant = await storage.getRestaurantByOwnerId(userId);
      if (existingRestaurant) {
        return res.json(existingRestaurant);
      }
      res.json(null);
    } catch (error) {
      console.error("[DRAFT] Error fetching draft restaurant:", error);
      res.status(500).json({ error: "Failed to fetch draft restaurant" });
    }
  });

  app.post("/api/restaurants/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vendorType, ...data } = req.body;
      
      console.log("[DRAFT] Creating draft restaurant for userId:", userId);
      
      const user = await storage.getUser(userId);
      const email = user?.email || "";
      
      const restaurantData = {
        ownerId: userId,
        restaurantName: data.businessName || "Draft Restaurant",
        contactName: data.contactName || "",
        bio: data.bio || "",
        tagline: data.tagline || "",
        city: data.city || "Fort Myers",
        state: "FL",
        zipCode: data.zipCode || "",
        categories: data.categories || [],
        contactEmail: data.email || email,
        contactPhone: data.phone || "",
        website: data.website || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        locationType: "Dine-in",
        serviceOptions: [],
        paymentMethod: "",
        profileStatus: "draft",
      };
      
      const restaurant = await storage.createRestaurant(restaurantData);
      console.log("[DRAFT] Created draft restaurant:", restaurant.id);
      
      res.status(201).json(restaurant);
    } catch (error) {
      console.error("[DRAFT] Error creating draft restaurant:", error);
      res.status(400).json({ 
        error: "Failed to create draft restaurant",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurantId = req.params.id;
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[DRAFT] Updating restaurant:", restaurantId);
      
      const updatedRestaurant = await storage.updateRestaurant(restaurantId, req.body);
      res.json(updatedRestaurant);
    } catch (error) {
      console.error("[DRAFT] Error updating restaurant:", error);
      res.status(400).json({ 
        error: "Failed to update restaurant",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/restaurants/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const restaurantId = req.params.id;
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[COMPLETE] Marking restaurant as complete:", restaurantId);
      
      const updatedRestaurant = await storage.updateRestaurant(restaurantId, { 
        profileStatus: "complete" 
      });
      
      await storage.updateUser(userId, { role: "restaurant" });
      
      res.json({ success: true, restaurant: updatedRestaurant });
    } catch (error) {
      console.error("[COMPLETE] Error completing restaurant profile:", error);
      res.status(400).json({ 
        error: "Failed to complete restaurant profile",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============================================================================
  // Draft Service Provider Profile Routes (Auto-save Support)
  // ============================================================================

  app.get("/api/service-providers/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingProvider = await storage.getServiceProviderByOwnerId(userId);
      if (existingProvider) {
        return res.json(existingProvider);
      }
      res.json(null);
    } catch (error) {
      console.error("[DRAFT] Error fetching draft service provider:", error);
      res.status(500).json({ error: "Failed to fetch draft service provider" });
    }
  });

  app.post("/api/service-providers/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vendorType, ...data } = req.body;
      
      console.log("[DRAFT] Creating draft service provider for userId:", userId);
      
      const user = await storage.getUser(userId);
      const email = user?.email || "";
      
      const providerData = {
        ownerId: userId,
        businessName: data.businessName || "Draft Service Provider",
        contactName: data.contactName || "",
        bio: data.bio || "",
        tagline: data.tagline || "",
        city: data.city || "Fort Myers",
        state: "FL",
        zipCode: data.zipCode || "",
        categories: data.categories || [],
        serviceAreas: [data.city || "Fort Myers"],
        contactEmail: data.email || email,
        contactPhone: data.phone || "",
        website: data.website || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        profileStatus: "draft",
      };
      
      const provider = await storage.createServiceProvider(providerData);
      console.log("[DRAFT] Created draft service provider:", provider.id);
      
      res.status(201).json(provider);
    } catch (error) {
      console.error("[DRAFT] Error creating draft service provider:", error);
      res.status(400).json({ 
        error: "Failed to create draft service provider",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/service-providers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const providerId = req.params.id;
      
      const provider = await storage.getServiceProvider(providerId);
      if (!provider || provider.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[DRAFT] Updating service provider:", providerId);
      
      const updatedProvider = await storage.updateServiceProvider(providerId, req.body);
      res.json(updatedProvider);
    } catch (error) {
      console.error("[DRAFT] Error updating service provider:", error);
      res.status(400).json({ 
        error: "Failed to update service provider",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/service-providers/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const providerId = req.params.id;
      
      const provider = await storage.getServiceProvider(providerId);
      if (!provider || provider.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[COMPLETE] Marking service provider as complete:", providerId);
      
      const updatedProvider = await storage.updateServiceProvider(providerId, { 
        profileStatus: "complete" 
      });
      
      await storage.updateUser(userId, { role: "service_provider" });
      
      res.json({ success: true, provider: updatedProvider });
    } catch (error) {
      console.error("[COMPLETE] Error completing service provider profile:", error);
      res.status(400).json({ 
        error: "Failed to complete service provider profile",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============================================================================
  // Stripe Connect Routes (Vendor Payment Setup)
  // ============================================================================

  // Create Stripe Connect Express account for vendor
  app.post("/api/stripe/create-connect-account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get vendor profile based on user role
      let vendorProfile: any = null;
      let vendorType: 'vendor' | 'restaurant' | 'service_provider' = 'vendor';
      
      if (user.role === 'vendor') {
        vendorProfile = await storage.getVendorByOwnerId(userId);
        vendorType = 'vendor';
      } else if (user.role === 'restaurant') {
        vendorProfile = await storage.getRestaurantByOwnerId(userId);
        vendorType = 'restaurant';
      } else if (user.role === 'service_provider') {
        vendorProfile = await storage.getServiceProviderByOwnerId(userId);
        vendorType = 'service_provider';
      } else {
        return res.status(403).json({ error: "Only vendors can create Stripe Connect accounts" });
      }

      if (!vendorProfile) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      // Check if already has a Connect account
      if (vendorProfile.stripeConnectAccountId) {
        return res.json({ 
          accountId: vendorProfile.stripeConnectAccountId,
          message: "Account already exists"
        });
      }

      // Create Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // Can be updated during onboarding
        business_profile: {
          mcc: '5499', // Misc food stores - retail
          product_description: vendorType === 'restaurant' 
            ? 'Restaurant and food services'
            : vendorType === 'service_provider'
            ? 'Professional services'
            : 'Local products and goods',
          url: vendorProfile.website || undefined,
        },
      });

      // Store the account ID in the vendor profile
      if (vendorType === 'vendor') {
        await storage.updateVendor(vendorProfile.id, {
          stripeConnectAccountId: account.id,
        });
      } else if (vendorType === 'restaurant') {
        await storage.updateRestaurant(vendorProfile.id, {
          stripeConnectAccountId: account.id,
        });
      } else if (vendorType === 'service_provider') {
        await storage.updateServiceProvider(vendorProfile.id, {
          stripeConnectAccountId: account.id,
        });
      }

      res.json({ accountId: account.id });
    } catch (error) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(500).json({ 
        error: "Failed to create Connect account",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Generate Stripe Connect onboarding link
  app.post("/api/stripe/account-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get vendor profile and Connect account ID
      let stripeAccountId: string | null = null;
      
      if (user.role === 'vendor') {
        const vendor = await storage.getVendorByOwnerId(userId);
        stripeAccountId = vendor?.stripeConnectAccountId || null;
      } else if (user.role === 'restaurant') {
        const restaurant = await storage.getRestaurantByOwnerId(userId);
        stripeAccountId = restaurant?.stripeConnectAccountId || null;
      } else if (user.role === 'service_provider') {
        const provider = await storage.getServiceProviderByOwnerId(userId);
        stripeAccountId = provider?.stripeConnectAccountId || null;
      }

      if (!stripeAccountId) {
        return res.status(404).json({ error: "No Stripe Connect account found. Create one first." });
      }

      // Generate account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${req.protocol}://${req.get('host')}/dashboard?stripe_refresh=true`,
        return_url: `${req.protocol}://${req.get('host')}/dashboard?stripe_success=true`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error) {
      console.error("Error creating account link:", error);
      res.status(500).json({ 
        error: "Failed to create onboarding link",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Check Stripe Connect account status
  app.get("/api/stripe/account-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get vendor profile and Connect account ID
      let stripeAccountId: string | null = null;
      let vendorType: 'vendor' | 'restaurant' | 'service_provider' | null = null;
      let vendorId: string | null = null;
      
      if (user.role === 'vendor') {
        const vendor = await storage.getVendorByOwnerId(userId);
        stripeAccountId = vendor?.stripeConnectAccountId || null;
        vendorType = 'vendor';
        vendorId = vendor?.id || null;
      } else if (user.role === 'restaurant') {
        const restaurant = await storage.getRestaurantByOwnerId(userId);
        stripeAccountId = restaurant?.stripeConnectAccountId || null;
        vendorType = 'restaurant';
        vendorId = restaurant?.id || null;
      } else if (user.role === 'service_provider') {
        const provider = await storage.getServiceProviderByOwnerId(userId);
        stripeAccountId = provider?.stripeConnectAccountId || null;
        vendorType = 'service_provider';
        vendorId = provider?.id || null;
      }

      if (!stripeAccountId) {
        return res.json({ 
          connected: false,
          onboardingComplete: false 
        });
      }

      // Fetch account details from Stripe
      const account = await stripe.accounts.retrieve(stripeAccountId);

      // Check if charges are enabled and onboarding is complete
      const onboardingComplete = account.charges_enabled && account.details_submitted;

      // Update vendor profile if onboarding status changed
      if (vendorType && vendorId && onboardingComplete) {
        if (vendorType === 'vendor') {
          await storage.updateVendor(vendorId, {
            stripeOnboardingComplete: true,
          });
        } else if (vendorType === 'restaurant') {
          await storage.updateRestaurant(vendorId, {
            stripeOnboardingComplete: true,
          });
        } else if (vendorType === 'service_provider') {
          await storage.updateServiceProvider(vendorId, {
            stripeOnboardingComplete: true,
          });
        }
      }

      res.json({
        connected: true,
        onboardingComplete,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements,
      });
    } catch (error) {
      console.error("Error checking account status:", error);
      res.status(500).json({ 
        error: "Failed to check account status",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stripe webhook endpoint for account updates and payment processing
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature (you'll need to set STRIPE_WEBHOOK_SECRET in env)
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // For development without webhook secret
        event = req.body as Stripe.Event;
      }

      // Handle payment_intent.succeeded - create transfers to vendors
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;
        
        if (metadata.vendorCount) {
          const vendorCount = parseInt(metadata.vendorCount);
          
          // Process each vendor transfer
          for (let i = 0; i < vendorCount; i++) {
            const vendorId = metadata[`vendor_${i}_id`];
            const vendorSubtotalCents = parseInt(metadata[`vendor_${i}_subtotal`]);
            const vendorTaxCents = parseInt(metadata[`vendor_${i}_tax`]);
            
            if (vendorId && vendorSubtotalCents) {
              try {
                // Get vendor's Stripe Connect account ID
                const vendor = await storage.getVendor(vendorId);
                
                if (vendor?.stripeConnectAccountId && vendor?.stripeOnboardingComplete) {
                  // Vendor receives the full amount: subtotal + tax
                  // Platform revenue comes from $150/month vendor membership fees
                  const vendorReceivesCents = vendorSubtotalCents + vendorTaxCents;
                  
                  // Create transfer to vendor's connected account
                  await stripe.transfers.create({
                    amount: vendorReceivesCents,
                    currency: 'usd',
                    destination: vendor.stripeConnectAccountId,
                    transfer_group: paymentIntent.id,
                    metadata: {
                      vendorId: vendor.id,
                      paymentIntentId: paymentIntent.id,
                      subtotalCents: vendorSubtotalCents.toString(),
                      taxCents: vendorTaxCents.toString(),
                    },
                  });
                  
                  console.log(`Transfer created for vendor ${vendorId}: $${(vendorReceivesCents / 100).toFixed(2)}`);
                } else {
                  console.warn(`Vendor ${vendorId} does not have Stripe Connect configured`);
                }
              } catch (error) {
                console.error(`Failed to create transfer for vendor ${vendorId}:`, error);
                // Continue processing other vendors even if one fails
              }
            }
          }
        }
      }

      // Handle account.updated events
      if (event.type === 'account.updated') {
        const account = event.data.object as Stripe.Account;
        const accountId = account.id;
        const onboardingComplete = account.charges_enabled && account.details_submitted;

        // Find vendor with this Stripe account ID and update status
        const vendors = await storage.getVendors();
        const vendor = vendors.find((v: any) => v.stripeConnectAccountId === accountId);
        
        if (vendor) {
          await storage.updateVendor(vendor.id, {
            stripeOnboardingComplete: onboardingComplete,
          });
        } else {
          // Check restaurants
          const restaurants = await storage.getRestaurants();
          const restaurant = restaurants.find((r: any) => r.stripeConnectAccountId === accountId);
          
          if (restaurant) {
            await storage.updateRestaurant(restaurant.id, {
              stripeOnboardingComplete: onboardingComplete,
            });
          } else {
            // Check service providers
            const providers = await storage.getServiceProviders();
            const provider = providers.find((p: any) => p.stripeConnectAccountId === accountId);
            
            if (provider) {
              await storage.updateServiceProvider(provider.id, {
                stripeOnboardingComplete: onboardingComplete,
              });
            }
          }
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : String(error)}`);
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
      
      // Verify vendor profile is complete before allowing product creation
      if (vendor.profileStatus !== "complete") {
        return res.status(400).json({ error: "Please complete your vendor profile before creating products" });
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

  // Get vendor's incoming orders
  app.get("/api/vendor-orders/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get vendor profile for this user
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      // Get all vendor orders for this vendor
      const vendorOrders = await storage.getVendorOrdersByVendor(vendor.id);
      
      res.json(vendorOrders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch vendor orders" });
    }
  });

  // Update vendor order status
  app.patch("/api/vendor-orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { status } = req.body;
      
      // Get vendor profile for this user
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      // Get the order to verify ownership
      const order = await storage.getVendorOrder(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      if (order.vendorId !== vendor.id) {
        return res.status(403).json({ error: "Not authorized to update this order" });
      }
      
      // Update the order status
      await storage.updateVendorOrderStatus(id, status);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Update vendor order payment status
  app.patch("/api/vendor-orders/:id/payment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { paymentStatus } = req.body;
      
      // Get vendor profile for this user
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      // Get the order to verify ownership
      const order = await storage.getVendorOrder(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      if (order.vendorId !== vendor.id) {
        return res.status(403).json({ error: "Not authorized to update this order" });
      }
      
      // Update the payment status
      await storage.updateVendorOrderPaymentStatus(id, paymentStatus);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  });

  // Get current user's orders (master orders with vendor orders)
  app.get("/api/orders/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all master orders for this user
      const masterOrders = await storage.getMasterOrdersByBuyer(userId);
      
      // For each master order, get its vendor orders
      const ordersWithDetails = await Promise.all(
        masterOrders.map(async (masterOrder) => {
          const vendorOrders = await storage.getVendorOrdersByMaster(masterOrder.id);
          return {
            ...masterOrder,
            vendorOrders,
          };
        })
      );
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // ===== STRIPE CONNECT ROUTES =====
  
  // Create Stripe Connect account link for vendor onboarding
  app.post("/api/stripe/create-connect-account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      let accountId = vendor.stripeConnectAccountId;

      // Create Stripe Connect account if it doesn't exist
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: vendor.contactEmail || req.user.claims.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            name: vendor.businessName,
            support_email: vendor.contactEmail || req.user.claims.email,
          },
        });
        
        accountId = account.id;
        
        // Save the account ID to the vendor
        await storage.updateVendor(vendor.id, {
          stripeConnectAccountId: accountId,
        });
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${req.protocol}://${req.get('host')}/dashboard?stripe_refresh=true`,
        return_url: `${req.protocol}://${req.get('host')}/dashboard?stripe_success=true`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(500).json({ error: error.message || "Failed to create Connect account" });
    }
  });

  // Check Stripe Connect account status
  app.get("/api/stripe/connect-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      if (!vendor.stripeConnectAccountId) {
        return res.json({ 
          connected: false,
          onboardingComplete: false
        });
      }

      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(vendor.stripeConnectAccountId);
      
      const onboardingComplete = account.charges_enabled && account.details_submitted;
      
      // Update vendor onboarding status if it changed
      if (onboardingComplete !== vendor.stripeOnboardingComplete) {
        await storage.updateVendor(vendor.id, {
          stripeOnboardingComplete: onboardingComplete,
        });
      }

      res.json({
        connected: true,
        onboardingComplete,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (error: any) {
      console.error("Error checking Connect status:", error);
      res.status(500).json({ error: error.message || "Failed to check Connect status" });
    }
  });

  // Create payment intent for checkout (splits payment to vendors)
  app.post("/api/stripe/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vendorOrders } = req.body;
      
      if (!Array.isArray(vendorOrders) || vendorOrders.length === 0) {
        return res.status(400).json({ error: "Vendor orders required" });
      }

      // Calculate total amount
      const totalCents = vendorOrders.reduce((sum: number, order: any) => sum + order.totalCents, 0);

      // Store vendor order breakdown in metadata for webhook processing
      // Include subtotal, tax, and total for each vendor
      const vendorOrdersMetadata = vendorOrders.map((order: any, index: number) => ({
        [`vendor_${index}_id`]: order.vendorId,
        [`vendor_${index}_subtotal`]: order.subtotalCents.toString(),
        [`vendor_${index}_tax`]: order.taxCents.toString(),
        [`vendor_${index}_total`]: order.totalCents.toString(),
      })).reduce((acc, obj) => ({ ...acc, ...obj }), {});

      // Create payment intent that collects on platform account
      // After payment succeeds, webhook will create transfers to vendor accounts
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          buyerId: userId,
          vendorCount: vendorOrders.length.toString(),
          ...vendorOrdersMetadata,
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: error.message || "Failed to create payment intent" });
    }
  });

  // ===== MULTI-VENDOR CHECKOUT =====
  
  // Multi-Vendor Checkout Route
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      if (!userEmail) {
        return res.status(400).json({ error: "User email not available" });
      }
      
      // Get user data
      const user = await storage.getUser(userId);
      const userName = user && user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : userEmail.split('@')[0];
      
      // Validate checkout data
      const checkoutSchema = z.object({
        phone: z.string().min(1, "Phone number is required"),
        cartItems: z.array(z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
          quantity: z.number(),
          vendorId: z.string().optional(),
          vendorName: z.string().optional(),
          image: z.string().optional(),
          variantId: z.string().optional(),
          options: z.record(z.string()).optional(),
        })),
        fulfillmentType: z.string(), // "Pickup", "Delivery", "Ship"
        fulfillmentDetails: z.any().optional(),
        totals: z.object({
          subtotal: z.number(),
          tax: z.number(),
          grandTotal: z.number(),
        }),
        paymentIntentId: z.string().optional(),
        paymentStatus: z.string().optional(),
      });
      
      const { phone, cartItems, fulfillmentType, fulfillmentDetails, totals, paymentIntentId, paymentStatus } = checkoutSchema.parse(req.body);
      
      // Group cart items by vendor
      const itemsByVendor: Record<string, typeof cartItems> = {};
      for (const item of cartItems) {
        const vendorId = item.vendorId || 'unknown';
        if (!itemsByVendor[vendorId]) {
          itemsByVendor[vendorId] = [];
        }
        itemsByVendor[vendorId].push(item);
      }
      
      // Create master order
      const masterOrder = await storage.createMasterOrder({
        buyerId: userId,
        buyerName: userName,
        buyerEmail: userEmail,
        buyerPhone: phone,
        totalCents: Math.round(totals.grandTotal * 100),
        status: "pending",
      });
      
      // Create vendor orders for each vendor
      const vendorOrders = [];
      for (const [vendorId, vendorItems] of Object.entries(itemsByVendor)) {
        // Calculate vendor-specific totals
        const vendorSubtotal = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const vendorTax = vendorSubtotal * 0.07; // 7% FL tax
        const vendorTotal = vendorSubtotal + vendorTax;
        
        // Get vendor to check payment methods
        const vendor = await storage.getVendor(vendorId);
        
        // Determine payment method and link
        let paymentMethod = 'cash';
        let paymentLink = '';
        let vendorPaymentStatus = 'pending';
        
        // If payment was made via Stripe, use that info
        if (paymentIntentId && paymentStatus === 'succeeded') {
          paymentMethod = 'stripe';
          vendorPaymentStatus = 'paid';
        } else if (vendor) {
          // Check vendor's preferred payment methods
          const paymentPreferences = vendor.paymentPreferences || [];
          
          if (paymentPreferences.includes('Stripe Connect')) {
            paymentMethod = 'stripe_connect';
          } else if (paymentPreferences.includes('Venmo') && (vendor.paymentHandles as any)?.venmo) {
            paymentMethod = 'venmo';
            paymentLink = `https://venmo.com/${(vendor.paymentHandles as any).venmo}`;
          } else if (paymentPreferences.includes('CashApp') && (vendor.paymentHandles as any)?.cashapp) {
            paymentMethod = 'cashapp';
            paymentLink = `https://cash.app/$${(vendor.paymentHandles as any).cashapp}`;
          } else if (paymentPreferences.includes('Zelle')) {
            paymentMethod = 'zelle';
            paymentLink = vendor.contactEmail || userEmail;
          } else if (paymentPreferences.includes('PayPal') && (vendor.paymentHandles as any)?.paypal) {
            paymentMethod = 'paypal';
            paymentLink = `https://paypal.me/${(vendor.paymentHandles as any).paypal}`;
          }
        }
        
        // Convert cart items to order format
        const itemsJson = vendorItems.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          priceCents: Math.round(item.price * 100),
          variantId: item.variantId,
          options: item.options,
          image: item.image,
        }));
        
        // Create vendor order
        const vendorOrder = await storage.createVendorOrder({
          masterOrderId: masterOrder.id,
          vendorId,
          buyerId: userId,
          buyerName: userName,
          buyerEmail: userEmail,
          buyerPhone: phone,
          itemsJson,
          subtotalCents: Math.round(vendorSubtotal * 100),
          taxCents: Math.round(vendorTax * 100),
          feesCents: 0, // No buyer fee - platform revenue from $89/month vendor membership
          totalCents: Math.round(vendorTotal * 100),
          fulfillmentType,
          fulfillmentDetails,
          paymentMethod,
          paymentLink,
          paymentStatus: vendorPaymentStatus,
          status: vendorPaymentStatus === 'paid' ? 'confirmed' : 'pending',
          vendorNotified: false,
        });
        
        vendorOrders.push(vendorOrder);
      }
      
      // Return master order with vendor orders
      res.status(201).json({
        masterOrder,
        vendorOrders,
      });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(400).json({ error: "Checkout failed" });
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
  // Get all users (admin only - returns complete user data)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[/api/users] Request from user: ${userId}`);
      
      const currentUser = await storage.getUser(userId);
      console.log(`[/api/users] User found:`, currentUser ? `${currentUser.email} (role: ${currentUser.role})` : 'NOT FOUND');
      
      // Only admins can access full user list
      if (!currentUser || currentUser.role !== 'admin') {
        console.log(`[/api/users] Access DENIED - User is not admin`);
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      console.log(`[/api/users] Access GRANTED - Fetching all users`);
      const users = await storage.getUsers();
      console.log(`[/api/users] Found ${users.length} users`);
      // Return complete user data (excluding password and sensitive auth fields)
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        zipCode: user.zipCode,
        createdAt: user.createdAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

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

  app.patch("/api/users/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Whitelist only safe fields that users are allowed to update
      const allowedFields = ['firstName', 'lastName', 'phone'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      // Validate the whitelisted data
      const validatedData = insertUserSchema.partial().pick({
        firstName: true,
        lastName: true,
        phone: true,
      }).parse(updateData);
      
      await storage.updateUser(userId, validatedData);
      
      // Return updated user data
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating current user:", error);
      res.status(400).json({ error: "Invalid user update data" });
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

  // Menu Items routes
  app.get("/api/vendors/:vendorId/menu", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItemsByVendor(req.params.vendorId);
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.post("/api/vendors/:vendorId/menu", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.vendorId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      if (vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to add menu items" });
      }

      const validatedData = insertMenuItemSchema.parse({
        ...req.body,
        vendorId: req.params.vendorId
      });
      
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid menu item data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const menuItem = await storage.getMenuItem(req.params.id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      if (!menuItem.vendorId) {
        return res.status(400).json({ error: "Menu item has no associated vendor" });
      }
      
      const vendor = await storage.getVendor(menuItem.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this menu item" });
      }
      
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      await storage.updateMenuItem(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid menu item update data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const menuItem = await storage.getMenuItem(req.params.id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      if (!menuItem.vendorId) {
        return res.status(400).json({ error: "Menu item has no associated vendor" });
      }
      
      const vendor = await storage.getVendor(menuItem.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this menu item" });
      }
      
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // Services routes
  app.get("/api/vendors/:vendorId/services", async (req, res) => {
    try {
      const services = await storage.getServicesByVendor(req.params.vendorId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/vendors/:vendorId/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.vendorId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      if (vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to add services" });
      }

      const validatedData = insertServiceSchema.parse({
        ...req.body,
        vendorId: req.params.vendorId
      });
      
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      res.status(400).json({ error: "Invalid service data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/vendor-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const service = await storage.getService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      if (!service.vendorId) {
        return res.status(400).json({ error: "Service has no associated vendor" });
      }
      
      const vendor = await storage.getVendor(service.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this service" });
      }
      
      const validatedData = insertServiceSchema.partial().parse(req.body);
      await storage.updateService(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid service update data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/vendor-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const service = await storage.getService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      if (!service.vendorId) {
        return res.status(400).json({ error: "Service has no associated vendor" });
      }
      
      const vendor = await storage.getVendor(service.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this service" });
      }
      
      await storage.deleteService(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete service" });
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
      
      // Verify the user owns the restaurant (for legacy support)
      if (validatedData.restaurantId) {
        const restaurant = await storage.getRestaurant(validatedData.restaurantId);
        if (!restaurant || restaurant.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to create menu items for this restaurant" });
        }
        
        // Verify restaurant profile is complete before allowing menu item creation
        if (restaurant.profileStatus !== "complete") {
          return res.status(400).json({ error: "Please complete your restaurant profile before creating menu items" });
        }
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
      
      // Verify ownership through restaurant (for legacy support)
      if (menuItem.restaurantId) {
        const restaurant = await storage.getRestaurant(menuItem.restaurantId);
        if (!restaurant || restaurant.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to update this menu item" });
        }
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
      
      // Verify ownership through restaurant (for legacy support)
      if (menuItem.restaurantId) {
        const restaurant = await storage.getRestaurant(menuItem.restaurantId);
        if (!restaurant || restaurant.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to delete this menu item" });
        }
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
        // Filter by category (simple string matching)
        // Note: Client-side uses hierarchical categoriesMatch for better filtering
        providers = await storage.getServiceProvidersByCategory(category);
      } else {
        // Return all service providers with complete profiles
        // This ensures service providers appear consistently in both /services and /vendors tabs
        providers = await storage.getServiceProviders();
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
      
      // Verify service provider profile is complete before allowing offering creation
      if (provider.profileStatus !== "complete") {
        return res.status(400).json({ error: "Please complete your service provider profile before creating service offerings" });
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

  // Message routes
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });
      
      console.log("[MESSAGE] Creating message:", { 
        senderId: messageData.senderId, 
        receiverId: messageData.receiverId,
        content: messageData.content?.substring(0, 50)
      });
      
      const message = await storage.createMessage(messageData);
      console.log("[MESSAGE] Message created successfully:", message.id);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[CONVERSATIONS] Fetching conversations for user:", userId);
      const conversations = await storage.getConversations(userId);
      console.log("[CONVERSATIONS] Found conversations:", conversations.length);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/:otherUserId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { otherUserId } = req.params;
      
      console.log("[MESSAGES] Fetching messages between:", { userId, otherUserId });
      const messages = await storage.getMessages(userId, otherUserId);
      console.log("[MESSAGES] Found messages:", messages.length);
      
      // Mark messages from other user as read
      await storage.markMessagesAsRead(userId, otherUserId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/unread/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
