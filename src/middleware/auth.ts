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
import { withAuthPrivateHeaders } from '@lib/auth/authApiResponse';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import {
    resolveExactSessionPlatformRole,
    resolveExactSessionStoreRole,
} from '@lib/auth/sessionPlatformRole';
import { logger } from '@lib/monitoring/logger';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { addCORSHeaders, handleCORSPreflight, validateCORS } from '@lib/security/corsValidation';
import { secureError } from '@lib/security/secureLogger';
import {
    getBoundedSecurityRouteContext,
    getBoundedSecurityStringContext,
} from '@lib/security/securityDiagnostics';
import {
    normalizeStorePermissionScopeDocumentId,
    resolveStorePermissionSessionScope,
} from '@lib/permissions/scopeDocumentId';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export type AuthenticatedHandler = (
    request: NextRequest,
    session: any,
    params?: any
) => Promise<NextResponse>;

type AuthenticatedRouteContext = {
    params: Promise<Record<string, string | string[] | undefined>>;
};

const authenticatedErrorJson = (body: Record<string, string>, status: number) => (
    withAuthPrivateHeaders(NextResponse.json(body, { status }))
);

const getSessionAccessDeniedReason = (session: any): string | null => {
    const user = session?.user || {};
    if (user.deleted === true) return 'Deleted account attempted to access protected API';
    if (user.active === false) return 'Inactive account attempted to access protected API';
    if (user.isVerified === false) return 'Unverified account attempted to access protected API';
    if (isPlatformEntityBlocked(user)) return 'Blocked account attempted to access protected API';
    return null;
};

