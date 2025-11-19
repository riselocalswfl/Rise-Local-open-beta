/**
 * Data Migration: Consolidate Restaurants and Service Providers into Unified Vendors Table
 * 
 * This migration:
 * 1. Copies all restaurants into the vendors table with vendorType="dine"
 * 2. Copies all serviceProviders into the vendors table with vendorType="service"
 * 3. Sets appropriate capabilities for each vendor
 * 4. Updates foreign keys in related tables (menuItems, serviceOfferings, serviceBookings, events)
 * 5. Updates user roles from restaurant/service_provider to vendor
 */

import { db } from "../storage";
import { vendors, restaurants, serviceProviders, menuItems, serviceOfferings, serviceBookings, events, users } from "@shared/schema";
import { eq, or } from "drizzle-orm";

export async function consolidateVendors() {
  console.log("🚀 Starting vendor consolidation migration...\n");

  try {
    // Step 1: Migrate restaurants to vendors table
    console.log("📊 Step 1: Migrating restaurants to unified vendors table...");
    const allRestaurants = await db.select().from(restaurants);
    console.log(`Found ${allRestaurants.length} restaurants to migrate`);

    for (const restaurant of allRestaurants) {
      // Check if already migrated
      const existing = await db.select().from(vendors)
        .where(eq(vendors.legacySourceId, restaurant.id))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  Skipping restaurant ${restaurant.restaurantName} (already migrated)`);
        continue;
      }

      // Create restaurant details JSON
      const restaurantDetails = {
        dietaryOptions: restaurant.dietaryOptions || [],
        priceRange: restaurant.priceRange || undefined,
        seatingCapacity: restaurant.seatingCapacity || undefined,
        reservationsRequired: restaurant.reservationsRequired || undefined,
        reservationsUrl: restaurant.reservationsUrl || undefined,
        reservationsPhone: restaurant.reservationsPhone || undefined,
      };

      // Insert into vendors table
      const [newVendor] = await db.insert(vendors).values({
        ownerId: restaurant.ownerId,
        vendorType: "dine",
        capabilities: {
          products: false,
          services: false,
          menu: true, // Restaurants can create menu items
        },
        
        // Basic profile
        businessName: restaurant.restaurantName,
        displayName: restaurant.displayName || undefined,
        tagline: restaurant.tagline || undefined,
        contactName: restaurant.contactName,
        bio: restaurant.bio,

        // Media
        logoUrl: restaurant.logoUrl || undefined,
        heroImageUrl: restaurant.heroImageUrl || undefined,
        gallery: restaurant.gallery || [],

        // Online presence
        website: restaurant.website || undefined,
        instagram: restaurant.instagram || undefined,
        facebook: restaurant.facebook || undefined,

        // Location
        locationType: restaurant.locationType,
        address: restaurant.address || undefined,
        city: restaurant.city,
        state: restaurant.state,
        zipCode: restaurant.zipCode,
        serviceOptions: restaurant.serviceOptions,
        hours: restaurant.hours || undefined,

        // Trust signals
        badges: restaurant.badges || [],
        localSourcingPercent: restaurant.localSourcingPercent || undefined,
        certifications: restaurant.certifications || undefined,

        // Contact
        contactEmail: restaurant.contactEmail || undefined,
        phone: restaurant.contactPhone || undefined,
        policies: restaurant.policies || undefined,

        // Payment
        paymentMethod: restaurant.paymentMethod,
        paymentPreferences: restaurant.paymentMethods || [],
        stripeConnectAccountId: restaurant.stripeConnectAccountId || undefined,
        stripeOnboardingComplete: restaurant.stripeOnboardingComplete || false,

        // Status
        isFoundingMember: restaurant.isFoundingMember,
        isVerified: restaurant.isVerified,
        profileStatus: restaurant.profileStatus,
        isFeatured: restaurant.isFeatured || false,

        // Compliance
        termsAccepted: restaurant.termsAccepted,
        privacyAccepted: restaurant.privacyAccepted,
        paidUntil: restaurant.paidUntil || undefined,

        // Analytics
        followerCount: restaurant.followerCount,

        // Type-specific details
        restaurantDetails,

        // Migration tracking
        legacySourceTable: "restaurants",
        legacySourceId: restaurant.id,
      }).returning();

      // Update menu items to point to new vendor
      await db.update(menuItems)
        .set({ vendorId: newVendor.id })
        .where(eq(menuItems.restaurantId, restaurant.id));

      // Update events to point to new vendor
      await db.update(events)
        .set({ vendorId: newVendor.id, restaurantId: null })
        .where(eq(events.restaurantId, restaurant.id));

      console.log(`  ✅ Migrated restaurant: ${restaurant.restaurantName}`);
    }

    // Step 2: Migrate service providers to vendors table
    console.log("\n📊 Step 2: Migrating service providers to unified vendors table...");
    const allServiceProviders = await db.select().from(serviceProviders);
    console.log(`Found ${allServiceProviders.length} service providers to migrate`);

    for (const provider of allServiceProviders) {
      // Check if already migrated
      const existing = await db.select().from(vendors)
        .where(eq(vendors.legacySourceId, provider.id))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  Skipping service provider ${provider.businessName} (already migrated)`);
        continue;
      }

      // Create service details JSON
      const serviceDetails = {
        serviceAreas: provider.serviceAreas || [],
        licenses: provider.licenses || undefined,
        insurance: provider.insurance || undefined,
        yearsInBusiness: provider.yearsInBusiness || undefined,
        availabilityWindows: provider.availabilityWindows || undefined,
        minBookingNoticeHours: provider.minBookingNotice || undefined,
        maxBookingAdvanceDays: provider.maxBookingAdvance || undefined,
        bookingPreferences: provider.bookingPreferences || undefined,
      };

      // Insert into vendors table
      const [newVendor] = await db.insert(vendors).values({
        ownerId: provider.ownerId,
        vendorType: "service",
        capabilities: {
          products: false,
          services: true, // Service providers can create service offerings
          menu: false,
        },

        // Basic profile
        businessName: provider.businessName,
        displayName: provider.displayName || undefined,
        tagline: provider.tagline || undefined,
        contactName: provider.contactName,
        bio: provider.bio,

        // Media
        logoUrl: provider.logoUrl || undefined,
        heroImageUrl: provider.heroImageUrl || undefined,
        gallery: provider.gallery || [],

        // Online presence
        website: provider.website || undefined,
        instagram: provider.instagram || undefined,
        facebook: provider.facebook || undefined,

        // Location
        locationType: "Home-based", // Default for service providers (field didn't exist in serviceProviders table)
        address: provider.address || undefined,
        city: provider.city,
        state: provider.state,
        zipCode: provider.zipCode,
        serviceOptions: [], // Default empty for service providers (field didn't exist)
        serviceRadius: undefined, // Not used for service providers

        // Trust signals
        values: provider.values || [],
        badges: provider.badges || [],
        certifications: provider.certifications || undefined,

        // Contact
        contactEmail: provider.contactEmail || undefined,
        phone: provider.contactPhone || undefined,

        // Payment
        paymentMethod: "Direct to Vendor", // Default for service providers (field didn't exist in serviceProviders table)
        paymentPreferences: provider.paymentMethods || [],
        stripeConnectAccountId: provider.stripeConnectAccountId || undefined,
        stripeOnboardingComplete: provider.stripeOnboardingComplete || false,

        // Status
        isFoundingMember: provider.isFoundingMember,
        isVerified: provider.isVerified,
        profileStatus: provider.profileStatus,
        isFeatured: provider.isFeatured || false,

        // Compliance
        termsAccepted: provider.termsAccepted,
        privacyAccepted: provider.privacyAccepted,
        paidUntil: provider.paidUntil || undefined,

        // Analytics
        followerCount: provider.followerCount,
        completedBookings: provider.completedBookings,
        averageRating: provider.averageRating || undefined,

        // Type-specific details
        serviceDetails,

        // Migration tracking
        legacySourceTable: "serviceProviders",
        legacySourceId: provider.id,
      }).returning();

      // Update service offerings to point to new vendor
      await db.update(serviceOfferings)
        .set({ vendorId: newVendor.id })
        .where(eq(serviceOfferings.serviceProviderId, provider.id));

      // Update service bookings to point to new vendor
      await db.update(serviceBookings)
        .set({ vendorId: newVendor.id })
        .where(eq(serviceBookings.serviceProviderId, provider.id));

      console.log(`  ✅ Migrated service provider: ${provider.businessName}`);
    }

    // Step 3: Set capabilities for ALL vendors (backfill for any missing)
    console.log("\n📊 Step 3: Setting capabilities for ALL vendors...");
    
    // Update shop vendors (those without a legacy source or explicitly from vendors table)
    const shopVendorsUpdated = await db.update(vendors)
      .set({
        capabilities: {
          products: true, // Shop vendors can create products
          services: false,
          menu: false,
        }
      })
      .where(or(
        eq(vendors.vendorType, "shop"),
        eq(vendors.legacySourceTable, "vendors")
      ))
      .returning();

    console.log(`  ✅ Set capabilities for ${shopVendorsUpdated.length} shop vendors`);
    
    // Double-check: Ensure NO vendor has null capabilities
    const nullCapabilities = await db.select().from(vendors).where(eq(vendors.capabilities, null));
    if (nullCapabilities.length > 0) {
      console.log(`  ⚠️  Found ${nullCapabilities.length} vendors with null capabilities, fixing...`);
      for (const vendor of nullCapabilities) {
        const defaultCaps = vendor.vendorType === "dine" 
          ? { products: false, services: false, menu: true }
          : vendor.vendorType === "service"
            ? { products: false, services: true, menu: false }
            : { products: true, services: false, menu: false };
        
        await db.update(vendors)
          .set({ capabilities: defaultCaps })
          .where(eq(vendors.id, vendor.id));
      }
      console.log(`  ✅ Fixed all null capabilities`);
    }

    // Step 4: Update user roles
    console.log("\n📊 Step 4: Updating user roles from restaurant/service_provider to vendor...");
    const updatedUsers = await db.update(users)
      .set({ role: "vendor" })
      .where(or(eq(users.role, "restaurant"), eq(users.role, "service_provider")))
      .returning();

    console.log(`  ✅ Updated ${updatedUsers.length} user roles to 'vendor'`);

    console.log("\n✨ Migration completed successfully!\n");
    console.log("Summary:");
    console.log(`  - Migrated ${allRestaurants.length} restaurants`);
    console.log(`  - Migrated ${allServiceProviders.length} service providers`);
    console.log(`  - Updated ${updatedUsers.length} user roles`);
    console.log("\nNote: Legacy tables (restaurants, serviceProviders) are preserved for backup.");
    console.log("They can be safely removed after verifying the migration.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration if called directly
consolidateVendors()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
