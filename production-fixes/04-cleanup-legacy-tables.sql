-- =====================================================
-- PRODUCTION DATABASE CLEANUP SCRIPT
-- Rise Local - Remove Legacy Tables (OPTIONAL)
-- =====================================================
-- 
-- PURPOSE: Remove legacy restaurants and service_providers tables
--          after verifying the migration was successful
--
-- ⚠️ PREREQUISITES - ALL must be satisfied:
--    1. ✅ Full migration completed (03-full-migration.sql)
--    2. ✅ All vendors tested in production for 1+ weeks
--    3. ✅ Dashboard verified working for all vendor types
--    4. ✅ No issues reported from vendors or customers
--    5. ✅ PHYSICAL DATABASE BACKUP taken (not just migration script)
--
-- WHAT IT DOES:
-- 1. Validates 100% data migration before proceeding
-- 2. Optionally creates backup tables
-- 3. Drops legacy tables with dependency checks
--
-- ⚠️ WARNING: This is IRREVERSIBLE after COMMIT
--              Data cannot be recovered without backups
-- =====================================================

BEGIN;

-- =====================================================
-- PRE-FLIGHT SAFETY CHECKS
-- =====================================================

-- Check 1: Ensure ALL restaurants were migrated
DO $$
DECLARE
    unmigrated_restaurants INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmigrated_restaurants
    FROM restaurants r
    WHERE NOT EXISTS (
        SELECT 1 FROM vendors v 
        WHERE v.legacy_source_id = r.id 
        AND v.legacy_source_table = 'restaurants'
    );
    
    IF unmigrated_restaurants > 0 THEN
        RAISE EXCEPTION 'MIGRATION INCOMPLETE: % restaurants not migrated to vendors table', unmigrated_restaurants;
    END IF;
    
    RAISE NOTICE 'Check 1 PASSED: All restaurants migrated';
END $$;

-- Check 2: Ensure ALL service providers were migrated
DO $$
DECLARE
    unmigrated_providers INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmigrated_providers
    FROM service_providers sp
    WHERE NOT EXISTS (
        SELECT 1 FROM vendors v 
        WHERE v.legacy_source_id = sp.id 
        AND v.legacy_source_table = 'service_providers'
    );
    
    IF unmigrated_providers > 0 THEN
        RAISE EXCEPTION 'MIGRATION INCOMPLETE: % service providers not migrated to vendors table', unmigrated_providers;
    END IF;
    
    RAISE NOTICE 'Check 2 PASSED: All service providers migrated';
END $$;

-- Check 3: Verify row count parity
DO $$
DECLARE
    restaurant_count INTEGER;
    service_provider_count INTEGER;
    migrated_restaurant_count INTEGER;
    migrated_provider_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO restaurant_count FROM restaurants;
    SELECT COUNT(*) INTO service_provider_count FROM service_providers;
    SELECT COUNT(*) INTO migrated_restaurant_count 
    FROM vendors WHERE legacy_source_table = 'restaurants';
    SELECT COUNT(*) INTO migrated_provider_count 
    FROM vendors WHERE legacy_source_table = 'service_providers';
    
    IF restaurant_count != migrated_restaurant_count THEN
        RAISE EXCEPTION 'ROW COUNT MISMATCH: restaurants=%, migrated=%', restaurant_count, migrated_restaurant_count;
    END IF;
    
    IF service_provider_count != migrated_provider_count THEN
        RAISE EXCEPTION 'ROW COUNT MISMATCH: service_providers=%, migrated=%', service_provider_count, migrated_provider_count;
    END IF;
    
    RAISE NOTICE 'Check 3 PASSED: Row counts match (%  restaurants, % service providers)', restaurant_count, service_provider_count;
END $$;

-- Check 4: Inspect dependencies that would be affected by CASCADE
SELECT 
    'Tables/constraints that depend on restaurants:' as notice,
    string_agg(DISTINCT conrelid::regclass::text, ', ') as dependent_objects
FROM pg_constraint
WHERE confrelid = 'restaurants'::regclass;

SELECT 
    'Tables/constraints that depend on service_providers:' as notice,
    string_agg(DISTINCT conrelid::regclass::text, ', ') as dependent_objects
FROM pg_constraint
WHERE confrelid = 'service_providers'::regclass;

-- REVIEW the dependent objects above - CASCADE will drop them too!

-- =====================================================
-- OPTIONAL: Create backup tables (RECOMMENDED)
-- =====================================================

-- Uncomment to create permanent backup tables
-- These will persist even after dropping the originals

-- CREATE TABLE IF NOT EXISTS restaurants_backup_2025 AS 
-- SELECT *, NOW() as backup_timestamp FROM restaurants;

-- CREATE TABLE IF NOT EXISTS service_providers_backup_2025 AS 
-- SELECT *, NOW() as backup_timestamp FROM service_providers;

-- Verify backups were created
-- SELECT 
--     'restaurants_backup_2025' as table_name,
--     COUNT(*) as row_count 
-- FROM restaurants_backup_2025
-- UNION ALL
-- SELECT 
--     'service_providers_backup_2025',
--     COUNT(*) 
-- FROM service_providers_backup_2025;

-- =====================================================
-- CLEANUP: Drop legacy tables
-- =====================================================

-- ⚠️ FINAL WARNING: Review all checks above before uncommenting!
-- All checks MUST show PASSED status
-- All dependent objects MUST be reviewed
-- Physical database backup MUST be confirmed

-- Uncomment to drop legacy tables (irreversible after COMMIT):

-- DROP TABLE IF EXISTS restaurants CASCADE;
-- DROP TABLE IF EXISTS service_providers CASCADE;

-- RAISE NOTICE 'Legacy tables dropped successfully';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- After dropping, verify tables are gone
SELECT 
    table_name,
    'STILL EXISTS - DROP FAILED' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('restaurants', 'service_providers');

-- This query should return 0 rows if cleanup was successful

-- =====================================================
-- COMMIT DECISION
-- =====================================================

-- Review all verification results above
-- Ensure all safety checks PASSED
-- Ensure backup tables created (if using them)
-- Ensure DROP statements were uncommented and executed

-- If everything is correct and legacy tables are dropped:
-- COMMIT;

-- If you want to keep legacy tables or something looks wrong:
-- ROLLBACK;

-- NOTE: You MUST explicitly run COMMIT or ROLLBACK
