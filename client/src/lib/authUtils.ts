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
  
  if (!user.passExpiresAt) {
    return true;
  }
  
  const expiresAt = new Date(user.passExpiresAt);
  const expiresTime = expiresAt.getTime();
  
  if (Number.isNaN(expiresTime)) {
    return true;
  }
  
  return expiresTime > Date.now();
}
