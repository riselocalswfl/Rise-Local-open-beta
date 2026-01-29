import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./replitAuth";
import { setupCustomAuth } from "./customAuth";
import { setupAnalyticsRoutes } from "./analyticsRoutes";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import Stripe from "stripe";
import appleSignin from "apple-signin-auth";
import { generateToken } from "./jwtAuth";
import { geocodeAddress, buildFullAddress } from "./geocoding";
import {
  insertUserSchema,
  insertVendorSchema,
  insertRestaurantSchema,
  insertServiceProviderSchema,
  insertServiceSchema,
  insertMessageSchema,
  insertDealSchema,
  insertPreferredPlacementSchema,
  insertPlacementImpressionSchema,
  insertPlacementClickSchema,
  fulfillmentOptionsSchema,
  type FulfillmentOptions,
} from "@shared/schema";
import { z } from "zod";

// Vendor profile update schema (validation for PATCH /api/vendors/me)
const updateVendorProfileSchema = insertVendorSchema.partial().omit({
  ownerId: true,
  isFoundingMember: true,
  isVerified: true,
  termsAccepted: true,
  privacyAccepted: true,
});

// VendorDeal type for vendor dashboard
type VendorDeal = {
  id: string;
  title: string;
  description: string;
  dealType: string;
  tier: string;
  category: string | null;
  isActive: boolean;
  discountType: string | null;
  discountValue: number | null;
  isPassLocked: boolean;
  finePrint: string | null;
  imageUrl: string | null;
};

// Initialize Stripe (lazy - only throws when actually used if missing)
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

/**
 * Safely converts a Stripe Unix timestamp (seconds) to a JS Date.
 * Returns null if the input is missing, not a valid number, or produces an invalid date.
 * NEVER throws - safe to use without try/catch.
 */
function stripeUnixToDateOrNull(
  unixSeconds: number | null | undefined,
): Date | null {
  if (unixSeconds === null || unixSeconds === undefined) {
    return null;
  }
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds)) {
    console.warn(
      "[Stripe Date] Invalid unix timestamp (not a finite number):",
      unixSeconds,
    );
    return null;
  }
  // Stripe timestamps are in seconds, JS Date expects milliseconds
  const date = new Date(unixSeconds * 1000);
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn(
      "[Stripe Date] Created invalid date from unix timestamp:",
      unixSeconds,
    );
    return null;
  }
  return date;
}

/**
 * Safely converts a Date to ISO string, returning null if invalid.
 */