const getAuthMiddlewareSecurityContext = (
    session: any,
    request: NextRequest,
    extra: Record<string, unknown> = {},
) => ({
    ...getBoundedSecurityRouteContext(session, request),
    ...getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname),
    ...getBoundedSecurityStringContext('method', request.method),
    ...Object.entries(extra).reduce<Record<string, boolean | number | string | null | undefined>>((acc, [key, value]) => ({
        ...acc,
        ...getBoundedSecurityStringContext(key, value),
    }), {}),
});

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
    return async (request: NextRequest, context: AuthenticatedRouteContext) => {
        try {
            // 1️⃣ CORS VALIDATION: Validate origin before any processing
            // Prevents CSRF attacks by rejecting unauthorized origins
            const corsError = validateCORS(request);
            if (corsError) {
                // Log security event to Sentry
                logger.security('CORS Validation Failed', {
                    ...getAuthMiddlewareSecurityContext(null, request, {
                        origin: request.headers.get('origin'),
                    }),
                }, 'high'); // HIGH severity - potential CSRF attack

                return withAuthPrivateHeaders(corsError);
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
                    ...getAuthMiddlewareSecurityContext(null, request, {
                        reason: 'No valid session - authentication required',
                    }),
                }, 'medium');

                return authenticatedErrorJson(
                    { error: 'Unauthorized', message: 'Authentication required' },
                    401,
                );
            }

            const sessionAccessDeniedReason = getSessionAccessDeniedReason(session);
            if (sessionAccessDeniedReason) {
                logger.security('Authorization Failed - Account Access Ended', {
                    ...getAuthMiddlewareSecurityContext(session, request, {
                        reason: sessionAccessDeniedReason,
                    }),
                }, 'high');

                return authenticatedErrorJson(
                    { error: 'Forbidden', message: 'Account access has ended' },
                    403,
                );
            }
            const sessionUserId = resolveCurrentSessionUserDocumentId(session);
            if (!sessionUserId) {
                logger.security('Authorization Failed - Actor Identity', {
                    ...getAuthMiddlewareSecurityContext(session, request, {
                        reason: 'Missing or conflicting actor identity',
                    }),
                }, 'high');

                return authenticatedErrorJson(
                    { error: 'Forbidden', message: 'Invalid session identity' },
                    403,
                );
            }

            // Check platform role if specified
            // PLATFORM role has access to everything (founder/superadmin fallback)
            if (options?.requiredPlatformRole) {
                const sessionPlatformRole = resolveExactSessionPlatformRole(session);
                if (
                    !sessionPlatformRole
                    || (
                        sessionPlatformRole !== options.requiredPlatformRole
                        && sessionPlatformRole !== 'PLATFORM'
                    )
                ) {
                    // 🚨 Log authorization failure to Sentry
                    logger.security('Authorization Failed - Platform Role', {
                        ...getAuthMiddlewareSecurityContext(session, request, {
                            actualPlatformRole: sessionPlatformRole,
                            reason: 'Insufficient platform permissions',
                            requiredPlatformRole: options.requiredPlatformRole,
                        }),
                    }, 'high'); // HIGH - privilege escalation attempt

                    return authenticatedErrorJson(
                        { error: 'Forbidden', message: 'Insufficient permissions' },
                        403,
                    );
                }
            }

            // Check store role if specified
            if (options?.requiredRole) {
                const sessionStoreRole = resolveExactSessionStoreRole(session);
                if (sessionStoreRole !== options.requiredRole) {
                    // 🚨 Log authorization failure to Sentry
                    logger.security('Authorization Failed - Store Role', {
                        ...getAuthMiddlewareSecurityContext(session, request, {
                            actualRole: sessionStoreRole,
                            reason: 'Insufficient store permissions',
                            requiredRole: options.requiredRole,
                        }),
                    }, 'high'); // HIGH - privilege escalation attempt

                    return authenticatedErrorJson(
                        { error: 'Forbidden', message: 'Insufficient permissions' },
                        403,
                    );
                }
            }

            // 4️⃣ EXECUTE HANDLER: Call the actual API handler
            // Next.js route params are asynchronous. Resolve them at the shared
            // boundary so every authenticated handler receives the plain object
            // that its validation and tenant-scope checks expect.
            const routeParams = context ? await context.params : undefined;
            const response = await handler(request, session, routeParams);

            // 5️⃣ ADD CORS HEADERS: Add to successful responses
            return addCORSHeaders(withAuthPrivateHeaders(response), request);
        } catch (error) {
            // ✅ SECURITY FIX: Use secure logging to prevent sensitive data leakage
            secureError('[Auth Middleware] Error', error as Error, {
                ...getBoundedSecurityStringContext('path', request.nextUrl.pathname),
                ...getBoundedSecurityStringContext('method', request.method),
            });
            return authenticatedErrorJson(
                { error: 'Internal Server Error' },
                500,
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
    const sessionScope = resolveStorePermissionSessionScope(session);
    const requestTenantScope = normalizeStorePermissionScopeDocumentId(requestedTenantId);
    if (!sessionScope || !requestTenantScope) return false;
    const sessionTenantId = sessionScope.tenantScope.documentId;
    const requestTenantId = requestTenantScope.documentId;

    // Check tenant access
    if (sessionTenantId !== requestTenantId) {
        // 🚨 CRITICAL: Horizontal privilege escalation attempt detected!
        if (request) {
            logger.security('Horizontal Privilege Escalation Attempt - Tenant', {
                ...getAuthMiddlewareSecurityContext(session, request, {
                    attemptedTenantId: requestTenantId,
                    reason: 'User attempted to access different tenant data',
                    sessionTenantId,
                }),
            }, 'critical'); // CRITICAL - privilege escalation!
        }
        return false;
    }

    // Check store access if provided
    if (requestedStoreId != null) {
        const requestStoreScope = normalizeStorePermissionScopeDocumentId(requestedStoreId);
        if (!requestStoreScope) return false;
        const sessionStoreId = sessionScope.storeScope.documentId;
        const requestStoreId = requestStoreScope.documentId;

        if (sessionStoreId !== requestStoreId) {
            // 🚨 CRITICAL: Store-level privilege escalation attempt!
            if (request) {
                logger.security('Horizontal Privilege Escalation Attempt - Store', {
                    ...getAuthMiddlewareSecurityContext(session, request, {
                        attemptedStoreId: requestStoreId,
                        reason: 'User attempted to access different store data',
                        sessionStoreId,
                    }),
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
    const user = session?.user || {};

    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        },
        pId: session.pId,
        tId: session.tId,
        sId: session.sId,
        uId: session.uId,
        role: session.role,
        platformRole: session.platformRole
    };
}
