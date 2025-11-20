-- =====================================================
-- PRODUCTION DATABASE MIGRATION SCRIPT
-- Rise Local - Unified Vendor System Migration
-- =====================================================
-- 
-- PURPOSE: Updates existing vendor records to work with
--          the new unified vendor dashboard system
--
-- WHEN TO RUN: After republishing your app (ONCE)
--
-- WHAT IT DOES:
-- 1. Sets profileStatus to 'complete' for vendors missing it
-- 2. Sets vendorType to 'shop' for vendors missing it
-- 3. Sets default capabilities for vendors missing them
--
-- =====================================================

-- STEP 1: Set profile_status for vendors that don't have it
UPDATE vendors 
SET profile_status = 'complete'
WHERE profile_status IS NULL;

-- STEP 2: Set vendor_type for vendors that don't have it  
UPDATE vendors 
SET vendor_type = 'shop'
WHERE vendor_type IS NULL;

-- STEP 3: Set capabilities for vendors that don't have them
UPDATE vendors 
SET capabilities = '{"products": true, "services": false, "menu": false}'::jsonb
WHERE capabilities IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after the migration to verify success
-- =====================================================

-- CRITICAL: Check that ALL vendors have all three fields set
SELECT 
  COUNT(*) as total_vendors,
  COUNT(CASE WHEN profile_status = 'complete' THEN 1 END) as complete_vendors,
  COUNT(CASE WHEN vendor_type = 'shop' THEN 1 END) as shop_vendors,
  COUNT(CASE WHEN vendor_type = 'dine' THEN 1 END) as dine_vendors,
  COUNT(CASE WHEN vendor_type = 'service' THEN 1 END) as service_vendors,
  COUNT(CASE WHEN capabilities IS NOT NULL THEN 1 END) as vendors_with_capabilities,
  COUNT(CASE WHEN profile_status IS NULL OR vendor_type IS NULL OR capabilities IS NULL THEN 1 END) as incomplete_vendors
FROM vendors;

-- EXPECTED RESULTS:
-- - total_vendors: 9
-- - complete_vendors: 9
-- - vendors_with_capabilities: 9
-- - incomplete_vendors: 0 (MUST be 0 - if not, re-run all three migration steps)

-- View all vendors with their new fields
SELECT 
  id,
  business_name,
  vendor_type,
  profile_status,
  capabilities
FROM vendors
ORDER BY business_name;

-- =====================================================
-- MANUAL ADJUSTMENTS (if needed)
-- =====================================================

-- Example: Change a specific vendor to restaurant type
-- UPDATE vendors 
-- SET 
--   vendor_type = 'dine',
--   capabilities = '{"products": false, "services": false, "menu": true}'::jsonb
-- WHERE id = 'your-vendor-id-here';

-- Example: Change a specific vendor to service provider type
-- UPDATE vendors 
-- SET 
--   vendor_type = 'service',
--   capabilities = '{"products": false, "services": true, "menu": false}'::jsonb
-- WHERE id = 'your-vendor-id-here';

-- Example: Enable multiple capabilities for a vendor
-- UPDATE vendors 
-- SET 
--   capabilities = '{"products": true, "services": true, "menu": false}'::jsonb
-- WHERE id = 'your-vendor-id-here';
