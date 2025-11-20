# Production Database Migration Instructions

## Overview
After republishing your app, you need to run a migration script to update your 9 existing vendors so they work with the new unified vendor dashboard system.

---

## Step-by-Step Instructions

### Step 1: Republish Your App
1. Click the **Publish** button in Replit
2. Wait for the deployment to complete
3. Your database schema will automatically update with the new columns

### Step 2: Access Production Database
1. Open the **Database pane** in Replit (left sidebar, database icon)
2. **Toggle to "Production"** environment (top of the database pane)
3. Click **"Edit"** under the "My data" section

### Step 3: Run the Migration Script
1. Open the file `production-migration.sql` in this project
2. **Copy ALL THREE UPDATE statements** (STEP 1, STEP 2, and STEP 3)
   - STEP 1: Updates profile_status
   - STEP 2: Updates vendor_type
   - STEP 3: Updates capabilities
3. **Paste all three into the production database SQL editor**
4. Click **"Run"** or press Execute

**IMPORTANT:** You must run ALL THREE steps together. Running only one step will leave your vendors partially migrated.

**Note:** The migration script also includes verification queries and manual adjustment examples. You can copy and run those separately after the migration.

### Step 4: Verify the Migration
Run these verification queries to confirm success:

```sql
-- Check that ALL vendors have all three fields set
SELECT 
  COUNT(*) as total_vendors,
  COUNT(CASE WHEN profile_status = 'complete' THEN 1 END) as complete_vendors,
  COUNT(CASE WHEN vendor_type = 'shop' THEN 1 END) as shop_vendors,
  COUNT(CASE WHEN capabilities IS NOT NULL THEN 1 END) as vendors_with_capabilities,
  COUNT(CASE WHEN profile_status IS NULL OR vendor_type IS NULL OR capabilities IS NULL THEN 1 END) as incomplete_vendors
FROM vendors;
```

You should see:
- `total_vendors: 9`
- `complete_vendors: 9`
- `shop_vendors: 9` (or whatever mix you have after manual adjustments)
- `vendors_with_capabilities: 9`
- `incomplete_vendors: 0` (this MUST be 0 - if not, re-run the migration)

**If incomplete_vendors is NOT 0**, it means some vendors are missing fields. Re-run all three migration steps.

### Step 5: Adjust Vendor Types (If Needed)
If any of your 9 vendors are restaurants or service providers (not shops), update them individually:

**For a restaurant:**
```sql
UPDATE vendors 
SET 
  vendor_type = 'dine',
  capabilities = '{"products": false, "services": false, "menu": true}'::jsonb
WHERE business_name = 'Your Restaurant Name';
```

**For a service provider:**
```sql
UPDATE vendors 
SET 
  vendor_type = 'service',
  capabilities = '{"products": false, "services": true, "menu": false}'::jsonb
WHERE business_name = 'Your Service Provider Name';
```

---

## What This Migration Does

The migration runs three separate steps, each one safely updating vendors that are missing that specific field:

✅ **Step 1: Sets `profile_status = 'complete'`** - Makes vendors visible on listing pages (only for vendors where this is NULL)  
✅ **Step 2: Sets `vendor_type = 'shop'`** - Default type (only for vendors where this is NULL, change manually if needed)  
✅ **Step 3: Sets capabilities** - Enables products for shops (only for vendors where this is NULL)  
✅ **Preserves all existing data** - Business name, bio, location, etc. stay intact
✅ **Idempotent** - Can be run multiple times safely, won't overwrite manual changes  

---

## Troubleshooting

### Vendors still not showing up?
Run this query to check their status:
```sql
SELECT id, business_name, vendor_type, profile_status, capabilities 
FROM vendors;
```

All vendors should have:
- `profile_status = 'complete'`
- `vendor_type = 'shop'` (or 'dine' or 'service')
- `capabilities` with at least one feature enabled

### Need to re-run the migration?
The script is **idempotent** (safe to run multiple times). It only updates vendors where fields are NULL, so you can run it again without breaking anything.

---

## After Migration

Your vendors will appear on:
- `/vendors` - All vendors
- `/products` - Shop vendors (vendor_type = 'shop')
- `/eat-local` - Restaurant vendors (vendor_type = 'dine')
- `/services` - Service vendors (vendor_type = 'service')

They can log in to the unified dashboard at `/dashboard` and manage their profiles with the new capability-based system!
