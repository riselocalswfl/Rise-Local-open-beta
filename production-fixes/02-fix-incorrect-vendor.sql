-- PRODUCTION DATABASE FIX
-- Step 2: Fix a specific vendor with incorrect vendorType/role
-- 
-- IMPORTANT: 
-- 1. Run 01-identify-incorrect-vendor.sql FIRST
-- 2. Replace {vendor_id} and {user_id} with actual UUIDs (keep the quotes)
-- 3. Review the preview results before committing
-- 4. This script REQUIRES you to explicitly COMMIT or ROLLBACK
--
-- Example:
-- WHERE v.id = '123e4567-e89b-12d3-a456-426614174000'
-- WHERE u.id = '987fcdeb-51a2-43f7-8901-234567890abc'

-- Start transaction
BEGIN;

-- =====================================================
-- SAFETY: Preview what WOULD change (no changes yet)
-- =====================================================

SELECT 
    'BEFORE UPDATE - Current state' as status,
    v.id as vendor_id,
    v.business_name,
    v.vendor_type as current_vendor_type,
    v.capabilities as current_capabilities,
    u.id as user_id,
    u.username,
    u.role as current_user_role
FROM vendors v
JOIN users u ON v.user_id = u.id
WHERE v.id = '{vendor_id}'
  AND u.id = '{user_id}';

-- If the query above returns 0 rows, you have the wrong IDs!
-- Run ROLLBACK; and check your vendor_id and user_id values.

-- =====================================================
-- UPDATE: Fix the vendor profile
-- =====================================================

UPDATE vendors 
SET 
    vendor_type = 'service',
    capabilities = '{"products": false, "services": true, "menu": false}'::jsonb,
    updated_at = NOW()
WHERE id = '{vendor_id}'
  AND EXISTS (SELECT 1 FROM users WHERE id = '{user_id}');

-- Verify exactly 1 row was updated
DO $$
BEGIN
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No vendor was updated - check your vendor_id!';
    END IF;
END $$;

-- =====================================================
-- UPDATE: Fix the user role
-- =====================================================

UPDATE users
SET 
    role = 'vendor',
    updated_at = NOW()
WHERE id = '{user_id}'
  AND id IN (SELECT user_id FROM vendors WHERE id = '{vendor_id}');

-- Verify exactly 1 row was updated
DO $$
BEGIN
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No user was updated - check your user_id!';
    END IF;
END $$;

-- =====================================================
-- VERIFY: Check the changes
-- =====================================================

SELECT 
    'AFTER UPDATE - New state' as status,
    v.id as vendor_id,
    v.business_name,
    v.vendor_type as new_vendor_type,
    v.capabilities as new_capabilities,
    u.id as user_id,
    u.username,
    u.role as new_user_role
FROM vendors v
JOIN users u ON v.user_id = u.id
WHERE v.id = '{vendor_id}';

-- =====================================================
-- DECISION REQUIRED: Review the results above
-- =====================================================

-- If new_vendor_type = 'service' AND new_user_role = 'vendor', run:
-- COMMIT;

-- If something looks wrong, run:
-- ROLLBACK;

-- NOTE: You MUST manually run either COMMIT or ROLLBACK to complete this transaction
--       Do NOT proceed without reviewing the AFTER UPDATE results above!