function safeToISOString(date: Date | null | undefined): string | null {
  if (!date) return null;
  try {
    return date.toISOString();
  } catch {
    console.warn("[Stripe Date] Failed to convert date to ISO string:", date);
    return null;
  }
}

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
  
  // Setup Custom Email/Password Auth (new streamlined auth system)
  await setupCustomAuth(app);
  
  // Setup Analytics Routes for Admin Dashboard
  setupAnalyticsRoutes(app);

  // Health check endpoint for monitoring and deployment
  app.get("/api/health", async (_req, res) => {
    try {
      const healthData = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      };
      res.json(healthData);
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      });
    }
  });

  // GDPR Data Export - allows users to download all their data
  app.get("/api/user/data-export", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const vendor = await storage.getVendorByOwnerId(userId);
      const favorites = await storage.getUserFavorites(userId);
      const deals = vendor ? await storage.getDealsByVendorId(vendor.id) : [];
      const notifications = await storage.getNotifications(userId);

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isVendor: user.isVendor,
          isPassMember: user.isPassMember,
          createdAt: user.createdAt,
        },
        vendor: vendor ? {
          id: vendor.id,
          businessName: vendor.businessName,
          vendorType: vendor.vendorType,
          bio: vendor.bio,
          city: vendor.city,
          createdAt: vendor.createdAt,
        } : null,
        favorites: favorites.map((f: { dealId: string; createdAt: Date | null }) => ({ 
          dealId: f.dealId, 
          createdAt: f.createdAt 
        })),
        deals: deals.map((d: { id: string; title: string; description: string | null; status: string | null; createdAt: Date | null }) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          status: d.status,
          createdAt: d.createdAt,
        })),
        notifications: notifications.map((n: { id: string; type: string; message: string; createdAt: Date | null }) => ({
          id: n.id,
          type: n.type,
          message: n.message,
          createdAt: n.createdAt,
        })),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="riselocal-data-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("[Data Export] Error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // GDPR Account Deletion - allows users to delete their account
  app.delete("/api/user/account", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);

      res.json({ 
        message: "Account deleted successfully",
        deletedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Account Deletion] Error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
  
  // Apple Sign In endpoint for iOS app
  app.post("/api/auth/apple", async (req, res) => {
    try {
      const { identityToken, userEmail, firstName, lastName } = req.body;

      if (!identityToken) {
        return res.status(400).json({ message: "Identity token is required" });
      }

      let appleUser;
      try {
        appleUser = await appleSignin.verifyIdToken(identityToken, {
          audience: "com.riselocal.Rise-Local",
          ignoreExpiration: false,
        });
      } catch (verifyError: any) {
        console.error(
          "[Apple Sign In] Token verification failed:",
          verifyError,
        );
        return res.status(401).json({
          message: "Invalid Apple ID token",
          error: verifyError.message,
        });
      }

      const appleUserId = appleUser.sub;
      if (!appleUserId) {
        return res.status(400).json({ message: "Invalid Apple user data" });
      }

      const username = `apple_${appleUserId}`;
      let user = await storage.getUserByUsername(username);

      if (!user) {
        const email =
          userEmail || appleUser.email || `${username}@appleid.privaterelay`;
        user = await storage.upsertUser({
          id: crypto.randomUUID(),
          email,
          firstName: firstName || "User",
          lastName: lastName || "",
        });
        // Set additional user properties after creation
        await storage.updateUser(user.id, {
          username,
          role: "buyer",
          isVendor: false,
          isAdmin: false,
          isPassMember: false,
          onboardingComplete: true,
          welcomeCompleted: true,
        });
        console.log("[Apple Sign In] Created new user:", user.id);
      } else {
        console.log("[Apple Sign In] Existing user logged in:", user.id);
      }

      const token = generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVendor: user.isVendor,
          isAdmin: user.isAdmin,
          profileImageUrl: user.profileImageUrl,
          welcomeCompleted: user.welcomeCompleted,
          onboardingComplete: user.onboardingComplete,
          isPassMember: user.isPassMember,
        },
      });
    } catch (error: any) {
      console.error("[Apple Sign In] Error:", error);
      res.status(500).json({
        message: "Apple Sign In failed",
        error: error.message,
      });
    }
  });

  // Auth routes
  app.get("/api/auth/user", requireAuth, async (req: any, res) => {
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
  app.get("/api/auth/vendor-type", requireAuth, async (req: any, res) => {
    try {
      const vendorType = (req.session as any).vendorType;
      res.json({ vendorType: vendorType || null });
    } catch (error) {
      console.error("Error fetching vendor type:", error);
      res.status(500).json({ message: "Failed to fetch vendor type" });
    }
  });

  // Complete onboarding - mark user as having completed the welcome flow
  app.post(
    "/api/auth/complete-onboarding",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.updateUser(userId, { onboardingComplete: true });
        res.json({ success: true });
      } catch (error) {
        console.error("Error completing onboarding:", error);
        res.status(500).json({ message: "Failed to complete onboarding" });
      }
    },
  );

  // Complete welcome carousel - mark user as having seen the intro slides
  app.post("/api/welcome/complete", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;

      // Validate role if provided
      const validRoles = ["buyer", "vendor"];
      if (role && !validRoles.includes(role)) {
        return res
          .status(400)
          .json({ message: "Invalid role. Must be 'buyer' or 'vendor'" });
      }

      // Update welcomeCompleted and optionally role
      const updateData: any = { welcomeCompleted: true };
      if (role && validRoles.includes(role)) {
        updateData.role = role;
        // If consumer (buyer), also mark onboarding as complete
        if (role === "buyer") {
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
  app.get("/api/users/:id", async (req, res) => {
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
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
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
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
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
  app.put("/api/images", requireAuth, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user?.claims?.sub;
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    try {
      const objectStorageService = new ObjectStorageService();

      // Normalize the URL to get the object path
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL,
      );

      // Get the file to validate it before making it public
      const file =
        await objectStorageService.getObjectEntityFile(normalizedPath);
      const [metadata] = await file.getMetadata();

      // Validate content type
      if (
        !metadata.contentType ||
        !ALLOWED_IMAGE_TYPES.includes(metadata.contentType.toLowerCase())
      ) {
        return res.status(400).json({
          error: `Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP, SVG). Received: ${metadata.contentType}`,
        });
      }

      // Validate file size
      const fileSize =
        typeof metadata.size === "string"
          ? parseInt(metadata.size)
          : metadata.size;
      if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Received: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
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
  app.get("/api/auth/my-vendor", requireAuth, async (req: any, res) => {
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
  app.get("/api/auth/my-restaurant", requireAuth, async (req: any, res) => {
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
      const query = ((req.query.q as string) || "").toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const allVendors = await storage.getAllVendorListings();
      const filtered = allVendors
        .filter(
          (v) =>
            v.businessName?.toLowerCase().includes(query) ||
            v.bio?.toLowerCase().includes(query),
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

  // Admin statistics endpoint - focused on deals, memberships, and business participation
  app.get("/api/admin/stats", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[/api/admin/stats] Request from user: ${userId}`);

      const user = await storage.getUser(userId);
      console.log(
        `[/api/admin/stats] User found:`,
        user
          ? `${user.email} (role: ${user.role}, isAdmin: ${user.isAdmin})`
          : "NOT FOUND",
      );

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        console.log(`[/api/admin/stats] Access DENIED - User is not admin`);
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      console.log(`[/api/admin/stats] Access GRANTED - Fetching statistics`);

      // Fetch all data in parallel
      const [allUsers, allVendors, allDeals, allRedemptions] =
        await Promise.all([
          storage.getUsers(),
          storage.getVendors(),
          storage.getAllDeals(),
          storage.getAllDealRedemptions(),
        ]);

      // ===== MEMBERSHIP METRICS =====
      const now = new Date();
      const passHolders = allUsers.filter(
        (u: any) =>
          u.isPassMember === true &&
          u.passExpiresAt &&
          new Date(u.passExpiresAt) > now,
      );
      const nonPassUsers = allUsers.filter(
        (u: any) =>
          !u.isPassMember ||
          !u.passExpiresAt ||
          new Date(u.passExpiresAt) <= now,
      );
      const totalUsers = allUsers.length;
      const conversionRate =
        totalUsers > 0
          ? ((passHolders.length / totalUsers) * 100).toFixed(1)
          : "0";

      // ===== DEAL METRICS =====
      const activeDeals = allDeals.filter(
        (d: any) => d.status === "published" && d.isActive,
      );
      const premiumDeals = activeDeals.filter(
        (d: any) =>
          d.isPassLocked || d.tier === "premium" || d.tier === "member",
      );
      const freeDeals = activeDeals.filter(
        (d: any) =>
          !d.isPassLocked && d.tier !== "premium" && d.tier !== "member",
      );

      // Redemption stats
      const totalRedemptions = allRedemptions.length;

      // Create a map of deal IDs to their premium status
      const dealPremiumMap = new Map(
        allDeals.map((d: any) => [
          d.id,
          d.isPassLocked || d.tier === "premium" || d.tier === "member",
        ]),
      );

      const premiumRedemptions = allRedemptions.filter(
        (r: any) => dealPremiumMap.get(r.dealId) === true,
      ).length;
      const freeRedemptions = allRedemptions.filter(
        (r: any) => dealPremiumMap.get(r.dealId) !== true,
      ).length;

      // ===== BUSINESS PARTICIPATION =====
      const totalBusinesses = allVendors.length;

      // Create a map of vendor IDs to their deal counts
      const vendorDealCounts = new Map<
        string,
        { total: number; premium: number }
      >();
      allDeals.forEach((d: any) => {
        if (d.status === "published" && d.isActive) {
          const current = vendorDealCounts.get(d.vendorId) || {
            total: 0,
            premium: 0,
          };
          current.total++;
          if (d.isPassLocked || d.tier === "premium" || d.tier === "member") {
            current.premium++;
          }
          vendorDealCounts.set(d.vendorId, current);
        }
      });

      const businessesWithDeals = vendorDealCounts.size;
      const businessesWithPremiumDeals = Array.from(
        vendorDealCounts.values(),
      ).filter((v) => v.premium > 0).length;
      const businessesWithNoDeals = totalBusinesses - businessesWithDeals;

      // Get list of businesses with no deals (for outreach)
      const vendorIdsWithDeals = new Set(vendorDealCounts.keys());
      const businessesNeedingOutreach = allVendors
        .filter((v: any) => !vendorIdsWithDeals.has(v.id) && v.isVerified)
        .slice(0, 10)
        .map((v: any) => ({
          id: v.id,
          businessName: v.businessName,
          contactEmail: v.contactEmail,
          city: v.city,
        }));

      // ===== PENDING VERIFICATIONS (unified - all vendor types now use 'vendor' role) =====
      const pendingVerifications = allVendors.filter((v: any) => !v.isVerified);

      res.json({
        // Deal Metrics (Core KPI)
        deals: {
          total: activeDeals.length,
          premium: premiumDeals.length,
          free: freeDeals.length,
        },
        redemptions: {
          total: totalRedemptions,
          premium: premiumRedemptions,
          free: freeRedemptions,
        },
        // Membership Metrics (High Priority)
        membership: {
          passHolders: passHolders.length,
          nonPassUsers: nonPassUsers.length,
          totalUsers: totalUsers,
          conversionRate: parseFloat(conversionRate),
        },
        // Business Participation Health
        businesses: {
          total: totalBusinesses,
          withDeals: businessesWithDeals,
          withPremiumDeals: businessesWithPremiumDeals,
          withNoDeals: businessesWithNoDeals,
          needingOutreach: businessesNeedingOutreach,
        },
        // Unified pending verifications (all vendor types consolidated)
        vendors: {
          total: allVendors.length,
          verified: allVendors.filter((v: any) => v.isVerified).length,
          unverified: allVendors.filter((v: any) => !v.isVerified).length,
          pendingVerifications: pendingVerifications.map((v: any) => ({
            id: v.id,
            businessName: v.businessName,
            contactEmail: v.contactEmail,
            city: v.city,
            type: "vendor" as const,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin statistics" });
    }
  });

  // Admin maintenance endpoint - manually trigger startup tasks that were deferred
  // This allows running ownership validation and email worker on-demand
  app.post(
    "/api/admin/run-maintenance",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const results: { task: string; status: string; error?: string }[] = [];

        // Run ownership validation (fire-and-forget)
        try {
          const { validateAndFixOwnership } = await import(
            "./validate-ownership"
          );
          // Don't await - let it run in background
          validateAndFixOwnership().catch((err) => {
            console.error("[Maintenance] Ownership validation failed:", err);
          });
          results.push({ task: "ownershipValidation", status: "started" });
        } catch (err: any) {
          results.push({
            task: "ownershipValidation",
            status: "failed",
            error: err.message,
          });
        }

        // Start email worker
        try {
          const { startEmailWorker } = await import("./emailWorker");
          startEmailWorker();
          results.push({ task: "emailWorker", status: "started" });
        } catch (err: any) {
          results.push({
            task: "emailWorker",
            status: "failed",
            error: err.message,
          });
        }

        res.json({
          message: "Maintenance tasks triggered (running in background)",
          results,
        });
      } catch (error) {
        console.error("Error running maintenance:", error);
        res.status(500).json({ error: "Failed to run maintenance tasks" });
      }
    },
  );

  // Admin vendor verification endpoints
  app.patch(
    "/api/admin/vendors/:id/verify",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const { isVerified } = req.body;
        await storage.updateVendorVerification(req.params.id, isVerified);
        res.json({ success: true });
      } catch (error) {
        console.error("Error verifying vendor:", error);
        res.status(500).json({ error: "Failed to verify vendor" });
      }
    },
  );

  app.patch(
    "/api/admin/restaurants/:id/verify",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const { isVerified } = req.body;
        await storage.updateVendorVerification(req.params.id, isVerified);
        res.json({ success: true });
      } catch (error) {
        console.error("Error verifying restaurant:", error);
        res.status(500).json({ error: "Failed to verify restaurant" });
      }
    },
  );

  app.patch(
    "/api/admin/service-providers/:id/verify",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const { isVerified } = req.body;
        await storage.updateVendorVerification(req.params.id, isVerified);
        res.json({ success: true });
      } catch (error) {
        console.error("Error verifying service provider:", error);
        res.status(500).json({ error: "Failed to verify service provider" });
      }
    },
  );

  // Switch vendor type for a user (DEPRECATED - only 'vendor' role is now supported)
  app.post(
    "/api/admin/users/:userId/switch-vendor-type",
    requireAuth,
    async (req: any, res) => {
      try {
        const adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin =
          adminUser?.isAdmin === true || adminUser?.role === "admin";
        if (!adminUser || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const { userId } = req.params;
        const { targetType } = req.body;

        // Only 'vendor' role is now supported - restaurant and service_provider have been consolidated
        if (targetType !== "vendor") {
          return res
            .status(400)
            .json({
              error:
                "Only 'vendor' role is supported. Restaurant and service_provider roles have been consolidated into vendor.",
            });
        }

        const targetUser = await storage.getUser(userId);
        if (!targetUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Get existing vendor profile (unified system)
        const existingVendor = await storage.getVendorByOwnerId(userId);

        // Determine source profile based on user's CURRENT role
        let sourceProfile: any = null;
        let sourceType: string = "";

        if (targetUser.role === "vendor" && existingVendor) {
          sourceProfile = existingVendor;
          sourceType = "vendor";
        } else if (
          targetUser.role === "restaurant" &&
          existingVendor &&
          existingVendor.vendorType === "dine"
        ) {
          sourceProfile = existingVendor;
          sourceType = "restaurant";
        } else if (
          targetUser.role === "service_provider" &&
          existingVendor &&
          existingVendor.vendorType === "service"
        ) {
          sourceProfile = existingVendor;
          sourceType = "service_provider";
        } else if (existingVendor) {
          // Fallback: use existing vendor profile
          sourceProfile = existingVendor;
          sourceType =
            existingVendor.vendorType === "shop"
              ? "vendor"
              : existingVendor.vendorType === "dine"
                ? "restaurant"
                : "service_provider";
        }

        if (!sourceProfile) {
          return res
            .status(400)
            .json({
              error: "User has no existing vendor profile to switch from",
            });
        }

        // Create new profile based on target type
        try {
          if (targetType === "vendor") {
            // If vendor profile already exists with shop type, just update the user role
            if (existingVendor && existingVendor.vendorType === "shop") {
              await storage.updateUser(userId, { role: "vendor" });
              return res.json({
                success: true,
                newProfile: existingVendor,
                message: "User switched to shop vendor (existing profile)",
              });
            }

            // If vendor exists but different type, update to shop type
            if (existingVendor) {
              const updatedVendor = await storage.updateVendor(
                existingVendor.id,
                {
                  vendorType: "shop",
                  capabilities: {
                    products: true,
                    services: false,
                    menu: false,
                  },
                },
              );
              await storage.updateUser(userId, { role: "vendor" });
              return res.json({
                success: true,
                newProfile: updatedVendor,
                message: "User switched to shop vendor",
              });
            }

            // Create new shop vendor profile
            const newVendor = await storage.createVendor({
              ownerId: userId,
              vendorType: "shop",
              businessName: sourceProfile.businessName,
              contactName: sourceProfile.contactName,
              bio: sourceProfile.bio || "",
              tagline: sourceProfile.tagline || "",
              displayName: sourceProfile.displayName || null,
              logoUrl: sourceProfile.logoUrl || null,
              bannerUrl: sourceProfile.bannerUrl || null,
              heroImageUrl: sourceProfile.heroImageUrl || null,
              gallery: sourceProfile.gallery || [],
              website: sourceProfile.website || null,
              instagram: sourceProfile.instagram || null,
              tiktok: sourceProfile.tiktok || null,
              facebook: sourceProfile.facebook || null,
              locationType: sourceProfile.locationType || "Physical storefront",
              address: sourceProfile.address || null,
              city: sourceProfile.city,
              state: sourceProfile.state,
              zipCode: sourceProfile.zipCode,
              serviceOptions: sourceProfile.serviceOptions || [],
              paymentMethod: sourceProfile.paymentMethod || "Through Platform",
              capabilities: { products: true, services: false, menu: false },
              serviceRadius: sourceProfile.serviceRadius || null,
              hours: sourceProfile.hours || null,
              values: sourceProfile.values || sourceProfile.badges || [],
              badges: sourceProfile.badges || [],
              contactEmail: sourceProfile.contactEmail || null,
              phone: sourceProfile.phone || null,
              fulfillmentOptions: sourceProfile.fulfillmentOptions || null,
              isVerified: sourceProfile.isVerified || false,
              profileStatus: sourceProfile.profileStatus || "complete",
            });

            await storage.updateUser(userId, { role: "vendor" });
            return res.json({
              success: true,
              newProfile: newVendor,
              message: "User switched to shop vendor",
            });
          } else if (targetType === "restaurant") {
            // If vendor profile already exists with dine type, just update the user role
            if (existingVendor && existingVendor.vendorType === "dine") {
              await storage.updateUser(userId, { role: "restaurant" });
              return res.json({
                success: true,
                newProfile: existingVendor,
                message: "User switched to restaurant (existing profile)",
              });
            }

            // If vendor exists but different type, update to dine type
            if (existingVendor) {
              const updatedVendor = await storage.updateVendor(
                existingVendor.id,
                {
                  vendorType: "dine",
                  capabilities: {
                    products: false,
                    services: false,
                    menu: true,
                  },
                },
              );
              await storage.updateUser(userId, { role: "restaurant" });
              return res.json({
                success: true,
                newProfile: updatedVendor,
                message: "User switched to restaurant",
              });
            }

            // Create new dine vendor profile
            const newVendor = await storage.createVendor({
              ownerId: userId,
              vendorType: "dine",
              businessName: sourceProfile.businessName,
              contactName: sourceProfile.contactName,
              bio: sourceProfile.bio || "",
              tagline: sourceProfile.tagline || "",
              displayName: sourceProfile.displayName || null,
              logoUrl: sourceProfile.logoUrl || null,
              heroImageUrl: sourceProfile.heroImageUrl || null,
              gallery: sourceProfile.gallery || [],
              website: sourceProfile.website || null,
              instagram: sourceProfile.instagram || null,
              facebook: sourceProfile.facebook || null,
              locationType: sourceProfile.locationType || "Physical storefront",
              address: sourceProfile.address || null,
              city: sourceProfile.city,
              state: sourceProfile.state,
              zipCode: sourceProfile.zipCode,
              serviceOptions: sourceProfile.serviceOptions || [
                "On-site dining",
              ],
              paymentMethod: sourceProfile.paymentMethod || "Through Platform",
              capabilities: { products: false, services: false, menu: true },
              hours: sourceProfile.hours || null,
              badges: sourceProfile.badges || sourceProfile.values || [],
              contactEmail: sourceProfile.contactEmail || null,
              phone: sourceProfile.phone || null,
              isVerified: sourceProfile.isVerified || false,
              profileStatus: sourceProfile.profileStatus || "complete",
            });

            await storage.updateUser(userId, { role: "restaurant" });
            return res.json({
              success: true,
              newProfile: newVendor,
              message: "User switched to restaurant",
            });
          } else if (targetType === "service_provider") {
            // If vendor profile already exists with service type, just update the user role
            if (existingVendor && existingVendor.vendorType === "service") {
              await storage.updateUser(userId, { role: "service_provider" });
              return res.json({
                success: true,
                newProfile: existingVendor,
                message: "User switched to service provider (existing profile)",
              });
            }

            // If vendor exists but different type, update to service type
            if (existingVendor) {
              const updatedVendor = await storage.updateVendor(
                existingVendor.id,
                {
                  vendorType: "service",
                  capabilities: {
                    products: false,
                    services: true,
                    menu: false,
                  },
                },
              );
              await storage.updateUser(userId, { role: "service_provider" });
              return res.json({
                success: true,
                newProfile: updatedVendor,
                message: "User switched to service provider",
              });
            }

            // Create new service vendor profile
            const newVendor = await storage.createVendor({
              ownerId: userId,
              vendorType: "service",
              businessName: sourceProfile.businessName,
              contactName: sourceProfile.contactName,
              bio: sourceProfile.bio || "",
              tagline: sourceProfile.tagline || "",
              displayName: sourceProfile.displayName || null,
              logoUrl: sourceProfile.logoUrl || null,
              heroImageUrl: sourceProfile.heroImageUrl || null,
              gallery: sourceProfile.gallery || [],
              website: sourceProfile.website || null,
              instagram: sourceProfile.instagram || null,
              facebook: sourceProfile.facebook || null,
              locationType: sourceProfile.locationType || "Home-based",
              address: sourceProfile.address || null,
              city: sourceProfile.city,
              state: sourceProfile.state,
              zipCode: sourceProfile.zipCode,
              serviceOptions: sourceProfile.serviceOptions || [
                "On-site",
                "Pickup",
              ],
              paymentMethod: sourceProfile.paymentMethod || "Through Platform",
              capabilities: { products: false, services: true, menu: false },
              serviceRadius: sourceProfile.serviceRadius || null,
              hours: sourceProfile.hours || null,
              badges: sourceProfile.badges || sourceProfile.values || [],
              contactEmail: sourceProfile.contactEmail || null,
              phone: sourceProfile.phone || null,
              isVerified: sourceProfile.isVerified || false,
              profileStatus: sourceProfile.profileStatus || "complete",
            });

            await storage.updateUser(userId, { role: "service_provider" });
            return res.json({
              success: true,
              newProfile: newVendor,
              message: "User switched to service provider",
            });
          }
        } catch (error) {
          console.error("Error creating new profile:", error);
          return res
            .status(500)
            .json({ error: "Failed to create new vendor profile" });
        }
      } catch (error) {
        console.error("Error switching vendor type:", error);
        res.status(500).json({ error: "Failed to switch vendor type" });
      }
    },
  );

  // ============================================================================
  // Subscription Reconciliation Admin Routes
  // ============================================================================

  // Get orphaned Stripe subscriptions (active subscriptions not linked to app users)
  app.get(
    "/api/admin/orphaned-subscriptions",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        // Get all active subscriptions from Stripe
        const stripeSubscriptions = await getStripe().subscriptions.list({
          status: "active",
          limit: 100,
        });

        // Get all users with stripeSubscriptionId
        const allUsers = await storage.getUsers();
        const linkedSubscriptionIds = new Set(
          allUsers
            .filter((u: any) => u.stripeSubscriptionId)
            .map((u: any) => u.stripeSubscriptionId),
        );

        // Find orphaned subscriptions (not linked to any app user)
        const orphanedSubscriptions = [];
        for (const sub of stripeSubscriptions.data) {
          if (!linkedSubscriptionIds.has(sub.id)) {
            // Get customer details
            let customerEmail = "";
            let customerName = "";
            if (sub.customer && typeof sub.customer === "string") {
              try {
                const customer = await getStripe().customers.retrieve(sub.customer);
                if (customer && !customer.deleted) {
                  customerEmail = (customer as any).email || "";
                  customerName = (customer as any).name || "";
                }
              } catch (e) {
                console.error("Failed to fetch customer:", e);
              }
            }

            const subData = sub as any;
            orphanedSubscriptions.push({
              subscriptionId: sub.id,
              customerId: sub.customer as string,
              customerEmail,
              customerName,
              status: sub.status,
              currentPeriodEnd: new Date(
                subData.current_period_end * 1000,
              ).toISOString(),
              created: new Date(sub.created * 1000).toISOString(),
            });
          }
        }

        console.log(
          `[Admin] Found ${orphanedSubscriptions.length} orphaned subscriptions`,
        );
        res.json(orphanedSubscriptions);
      } catch (error) {
        console.error("Error fetching orphaned subscriptions:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch orphaned subscriptions" });
      }
    },
  );

  // Search users for linking (admin only)
  app.get("/api/admin/users/search", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      const query = ((req.query.q as string) || "").toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const allUsers = await storage.getUsers();
      const matchingUsers = allUsers
        .filter((u: any) => {
          const email = (u.email || "").toLowerCase();
          const firstName = (u.firstName || "").toLowerCase();
          const lastName = (u.lastName || "").toLowerCase();
          const username = (u.username || "").toLowerCase();
          return (
            email.includes(query) ||
            firstName.includes(query) ||
            lastName.includes(query) ||
            username.includes(query)
          );
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

  // ============================================================================
  // Admin Deal Management Routes
  // ============================================================================

  // GET /api/admin/vendors - Get all vendors for deal creation (admin only)
  app.get("/api/admin/vendors", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      const vendors = await storage.getVendors();
      // Return minimal vendor info for dropdown selection
      const vendorList = vendors.map((v: any) => ({
        id: v.id,
        businessName: v.businessName,
        city: v.city,
        vendorType: v.vendorType,
        isVerified: v.isVerified,
      }));

      res.json(vendorList);
    } catch (error) {
      console.error("Error fetching vendors for admin:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  // POST /api/admin/deals - Create a deal for any vendor (admin only)
  app.post("/api/admin/deals", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      const { vendorId, ...dealData } = req.body;

      if (!vendorId) {
        return res.status(400).json({ error: "vendorId is required" });
      }

      // Verify vendor exists
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      // Convert date strings to Date objects if provided
      const bodyWithDates = {
        ...dealData,
        vendorId,
        startsAt: dealData.startsAt ? new Date(dealData.startsAt) : undefined,
        endsAt: dealData.endsAt ? new Date(dealData.endsAt) : undefined,
      };

      // Validate and create the deal
      const validatedData = insertDealSchema.parse(bodyWithDates);
      const deal = await storage.createDeal(validatedData);

      console.log(
        "[ADMIN] Deal created:",
        deal.id,
        "for vendor:",
        vendor.businessName,
        "by admin:",
        user.email,
      );

      // Create audit log entry
      await storage.createAdminAuditLog({
        adminUserId: userId,
        adminEmail: user.email,
        actionType: "deal_create",
        entityType: "deal",
        entityId: deal.id,
        entityName: deal.title,
        newValue: { deal },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating deal (admin):", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid deal data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // GET /api/admin/deals - Get all deals across all vendors (admin only)
  app.get("/api/admin/deals", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      // Get all deals with vendor info
      const deals = await storage.listDeals({ includeAll: true });

      // Enhance with vendor names
      const enhancedDeals = await Promise.all(
        deals.map(async (deal: any) => {
          const vendor = await storage.getVendor(deal.vendorId);
          return {
            ...deal,
            vendorName: vendor?.businessName || "Unknown",
            vendorCity: vendor?.city || "",
          };
        }),
      );

      res.json(enhancedDeals);
    } catch (error) {
      console.error("Error fetching deals (admin):", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // PATCH /api/admin/deals/:id - Update any deal (admin only)
  app.patch("/api/admin/deals/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      const dealId = req.params.id;
      const existingDeal = await storage.getDealById(dealId);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
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
      console.log("[ADMIN] Deal updated:", dealId, "by admin:", user.email);

      // Create audit log entry
      await storage.createAdminAuditLog({
        adminUserId: userId,
        adminEmail: user.email,
        actionType: "deal_update",
        entityType: "deal",
        entityId: dealId,
        entityName: existingDeal.title,
        previousValue: { deal: existingDeal },
        newValue: { deal: updatedDeal },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json(updatedDeal);
    } catch (error) {
      console.error("Error updating deal (admin):", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // DELETE /api/admin/deals/:id - Delete any deal (admin only)
  app.delete("/api/admin/deals/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      const dealId = req.params.id;
      const existingDeal = await storage.getDealById(dealId);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Soft delete by setting deletedAt
      await storage.updateDeal(dealId, { deletedAt: new Date() });
      console.log("[ADMIN] Deal deleted:", dealId, "by admin:", user.email);

      // Create audit log entry
      await storage.createAdminAuditLog({
        adminUserId: userId,
        adminEmail: user.email,
        actionType: "deal_delete",
        entityType: "deal",
        entityId: dealId,
        entityName: existingDeal.title,
        previousValue: { deal: existingDeal },
        newValue: { deletedAt: new Date().toISOString() },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting deal (admin):", error);
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  // POST /api/admin/deals/:id/duplicate - Duplicate a deal (admin only)
  app.post(
    "/api/admin/deals/:id/duplicate",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const dealId = req.params.id;
        const existingDeal = await storage.getDealById(dealId);
        if (!existingDeal) {
          return res.status(404).json({ error: "Deal not found" });
        }

        // Create a duplicate with modified title
        const { id, createdAt, updatedAt, deletedAt, ...dealData } =
          existingDeal;
        const duplicateDeal = await storage.createDeal({
          ...dealData,
          title: `${existingDeal.title} (Copy)`,
          status: "draft", // Start as draft
        });

        console.log(
          "[ADMIN] Deal duplicated:",
          dealId,
          "-> new ID:",
          duplicateDeal.id,
          "by admin:",
          user.email,
        );

        // Create audit log entry
        await storage.createAdminAuditLog({
          adminUserId: userId,
          adminEmail: user.email,
          actionType: "deal_duplicate",
          entityType: "deal",
          entityId: duplicateDeal.id,
          entityName: duplicateDeal.title,
          previousValue: { sourceDealId: dealId },
          newValue: { deal: duplicateDeal },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });

        res.json(duplicateDeal);
      } catch (error) {
        console.error("Error duplicating deal (admin):", error);
        res.status(500).json({ error: "Failed to duplicate deal" });
      }
    },
  );

  // ===== ADMIN REDEMPTION ENDPOINTS =====

  // GET /api/admin/redemptions - Get all redemptions with filters and pagination (admin only)
  app.get("/api/admin/redemptions", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      // Parse query parameters
      const filters: any = {
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
      };

      if (req.query.vendorId) filters.vendorId = req.query.vendorId;
      if (req.query.dealId) filters.dealId = req.query.dealId;
      if (req.query.userId) filters.userId = req.query.userId;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.startDate)
        filters.startDate = new Date(req.query.startDate);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate);
      if (req.query.isPremium !== undefined)
        filters.isPremium = req.query.isPremium === "true";

      const result = await storage.getAdminRedemptions(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // POST /api/admin/redemptions/:id/void - Void a redemption (admin only)
  app.post(
    "/api/admin/redemptions/:id/void",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 5) {
          return res
            .status(400)
            .json({ error: "A reason is required (minimum 5 characters)" });
        }

        // Get the existing redemption
        const existingRedemption = await storage.getRedemptionById(id);
        if (!existingRedemption) {
          return res.status(404).json({ error: "Redemption not found" });
        }

        if (existingRedemption.status === "voided") {
          return res
            .status(400)
            .json({ error: "Redemption is already voided" });
        }

        // Void the redemption
        const voidedRedemption = await storage.adminVoidRedemption(id, reason);

        console.log(
          "[ADMIN] Redemption voided:",
          id,
          "reason:",
          reason,
          "by admin:",
          user.email,
        );

        // Create audit log entry
        await storage.createAdminAuditLog({
          adminUserId: userId,
          adminEmail: user.email,
          actionType: "redemption_void",
          entityType: "redemption",
          entityId: id,
          previousValue: { redemption: existingRedemption },
          newValue: { redemption: voidedRedemption },
          reason: reason,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });

        res.json({ success: true, redemption: voidedRedemption });
      } catch (error) {
        console.error("Error voiding redemption (admin):", error);
        res.status(500).json({ error: "Failed to void redemption" });
      }
    },
  );

  // GET /api/admin/redemptions/export - Export redemptions as CSV (admin only)
  app.get(
    "/api/admin/redemptions/export",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        // Parse query parameters (no pagination for export)
        const filters: any = { limit: 10000 };
        if (req.query.vendorId) filters.vendorId = req.query.vendorId;
        if (req.query.dealId) filters.dealId = req.query.dealId;
        if (req.query.userId) filters.userId = req.query.userId;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.startDate)
          filters.startDate = new Date(req.query.startDate);
        if (req.query.endDate) filters.endDate = new Date(req.query.endDate);
        if (req.query.isPremium !== undefined)
          filters.isPremium = req.query.isPremium === "true";

        const { redemptions } = await storage.getAdminRedemptions(filters);

        // Build CSV
        const headers = [
          "ID",
          "Deal Title",
          "Vendor",
          "User Name",
          "User Email",
          "Status",
          "Redeemed At",
          "Premium Deal",
        ];
        const csvRows = [headers.join(",")];

        for (const r of redemptions) {
          const row = [
            r.id,
            `"${(r.dealTitle || "").replace(/"/g, '""')}"`,
            `"${(r.vendorName || "").replace(/"/g, '""')}"`,
            `"${(r.userName || "").replace(/"/g, '""')}"`,
            r.userEmail || "",
            r.status,
            r.redeemedAt ? new Date(r.redeemedAt).toISOString() : "",
            r.isPremiumDeal ? "Yes" : "No",
          ];
          csvRows.push(row.join(","));
        }

        const csv = csvRows.join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="redemptions_${new Date().toISOString().split("T")[0]}.csv"`,
        );
        res.send(csv);
      } catch (error) {
        console.error("Error exporting redemptions (admin):", error);
        res.status(500).json({ error: "Failed to export redemptions" });
      }
    },
  );

  // ===== ADMIN AUDIT LOG ENDPOINTS =====

  // GET /api/admin/audit-logs - Get audit logs with filters and pagination (admin only)
  app.get("/api/admin/audit-logs", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      // Parse query parameters
      const filters: any = {
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
      };

      if (req.query.adminUserId) filters.adminUserId = req.query.adminUserId;
      if (req.query.actionType) filters.actionType = req.query.actionType;
      if (req.query.entityType) filters.entityType = req.query.entityType;
      if (req.query.entityId) filters.entityId = req.query.entityId;
      if (req.query.startDate)
        filters.startDate = new Date(req.query.startDate);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate);

      const result = await storage.getAdminAuditLogs(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Link a Stripe subscription to an app user (admin only)
  app.post(
    "/api/admin/link-subscription",
    requireAuth,
    async (req: any, res) => {
      try {
        const adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin =
          adminUser?.isAdmin === true || adminUser?.role === "admin";
        if (!adminUser || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const { subscriptionId, customerId, targetUserId } = req.body;

        if (!subscriptionId || !targetUserId) {
          return res
            .status(400)
            .json({ error: "subscriptionId and targetUserId are required" });
        }

        // Verify subscription exists in Stripe
        const subscription =
          await getStripe().subscriptions.retrieve(subscriptionId);
        if (!subscription || subscription.status !== "active") {
          return res
            .status(400)
            .json({ error: "Invalid or inactive subscription" });
        }

        // Verify target user exists
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser) {
          return res.status(404).json({ error: "Target user not found" });
        }

        // Update user with subscription data
        const subData = subscription as any;
        const periodEnd = new Date(subData.current_period_end * 1000);
        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";

        await storage.updateUser(targetUserId, {
          stripeCustomerId: customerId || (subscription.customer as string),
          stripeSubscriptionId: subscriptionId,
          membershipStatus: subscription.status,
          membershipPlan: "rise_local_monthly",
          membershipCurrentPeriodEnd: periodEnd,
          isPassMember: isActive,
          passExpiresAt: periodEnd,
        });

        // Log membership event for audit
        await storage.logMembershipEvent({
          userId: targetUserId,
          stripeEventId: `admin-link-${Date.now()}`,
          eventType: "admin_link_subscription",
          previousStatus: targetUser.membershipStatus || undefined,
          newStatus: subscription.status,
          previousPlan: targetUser.membershipPlan || undefined,
          newPlan: "rise_local_monthly",
          metadata: JSON.stringify({
            subscriptionId,
            customerId: customerId || subscription.customer,
            linkedBy: adminUserId,
          }),
        });

        console.log(
          `[Admin] Linked subscription ${subscriptionId} to user ${targetUserId} by admin ${adminUserId}`,
        );

        res.json({
          success: true,
          message: `Subscription linked successfully. User now has Rise Local Pass.`,
          user: {
            id: targetUserId,
            email: targetUser.email,
            isPassMember: true,
            passExpiresAt: periodEnd,
          },
        });
      } catch (error) {
        console.error("Error linking subscription:", error);
        res.status(500).json({ error: "Failed to link subscription" });
      }
    },
  );

  // Manual membership toggle (admin only)
  // Allows admin to grant or revoke Pass membership manually
  app.patch(
    "/api/admin/users/:userId/membership",
    requireAuth,
    async (req: any, res) => {
      try {
        const adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin =
          adminUser?.isAdmin === true || adminUser?.role === "admin";
        if (!adminUser || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        const { userId } = req.params;
        const { isPassMember, passExpiresAt } = req.body;

        if (typeof isPassMember !== "boolean") {
          return res
            .status(400)
            .json({ error: "isPassMember (boolean) is required" });
        }

        // Verify target user exists
        const targetUser = await storage.getUser(userId);
        if (!targetUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Calculate expiration date
        let expirationDate: Date | null = null;
        if (isPassMember) {
          if (passExpiresAt) {
            expirationDate = new Date(passExpiresAt);
          } else {
            // Default: End of current month for manual grants
            expirationDate = new Date();
            expirationDate.setMonth(expirationDate.getMonth() + 1, 0); // Day 0 = last day of current month
            expirationDate.setHours(23, 59, 59, 999); // End of day
          }
        }

        // Update user membership status
        await storage.updateUser(userId, {
          isPassMember: isPassMember,
          passExpiresAt: expirationDate,
          membershipStatus: isPassMember ? "active" : "none",
          membershipPlan: isPassMember ? "admin_manual_grant" : null,
          membershipCurrentPeriodEnd: expirationDate,
        });

        // Log membership event for audit
        await storage.logMembershipEvent({
          userId: userId,
          stripeEventId: `admin-manual-${Date.now()}`,
          eventType: isPassMember ? "admin_grant_pass" : "admin_revoke_pass",
          previousStatus: targetUser.membershipStatus || undefined,
          newStatus: isPassMember ? "active" : "none",
          previousPlan: targetUser.membershipPlan || undefined,
          newPlan: isPassMember ? "admin_manual_grant" : undefined,
          metadata: JSON.stringify({
            grantedBy: adminUserId,
            expiresAt: expirationDate?.toISOString(),
            wasStripeManaged: !!targetUser.stripeSubscriptionId,
          }),
        });

        console.log(
          `[Admin] ${isPassMember ? "Granted" : "Revoked"} Pass for user ${userId} by admin ${adminUserId}`,
        );

        // Create audit log entry
        await storage.createAdminAuditLog({
          adminUserId: adminUserId,
          adminEmail: adminUser.email,
          actionType: isPassMember ? "membership_grant" : "membership_revoke",
          entityType: "user",
          entityId: userId,
          entityName: targetUser.email,
          previousValue: {
            isPassMember: targetUser.isPassMember,
            passExpiresAt: targetUser.passExpiresAt,
            membershipPlan: targetUser.membershipPlan,
          },
          newValue: {
            isPassMember: isPassMember,
            passExpiresAt: expirationDate,
            membershipPlan: isPassMember ? "admin_manual_grant" : null,
          },
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });

        res.json({
          success: true,
          message: isPassMember
            ? `Rise Local Pass granted until ${expirationDate?.toLocaleDateString()}`
            : "Rise Local Pass revoked",
          user: {
            id: userId,
            email: targetUser.email,
            isPassMember: isPassMember,
            passExpiresAt: expirationDate,
            membershipStatus: isPassMember ? "active" : "none",
            membershipPlan: isPassMember ? "admin_manual_grant" : null,
          },
        });
      } catch (error) {
        console.error("Error updating membership:", error);
        res.status(500).json({ error: "Failed to update membership" });
      }
    },
  );

  // Admin endpoint to sync membership from Stripe subscription
  // Use this to fix users whose webhook failed
  // Protected by either: 1) ADMIN_API_KEY header, or 2) authenticated admin user
  app.post("/api/admin/sync-membership", async (req: any, res) => {
    try {
      const adminApiKey = process.env.ADMIN_API_KEY;
      const providedApiKey =
        req.headers["x-admin-api-key"] || req.headers["admin-api-key"];

      let adminUserId = "api_key_auth";

      // Check API key authentication first (for external/CLI access)
      if (providedApiKey) {
        if (!adminApiKey) {
          console.error("[Admin Sync] ADMIN_API_KEY env var not configured");
          return res
            .status(500)
            .json({ error: "ADMIN_API_KEY not configured on server" });
        }
        if (providedApiKey !== adminApiKey) {
          console.error("[Admin Sync] Invalid API key provided");
          return res.status(403).json({ error: "Invalid ADMIN_API_KEY" });
        }
        console.log("[Admin Sync] Authenticated via API key");
      } else {
        // Fall back to session-based admin auth
        if (!req.user?.claims?.sub) {
          return res
            .status(401)
            .json({
              error:
                "Authentication required - provide ADMIN_API_KEY header or sign in as admin",
            });
        }

        adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin =
          adminUser?.isAdmin === true || adminUser?.role === "admin";
        if (!adminUser || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }
        console.log("[Admin Sync] Authenticated via admin session", {
          adminUserId,
        });
      }

      const { email, subscriptionId } = req.body;

      if (!email && !subscriptionId) {
        return res
          .status(400)
          .json({ error: "Must provide either email or subscriptionId" });
      }

      console.log("[Admin Sync] Starting membership sync", {
        email,
        subscriptionId,
        adminUserId,
      });

      let user = null;
      let stripeSubscription: any = null;

      // If subscriptionId provided, fetch it first and use it to find user
      if (subscriptionId) {
        try {
          stripeSubscription =
            await getStripe().subscriptions.retrieve(subscriptionId);
          console.log("[Admin Sync] Retrieved subscription from Stripe", {
            subscriptionId,
            status: stripeSubscription.status,
            customer: stripeSubscription.customer,
          });

          // Try to find user by various methods
          const subCustomerId =
            typeof stripeSubscription.customer === "string"
              ? stripeSubscription.customer
              : stripeSubscription.customer?.id;

          // Try by email first if provided
          if (email) {
            user = await storage.getUserByEmail(email);
          }

          // Try by stripeCustomerId
          if (!user && subCustomerId) {
            user = await storage.getUserByStripeCustomerId(subCustomerId);
          }

          // Try by stripeSubscriptionId (exact match in our DB)
          if (!user) {
            const users = await storage.getUsers();
            user =
              users.find(
                (u: any) => u.stripeSubscriptionId === subscriptionId,
              ) || null;
          }

          // Try by customer email from Stripe
          if (!user && stripeSubscription.customer) {
            try {
              const customerData =
                await getStripe().customers.retrieve(subCustomerId);
              if (
                customerData &&
                !customerData.deleted &&
                (customerData as any).email
              ) {
                user = await storage.getUserByEmail(
                  (customerData as any).email,
                );
              }
            } catch (e) {
              console.log(
                "[Admin Sync] Could not retrieve customer from Stripe",
              );
            }
          }
        } catch (stripeError) {
          return res.status(400).json({
            error: "Could not retrieve subscription from Stripe",
            details:
              stripeError instanceof Error
                ? stripeError.message
                : String(stripeError),
          });
        }
      } else if (email) {
        // No subscriptionId - find user by email and then find their subscription
        user = await storage.getUserByEmail(email);

        if (user) {
          // Try to find subscription by customer email in Stripe
          const customers = await getStripe().customers.list({
            email: email,
            limit: 1,
          });
          if (customers.data.length > 0) {
            const customerId = customers.data[0].id;
            const subscriptions = await getStripe().subscriptions.list({
              customer: customerId,
              status: "active",
              limit: 1,
            });
            if (subscriptions.data.length > 0) {
              stripeSubscription = subscriptions.data[0];
            } else {
              // Check for any subscription including past_due, trialing, etc.
              const allSubs = await getStripe().subscriptions.list({
                customer: customerId,
                limit: 1,
              });
              if (allSubs.data.length > 0) {
                stripeSubscription = allSubs.data[0];
              }
            }
          }
        }
      }

      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: `Could not find user${email ? ` with email: ${email}` : " matching the subscription"}`,
        });
      }

      if (!stripeSubscription) {
        return res.status(404).json({
          error: "No Stripe subscription found",
          message:
            "Could not find an active subscription for this user in Stripe",
        });
      }

      // Log raw timestamp for debugging
      console.log("[Admin Sync] Raw subscription timestamps", {
        current_period_end: stripeSubscription.current_period_end,
        status: stripeSubscription.status,
      });

      // Update the user's membership using safe timestamp conversion
      const periodEnd = stripeUnixToDateOrNull(
        stripeSubscription.current_period_end,
      );

      if (!periodEnd) {
        console.error("[Admin Sync] Invalid period_end timestamp", {
          userId: user.id,
          raw_current_period_end: stripeSubscription.current_period_end,
        });
        return res.status(400).json({
          error: "Invalid subscription data",
          message:
            "Could not parse current_period_end from Stripe subscription",
          raw_value: stripeSubscription.current_period_end,
        });
      }

      const isActive =
        stripeSubscription.status === "active" ||
        stripeSubscription.status === "trialing";
      const customerId =
        typeof stripeSubscription.customer === "string"
          ? stripeSubscription.customer
          : stripeSubscription.customer.id;

      await storage.updateUser(user.id, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        membershipStatus: stripeSubscription.status,
        membershipPlan: "rise_local_monthly",
        membershipCurrentPeriodEnd: periodEnd,
        isPassMember: isActive,
        passExpiresAt: periodEnd,
      });

      // Log the sync event
      await storage.logMembershipEvent({
        userId: user.id,
        stripeEventId: `admin-sync-${Date.now()}`,
        eventType: "admin_manual_sync",
        previousStatus: user.membershipStatus || undefined,
        newStatus: stripeSubscription.status,
        previousPlan: user.membershipPlan || undefined,
        newPlan: "rise_local_monthly",
        metadata: JSON.stringify({
          syncedBy: adminUserId,
          subscriptionId: stripeSubscription.id,
          customerId,
          periodEnd: safeToISOString(periodEnd),
        }),
      });

      console.log("[Admin Sync] Membership synced successfully", {
        userId: user.id,
        email: user.email,
        subscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        isPassMember: isActive,
        passExpiresAt: safeToISOString(periodEnd),
      });

      res.json({
        success: true,
        message: `Membership synced successfully for ${user.email}`,
        user: {
          id: user.id,
          email: user.email,
          isPassMember: isActive,
          passExpiresAt: periodEnd,
          membershipStatus: stripeSubscription.status,
          stripeSubscriptionId: stripeSubscription.id,
        },
      });
    } catch (error) {
      console.error("[Admin Sync] Error:", error);
      res.status(500).json({
        error: "Failed to sync membership",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Bulk sync all users who have stripeSubscriptionId but isPassMember=false
  // This fixes accounts where webhook processing failed
  // Admin-only endpoint
  app.post(
    "/api/admin/bulk-sync-memberships",
    requireAuth,
    async (req: any, res) => {
      try {
        const adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin =
          adminUser?.isAdmin === true || adminUser?.role === "admin";
        if (!adminUser || !isAdmin) {
          return res
            .status(403)
            .json({ error: "Unauthorized - Admin access required" });
        }

        console.log("[Bulk Sync] Starting bulk membership sync...");

        // Get all users
        const allUsers = await storage.getUsers();

        // Find users who have a stripeSubscriptionId but isPassMember is false
        const usersToSync = allUsers.filter(
          (u: any) => u.stripeSubscriptionId && !u.isPassMember,
        );

        console.log(
          `[Bulk Sync] Found ${usersToSync.length} users with subscriptions but isPassMember=false`,
        );

        const results = {
          total: usersToSync.length,
          synced: 0,
          skipped: 0,
          errors: 0,
          details: [] as Array<{
            userId: string;
            email: string;
            status: "synced" | "skipped" | "error";
            message: string;
            plan?: string;
          }>,
        };

        // Price IDs for plan derivation
        const monthlyPriceId = process.env.STRIPE_RISELOCAL_MONTHLY_PRICE_ID;
        const annualPriceId = process.env.STRIPE_RISELOCAL_ANNUAL_PRICE_ID;

        for (const user of usersToSync) {
          try {
            // Skip if stripeSubscriptionId is null (shouldn't happen but TypeScript requires check)
            if (!user.stripeSubscriptionId) {
              continue;
            }

            // Retrieve subscription from Stripe
            const subscription = await getStripe().subscriptions.retrieve(
              user.stripeSubscriptionId,
            );
            const subData = subscription as any;

            // Check if subscription is active
            const isActive =
              subData.status === "active" || subData.status === "trialing";

            if (!isActive) {
              results.skipped++;
              results.details.push({
                userId: user.id,
                email: user.email || "unknown",
                status: "skipped",
                message: `Subscription status is ${subData.status}, not active`,
              });
              continue;
            }

            // Derive the correct plan from subscription price
            const subscriptionPriceId = subData.items?.data?.[0]?.price?.id;
            let derivedPlan = "rise_local_monthly";

            if (subscriptionPriceId) {
              if (annualPriceId && subscriptionPriceId === annualPriceId) {
                derivedPlan = "rise_local_annual";
              } else if (
                monthlyPriceId &&
                subscriptionPriceId === monthlyPriceId
              ) {
                derivedPlan = "rise_local_monthly";
              } else {
                // Fallback: detect from subscription interval
                const interval =
                  subData.items?.data?.[0]?.price?.recurring?.interval;
                derivedPlan =
                  interval === "year"
                    ? "rise_local_annual"
                    : "rise_local_monthly";
              }
            }

            // Get period end safely
            const periodEnd = stripeUnixToDateOrNull(
              subData.current_period_end,
            );
            if (!periodEnd) {
              results.errors++;
              results.details.push({
                userId: user.id,
                email: user.email || "unknown",
                status: "error",
                message: "Invalid period_end timestamp in subscription",
              });
              continue;
            }

            const customerId =
              typeof subData.customer === "string"
                ? subData.customer
                : subData.customer.id;

            // Update user record
            await storage.updateUser(user.id, {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subData.id,
              membershipStatus: subData.status,
              membershipPlan: derivedPlan,
              membershipCurrentPeriodEnd: periodEnd,
              isPassMember: true,
              passExpiresAt: periodEnd,
            });

            // Log membership event for audit
            await storage.logMembershipEvent({
              userId: user.id,
              stripeEventId: `bulk-sync-${Date.now()}-${user.id}`,
              eventType: "admin_bulk_sync",
              previousStatus: user.membershipStatus || undefined,
              newStatus: subData.status,
              previousPlan: user.membershipPlan || undefined,
              newPlan: derivedPlan,
              metadata: JSON.stringify({
                syncedBy: adminUserId,
                subscriptionId: subscription.id,
                subscriptionPriceId,
                derivedPlan,
                periodEnd: safeToISOString(periodEnd),
              }),
            });

            results.synced++;
            results.details.push({
              userId: user.id,
              email: user.email || "unknown",
              status: "synced",
              message: `Pass unlocked until ${safeToISOString(periodEnd)}`,
              plan: derivedPlan,
            });

            console.log(
              `[Bulk Sync] Synced user ${user.id} (${user.email}) - ${derivedPlan}`,
            );
          } catch (err) {
            results.errors++;
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            results.details.push({
              userId: user.id,
              email: user.email || "unknown",
              status: "error",
              message: errorMessage,
            });
            console.error(
              `[Bulk Sync] Error syncing user ${user.id}:`,
              errorMessage,
            );
          }
        }

        console.log(
          `[Bulk Sync] Complete: ${results.synced} synced, ${results.skipped} skipped, ${results.errors} errors`,
        );

        res.json({
          success: true,
          message: `Bulk sync complete: ${results.synced} users synced, ${results.skipped} skipped, ${results.errors} errors`,
          results,
        });
      } catch (error) {
        console.error("[Bulk Sync] Error:", error);
        res.status(500).json({
          error: "Failed to run bulk sync",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

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
  app.get("/api/vendors/me", requireAuth, async (req: any, res) => {
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
      const vendorDeals: VendorDeal[] = result.deals.map((deal) => ({
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
  app.patch("/api/vendors/me", requireAuth, async (req: any, res) => {
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
          details: parsed.error.errors,
        });
      }

      const updateData = parsed.data;

      // If address is being updated, geocode it
      if (updateData.address || updateData.city || updateData.zipCode) {
        const fullAddress = buildFullAddress(
          updateData.address || vendor.address || "",
          updateData.city || vendor.city,
          updateData.state || vendor.state,
          updateData.zipCode || vendor.zipCode,
        );

        const coordinates = await geocodeAddress(fullAddress);
        if (coordinates) {
          (updateData as any).latitude = coordinates.latitude;
          (updateData as any).longitude = coordinates.longitude;
        }
      }

      const updatedVendor = await storage.updateVendor(vendor.id, updateData);

      console.log(
        "[PATCH /api/vendors/me] Profile updated for userId:",
        userId,
      );
      res.json({ success: true, vendor: updatedVendor });
    } catch (error) {
      console.error("[PATCH /api/vendors/me] Error:", error);
      res.status(500).json({ error: "Failed to update vendor profile" });
    }
  });

  // NOTE: These MUST be defined BEFORE /api/vendors/:id to avoid route conflicts
  // ============================================================================

  // Get or create draft vendor profile for current user
  app.get("/api/vendors/draft", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[DRAFT-GET] Fetching draft vendor for userId:", userId);

      // Check if vendor already exists for this user
      const existingVendor = await storage.getVendorByOwnerId(userId);
      if (existingVendor) {
        console.log(
          "[DRAFT-GET] Found existing vendor:",
          existingVendor.id,
          "status:",
          existingVendor.profileStatus,
        );
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
  app.post("/api/vendors/draft", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vendorType, ...data } = req.body;

      console.log(
        "[DRAFT-POST] Creating draft vendor for userId:",
        userId,
        "businessName:",
        data.businessName,
      );

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
          products: vendorType === "shop",
          services: vendorType === "service",
          menu: vendorType === "dine",
        },
        profileStatus: "draft",
      };

      const vendor = await storage.createVendor(vendorData);
      console.log(
        "[DRAFT-POST] Created draft vendor:",
        vendor.id,
        "for ownerId:",
        userId,
      );

      res.status(201).json(vendor);
    } catch (error) {
      console.error("[DRAFT-POST ERROR]", error);
      res.status(400).json({
        error: "Failed to create draft vendor",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Mark vendor profile as complete
  app.post(
    "/api/vendors/:id/complete",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendorId = req.params.id;

        console.log(
          "[COMPLETE] Completing vendor profile:",
          vendorId,
          "for userId:",
          userId,
        );

        // Verify vendor belongs to user
        const vendor = await storage.getVendor(vendorId);
        if (!vendor) {
          console.log("[COMPLETE] Vendor not found:", vendorId);
          return res.status(404).json({ 
            error: "Vendor profile not found",
            details: "The vendor profile may have been deleted. Please try creating a new business account."
          });
        }
        
        if (vendor.ownerId !== userId) {
          console.log("[COMPLETE] Owner mismatch - vendor owner:", vendor.ownerId, "user:", userId);
          return res.status(403).json({ 
            error: "Unauthorized",
            details: "This vendor profile belongs to a different user."
          });
        }
        
        console.log("[COMPLETE] Vendor found:", {
          id: vendor.id,
          businessName: vendor.businessName,
          categoryId: vendor.categoryId,
          profileStatus: vendor.profileStatus
        });

        // Update vendor to complete status
        console.log("[COMPLETE] Updating vendor profile status to complete...");
        const previousStatus = vendor.profileStatus;
        const updatedVendor = await storage.updateVendor(vendorId, {
          profileStatus: "complete",
        });
        console.log("[COMPLETE] Vendor updated successfully");

        // Update user role AND set onboardingComplete to true
        // If this fails, roll back the vendor status change
        console.log("[COMPLETE] Updating user role and onboardingComplete...");
        try {
          await storage.updateUser(userId, {
            role: "vendor",
            isVendor: true,
            onboardingComplete: true,
          });
        } catch (userUpdateError) {
          // Roll back vendor status to maintain consistency
          console.error("[COMPLETE] User update failed, rolling back vendor status");
          await storage.updateVendor(vendorId, {
            profileStatus: previousStatus || "draft",
          });
          throw userUpdateError;
        }

        console.log(
          "[COMPLETE] Vendor profile completed successfully, onboardingComplete and isVendor set to true",
        );
        res.json({ success: true, vendor: updatedVendor });
      } catch (error) {
        console.error("[COMPLETE ERROR] Full error:", error);
        console.error("[COMPLETE ERROR] Stack:", error instanceof Error ? error.stack : "no stack");
        res.status(400).json({
          error: "Failed to complete vendor profile",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

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
        const currentUser = currentUserId
          ? await storage.getUser(currentUserId)
          : null;
        const isOwner = currentUserId === result.vendor.ownerId;
        // Check both isAdmin flag and legacy role for backward compatibility
        const isAdmin =
          currentUser?.isAdmin === true || currentUser?.role === "admin";

        if (!isOwner && !isAdmin) {
          // Return a special response for hidden profiles (SEO-safe, no 404)
          return res.status(200).json({
            vendor: null,
            deals: [],
            isHidden: true,
            message: "This business is currently not accepting visitors.",
          });
        }
      }

      // Filter and map deals - only return published and active deals for public profile
      const vendorDeals: VendorDeal[] = result.deals
        .filter((deal) => deal.status === "published" && deal.isActive)
        .map((deal) => ({
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
  app.post("/api/vendors/onboard", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { vendorType, paymentMethods, fulfillmentMethods, ...data } =
        req.body;

      console.log(
        "[ONBOARD] Creating vendor profile for userId:",
        userId,
        "vendorType:",
        vendorType,
      );

      // Get user info
      const user = await storage.getUser(userId);
      const email = user?.email || "";

      // Derive service options from fulfillment methods
      const fulfillment = fulfillmentOptionsSchema.parse(fulfillmentMethods);
      const serviceOptions = deriveServiceOptions(fulfillment);

      // Geocode location based on city/zipCode
      let latitude: string | null = null;
      let longitude: string | null = null;
      const locationString = buildFullAddress(
        data.address || null,
        data.city || "",
        "FL",
        data.zipCode || "",
      );
      if (locationString) {
        const coordinates = await geocodeAddress(locationString);
        if (coordinates) {
          latitude = coordinates.latitude;
          longitude = coordinates.longitude;
          console.log(
            "[ONBOARD] Geocoded location:",
            locationString,
            "->",
            coordinates,
          );
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

      res
        .status(201)
        .json({
          success: true,
          message: "Vendor profile created successfully",
          redirectUrl,
        });
    } catch (error) {
      console.error("[ONBOARD] Error creating vendor profile:", error);
      res.status(400).json({
        message: "Failed to create vendor profile",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ============================================================================
  // Draft Restaurant Profile Routes (LEGACY - redirects to unified vendor system)
  // ============================================================================

  app.get("/api/restaurants/draft", requireAuth, async (req: any, res) => {
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

  app.post("/api/restaurants/draft", requireAuth, async (req: any, res) => {
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
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.patch("/api/restaurants/:id", requireAuth, async (req: any, res) => {
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
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post(
    "/api/restaurants/:id/complete",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendorId = req.params.id;

        const vendor = await storage.getVendor(vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        console.log("[COMPLETE] Marking dine vendor as complete:", vendorId);

        const updatedVendor = await storage.updateVendor(vendorId, {
          profileStatus: "complete",
        });

        await storage.updateUser(userId, { role: "vendor" });

        res.json({ success: true, vendor: updatedVendor });
      } catch (error) {
        console.error("[COMPLETE] Error completing restaurant profile:", error);
        res.status(400).json({
          error: "Failed to complete restaurant profile",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // ============================================================================
  // Draft Service Provider Profile Routes (LEGACY - redirects to unified vendor system)
  // ============================================================================

  app.get(
    "/api/service-providers/draft",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendor = await storage.getVendorByOwnerId(userId);
        if (vendor && vendor.vendorType === "service") {
          return res.json(vendor);
        }
        res.json(null);
      } catch (error) {
        console.error("[DRAFT] Error fetching draft service provider:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch draft service provider" });
      }
    },
  );

  app.post(
    "/api/service-providers/draft",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const data = req.body;

        console.log(
          "[DRAFT] Creating draft service vendor for userId:",
          userId,
        );

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
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.patch(
    "/api/service-providers/:id",
    requireAuth,
    async (req: any, res) => {
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
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.post(
    "/api/service-providers/:id/complete",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendorId = req.params.id;

        const vendor = await storage.getVendor(vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        console.log("[COMPLETE] Marking service vendor as complete:", vendorId);

        const updatedVendor = await storage.updateVendor(vendorId, {
          profileStatus: "complete",
        });

        await storage.updateUser(userId, { role: "vendor" });

        res.json({ success: true, vendor: updatedVendor });
      } catch (error) {
        console.error(
          "[COMPLETE] Error completing service provider profile:",
          error,
        );
        res.status(400).json({
          error: "Failed to complete service provider profile",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // ============================================================================
  // Rise Local Pass Billing Routes (Consumer Subscription)
  // ============================================================================

  // Create Stripe Checkout Session for Rise Local Pass subscription
  app.post(
    "/api/billing/create-checkout-session",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Get plan type from request body (default to monthly)
        const { plan = "monthly" } = req.body;

        // Check for required environment variables based on plan
        const monthlyPriceId = process.env.STRIPE_RISELOCAL_MONTHLY_PRICE_ID;
        const annualPriceId = process.env.STRIPE_RISELOCAL_ANNUAL_PRICE_ID;
        const appBaseUrl =
          process.env.APP_BASE_URL ||
          (process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : "http://localhost:5000");

        // Select price ID based on plan
        let priceId: string | undefined;
        if (plan === "annual") {
          priceId = annualPriceId;
          if (!priceId) {
            console.error(
              "[Billing] Missing STRIPE_RISELOCAL_ANNUAL_PRICE_ID environment variable",
            );
            return res
              .status(500)
              .json({ error: "Annual plan not configured yet" });
          }
        } else {
          priceId = monthlyPriceId;
          if (!priceId) {
            console.error(
              "[Billing] Missing STRIPE_RISELOCAL_MONTHLY_PRICE_ID environment variable",
            );
            return res.status(500).json({ error: "Billing not configured" });
          }
        }

        console.log(
          "[Billing] Creating checkout session for plan:",
          plan,
          "priceId:",
          priceId,
          "appUserId:",
          userId,
        );

        // Create Checkout Session without customer parameter to avoid resource_missing errors
        // Stripe will create/link customer automatically; we use client_reference_id and metadata.appUserId for reliable user lookup
        const session = await getStripe().checkout.sessions.create({
          mode: "subscription",
          customer_email: user.email || undefined, // Let Stripe handle customer creation
          client_reference_id: userId, // Primary user lookup method
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${appBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appBaseUrl}/checkout/cancel`,
          metadata: {
            appUserId: userId, // Primary user lookup method (renamed from userId for clarity)
            plan: plan, // 'monthly' or 'annual'
            priceId: priceId,
          },
        });

        console.log(
          "[Billing] Created checkout session:",
          session.id,
          "appUserId:",
          userId,
          "customer_email:",
          user.email,
        );
        res.json({ url: session.url });
      } catch (error) {
        console.error("[Billing] Error creating checkout session:", error);
        res.status(500).json({
          error: "Failed to create checkout session",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Create Stripe Billing Portal session for managing subscription
  app.post(
    "/api/billing/create-portal-session",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.stripeCustomerId) {
          return res
            .status(400)
            .json({
              error: "No billing account found. Please subscribe first.",
            });
        }

        const appBaseUrl =
          process.env.APP_BASE_URL ||
          (process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : "http://localhost:5000");

        const session = await getStripe().billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${appBaseUrl}/account`,
        });

        console.log("[Billing] Created portal session for user:", userId);
        res.json({ url: session.url });
      } catch (error) {
        console.error("[Billing] Error creating portal session:", error);
        res.status(500).json({
          error: "Failed to create billing portal session",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // ============================================================================
  // Membership Management Routes
  // ============================================================================

  // GET /api/membership - Return current membership details
  app.get("/api/membership", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Base response for non-members
      if (!user.stripeSubscriptionId) {
        return res.json({
          plan: null,
          status: user.membershipStatus || "none",
          isActive: false,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
          passExpiresAt: user.passExpiresAt ? new Date(user.passExpiresAt).toISOString() : null,
          nextBillingDate: null,
        });
      }

      // Fetch subscription details from Stripe for accurate status
      try {
        const subscription = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId);
        
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        const periodEnd = stripeUnixToDateOrNull(subscription.current_period_end);
        
        // Determine plan type from price ID
        const priceId = subscription.items.data[0]?.price?.id;
        const monthlyPriceId = process.env.STRIPE_RISELOCAL_MONTHLY_PRICE_ID;
        const annualPriceId = process.env.STRIPE_RISELOCAL_ANNUAL_PRICE_ID;
        
        let plan: "monthly" | "yearly" | null = null;
        if (priceId === monthlyPriceId) {
          plan = "monthly";
        } else if (priceId === annualPriceId) {
          plan = "yearly";
        } else if (user.membershipPlan === "rise_local_monthly") {
          plan = "monthly";
        } else if (user.membershipPlan === "rise_local_annual") {
          plan = "yearly";
        }

        return res.json({
          plan,
          status: subscription.cancel_at_period_end ? "canceling" : subscription.status,
          isActive,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
          passExpiresAt: user.passExpiresAt ? new Date(user.passExpiresAt).toISOString() : null,
          nextBillingDate: !subscription.cancel_at_period_end && periodEnd ? periodEnd.toISOString() : null,
        });
      } catch (stripeError) {
        console.error("[Membership] Error fetching subscription from Stripe:", stripeError);
        // Fall back to DB data
        return res.json({
          plan: user.membershipPlan === "rise_local_annual" ? "yearly" : (user.membershipPlan === "rise_local_monthly" ? "monthly" : null),
          status: user.membershipStatus || "none",
          isActive: user.isPassMember && user.passExpiresAt && new Date(user.passExpiresAt) > new Date(),
          cancelAtPeriodEnd: false,
          currentPeriodEnd: user.membershipCurrentPeriodEnd ? new Date(user.membershipCurrentPeriodEnd).toISOString() : null,
          passExpiresAt: user.passExpiresAt ? new Date(user.passExpiresAt).toISOString() : null,
          nextBillingDate: null,
        });
      }
    } catch (error) {
      console.error("[Membership] Error getting membership:", error);
      res.status(500).json({ error: "Failed to get membership details" });
    }
  });

  // POST /api/membership/cancel - Cancel subscription at period end
  app.post("/api/membership/cancel", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      console.log("[Membership] Canceling subscription at period end:", {
        userId,
        subscriptionId: user.stripeSubscriptionId,
      });

      // Set subscription to cancel at period end (user keeps access until then)
      const subscription = await getStripe().subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update DB with canceling status
      const periodEnd = stripeUnixToDateOrNull(subscription.current_period_end);
      await storage.updateUser(userId, {
        membershipStatus: "canceling",
        passExpiresAt: periodEnd,
      });

      console.log("[Membership] Subscription set to cancel at period end:", {
        userId,
        subscriptionId: subscription.id,
        cancelAt: periodEnd?.toISOString(),
      });

      res.json({
        success: true,
        message: "Your membership will be canceled at the end of your billing period.",
        accessEndsAt: periodEnd?.toISOString(),
      });
    } catch (error) {
      console.error("[Membership] Error canceling subscription:", error);
      res.status(500).json({ 
        error: "Failed to cancel subscription",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // POST /api/membership/reactivate - Undo cancellation (if still in period)
  app.post("/api/membership/reactivate", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      // Reactivate by removing cancel_at_period_end
      const subscription = await getStripe().subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update DB status back to active
      await storage.updateUser(userId, {
        membershipStatus: subscription.status,
      });

      console.log("[Membership] Subscription reactivated:", {
        userId,
        subscriptionId: subscription.id,
      });

      res.json({
        success: true,
        message: "Your membership has been reactivated!",
      });
    } catch (error) {
      console.error("[Membership] Error reactivating subscription:", error);
      res.status(500).json({ 
        error: "Failed to reactivate subscription",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // POST /api/membership/upgrade-to-yearly - Upgrade from monthly to yearly
  app.post("/api/membership/upgrade-to-yearly", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const yearlyPriceId = process.env.STRIPE_RISELOCAL_ANNUAL_PRICE_ID;
      if (!yearlyPriceId) {
        return res.status(500).json({ error: "Yearly plan not configured" });
      }

      // Idempotency: Check if already on yearly plan
      if (user.membershipPlan === "rise_local_annual") {
        console.log("[Membership] User already on yearly plan:", userId);
        return res.json({
          success: true,
          message: "You're already on the yearly plan!",
          alreadyYearly: true,
        });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription to upgrade" });
      }

      console.log("[Membership] Upgrading to yearly:", {
        userId,
        currentSubscription: user.stripeSubscriptionId,
      });

      // Fetch current subscription to get the item ID
      const currentSubscription = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Verify subscription is active
      if (currentSubscription.status !== "active" && currentSubscription.status !== "trialing") {
        return res.status(400).json({ error: "Current subscription is not active" });
      }

      // Upgrade approach: Update the subscription item to the yearly price
      // This handles proration automatically and keeps one subscription
      const subscriptionItemId = currentSubscription.items.data[0]?.id;
      if (!subscriptionItemId) {
        return res.status(400).json({ error: "Invalid subscription structure" });
      }

      // Update subscription to yearly price, prorating charges
      const updatedSubscription = await getStripe().subscriptions.update(user.stripeSubscriptionId, {
        items: [{
          id: subscriptionItemId,
          price: yearlyPriceId,
        }],
        proration_behavior: "create_prorations", // User pays the difference
        cancel_at_period_end: false, // Ensure not set to cancel
      });

      // Update DB with new plan
      const periodEnd = stripeUnixToDateOrNull(updatedSubscription.current_period_end);
      await storage.updateUser(userId, {
        membershipPlan: "rise_local_annual",
        membershipStatus: updatedSubscription.status,
        membershipCurrentPeriodEnd: periodEnd,
        passExpiresAt: periodEnd,
      });

      console.log("[Membership] Upgraded to yearly:", {
        userId,
        subscriptionId: updatedSubscription.id,
        newPeriodEnd: periodEnd?.toISOString(),
      });

      res.json({
        success: true,
        message: "Congratulations! You've upgraded to the yearly plan and saved!",
        plan: "yearly",
        nextBillingDate: periodEnd?.toISOString(),
      });
    } catch (error) {
      console.error("[Membership] Error upgrading to yearly:", error);
      res.status(500).json({ 
        error: "Failed to upgrade subscription",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ============================================================================
  // Stripe Connect Routes (Vendor Payment Setup)
  // ============================================================================

  // Create Stripe Connect Express account for vendor
  app.post(
    "/api/stripe/create-connect-account",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Get vendor profile (unified system)
        const vendorProfile = await storage.getVendorByOwnerId(userId);

        if (!vendorProfile) {
          return res
            .status(404)
            .json({
              error:
                "Vendor profile not found. Please create a vendor profile first.",
            });
        }

        // Check if already has a Connect account
        if (vendorProfile.stripeConnectAccountId) {
          return res.json({
            accountId: vendorProfile.stripeConnectAccountId,
            message: "Account already exists",
          });
        }

        // Determine product description based on vendor type
        let productDescription = "Local products and goods";
        if (vendorProfile.vendorType === "dine") {
          productDescription = "Restaurant and food services";
        } else if (vendorProfile.vendorType === "service") {
          productDescription = "Professional services";
        }

        // Create Stripe Connect Express account
        const account = await getStripe().accounts.create({
          type: "express",
          country: "US",
          email: user.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "individual", // Can be updated during onboarding
          business_profile: {
            mcc: "5499", // Misc food stores - retail
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
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Generate Stripe Connect onboarding link
  app.post(
    "/api/stripe/account-link",
    requireAuth,
    async (req: any, res) => {
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
          return res
            .status(404)
            .json({
              error: "No Stripe Connect account found. Create one first.",
            });
        }

        // Generate account link for onboarding
        const accountLink = await getStripe().accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${req.protocol}://${req.get("host")}/dashboard?stripe_refresh=true`,
          return_url: `${req.protocol}://${req.get("host")}/dashboard?stripe_success=true`,
          type: "account_onboarding",
        });

        res.json({ url: accountLink.url });
      } catch (error) {
        console.error("Error creating account link:", error);
        res.status(500).json({
          error: "Failed to create onboarding link",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Check Stripe Connect account status
  app.get(
    "/api/stripe/account-status",
    requireAuth,
    async (req: any, res) => {
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
            onboardingComplete: false,
          });
        }

        // Fetch account details from Stripe
        const account = await getStripe().accounts.retrieve(stripeAccountId);

        // Check if charges are enabled and onboarding is complete
        const onboardingComplete =
          account.charges_enabled && account.details_submitted;

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
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Stripe webhook endpoint for account updates and payment processing
  // NOTE: This endpoint receives raw body from express.raw() middleware in index.ts
  // Middleware order in server/index.ts ensures express.raw() runs BEFORE express.json()
  app.post("/api/stripe/webhook", async (req, res) => {
    app.post("/api/stripe/webhook", async (req, res) => {
      console.log("🔔 WEBHOOK RECEIVED - Headers:", req.headers);
      console.log("🔔 WEBHOOK RECEIVED - Path:", req.path);
      console.log("🔔 WEBHOOK RECEIVED - Body exists:", !!req.body);

      // ... rest of your webhook code
    });

    console.log("[Stripe Webhook] Received request");

    const sig = req.headers["stripe-signature"];

    if (!sig) {
      console.error("[Stripe Webhook] FAILED: Missing stripe-signature header");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(
        "[Stripe Webhook] FAILED: STRIPE_WEBHOOK_SECRET not configured",
      );
      return res
        .status(400)
        .json({ error: "Webhook secret not configured - contact support" });
    }

    let event: Stripe.Event;

    // Signature verification - return 400 on failure, NOT 500
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (signatureError) {
      console.error("[Stripe Webhook] SIGNATURE VERIFICATION FAILED", {
        error:
          signatureError instanceof Error
            ? signatureError.message
            : String(signatureError),
        signatureHeader: sig ? "present" : "missing",
      });
      return res.status(400).json({
        error: "Webhook signature verification failed",
        details:
          signatureError instanceof Error
            ? signatureError.message
            : "Invalid signature",
      });
    }

    // STRUCTURED EVENT LOGGING: Log comprehensive event details for debugging
    const eventObject = event.data.object as any;
    console.log("[Stripe Webhook] Event received and verified", {
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
      created: event.created,
      createdAt: new Date(event.created * 1000).toISOString(),
      // Key object identifiers vary by event type
      sessionId: eventObject.id || null,
      customerId: eventObject.customer || null,
      subscriptionId: eventObject.subscription || eventObject.id || null,
      customerEmail: eventObject.customer_email || eventObject.email || null,
      clientReferenceId: eventObject.client_reference_id || null,
      metadata: eventObject.metadata || null,
    });

    // Idempotency check - if already processed, return 200 immediately
    try {
      const alreadyProcessed = await storage.isWebhookEventProcessed(event.id);
      if (alreadyProcessed) {
        console.log("[Stripe Webhook] Event already processed, skipping", {
          eventId: event.id,
          eventType: event.type,
        });
        return res
          .status(200)
          .json({ received: true, status: "already_processed" });
      }
    } catch (idempotencyError) {
      // If idempotency check fails, log but continue processing (better to potentially duplicate than fail)
      console.warn("[Stripe Webhook] Idempotency check failed, continuing", {
        eventId: event.id,
        error:
          idempotencyError instanceof Error
            ? idempotencyError.message
            : String(idempotencyError),
      });
    }

    try {
      // Handle payment_intent.succeeded - create transfers to vendors
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;

        if (metadata.vendorCount) {
          const vendorCount = parseInt(metadata.vendorCount);

          // Process each vendor transfer
          for (let i = 0; i < vendorCount; i++) {
            const vendorId = metadata[`vendor_${i}_id`];
            const vendorSubtotalCents = parseInt(
              metadata[`vendor_${i}_subtotal`],
            );
            const vendorTaxCents = parseInt(metadata[`vendor_${i}_tax`]);

            if (vendorId && vendorSubtotalCents) {
              try {
                // Get vendor's Stripe Connect account ID
                const vendor = await storage.getVendor(vendorId);

                if (
                  vendor?.stripeConnectAccountId &&
                  vendor?.stripeOnboardingComplete
                ) {
                  // Vendor receives the full amount: subtotal + tax
                  // Platform revenue comes from $150/month vendor membership fees
                  const vendorReceivesCents =
                    vendorSubtotalCents + vendorTaxCents;

                  // Create transfer to vendor's connected account
                  await getStripe().transfers.create({
                    amount: vendorReceivesCents,
                    currency: "usd",
                    destination: vendor.stripeConnectAccountId,
                    transfer_group: paymentIntent.id,
                    metadata: {
                      vendorId: vendor.id,
                      paymentIntentId: paymentIntent.id,
                      subtotalCents: vendorSubtotalCents.toString(),
                      taxCents: vendorTaxCents.toString(),
                    },
                  });

                  console.log(
                    `Transfer created for vendor ${vendorId}: $${(vendorReceivesCents / 100).toFixed(2)}`,
                  );
                } else {
                  console.warn(
                    `Vendor ${vendorId} does not have Stripe Connect configured`,
                  );
                }
              } catch (error) {
                console.error(
                  `Failed to create transfer for vendor ${vendorId}:`,
                  error,
                );
                // Continue processing other vendors even if one fails
              }
            }
          }
        }
      }

      // Handle account.updated events
      if (event.type === "account.updated") {
        const account = event.data.object as Stripe.Account;
        const accountId = account.id;
        const onboardingComplete =
          account.charges_enabled && account.details_submitted;

        // Find vendor with this Stripe account ID and update status (unified system)
        const vendors = await storage.getVendors();
        const vendor = vendors.find(
          (v: any) => v.stripeConnectAccountId === accountId,
        );

        if (vendor) {
          await storage.updateVendor(vendor.id, {
            stripeOnboardingComplete: onboardingComplete,
          });
          console.log(
            `Updated Stripe onboarding status for vendor ${vendor.id}`,
          );
        } else {
          console.warn(
            `No vendor found with Stripe Connect account ID ${accountId}`,
          );
        }
      }

      // Handle Rise Local Pass subscription events
      if (event.type === "checkout.session.completed") {
        try {
          const session = event.data.object as Stripe.Checkout.Session;
          // Support both new appUserId and legacy userId metadata keys
          const appUserId =
            session.metadata?.appUserId ||
            session.metadata?.userId ||
            session.client_reference_id;
          const customerId = session.customer as string | null;
          const subscriptionId = session.subscription as string | null;

          console.log(
            "[Stripe Webhook] checkout.session.completed - PROCESSING",
            {
              eventId: event.id,
              sessionMode: session.mode,
              appUserId,
              customer: customerId,
              subscription: subscriptionId,
              client_reference_id: session.client_reference_id,
              metadata: session.metadata,
              customer_email: session.customer_email,
            },
          );

          if (session.mode === "subscription" && subscriptionId) {
            // Fetch the subscription details
            console.log(
              "[Stripe Webhook] Fetching subscription from Stripe:",
              subscriptionId,
            );
            let subscriptionData: any;
            try {
              subscriptionData =
                await getStripe().subscriptions.retrieve(subscriptionId);
              console.log("[Stripe Webhook] Subscription retrieved:", {
                id: subscriptionData.id,
                status: subscriptionData.status,
                current_period_end: subscriptionData.current_period_end,
              });
            } catch (stripeError) {
              console.error(
                "[Stripe Webhook] FAILED to retrieve subscription from Stripe",
                {
                  eventId: event.id,
                  subscriptionId,
                  error:
                    stripeError instanceof Error
                      ? stripeError.message
                      : String(stripeError),
                },
              );
              return res.status(500).json({
                error: "Failed to retrieve subscription from Stripe",
                details:
                  stripeError instanceof Error
                    ? stripeError.message
                    : String(stripeError),
              });
            }

            // Primary lookup: use metadata.appUserId, metadata.userId (legacy), or client_reference_id
            let user = null;
            let lookupMethod = "";

            console.log(
              "[Stripe Webhook] Looking up user with appUserId:",
              appUserId,
            );
            if (appUserId) {
              user = await storage.getUser(appUserId);
              lookupMethod = session.metadata?.appUserId
                ? "metadata.appUserId"
                : session.metadata?.userId
                  ? "metadata.userId (legacy)"
                  : "client_reference_id";
              console.log(
                "[Stripe Webhook] User lookup by",
                lookupMethod,
                ":",
                user ? `Found user ${user.id}` : "NOT FOUND",
              );
            }

            // Fallback: try stripeCustomerId if primary lookup failed
            if (!user && customerId) {
              console.log(
                "[Stripe Webhook] Fallback: looking up user by stripeCustomerId:",
                customerId,
              );
              user = await storage.getUserByStripeCustomerId(customerId);
              lookupMethod = "stripeCustomerId";
              console.log(
                "[Stripe Webhook] User lookup by stripeCustomerId:",
                user ? `Found user ${user.id}` : "NOT FOUND",
              );
            }

            // Additional fallback: try customer email
            if (!user && session.customer_email) {
              console.log(
                "[Stripe Webhook] Fallback: looking up user by email:",
                session.customer_email,
              );
              user = await storage.getUserByEmail(session.customer_email);
              lookupMethod = "customer_email";
              console.log(
                "[Stripe Webhook] User lookup by email:",
                user ? `Found user ${user.id}` : "NOT FOUND",
              );
            }

            if (user) {
              // Log raw Stripe timestamp values for debugging
              console.log("[Stripe Webhook] Raw subscription data timestamps", {
                eventId: event.id,
                userId: user.id,
                current_period_end: subscriptionData.current_period_end,
                current_period_start: subscriptionData.current_period_start,
                trial_end: subscriptionData.trial_end,
                created: subscriptionData.created,
                status: subscriptionData.status,
              });

              // Safely convert Stripe Unix timestamps to JS Dates
              const periodEnd = stripeUnixToDateOrNull(
                subscriptionData.current_period_end,
              );
              const periodStart = stripeUnixToDateOrNull(
                subscriptionData.current_period_start,
              );

              console.log("[Stripe Webhook] Converted timestamps", {
                eventId: event.id,
                periodEnd: safeToISOString(periodEnd),
                periodStart: safeToISOString(periodStart),
                periodEndValid: periodEnd !== null,
              });

              // If period end is invalid, treat as needs_manual_sync - don't throw
              if (!periodEnd) {
                console.error(
                  "[Stripe Webhook] NEEDS_MANUAL_SYNC - invalid period_end timestamp",
                  {
                    eventId: event.id,
                    userId: user.id,
                    raw_current_period_end: subscriptionData.current_period_end,
                    subscriptionId: subscriptionData.id,
                    action: "Admin must manually sync this membership",
                  },
                );

                // Record as needs_manual_sync for admin follow-up
                try {
                  await storage.markWebhookEventProcessed(
                    event.id,
                    event.type,
                    "needs_manual_sync",
                    JSON.stringify({
                      userId: user.id,
                      subscriptionId: subscriptionData.id,
                      customerId,
                      reason: "Invalid current_period_end timestamp",
                      raw_value: subscriptionData.current_period_end,
                    }),
                  );
                } catch (logError) {
                  console.warn(
                    "[Stripe Webhook] Failed to log needs_manual_sync event",
                    { eventId: event.id },
                  );
                }

                // Return 200 OK to stop Stripe retries - manual sync required
                return res.status(200).json({
                  received: true,
                  status: "needs_manual_sync",
                  message: "Invalid timestamp - admin sync required",
                });
              }

              try {
                const isActive =
                  subscriptionData.status === "active" ||
                  subscriptionData.status === "trialing";

                // Determine plan type from metadata or price ID
                const planType = session.metadata?.plan || "monthly";
                const membershipPlan =
                  planType === "annual"
                    ? "rise_local_annual"
                    : "rise_local_monthly";

                const previousStatus = user.membershipStatus;
                const previousPlan = user.membershipPlan;

                console.log("[Stripe Webhook] Updating user membership", {
                  userId: user.id,
                  isActive,
                  periodEnd: safeToISOString(periodEnd),
                  membershipPlan,
                });

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
                  eventType: "checkout.session.completed",
                  previousStatus: previousStatus || undefined,
                  newStatus: subscriptionData.status,
                  previousPlan: previousPlan || undefined,
                  newPlan: membershipPlan,
                  metadata: JSON.stringify({
                    subscriptionId: subscriptionData.id,
                    periodEnd: safeToISOString(periodEnd),
                  }),
                });

                console.log("[Stripe Webhook] Pass unlock SUCCESS", {
                  eventId: event.id,
                  userId: user.id,
                  email: user.email,
                  customer: customerId,
                  subscription: subscriptionData.id,
                  plan: membershipPlan,
                  status: subscriptionData.status,
                  isPassMember: isActive,
                  passExpiresAt: safeToISOString(periodEnd),
                  lookupMethod,
                });
              } catch (dbError) {
                // Database error - log as needs_manual_sync and return 200 to stop Stripe retries
                console.error(
                  "[Stripe Webhook] NEEDS_MANUAL_SYNC - database error",
                  {
                    eventId: event.id,
                    userId: user.id,
                    customer: customerId,
                    subscription: subscriptionId,
                    error:
                      dbError instanceof Error
                        ? dbError.message
                        : String(dbError),
                    stack: dbError instanceof Error ? dbError.stack : undefined,
                  },
                );

                // Record as needs_manual_sync for admin follow-up
                try {
                  await storage.markWebhookEventProcessed(
                    event.id,
                    event.type,
                    "needs_manual_sync",
                    JSON.stringify({
                      userId: user.id,
                      subscriptionId,
                      customerId,
                      reason: "Database update failed",
                      error:
                        dbError instanceof Error
                          ? dbError.message
                          : String(dbError),
                    }),
                  );
                } catch (logError) {
                  console.warn(
                    "[Stripe Webhook] Failed to log needs_manual_sync event",
                    { eventId: event.id },
                  );
                }

                // Return 200 OK to stop Stripe retries - manual sync required
                return res.status(200).json({
                  received: true,
                  status: "needs_manual_sync",
                  message: "Database update failed - admin sync required",
                  error:
                    dbError instanceof Error
                      ? dbError.message
                      : String(dbError),
                });
              }
            } else {
              // NEEDS_MANUAL_SYNC: User not found, log for manual resolution but return 200 so Stripe stops retrying
              console.error(
                "[Stripe Webhook] NEEDS_MANUAL_SYNC - no user found",
                {
                  eventId: event.id,
                  sessionId: session.id,
                  appUserId,
                  customer: customerId,
                  subscription: subscriptionId,
                  client_reference_id: session.client_reference_id,
                  customer_email: session.customer_email,
                  metadata: session.metadata,
                  action:
                    "Admin must use POST /api/admin/sync-membership with { subscriptionId } or { email } to activate",
                },
              );

              // Log NEEDS_MANUAL_SYNC event for tracking - still return 200 OK
              try {
                await storage.markWebhookEventProcessed(
                  event.id,
                  event.type,
                  "needs_manual_sync",
                  JSON.stringify({
                    sessionId: session.id,
                    subscriptionId,
                    customerId,
                    customerEmail: session.customer_email,
                    appUserId,
                    reason:
                      "User not found by appUserId, stripeCustomerId, or email",
                  }),
                );
              } catch (logError) {
                console.warn(
                  "[Stripe Webhook] Failed to log needs_manual_sync event",
                  { eventId: event.id },
                );
              }

              // Return 200 OK so Stripe stops retrying - manual sync required
              return res.status(200).json({
                received: true,
                status: "needs_manual_sync",
                message: "User not found - admin sync required",
              });
            }
          } else {
            console.log(
              "[Stripe Webhook] checkout.session.completed - skipping (not a subscription)",
              {
                eventId: event.id,
                sessionId: session.id,
                sessionMode: session.mode,
                hasSubscription: !!subscriptionId,
              },
            );
          }
        } catch (checkoutError) {
          console.error(
            "[Stripe Webhook] checkout.session.completed - UNEXPECTED ERROR",
            {
              eventId: event.id,
              error:
                checkoutError instanceof Error
                  ? checkoutError.message
                  : String(checkoutError),
              stack:
                checkoutError instanceof Error
                  ? checkoutError.stack
                  : undefined,
            },
          );
          // Return 200 to prevent Stripe retries - log the failure for manual investigation
          try {
            await storage.markWebhookEventProcessed(
              event.id,
              event.type,
              "failed",
              JSON.stringify({
                error:
                  checkoutError instanceof Error
                    ? checkoutError.message
                    : String(checkoutError),
              }),
            );
          } catch (markError) {
            console.warn("[Stripe Webhook] Failed to mark event as failed", {
              eventId: event.id,
            });
          }
          return res.status(200).json({
            received: true,
            status: "processing_failed",
            error:
              checkoutError instanceof Error
                ? checkoutError.message
                : String(checkoutError),
          });
        }
      }

      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated"
      ) {
        const subscriptionData = event.data.object as any;
        const customerId = subscriptionData.customer as string;
        console.log(
          "[Stripe Webhook]",
          event.type,
          "for customer:",
          customerId,
        );

        // Log raw timestamp for debugging
        console.log("[Stripe Webhook] Raw subscription timestamps", {
          eventId: event.id,
          current_period_end: subscriptionData.current_period_end,
        });

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          const periodEnd = stripeUnixToDateOrNull(
            subscriptionData.current_period_end,
          );
          const isActive =
            subscriptionData.status === "active" ||
            subscriptionData.status === "trialing";
          const previousStatus = user.membershipStatus;
          const previousPlan = user.membershipPlan;

          // If periodEnd is invalid, skip update but log for investigation
          if (!periodEnd) {
            console.error(
              "[Stripe Webhook] NEEDS_MANUAL_SYNC - invalid period_end in subscription update",
              {
                eventId: event.id,
                userId: user.id,
                raw_current_period_end: subscriptionData.current_period_end,
              },
            );
            // Continue processing other events - don't return
          } else {
            // Determine effective status: if cancel_at_period_end is true, show "canceling"
            const effectiveStatus = subscriptionData.cancel_at_period_end 
              ? "canceling" 
              : subscriptionData.status;

            // Determine plan type from price ID
            const priceId = subscriptionData.items?.data?.[0]?.price?.id;
            const monthlyPriceId = process.env.STRIPE_RISELOCAL_MONTHLY_PRICE_ID;
            const annualPriceId = process.env.STRIPE_RISELOCAL_ANNUAL_PRICE_ID;
            
            let membershipPlan = user.membershipPlan;
            if (isActive) {
              if (priceId === annualPriceId) {
                membershipPlan = "rise_local_annual";
              } else if (priceId === monthlyPriceId) {
                membershipPlan = "rise_local_monthly";
              } else {
                // Fallback to monthly if price ID not recognized
                membershipPlan = membershipPlan || "rise_local_monthly";
              }
            }

            await storage.updateUser(user.id, {
              stripeSubscriptionId: subscriptionData.id,
              membershipStatus: effectiveStatus,
              membershipPlan: membershipPlan,
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
              newStatus: effectiveStatus,
              previousPlan: previousPlan || undefined,
              newPlan: membershipPlan || undefined,
              metadata: JSON.stringify({
                subscriptionId: subscriptionData.id,
                periodEnd: safeToISOString(periodEnd),
                cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
              }),
            });

            console.log(
              "[Stripe Webhook] User subscription updated:",
              user.id,
              "status:",
              effectiveStatus,
              "cancelAtPeriodEnd:",
              subscriptionData.cancel_at_period_end,
            );
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscriptionData = event.data.object as any;
        const customerId = subscriptionData.customer as string;
        console.log(
          "[Stripe Webhook] customer.subscription.deleted for customer:",
          customerId,
        );

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          const previousStatus = user.membershipStatus;
          const previousPlan = user.membershipPlan;

          await storage.updateUser(user.id, {
            stripeSubscriptionId: null,
            membershipStatus: "canceled",
            membershipPlan: null,
            isPassMember: false,
          });

          // Log membership event for audit
          await storage.logMembershipEvent({
            userId: user.id,
            stripeEventId: event.id,
            eventType: "customer.subscription.deleted",
            previousStatus: previousStatus || undefined,
            newStatus: "canceled",
            previousPlan: previousPlan || undefined,
            newPlan: undefined,
            metadata: JSON.stringify({ subscriptionId: subscriptionData.id }),
          });

          console.log("[Stripe Webhook] User subscription deleted:", user.id);
        }
      }

      if (event.type === "invoice.paid") {
        const invoiceData = event.data.object as any;
        const customerId = invoiceData.customer as string;
        console.log("[Stripe Webhook] invoice.paid for customer:", customerId);

        if (invoiceData.subscription) {
          const subscriptionData = (await getStripe().subscriptions.retrieve(
            invoiceData.subscription as string,
          )) as any;

          // Log raw timestamp for debugging
          console.log(
            "[Stripe Webhook] Raw invoice.paid subscription timestamps",
            {
              eventId: event.id,
              current_period_end: subscriptionData.current_period_end,
            },
          );

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            const previousStatus = user.membershipStatus;
            const periodEnd = stripeUnixToDateOrNull(
              subscriptionData.current_period_end,
            );

            // If periodEnd is invalid, skip update but log for investigation
            if (!periodEnd) {
              console.error(
                "[Stripe Webhook] NEEDS_MANUAL_SYNC - invalid period_end in invoice.paid",
                {
                  eventId: event.id,
                  userId: user.id,
                  raw_current_period_end: subscriptionData.current_period_end,
                },
              );
              // Continue processing other events - don't return
            } else {
              await storage.updateUser(user.id, {
                membershipStatus: "active",
                membershipCurrentPeriodEnd: periodEnd,
                isPassMember: true,
                passExpiresAt: periodEnd,
              });

              // Log membership event for audit
              await storage.logMembershipEvent({
                userId: user.id,
                stripeEventId: event.id,
                eventType: "invoice.paid",
                previousStatus: previousStatus || undefined,
                newStatus: "active",
                previousPlan: user.membershipPlan || undefined,
                newPlan: user.membershipPlan || undefined,
                metadata: JSON.stringify({
                  subscriptionId: invoiceData.subscription,
                  invoiceId: invoiceData.id,
                  periodEnd: safeToISOString(periodEnd),
                }),
              });

              console.log("[Stripe Webhook] User membership renewed:", user.id);
            }
          }
        }
      }

      if (event.type === "invoice.payment_failed") {
        const invoiceData = event.data.object as any;
        const customerId = invoiceData.customer as string;
        console.log(
          "[Stripe Webhook] invoice.payment_failed for customer:",
          customerId,
        );

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          const previousStatus = user.membershipStatus;
          await storage.updateUser(user.id, {
            membershipStatus: "past_due",
          });

          // Log membership event for audit
          await storage.logMembershipEvent({
            userId: user.id,
            stripeEventId: event.id,
            eventType: "invoice.payment_failed",
            previousStatus: previousStatus || undefined,
            newStatus: "past_due",
            previousPlan: user.membershipPlan || undefined,
            newPlan: user.membershipPlan || undefined,
            metadata: JSON.stringify({ invoiceId: invoiceData.id }),
          });

          console.log("[Stripe Webhook] User payment failed:", user.id);
        }
      }

      // Mark event as successfully processed for idempotency
      try {
        await storage.markWebhookEventProcessed(
          event.id,
          event.type,
          "processed",
        );
      } catch (markError) {
        console.warn("[Stripe Webhook] Failed to mark event as processed", {
          eventId: event.id,
        });
      }

      // Always return 200 to acknowledge receipt (Stripe best practice)
      console.log("[Stripe Webhook] Processing complete", {
        eventId: event.id,
        eventType: event.type,
      });
      res.status(200).json({ received: true, status: "processed" });
    } catch (processingError) {
      // Processing error after signature verification - log but still return 200 to prevent infinite retries
      const errorMessage =
        processingError instanceof Error
          ? processingError.message
          : String(processingError);
      console.error("[Stripe Webhook] PROCESSING ERROR", {
        eventId: event.id,
        eventType: event.type,
        error: errorMessage,
        stack:
          processingError instanceof Error ? processingError.stack : undefined,
      });

      // Try to mark as failed for tracking
      try {
        await storage.markWebhookEventProcessed(
          event.id,
          event.type,
          "failed",
          JSON.stringify({ error: errorMessage }),
        );
      } catch (markError) {
        console.warn("[Stripe Webhook] Failed to mark event as failed", {
          eventId: event.id,
        });
      }

      // Return 200 to prevent Stripe retries - event was received, processing failed
      res
        .status(200)
        .json({
          received: true,
          status: "processing_failed",
          error: errorMessage,
        });
    }
  });

  // Debug endpoint for membership status (admin only)
  app.get(
    "/api/debug/membership/:userId",
    requireAuth,
    async (req: any, res) => {
      try {
        const requestingUserId = req.user.claims.sub;
        const targetUserId = req.params.userId;

        // Only allow users to view their own membership info (or admin check could go here)
        const requestingUser = await storage.getUser(requestingUserId);
        if (!requestingUser) {
          return res.status(403).json({ error: "User not found" });
        }

        // For now, only allow self-lookup or admin role
        if (
          requestingUserId !== targetUserId &&
          requestingUser.role !== "admin"
        ) {
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
        res
          .status(500)
          .json({ error: "Failed to fetch membership debug info" });
      }
    },
  );

  // Safety net endpoint: Refresh entitlements from Stripe
  // Allows users to manually trigger a check of their subscription status
  // Useful when webhook delivery fails or membership isn't unlocked after payment
  app.post(
    "/api/entitlements/refresh",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { checkout_session_id } = req.body;

        console.log("[Entitlements Refresh] Starting refresh", {
          userId,
          checkout_session_id,
        });

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        let stripeSubscription: any = null;
        let stripeCustomer: any = null;

        // Method 1: Use checkout_session_id if provided
        if (checkout_session_id) {
          try {
            const session = await getStripe().checkout.sessions.retrieve(
              checkout_session_id,
              {
                expand: ["subscription", "customer"],
              },
            );

            console.log("[Entitlements Refresh] Retrieved checkout session", {
              sessionId: session.id,
              customer: session.customer,
              subscription: session.subscription,
              paymentStatus: session.payment_status,
            });

            if (session.subscription) {
              stripeSubscription =
                typeof session.subscription === "string"
                  ? await getStripe().subscriptions.retrieve(session.subscription)
                  : session.subscription;
            }
            if (session.customer) {
              stripeCustomer =
                typeof session.customer === "string"
                  ? await getStripe().customers.retrieve(session.customer)
                  : session.customer;
            }
          } catch (sessionError) {
            console.warn(
              "[Entitlements Refresh] Failed to retrieve checkout session",
              {
                checkout_session_id,
                error:
                  sessionError instanceof Error
                    ? sessionError.message
                    : String(sessionError),
              },
            );
          }
        }

        // Method 2: Use user's stripeSubscriptionId
        if (!stripeSubscription && user.stripeSubscriptionId) {
          try {
            stripeSubscription = await getStripe().subscriptions.retrieve(
              user.stripeSubscriptionId,
            );
            console.log(
              "[Entitlements Refresh] Retrieved subscription by user.stripeSubscriptionId",
              {
                subscriptionId: user.stripeSubscriptionId,
                status: stripeSubscription.status,
              },
            );
          } catch (subError) {
            console.warn(
              "[Entitlements Refresh] Failed to retrieve subscription by stripeSubscriptionId",
              {
                subscriptionId: user.stripeSubscriptionId,
                error:
                  subError instanceof Error
                    ? subError.message
                    : String(subError),
              },
            );
          }
        }

        // Method 3: Use user's stripeCustomerId to find subscriptions
        if (!stripeSubscription && user.stripeCustomerId) {
          try {
            const subscriptions = await getStripe().subscriptions.list({
              customer: user.stripeCustomerId,
              status: "all",
              limit: 1,
            });
            if (subscriptions.data.length > 0) {
              stripeSubscription = subscriptions.data[0];
              console.log(
                "[Entitlements Refresh] Found subscription via customer lookup",
                {
                  customerId: user.stripeCustomerId,
                  subscriptionId: stripeSubscription.id,
                  status: stripeSubscription.status,
                },
              );
            }
          } catch (custError) {
            console.warn(
              "[Entitlements Refresh] Failed to find subscription by stripeCustomerId",
              {
                customerId: user.stripeCustomerId,
                error:
                  custError instanceof Error
                    ? custError.message
                    : String(custError),
              },
            );
          }
        }

        // Method 4: Use user's email to find customer and subscription
        if (!stripeSubscription && user.email) {
          try {
            const customers = await getStripe().customers.list({
              email: user.email,
              limit: 1,
            });
            if (customers.data.length > 0) {
              const customer = customers.data[0];
              const subscriptions = await getStripe().subscriptions.list({
                customer: customer.id,
                status: "all",
                limit: 1,
              });
              if (subscriptions.data.length > 0) {
                stripeSubscription = subscriptions.data[0];
                stripeCustomer = customer;
                console.log(
                  "[Entitlements Refresh] Found subscription via email lookup",
                  {
                    email: user.email,
                    customerId: customer.id,
                    subscriptionId: stripeSubscription.id,
                    status: stripeSubscription.status,
                  },
                );
              }
            }
          } catch (emailError) {
            console.warn(
              "[Entitlements Refresh] Failed to find subscription by email",
              {
                email: user.email,
                error:
                  emailError instanceof Error
                    ? emailError.message
                    : String(emailError),
              },
            );
          }
        }

        // No subscription found
        if (!stripeSubscription) {
          console.log("[Entitlements Refresh] No subscription found", {
            userId,
            email: user.email,
          });
          return res.status(404).json({
            error: "No subscription found",
            message:
              "We couldn't find an active subscription for your account. If you recently subscribed, please wait a few minutes and try again.",
            currentStatus: {
              isPassMember: user.isPassMember,
              passExpiresAt: user.passExpiresAt,
            },
          });
        }

        // Update user entitlements based on subscription status
        const isActive =
          stripeSubscription.status === "active" ||
          stripeSubscription.status === "trialing";
        const periodEnd = stripeUnixToDateOrNull(
          stripeSubscription.current_period_end,
        );

        if (!periodEnd) {
          console.error("[Entitlements Refresh] Invalid period_end timestamp", {
            userId,
            raw_current_period_end: stripeSubscription.current_period_end,
          });
          return res.status(500).json({
            error: "Invalid subscription data",
            message:
              "The subscription has an invalid expiration date. Please contact support.",
          });
        }

        const customerId =
          typeof stripeSubscription.customer === "string"
            ? stripeSubscription.customer
            : stripeSubscription.customer?.id;

        // Derive membership plan from Stripe price ID
        const monthlyPriceId = process.env.STRIPE_RISELOCAL_MONTHLY_PRICE_ID;
        const annualPriceId = process.env.STRIPE_RISELOCAL_ANNUAL_PRICE_ID;
        const subscriptionPriceId =
          stripeSubscription.items?.data?.[0]?.price?.id;
        let derivedPlan = "rise_local_monthly"; // Default fallback

        if (subscriptionPriceId) {
          if (annualPriceId && subscriptionPriceId === annualPriceId) {
            derivedPlan = "rise_local_annual";
          } else if (monthlyPriceId && subscriptionPriceId === monthlyPriceId) {
            derivedPlan = "rise_local_monthly";
          } else {
            // Unknown price ID - try to detect from subscription interval
            const interval =
              stripeSubscription.items?.data?.[0]?.price?.recurring?.interval;
            derivedPlan =
              interval === "year" ? "rise_local_annual" : "rise_local_monthly";
            console.log("[Entitlements Refresh] Derived plan from interval", {
              subscriptionPriceId,
              interval,
              derivedPlan,
            });
          }
        }

        console.log("[Entitlements Refresh] Determined membership plan", {
          subscriptionPriceId,
          monthlyPriceId,
          annualPriceId,
          derivedPlan,
        });

        const previousStatus = user.membershipStatus;
        const previousPlan = user.membershipPlan;

        // Update user record
        await storage.updateUser(userId, {
          stripeCustomerId: customerId || user.stripeCustomerId,
          stripeSubscriptionId: stripeSubscription.id,
          membershipStatus: stripeSubscription.status,
          membershipPlan: derivedPlan,
          membershipCurrentPeriodEnd: periodEnd,
          isPassMember: isActive,
          passExpiresAt: periodEnd,
        });

        // Log membership event for audit
        await storage.logMembershipEvent({
          userId,
          stripeEventId: `manual_refresh_${Date.now()}`,
          eventType: "manual_entitlements_refresh",
          previousStatus: previousStatus || undefined,
          newStatus: stripeSubscription.status,
          previousPlan: previousPlan || undefined,
          newPlan: derivedPlan,
          metadata: JSON.stringify({
            source: "entitlements_refresh_endpoint",
            checkout_session_id,
            subscriptionId: stripeSubscription.id,
            subscriptionPriceId,
            derivedPlan,
            periodEnd: safeToISOString(periodEnd),
          }),
        });

        console.log("[Entitlements Refresh] SUCCESS - Membership updated", {
          userId,
          email: user.email,
          subscriptionId: stripeSubscription.id,
          status: stripeSubscription.status,
          plan: derivedPlan,
          isPassMember: isActive,
          passExpiresAt: safeToISOString(periodEnd),
        });

        res.json({
          success: true,
          message: isActive
            ? "Your Rise Local Pass is now active!"
            : `Subscription status: ${stripeSubscription.status}`,
          membership: {
            isPassMember: isActive,
            passExpiresAt: periodEnd,
            membershipStatus: stripeSubscription.status,
            membershipPlan: derivedPlan,
            subscriptionId: stripeSubscription.id,
          },
        });
      } catch (error) {
        console.error("[Entitlements Refresh] Error:", error);
        res.status(500).json({
          error: "Failed to refresh entitlements",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.patch("/api/vendors/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(
        "[PATCH /api/vendors/:id] userId:",
        userId,
        "vendorId:",
        req.params.id,
        "body:",
        req.body,
      );

      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        console.log("[PATCH /api/vendors/:id] Vendor not found");
        return res.status(404).json({ error: "Vendor not found" });
      }

      // Verify ownership
      if (vendor.ownerId !== userId) {
        console.log(
          "[PATCH /api/vendors/:id] Ownership mismatch - vendor.ownerId:",
          vendor.ownerId,
          "userId:",
          userId,
        );
        return res
          .status(403)
          .json({ error: "Unauthorized to update this vendor" });
      }

      const validatedData = insertVendorSchema.partial().parse(req.body);
      console.log("[PATCH /api/vendors/:id] Validated data:", validatedData);

      // If fulfillmentOptions is being updated, validate it and derive serviceOptions
      if (validatedData.fulfillmentOptions) {
        try {
          // Validate fulfillmentOptions against the schema
          const fulfillment = fulfillmentOptionsSchema.parse(
            validatedData.fulfillmentOptions,
          );

          // Derive serviceOptions from validated fulfillmentOptions
          const serviceOptions = deriveServiceOptions(fulfillment);
          validatedData.serviceOptions = serviceOptions;

          console.log(
            "[PATCH /api/vendors/:id] Validated fulfillmentOptions and derived serviceOptions:",
            serviceOptions,
          );
        } catch (error) {
          console.error(
            "[PATCH /api/vendors/:id] Invalid fulfillmentOptions:",
            error,
          );
          return res.status(400).json({
            error: "Invalid fulfillment options",
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Geocode address if address fields changed
      const addressChanged =
        validatedData.address !== undefined ||
        validatedData.city !== undefined ||
        validatedData.state !== undefined ||
        validatedData.zipCode !== undefined;

      if (addressChanged) {
        // Build full address using new values or existing vendor values
        const fullAddress = buildFullAddress(
          validatedData.address ?? vendor.address,
          validatedData.city ?? vendor.city,
          validatedData.state ?? vendor.state,
          validatedData.zipCode ?? vendor.zipCode,
        );

        console.log("[PATCH /api/vendors/:id] Geocoding address:", fullAddress);
        const coordinates = await geocodeAddress(fullAddress);

        if (coordinates) {
          validatedData.latitude = coordinates.latitude;
          validatedData.longitude = coordinates.longitude;
          console.log(
            "[PATCH /api/vendors/:id] Geocoded coordinates:",
            coordinates,
          );
        } else {
          console.log(
            "[PATCH /api/vendors/:id] Geocoding failed, keeping null coordinates",
          );
        }
      }

      await storage.updateVendor(req.params.id, validatedData);
      console.log("[PATCH /api/vendors/:id] Update successful");
      res.json({ success: true });
    } catch (error) {
      console.error("[PATCH /api/vendors/:id] Error:", error);
      res
        .status(400)
        .json({
          error: "Invalid vendor update data",
          details: error instanceof Error ? error.message : String(error),
        });
    }
  });

  app.delete("/api/vendors/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      // Verify ownership
      if (vendor.ownerId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to delete this vendor" });
      }

      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  app.patch(
    "/api/vendors/:id/verify",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Only admins can verify vendors
        if (user?.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Unauthorized - admin access required" });
        }

        const schema = z.object({ isVerified: z.boolean() });
        const { isVerified } = schema.parse(req.body);
        await storage.updateVendorVerification(req.params.id, isVerified);
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ error: "Invalid verification data" });
      }
    },
  );

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
  app.get("/api/orders/me", requireAuth, async (req: any, res) => {
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

  app.post("/api/orders", requireAuth, async (req: any, res) => {
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
  app.get("/api/vendor-orders/my", requireAuth, async (req: any, res) => {
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
  app.patch("/api/vendor-orders/:id/status", requireAuth, async (req: any, res) => {
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
  app.patch("/api/vendor-orders/:id/payment", requireAuth, async (req: any, res) => {
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
  app.get("/api/orders/me", requireAuth, async (req: any, res) => {
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
  app.post(
    "/api/stripe/create-connect-account",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendor = await storage.getVendorByOwnerId(userId);

        if (!vendor) {
          return res.status(404).json({ error: "Vendor profile not found" });
        }

        let accountId = vendor.stripeConnectAccountId;

        // Create Stripe Connect account if it doesn't exist
        if (!accountId) {
          const account = await getStripe().accounts.create({
            type: "express",
            country: "US",
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
        const accountLink = await getStripe().accountLinks.create({
          account: accountId,
          refresh_url: `${req.protocol}://${req.get("host")}/dashboard?stripe_refresh=true`,
          return_url: `${req.protocol}://${req.get("host")}/dashboard?stripe_success=true`,
          type: "account_onboarding",
        });

        res.json({ url: accountLink.url });
      } catch (error: any) {
        console.error("Error creating Stripe Connect account:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to create Connect account" });
      }
    },
  );

  // Check Stripe Connect account status
  app.get(
    "/api/stripe/connect-status",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendor = await storage.getVendorByOwnerId(userId);

        if (!vendor) {
          return res.status(404).json({ error: "Vendor profile not found" });
        }

        if (!vendor.stripeConnectAccountId) {
          return res.json({
            connected: false,
            onboardingComplete: false,
          });
        }

        // Get account details from Stripe
        const account = await getStripe().accounts.retrieve(
          vendor.stripeConnectAccountId,
        );

        const onboardingComplete =
          account.charges_enabled && account.details_submitted;

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
        res
          .status(500)
          .json({ error: error.message || "Failed to check Connect status" });
      }
    },
  );

  // Create payment intent for checkout (splits payment to vendors)
  app.post(
    "/api/stripe/create-payment-intent",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { vendorOrders } = req.body;

        if (!Array.isArray(vendorOrders) || vendorOrders.length === 0) {
          return res.status(400).json({ error: "Vendor orders required" });
        }

        // Calculate total amount
        const totalCents = vendorOrders.reduce(
          (sum: number, order: any) => sum + order.totalCents,
          0,
        );

        // Store vendor order breakdown in metadata for webhook processing
        // Include subtotal, tax, and total for each vendor
        const vendorOrdersMetadata = vendorOrders
          .map((order: any, index: number) => ({
            [`vendor_${index}_id`]: order.vendorId,
            [`vendor_${index}_subtotal`]: order.subtotalCents.toString(),
            [`vendor_${index}_tax`]: order.taxCents.toString(),
            [`vendor_${index}_total`]: order.totalCents.toString(),
          }))
          .reduce((acc, obj) => ({ ...acc, ...obj }), {});

        // Create payment intent that collects on platform account
        // After payment succeeds, webhook will create transfers to vendor accounts
        const paymentIntent = await getStripe().paymentIntents.create({
          amount: totalCents,
          currency: "usd",
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
        res
          .status(500)
          .json({ error: error.message || "Failed to create payment intent" });
      }
    },
  );

  // DISABLED: Cart/checkout functionality removed
  /*
  // ===== MULTI-VENDOR CHECKOUT =====
  
  // Multi-Vendor Checkout Route
  app.post("/api/checkout", requireAuth, async (req: any, res) => {
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

  // Buyer signup route
  app.post(
    "/api/users/buyer/signup",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const {
          email,
          firstName,
          lastName,
          phone,
          zipCode,
          travelRadius,
          dietaryPreferences,
          userValues,
        } = req.body;

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
          role: "buyer",
        });

        const user = await storage.getUser(userId);
        res.json(user);
      } catch (error) {
        console.error("Buyer signup error:", error);
        res.status(500).json({ error: "Failed to complete buyer signup" });
      }
    },
  );

  // Vendor signup route
  app.post("/api/vendors/signup", requireAuth, async (req: any, res) => {
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
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[/api/users] Request from user: ${userId}`);

      const currentUser = await storage.getUser(userId);
      console.log(
        `[/api/users] User found:`,
        currentUser
          ? `${currentUser.email} (role: ${currentUser.role}, isAdmin: ${currentUser.isAdmin})`
          : "NOT FOUND",
      );

      // Only admins can access full user list - support both isAdmin flag and legacy role field
      const isAdminUser =
        currentUser?.isAdmin === true || currentUser?.role === "admin";
      if (!currentUser || !isAdminUser) {
        console.log(`[/api/users] Access DENIED - User is not admin`);
        return res
          .status(403)
          .json({ error: "Unauthorized - Admin access required" });
      }

      console.log(`[/api/users] Access GRANTED - Fetching all users`);
      const users = await storage.getUsers();
      console.log(`[/api/users] Found ${users.length} users`);
      // Return complete user data (excluding password and sensitive auth fields)
      const safeUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        zipCode: user.zipCode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Membership fields for admin Pass toggle
        isPassMember: user.isPassMember,
        passExpiresAt: user.passExpiresAt,
        stripeSubscriptionId: user.stripeSubscriptionId,
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

  app.patch("/api/users/me", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Validate using Zod schema with explicit field picking
      const validatedData = insertUserSchema
        .partial()
        .pick({
          firstName: true,
          lastName: true,
          phone: true,
        })
        .parse(req.body);

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

  // Services routes
  app.get("/api/vendors/:vendorId/services", async (req, res) => {
    try {
      const services = await storage.getServicesByVendor(req.params.vendorId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post(
    "/api/vendors/:vendorId/services",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendor = await storage.getVendor(req.params.vendorId);

        if (!vendor) {
          return res.status(404).json({ error: "Vendor not found" });
        }

        if (vendor.ownerId !== userId) {
          return res
            .status(403)
            .json({ error: "Unauthorized to add services" });
        }

        const validatedData = insertServiceSchema.parse({
          ...req.body,
          vendorId: req.params.vendorId,
        });

        const service = await storage.createService(validatedData);
        res.status(201).json(service);
      } catch (error) {
        res
          .status(400)
          .json({
            error: "Invalid service data",
            details: error instanceof Error ? error.message : String(error),
          });
      }
    },
  );

  app.patch(
    "/api/vendor-services/:id",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const service = await storage.getService(req.params.id);

        if (!service) {
          return res.status(404).json({ error: "Service not found" });
        }

        if (!service.vendorId) {
          return res
            .status(400)
            .json({ error: "Service has no associated vendor" });
        }

        const vendor = await storage.getVendor(service.vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          return res
            .status(403)
            .json({ error: "Unauthorized to update this service" });
        }

        const validatedData = insertServiceSchema.partial().parse(req.body);
        await storage.updateService(req.params.id, validatedData);
        res.json({ success: true });
      } catch (error) {
        res
          .status(400)
          .json({
            error: "Invalid service update data",
            details: error instanceof Error ? error.message : String(error),
          });
      }
    },
  );

  app.delete(
    "/api/vendor-services/:id",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const service = await storage.getService(req.params.id);

        if (!service) {
          return res.status(404).json({ error: "Service not found" });
        }

        if (!service.vendorId) {
          return res
            .status(400)
            .json({ error: "Service has no associated vendor" });
        }

        const vendor = await storage.getVendor(service.vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          return res
            .status(403)
            .json({ error: "Unauthorized to delete this service" });
        }

        await storage.deleteService(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete service" });
      }
    },
  );

  // ===== RESTAURANT ROUTES (Legacy - using unified vendor system) =====

  app.get("/api/restaurants", async (req, res) => {
    try {
      const allVendors = await storage.getVendors();
      const restaurants = allVendors.filter(
        (v: any) => v.vendorType === "dine",
      );
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/verified", async (req, res) => {
    try {
      const allVendors = await storage.getVendors();
      const restaurants = allVendors.filter(
        (v: any) => v.vendorType === "dine" && v.isVerified,
      );
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch verified restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== "dine") {
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
        vendorType: "dine",
        capabilities: { products: false, services: false, menu: true },
      });
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      res
        .status(400)
        .json({
          error: "Invalid restaurant data",
          details: error instanceof Error ? error.message : String(error),
        });
    }
  });

  app.patch("/api/restaurants/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== "dine") {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Verify ownership
      if (vendor.ownerId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to update this restaurant" });
      }

      const validatedData = insertVendorSchema.partial().parse(req.body);
      await storage.updateVendor(req.params.id, validatedData);
      res.json({ success: true });
    } catch (error) {
      res
        .status(400)
        .json({
          error: "Invalid restaurant update data",
          details: error instanceof Error ? error.message : String(error),
        });
    }
  });

  app.delete("/api/restaurants/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== "dine") {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Verify ownership
      if (vendor.ownerId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to delete this restaurant" });
      }

      await storage.deleteVendor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete restaurant" });
    }
  });

  app.patch(
    "/api/restaurants/:id/verify",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Only admins can verify restaurants
        if (user?.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Unauthorized - admin access required" });
        }

        const schema = z.object({ isVerified: z.boolean() });
        const { isVerified } = schema.parse(req.body);
        await storage.updateVendorVerification(req.params.id, isVerified);
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ error: "Invalid verification data" });
      }
    },
  );

  // ===== SERVICE PROVIDER ROUTES (Legacy - using unified vendor system) =====

  // Legacy endpoint - redirects to unified /api/auth/my-vendor
  app.get(
    "/api/auth/my-service-provider",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const vendor = await storage.getVendorByOwnerId(userId);
        res.json(vendor || null);
      } catch (error) {
        console.error("Error fetching user's service provider:", error);
        res.status(500).json({ message: "Failed to fetch vendor profile" });
      }
    },
  );

  // Service Vendor routes
  app.get("/api/service-vendors", async (req, res) => {
    try {
      // Return all service vendors (completed profiles only)
      const serviceVendors = await storage.getServiceVendors();
      res.json(serviceVendors);
    } catch (error) {
      console.error(
        "[GET /api/service-vendors] Error fetching service vendors:",
        error,
      );
      res.status(500).json({ error: "Failed to fetch service vendors" });
    }
  });

  // Service Provider routes
  app.get("/api/services", async (req, res) => {
    try {
      // Return all service vendors (completed profiles only)
      const serviceVendors = await storage.getServiceVendors();
      res.json(serviceVendors);
    } catch (error) {
      console.error("[GET /api/services] Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.vendorType !== "service") {
        return res.status(404).json({ error: "Service provider not found" });
      }

      // Get services for this vendor
      const services = await storage.getServicesByVendor(req.params.id);

      res.json({ ...vendor, services });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service provider" });
    }
  });

  app.post("/api/services", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Check if user already has a service provider profile
      const existing = await storage.getVendorByOwnerId(userId);
      if (existing) {
        return res
          .status(400)
          .json({ error: "User already has a vendor profile" });
      }

      const validated = insertVendorSchema.parse({
        ...req.body,
        ownerId: userId,
        vendorType: "service",
        capabilities: { products: false, services: true, menu: false },
      });

      const vendor = await storage.createVendor(validated);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create service provider" });
    }
  });

  app.patch("/api/services/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getVendor(req.params.id);

      if (!vendor || vendor.vendorType !== "service") {
        return res.status(404).json({ error: "Service provider not found" });
      }

      if (vendor.ownerId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to update this service provider" });
      }

      const validated = insertVendorSchema.partial().parse(req.body);
      await storage.updateVendor(req.params.id, validated);

      const updated = await storage.getVendor(req.params.id);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update service provider" });
    }
  });

  // Message routes
  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });

      console.log("[MESSAGE] Creating message:", {
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        content: messageData.content?.substring(0, 50),
      });

      const message = await storage.createMessage(messageData);
      console.log("[MESSAGE] Message created successfully:", message.id);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/conversations", requireAuth, async (req: any, res) => {
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

  app.get(
    "/api/messages/:otherUserId",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { otherUserId } = req.params;

        console.log("[MESSAGES] Fetching messages between:", {
          userId,
          otherUserId,
        });
        const messages = await storage.getMessages(userId, otherUserId);
        console.log("[MESSAGES] Found messages:", messages.length);

        // Mark messages from other user as read
        await storage.markMessagesAsRead(userId, otherUserId);

        res.json(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    },
  );

  app.get(
    "/api/messages/unread/count",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const count = await storage.getUnreadMessageCount(userId);
        res.json({ count });
      } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ error: "Failed to fetch unread count" });
      }
    },
  );

  // ============ B2C CONVERSATION ROUTES ============

  // POST /api/b2c/conversations/start - Start or get existing conversation with a business
  app.post(
    "/api/b2c/conversations/start",
    requireAuth,
    async (req: any, res) => {
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
        const conversation = await storage.getOrCreateConversation(
          consumerId,
          vendorId,
          dealId,
        );

        console.log("[B2C] Conversation started/retrieved:", {
          conversationId: conversation.id,
          consumerId,
          vendorId,
          dealId,
        });

        res.json({
          conversationId: conversation.id,
          conversation,
          vendorName: vendor.businessName,
        });
      } catch (error) {
        console.error("Error starting conversation:", error);
        res.status(500).json({ error: "Failed to start conversation" });
      }
    },
  );

  // GET /api/b2c/conversations - Get all B2C conversations for current user
  app.get("/api/b2c/conversations", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check if user is a vendor (check both isVendor flag and legacy role)
      const isVendorRole =
        user.isVendor === true ||
        user.role === "vendor" ||
        user.role === "restaurant" ||
        user.role === "service_provider";

      if (isVendorRole) {
        // Get vendor's conversations
        const vendor = await storage.getVendorByOwnerId(userId);
        if (!vendor) {
          return res.json([]);
        }
        const conversations = await storage.getB2CConversationsForVendor(
          vendor.id,
        );
        res.json({ role: "vendor", conversations });
      } else {
        // Get consumer's conversations
        const conversations =
          await storage.getB2CConversationsForConsumer(userId);
        res.json({ role: "consumer", conversations });
      }
    } catch (error) {
      console.error("Error fetching B2C conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // GET /api/b2c/conversations/:conversationId - Get messages in a conversation
  app.get(
    "/api/b2c/conversations/:conversationId",
    requireAuth,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ error: "Access denied to this conversation" });
        }

        // Get messages
        const messages = await storage.getConversationMessages(conversationId);

        // Mark messages as read for the recipient
        await storage.markConversationMessagesAsRead(conversationId, userId);

        // Mark related notifications as read for the current user
        await storage.markNotificationsByReferenceAsRead(
          userId,
          conversationId,
          "conversation",
        );

        // Get vendor and consumer info
        const consumer = await storage.getUser(conversation.consumerId);
        const consumerName =
          consumer?.firstName && consumer?.lastName
            ? `${consumer.firstName} ${consumer.lastName}`
            : consumer?.username || "Unknown Customer";

        // Cancel any pending email notifications since user is viewing the conversation
        await storage.cancelEmailJobsForConversation(conversationId, userId);

        res.json({
          conversation,
          messages,
          vendorName: vendor?.businessName || "Unknown Business",
          vendorLogoUrl: vendor?.logoUrl || null,
          vendorOwnerId: vendor?.ownerId || null,
          consumerName,
          consumerProfileImageUrl: consumer?.profileImageUrl || null,
          consumerId: conversation.consumerId,
          userRole: isConsumer ? "consumer" : "vendor",
        });
      } catch (error) {
        console.error("Error fetching conversation messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    },
  );

  // POST /api/b2c/conversations/:conversationId/messages - Send a message in a conversation
  app.post(
    "/api/b2c/conversations/:conversationId/messages",
    requireAuth,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ error: "Access denied to this conversation" });
        }

        // Determine sender role
        const senderRole = isConsumer ? "consumer" : "vendor";

        // Create message
        const message = await storage.createConversationMessage({
          conversationId,
          senderId: userId,
          senderRole,
          content: content.trim(),
          isRead: false,
        });

        // Create notification for the recipient
        const recipientId =
          senderRole === "consumer" ? vendor?.ownerId : conversation.consumerId;
        if (recipientId) {
          const sender = await storage.getUser(userId);
          const senderName =
            senderRole === "consumer"
              ? sender?.firstName
                ? `${sender.firstName}${sender.lastName ? ` ${sender.lastName}` : ""}`.trim()
                : "A customer"
              : vendor?.businessName || "A business";

          await storage.createNotification({
            userId: recipientId,
            actorId: userId,
            type: senderRole === "consumer" ? "new_message" : "business_reply",
            title: `${senderName} sent you a message`,
            message:
              content.trim().substring(0, 100) +
              (content.length > 100 ? "..." : ""),
            referenceId: conversationId,
            referenceType: "conversation",
            isRead: false,
          });

          // Schedule email notification if recipient has email notifications enabled
          const recipient = await storage.getUser(recipientId);
          if (
            recipient?.email &&
            recipient.emailMessageNotifications !== false
          ) {
            await storage.scheduleEmailNotification({
              recipientId,
              recipientEmail: recipient.email,
              jobType: "new_message",
              referenceId: conversationId,
              actorId: userId,
              subject: `New message from ${senderName} on Rise Local`,
              bodyPreview: content.trim().substring(0, 200),
              status: "pending",
              scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes delay
            });
          }
        }

        console.log("[B2C] Message sent:", {
          messageId: message.id,
          conversationId,
          senderRole,
        });

        res.json(message);
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
      }
    },
  );

  // GET /api/b2c/unread-count - Get unread B2C message count for current user
  app.get("/api/b2c/unread-count", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check if user is a vendor (check both isVendor flag and legacy role)
      const isVendorRole =
        user.isVendor === true ||
        user.role === "vendor" ||
        user.role === "restaurant" ||
        user.role === "service_provider";

      if (isVendorRole) {
        const vendor = await storage.getVendorByOwnerId(userId);
        const count = await storage.getUnreadB2CMessageCount(
          userId,
          "vendor",
          vendor?.id,
        );
        res.json({ count, role: "vendor" });
      } else {
        const count = await storage.getUnreadB2CMessageCount(
          userId,
          "consumer",
        );
        res.json({ count, role: "consumer" });
      }
    } catch (error) {
      console.error("Error fetching B2C unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // ============ NOTIFICATIONS ROUTES ============

  // GET /api/notifications - Get all notifications for current user
  app.get("/api/notifications", requireAuth, async (req: any, res) => {
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
  app.get(
    "/api/notifications/unread-count",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const count = await storage.getUnreadNotificationCount(userId);
        res.json({ count });
      } catch (error) {
        console.error("Error fetching unread notification count:", error);
        res.status(500).json({ error: "Failed to fetch unread count" });
      }
    },
  );

  // PATCH /api/notifications/:id/read - Mark a notification as read
  app.patch(
    "/api/notifications/:id/read",
    requireAuth,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.markNotificationAsRead(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Failed to mark notification as read" });
      }
    },
  );

  // POST /api/notifications/mark-all-read - Mark all notifications as read
  app.post(
    "/api/notifications/mark-all-read",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.markAllNotificationsAsRead(userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ error: "Failed to mark notifications as read" });
      }
    },
  );

  // ============ DEALS ROUTES ============

  // GET /api/deals - List all deals with optional filters
  // Consumer pages see only published deals by default
  // Vendors can pass includeAll=true to see all their deals
  app.get("/api/deals", async (req, res) => {
    try {
      const {
        category,
        city,
        tier,
        isActive,
        vendorId,
        lat,
        lng,
        radiusMiles,
        status,
        includeAll,
      } = req.query;

      console.log("[DEALS API] GET /api/deals called with params:", {
        category,
        city,
        tier,
        isActive,
        vendorId,
        lat,
        lng,
        radiusMiles,
        status,
        includeAll,
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
          isActive: isActive !== undefined ? isActive === "true" : undefined,
          vendorId: vendorId as string | undefined,
          status: status as string | undefined,
          includeAll: includeAll === "true",
          // Rise Local is a regional SWFL app - include vendors without exact GPS coordinates
          // They appear at the end of results with "SWFL" as location
          includeVendorsWithoutCoordinates: true,
        };

        console.log(
          "[DEALS API] Using location-based filtering with filters:",
          filters,
        );
        const deals = await storage.listDealsWithLocation(filters);
        console.log(
          "[DEALS API] Location-based query returned",
          deals.length,
          "deals",
        );
        if (deals.length > 0) {
          console.log(
            "[DEALS API] Sample deal statuses:",
            deals
              .slice(0, 5)
              .map((d) => ({
                id: d.id,
                title: d.title,
                status: d.status,
                isActive: d.isActive,
              })),
          );
        }
        res.json(deals);
        return;
      }

      // Standard filtering without location
      const filters: any = {};

      if (category) filters.category = category as string;
      if (city) filters.city = city as string;
      if (tier) filters.tier = tier as string;
      if (isActive !== undefined) filters.isActive = isActive === "true";
      if (vendorId) filters.vendorId = vendorId as string;
      if (status) filters.status = status as string;
      if (includeAll === "true") filters.includeAll = true;

      console.log(
        "[DEALS API] Using standard filtering with filters:",
        filters,
      );
      const deals = await storage.listDeals(filters);
      console.log("[DEALS API] Standard query returned", deals.length, "deals");
      if (deals.length > 0) {
        console.log(
          "[DEALS API] Sample deal statuses:",
          deals
            .slice(0, 5)
            .map((d) => ({
              id: d.id,
              title: d.title,
              status: d.status,
              isActive: d.isActive,
            })),
        );
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
        return res
          .status(404)
          .json({ code: "NOT_FOUND", message: "Deal not found" });
      }

      // Check if deal was soft deleted
      if (deal.deletedAt) {
        console.log("[DEALS] Deal removed:", dealId);
        return res
          .status(410)
          .json({
            code: "REMOVED",
            message: "This deal is no longer available",
          });
      }

      // Check if deal is inactive
      if (!deal.isActive) {
        console.log("[DEALS] Deal inactive:", dealId);
        return res
          .status(410)
          .json({ code: "REMOVED", message: "This deal is no longer active" });
      }

      // Check if deal has expired
      const now = new Date();
      if (deal.endsAt && new Date(deal.endsAt) < now) {
        console.log("[DEALS] Deal expired:", dealId);
        return res.status(410).json({
          code: "EXPIRED",
          message: "This deal has expired",
          expiredAt: deal.endsAt,
        });
      }

      // Check if deal hasn't started yet
      if (deal.startsAt && new Date(deal.startsAt) > now) {
        console.log("[DEALS] Deal not started yet:", dealId);
        return res.status(400).json({
          code: "NOT_STARTED",
          message: "This deal is not available yet",
          startsAt: deal.startsAt,
        });
      }

      // Note: Pass-locked deals are viewable by everyone, but redemption is gated on the frontend.
      // The deal detail page shows full info but locks the "Redeem" button and hides discount codes for non-members.

      // Get vendor information
      const vendor = await storage.getVendor(deal.vendorId);

      // Compute additional fields
      const response = {
        ...deal,
        vendor: vendor
          ? {
              id: vendor.id,
              businessName: vendor.businessName,
              profileImageUrl: vendor.logoUrl,
              city: vendor.city,
              vendorType: vendor.vendorType,
            }
          : null,
        isExpired: deal.endsAt ? new Date(deal.endsAt) < now : false,
        isLocked:
          deal.isPassLocked && deal.tier !== "standard" && deal.tier !== "free",
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
  app.post("/api/deals", requireAuth, async (req: any, res) => {
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
        return res
          .status(400)
          .json({ error: "Invalid deal data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // PUT /api/deals/:id - Update a deal (vendor only, own deals)
  app.put("/api/deals/:id", requireAuth, async (req: any, res) => {
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
        return res
          .status(403)
          .json({ error: "You can only update your own deals" });
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
  app.post("/api/deals/:id/redeem", requireAuth, async (req: any, res) => {
    try {
      const dealId = req.params.id;
      const userId = req.user.claims.sub;
      const source = req.body.source || "web";

      // Get the deal to check pass requirements
      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res
          .status(404)
          .json({ success: false, error: "Deal not found" });
      }

      // Check if deal is pass-locked and user has pass
      if (deal.isPassLocked) {
        const user = await storage.getUser(userId);
        if (!user?.isPassMember) {
          return res.status(403).json({
            success: false,
            error: "This deal requires a Rise Local Pass membership",
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
          vendorName: vendor?.businessName || "Business",
          redeemedAt: result.redemption?.redeemedAt,
        },
      });
    } catch (error) {
      console.error("Error redeeming deal:", error);
      res.status(500).json({ success: false, error: "Failed to redeem deal" });
    }
  });

  // GET /api/me/redemptions - Get current user's redemption history (button-based)
  app.get("/api/me/redemptions", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const redemptions = await storage.getConsumerRedemptionHistory(
        userId,
        limit,
      );

      // Enrich with deal and vendor info
      const enrichedRedemptions = await Promise.all(
        redemptions.map(async (r) => {
          const deal = await storage.getDealById(r.dealId);
          const vendor = await storage.getVendor(r.vendorId);
          return {
            id: r.id,
            dealId: r.dealId,
            dealTitle: deal?.title || "Unknown Deal",
            dealImage: deal?.imageUrl || deal?.heroImageUrl,
            vendorId: r.vendorId,
            vendorName: vendor?.businessName || "Business",
            vendorLogo: vendor?.logoUrl,
            redeemedAt: r.redeemedAt,
            status: r.status,
          };
        }),
      );

      res.json(enrichedRedemptions);
    } catch (error) {
      console.error("Error fetching user redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // DELETE /api/me/redemptions/:id - Undo (void) a consumer's own redemption
  app.delete(
    "/api/me/redemptions/:id",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const redemptionId = req.params.id;

        // Check if redemption exists and belongs to this user
        const redemption = await storage.getRedemption(redemptionId);
        if (!redemption) {
          return res.status(404).json({ error: "Redemption not found" });
        }

        if (redemption.userId !== userId) {
          return res
            .status(403)
            .json({ error: "You can only undo your own redemptions" });
        }

        // Only allow undo for "redeemed" status (not voided, verified, expired, etc.)
        if (redemption.status === "voided") {
          return res
            .status(400)
            .json({ error: "This redemption has already been undone" });
        }

        if (redemption.status !== "redeemed") {
          return res
            .status(400)
            .json({
              error: `Cannot undo a redemption with status: ${redemption.status}`,
            });
        }

        // Void the redemption
        const voidedRedemption = await storage.voidRedemption(
          redemptionId,
          "Consumer undo",
        );

        console.log(
          "[REDEMPTIONS] Consumer undid redemption:",
          redemptionId,
          "user:",
          userId,
        );

        res.json({
          success: true,
          message: "Redemption undone successfully",
          redemption: voidedRedemption,
        });
      } catch (error) {
        console.error("Error undoing redemption:", error);
        res.status(500).json({ error: "Failed to undo redemption" });
      }
    },
  );

  // GET /api/deals/:id/can-redeem - Check if user can redeem a deal
  app.get(
    "/api/deals/:id/can-redeem",
    requireAuth,
    async (req: any, res) => {
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
                reason: "Requires Rise Local Pass",
              });
            }
          }
        }

        res.json(result);
      } catch (error) {
        console.error("Error checking redemption eligibility:", error);
        res
          .status(500)
          .json({ canRedeem: false, reason: "Error checking eligibility" });
      }
    },
  );

  // GET /api/business/redemptions - Get business's redemption history
  app.get(
    "/api/business/redemptions",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

        // Verify user is a vendor
        const vendor = await storage.getVendorByOwnerId(userId);
        if (!vendor) {
          return res
            .status(403)
            .json({
              error: "Only business owners can view redemption history",
            });
        }

        const redemptions = await storage.getBusinessRedemptionHistory(
          vendor.id,
          limit,
        );

        // Enrich with deal and customer info
        const enrichedRedemptions = await Promise.all(
          redemptions.map(async (r) => {
            const deal = await storage.getDealById(r.dealId);
            const customer = r.userId ? await storage.getUser(r.userId) : null;
            return {
              id: r.id,
              dealId: r.dealId,
              dealTitle: deal?.title || "Unknown Deal",
              customerId: r.userId,
              customerName: customer
                ? customer.firstName && customer.lastName
                  ? `${customer.firstName} ${customer.lastName}`.trim()
                  : customer.username || "Customer"
                : "Anonymous",
              customerEmail: customer?.email,
              redeemedAt: r.redeemedAt,
              status: r.status,
              source: r.source,
            };
          }),
        );

        res.json(enrichedRedemptions);
      } catch (error) {
        console.error("Error fetching business redemptions:", error);
        res.status(500).json({ error: "Failed to fetch redemptions" });
      }
    },
  );

  // GET /api/vendor/redemptions - Get vendor's redemption history
  app.get("/api/vendor/redemptions", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Verify user is a vendor
      const vendor = await storage.getVendorByOwnerId(userId);
      if (!vendor) {
        return res
          .status(403)
          .json({ error: "Only vendors can access this endpoint" });
      }

      const redemptions = await storage.getVendorRedemptions(vendor.id);

      // Enrich with deal and customer info
      const enrichedRedemptions = await Promise.all(
        redemptions.map(async (r) => {
          const deal = await storage.getDealById(r.dealId);
          const customer = r.userId ? await storage.getUser(r.userId) : null;
          return {
            ...r,
            deal: deal ? { id: deal.id, title: deal.title } : null,
            customer: customer
              ? {
                  id: customer.id,
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  name:
                    customer.firstName && customer.lastName
                      ? `${customer.firstName} ${customer.lastName}`.trim()
                      : customer.username || "Customer",
                }
              : null,
          };
        }),
      );

      res.json(enrichedRedemptions);
    } catch (error) {
      console.error("Error fetching vendor redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // GET /api/deals/:id/redemptions - Get redemption history for a deal (vendor only)
  app.get(
    "/api/deals/:id/redemptions",
    requireAuth,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({
              error: "You can only view redemptions for your own deals",
            });
        }

        const redemptions = await storage.getDealRedemptions(dealId);
        res.json(redemptions);
      } catch (error) {
        console.error("Error fetching redemptions:", error);
        res.status(500).json({ error: "Failed to fetch redemptions" });
      }
    },
  );

  // ===== VENDOR DEAL MANAGEMENT ENDPOINTS =====

  // GET /api/vendor/deals - List vendor's own deals with optional status filter
  app.get("/api/vendor/deals", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const statusFilter = req.query.status as string | undefined;

      // Verify user is a vendor
      const vendor = await storage.getVendorByOwnerId(userId);
      if (!vendor) {
        return res
          .status(403)
          .json({ error: "Only vendors can access this endpoint" });
      }

      // Get vendor's deals
      const allDeals = await storage.getDealsByVendorId(vendor.id);

      // Apply status filter if provided
      let filteredDeals = allDeals;
      if (statusFilter) {
        filteredDeals = allDeals.filter((d) => d.status === statusFilter);
      }

      // Add computed fields for each deal
      const now = new Date();
      const dealsWithMeta = filteredDeals.map((deal) => ({
        ...deal,
        isExpired: deal.endsAt ? new Date(deal.endsAt) < now : false,
        computedStatus:
          deal.endsAt && new Date(deal.endsAt) < now ? "expired" : deal.status,
      }));

      console.log(
        "[VENDOR DEALS] Listed",
        dealsWithMeta.length,
        "deals for vendor:",
        vendor.id,
      );
      res.json(dealsWithMeta);
    } catch (error) {
      console.error("Error fetching vendor deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // GET /api/vendor/deals/:id - Get a single deal for the vendor
  app.get("/api/vendor/deals/:id", requireAuth, async (req: any, res) => {
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
        return res
          .status(403)
          .json({ error: "You can only view your own deals" });
      }

      const now = new Date();
      res.json({
        ...deal,
        isExpired: deal.endsAt ? new Date(deal.endsAt) < now : false,
        computedStatus:
          deal.endsAt && new Date(deal.endsAt) < now ? "expired" : deal.status,
      });
    } catch (error) {
      console.error("Error fetching vendor deal:", error);
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  // POST /api/vendor/deals - Create and auto-publish a new deal
  app.post("/api/vendor/deals", requireAuth, async (req: any, res) => {
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
        status: "published", // Auto-publish on creation - vendors can pause later
        startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
        endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
      };

      // Validate request body
      const dealData = insertDealSchema.parse(bodyWithDates);

      const deal = await storage.createDeal(dealData);
      console.log(
        "[VENDOR DEALS] Deal created:",
        deal.id,
        "by vendor:",
        vendor.id,
      );
      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid deal data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // PATCH /api/vendor/deals/:id - Update a deal
  app.patch("/api/vendor/deals/:id", requireAuth, async (req: any, res) => {
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
        return res
          .status(403)
          .json({ error: "You can only update your own deals" });
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

      console.log(
        "[VENDOR DEALS] Deal updated:",
        dealId,
        "by vendor:",
        vendor.id,
      );
      res.json(updatedDeal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  // POST /api/vendor/deals/:id/publish - Publish a deal
  app.post(
    "/api/vendor/deals/:id/publish",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const dealId = req.params.id;

        console.log(
          "[PUBLISH] Attempting to publish deal:",
          dealId,
          "by user:",
          userId,
        );

        const existingDeal = await storage.getDealById(dealId);
        if (!existingDeal) {
          console.log("[PUBLISH] Deal not found:", dealId);
          return res.status(404).json({ error: "Deal not found" });
        }

        console.log("[PUBLISH] Found deal:", {
          id: existingDeal.id,
          title: existingDeal.title,
          currentStatus: existingDeal.status,
          vendorId: existingDeal.vendorId,
        });

        // Get the vendor that owns this deal and verify the user is its owner
        const vendor = await storage.getVendor(existingDeal.vendorId);
        if (!vendor || vendor.ownerId !== userId) {
          console.log(
            "[PUBLISH] Authorization failed. Vendor owner:",
            vendor?.ownerId,
            "User:",
            userId,
          );
          return res
            .status(403)
            .json({ error: "You can only publish your own deals" });
        }

        console.log(
          "[PUBLISH] Authorization passed. Vendor:",
          vendor.businessName,
          "(",
          vendor.id,
          ")",
        );

        // Check if deal is already expired
        if (existingDeal.endsAt && new Date(existingDeal.endsAt) < new Date()) {
          console.log(
            "[PUBLISH] Deal is expired, cannot publish. endsAt:",
            existingDeal.endsAt,
          );
          return res
            .status(400)
            .json({ error: "Cannot publish an expired deal" });
        }

        console.log("[PUBLISH] Updating deal status to published...");
        const updatedDeal = await storage.updateDeal(dealId, {
          status: "published",
          isActive: true,
        });

        console.log(
          "[PUBLISH] SUCCESS! Deal published:",
          dealId,
          "New status:",
          updatedDeal?.status,
          "isActive:",
          updatedDeal?.isActive,
        );
        res.json(updatedDeal);
      } catch (error) {
        console.error("[PUBLISH] Error publishing deal:", error);
        res.status(500).json({ error: "Failed to publish deal" });
      }
    },
  );

  // POST /api/vendor/deals/:id/pause - Pause a deal
  app.post(
    "/api/vendor/deals/:id/pause",
    requireAuth,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ error: "You can only pause your own deals" });
        }

        const updatedDeal = await storage.updateDeal(dealId, {
          status: "paused",
          isActive: false,
        });

        console.log(
          "[VENDOR DEALS] Deal paused:",
          dealId,
          "by vendor:",
          vendor.id,
        );
        res.json(updatedDeal);
      } catch (error) {
        console.error("Error pausing deal:", error);
        res.status(500).json({ error: "Failed to pause deal" });
      }
    },
  );

  // DELETE /api/vendor/deals/:id - Soft delete a deal
  app.delete(
    "/api/vendor/deals/:id",
    requireAuth,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ error: "You can only delete your own deals" });
        }

        // Soft delete
        await storage.updateDeal(dealId, {
          deletedAt: new Date(),
          isActive: false,
        });

        console.log(
          "[VENDOR DEALS] Deal deleted:",
          dealId,
          "by vendor:",
          vendor.id,
        );
        res.json({ success: true, message: "Deal deleted" });
      } catch (error) {
        console.error("Error deleting deal:", error);
        res.status(500).json({ error: "Failed to delete deal" });
      }
    },
  );

  // POST /api/vendor/deals/:dealId/void/:redemptionId - Void a redemption (for staff mistakes)
  app.post(
    "/api/vendor/deals/:dealId/void/:redemptionId",
    requireAuth,
    async (req: any, res) => {
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
          return res
            .status(403)
            .json({ error: "You can only void claims for your own deals" });
        }

        // Void the redemption
        const voidedRedemption = await storage.voidRedemption(
          redemptionId,
          reason,
        );
        if (!voidedRedemption) {
          return res.status(404).json({ error: "Redemption not found" });
        }

        console.log(
          "[VENDOR DEALS] Redemption voided:",
          redemptionId,
          "for deal:",
          dealId,
        );
        res.json(voidedRedemption);
      } catch (error) {
        console.error("Error voiding redemption:", error);
        res.status(500).json({ error: "Failed to void redemption" });
      }
    },
  );

  // ===== DEAL CLAIM ENDPOINTS (Time-Locked Code System) =====

  // POST /api/deals/:id/claim - Claim a deal and generate time-locked code
  app.post("/api/deals/:id/claim", requireAuth, async (req: any, res) => {
    try {
      const dealId = req.params.id;
      const userId = req.user.claims.sub;

      // Check if deal exists
      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Check if deal is published
      if (deal.status !== "published") {
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
      const existingRedemption = await storage.getActiveRedemptionForUserDeal(
        userId,
        dealId,
      );
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
      const redeemedCount = await storage.getUserVerifiedCountForDeal(
        userId,
        dealId,
      );
      const maxPerUser = deal.maxRedemptionsPerUser || 1;

      if (redeemedCount >= maxPerUser) {
        return res.status(403).json({
          error: `You have already redeemed this deal ${maxPerUser} time(s)`,
          limitReached: true,
        });
      }

      // Check redemption frequency limit (weekly/monthly/unlimited)
      // Default to unlimited if no frequency is set
      const redemptionFrequency = deal.redemptionFrequency || "unlimited";

      if (redemptionFrequency !== "unlimited") {
        const lastRedemption =
          await storage.getLastVerifiedRedemptionForUserDeal(userId, dealId);
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
            const daysRemaining = Math.ceil(
              (cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return res.status(403).json({
              error: `You've already redeemed this deal this ${frequencyLabel}. Try again in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}.`,
              cooldownRemaining: daysRemaining,
              cooldownEndsAt: cooldownEnd.toISOString(),
              frequencyLimit: redemptionFrequency,
            });
          }
        }
      }

      // Check global redemption limit
      if (deal.maxRedemptionsTotal && deal.maxRedemptionsTotal > 0) {
        const totalRedeemed =
          await storage.getTotalVerifiedCountForDeal(dealId);

        if (totalRedeemed >= deal.maxRedemptionsTotal) {
          return res.status(403).json({
            error: "This deal has reached its maximum number of redemptions",
            soldOut: true,
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
        status: "claimed",
        claimedAt: result.redemption?.claimedAt,
        claimExpiresAt: result.expiresAt,
      });
    } catch (error) {
      console.error("Error claiming deal:", error);
      res.status(500).json({ error: "Failed to claim deal" });
    }
  });

  // GET /api/redemptions/my - Get current user's redemptions with deal info
  app.get("/api/redemptions/my", requireAuth, async (req: any, res) => {
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
            deal: deal
              ? {
                  id: deal.id,
                  title: deal.title,
                  description: deal.description,
                  tier: deal.tier,
                  vendorId: deal.vendorId,
                  vendorName,
                  endsAt: deal.endsAt,
                }
              : null,
          };
        }),
      );

      res.json(enrichedRedemptions);
    } catch (error) {
      console.error("Error fetching user redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  // GET /api/redemptions/:id - Get a specific redemption with deal info
  app.get("/api/redemptions/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const redemptionId = req.params.id;

      const redemption = await storage.getRedemption(redemptionId);
      if (!redemption) {
        return res.status(404).json({ error: "Redemption not found" });
      }

      // Only the owner or vendor can view this redemption
      if (redemption.userId !== userId && redemption.vendorUserId !== userId) {
        return res
          .status(403)
          .json({ error: "Not authorized to view this redemption" });
      }

      // Get deal info
      const deal = await storage.getDealById(redemption.dealId);
      let vendorName = null;
      if (deal?.vendorId) {
        const vendor = await storage.getVendor(deal.vendorId);
        vendorName = vendor?.businessName || null;
      }

      // Check if expired
      const isExpired = redemption.claimExpiresAt
        ? new Date(redemption.claimExpiresAt) < new Date() &&
          redemption.status === "claimed"
        : false;

      res.json({
        ...redemption,
        isExpired,
        deal: deal
          ? {
              id: deal.id,
              title: deal.title,
              description: deal.description,
              finePrint: deal.finePrint,
              tier: deal.tier,
              vendorId: deal.vendorId,
              vendorName,
            }
          : null,
      });
    } catch (error) {
      console.error("Error fetching redemption:", error);
      res.status(500).json({ error: "Failed to fetch redemption" });
    }
  });

  // ===== PREFERRED PLACEMENTS (ADVERTISING) =====

  // GET /api/placements/discover-spotlight - Get the current active spotlight placement
  app.get("/api/placements/discover-spotlight", async (req, res) => {
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
        deals: spotlight.deals.map((deal) => ({
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
  app.post("/api/placements/:placementId/impression", async (req: any, res) => {
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
  app.post("/api/placements/:placementId/click", async (req: any, res) => {
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
  app.post("/api/placements", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Check if user is admin - support both isAdmin flag and legacy role field
      const isAdmin = user?.isAdmin === true || user?.role === "admin";
      if (!user || !isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const parsed = insertPreferredPlacementSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const placement = await storage.createPreferredPlacement(parsed.data);

      // If this placement is being activated, pause other active spotlights
      if (
        parsed.data.status === "active" &&
        parsed.data.placement === "discover_spotlight"
      ) {
        await storage.pauseOtherSpotlights(placement.id);
      }

      res.json(placement);
    } catch (error) {
      console.error("Error creating placement:", error);
      res.status(500).json({ error: "Failed to create placement" });
    }
  });

  // PATCH /api/placements/:id/status - Update placement status (admin only)
  app.patch(
    "/api/placements/:id/status",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // Check if user is admin - support both isAdmin flag and legacy role field
        const isAdmin = user?.isAdmin === true || user?.role === "admin";
        if (!user || !isAdmin) {
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
    },
  );

  // ===== FAVORITES =====

  // GET /api/favorites/ids - Get just the deal IDs user has favorited (for fast checking on list pages)
  app.get("/api/favorites/ids", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      const ids = favorites.map((f) => f.dealId);
      res.json(ids);
    } catch (error) {
      console.error("Error fetching favorite ids:", error);
      res.status(500).json({ error: "Failed to fetch favorite ids" });
    }
  });

  // GET /api/favorites - Get user's favorite deals
  app.get("/api/favorites", requireAuth, async (req: any, res) => {
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
        }),
      );

      res.json(enrichedDeals);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  // GET /api/favorites/:dealId - Check if deal is favorited
  app.get("/api/favorites/:dealId", requireAuth, async (req: any, res) => {
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
  app.post("/api/favorites/:dealId", requireAuth, async (req: any, res) => {
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
  app.delete(
    "/api/favorites/:dealId",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const dealId = req.params.dealId;

        await storage.removeFavorite(userId, dealId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error removing favorite:", error);
        res.status(500).json({ error: "Failed to remove favorite" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
