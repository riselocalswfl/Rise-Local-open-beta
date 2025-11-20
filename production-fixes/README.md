# Production Database Migration Guide

## ⚠️ Critical: Read This First

**STOP!** Before running ANY script:

1. ✅ **BACKUP YOUR DATABASE** - Take a physical backup through your database provider
2. ✅ **TEST IN STAGING FIRST** - Never run untested SQL in production
3. ✅ **Review expected counts** - Know how many records you have before migrating
4. ✅ **Have rollback plan** - Know how to restore from backup

---

## Overview

Your Rise Local production database currently has:
- **Legacy tables**: `restaurants` and `service_providers` with old vendor data
- **Legacy user roles**: `restaurant` and `service_provider` in the users table
- **Mixed data**: Some vendors incorrectly labeled (e.g., service provider showing as "shop")
- **Unified system**: New code expects a single `vendors` table with unified data

**Migration goal**: Move all data to the unified `vendors` table and update user roles to `vendor`.

---

## Migration Workflow

### Phase 1: Pre-Flight (Before Any Changes)

**1. Take database backup**
- Use your database provider's backup tool (Neon, Supabase, etc.)
- Store backup somewhere safe
- Test that you can restore from backup

**2. Record current state**

Run these queries to know your baseline:

```sql
-- Count current vendors
SELECT 
    'restaurants' as table_name, COUNT(*) as count FROM restaurants
UNION ALL
SELECT 'service_providers', COUNT(*) FROM service_providers
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors;

-- Count users by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;
```

**Write down these numbers** - you'll verify against them later.

---

### Phase 2: Fix Individual Issues (IMMEDIATE)

Some vendors may have mismatched data that needs fixing first.

#### Step 2.1: Identify Problems

**File**: `01-identify-incorrect-vendor.sql`

1. Open your production database query tool
2. Copy the entire contents of `01-identify-incorrect-vendor.sql`
3. Run it
4. Review the results - you'll see vendors with mismatched types/roles

**Example output:**
```
mismatch_type                        | vendor_id | business_name      | user_role
-------------------------------------|-----------|--------------------|-----------------
Shop vendor with service_provider role | abc-123   | Green Cleaning Co  | service_provider
```

**Action**: Write down the `vendor_id` and `user_id` for each problematic vendor.

---

#### Step 2.2: Fix Each Problem Vendor

**File**: `02-fix-incorrect-vendor.sql`

For each problematic vendor:

1. Open `02-fix-incorrect-vendor.sql`
2. Find these lines:
   ```sql
   WHERE v.id = '{vendor_id}'
   WHERE u.id = '{user_id}'
   ```
3. Replace `{vendor_id}` with actual vendor ID (keep the quotes)
4. Replace `{user_id}` with actual user ID (keep the quotes)
5. Copy the entire script
6. Paste into your production database query tool
7. Run it - the script will:
   - Show "BEFORE" state
   - Update vendor type and user role
   - Show "AFTER" state
8. Review the results
9. If correct, run: `COMMIT;`
10. If wrong, run: `ROLLBACK;`

**Repeat for each problematic vendor.**

---

### Phase 3: Full Migration (AFTER INDIVIDUAL FIXES)

This migrates ALL vendors from legacy tables to unified system.

#### Step 3.1: Review Migration Script

**File**: `03-full-migration.sql`

Open it and review:
- Expected counts match your baseline from Phase 1
- You understand what each step does
- You have database backup

#### Step 3.2: Run Migration

1. Open your production database query tool
2. Copy the ENTIRE contents of `03-full-migration.sql`
3. Paste and run it
4. **Watch the output carefully** - it will show:
   - Pre-flight counts
   - Migration progress
   - Validation results
   - Final summary

**Expected output:**
```
NOTICE:  Current state:
NOTICE:    Restaurants to migrate: 15
NOTICE:    Service providers to migrate: 25
NOTICE:    Existing vendors: 70
NOTICE:    Expected total after migration: 110
...
NOTICE:  === MIGRATION SUMMARY ===
NOTICE:  Total vendors: 110
NOTICE:    - Shop vendors: 70
NOTICE:    - Dine vendors: 15
NOTICE:    - Service vendors: 25
NOTICE:  Vendors with missing fields: 0
NOTICE:  Users with legacy roles: 0
```

#### Step 3.3: Verify Results

