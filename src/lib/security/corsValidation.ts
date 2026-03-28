/**
 * CORS Validation & Headers
 * ═══════════════════════════════════════════════════════════════
 * 
 * OWASP A01: Broken Access Control
 * OWASP A05: Security Misconfiguration
 * 
 * Prevents CSRF attacks by validating request origins
 * Only allows requests from authorized domains
 */

import { DASHBOARD_URL, PLATFORM_URL, VERCEL_URLS } from '@constant/urls';
import { NextResponse } from 'next/server';
import { secureLog } from './secureLogger';

/**
 * Allowed origins for CORS requests
 * @see src/constants/urls.ts — Single source of truth for platform URLs
 */
const ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    PLATFORM_URL,
    DASHBOARD_URL,
    ...VERCEL_URLS,
].filter(Boolean) as string[]; // Remove undefined values

/**
 * CORS headers configuration
 */
export const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
} as const;

/**
 * Validate CORS origin
 * Returns true if origin is allowed, false otherwise
 */
export function validateCORSOrigin(origin: string | null): boolean {
    if (!origin) {
        // Allow same-origin requests (no Origin header)
        return true;
    }

    // Check if origin is in allowed list
    const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
        // Exact match
        if (origin === allowedOrigin) return true;

        // Allow subdomains for production domains (*.menulist.ai)
        if (allowedOrigin && origin.endsWith(allowedOrigin.replace('https://', ''))) {
            return true;
        }

        return false;
    });

    if (!isAllowed) {
        secureLog('[CORS] Blocked request from unauthorized origin', {
            origin,
            allowedOrigins: ALLOWED_ORIGINS
        });
    }

    return isAllowed;
}

/**
 * Add CORS headers to response
 * Use this in API route handlers
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *     const corsResponse = validateCORS(request);
 *     if (corsResponse) return corsResponse;
 *     
 *     // ... your API logic
 *     
 *     return addCORSHeaders(NextResponse.json(data), request);
 * }
 * ```
 */
export function addCORSHeaders(
    response: NextResponse,
    request: Request
): NextResponse {
    const origin = request.headers.get('origin');

    if (origin && validateCORSOrigin(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
    }

    // Add other CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // Add Vary header for caching
    response.headers.set('Vary', 'Origin');

    return response;
}

/**
 * Validate CORS and return error response if invalid
 * Returns null if CORS is valid, error response if invalid
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *     const corsError = validateCORS(request);
 *     if (corsError) return corsError;
 *     
 *     // ... your API logic
 * }
 * ```
 */
export function validateCORS(request: Request): NextResponse | null {
    const origin = request.headers.get('origin');

    // Allow same-origin requests
    if (!origin) return null;

    // Validate origin
    if (!validateCORSOrigin(origin)) {
        return NextResponse.json(
            { error: 'CORS policy: Origin not allowed' },
            { status: 403 }
        );
    }

    return null;
}

/**
 * Handle OPTIONS preflight requests
 * Use this to handle CORS preflight requests
 * 
 * @example
 * ```typescript
 * export async function OPTIONS(request: Request) {
 *     return handleCORSPreflight(request);
 * }
 * ```
 */
export function handleCORSPreflight(request: Request): NextResponse {
    const origin = request.headers.get('origin');

    // Validate origin
    if (origin && !validateCORSOrigin(origin)) {
        return new NextResponse(null, { status: 403 });
    }

    const response = new NextResponse(null, { status: 204 });

    if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
    }

    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    response.headers.set('Vary', 'Origin');

    return response;
}

/**
 * CORS middleware wrapper for API routes
 * Automatically handles CORS validation and preflight requests
 * 
 * @example
 * ```typescript
 * export const POST = withCORS(async (request: Request) => {
 *     // ... your API logic
 *     return NextResponse.json(data);
 * });
 * ```
 */
export function withCORS(
    handler: (request: Request) => Promise<NextResponse> | NextResponse
) {
    return async (request: Request): Promise<NextResponse> => {
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return handleCORSPreflight(request);
        }

        // Validate CORS
        const corsError = validateCORS(request);
        if (corsError) return corsError;

        // Call the actual handler
        const response = await handler(request);

        // Add CORS headers to response
        return addCORSHeaders(response, request);
    };
}
