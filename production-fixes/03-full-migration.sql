-- =====================================================
-- PRODUCTION DATABASE MIGRATION SCRIPT
-- Rise Local - Complete Unified Vendor System Migration
-- =====================================================
-- 
-- PURPOSE: Migrate all vendors from legacy tables (restaurants, service_providers)
--          to the unified vendors table and update user roles
--
-- PREREQUISITES:
-- 1. BACKUP your database BEFORE running this
-- 2. Run in staging/test environment FIRST
-- 3. Fix individual vendor issues first (scripts 01-02)
-- 4. Review expected counts below
--
-- SAFETY FEATURES:
-- - Idempotent (safe to re-run)
-- - Validates row counts
-- - Uses INSERT ... ON CONFLICT to prevent duplicates
-- - Wrapped in transaction with explicit COMMIT requirement
-- - Preserves legacy tables as backup
--
-- =====================================================

BEGIN;

-- =====================================================
-- PRE-FLIGHT: Check current state
-- =====================================================

DO $$
DECLARE
    restaurant_count INTEGER;
    service_provider_count INTEGER;
    existing_vendor_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO restaurant_count FROM restaurants;
    SELECT COUNT(*) INTO service_provider_count FROM service_providers;
    SELECT COUNT(*) INTO existing_vendor_count FROM vendors;
    
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '  Restaurants to migrate: %', restaurant_count;
    RAISE NOTICE '  Service providers to migrate: %', service_provider_count;
    RAISE NOTICE '  Existing vendors: %', existing_vendor_count;
    RAISE NOTICE '  Expected total after migration: %', restaurant_count + service_provider_count + existing_vendor_count;
END $$;

-- =====================================================
-- STEP 1: Migrate restaurants to unified vendors table
-- =====================================================

INSERT INTO vendors (
    id,
    user_id,
    business_name,
    tagline,
    bio,
    address,
    city,
    state,
    zip_code,
    contact_email,
    phone,
    website,
    instagram,
    facebook,
    logo_url,
    cover_image_url,
    is_verified,
    vendor_type,
    profile_status,
    capabilities,
    restaurant_details,
    legacy_source_table,
    legacy_source_id,
    created_at,
    updated_at
)
SELECT 
    r.id,
    r.user_id,
    r.business_name,
    r.tagline,
    r.bio,
    r.address,
    r.city,
    r.state,
    r.zip_code,
    r.contact_email,
    r.phone,
    r.website,
    r.instagram,
    r.facebook,
    r.logo_url,
    r.cover_image_url,
    r.is_verified,
    'dine' as vendor_type,
    COALESCE(r.profile_status, 'complete') as profile_status,
    '{"products": false, "services": false, "menu": true}'::jsonb as capabilities,
    jsonb_build_object(
        'cuisine', r.cuisine,
        'priceRange', r.price_range,
        'seatingCapacity', r.seating_capacity,
        'hasOutdoorSeating', r.has_outdoor_seating,
        'hasDelivery', r.has_delivery,
        'hasTakeout', r.has_takeout,
        'acceptsReservations', r.accepts_reservations,
        'hoursOfOperation', r.hours_of_operation,
        'menuHighlights', r.menu_highlights
    ) as restaurant_details,
    'restaurants' as legacy_source_table,
    r.id as legacy_source_id,
    r.created_at,
    COALESCE(r.updated_at, NOW())
FROM restaurants r
ON CONFLICT (id) DO UPDATE SET
    -- If vendor already exists, update only if it came from legacy migration
    vendor_type = CASE 
        WHEN vendors.legacy_source_table = 'restaurants' THEN EXCLUDED.vendor_type
        ELSE vendors.vendor_type
    END,
    updated_at = NOW();

-- Validate migration
DO $$
DECLARE
    migrated_count INTEGER;
    expected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO expected_count FROM restaurants;
    SELECT COUNT(*) INTO migrated_count FROM vendors WHERE legacy_source_table = 'restaurants';
    
    IF migrated_count < expected_count THEN
        RAISE EXCEPTION 'Restaurant migration incomplete: expected %, got %', expected_count, migrated_count;
    END IF;
    
    RAISE NOTICE 'Restaurants migrated: % of %', migrated_count, expected_count;
END $$;

-- =====================================================
-- STEP 2: Migrate service providers to unified vendors table
-- =====================================================

INSERT INTO vendors (
    id,
    user_id,
    business_name,
    tagline,
    bio,
    address,
    city,
    state,
    zip_code,
    contact_email,
    phone,
    website,
    instagram,
    facebook,
    logo_url,
    cover_image_url,
    is_verified,
    vendor_type,
    profile_status,
    capabilities,
    service_details,
    legacy_source_table,
    legacy_source_id,
    created_at,
    updated_at
)
SELECT 
    sp.id,
    sp.user_id,
    sp.business_name,
    sp.tagline,
    sp.bio,
    sp.address,
    sp.city,
    sp.state,
    sp.zip_code,
    sp.contact_email,
    sp.phone,
    sp.website,
    sp.instagram,
    sp.facebook,
    sp.logo_url,
    sp.cover_image_url,
    sp.is_verified,
    'service' as vendor_type,
    COALESCE(sp.profile_status, 'complete') as profile_status,
    '{"products": false, "services": true, "menu": false}'::jsonb as capabilities,
    jsonb_build_object(
        'serviceArea', sp.service_area,
        'yearsInBusiness', sp.years_in_business,
        'licenseCertification', sp.license_certification,
        'insuranceInfo', sp.insurance_info,
        'emergencyAvailable', sp.emergency_available,
        'freeConsultation', sp.free_consultation
    ) as service_details,
    'service_providers' as legacy_source_table,
    sp.id as legacy_source_id,
    sp.created_at,
    COALESCE(sp.updated_at, NOW())
