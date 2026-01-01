import type { User, Deal } from "./schema";

// ============================================================================
// RISE LOCAL PASS ACCESS - SINGLE SOURCE OF TRUTH
// ============================================================================
// Rule: If user.hasRiseLocalPass === true → all member-only deals are unlocked
// 
// User membership: Derived from isPassMember + valid passExpiresAt
// Deal membership: Derived from isPassLocked OR tier === "premium"/"member"
// ============================================================================

export interface DealAccessInfo {
  isLocked: boolean;
  requiresMembership: boolean;
  userHasMembership: boolean;
  reason: "public" | "member_with_pass" | "locked_no_pass" | "locked_no_user";
}

interface UserWithMembership {
  id?: string;
  isPassMember?: boolean | null;
  passExpiresAt?: Date | string | null;
}

interface DealWithAccess {
  id?: string;
  title?: string;
  isPassLocked?: boolean | null;
  tier?: string | null;
}

// Debug mode - enable for troubleshooting
const DEBUG_ACCESS = false;

function debugLog(message: string, data?: Record<string, unknown>) {
  if (DEBUG_ACCESS) {
    console.log(`[DEAL_ACCESS] ${message}`, data ? JSON.stringify(data) : "");
  }
}

/**
 * Check if user has an active Rise Local Pass
 * SINGLE SOURCE OF TRUTH for membership status
 * 
 * Conditions (ALL must be true):
 * 1. user exists
 * 2. user.isPassMember === true
 * 3. user.passExpiresAt exists and is in the future
 */
export function hasRiseLocalPass(user: UserWithMembership | null | undefined): boolean {
  if (!user) {
    debugLog("No user provided");
    return false;
  }
  
  if (user.isPassMember !== true) {
    debugLog("User isPassMember is not true", { userId: user.id, isPassMember: user.isPassMember });
    return false;
  }
  
  // Require valid passExpiresAt - this prevents stale/malformed data from granting access
  if (!user.passExpiresAt) {
    debugLog("User has no passExpiresAt", { userId: user.id });
    return false;
  }
  
  const expiresAt = new Date(user.passExpiresAt);
  const expiresTime = expiresAt.getTime();
  
  // If date is invalid/unparsable, deny access (safe default)
  if (Number.isNaN(expiresTime)) {
    debugLog("Invalid passExpiresAt date", { userId: user.id, passExpiresAt: user.passExpiresAt });
    return false;
  }
  
  const now = Date.now();
  const hasValidPass = expiresTime > now;
  
  debugLog("Membership check result", { 
    userId: user.id, 
    hasValidPass,
    expiresAt: expiresAt.toISOString(),
    now: new Date(now).toISOString()
  });
  
  return hasValidPass;
}

// Alias for backward compatibility
export const isUserPassMember = hasRiseLocalPass;
export const checkIsPassMember = hasRiseLocalPass;

/**
 * Check if a deal requires Rise Local Pass membership
 * SINGLE SOURCE OF TRUTH for deal access requirements
 * 
 * A deal is member-only if:
 * 1. deal.isPassLocked === true (primary flag)
 * 2. OR deal.tier === "premium" or "member" (legacy fallback)
 */
export function isMemberOnlyDeal(deal: DealWithAccess): boolean {
  // Primary source of truth: isPassLocked field
  if (deal.isPassLocked === true) {
    debugLog("Deal is member-only (isPassLocked)", { dealId: deal.id, title: deal.title });
    return true;
  }
  
  // Legacy/fallback: tier field for older deals
  if (deal.tier === "premium" || deal.tier === "member") {
    debugLog("Deal is member-only (legacy tier)", { dealId: deal.id, title: deal.title, tier: deal.tier });
    return true;
  }
  
  debugLog("Deal is public", { dealId: deal.id, title: deal.title });
  return false;
}

// Alias for backward compatibility
export const isDealMemberOnly = isMemberOnlyDeal;

/**
 * Check if user can access a deal
 * SINGLE SOURCE OF TRUTH for access decisions
 * 
 * Logic:
 * - If deal is NOT member-only → allow access
 * - If deal IS member-only AND user has Rise Local Pass → allow access
 * - Otherwise → deny access
 */
export function canUserAccessDeal(
  user: UserWithMembership | null | undefined,
  deal: DealWithAccess
): boolean {
  const memberOnly = isMemberOnlyDeal(deal);
  const hasPass = hasRiseLocalPass(user);
  
  if (!memberOnly) {
    debugLog("Access granted: public deal", { dealId: deal.id });
    return true;
  }
  
  if (hasPass) {
    debugLog("Access granted: member with pass", { dealId: deal.id, userId: (user as UserWithMembership)?.id });
    return true;
  }
  
  debugLog("Access denied: member-only deal, no pass", { dealId: deal.id, userId: (user as UserWithMembership)?.id });
  return false;
}

/**
 * Get detailed access information for UI display
 */
export function getDealAccessInfo(
  user: UserWithMembership | null | undefined,
  deal: DealWithAccess
): DealAccessInfo {
  const requiresMembership = isMemberOnlyDeal(deal);
  const userHasMembership = hasRiseLocalPass(user);
  
  if (!requiresMembership) {
    return {
      isLocked: false,
      requiresMembership: false,
      userHasMembership,
      reason: "public",
    };
  }
  
  if (userHasMembership) {
    return {
      isLocked: false,
      requiresMembership: true,
      userHasMembership: true,
      reason: "member_with_pass",
    };
  }
  
  return {
    isLocked: true,
    requiresMembership: true,
    userHasMembership: false,
    reason: user ? "locked_no_pass" : "locked_no_user",
  };
}

export type DealLockStatus = {
  isLocked: boolean;
  showLockOverlay: boolean;
  showMemberBadge: boolean;
  canRedeem: boolean;
};

/**
 * Get lock status for UI components
 */
export function getDealLockStatus(
  user: UserWithMembership | null | undefined,
  deal: DealWithAccess
): DealLockStatus {
  const accessInfo = getDealAccessInfo(user, deal);
  
  return {
    isLocked: accessInfo.isLocked,
    showLockOverlay: accessInfo.isLocked,
    showMemberBadge: accessInfo.requiresMembership,
    canRedeem: !accessInfo.isLocked,
  };
}

/**
 * Debug helper - log access decision with full context
 * Enable DEBUG_ACCESS constant at top of file to see logs
 */
export function logAccessDecision(
  user: UserWithMembership | null | undefined,
  deal: DealWithAccess,
  context: string
): void {
  const accessInfo = getDealAccessInfo(user, deal);
  console.log(`[DEAL_ACCESS] ${context}`, {
    userId: user?.id ?? "none",
    hasRiseLocalPass: hasRiseLocalPass(user),
    isPassMember: user?.isPassMember,
    passExpiresAt: user?.passExpiresAt,
    dealId: deal.id,
    dealTitle: deal.title,
    isMemberOnly: isMemberOnlyDeal(deal),
    isPassLocked: deal.isPassLocked,
    tier: deal.tier,
    accessResult: accessInfo.reason,
    isLocked: accessInfo.isLocked,
  });
}
