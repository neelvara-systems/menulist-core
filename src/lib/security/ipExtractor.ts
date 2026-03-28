/**
 * IP Address Extraction Utility
 * ═══════════════════════════════════════════════════════════════
 * 
 * Simple utility to extract client IP from request headers
 * Handles proxies (X-Forwarded-For), Nginx (X-Real-IP), and Cloudflare
 */

import { NextRequest } from 'next/server';

/**
 * Extract client IP and User-Agent from request
 * 
 * Usage in security logging:
 * ```typescript
 * const metadata = getRequestMetadata(request);
 * await logSuccessfulLogin(email, metadata);
 * ```
 */
export function getRequestMetadata(request: NextRequest): {
    ip: string | null;
    userAgent: string | null;
} {
    // Extract IP (check multiple headers for proxy support)
    let ip: string | null = null;
    
    // 1. X-Forwarded-For (most common with proxies/load balancers)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        ip = forwarded.split(',')[0].trim(); // First IP is the client
    }
    
    // 2. X-Real-IP (Nginx)
    if (!ip) {
        ip = request.headers.get('x-real-ip');
    }
    
    // 3. CF-Connecting-IP (Cloudflare)
    if (!ip) {
        ip = request.headers.get('cf-connecting-ip');
    }
    
    // Extract User-Agent
    const userAgent = request.headers.get('user-agent');
    
    return {
        ip: ip || null,
        userAgent: userAgent || null
    };
}
