import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import Stripe from "stripe";
import { geocodeAddress, buildFullAddress } from "./geocoding";
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
  insertDealSchema,
  insertPreferredPlacementSchema,
  insertPlacementImpressionSchema,
  insertPlacementClickSchema,
  fulfillmentOptionsSchema,
  updateVendorProfileSchema,
  type FulfillmentOptions,
  type VendorDeal
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

// Helper function to check if user has active Rise Local Pass membership
// SINGLE SOURCE OF TRUTH - aligned with shared/dealAccess.ts logic
async function isUserSubscribed(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  
  const user = await storage.getUser(userId);
  if (!user) return false;
  
  // Check if user has active pass membership
  if (user.isPassMember !== true) return false;
  
  // Require valid passExpiresAt - prevents stale data from granting access
  if (!user.passExpiresAt) return false;
  
  const expiresAt = new Date(user.passExpiresAt);
  const expiresTime = expiresAt.getTime();
  
  // If date is invalid, deny access (safe default)
  if (Number.isNaN(expiresTime)) return false;
  
  // Only grant access if expiration is in the future
  return expiresTime > Date.now();
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

  // Complete onboarding - mark user as having completed the welcome flow
  app.post('/api/auth/complete-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateUser(userId, { onboardingComplete: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Complete welcome carousel - mark user as having seen the intro slides
  app.post('/api/welcome/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      // Validate role if provided
      const validRoles = ['buyer', 'vendor'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'buyer' or 'vendor'" });
      }
      
      // Update welcomeCompleted and optionally role
      const updateData: any = { welcomeCompleted: true };
      if (role && validRoles.includes(role)) {
        updateData.role = role;
        // If consumer (buyer), also mark onboarding as complete
        if (role === 'buyer') {
          updateData.onboardingComplete = true;
        }
      }
      
      await storage.updateUser(userId, updateData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing welcome:", error);
      res.status(500).json({ message: "Failed to complete welcome" });
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
  // Serve uploaded images with ACL check (public objects don't require authentication)
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
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

  // Get current user's vendor business (unified for all vendor types: shop, dine, service)
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

  // Legacy endpoint - redirects to unified /api/auth/my-vendor
  app.get('/api/auth/my-restaurant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      res.json(vendor || null);
    } catch (error) {
      console.error("Error fetching user's restaurant:", error);
      res.status(500).json({ message: "Failed to fetch vendor profile" });
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

  // Search vendors by business name (for messaging feature)
  app.get("/api/vendors/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const allVendors = await storage.getAllVendorListings();
      const filtered = allVendors
        .filter(v => 
          v.businessName?.toLowerCase().includes(query) ||
          v.bio?.toLowerCase().includes(query)
        )
        .slice(0, 10); // Limit to 10 results
      
      res.json(filtered);
    } catch (error) {
      console.error("[GET /api/vendors/search] Error:", error);
      res.status(500).json({ error: "Failed to search vendors" });
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

  // Categories endpoint - single source of truth for business categories
  app.get("/api/categories", async (req, res) => {
    try {
      const activeOnly = req.query.active !== "false";
      const categoryList = await storage.getCategories(activeOnly);
      res.json(categoryList);
    } catch (error) {
      console.error("[GET /api/categories] Error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
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
        allProducts,
        allMenuItems,
        allServiceOfferings,
        allEvents,
        allVendorOrders,
      ] = await Promise.all([
        storage.getUsers(),
        storage.getVendors(),
        storage.getProducts(),
        storage.getMenuItems(),
        storage.getAllServiceOfferings(),
        storage.getEvents(),
        storage.getAllVendorOrders(),
      ]);

      // Filter vendors by type
      const allShopVendors = allVendors.filter((v: any) => v.vendorType === 'shop');
      const allDineVendors = allVendors.filter((v: any) => v.vendorType === 'dine');
      const allServiceVendors = allVendors.filter((v: any) => v.vendorType === 'service');

      // Calculate statistics
      const totalUsers = allUsers.length;
      const totalVendors = allShopVendors.length;
      const totalRestaurants = allDineVendors.length;
      const totalServiceProviders = allServiceVendors.length;
      const totalProducts = allProducts.length;
      const totalMenuItems = allMenuItems.length;
      const totalServiceOfferings = allServiceOfferings.length;
      const totalEvents = allEvents.length;
      const totalOrders = allVendorOrders.length;

      // Verified counts
      const verifiedVendors = allShopVendors.filter((v: any) => v.isVerified).length;
      const unverifiedVendors = allShopVendors.filter((v: any) => !v.isVerified).length;
      const verifiedRestaurants = allDineVendors.filter((v: any) => v.isVerified).length;
      const unverifiedRestaurants = allDineVendors.filter((v: any) => !v.isVerified).length;
      const verifiedServiceProviders = allServiceVendors.filter((v: any) => v.isVerified).length;
      const unverifiedServiceProviders = allServiceVendors.filter((v: any) => !v.isVerified).length;

      // Revenue calculations
      const totalRevenueCents = allVendorOrders.reduce((sum: number, order: any) => sum + order.totalCents, 0);
      const paidOrders = allVendorOrders.filter((o: any) => o.paymentStatus === 'paid');
      const paidRevenueCents = paidOrders.reduce((sum: number, order: any) => sum + order.totalCents, 0);
      const pendingRevenueCents = totalRevenueCents - paidRevenueCents;

      // Pending verifications
      const pendingVendorVerifications = allShopVendors.filter((v: any) => !v.isVerified);
      const pendingRestaurantVerifications = allDineVendors.filter((v: any) => !v.isVerified);
      const pendingServiceProviderVerifications = allServiceVendors.filter((v: any) => !v.isVerified);

      res.json({
        users: {
          total: totalUsers,
        },
        vendors: {
          total: totalVendors,
          verified: verifiedVendors,
          unverified: unverifiedVendors,
          pendingVerifications: pendingVendorVerifications.map((v: any) => ({
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
          pendingVerifications: pendingRestaurantVerifications.map((v: any) => ({
            id: v.id,
            businessName: v.businessName,
            contactEmail: v.contactEmail,
            city: v.city,
            type: 'restaurant' as const,
          })),
        },
        serviceProviders: {
          total: totalServiceProviders,
          verified: verifiedServiceProviders,
          unverified: unverifiedServiceProviders,
          pendingVerifications: pendingServiceProviderVerifications.map((v: any) => ({
            id: v.id,
            businessName: v.businessName,
            contactEmail: v.contactEmail,
            city: v.city,
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

  // Admin maintenance endpoint - manually trigger startup tasks that were deferred
  // This allows running ownership validation and email worker on-demand
  app.post("/api/admin/run-maintenance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const results: { task: string; status: string; error?: string }[] = [];

      // Run ownership validation (fire-and-forget)
      try {
        const { validateAndFixOwnership } = await import("./validate-ownership");
        // Don't await - let it run in background
        validateAndFixOwnership().catch((err) => {
          console.error("[Maintenance] Ownership validation failed:", err);
        });
        results.push({ task: "ownershipValidation", status: "started" });
      } catch (err: any) {
        results.push({ task: "ownershipValidation", status: "failed", error: err.message });
      }

      // Start email worker
      try {
        const { startEmailWorker } = await import("./emailWorker");
        startEmailWorker();
        results.push({ task: "emailWorker", status: "started" });
      } catch (err: any) {
        results.push({ task: "emailWorker", status: "failed", error: err.message });
      }

      res.json({ 
        message: "Maintenance tasks triggered (running in background)",
        results 
      });
    } catch (error) {
      console.error("Error running maintenance:", error);
      res.status(500).json({ error: "Failed to run maintenance tasks" });
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
      await storage.updateVendorVerification(req.params.id, isVerified);
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
      await storage.updateVendorVerification(req.params.id, isVerified);
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

      // Get existing vendor profile (unified system)
      const existingVendor = await storage.getVendorByOwnerId(userId);

      // Determine source profile based on user's CURRENT role
      let sourceProfile: any = null;
      let sourceType: string = '';

      if (targetUser.role === 'vendor' && existingVendor) {
        sourceProfile = existingVendor;
        sourceType = 'vendor';
      } else if (targetUser.role === 'restaurant' && existingVendor && existingVendor.vendorType === 'dine') {
        sourceProfile = existingVendor;
        sourceType = 'restaurant';
      } else if (targetUser.role === 'service_provider' && existingVendor && existingVendor.vendorType === 'service') {
        sourceProfile = existingVendor;
        sourceType = 'service_provider';
      } else if (existingVendor) {
        // Fallback: use existing vendor profile
        sourceProfile = existingVendor;
        sourceType = existingVendor.vendorType === 'shop' ? 'vendor' : existingVendor.vendorType === 'dine' ? 'restaurant' : 'service_provider';
      }

      if (!sourceProfile) {
        return res.status(400).json({ error: "User has no existing vendor profile to switch from" });
      }

      // Create new profile based on target type
      try {
        if (targetType === 'vendor') {
          // If vendor profile already exists with shop type, just update the user role
          if (existingVendor && existingVendor.vendorType === 'shop') {
            await storage.updateUser(userId, { role: 'vendor' });
            return res.json({ success: true, newProfile: existingVendor, message: 'User switched to shop vendor (existing profile)' });
          }

          // If vendor exists but different type, update to shop type
          if (existingVendor) {
            const updatedVendor = await storage.updateVendor(existingVendor.id, {
              vendorType: 'shop',
              capabilities: { products: true, services: false, menu: false },
            });
            await storage.updateUser(userId, { role: 'vendor' });
            return res.json({ success: true, newProfile: updatedVendor, message: 'User switched to shop vendor' });
          }

          // Create new shop vendor profile
          const newVendor = await storage.createVendor({
            ownerId: userId,
            vendorType: 'shop',
            businessName: sourceProfile.businessName,
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
            locationType: sourceProfile.locationType || 'Physical storefront',
            address: sourceProfile.address || null,
            city: sourceProfile.city,
            state: sourceProfile.state,
            zipCode: sourceProfile.zipCode,
            serviceOptions: sourceProfile.serviceOptions || [],
            paymentMethod: sourceProfile.paymentMethod || 'Through Platform',
            capabilities: { products: true, services: false, menu: false },
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
          // If vendor profile already exists with dine type, just update the user role
          if (existingVendor && existingVendor.vendorType === 'dine') {
            await storage.updateUser(userId, { role: 'restaurant' });
            return res.json({ success: true, newProfile: existingVendor, message: 'User switched to restaurant (existing profile)' });
          }

          // If vendor exists but different type, update to dine type
          if (existingVendor) {
            const updatedVendor = await storage.updateVendor(existingVendor.id, {
              vendorType: 'dine',
              capabilities: { products: false, services: false, menu: true },
            });
            await storage.updateUser(userId, { role: 'restaurant' });
            return res.json({ success: true, newProfile: updatedVendor, message: 'User switched to restaurant' });
          }

          // Create new dine vendor profile
          const newVendor = await storage.createVendor({
            ownerId: userId,
            vendorType: 'dine',
            businessName: sourceProfile.businessName,
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
            locationType: sourceProfile.locationType || 'Physical storefront',
            address: sourceProfile.address || null,
            city: sourceProfile.city,
            state: sourceProfile.state,
            zipCode: sourceProfile.zipCode,
            serviceOptions: sourceProfile.serviceOptions || ['On-site dining'],
            paymentMethod: sourceProfile.paymentMethod || 'Through Platform',
            capabilities: { products: false, services: false, menu: true },
            hours: sourceProfile.hours || null,
            badges: sourceProfile.badges || sourceProfile.values || [],
            contactEmail: sourceProfile.contactEmail || null,
            phone: sourceProfile.phone || null,
            isVerified: sourceProfile.isVerified || false,
            profileStatus: sourceProfile.profileStatus || 'complete',
          });

          await storage.updateUser(userId, { role: 'restaurant' });
          return res.json({ success: true, newProfile: newVendor, message: 'User switched to restaurant' });

        } else if (targetType === 'service_provider') {
          // If vendor profile already exists with service type, just update the user role
          if (existingVendor && existingVendor.vendorType === 'service') {
            await storage.updateUser(userId, { role: 'service_provider' });
            return res.json({ success: true, newProfile: existingVendor, message: 'User switched to service provider (existing profile)' });
          }

          // If vendor exists but different type, update to service type
          if (existingVendor) {
            const updatedVendor = await storage.updateVendor(existingVendor.id, {
              vendorType: 'service',
              capabilities: { products: false, services: true, menu: false },
            });
            await storage.updateUser(userId, { role: 'service_provider' });
            return res.json({ success: true, newProfile: updatedVendor, message: 'User switched to service provider' });
          }

          // Create new service vendor profile
          const newVendor = await storage.createVendor({
            ownerId: userId,
            vendorType: 'service',
            businessName: sourceProfile.businessName,
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
            locationType: sourceProfile.locationType || 'Home-based',
            address: sourceProfile.address || null,
            city: sourceProfile.city,
            state: sourceProfile.state,
            zipCode: sourceProfile.zipCode,
            serviceOptions: sourceProfile.serviceOptions || ['On-site', 'Pickup'],
            paymentMethod: sourceProfile.paymentMethod || 'Through Platform',
            capabilities: { products: false, services: true, menu: false },
            serviceRadius: sourceProfile.serviceRadius || null,
            hours: sourceProfile.hours || null,
            badges: sourceProfile.badges || sourceProfile.values || [],
            contactEmail: sourceProfile.contactEmail || null,
            phone: sourceProfile.phone || null,
            isVerified: sourceProfile.isVerified || false,
            profileStatus: sourceProfile.profileStatus || 'complete',
          });

          await storage.updateUser(userId, { role: 'service_provider' });
          return res.json({ success: true, newProfile: newVendor, message: 'User switched to service provider' });
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

  // ============================================================================
  // Subscription Reconciliation Admin Routes
  // ============================================================================

  // Get orphaned Stripe subscriptions (active subscriptions not linked to app users)
  app.get("/api/admin/orphaned-subscriptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      // Get all active subscriptions from Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
      });

      // Get all users with stripeSubscriptionId
      const allUsers = await storage.getUsers();
      const linkedSubscriptionIds = new Set(
        allUsers
          .filter((u: any) => u.stripeSubscriptionId)
          .map((u: any) => u.stripeSubscriptionId)
      );

      // Find orphaned subscriptions (not linked to any app user)
      const orphanedSubscriptions = [];
      for (const sub of stripeSubscriptions.data) {
        if (!linkedSubscriptionIds.has(sub.id)) {
          // Get customer details
          let customerEmail = '';
          let customerName = '';
          if (sub.customer && typeof sub.customer === 'string') {
            try {
              const customer = await stripe.customers.retrieve(sub.customer);
              if (customer && !customer.deleted) {
                customerEmail = (customer as any).email || '';
                customerName = (customer as any).name || '';
              }
            } catch (e) {
              console.error('Failed to fetch customer:', e);
            }
          }

          orphanedSubscriptions.push({
            subscriptionId: sub.id,
            customerId: sub.customer as string,
            customerEmail,
            customerName,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            created: new Date(sub.created * 1000).toISOString(),
          });
        }
      }

      console.log(`[Admin] Found ${orphanedSubscriptions.length} orphaned subscriptions`);
      res.json(orphanedSubscriptions);
    } catch (error) {
      console.error("Error fetching orphaned subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch orphaned subscriptions" });
    }
  });

  // Search users for linking (admin only)
  app.get("/api/admin/users/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const query = (req.query.q as string || '').toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const allUsers = await storage.getUsers();
      const matchingUsers = allUsers
        .filter((u: any) => {
          const email = (u.email || '').toLowerCase();
          const firstName = (u.firstName || '').toLowerCase();
          const lastName = (u.lastName || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          return email.includes(query) || 
                 firstName.includes(query) || 
                 lastName.includes(query) ||
                 username.includes(query);
        })
        .slice(0, 20)
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          isPassMember: u.isPassMember,
          stripeCustomerId: u.stripeCustomerId,
          stripeSubscriptionId: u.stripeSubscriptionId,
        }));

      res.json(matchingUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Link a Stripe subscription to an app user (admin only)
  app.post("/api/admin/link-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized - Admin access required" });
      }

      const { subscriptionId, customerId, targetUserId } = req.body;

      if (!subscriptionId || !targetUserId) {
        return res.status(400).json({ error: "subscriptionId and targetUserId are required" });
      }

      // Verify subscription exists in Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(400).json({ error: "Invalid or inactive subscription" });
      }

      // Verify target user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
      }

      // Update user with subscription data
      const periodEnd = new Date(subscription.current_period_end * 1000);
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';

      await storage.updateUser(targetUserId, {
        stripeCustomerId: customerId || (subscription.customer as string),
        stripeSubscriptionId: subscriptionId,
        membershipStatus: subscription.status,
        membershipPlan: 'rise_local_monthly',
        membershipCurrentPeriodEnd: periodEnd,
        isPassMember: isActive,
        passExpiresAt: periodEnd,
      });

      // Log membership event for audit
      await storage.logMembershipEvent({
        userId: targetUserId,
        stripeEventId: `admin-link-${Date.now()}`,
        eventType: 'admin_link_subscription',
        previousStatus: targetUser.membershipStatus || undefined,
        newStatus: subscription.status,
        previousPlan: targetUser.membershipPlan || undefined,
        newPlan: 'rise_local_monthly',
        metadata: JSON.stringify({ 
          subscriptionId, 
          customerId: customerId || subscription.customer,
          linkedBy: adminUserId,
        }),
      });

      console.log(`[Admin] Linked subscription ${subscriptionId} to user ${targetUserId} by admin ${adminUserId}`);
      
      res.json({ 
        success: true, 
        message: `Subscription linked successfully. User now has Rise Local Pass.`,
        user: {
          id: targetUserId,
          email: targetUser.email,
          isPassMember: true,
          passExpiresAt: periodEnd,
        }
      });
    } catch (error) {
      console.error("Error linking subscription:", error);
      res.status(500).json({ error: "Failed to link subscription" });
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

  // Get all unique values from all vendors
  app.get("/api/values/unique", async (req, res) => {
    try {
      const values = await storage.getAllVendorValues();
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unique values" });
    }
  });

  // ============================================================================
  // Draft Vendor Profile Routes (Auto-save Support)
  // ===== VENDOR PROFILE SELF-SERVICE ENDPOINTS =====
  // NOTE: These MUST be defined BEFORE /api/vendors/:id to avoid route conflicts
  
  // GET /api/vendors/me - Get current vendor's profile with deals
  app.get("/api/vendors/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      // Get deals for this vendor
      const result = await storage.getVendorWithDeals(vendor.id);
      if (!result) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      // Map deals to VendorDeal type (vendor sees all their own deals)
      const vendorDeals: VendorDeal[] = result.deals.map(deal => ({
        id: deal.id,
        title: deal.title,
        description: deal.description,
        dealType: deal.dealType,
        tier: deal.tier,
        category: deal.category,
        isActive: deal.isActive,
        discountType: deal.discountType,
        discountValue: deal.discountValue,
        isPassLocked: deal.isPassLocked,
        finePrint: deal.finePrint,
        imageUrl: deal.imageUrl,
      }));

      res.json({
        vendor: result.vendor,
        deals: vendorDeals,
      });
    } catch (error) {
      console.error("[GET /api/vendors/me] Error:", error);
      res.status(500).json({ error: "Failed to fetch vendor profile" });
    }
  });

  // PATCH /api/vendors/me - Update current vendor's profile
  app.patch("/api/vendors/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }

      // Validate request body with strict schema
      const parsed = updateVendorProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid profile data",
          details: parsed.error.errors 
        });
      }

      const updateData = parsed.data;

      // If address is being updated, geocode it
      if (updateData.address || updateData.city || updateData.zipCode) {
        const fullAddress = buildFullAddress(
          updateData.address || vendor.address || "",
          updateData.city || vendor.city,
          updateData.state || vendor.state,
          updateData.zipCode || vendor.zipCode
        );
        
        const coordinates = await geocodeAddress(fullAddress);
        if (coordinates) {
          (updateData as any).latitude = coordinates.latitude;
          (updateData as any).longitude = coordinates.longitude;
        }
      }

      const updatedVendor = await storage.updateVendor(vendor.id, updateData);
      
      console.log("[PATCH /api/vendors/me] Profile updated for userId:", userId);
      res.json({ success: true, vendor: updatedVendor });
    } catch (error) {
      console.error("[PATCH /api/vendors/me] Error:", error);
      res.status(500).json({ error: "Failed to update vendor profile" });
    }
  });

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
        locationType: "Physical storefront",
        serviceOptions: [],
        paymentMethod: "Through Platform",
        capabilities: {
          products: vendorType === 'shop',
          services: vendorType === 'service',
          menu: vendorType === 'dine',
        },
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
      
      // Update user role AND set onboardingComplete to true
      await storage.updateUser(userId, { 
        role: "vendor",
        onboardingComplete: true 
      });
      
      console.log("[COMPLETE] Vendor profile completed successfully, onboardingComplete set to true");
      res.json({ success: true, vendor: updatedVendor });
    } catch (error) {
      console.error("[COMPLETE ERROR]", error);
      res.status(400).json({ 
        error: "Failed to complete vendor profile",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/vendors/:id - Public vendor profile with deals
  app.get("/api/vendors/:id", async (req: any, res) => {
    try {
      const result = await storage.getVendorWithDeals(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      // Check if vendor profile is hidden
      if (!result.vendor.isProfileVisible) {
        // Allow access if current user is the owner or admin
        const currentUserId = req.session?.userId || req.user?.claims?.sub;
        const currentUser = currentUserId ? await storage.getUser(currentUserId) : null;
        const isOwner = currentUserId === result.vendor.ownerId;
        const isAdmin = currentUser?.role === "admin";
        
        if (!isOwner && !isAdmin) {
          // Return a special response for hidden profiles (SEO-safe, no 404)
          return res.status(200).json({ 
            vendor: null,
            deals: [],
            isHidden: true,
            message: "This business is currently not accepting visitors."
          });
        }
      }

      // Filter and map deals - only return published and active deals for public profile
      const vendorDeals: VendorDeal[] = result.deals
        .filter(deal => deal.status === 'published' && deal.isActive)
        .map(deal => ({
          id: deal.id,
          title: deal.title,
          description: deal.description,
          dealType: deal.dealType,
          tier: deal.tier,
          category: deal.category,
          isActive: deal.isActive,
          discountType: deal.discountType,
          discountValue: deal.discountValue,
          isPassLocked: deal.isPassLocked,
          finePrint: deal.finePrint,
          imageUrl: deal.imageUrl,
        }));

      res.json({
        vendor: result.vendor,
        deals: vendorDeals,
      });
    } catch (error) {
      console.error("[GET /api/vendors/:id] Error:", error);
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
      
      // Geocode location based on city/zipCode
      let latitude: string | null = null;
      let longitude: string | null = null;
      const locationString = buildFullAddress(data.address || null, data.city || "", "FL", data.zipCode || "");
      if (locationString) {
        const coordinates = await geocodeAddress(locationString);
        if (coordinates) {
          latitude = coordinates.latitude;
          longitude = coordinates.longitude;
          console.log("[ONBOARD] Geocoded location:", locationString, "->", coordinates);
        } else {
          console.log("[ONBOARD] Geocoding failed for:", locationString);
        }
      }
      
      // Convert payment methods array to string
      const paymentMethod = paymentMethods.join(", ");
      
      // Create vendor profile based on type
      if (vendorType === "shop") {
        // Create shop vendor
        const vendorData = {
          ownerId: userId,
          vendorType: "shop" as const,
          businessName: data.businessName,
          contactName: data.contactName,
          bio: data.bio,
          tagline: data.tagline || "",
          city: data.city,
          state: "FL",
          zipCode: data.zipCode,
          latitude,
          longitude,
          categories: data.categories || [],
          localSourcingPercent: data.localSourcingPercent || 0,
          showLocalSourcing: data.showLocalSourcing || false,
          contactEmail: data.email || email,
          phone: data.phone || "",
          website: data.website || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          locationType: "Physical storefront",
          serviceOptions,
          paymentMethod,
          capabilities: { products: true, services: false, menu: false },
          fulfillmentOptions: fulfillment,
        };
        
        await storage.createVendor(vendorData);
        await storage.updateUser(userId, { role: "vendor" });
        console.log("[ONBOARD] Created shop vendor profile");
        
      } else if (vendorType === "restaurant") {
        // Create dine vendor (restaurant)
        const vendorData = {
          ownerId: userId,
          vendorType: "dine" as const,
          businessName: data.businessName,
          contactName: data.contactName,
          bio: data.bio,
          tagline: data.tagline || "",
          city: data.city,
          state: "FL",
          zipCode: data.zipCode,
          latitude,
          longitude,
          categories: data.categories || [],
          contactEmail: data.email || email,
          phone: data.phone || "",
          website: data.website || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          locationType: "Physical storefront",
          serviceOptions,
          paymentMethod,
          capabilities: { products: false, services: false, menu: true },
        };
        
        await storage.createVendor(vendorData);
        await storage.updateUser(userId, { role: "restaurant" });
        console.log("[ONBOARD] Created restaurant vendor profile");
        
      } else if (vendorType === "service") {
        // Create service vendor
        const vendorData = {
          ownerId: userId,
          vendorType: "service" as const,
          businessName: data.businessName,
          contactName: data.contactName,
          bio: data.bio,
          tagline: data.tagline || "",
          city: data.city,
          state: "FL",
          zipCode: data.zipCode,
          latitude,
          longitude,
          categories: data.categories || [],
          contactEmail: data.email || email,
          phone: data.phone || "",
          website: data.website || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          locationType: "Home-based",
          serviceOptions,
          paymentMethod,
          capabilities: { products: false, services: true, menu: false },
          serviceDetails: {
            serviceAreas: [data.city],
            certifications: [],
            yearsInBusiness: undefined,
          },
        };
        
        await storage.createVendor(vendorData);
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
  // Draft Restaurant Profile Routes (LEGACY - redirects to unified vendor system)
  // ============================================================================

  app.get("/api/restaurants/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      if (vendor && vendor.vendorType === "dine") {
        return res.json(vendor);
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
      const data = req.body;
      
      console.log("[DRAFT] Creating draft dine vendor for userId:", userId);
      
      const user = await storage.getUser(userId);
      const email = user?.email || "";
      
      const vendorData = {
        ownerId: userId,
        vendorType: "dine" as const,
        businessName: data.businessName || "Draft Restaurant",
        displayName: data.displayName || data.businessName,
        contactName: data.contactName || "",
        bio: data.bio || "",
        tagline: data.tagline || "",
        city: data.city || "Fort Myers",
        state: "FL",
        zipCode: data.zipCode || "",
        contactEmail: data.email || email,
        phone: data.phone || "",
        website: data.website || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        locationType: data.locationType || "Physical storefront",
        serviceOptions: data.serviceOptions || ["On-site dining"],
        paymentMethod: data.paymentMethod || "Through Platform",
        capabilities: { products: false, services: false, menu: true },
        restaurantDetails: {
          seatingCapacity: data.seatingCapacity || null,
          acceptsReservations: data.acceptsReservations || false,
        },
        profileStatus: "draft",
      };
      
      const vendor = await storage.createVendor(vendorData);
      console.log("[DRAFT] Created draft dine vendor:", vendor.id);
      
      res.status(201).json(vendor);
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
      const vendorId = req.params.id;
      
      const vendor = await storage.getVendor(vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[DRAFT] Updating dine vendor:", vendorId);
      
      const updatedVendor = await storage.updateVendor(vendorId, req.body);
      res.json(updatedVendor);
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
      const vendorId = req.params.id;
      
      const vendor = await storage.getVendor(vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[COMPLETE] Marking dine vendor as complete:", vendorId);
      
      const updatedVendor = await storage.updateVendor(vendorId, { 
        profileStatus: "complete" 
      });
      
      await storage.updateUser(userId, { role: "vendor" });
      
      res.json({ success: true, vendor: updatedVendor });
    } catch (error) {
      console.error("[COMPLETE] Error completing restaurant profile:", error);
      res.status(400).json({ 
        error: "Failed to complete restaurant profile",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============================================================================
  // Draft Service Provider Profile Routes (LEGACY - redirects to unified vendor system)
  // ============================================================================

  app.get("/api/service-providers/draft", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      if (vendor && vendor.vendorType === "service") {
        return res.json(vendor);
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
      const data = req.body;
      
      console.log("[DRAFT] Creating draft service vendor for userId:", userId);
      
      const user = await storage.getUser(userId);
      const email = user?.email || "";
      
      const vendorData = {
        ownerId: userId,
        vendorType: "service" as const,
        businessName: data.businessName || "Draft Service Provider",
        displayName: data.displayName || data.businessName,
        contactName: data.contactName || "",
        bio: data.bio || "",
        tagline: data.tagline || "",
        city: data.city || "Fort Myers",
        state: "FL",
        zipCode: data.zipCode || "",
        contactEmail: data.email || email,
        phone: data.phone || "",
        website: data.website || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        locationType: data.locationType || "Home-based",
        serviceOptions: data.serviceOptions || ["On-site", "Pickup"],
        paymentMethod: data.paymentMethod || "Through Platform",
        capabilities: { products: false, services: true, menu: false },
        serviceDetails: {
          serviceAreas: [data.city || "Fort Myers"],
          certifications: data.certifications || [],
          yearsInBusiness: data.yearsInBusiness || null,
        },
        profileStatus: "draft",
      };
      
      const vendor = await storage.createVendor(vendorData);
      console.log("[DRAFT] Created draft service vendor:", vendor.id);
      
      res.status(201).json(vendor);
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
      const vendorId = req.params.id;
      
      const vendor = await storage.getVendor(vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[DRAFT] Updating service vendor:", vendorId);
      
      const updatedVendor = await storage.updateVendor(vendorId, req.body);
      res.json(updatedVendor);
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
      const vendorId = req.params.id;
      
      const vendor = await storage.getVendor(vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      console.log("[COMPLETE] Marking service vendor as complete:", vendorId);
      
      const updatedVendor = await storage.updateVendor(vendorId, { 
        profileStatus: "complete" 
      });
      
      await storage.updateUser(userId, { role: "vendor" });
      
      res.json({ success: true, vendor: updatedVendor });
    } catch (error) {
      console.error("[COMPLETE] Error completing service provider profile:", error);
      res.status(400).json({ 
        error: "Failed to complete service provider profile",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============================================================================
  // Rise Local Pass Billing Routes (Consumer Subscription)
  // ============================================================================

  // Create Stripe Checkout Session for Rise Local Pass subscription
  app.post("/api/billing/create-checkout-session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get plan type from request body (default to monthly)
      const { plan = 'monthly' } = req.body;
      
      // Check for required environment variables based on plan
      const monthlyPriceId = process.env.STRIPE_RISELOCAL_MONTHLY_PRICE_ID;
      const annualPriceId = process.env.STRIPE_RISELOCAL_ANNUAL_PRICE_ID;
      const appBaseUrl = process.env.APP_BASE_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
      
      // Select price ID based on plan
      let priceId: string | undefined;
      if (plan === 'annual') {
        priceId = annualPriceId;
        if (!priceId) {
          console.error("[Billing] Missing STRIPE_RISELOCAL_ANNUAL_PRICE_ID environment variable");
          return res.status(500).json({ error: "Annual plan not configured yet" });
        }
      } else {
        priceId = monthlyPriceId;
        if (!priceId) {
          console.error("[Billing] Missing STRIPE_RISELOCAL_MONTHLY_PRICE_ID environment variable");
          return res.status(500).json({ error: "Billing not configured" });
        }
      }
      
      console.log('[Billing] Creating checkout session for plan:', plan, 'priceId:', priceId, 'appUserId:', userId);

      // Create Checkout Session without customer parameter to avoid resource_missing errors
      // Stripe will create/link customer automatically; we use client_reference_id and metadata.appUserId for reliable user lookup
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email || undefined, // Let Stripe handle customer creation
        client_reference_id: userId, // Primary user lookup method
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${appBaseUrl}/checkout/success`,
        cancel_url: `${appBaseUrl}/checkout/cancel`,
        metadata: {
          appUserId: userId, // Primary user lookup method (renamed from userId for clarity)
          plan: plan, // 'monthly' or 'annual'
          priceId: priceId,
        },
      });

      console.log('[Billing] Created checkout session:', session.id, 'appUserId:', userId, 'customer_email:', user.email);
      res.json({ url: session.url });
    } catch (error) {
      console.error("[Billing] Error creating checkout session:", error);
      res.status(500).json({ 
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Create Stripe Billing Portal session for managing subscription
  app.post("/api/billing/create-portal-session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found. Please subscribe first." });
      }

      const appBaseUrl = process.env.APP_BASE_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${appBaseUrl}/account`,
      });

      console.log('[Billing] Created portal session for user:', userId);
      res.json({ url: session.url });
    } catch (error) {
      console.error("[Billing] Error creating portal session:", error);
      res.status(500).json({ 
        error: "Failed to create billing portal session",
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

      // Get vendor profile (unified system)
      const vendorProfile = await storage.getVendorByOwnerId(userId);
      
      if (!vendorProfile) {
        return res.status(404).json({ error: "Vendor profile not found. Please create a vendor profile first." });
      }

      // Check if already has a Connect account
      if (vendorProfile.stripeConnectAccountId) {
        return res.json({ 
          accountId: vendorProfile.stripeConnectAccountId,
          message: "Account already exists"
        });
      }

      // Determine product description based on vendor type
      let productDescription = 'Local products and goods';
      if (vendorProfile.vendorType === 'dine') {
        productDescription = 'Restaurant and food services';
      } else if (vendorProfile.vendorType === 'service') {
        productDescription = 'Professional services';
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
          product_description: productDescription,
          url: vendorProfile.website || undefined,
        },
      });

      // Store the account ID in the vendor profile
      await storage.updateVendor(vendorProfile.id, {
        stripeConnectAccountId: account.id,
      });

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

      // Get vendor profile and Connect account ID (unified system)
      const vendor = await storage.getVendorByOwnerId(userId);
      const stripeAccountId = vendor?.stripeConnectAccountId || null;

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

      // Get vendor profile and Connect account ID (unified system)
      const vendor = await storage.getVendorByOwnerId(userId);
      const stripeAccountId = vendor?.stripeConnectAccountId || null;
      const vendorId = vendor?.id || null;

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
      if (vendorId && onboardingComplete) {
        await storage.updateVendor(vendorId, {
          stripeOnboardingComplete: true,
        });
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
  // NOTE: This endpoint receives raw body from express.raw() middleware in index.ts
  app.post("/api/stripe/webhook", async (req, res) => {
    console.log('[Webhook] Received request');
    
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      console.error('[Webhook] FAILED: Missing stripe-signature header');
      return res.status(400).send('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('[Webhook] FAILED: STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).send('Webhook secret not configured');
      }
      
      // Verify signature using raw body (Buffer from express.raw middleware)
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log('[Webhook] Signature verified successfully, event type:', event.type);

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

        // Find vendor with this Stripe account ID and update status (unified system)
        const vendors = await storage.getVendors();
        const vendor = vendors.find((v: any) => v.stripeConnectAccountId === accountId);
        
        if (vendor) {
          await storage.updateVendor(vendor.id, {
            stripeOnboardingComplete: onboardingComplete,
          });
          console.log(`Updated Stripe onboarding status for vendor ${vendor.id}`);
        } else {
          console.warn(`No vendor found with Stripe Connect account ID ${accountId}`);
        }
      }

      // Handle Rise Local Pass subscription events
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        // Support both new appUserId and legacy userId metadata keys
        const appUserId = session.metadata?.appUserId || session.metadata?.userId || session.client_reference_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        
        console.log('[Webhook] checkout.session.completed', {
          eventId: event.id,
          eventType: event.type,
          appUserId,
          customer: customerId,
          subscription: subscriptionId,
          client_reference_id: session.client_reference_id,
          metadata: session.metadata,
        });
        
        if (session.mode === 'subscription' && session.subscription) {
          // Fetch the subscription details
          const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId as string) as any;
          
          // Primary lookup: use metadata.appUserId, metadata.userId (legacy), or client_reference_id
          let user = null;
          let lookupMethod = '';
          
          if (appUserId) {
            user = await storage.getUser(appUserId);
            lookupMethod = session.metadata?.appUserId ? 'metadata.appUserId' : 
                          session.metadata?.userId ? 'metadata.userId (legacy)' : 
                          'client_reference_id';
          }
          
          // Fallback: try stripeCustomerId if primary lookup failed
          if (!user && customerId) {
            user = await storage.getUserByStripeCustomerId(customerId);
            lookupMethod = 'stripeCustomerId';
          }
          
          if (user) {
            try {
              const periodEnd = new Date(subscriptionData.current_period_end * 1000);
              const isActive = subscriptionData.status === 'active' || subscriptionData.status === 'trialing';
              
              // Determine plan type from metadata or price ID
              const planType = session.metadata?.plan || 'monthly';
              const membershipPlan = planType === 'annual' ? 'rise_local_annual' : 'rise_local_monthly';
              
              const previousStatus = user.membershipStatus;
              const previousPlan = user.membershipPlan;
              
              // Update user with subscription and link stripeCustomerId if available
              await storage.updateUser(user.id, {
                stripeCustomerId: customerId || user.stripeCustomerId,
                stripeSubscriptionId: subscriptionData.id,
                membershipStatus: subscriptionData.status,
                membershipPlan: membershipPlan,
                membershipCurrentPeriodEnd: periodEnd,
                isPassMember: isActive,
                passExpiresAt: periodEnd,
              });
              
              // Log membership event for audit
              await storage.logMembershipEvent({
                userId: user.id,
                stripeEventId: event.id,
                eventType: 'checkout.session.completed',
                previousStatus: previousStatus || undefined,
                newStatus: subscriptionData.status,
                previousPlan: previousPlan || undefined,
                newPlan: membershipPlan,
                metadata: JSON.stringify({ subscriptionId: subscriptionData.id, periodEnd: periodEnd.toISOString() }),
              });
              
              console.log('[Webhook] Pass unlock SUCCESS', {
                eventId: event.id,
                eventType: event.type,
                appUserId: user.id,
                customer: customerId,
                subscription: subscriptionData.id,
                plan: membershipPlan,
                status: subscriptionData.status,
                lookupMethod,
              });
            } catch (dbError) {
              console.error('[Webhook] Pass unlock FAILED - database error', {
                eventId: event.id,
                eventType: event.type,
                appUserId: user.id,
                customer: customerId,
                subscription: subscriptionId,
                error: dbError instanceof Error ? dbError.message : String(dbError),
              });
              // Return 500 so Stripe retries
              return res.status(500).json({ error: 'Database update failed' });
            }
          } else {
            console.error('[Webhook] Pass unlock FAILED - no user found', {
              eventId: event.id,
              eventType: event.type,
              appUserId,
              customer: customerId,
              subscription: subscriptionId,
              client_reference_id: session.client_reference_id,
              metadata: session.metadata,
            });
            // Return 500 so Stripe retries - user may not exist yet
            return res.status(500).json({ error: 'User not found for subscription' });
          }
        }
      }

      if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
        const subscriptionData = event.data.object as any;
        const customerId = subscriptionData.customer as string;
        console.log('[Webhook]', event.type, 'for customer:', customerId);
        
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          const periodEnd = new Date(subscriptionData.current_period_end * 1000);
          const isActive = subscriptionData.status === 'active' || subscriptionData.status === 'trialing';
          const previousStatus = user.membershipStatus;
          const previousPlan = user.membershipPlan;
          
          await storage.updateUser(user.id, {
            stripeSubscriptionId: subscriptionData.id,
            membershipStatus: subscriptionData.status,
            membershipPlan: isActive ? 'rise_local_monthly' : user.membershipPlan,
            membershipCurrentPeriodEnd: periodEnd,
            isPassMember: isActive,
            passExpiresAt: periodEnd,
          });
          
          // Log membership event for audit
          await storage.logMembershipEvent({
            userId: user.id,
            stripeEventId: event.id,
            eventType: event.type,
            previousStatus: previousStatus || undefined,
            newStatus: subscriptionData.status,
            previousPlan: previousPlan || undefined,
            newPlan: isActive ? 'rise_local_monthly' : user.membershipPlan || undefined,
            metadata: JSON.stringify({ subscriptionId: subscriptionData.id, periodEnd: periodEnd.toISOString() }),
          });
          
          console.log('[Webhook] User subscription updated:', user.id, 'status:', subscriptionData.status);
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const subscriptionData = event.data.object as any;
        const customerId = subscriptionData.customer as string;
        console.log('[Webhook] customer.subscription.deleted for customer:', customerId);
        
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          const previousStatus = user.membershipStatus;
          const previousPlan = user.membershipPlan;
          
          await storage.updateUser(user.id, {
            stripeSubscriptionId: null,
            membershipStatus: 'canceled',
            membershipPlan: null,
            isPassMember: false,
          });
          
          // Log membership event for audit
          await storage.logMembershipEvent({
            userId: user.id,
            stripeEventId: event.id,
            eventType: 'customer.subscription.deleted',
            previousStatus: previousStatus || undefined,
            newStatus: 'canceled',
            previousPlan: previousPlan || undefined,
            newPlan: undefined,
            metadata: JSON.stringify({ subscriptionId: subscriptionData.id }),
          });
          
          console.log('[Webhook] User subscription deleted:', user.id);
        }
      }

      if (event.type === 'invoice.paid') {
        const invoiceData = event.data.object as any;
        const customerId = invoiceData.customer as string;
        console.log('[Webhook] invoice.paid for customer:', customerId);
        
        if (invoiceData.subscription) {
          const subscriptionData = await stripe.subscriptions.retrieve(invoiceData.subscription as string) as any;
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            const previousStatus = user.membershipStatus;
            const periodEnd = new Date(subscriptionData.current_period_end * 1000);
            await storage.updateUser(user.id, {
              membershipStatus: 'active',
              membershipCurrentPeriodEnd: periodEnd,
              isPassMember: true,
              passExpiresAt: periodEnd,
            });
            
            // Log membership event for audit
            await storage.logMembershipEvent({
              userId: user.id,
              stripeEventId: event.id,
              eventType: 'invoice.paid',
              previousStatus: previousStatus || undefined,
              newStatus: 'active',
              previousPlan: user.membershipPlan || undefined,
              newPlan: user.membershipPlan || undefined,
              metadata: JSON.stringify({ subscriptionId: invoiceData.subscription, invoiceId: invoiceData.id, periodEnd: periodEnd.toISOString() }),
            });
            
            console.log('[Webhook] User membership renewed:', user.id);
          }
        }
      }

      if (event.type === 'invoice.payment_failed') {
        const invoiceData = event.data.object as any;
        const customerId = invoiceData.customer as string;
        console.log('[Webhook] invoice.payment_failed for customer:', customerId);
        
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          const previousStatus = user.membershipStatus;
          await storage.updateUser(user.id, {
            membershipStatus: 'past_due',
          });
          
          // Log membership event for audit
          await storage.logMembershipEvent({
            userId: user.id,
            stripeEventId: event.id,
            eventType: 'invoice.payment_failed',
            previousStatus: previousStatus || undefined,
            newStatus: 'past_due',
            previousPlan: user.membershipPlan || undefined,
            newPlan: user.membershipPlan || undefined,
            metadata: JSON.stringify({ invoiceId: invoiceData.id }),
          });
          
          console.log('[Webhook] User payment failed:', user.id);
        }
      }

      // Always return 200 to acknowledge receipt (Stripe best practice)
      console.log('[Webhook] Processing complete for event:', event.type);
      res.status(200).json({ received: true });
    } catch (error) {
      // Distinguish between signature errors and processing errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('signature') || errorMessage.includes('Webhook')) {
        // Signature verification failed - return 400 so Stripe knows to retry
        console.error('[Webhook] SIGNATURE VERIFICATION FAILED:', errorMessage);
        return res.status(400).send(`Webhook signature verification failed: ${errorMessage}`);
      }
      
      // Processing error - still return 200 to prevent retries (event was received)
      console.error('[Webhook] PROCESSING ERROR (returning 200 anyway):', errorMessage);
      res.status(200).json({ received: true, error: 'Processing failed but event acknowledged' });
    }
  });

  // Debug endpoint for membership status (admin only)
  app.get("/api/debug/membership/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      
      // Only allow users to view their own membership info (or admin check could go here)
      const requestingUser = await storage.getUser(requestingUserId);
      if (!requestingUser) {
        return res.status(403).json({ error: "User not found" });
      }
      
      // For now, only allow self-lookup or admin role
      if (requestingUserId !== targetUserId && requestingUser.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(targetUserId);
      if (!user) {
        return res.status(404).json({ error: "Target user not found" });
      }
      
      // Get membership events
      const events = await storage.getMembershipEvents(targetUserId, 20);
      
      res.json({
        userId: user.id,
        membershipStatus: {
          isPassMember: user.isPassMember,
          passExpiresAt: user.passExpiresAt,
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: user.stripeSubscriptionId,
          membershipStatus: user.membershipStatus,
          membershipPlan: user.membershipPlan,
          membershipCurrentPeriodEnd: user.membershipCurrentPeriodEnd,
        },
        recentEvents: events,
      });
    } catch (error) {
      console.error("[Debug Membership] Error:", error);
      res.status(500).json({ error: "Failed to fetch membership debug info" });
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
      
      // Geocode address if address fields changed
      const addressChanged = validatedData.address !== undefined || 
                             validatedData.city !== undefined || 
                             validatedData.state !== undefined || 
                             validatedData.zipCode !== undefined;
      
      if (addressChanged) {
        // Build full address using new values or existing vendor values
        const fullAddress = buildFullAddress(
          validatedData.address ?? vendor.address,
          validatedData.city ?? vendor.city,
          validatedData.state ?? vendor.state,
          validatedData.zipCode ?? vendor.zipCode
        );
        
        console.log("[PATCH /api/vendors/:id] Geocoding address:", fullAddress);
        const coordinates = await geocodeAddress(fullAddress);
        
        if (coordinates) {
          validatedData.latitude = coordinates.latitude;
          validatedData.longitude = coordinates.longitude;
          console.log("[PATCH /api/vendors/:id] Geocoded coordinates:", coordinates);
        } else {
          console.log("[PATCH /api/vendors/:id] Geocoding failed, keeping null coordinates");
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
      
      // ENFORCE OWNERSHIP: Always set vendorId to the verified vendor's ID
      // This ensures products can never become orphaned or attached to wrong vendor
      const productData = {
        ...validatedData,
        vendorId: vendor.id,  // Override with verified vendor ID as source of truth
      };
      
      const product = await storage.createProduct(productData);
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

  // DISABLED: Cart/checkout functionality removed
  /*
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
  */

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

  // DISABLED: Cart/checkout functionality removed
  /*
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
  */

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

  // GET /api/users/:id - Public profile endpoint (limited info)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const profile = await storage.getUserPublicProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(profile);
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
      
      // Validate using Zod schema with explicit field picking
      const validatedData = insertUserSchema.partial().pick({
        firstName: true,
        lastName: true,
        phone: true,
      }).parse(req.body);
      
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

  // ===== RESTAURANT ROUTES (Legacy - using unified vendor system) =====

  app.get("/api/restaurants", async (req, res) => {
    try {
      const allVendors = await storage.getVendors();
      const restaurants = allVendors.filter((v: any) => v.vendorType === 'dine');
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/verified", async (req, res) => {
    try {
      const allVendors = await storage.getVendors();
      const restaurants = allVendors.filter((v: any) => v.vendorType === 'dine' && v.isVerified);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch verified restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== 'dine') {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      const validatedData = insertVendorSchema.parse({
        ...req.body,
        vendorType: 'dine',
        capabilities: { products: false, services: false, menu: true },
      });
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid restaurant data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== 'dine') {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      // Verify ownership
      if (vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this restaurant" });
      }
      
      const validatedData = insertVendorSchema.partial().parse(req.body);
      await storage.updateVendor(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid restaurant update data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/restaurants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== 'dine') {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      // Verify ownership
      if (vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this restaurant" });
      }
      
      await storage.deleteVendor(req.params.id);
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
      await storage.updateVendorVerification(req.params.id, isVerified);
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
      const menuItems = await storage.getMenuItemsByVendor(req.params.restaurantId);
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/restaurants/:restaurantId/menu-items/category/:category", async (req, res) => {
    try {
      const allMenuItems = await storage.getMenuItemsByVendor(req.params.restaurantId);
      const menuItems = allMenuItems.filter((item: any) => item.category === req.params.category);
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
      
      // Verify the user owns the vendor (restaurant)
      if (validatedData.restaurantId) {
        const vendor = await storage.getVendor(validatedData.restaurantId);
        if (!vendor || vendor.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to create menu items for this restaurant" });
        }
        
        // Verify vendor profile is complete before allowing menu item creation
        if (vendor.profileStatus !== "complete") {
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
      
      // Verify ownership through vendor (restaurant)
      if (menuItem.restaurantId) {
        const vendor = await storage.getVendor(menuItem.restaurantId);
        if (!vendor || vendor.ownerId !== userId) {
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
      
      // Verify ownership through vendor (restaurant)
      if (menuItem.restaurantId) {
        const vendor = await storage.getVendor(menuItem.restaurantId);
        if (!vendor || vendor.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized to delete this menu item" });
        }
      }
      
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // Restaurant Review routes (Legacy - using unified vendor system)
  app.get("/api/restaurants/:restaurantId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getVendorReviews(req.params.restaurantId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/restaurant-reviews", async (req, res) => {
    try {
      const validatedData = insertVendorReviewSchema.parse({
        ...req.body,
        vendorId: req.body.restaurantId,
      });
      const review = await storage.createVendorReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ error: "Invalid review data" });
    }
  });

  app.delete("/api/restaurant-reviews/:id", async (req, res) => {
    try {
      await storage.deleteVendorReview(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Restaurant FAQ routes (Legacy - using unified vendor system)
  app.get("/api/restaurants/:restaurantId/faqs", async (req, res) => {
    try {
      const faqs = await storage.getVendorFAQs(req.params.restaurantId);
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch FAQs" });
    }
  });

  app.post("/api/restaurant-faqs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertVendorFAQSchema.parse({
        ...req.body,
        vendorId: req.body.restaurantId,
      });
      
      // Verify the user owns the vendor (restaurant)
      const vendor = await storage.getVendor(validatedData.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to create FAQs for this restaurant" });
      }
      
      const faq = await storage.createVendorFAQ(validatedData);
      res.status(201).json(faq);
    } catch (error) {
      res.status(400).json({ error: "Invalid FAQ data" });
    }
  });

  app.patch("/api/restaurant-faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const faq = await storage.getVendorFAQ(req.params.id);
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      // Verify ownership through vendor (restaurant)
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

  app.delete("/api/restaurant-faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const faq = await storage.getVendorFAQ(req.params.id);
      if (!faq) {
        return res.status(404).json({ error: "FAQ not found" });
      }
      
      // Verify ownership through vendor (restaurant)
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

  // Extended restaurant routes (Legacy - using unified vendor system)
  app.get("/api/restaurants/:restaurantId/events", async (req, res) => {
    try {
      const events = await storage.getEventsByVendor(req.params.restaurantId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant events" });
    }
  });

  // ===== SERVICE PROVIDER ROUTES (Legacy - using unified vendor system) =====
  
  // Legacy endpoint - redirects to unified /api/auth/my-vendor
  app.get('/api/auth/my-service-provider', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendorByOwnerId(userId);
      res.json(vendor || null);
    } catch (error) {
      console.error("Error fetching user's service provider:", error);
      res.status(500).json({ message: "Failed to fetch vendor profile" });
    }
  });

  // Service Vendor routes
  app.get("/api/service-vendors", async (req, res) => {
    try {
      // Return all service vendors (completed profiles only)
      const serviceVendors = await storage.getServiceVendors();
      res.json(serviceVendors);
    } catch (error) {
      console.error("[GET /api/service-vendors] Error fetching service vendors:", error);
      res.status(500).json({ error: "Failed to fetch service vendors" });
    }
  });

  // Service Provider routes
  app.get("/api/services", async (req, res) => {
    try {
      // Return all active service offerings with provider information
      const offerings = await storage.getAllServiceOfferingsWithProvider();
      res.json(offerings);
    } catch (error) {
      console.error("[GET /api/services] Error fetching service offerings:", error);
      res.status(500).json({ error: "Failed to fetch service offerings" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== 'service') {
        return res.status(404).json({ error: "Service provider not found" });
      }
      
      // Also fetch offerings for this provider
      const offerings = await storage.getServiceOfferings(req.params.id);
      
      res.json({ ...vendor, offerings });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service provider" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has a service provider profile
      const existing = await storage.getVendorByOwnerId(userId);
      if (existing) {
        return res.status(400).json({ error: "User already has a vendor profile" });
      }
      
      const validated = insertVendorSchema.parse({
        ...req.body,
        ownerId: userId,
        vendorType: 'service',
        capabilities: { products: false, services: true, menu: false },
      });
      
      const vendor = await storage.createVendor(validated);
      res.status(201).json(vendor);
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
      const vendor = await storage.getVendor(req.params.id);
      
      if (!vendor || vendor.vendorType !== 'service') {
        return res.status(404).json({ error: "Service provider not found" });
      }
      
      if (vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this service provider" });
      }
      
      const validated = insertVendorSchema.partial().parse(req.body);
      await storage.updateVendor(req.params.id, validated);
      
      const updated = await storage.getVendor(req.params.id);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update service provider" });
    }
  });

  // Service Offering routes
  // Unified vendor-based endpoint for service offerings (matches /api/vendors/:vendorId/services pattern)
  app.get("/api/vendors/:vendorId/service-offerings", async (req, res) => {
    try {
      const offerings = await storage.getServiceOfferings(req.params.vendorId);
      res.json(offerings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service offerings" });
    }
  });

  // Legacy endpoint - kept for backward compatibility
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
      
      // Verify user owns this vendor
      const vendor = await storage.getVendor(validated.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to create offerings for this vendor" });
      }
      
      // Verify vendor profile is complete before allowing offering creation
      if (vendor.profileStatus !== "complete") {
        return res.status(400).json({ error: "Please complete your vendor profile before creating service offerings" });
      }
      
      // ENFORCE DUAL OWNERSHIP: Always set both vendorId AND serviceProviderId to ensure bulletproof ownership
      const offeringData = {
        ...validated,
        vendorId: vendor.id,  // Primary ownership field (source of truth)
        serviceProviderId: vendor.id,  // Legacy field - kept for backward compatibility
      };
      
      const offering = await storage.createServiceOffering(offeringData);
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
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(offering.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
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
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(offering.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
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
      const vendor = await storage.getVendorByOwnerId(userId);
      
      if (!vendor) {
        return res.status(404).json({ error: "No vendor profile found" });
      }
      
      const bookings = await storage.getProviderBookings(vendor.id);
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
      
      // Verify ownership through vendor
      const vendor = await storage.getVendor(booking.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
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

  // ============ B2C CONVERSATION ROUTES ============

  // POST /api/b2c/conversations/start - Start or get existing conversation with a business
  app.post("/api/b2c/conversations/start", isAuthenticated, async (req: any, res) => {
    try {
      const consumerId = req.user.claims.sub;
      const { vendorId, dealId } = req.body;

      if (!vendorId) {
        return res.status(400).json({ error: "vendorId is required" });
      }

      // Verify vendor exists
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Get or create conversation
      const conversation = await storage.getOrCreateConversation(consumerId, vendorId, dealId);
      
      console.log("[B2C] Conversation started/retrieved:", {
        conversationId: conversation.id,
        consumerId,
        vendorId,
        dealId
      });

      res.json({ 
        conversationId: conversation.id,
        conversation,
        vendorName: vendor.businessName
      });
    } catch (error) {
      console.error("Error starting conversation:", error);
      res.status(500).json({ error: "Failed to start conversation" });
    }
  });

  // GET /api/b2c/conversations - Get all B2C conversations for current user
  app.get("/api/b2c/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check if user is a vendor
      const isVendorRole = ['vendor', 'restaurant', 'service_provider'].includes(user.role || '');
      
      if (isVendorRole) {
        // Get vendor's conversations
        const vendor = await storage.getVendorByOwnerId(userId);
        if (!vendor) {
          return res.json([]);
        }
        const conversations = await storage.getB2CConversationsForVendor(vendor.id);
        res.json({ role: 'vendor', conversations });
      } else {
        // Get consumer's conversations
        const conversations = await storage.getB2CConversationsForConsumer(userId);
        res.json({ role: 'consumer', conversations });
      }
    } catch (error) {
      console.error("Error fetching B2C conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // GET /api/b2c/conversations/:conversationId - Get messages in a conversation
  app.get("/api/b2c/conversations/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId } = req.params;

      // Get conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user has access (either consumer or vendor owner)
      const vendor = await storage.getVendor(conversation.vendorId);
      const isConsumer = conversation.consumerId === userId;
      const isVendorOwner = vendor?.ownerId === userId;

      if (!isConsumer && !isVendorOwner) {
        return res.status(403).json({ error: "Access denied to this conversation" });
      }

      // Get messages
      const messages = await storage.getConversationMessages(conversationId);

      // Mark messages as read for the recipient
      await storage.markConversationMessagesAsRead(conversationId, userId);

      // Mark related notifications as read for the current user
      await storage.markNotificationsByReferenceAsRead(userId, conversationId, 'conversation');

      // Get vendor and consumer info
      const consumer = await storage.getUser(conversation.consumerId);
      const consumerName = consumer?.firstName && consumer?.lastName
        ? `${consumer.firstName} ${consumer.lastName}`
        : consumer?.username || 'Unknown Customer';

      // Cancel any pending email notifications since user is viewing the conversation
      await storage.cancelEmailJobsForConversation(conversationId, userId);

      res.json({
        conversation,
        messages,
        vendorName: vendor?.businessName || 'Unknown Business',
        vendorLogoUrl: vendor?.logoUrl || null,
        vendorOwnerId: vendor?.ownerId || null,
        consumerName,
        consumerProfileImageUrl: consumer?.profileImageUrl || null,
        consumerId: conversation.consumerId,
        userRole: isConsumer ? 'consumer' : 'vendor'
      });
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // POST /api/b2c/conversations/:conversationId/messages - Send a message in a conversation
  app.post("/api/b2c/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Get conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user has access and determine role
      const vendor = await storage.getVendor(conversation.vendorId);
      const isConsumer = conversation.consumerId === userId;
      const isVendorOwner = vendor?.ownerId === userId;

      if (!isConsumer && !isVendorOwner) {
        return res.status(403).json({ error: "Access denied to this conversation" });
      }

      // Determine sender role
      const senderRole = isConsumer ? 'consumer' : 'vendor';

      // Create message
      const message = await storage.createConversationMessage({
        conversationId,
        senderId: userId,
        senderRole,
        content: content.trim(),
        isRead: false,
      });

      // Create notification for the recipient
      const recipientId = senderRole === 'consumer' ? vendor?.ownerId : conversation.consumerId;
      if (recipientId) {
        const sender = await storage.getUser(userId);
        const senderName = senderRole === 'consumer' 
          ? (sender?.firstName ? `${sender.firstName}${sender.lastName ? ` ${sender.lastName}` : ''}`.trim() : 'A customer')
          : vendor?.businessName || 'A business';
        
        await storage.createNotification({
          userId: recipientId,
          actorId: userId,
          type: senderRole === 'consumer' ? 'new_message' : 'business_reply',
          title: `${senderName} sent you a message`,
          message: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
          referenceId: conversationId,
          referenceType: 'conversation',
          isRead: false,
        });

        // Schedule email notification if recipient has email notifications enabled
        const recipient = await storage.getUser(recipientId);
        if (recipient?.email && recipient.emailMessageNotifications !== false) {
          await storage.scheduleEmailNotification({
            recipientId,
            recipientEmail: recipient.email,
            jobType: 'new_message',
            referenceId: conversationId,
            actorId: userId,
            subject: `New message from ${senderName} on Rise Local`,
            bodyPreview: content.trim().substring(0, 200),
            status: 'pending',
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes delay
          });
        }
      }

      console.log("[B2C] Message sent:", {
        messageId: message.id,
        conversationId,
        senderRole
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // GET /api/b2c/unread-count - Get unread B2C message count for current user
  app.get("/api/b2c/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const isVendorRole = ['vendor', 'restaurant', 'service_provider'].includes(user.role || '');
      
      if (isVendorRole) {
        const vendor = await storage.getVendorByOwnerId(userId);
        const count = await storage.getUnreadB2CMessageCount(userId, 'vendor', vendor?.id);
        res.json({ count, role: 'vendor' });
      } else {
        const count = await storage.getUnreadB2CMessageCount(userId, 'consumer');
        res.json({ count, role: 'consumer' });
      }
    } catch (error) {
      console.error("Error fetching B2C unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // ============ NOTIFICATIONS ROUTES ============

  // GET /api/notifications - Get all notifications for current user
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // GET /api/notifications/unread-count - Get unread notification count
  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // PATCH /api/notifications/:id/read - Mark a notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // POST /api/notifications/mark-all-read - Mark all notifications as read
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // ============ DEALS ROUTES ============

  // GET /api/deals - List all deals with optional filters
  // Consumer pages see only published deals by default
  // Vendors can pass includeAll=true to see all their deals
  app.get("/api/deals", async (req, res) => {
    try {
      const { category, city, tier, isActive, vendorId, lat, lng, radiusMiles, status, includeAll } = req.query;
      
      console.log("[DEALS API] GET /api/deals called with params:", {
        category, city, tier, isActive, vendorId, lat, lng, radiusMiles, status, includeAll
      });
      
      // If location params are provided, use location-based filtering
      if (lat && lng) {
        const filters = {
          lat: parseFloat(lat as string),
          lng: parseFloat(lng as string),
          radiusMiles: radiusMiles ? parseFloat(radiusMiles as string) : 10,
          category: category as string | undefined,
          city: city as string | undefined,
          tier: tier as string | undefined,
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
          vendorId: vendorId as string | undefined,
          status: status as string | undefined,
          includeAll: includeAll === 'true',
          // Rise Local is a regional SWFL app - include vendors without exact GPS coordinates
          // They appear at the end of results with "SWFL" as location
          includeVendorsWithoutCoordinates: true
        };
        
        console.log("[DEALS API] Using location-based filtering with filters:", filters);
        const deals = await storage.listDealsWithLocation(filters);
        console.log("[DEALS API] Location-based query returned", deals.length, "deals");
        if (deals.length > 0) {
          console.log("[DEALS API] Sample deal statuses:", deals.slice(0, 5).map(d => ({ id: d.id, title: d.title, status: d.status, isActive: d.isActive })));
        }
        res.json(deals);
        return;
      }
      
      // Standard filtering without location
      const filters: any = {};
      
      if (category) filters.category = category as string;
      if (city) filters.city = city as string;
      if (tier) filters.tier = tier as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (vendorId) filters.vendorId = vendorId as string;
      if (status) filters.status = status as string;
      if (includeAll === 'true') filters.includeAll = true;
      
      console.log("[DEALS API] Using standard filtering with filters:", filters);
      const deals = await storage.listDeals(filters);
      console.log("[DEALS API] Standard query returned", deals.length, "deals");
      if (deals.length > 0) {
        console.log("[DEALS API] Sample deal statuses:", deals.slice(0, 5).map(d => ({ id: d.id, title: d.title, status: d.status, isActive: d.isActive })));
      }
      res.json(deals);
    } catch (error) {
      console.error("[DEALS API] Error fetching deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // GET /api/deals/:id - Get single deal by ID with visibility rules
  app.get("/api/deals/:id", async (req, res) => {
    try {
      const dealId = req.params.id;
      console.log("[DEALS] Fetching deal:", dealId);
      
      // Get deal including soft-deleted ones to check status
      const deal = await storage.getDealByIdWithStatus(dealId);
      
      if (!deal) {
        console.log("[DEALS] Deal not found:", dealId);
        return res.status(404).json({ code: "NOT_FOUND", message: "Deal not found" });
      }
      
      // Check if deal was soft deleted
      if (deal.deletedAt) {
        console.log("[DEALS] Deal removed:", dealId);
        return res.status(410).json({ code: "REMOVED", message: "This deal is no longer available" });
      }
      
      // Check if deal is inactive
      if (!deal.isActive) {
        console.log("[DEALS] Deal inactive:", dealId);
        return res.status(410).json({ code: "REMOVED", message: "This deal is no longer active" });
      }
      
      // Check if deal has expired
      const now = new Date();
      if (deal.endsAt && new Date(deal.endsAt) < now) {
        console.log("[DEALS] Deal expired:", dealId);
        return res.status(410).json({ 
          code: "EXPIRED", 
          message: "This deal has expired",
          expiredAt: deal.endsAt
        });
      }
      
      // Check if deal hasn't started yet
      if (deal.startsAt && new Date(deal.startsAt) > now) {
        console.log("[DEALS] Deal not started yet:", dealId);
        return res.status(400).json({ 
          code: "NOT_STARTED", 
          message: "This deal is not available yet",
          startsAt: deal.startsAt
        });
      }
      
      // Note: Pass-locked deals are viewable by everyone, but redemption is gated on the frontend.
      // The deal detail page shows full info but locks the "Redeem" button and hides discount codes for non-members.
      
      // Get vendor information
      const vendor = await storage.getVendor(deal.vendorId);
      
      // Compute additional fields
      const response = {
        ...deal,
        vendor: vendor ? {
          id: vendor.id,
          businessName: vendor.businessName,
          profileImageUrl: vendor.logoUrl,
          city: vendor.city,
          vendorType: vendor.vendorType,
        } : null,
        isExpired: deal.endsAt ? new Date(deal.endsAt) < now : false,
        isLocked: deal.isPassLocked && deal.tier !== 'standard' && deal.tier !== 'free',
        redeemAnytime: !deal.endsAt,
      };
      
      console.log("[DEALS] Deal found:", dealId);
      res.json(response);
    } catch (error) {
      console.error("Error fetching deal:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  // POST /api/deals - Create a new deal (vendor only)
  app.post("/api/deals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify user is a vendor
      const vendor = await storage.getVendorByOwnerId(userId);
      if (!vendor) {
        return res.status(403).json({ error: "Only vendors can create deals" });
      }

      // Convert date strings to Date objects if provided
      const bodyWithDates = {
        ...req.body,
        vendorId: vendor.id, // Always use the authenticated vendor's ID
        startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
        endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
      };

      // Validate request body
      const dealData = insertDealSchema.parse(bodyWithDates);

      const deal = await storage.createDeal(dealData);
      console.log("[DEALS] Deal created:", deal.id, "by vendor:", vendor.id);
      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid deal data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // PUT /api/deals/:id - Update a deal (vendor only, own deals)
  app.put("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.id;

      // Get the deal
      const existingDeal = await storage.getDealById(dealId);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(existingDeal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "You can only update your own deals" });
      }

      // Update the deal (don't allow changing vendorId)
      const { vendorId, ...updateData } = req.body;
      
      // Convert date strings to Date objects if provided
      if (updateData.startsAt) {
        updateData.startsAt = new Date(updateData.startsAt);
      }
      if (updateData.endsAt) {
        updateData.endsAt = new Date(updateData.endsAt);
      }
      
      const updatedDeal = await storage.updateDeal(dealId, updateData);
      
      console.log("[DEALS] Deal updated:", dealId, "by vendor:", vendor.id);
      res.json(updatedDeal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // POST /api/deals/:id/redeem - Simple button-based deal redemption (consumer endpoint)
  app.post("/api/deals/:id/redeem", isAuthenticated, async (req: any, res) => {
    try {
      const dealId = req.params.id;
      const userId = req.user.claims.sub;
      const source = req.body.source || 'web';

      // Get the deal to check pass requirements
      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ success: false, error: "Deal not found" });
      }

      // Check if deal is pass-locked and user has pass
      if (deal.isPassLocked) {
        const user = await storage.getUser(userId);
        if (!user?.isPassMember) {
          return res.status(403).json({ 
            success: false, 
            error: "This deal requires a Rise Local Pass membership" 
          });
        }
      }

      // Perform the redemption
      const result = await storage.redeemDeal(dealId, userId, source);
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }

      // Get vendor info for the response
      const vendor = await storage.getVendor(deal.vendorId);

      console.log("[DEALS] Deal redeemed:", dealId, "user:", userId);
      res.json({
        success: true,
        message: result.message,
        redemption: {
          id: result.redemption?.id,
          dealId: deal.id,
          dealTitle: deal.title,
          vendorName: vendor?.businessName || 'Business',
          redeemedAt: result.redemption?.redeemedAt,
        }
      });
    } catch (error) {
      console.error("Error redeeming deal:", error);
      res.status(500).json({ success: false, error: "Failed to redeem deal" });
    }
  });

  // GET /api/me/redemptions - Get current user's redemption history (button-based)
  app.get("/api/me/redemptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const redemptions = await storage.getConsumerRedemptionHistory(userId, limit);
      
      // Enrich with deal and vendor info
      const enrichedRedemptions = await Promise.all(
        redemptions.map(async (r) => {
          const deal = await storage.getDealById(r.dealId);
          const vendor = await storage.getVendor(r.vendorId);
          return {
            id: r.id,
            dealId: r.dealId,
            dealTitle: deal?.title || 'Unknown Deal',
            dealImage: deal?.imageUrl || deal?.heroImageUrl,
            vendorId: r.vendorId,
            vendorName: vendor?.businessName || 'Business',
            vendorLogo: vendor?.logoUrl,
            redeemedAt: r.redeemedAt,
            status: r.status,
          };
        })
      );
      
      res.json(enrichedRedemptions);
    } catch (error) {
      console.error("Error fetching user redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // GET /api/deals/:id/can-redeem - Check if user can redeem a deal
  app.get("/api/deals/:id/can-redeem", isAuthenticated, async (req: any, res) => {
    try {
      const dealId = req.params.id;
      const userId = req.user.claims.sub;

      const result = await storage.canUserRedeemDeal(userId, dealId);
      
      // Also check pass requirements
      if (result.canRedeem) {
        const deal = await storage.getDealById(dealId);
        if (deal?.isPassLocked) {
          const user = await storage.getUser(userId);
          if (!user?.isPassMember) {
            return res.json({ 
              canRedeem: false, 
              reason: "Requires Rise Local Pass" 
            });
          }
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error checking redemption eligibility:", error);
      res.status(500).json({ canRedeem: false, reason: "Error checking eligibility" });
    }
  });

  // GET /api/business/redemptions - Get business's redemption history
  app.get("/api/business/redemptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

      // Verify user is a vendor
      const vendor = await storage.getVendorByOwnerId(userId);
      if (!vendor) {
        return res.status(403).json({ error: "Only business owners can view redemption history" });
      }

      const redemptions = await storage.getBusinessRedemptionHistory(vendor.id, limit);
      
      // Enrich with deal and customer info
      const enrichedRedemptions = await Promise.all(
        redemptions.map(async (r) => {
          const deal = await storage.getDealById(r.dealId);
          const customer = r.userId ? await storage.getUser(r.userId) : null;
          return {
            id: r.id,
            dealId: r.dealId,
            dealTitle: deal?.title || 'Unknown Deal',
            customerId: r.userId,
            customerName: customer 
              ? (customer.firstName && customer.lastName 
                  ? `${customer.firstName} ${customer.lastName}`.trim() 
                  : customer.username || 'Customer')
              : 'Anonymous',
            customerEmail: customer?.email,
            redeemedAt: r.redeemedAt,
            status: r.status,
            source: r.source,
          };
        })
      );
      
      res.json(enrichedRedemptions);
    } catch (error) {
      console.error("Error fetching business redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // GET /api/vendor/redemptions - Get vendor's redemption history
  app.get("/api/vendor/redemptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Verify user is a vendor
      const vendor = await storage.getVendorByOwnerId(userId);
      if (!vendor) {
        return res.status(403).json({ error: "Only vendors can access this endpoint" });
      }

      const redemptions = await storage.getVendorRedemptions(vendor.id);
      
      // Enrich with deal info
      const enrichedRedemptions = await Promise.all(
        redemptions.map(async (r) => {
          const deal = await storage.getDealById(r.dealId);
          return {
            ...r,
            deal: deal ? { id: deal.id, title: deal.title } : null,
          };
        })
      );

      res.json(enrichedRedemptions);
    } catch (error) {
      console.error("Error fetching vendor redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // GET /api/deals/:id/redemptions - Get redemption history for a deal (vendor only)
  app.get("/api/deals/:id/redemptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.id;

      // Get the deal
      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(deal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "You can only view redemptions for your own deals" });
      }

      const redemptions = await storage.getDealRedemptions(dealId);
      res.json(redemptions);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // ===== VENDOR DEAL MANAGEMENT ENDPOINTS =====

  // GET /api/vendor/deals - List vendor's own deals with optional status filter
  app.get("/api/vendor/deals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const statusFilter = req.query.status as string | undefined;

      // Verify user is a vendor
      const vendor = await storage.getVendorByOwnerId(userId);
      if (!vendor) {
        return res.status(403).json({ error: "Only vendors can access this endpoint" });
      }

      // Get vendor's deals
      const allDeals = await storage.getDealsByVendorId(vendor.id);
      
      // Apply status filter if provided
      let filteredDeals = allDeals;
      if (statusFilter) {
        filteredDeals = allDeals.filter(d => d.status === statusFilter);
      }

      // Add computed fields for each deal
      const now = new Date();
      const dealsWithMeta = filteredDeals.map(deal => ({
        ...deal,
        isExpired: deal.endsAt ? new Date(deal.endsAt) < now : false,
        computedStatus: deal.endsAt && new Date(deal.endsAt) < now ? 'expired' : deal.status,
      }));

      console.log("[VENDOR DEALS] Listed", dealsWithMeta.length, "deals for vendor:", vendor.id);
      res.json(dealsWithMeta);
    } catch (error) {
      console.error("Error fetching vendor deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // GET /api/vendor/deals/:id - Get a single deal for the vendor
  app.get("/api/vendor/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.id;

      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(deal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "You can only view your own deals" });
      }

      const now = new Date();
      res.json({
        ...deal,
        isExpired: deal.endsAt ? new Date(deal.endsAt) < now : false,
        computedStatus: deal.endsAt && new Date(deal.endsAt) < now ? 'expired' : deal.status,
      });
    } catch (error) {
      console.error("Error fetching vendor deal:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  // POST /api/vendor/deals - Create and auto-publish a new deal
  app.post("/api/vendor/deals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Verify user is a vendor
      const vendor = await storage.getVendorByOwnerId(userId);
      if (!vendor) {
        return res.status(403).json({ error: "Only vendors can create deals" });
      }

      // Convert date strings to Date objects if provided
      const bodyWithDates = {
        ...req.body,
        vendorId: vendor.id,
        status: 'published', // Auto-publish on creation - vendors can pause later
        startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
        endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
      };

      // Validate request body
      const dealData = insertDealSchema.parse(bodyWithDates);

      const deal = await storage.createDeal(dealData);
      console.log("[VENDOR DEALS] Deal created:", deal.id, "by vendor:", vendor.id);
      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid deal data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // PATCH /api/vendor/deals/:id - Update a deal
  app.patch("/api/vendor/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.id;

      const existingDeal = await storage.getDealById(dealId);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(existingDeal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "You can only update your own deals" });
      }

      // Don't allow changing vendorId
      const { vendorId, ...updateData } = req.body;
      
      // Convert date strings to Date objects if provided
      if (updateData.startsAt) {
        updateData.startsAt = new Date(updateData.startsAt);
      }
      if (updateData.endsAt) {
        updateData.endsAt = new Date(updateData.endsAt);
      }
      
      const updatedDeal = await storage.updateDeal(dealId, updateData);

      console.log("[VENDOR DEALS] Deal updated:", dealId, "by vendor:", vendor.id);
      res.json(updatedDeal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // POST /api/vendor/deals/:id/publish - Publish a deal
  app.post("/api/vendor/deals/:id/publish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.id;

      console.log("[PUBLISH] Attempting to publish deal:", dealId, "by user:", userId);

      const existingDeal = await storage.getDealById(dealId);
      if (!existingDeal) {
        console.log("[PUBLISH] Deal not found:", dealId);
        return res.status(404).json({ error: "Deal not found" });
      }

      console.log("[PUBLISH] Found deal:", { id: existingDeal.id, title: existingDeal.title, currentStatus: existingDeal.status, vendorId: existingDeal.vendorId });

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(existingDeal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        console.log("[PUBLISH] Authorization failed. Vendor owner:", vendor?.ownerId, "User:", userId);
        return res.status(403).json({ error: "You can only publish your own deals" });
      }

      console.log("[PUBLISH] Authorization passed. Vendor:", vendor.businessName, "(", vendor.id, ")");

      // Check if deal is already expired
      if (existingDeal.endsAt && new Date(existingDeal.endsAt) < new Date()) {
        console.log("[PUBLISH] Deal is expired, cannot publish. endsAt:", existingDeal.endsAt);
        return res.status(400).json({ error: "Cannot publish an expired deal" });
      }

      console.log("[PUBLISH] Updating deal status to published...");
      const updatedDeal = await storage.updateDeal(dealId, {
        status: 'published',
        isActive: true,
      });

      console.log("[PUBLISH] SUCCESS! Deal published:", dealId, "New status:", updatedDeal?.status, "isActive:", updatedDeal?.isActive);
      res.json(updatedDeal);
    } catch (error) {
      console.error("[PUBLISH] Error publishing deal:", error);
      res.status(500).json({ error: "Failed to publish deal" });
    }
  });

  // POST /api/vendor/deals/:id/pause - Pause a deal
  app.post("/api/vendor/deals/:id/pause", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.id;

      const existingDeal = await storage.getDealById(dealId);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(existingDeal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "You can only pause your own deals" });
      }

      const updatedDeal = await storage.updateDeal(dealId, {
        status: 'paused',
        isActive: false,
      });

      console.log("[VENDOR DEALS] Deal paused:", dealId, "by vendor:", vendor.id);
      res.json(updatedDeal);
    } catch (error) {
      console.error("Error pausing deal:", error);
      res.status(500).json({ error: "Failed to pause deal" });
    }
  });

  // DELETE /api/vendor/deals/:id - Soft delete a deal
  app.delete("/api/vendor/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.id;

      const existingDeal = await storage.getDealById(dealId);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(existingDeal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "You can only delete your own deals" });
      }

      // Soft delete
      await storage.updateDeal(dealId, {
        deletedAt: new Date(),
        isActive: false,
      });

      console.log("[VENDOR DEALS] Deal deleted:", dealId, "by vendor:", vendor.id);
      res.json({ success: true, message: "Deal deleted" });
    } catch (error) {
      console.error("Error deleting deal:", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  // POST /api/vendor/deals/:dealId/void/:redemptionId - Void a redemption (for staff mistakes)
  app.post("/api/vendor/deals/:dealId/void/:redemptionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dealId, redemptionId } = req.params;
      const { reason } = req.body;

      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Get the vendor that owns this deal and verify the user is its owner
      const vendor = await storage.getVendor(deal.vendorId);
      if (!vendor || vendor.ownerId !== userId) {
        return res.status(403).json({ error: "You can only void claims for your own deals" });
      }

      // Void the redemption
      const voidedRedemption = await storage.voidRedemption(redemptionId, reason);
      if (!voidedRedemption) {
        return res.status(404).json({ error: "Redemption not found" });
      }

      console.log("[VENDOR DEALS] Redemption voided:", redemptionId, "for deal:", dealId);
      res.json(voidedRedemption);
    } catch (error) {
      console.error("Error voiding redemption:", error);
      res.status(500).json({ error: "Failed to void redemption" });
    }
  });

  // ===== RESERVATION ENDPOINTS =====

  // POST /api/reservations/initiate - Create reservation record and return redirect info
  app.post('/api/reservations/initiate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { restaurantId, partySize, requestedTime, dealRedemptionId, specialRequests } = req.body;
      
      // Validate input
      if (!restaurantId || !partySize || !requestedTime) {
        return res.status(400).json({ error: "Missing required fields: restaurantId, partySize, requestedTime" });
      }
      
      // Get restaurant reservation info
      const restaurantInfo = await storage.getRestaurantReservationInfo(restaurantId);
      if (!restaurantInfo) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      // Create reservation record with INITIATED status
      const reservation = await storage.createReservation({
        userId,
        restaurantId,
        partySize,
        requestedTime: new Date(requestedTime),
        dealRedemptionId: dealRedemptionId || null,
        specialRequests: specialRequests || null,
        status: "INITIATED",
        externalProvider: restaurantInfo.reservationMethod,
      });
      
      // Build redirect info
      let redirectInfo: any = {
        reservationMethod: restaurantInfo.reservationMethod,
        restaurantName: restaurantInfo.restaurantName,
      };
      
      if (restaurantInfo.reservationUrl) {
        redirectInfo.redirectUrl = restaurantInfo.reservationUrl;
        redirectInfo.message = `Please complete your reservation at ${restaurantInfo.restaurantName} using their booking system.`;
      } else if (restaurantInfo.reservationsPhone) {
        redirectInfo.phone = restaurantInfo.reservationsPhone;
        redirectInfo.message = `Please call ${restaurantInfo.restaurantName} at ${restaurantInfo.reservationsPhone} to complete your reservation.`;
      } else {
        redirectInfo.message = `Please contact ${restaurantInfo.restaurantName} directly to complete your reservation.`;
      }
      
      res.json({
        reservationId: reservation.id,
        status: reservation.status,
        ...redirectInfo,
      });
    } catch (error) {
      console.error("Error initiating reservation:", error);
      res.status(500).json({ error: "Failed to initiate reservation" });
    }
  });

  // GET /api/restaurants/:id/reservation-info - Get reservation method and URL for a restaurant
  app.get('/api/restaurants/:id/reservation-info', async (req, res) => {
    try {
      const restaurantId = req.params.id;
      const info = await storage.getRestaurantReservationInfo(restaurantId);
      
      if (!info) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      let response: any = {
        reservationMethod: info.reservationMethod,
        reservationUrl: info.reservationUrl,
        restaurantName: info.restaurantName,
      };
      
      if (info.reservationUrl) {
        response.message = `Make a reservation online at ${info.restaurantName}`;
        response.actionType = "redirect";
      } else if (info.reservationsPhone) {
        response.phone = info.reservationsPhone;
        response.message = `Call ${info.restaurantName} to make a reservation`;
        response.actionType = "phone";
      } else {
        response.message = `Contact ${info.restaurantName} directly for reservations`;
        response.actionType = "none";
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching reservation info:", error);
      res.status(500).json({ error: "Failed to fetch reservation info" });
    }
  });

  // ===== DEAL CLAIM ENDPOINTS (Time-Locked Code System) =====

  // POST /api/deals/:id/claim - Claim a deal and generate time-locked code
  app.post('/api/deals/:id/claim', isAuthenticated, async (req: any, res) => {
    try {
      const dealId = req.params.id;
      const userId = req.user.claims.sub;

      // Check if deal exists
      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Check if deal is published
      if (deal.status !== 'published') {
        return res.status(400).json({ error: "This deal is not available" });
      }

      // Check if deal is active
      if (!deal.isActive) {
        return res.status(400).json({ error: "This deal is no longer active" });
      }

      // Check if deal has started
      if (deal.startsAt && new Date(deal.startsAt) > new Date()) {
        return res.status(400).json({ error: "This deal has not started yet" });
      }

      // Check if deal has expired
      if (deal.endsAt && new Date(deal.endsAt) < new Date()) {
        return res.status(410).json({ error: "This deal has expired" });
      }

      // Check if user already has an active claim for this deal
      const existingRedemption = await storage.getActiveRedemptionForUserDeal(userId, dealId);
      if (existingRedemption) {
        // Return the existing redemption instead of creating a new one
        return res.json({
          redemptionId: existingRedemption.id,
          dealId: existingRedemption.dealId,
          redemptionCode: existingRedemption.redemptionCode,
          status: existingRedemption.status,
          claimedAt: existingRedemption.claimedAt,
          claimExpiresAt: existingRedemption.claimExpiresAt,
          message: "You already have an active claim for this deal",
        });
      }

      // === CLAIM LIMIT ENFORCEMENT ===
      
      // Count verified (redeemed) redemptions for this user+deal
      const redeemedCount = await storage.getUserVerifiedCountForDeal(userId, dealId);
      const maxPerUser = deal.maxRedemptionsPerUser || 1;
      
      if (redeemedCount >= maxPerUser) {
        return res.status(403).json({ 
          error: `You have already redeemed this deal ${maxPerUser} time(s)`,
          limitReached: true
        });
      }

      // Check redemption frequency limit (weekly/monthly/unlimited)
      // Default to unlimited if no frequency is set
      const redemptionFrequency = deal.redemptionFrequency || "unlimited";
      
      if (redemptionFrequency !== "unlimited") {
        const lastRedemption = await storage.getLastVerifiedRedemptionForUserDeal(userId, dealId);
        if (lastRedemption && lastRedemption.verifiedAt) {
          const lastRedemptionDate = new Date(lastRedemption.verifiedAt);
          const now = new Date();
          
          // Calculate rolling window based on frequency
          let cooldownDays = 7; // weekly default
          let frequencyLabel = "week";
          
          if (redemptionFrequency === "monthly") {
            cooldownDays = 30;
            frequencyLabel = "month";
          }
          
          const cooldownEnd = new Date(lastRedemptionDate);
          cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);
          
          if (cooldownEnd > now) {
            const daysRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return res.status(403).json({ 
              error: `You've already redeemed this deal this ${frequencyLabel}. Try again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
              cooldownRemaining: daysRemaining,
              cooldownEndsAt: cooldownEnd.toISOString(),
              frequencyLimit: redemptionFrequency
            });
          }
        }
      }

      // Check global redemption limit
      if (deal.maxRedemptionsTotal && deal.maxRedemptionsTotal > 0) {
        const totalRedeemed = await storage.getTotalVerifiedCountForDeal(dealId);
        
        if (totalRedeemed >= deal.maxRedemptionsTotal) {
          return res.status(403).json({ 
            error: "This deal has reached its maximum number of redemptions",
            soldOut: true
          });
        }
      }

      // Get vendor's user ID for the redemption record
      const vendor = await storage.getVendor(deal.vendorId);
      if (!vendor) {
        return res.status(500).json({ error: "Vendor not found" });
      }

      // Issue the deal code (generates time-locked code)
      const result = await storage.issueDealCode(dealId, vendor.id, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json({
        redemptionId: result.redemption?.id,
        dealId: dealId,
        redemptionCode: result.code,
        status: 'claimed',
        claimedAt: result.redemption?.claimedAt,
        claimExpiresAt: result.expiresAt,
      });
    } catch (error) {
      console.error("Error claiming deal:", error);
      res.status(500).json({ error: "Failed to claim deal" });
    }
  });

  // GET /api/redemptions/my - Get current user's redemptions with deal info
  app.get('/api/redemptions/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const redemptions = await storage.getUserRedemptions(userId);

      // Enrich with deal information
      const enrichedRedemptions = await Promise.all(
        redemptions.map(async (redemption) => {
          const deal = await storage.getDealById(redemption.dealId);
          let vendorName = null;
          if (deal?.vendorId) {
            const vendor = await storage.getVendor(deal.vendorId);
            vendorName = vendor?.businessName || null;
          }
          return {
            ...redemption,
            deal: deal ? {
              id: deal.id,
              title: deal.title,
              description: deal.description,
              tier: deal.tier,
              vendorId: deal.vendorId,
              vendorName,
              endsAt: deal.endsAt,
            } : null,
          };
        })
      );

      res.json(enrichedRedemptions);
    } catch (error) {
      console.error("Error fetching user redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // GET /api/redemptions/:id - Get a specific redemption with deal info
  app.get('/api/redemptions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const redemptionId = req.params.id;
      
      const redemption = await storage.getRedemption(redemptionId);
      if (!redemption) {
        return res.status(404).json({ error: "Redemption not found" });
      }

      // Only the owner or vendor can view this redemption
      if (redemption.userId !== userId && redemption.vendorUserId !== userId) {
        return res.status(403).json({ error: "Not authorized to view this redemption" });
      }

      // Get deal info
      const deal = await storage.getDealById(redemption.dealId);
      let vendorName = null;
      if (deal?.vendorId) {
        const vendor = await storage.getVendor(deal.vendorId);
        vendorName = vendor?.businessName || null;
      }

      // Check if expired
      const isExpired = redemption.claimExpiresAt ? new Date(redemption.claimExpiresAt) < new Date() && redemption.status === 'claimed' : false;

      res.json({
        ...redemption,
        isExpired,
        deal: deal ? {
          id: deal.id,
          title: deal.title,
          description: deal.description,
          finePrint: deal.finePrint,
          tier: deal.tier,
          vendorId: deal.vendorId,
          vendorName,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching redemption:", error);
      res.status(500).json({ error: "Failed to fetch redemption" });
    }
  });

  // ===== PREFERRED PLACEMENTS (ADVERTISING) =====
  
  // GET /api/placements/discover-spotlight - Get the current active spotlight placement
  app.get('/api/placements/discover-spotlight', async (req, res) => {
    try {
      const spotlight = await storage.getActiveDiscoverSpotlight();
      
      if (!spotlight) {
        return res.json(null);
      }

      res.json({
        placementId: spotlight.placement.id,
        vendor: {
          id: spotlight.vendor.id,
          businessName: spotlight.vendor.businessName,
          displayName: spotlight.vendor.displayName,
          tagline: spotlight.vendor.tagline,
          logoUrl: spotlight.vendor.logoUrl,
          bannerUrl: spotlight.vendor.bannerUrl,
          heroImageUrl: spotlight.vendor.heroImageUrl,
          city: spotlight.vendor.city,
          vendorType: spotlight.vendor.vendorType,
        },
        deals: spotlight.deals.map(deal => ({
          id: deal.id,
          title: deal.title,
          description: deal.description,
          dealType: deal.dealType,
          tier: deal.tier,
        })),
      });
    } catch (error) {
      console.error("Error fetching discover spotlight:", error);
      res.status(500).json({ error: "Failed to fetch spotlight" });
    }
  });

  // POST /api/placements/:placementId/impression - Record an impression
  app.post('/api/placements/:placementId/impression', async (req: any, res) => {
    try {
      const placementId = req.params.placementId;
      const userId = req.user?.claims?.sub || null;
      const sessionId = req.body.sessionId || null;

      await storage.recordPlacementImpression(placementId, userId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording impression:", error);
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  // POST /api/placements/:placementId/click - Record a click
  app.post('/api/placements/:placementId/click', async (req: any, res) => {
    try {
      const placementId = req.params.placementId;
      const userId = req.user?.claims?.sub || null;

      await storage.recordPlacementClick(placementId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording click:", error);
      res.status(500).json({ error: "Failed to record click" });
    }
  });

  // POST /api/placements - Create a new placement (admin only)
  app.post('/api/placements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const parsed = insertPreferredPlacementSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const placement = await storage.createPreferredPlacement(parsed.data);

      // If this placement is being activated, pause other active spotlights
      if (parsed.data.status === "active" && parsed.data.placement === "discover_spotlight") {
        await storage.pauseOtherSpotlights(placement.id);
      }

      res.json(placement);
    } catch (error) {
      console.error("Error creating placement:", error);
      res.status(500).json({ error: "Failed to create placement" });
    }
  });

  // PATCH /api/placements/:id/status - Update placement status (admin only)
  app.patch('/api/placements/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { status } = req.body;
      if (!["active", "scheduled", "expired", "paused"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      await storage.updatePlacementStatus(req.params.id, status);

      // If activating, pause other active spotlights
      if (status === "active") {
        await storage.pauseOtherSpotlights(req.params.id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating placement status:", error);
      res.status(500).json({ error: "Failed to update placement status" });
    }
  });

  // ===== FAVORITES =====
  
  // GET /api/favorites/ids - Get just the deal IDs user has favorited (for fast checking on list pages)
  app.get('/api/favorites/ids', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      const ids = favorites.map(f => f.dealId);
      res.json(ids);
    } catch (error) {
      console.error("Error fetching favorite ids:", error);
      res.status(500).json({ error: "Failed to fetch favorite ids" });
    }
  });
  
  // GET /api/favorites - Get user's favorite deals
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteDeals = await storage.getUserFavoriteDeals(userId);
      
      // Enrich with vendor info
      const enrichedDeals = await Promise.all(
        favoriteDeals.map(async (deal) => {
          const vendor = await storage.getVendor(deal.vendorId);
          return {
            ...deal,
            vendorName: vendor?.businessName || vendor?.displayName || null,
            vendorLogoUrl: vendor?.logoUrl || null,
          };
        })
      );
      
      res.json(enrichedDeals);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  // GET /api/favorites/:dealId - Check if deal is favorited
  app.get('/api/favorites/:dealId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.dealId;
      
      const isFavorite = await storage.isFavorite(userId, dealId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ error: "Failed to check favorite status" });
    }
  });

  // POST /api/favorites/:dealId - Add deal to favorites
  app.post('/api/favorites/:dealId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.dealId;
      
      // Verify deal exists
      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      
      const favorite = await storage.addFavorite(userId, dealId);
      res.json({ success: true, favorite });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  // DELETE /api/favorites/:dealId - Remove deal from favorites
  app.delete('/api/favorites/:dealId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dealId = req.params.dealId;
      
      await storage.removeFavorite(userId, dealId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
