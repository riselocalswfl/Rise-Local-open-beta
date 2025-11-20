-- PRODUCTION DATABASE QUERY
-- Step 1: Identify vendors with mismatched data
-- Run this first to see which vendors need fixing

-- =====================================================
-- CHECK 1: Find ALL vendor/user role mismatches
-- =====================================================

-- Case A: Service vendors with wrong user role
SELECT 
    'Service vendor with restaurant role' as mismatch_type,
    v.id as vendor_id,
    v.business_name,
    v.vendor_type as current_vendor_type,
    v.profile_status,
    u.id as user_id,
    u.username,
    u.role as current_user_role
FROM vendors v
JOIN users u ON v.user_id = u.id
WHERE v.vendor_type = 'service' 
  AND u.role IN ('restaurant', 'shop')

UNION ALL

-- Case B: Shop vendors with service provider role
SELECT 
    'Shop vendor with service_provider role',
    v.id,
    v.business_name,
    v.vendor_type,
    v.profile_status,
    u.id,
    u.username,
    u.role
FROM vendors v
JOIN users u ON v.user_id = u.id
WHERE v.vendor_type = 'shop' 
  AND u.role = 'service_provider'

UNION ALL

-- Case C: Dine vendors with wrong role
SELECT 
    'Dine vendor with non-restaurant role',
    v.id,
    v.business_name,
    v.vendor_type,
    v.profile_status,
    u.id,
    u.username,
    u.role
FROM vendors v
JOIN users u ON v.user_id = u.id
WHERE v.vendor_type = 'dine' 
  AND u.role IN ('service_provider', 'shop')

UNION ALL

-- Case D: Any vendor with legacy role that should be 'vendor'
SELECT 
    'Vendor with legacy user role',
    v.id,
    v.business_name,
    v.vendor_type,
    v.profile_status,
    u.id,
    u.username,
    u.role
FROM vendors v
JOIN users u ON v.user_id = u.id
WHERE u.role IN ('restaurant', 'service_provider', 'shop')
ORDER BY mismatch_type, business_name;

-- =====================================================
-- Summary: How many vendors need fixing?
-- =====================================================

SELECT 
    COUNT(*) as total_mismatched_vendors
FROM vendors v
JOIN users u ON v.user_id = u.id
WHERE u.role IN ('restaurant', 'service_provider', 'shop');

-- =====================================================
-- IMPORTANT: Copy the vendor_id and user_id values
--            to use in 02-fix-incorrect-vendor.sql
-- =====================================================
