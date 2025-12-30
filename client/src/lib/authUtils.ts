export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

interface UserWithMembership {
  isPassMember?: boolean | null;
  passExpiresAt?: Date | string | null;
}

export function checkIsPassMember(user: UserWithMembership | null | undefined): boolean {
  if (!user) return false;
  if (user.isPassMember !== true) return false;
  
  // If no expiration date set, treat as NOT a member (require valid expiration)
  // This prevents legacy/malformed data from granting access
  if (!user.passExpiresAt) {
    return false;
  }
  
  const expiresAt = new Date(user.passExpiresAt);
  const expiresTime = expiresAt.getTime();
  
  // If date is invalid/unparsable, treat as expired (safe default)
  if (Number.isNaN(expiresTime)) {
    return false;
  }
  
  // Only grant access if expiration is in the future
  return expiresTime > Date.now();
}
