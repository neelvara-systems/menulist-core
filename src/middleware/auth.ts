/**
 * API Route Authentication Middleware
 * ═══════════════════════════════════════════════════════════════
 * 
 * OWASP A01: Broken Access Control
 * OWASP A05: Security Misconfiguration
 * 
 * Security Features:
 * - CORS validation (prevents CSRF attacks)
 * - Authentication enforcement
 * - Role-based access control (RBAC)
 * - Session validation
 * - Security event logging
 * 
 * Usage:
 * import { withAuth } from '@middleware/auth';
 * export const GET = withAuth(async (req, session) => { ... });
 */

import { authOptions } from '@lib/auth';
import { logger } from '@lib/monitoring/logger';
import { addCORSHeaders, handleCORSPreflight, validateCORS } from '@lib/security/corsValidation';
import { secureError } from '@lib/security/secureLogger';
import { buildSecurityContext } from '@lib/security/securityContext';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export type AuthenticatedHandler = (
    request: NextRequest,
    session: any,
    params?: any
) => Promise<NextResponse>;

/**
 * Wraps API route handlers with authentication + CORS validation
 * 
 * Security Flow:
 * 1. Validate CORS origin (prevent CSRF)
 * 2. Handle OPTIONS preflight requests
 * 3. Authenticate user session
 * 4. Verify role-based permissions
 * 5. Execute handler
 * 6. Add CORS headers to response
 */
export function withAuth(handler: AuthenticatedHandler, options?: {
    requiredRole?: string;
    requiredPlatformRole?: 'OWNER' | 'USER' | 'PLATFORM' | 'RESELLER';
}) {
    return async (request: NextRequest, context?: { params: any }) => {
        try {
            // 1️⃣ CORS VALIDATION: Validate origin before any processing
            // Prevents CSRF attacks by rejecting unauthorized origins
            const corsError = validateCORS(request);
            if (corsError) {
                // Log security event to Sentry
                logger.security('CORS Validation Failed', {
                    origin: request.headers.get('origin'),
                    endpoint: request.nextUrl.pathname,
                    method: request.method,
                    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown',
                }, 'high'); // HIGH severity - potential CSRF attack

                return corsError;
            }

            // 2️⃣ HANDLE OPTIONS: Preflight requests (CORS)
            if (request.method === 'OPTIONS') {
                return handleCORSPreflight(request);
            }

            // 3️⃣ AUTHENTICATION: Get session from NextAuth
            const session = await getServerSession(authOptions);

            // Check if authenticated
            if (!session || !session.user) {
                // 🚨 Log authentication failure to Sentry
                logger.security('Authentication Failed', {
                    ...buildSecurityContext(null, request),
                    endpoint: request.nextUrl.pathname,
                    error: 'No valid session - authentication required',
                    method: request.method,
                }, 'medium');

                return NextResponse.json(
                    { error: 'Unauthorized', message: 'Authentication required' },
                    { status: 401 }
                );
            }

            // Check platform role if specified
            // PLATFORM role has access to everything (founder/superadmin fallback)
            if (options?.requiredPlatformRole) {
                if (session.user.platformRole !== options.requiredPlatformRole && session.user.platformRole !== 'PLATFORM') {
                    // 🚨 Log authorization failure to Sentry
                    logger.security('Authorization Failed - Platform Role', {
                        ...buildSecurityContext(session, request),
                        endpoint: request.nextUrl.pathname,
                        error: 'Insufficient platform permissions',
                        required: options.requiredPlatformRole,
                        actual: session.user.platformRole,
                        method: request.method,
                    }, 'high'); // HIGH - privilege escalation attempt

                    return NextResponse.json(
                        { error: 'Forbidden', message: 'Insufficient permissions' },
                        { status: 403 }
                    );
                }
            }

            // Check store role if specified
            if (options?.requiredRole) {
                if (session.user.role !== options.requiredRole) {
                    // 🚨 Log authorization failure to Sentry
                    logger.security('Authorization Failed - Store Role', {
                        ...buildSecurityContext(session, request),
                        endpoint: request.nextUrl.pathname,
                        error: 'Insufficient store permissions',
                        required: options.requiredRole,
                        actual: session.user.role,
                        method: request.method,
                    }, 'high'); // HIGH - privilege escalation attempt

                    return NextResponse.json(
                        { error: 'Forbidden', message: 'Insufficient permissions' },
                        { status: 403 }
                    );
                }
            }

            // 4️⃣ EXECUTE HANDLER: Call the actual API handler
            const response = await handler(request, session, context?.params);

            // 5️⃣ ADD CORS HEADERS: Add to successful responses
            return addCORSHeaders(response, request);
        } catch (error) {
            // ✅ SECURITY FIX: Use secure logging to prevent sensitive data leakage
            secureError('[Auth Middleware] Error', error as Error, {
                path: request.nextUrl.pathname,
                method: request.method
            });
            return NextResponse.json(
                { error: 'Internal Server Error' },
                { status: 500 }
            );
        }
    };
}

