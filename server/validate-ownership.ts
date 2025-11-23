import { db } from "./storage";
import { products, serviceOfferings } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";

/**
 * Comprehensive ownership validation and backfill for products and services
 * Ensures ALL products and services have proper vendor ownership fields populated
 */
export async function validateAndFixOwnership() {
  console.log("[Ownership Validator] Starting comprehensive ownership validation...");
  
  let totalFixed = 0;
  let totalChecked = 0;
  
  // ========================================
  // 1. VALIDATE PRODUCTS
  // ========================================
  try {
    console.log("[Ownership Validator] Checking products...");
    
    // Find all products to check vendorId
    const allProducts = await db.select().from(products);
    totalChecked += allProducts.length;
    
    // Products should always have vendorId since it's NOT NULL in schema
    // But check for any edge cases or null values that slipped through
    const productsWithIssues = allProducts.filter(p => !p.vendorId);
    
    if (productsWithIssues.length > 0) {
      console.warn(`[Ownership Validator] ⚠️ Found ${productsWithIssues.length} products with missing vendorId`);
      
      for (const product of productsWithIssues) {
        console.error(`[Ownership Validator] ERROR: Product "${product.name}" (ID: ${product.id}) has no vendorId - cannot fix`);
      }
    } else {
      console.log(`[Ownership Validator] ✓ All ${allProducts.length} products have vendorId`);
    }
  } catch (error) {
    console.error("[Ownership Validator] Error validating products:", error);
  }
  
  // ========================================
  // 2. VALIDATE SERVICE OFFERINGS
  // ========================================
  try {
    console.log("[Ownership Validator] Checking service offerings...");
    
    // Find all services where vendorId OR serviceProviderId is null
    const servicesWithMissingOwnership = await db
      .select()
      .from(serviceOfferings)
      .where(
        or(
          isNull(serviceOfferings.vendorId),
          isNull(serviceOfferings.serviceProviderId)
        )
      );
    
    totalChecked += servicesWithMissingOwnership.length;
    
    if (servicesWithMissingOwnership.length === 0) {
      // Also count total services for reporting
      const totalServices = await db.select().from(serviceOfferings);
      console.log(`[Ownership Validator] ✓ All ${totalServices.length} service offerings have proper ownership`);
    } else {
      console.log(`[Ownership Validator] Found ${servicesWithMissingOwnership.length} service offerings with missing ownership fields`);
      
      // Backfill missing ownership fields
      for (const service of servicesWithMissingOwnership) {
        let fixed = false;
        const updates: any = { updatedAt: new Date() };
        
        // If vendorId exists but serviceProviderId is null, copy vendorId to serviceProviderId
        if (service.vendorId && !service.serviceProviderId) {
          updates.serviceProviderId = service.vendorId;
          fixed = true;
        }
        
        // If serviceProviderId exists but vendorId is null, copy serviceProviderId to vendorId
        if (service.serviceProviderId && !service.vendorId) {
          updates.vendorId = service.serviceProviderId;
          fixed = true;
        }
        
        if (fixed) {
          await db
            .update(serviceOfferings)
            .set(updates)
            .where(eq(serviceOfferings.id, service.id));
          
          console.log(`[Ownership Validator] Fixed service "${service.offeringName}" (ID: ${service.id})`);
          totalFixed++;
        } else {
          console.error(`[Ownership Validator] ERROR: Service "${service.offeringName}" (ID: ${service.id}) has no ownership data - cannot fix`);
        }
      }
      
      console.log(`[Ownership Validator] ✓ Fixed ${totalFixed} service offerings`);
    }
  } catch (error) {
    console.error("[Ownership Validator] Error validating service offerings:", error);
  }
  
  // ========================================
  // SUMMARY
  // ========================================
  console.log("[Ownership Validator] ========================================");
  console.log(`[Ownership Validator] Validation complete!`);
  console.log(`[Ownership Validator] Total items checked: ${totalChecked}`);
  console.log(`[Ownership Validator] Total items fixed: ${totalFixed}`);
  console.log("[Ownership Validator] ========================================");
  
  return { fixed: totalFixed, checked: totalChecked };
}