Check that:
- [ ] Total vendors = sum of all types
- [ ] Vendors with missing fields = 0
- [ ] Users with legacy roles = 0
- [ ] All counts match your baseline

#### Step 3.4: Commit or Rollback

If everything looks correct:
```sql
COMMIT;
```

If anything looks wrong:
```sql
ROLLBACK;
```

---

### Phase 4: Test in Production (1-2 WEEKS)

**DO NOT proceed to cleanup yet!**

1. Test the application thoroughly:
   - [ ] All vendor types visible on All Vendors page
   - [ ] Service offerings visible on Services page
   - [ ] Dashboard works for all vendor types
   - [ ] Vendors can create products/services/menu items
   - [ ] No errors reported

2. Monitor for 1-2 weeks

3. Keep legacy tables as backup during this period

---

### Phase 5: Cleanup (OPTIONAL - AFTER 2+ WEEKS)

**Only proceed if Phase 4 testing was 100% successful.**

#### Step 5.1: Final Safety Checks

**File**: `04-cleanup-legacy-tables.sql`

Before running:
- [ ] Migration has been running successfully for 2+ weeks
- [ ] All vendors tested without issues
- [ ] NEW database backup taken (fresh one)
- [ ] You understand this is irreversible

#### Step 5.2: Review Cleanup Script

Open `04-cleanup-legacy-tables.sql` and review:
- Safety checks that run first
- Dependent objects that will be affected
- Option to create backup tables first

#### Step 5.3: Run Cleanup

1. Open your production database query tool
2. Copy the ENTIRE contents of `04-cleanup-legacy-tables.sql`
3. Run it (DROP statements are commented out by default)
4. Review all safety check results
5. **If all checks PASS**, uncomment the DROP statements:
   ```sql
   DROP TABLE IF EXISTS restaurants CASCADE;
   DROP TABLE IF EXISTS service_providers CASCADE;
   ```
6. Run the script again
7. Review verification results
8. If correct: `COMMIT;`
9. If wrong: `ROLLBACK;`

---

## Safety Features

Each script includes:
- ✅ **Transactions** - Can be rolled back if something goes wrong
- ✅ **Validation** - Checks data integrity before and after changes
- ✅ **Idempotency** - Safe to re-run if needed
- ✅ **Row count checks** - Ensures no data is lost
- ✅ **Explicit COMMIT** - You must explicitly commit changes

---

## Troubleshooting

### Issue: "Vendor with service_provider role still showing as shop"

**Solution**: Run scripts 01 and 02 to fix individual vendors first

### Issue: "Migration failed mid-way"

**Solution**: 
1. Run `ROLLBACK;` immediately
2. Review error message
3. Fix the issue
4. Re-run the migration (it's idempotent)

### Issue: "Some vendors not showing up after migration"

**Solution**:
1. Check `profileStatus = 'complete'` in vendors table
2. Run verification queries from script 03
3. Compare counts with baseline from Phase 1

### Issue: "Need to restore from backup"

**Solution**:
1. Use your database provider's restore function
2. Select the backup from before migration
3. Restore to a point before you ran the scripts
4. Review what went wrong before trying again

---

## Expected Counts (Customize These)

Before running migration, record your actual numbers:

```
Current State (YOUR NUMBERS):
- Restaurants: ___
- Service Providers: ___
- Existing Vendors: ___
- Expected Total: ___

After Migration (SHOULD MATCH):
- Total Vendors: ___
- Shop Vendors: ___
- Dine Vendors: ___
- Service Vendors: ___
```

---

## Support Checklist

Before asking for help, provide:
- [ ] Which phase you're on (1, 2, 3, 4, or 5)
- [ ] Which script you ran
- [ ] Error message (if any)
- [ ] Verification query results
- [ ] Expected vs. actual counts
- [ ] Whether you can rollback

---

## Quick Reference

| Phase | Script | Purpose | Required? |
|-------|--------|---------|-----------|
| 2 | 01-identify-incorrect-vendor.sql | Find problematic vendors | If issues exist |
| 2 | 02-fix-incorrect-vendor.sql | Fix individual vendors | If issues exist |
| 3 | 03-full-migration.sql | Migrate all vendors | **YES** |
| 4 | _(testing)_ | Verify in production | **YES** |
| 5 | 04-cleanup-legacy-tables.sql | Remove old tables | Optional |

---

**Remember**: When in doubt, run `ROLLBACK;` and ask for help. Better safe than sorry!
