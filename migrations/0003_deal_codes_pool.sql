-- Migration: Add deal codes pool system for unique coupon code redemption
-- This supports both FREE_STATIC_CODE (same code for everyone) and PASS_UNIQUE_CODE_POOL (unique codes from vendor-uploaded pool)

-- Add coupon redemption type fields to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS coupon_redemption_type TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS static_code VARCHAR(50);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS code_reserve_minutes INTEGER DEFAULT 30;

-- Add comment for documentation
COMMENT ON COLUMN deals.coupon_redemption_type IS 'FREE_STATIC_CODE = same code for everyone, PASS_UNIQUE_CODE_POOL = unique codes from vendor-uploaded pool';
COMMENT ON COLUMN deals.static_code IS 'Static promo code for FREE_STATIC_CODE deals';
COMMENT ON COLUMN deals.code_reserve_minutes IS 'How long unique codes are reserved before expiring (default 30 minutes)';

-- Create deal_codes table for unique code pool management
CREATE TABLE IF NOT EXISTS deal_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id VARCHAR NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE | RESERVED | REDEEMED | EXPIRED
  assigned_to_user_id VARCHAR REFERENCES users(id),
  reserved_at TIMESTAMP,
  expires_at TIMESTAMP, -- When the reservation expires
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add unique constraint: no duplicate codes per deal
CREATE UNIQUE INDEX IF NOT EXISTS deal_codes_deal_code_unique ON deal_codes(deal_id, code);

-- Index for finding available codes quickly (for atomic reservation)
CREATE INDEX IF NOT EXISTS deal_codes_deal_status_idx ON deal_codes(deal_id, status);

-- Index for looking up user's reserved codes (for idempotency check)
CREATE INDEX IF NOT EXISTS deal_codes_user_deal_idx ON deal_codes(assigned_to_user_id, deal_id);

-- Index for expiration cleanup jobs
CREATE INDEX IF NOT EXISTS deal_codes_expires_at_idx ON deal_codes(expires_at) WHERE status = 'RESERVED';
