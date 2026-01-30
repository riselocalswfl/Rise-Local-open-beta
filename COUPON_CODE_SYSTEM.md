# Coupon Code Redemption System

## Overview

This system implements secure, scalable deal redemption that supports:
1. **FREE_STATIC_CODE** - Same promo code for everyone (business-provided)
2. **PASS_UNIQUE_CODE_POOL** - Unique codes dispensed from vendor-uploaded pool (Pass members only)

## Architecture

### Database Schema

#### New Fields in `deals` Table
- `coupon_redemption_type` - Enum: `FREE_STATIC_CODE` | `PASS_UNIQUE_CODE_POOL` | null (in-person only)
- `static_code` - The static promo code for FREE_STATIC_CODE deals
- `code_reserve_minutes` - How long unique codes are reserved (default 30 minutes)

#### New `deal_codes` Table
```sql
CREATE TABLE deal_codes (
  id VARCHAR PRIMARY KEY,
  deal_id VARCHAR NOT NULL REFERENCES deals(id),
  code VARCHAR(50) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE | RESERVED | REDEEMED | EXPIRED
  assigned_to_user_id VARCHAR REFERENCES users(id),
  reserved_at TIMESTAMP,
  expires_at TIMESTAMP,
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### Consumer Endpoints
- `POST /api/deals/:id/coupon-code` - Get coupon code (static or reserve unique)
- `POST /api/deals/:id/coupon-code/mark-used` - Mark unique code as redeemed (best-effort)

#### Vendor Endpoints
- `GET /api/business/deals/code-pools` - List vendor's deals with code pool stats
- `POST /api/deals/:dealId/codes/upload` - Upload codes to pool (CSV or text)

### Security Features

1. **Atomic Code Reservation** - Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
2. **Idempotent Retrieval** - Same user gets same reserved code within expiration window
3. **Pass Membership Verification** - Unique codes only available to Pass members
4. **Watermarked Display** - Member codes shown with animated watermark + user identity
5. **Vendor Authorization** - Only deal owner can upload codes

## Testing & QA Checklist

### Concurrency Testing
- [ ] Two simultaneous redeem calls do not get the same code
- [ ] High-traffic scenario doesn't cause duplicate code assignments
- [ ] Database row locking works correctly under load

### Membership Gating
- [ ] Non-members cannot access PASS_UNIQUE_CODE_POOL codes (403 response)
- [ ] Non-members see "Join to Get Code" button on unique code deals
- [ ] Pass members can reveal member codes successfully

### Idempotency
- [ ] Same user gets same reserved code when called multiple times
- [ ] Code reservation survives page refresh within expiration window
- [ ] Expired reservations return new code on next request

### Code Upload Validation
- [ ] Duplicate codes within upload are rejected
- [ ] Duplicate codes against existing DB codes are rejected
- [ ] Codes under 8 characters are rejected
- [ ] Invalid characters (special chars) are rejected
- [ ] Empty lines in CSV/text are ignored
- [ ] Vendor can only upload to their own deals
- [ ] Admin can upload to any deal

### Code Pool Depletion
- [ ] When pool is empty, returns 503 with `poolEmpty: true`
- [ ] Low codes warning shows at <25 available
- [ ] Out of codes alert shows when pool is empty
- [ ] Vendor dashboard shows accurate pool stats

### Watermark Verification
- [ ] Watermark displays on unique code reveal modal
- [ ] User name/initial appears in watermark
- [ ] Timestamp updates every 10 seconds
- [ ] Watermark uses animated pattern
- [ ] Verification string shows at bottom with user + timestamp

### UI/UX Testing
- [ ] "Reveal Code" button shows for coupon deals
- [ ] "Redeem Now" button shows for in-person deals
- [ ] Code can be copied to clipboard
- [ ] Expiration countdown displays correctly
- [ ] Modal works on both mobile (Drawer) and desktop (Dialog)
- [ ] Vendor Coupon Codes tab accessible in dashboard
- [ ] Upload dialog accepts CSV and newline-separated text

### Edge Cases
- [ ] Deal without couponRedemptionType uses standard redemption
- [ ] FREE_STATIC_CODE with null staticCode shows "No code required"
- [ ] Reserved codes expire and return to available pool (manual check or cron)
- [ ] Network errors show appropriate error messages

## Manual Testing Steps

### Consumer Flow
1. Log in as a Pass member
2. Navigate to a deal with `PASS_UNIQUE_CODE_POOL` type
3. Click "Reveal Member Code"
4. Verify watermark appears with your name
5. Copy code and verify it works at vendor checkout
6. Refresh page and verify same code is shown

### Vendor Flow
1. Log in as a business owner
2. Go to Business Dashboard > Coupon Codes tab
3. Select a deal with unique code pool
4. Click "Upload Codes"
5. Paste codes (one per line)
6. Verify upload success and updated stats
7. Check for low codes warning when applicable

### Admin Flow
1. Log in as admin
2. Upload codes to any vendor's deal
3. Verify authorization works

## Migration

Run migration: `migrations/0003_deal_codes_pool.sql`

```bash
# Apply migration
psql $DATABASE_URL -f migrations/0003_deal_codes_pool.sql
```

## File Changes

### New Files
- `client/src/components/CouponCodeRevealModal.tsx` - Consumer code reveal modal with watermark
- `migrations/0003_deal_codes_pool.sql` - Database migration

### Modified Files
- `shared/schema.ts` - Added deal_codes table and new deal fields
- `server/storage.ts` - Added code pool management methods
- `server/routes.ts` - Added coupon code API endpoints
- `client/src/pages/VendorDashboard.tsx` - Added Coupon Codes tab
- `client/src/pages/DealDetailPage.tsx` - Added coupon code reveal integration
