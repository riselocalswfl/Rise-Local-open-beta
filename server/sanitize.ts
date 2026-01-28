/**
 * Server-side input sanitization utilities for XSS prevention
 */

/**
 * Sanitize a URL to prevent XSS attacks via javascript: or data: protocols
 * STRICTLY allows only http://, https://, mailto:, and tel: protocols
 * All other protocols are blocked and return empty string
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';
  
  const lowerUrl = trimmedUrl.toLowerCase();
  
  // Strictly enforce whitelist - only allow these protocols
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:'];
  const hasSafeProtocol = safeProtocols.some(p => lowerUrl.startsWith(p));
  
  if (hasSafeProtocol) {
    return trimmedUrl;
  }
  
  // Allow relative URLs (start with /)
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }
  
  // Check if URL contains a protocol (has : before any /)
  const colonIndex = trimmedUrl.indexOf(':');
  const slashIndex = trimmedUrl.indexOf('/');
  const hasUnknownProtocol = colonIndex > 0 && (slashIndex === -1 || colonIndex < slashIndex);
  
  if (hasUnknownProtocol) {
    // Block any URL with an unsupported protocol
    console.warn(`[Security] Blocked URL with unsupported protocol: ${trimmedUrl.substring(0, 50)}`);
    return '';
  }
  
  // No protocol - assume https for URLs that look like domains
  if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
    return `https://${trimmedUrl}`;
  }
  
  // Block anything else that doesn't fit the pattern
  return '';
}

/**
 * Sanitize text content by removing HTML tags and script content
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  
  // Remove script tags and their content
  let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  return sanitized.trim();
}

/**
 * Sanitize an object's string values recursively
 * Useful for sanitizing request bodies before storage
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, options?: {
  urlFields?: string[];
  skipFields?: string[];
}): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const urlFields = options?.urlFields || ['website', 'instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'logoUrl', 'bannerUrl', 'imageUrl'];
  const skipFields = options?.skipFields || ['password', 'passwordHash', 'token'];
  
  const result = { ...obj };
  
  for (const key of Object.keys(result)) {
    const value = result[key];
    
    // Skip specified fields
    if (skipFields.includes(key)) continue;
    
    if (typeof value === 'string') {
      if (urlFields.includes(key)) {
        // Sanitize URLs
        (result as any)[key] = sanitizeUrl(value);
      } else {
        // Sanitize text (remove HTML tags)
        (result as any)[key] = sanitizeText(value);
      }
    } else if (Array.isArray(value)) {
      // Recursively sanitize array elements
      (result as any)[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? sanitizeObject(item, options) 
          : typeof item === 'string' 
            ? sanitizeText(item)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      (result as any)[key] = sanitizeObject(value, options);
    }
  }
  
  return result;
}
