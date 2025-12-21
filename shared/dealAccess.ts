import type { User, Deal } from "./schema";

export interface DealAccessInfo {
  isLocked: boolean;
  requiresMembership: boolean;
  userHasMembership: boolean;
  reason: "public" | "member_with_pass" | "locked_no_pass" | "locked_no_user";
}

export function isUserPassMember(user: User | null | undefined): boolean {
  if (!user) return false;
  if (!user.isPassMember) return false;
  if (user.passExpiresAt && new Date(user.passExpiresAt) < new Date()) {
    return false;
  }
  return true;
}

export function isDealMemberOnly(deal: { isPassLocked?: boolean | null; tier?: string | null }): boolean {
  // Primary source of truth: isPassLocked field
  if (deal.isPassLocked === true) return true;
  // Legacy/fallback: tier field for older deals
  if (deal.tier === "premium" || deal.tier === "member") return true;
  // Default: deal is public (not member-only)
  return false;
}

export function canUserAccessDeal(
  user: User | null | undefined,
  deal: { isPassLocked?: boolean | null; tier?: string | null }
): boolean {
  if (!isDealMemberOnly(deal)) return true;
  return isUserPassMember(user);
}

export function getDealAccessInfo(
  user: User | null | undefined,
  deal: { isPassLocked?: boolean | null; tier?: string | null }
): DealAccessInfo {
  const requiresMembership = isDealMemberOnly(deal);
  const userHasMembership = isUserPassMember(user);
  
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

export function getDealLockStatus(
  user: User | null | undefined,
  deal: { isPassLocked?: boolean | null; tier?: string | null }
): DealLockStatus {
  const accessInfo = getDealAccessInfo(user, deal);
  
  return {
    isLocked: accessInfo.isLocked,
    showLockOverlay: accessInfo.isLocked,
    showMemberBadge: accessInfo.requiresMembership,
    canRedeem: !accessInfo.isLocked,
  };
}
