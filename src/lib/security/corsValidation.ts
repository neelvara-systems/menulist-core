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

import { DASHBOARD_URL, PLATFORM_URL } from '@constant/urls';
import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';
import { NextResponse } from 'next/server';
import { getBoundedSecurityStringContext, logSecurityDiagnostic } from './securityDiagnostics';

const parseOrigin = (value: string | null): URL | null => {
    if (!value) return null;

    try {
        return new URL(value);
    } catch {
        return null;
    }
};

const isProductionRuntime = process.env.NODE_ENV === 'production';
const LOCAL_DEVELOPMENT_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

const isLocalDevelopmentOrigin = (origin: string): boolean => {
    const originUrl = parseOrigin(origin);
    if (!originUrl) return false;

    return originUrl.hostname === 'localhost'
        || originUrl.hostname === '127.0.0.1'
        || originUrl.hostname === '::1'
        || originUrl.hostname.startsWith('192.168.');
};

/**
 * Allowed origins for CORS requests
 * @see src/constants/urls.ts — Single source of truth for platform URLs
 */
const ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(!isProductionRuntime ? LOCAL_DEVELOPMENT_ORIGINS : []),
    PLATFORM_URL,
    DASHBOARD_URL,
].filter((origin): origin is string => (
    typeof origin === 'string'
    && origin.length > 0
    && (!isProductionRuntime || !isLocalDevelopmentOrigin(origin))
));

const isConfiguredOriginAllowed = (origin: string, allowedOrigin: string): boolean => {
    const originUrl = parseOrigin(origin);
    const allowedUrl = parseOrigin(allowedOrigin);
    if (!originUrl || !allowedUrl) return false;

    if (originUrl.origin === allowedUrl.origin) return true;

    const sameProtocolAndPort = originUrl.protocol === allowedUrl.protocol && originUrl.port === allowedUrl.port;
    const isHttpsSubdomain = originUrl.protocol === 'https:'
        && allowedUrl.protocol === 'https:'
        && originUrl.hostname.endsWith(`.${allowedUrl.hostname}`);

    return sameProtocolAndPort && isHttpsSubdomain;
};

const getCorsOriginDiagnosticContext = (origin: string) => {
    const originUrl = parseOrigin(origin);

    return {
        allowedOriginCount: ALLOWED_ORIGINS.length,
        originHasCredentials: Boolean(originUrl?.username || originUrl?.password),
        originHasExplicitProtocol: /^[a-z][a-z0-9+.-]*:\/\//i.test(origin),
        originHttps: originUrl?.protocol === 'https:',
        originHttp: originUrl?.protocol === 'http:',
        originParseable: Boolean(originUrl),
        ...getBoundedSecurityStringContext('origin', origin),
    };
};

const normalizeHttpProtocol = (value: string | null): 'http' | 'https' | null => {
    if (value === 'http' || value === 'https') return value;
    return null;
};

const getRequestHostOrigin = (request: Request): string | null => {
    const requestAuthority = normalizeRequestAuthority(request.headers.get('host'));
    if (!requestAuthority) return null;

    const requestUrl = new URL(request.url);
    const forwardedProtocol = normalizeHttpProtocol(request.headers.get('x-forwarded-proto'));
    const requestProtocol = normalizeHttpProtocol(requestUrl.protocol.replace(/:$/, ''));
    const protocol = forwardedProtocol || requestProtocol;
    if (!protocol) return null;

    return `${protocol}://${requestAuthority.authority}`;
};

const isSameOriginRequest = (request: Request, origin: string | null): boolean => {
    const originUrl = parseOrigin(origin);
    if (!originUrl) return false;

    try {
        const requestUrl = new URL(request.url);
        if (originUrl.origin === requestUrl.origin) return true;

        const requestHostOrigin = getRequestHostOrigin(request);
        return Boolean(requestHostOrigin && originUrl.origin === requestHostOrigin);
    } catch {
        return false;
    }
};

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
    const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => isConfiguredOriginAllowed(origin, allowedOrigin));

    if (!isAllowed) {
        logSecurityDiagnostic('cors_origin_blocked', getCorsOriginDiagnosticContext(origin));
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

    if (origin && (isSameOriginRequest(request, origin) || validateCORSOrigin(origin))) {
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

    // Same-origin requests are allowed even on domain-routed local tenants.
    if (isSameOriginRequest(request, origin)) return null;

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
    if (origin && !isSameOriginRequest(request, origin) && !validateCORSOrigin(origin)) {
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
export function withCORS<TRequest extends Request>(
    handler: (request: TRequest) => Promise<NextResponse> | NextResponse
): (request: TRequest) => Promise<NextResponse> {
    return async (request: TRequest): Promise<NextResponse> => {
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
