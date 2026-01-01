// Re-export from single source of truth
// All membership logic is now centralized in shared/dealAccess.ts
export { 
  hasRiseLocalPass as checkIsPassMember,
  hasRiseLocalPass,
  isMemberOnlyDeal,
  isDealMemberOnly,
  canUserAccessDeal,
  getDealAccessInfo,
  getDealLockStatus,
  logAccessDecision,
} from "@shared/dealAccess";

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
