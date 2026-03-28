/**
 * Security Context Helper
 * Extracts common user and request context for security logging
 * Reduces code duplication across all security checks
 */

import { Session } from "next-auth";

/**
 * Extract user context from session
 * Returns user identification fields for security logging
 */
export function getUserContext(session: Session | null) {
    if (!session?.user) {
        return {
            userId: 'anonymous',
            email: 'unknown',
            tenantId: 'unknown',
            storeId: 'unknown',
        };
    }

    return {
        userId: session.user.id,
        email: session.user.email,
        tenantId: session.user.tenantId,
        storeId: session.user.storeId,
    };
}

/**
 * Extract request metadata (IP, user agent)
 * Returns request context for security logging
 */
export function getRequestContext(request: Request) {
    return {
        userAgent: request.headers.get('user-agent') || 'unknown',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    };
}

/**
 * Build complete security context from session and request
 * One-liner to get all common fields
 * 
 * @example
 * ```typescript
 * const context = buildSecurityContext(session, request);
 * logger.security('Input Validation Failed', {
 *     ...context,
 *     endpoint: '/api/descriptions',
 *     error: errorMsg,
 *     attemptedData: { ... }
 * }, 'medium');
 * ```
 */
export function buildSecurityContext(session: Session | null, request: Request) {
    return {
        ...getUserContext(session),
        ...getRequestContext(request),
    };
}

/**
 * Alternative: Build security event payload with common structure
 * Enforces consistent structure across all security logs
 * 
 * @example
 * ```typescript
 * const payload = buildSecurityPayload({
 *     session,
 *     request,
 *     endpoint: '/api/descriptions',
 *     error: errorMsg,
 *     attemptedData: { ... }
 * });
 * logger.security('Input Validation Failed', payload, 'medium');
 * ```
 */
export function buildSecurityPayload(params: {
    session: Session | null;
    request: Request;
    endpoint: string;
    error: string;
    attemptedData: Record<string, any>;
}) {
    const { session, request, endpoint, error, attemptedData } = params;

    return {
        endpoint,
        // User identification
        ...getUserContext(session),
        // Error details
        error,
        attemptedData,
        // Request metadata
        ...getRequestContext(request),
    };
}