FROM service_providers sp
ON CONFLICT (id) DO UPDATE SET
    -- If vendor already exists, update only if it came from legacy migration
    vendor_type = CASE 
        WHEN vendors.legacy_source_table = 'service_providers' THEN EXCLUDED.vendor_type
        ELSE vendors.vendor_type
    END,
    updated_at = NOW();

-- Validate migration
DO $$
DECLARE
    migrated_count INTEGER;
    expected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO expected_count FROM service_providers;
    SELECT COUNT(*) INTO migrated_count FROM vendors WHERE legacy_source_table = 'service_providers';
    
    IF migrated_count < expected_count THEN
        RAISE EXCEPTION 'Service provider migration incomplete: expected %, got %', expected_count, migrated_count;
    END IF;
    
    RAISE NOTICE 'Service providers migrated: % of %', migrated_count, expected_count;
END $$;

-- =====================================================
-- STEP 3: Update legacy user roles to unified 'vendor' role
-- =====================================================

-- Only update users who are NOT admins/buyers with hybrid access
UPDATE users
SET 
    role = 'vendor',
    updated_at = NOW()
WHERE role IN ('restaurant', 'service_provider', 'shop')
  AND role != 'admin'; -- Preserve admin access

-- Validate role updates
DO $$
DECLARE
    remaining_legacy_roles INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_legacy_roles 
    FROM users 
    WHERE role IN ('restaurant', 'service_provider', 'shop')
      AND role != 'admin';
    
    IF remaining_legacy_roles > 0 THEN
        RAISE EXCEPTION 'ROLE MIGRATION INCOMPLETE: Still found % users with legacy roles (excluding admins). Migration cannot continue.', remaining_legacy_roles;
    END IF;
    
    RAISE NOTICE 'User roles updated successfully. Remaining legacy roles (excluding admins): %', remaining_legacy_roles;
END $$;

-- =====================================================
-- STEP 4: Fix existing vendors with missing fields
-- =====================================================

-- Set profile_status for vendors without it (only for non-migrated vendors)
UPDATE vendors 
SET 
    profile_status = 'complete',
    updated_at = NOW()
WHERE profile_status IS NULL
  AND legacy_source_table IS NULL; -- Only update manually-created vendors

-- Set vendor_type for vendors without it
UPDATE vendors 
SET 
    vendor_type = 'shop',
    updated_at = NOW()
WHERE vendor_type IS NULL;

-- Set capabilities based on vendor_type for vendors without them
UPDATE vendors 
SET 
    capabilities = CASE 
        WHEN vendor_type = 'shop' THEN '{"products": true, "services": false, "menu": false}'::jsonb
        WHEN vendor_type = 'dine' THEN '{"products": false, "services": false, "menu": true}'::jsonb
        WHEN vendor_type = 'service' THEN '{"products": false, "services": true, "menu": false}'::jsonb
        ELSE '{"products": true, "services": false, "menu": false}'::jsonb
    END,
    updated_at = NOW()
WHERE capabilities IS NULL
  AND legacy_source_table IS NULL; -- Only update manually-created vendors

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
    total_vendors INTEGER;
    shop_count INTEGER;
    dine_count INTEGER;
    service_count INTEGER;
    missing_fields INTEGER;
    legacy_roles INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_vendors FROM vendors;
    SELECT COUNT(*) INTO shop_count FROM vendors WHERE vendor_type = 'shop';
    SELECT COUNT(*) INTO dine_count FROM vendors WHERE vendor_type = 'dine';
    SELECT COUNT(*) INTO service_count FROM vendors WHERE vendor_type = 'service';
    SELECT COUNT(*) INTO missing_fields FROM vendors 
    WHERE profile_status IS NULL OR vendor_type IS NULL OR capabilities IS NULL;
    SELECT COUNT(*) INTO legacy_roles FROM users 
    WHERE role IN ('restaurant', 'service_provider', 'shop') AND role != 'admin';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Total vendors: %', total_vendors;
    RAISE NOTICE '  - Shop vendors: %', shop_count;
    RAISE NOTICE '  - Dine vendors: %', dine_count;
    RAISE NOTICE '  - Service vendors: %', service_count;
    RAISE NOTICE 'Vendors with missing fields: %', missing_fields;
    RAISE NOTICE 'Users with legacy roles: %', legacy_roles;
    RAISE NOTICE '';
    
    IF missing_fields > 0 THEN
        RAISE EXCEPTION 'Migration incomplete: % vendors have missing fields', missing_fields;
    END IF;
    
    IF legacy_roles > 0 THEN
        RAISE EXCEPTION 'ROLE MIGRATION INCOMPLETE: Still found % users with legacy roles. All user roles must be migrated before proceeding.', legacy_roles;
    END IF;
END $$;

-- Show final vendor breakdown
SELECT 
    vendor_type,
    COUNT(*) as count,
    COUNT(CASE WHEN legacy_source_table IS NOT NULL THEN 1 END) as migrated_from_legacy
FROM vendors
GROUP BY vendor_type
ORDER BY vendor_type;

-- =====================================================
-- COMMIT DECISION
-- =====================================================

-- Review the migration summary above
-- All vendors must have complete fields
-- All user roles should be updated

-- If everything looks correct, uncomment and run:
-- COMMIT;

-- If something looks wrong, uncomment and run:
-- ROLLBACK;

-- NOTE: You MUST explicitly run COMMIT or ROLLBACK
