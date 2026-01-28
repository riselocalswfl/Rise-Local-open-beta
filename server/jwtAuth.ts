import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d'; // 7 days - reasonable for mobile apps
const JWT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Cookie configuration
export const AUTH_COOKIE_NAME = 'auth_token';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: JWT_EXPIRATION_MS,
  path: '/',
};

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

export interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

export function generateToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Set auth cookie on response
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);
}

// Clear auth cookie
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
}

// Extract token from cookie OR Bearer header (for backwards compatibility)
export function extractBearerToken(req: Request): string | null {
  // First try cookie (more secure)
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  
  // Fall back to Bearer header (for API clients, mobile apps)
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
