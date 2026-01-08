/**
 * @deprecated Data Migration: Consolidate Restaurants and Service Providers into Unified Vendors Table
 * 
 * NOTE: This migration script is deprecated after schema cleanup.
 * The following tables have been removed from the schema:
 * - menuItems, serviceOfferings, serviceBookings, events
 * 
 * This script is kept for historical reference only.
 * If you need to run a similar migration, create a new script.
 */

import { db } from "../storage";
import { vendors, restaurants, serviceProviders, users } from "@shared/schema";
import { eq, or } from "drizzle-orm";

export async function consolidateVendors() {
  console.log("⚠️ This migration script is deprecated.");
  console.log("The tables it references (menuItems, serviceOfferings, serviceBookings, events) have been removed.");
  console.log("\nIf you need to migrate data, please create a new migration script.\n");
  
  // Just report current state
  const allRestaurants = await db.select().from(restaurants);
  const allServiceProviders = await db.select().from(serviceProviders);
  const allVendors = await db.select().from(vendors);
  
  console.log("Current state:");
  console.log(`  - ${allRestaurants.length} legacy restaurants`);
  console.log(`  - ${allServiceProviders.length} legacy service providers`);
  console.log(`  - ${allVendors.length} unified vendors`);
}

// Only run if called directly
if (require.main === module) {
  consolidateVendors()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