/**
 * Platform admin only routes
 */
export function withPlatformAuth(handler: AuthenticatedHandler) {
    return withAuth(handler, { requiredPlatformRole: 'PLATFORM' });
}

/**
 * Verify tenant/store ownership in request
 * CRITICAL: Prevents horizontal privilege escalation
 * 
 * @param session - User session
 * @param requestedTenantId - Tenant ID being accessed
 * @param requestedStoreId - Store ID being accessed (optional)
 * @param request - NextRequest for security logging (optional)
 * @returns true if access is allowed, false otherwise
 */
export function verifyTenantAccess(
    session: any,
    requestedTenantId: string | number,
    requestedStoreId?: string | number,
    request?: NextRequest
): boolean {
    // ✅ SECURITY FIX: Validate inputs are not null/undefined
    if (!session || session.tId == null || requestedTenantId == null) {
        return false;
    }

    // Normalize to strings for comparison (handles both string and number IDs)
    const sessionTenantId = String(session.tId);
    const requestTenantId = String(requestedTenantId);

    // Check tenant access
    if (sessionTenantId !== requestTenantId) {
        // 🚨 CRITICAL: Horizontal privilege escalation attempt detected!
        if (request) {
            logger.security('Horizontal Privilege Escalation Attempt - Tenant', {
                userId: session.user?.id || session.uId,
                email: session.user?.email,
                tenantId: session.tId,
                storeId: session.sId,
                userAgent: request.headers.get('user-agent') || 'unknown',
                ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                endpoint: request.nextUrl.pathname,
                error: 'User attempted to access different tenant data',
                attemptedTenantId: requestTenantId,
                sessionTenantId: sessionTenantId,
                method: request.method,
            }, 'critical'); // CRITICAL - privilege escalation!
        }
        return false;
    }

    // Check store access if provided
    if (requestedStoreId != null) {
        if (session.sId == null) {
            return false;
        }

        const sessionStoreId = String(session.sId);
        const requestStoreId = String(requestedStoreId);

        if (sessionStoreId !== requestStoreId) {
            // 🚨 CRITICAL: Store-level privilege escalation attempt!
            if (request) {
                logger.security('Horizontal Privilege Escalation Attempt - Store', {
                    userId: session.user?.id || session.uId,
                    email: session.user?.email,
                    tenantId: session.tId,
                    storeId: session.sId,
                    userAgent: request.headers.get('user-agent') || 'unknown',
                    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                    endpoint: request.nextUrl.pathname,
                    error: 'User attempted to access different store data',
                    attemptedStoreId: requestStoreId,
                    sessionStoreId: sessionStoreId,
                    method: request.method,
                }, 'critical'); // CRITICAL - privilege escalation!
            }
            return false;
        }
    }

    return true;
}

/**
 * Sanitize user input from session
 * Prevents injection through session data
 */
export function sanitizeSession(session: any): any {
    return {
        user: {
            id: session.user?.id,
            email: session.user?.email,
            name: session.user?.name
        },
        pId: session.pId,
        tId: session.tId,
        sId: session.sId,
        uId: session.uId,
        role: session.role,
        platformRole: session.platformRole
    };
}
