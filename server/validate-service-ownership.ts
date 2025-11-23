import { db } from "./storage";
import { serviceOfferings } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

export async function validateAndFixServiceOwnership() {
  console.log("[Service Ownership] Running validation and backfill...");
  
  try {
    // Find all services where serviceProviderId is null
    const servicesWithMissingProvider = await db
      .select()
      .from(serviceOfferings)
      .where(isNull(serviceOfferings.serviceProviderId));
    
    if (servicesWithMissingProvider.length === 0) {
      console.log("[Service Ownership] ✓ All services have proper ownership data");
      return { fixed: 0, total: 0 };
    }
    
    console.log(`[Service Ownership] Found ${servicesWithMissingProvider.length} services with missing serviceProviderId`);
    
    // Backfill serviceProviderId from vendorId for each service
    let fixed = 0;
    for (const service of servicesWithMissingProvider) {
      if (service.vendorId) {
        await db
          .update(serviceOfferings)
          .set({ 
            serviceProviderId: service.vendorId,
            updatedAt: new Date()
          })
          .where(eq(serviceOfferings.id, service.id));
        
        console.log(`[Service Ownership] Fixed service "${service.offeringName}" (ID: ${service.id}) - set serviceProviderId to ${service.vendorId}`);
        fixed++;
      } else {
        console.warn(`[Service Ownership] ⚠️ Service "${service.offeringName}" (ID: ${service.id}) has no vendorId - cannot fix`);
      }
    }
    
    console.log(`[Service Ownership] ✓ Fixed ${fixed} of ${servicesWithMissingProvider.length} services`);
    
    return { fixed, total: servicesWithMissingProvider.length };
  } catch (error) {
    console.error("[Service Ownership] Error during validation:", error);
    throw error;
  }
}
