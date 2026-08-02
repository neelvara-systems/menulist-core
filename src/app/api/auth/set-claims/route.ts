export const dynamic = 'force-dynamic';
import { DEFAULT_PRODUCT_ID, PRODUCT_IDS, type ProductId } from '@constant/product';
import { ANSWERLATTICE_ALL_PERMISSIONS, type AnswerlatticePermissionKey, DEFAULT_ANSWERLATTICE_ROLE_IDS, DEFAULT_ANSWERLATTICE_ROLE_METADATA, normalizeAnswerlatticeRolePermissions, } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { ECOMSAI_PLATFORM_SUPPORT_USER_ROLE, ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { getBoundedAuthStringContext, logAuthDiagnostic, logAuthFailure } from '@lib/auth/authDiagnostics';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { findAnswerlatticeRole, normalizeAnswerlatticeRolesForStore, } from '@lib/answerlattice/accessControl';
import { getAnswerlatticeStaffClaimMembership, hasAnswerlatticeTenantAdminClaim, normalizeAnswerlatticeStaffClaimPlatformRole, readActiveAnswerlatticeStaffClaimState, } from '@lib/answerlattice/staffClaimsContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { getAuthUserByEmail, getUniqueAuthUserByEmailFromCollection, } from '@lib/auth/serverUserContext';
import { resolveSetClaimsRole, resolveSetClaimsWorkspaceFromStore } from '@lib/auth/setClaimsWorkspace';
import { shouldUseSharedAnswerlatticeFirebase } from '@lib/firebase/answerlatticeConfig';
import { answerlatticeAdminApp, answerlatticeAuthAdmin, answerlatticeFirestoreAdmin, requireAnswerlatticeAuthAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { authAdmin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { normalizeStorePermissionScopeDocumentId, type StorePermissionScopeDocumentId } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

/**
 * Set Firebase Auth Custom Claims & Create Custom Token
 * Called after NextAuth login to sync user data to Firebase Auth token
 * 
 * For Google OAuth users, creates a custom token they can use to sign in
 * 
 * SECURITY: OWASP A01 (Access Control) - Session required
 */

const SET_CLAIMS_MAX_BODY_BYTES = 2 * 1024;
const SET_CLAIMS_RATE_LIMIT_KEY = 'auth-set-claims';
const AUTH_CREDENTIAL_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
} as const;

const authJson = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    Object.entries(AUTH_CREDENTIAL_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return (NextResponse.json)(body, { ...init, headers });
};

const withCredentialResponseHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(AUTH_CREDENTIAL_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

const getSetClaimsEmailLogContext = (email: unknown) => getBoundedAuthStringContext('email', email);
const getSetClaimsUidLogContext = (uid: unknown) => getBoundedAuthStringContext('uid', uid);
const getSetClaimsUserLogContext = (userId: unknown) => getBoundedAuthStringContext('userId', userId);
const getSetClaimsTenantLogContext = (tenantId: unknown) => getBoundedAuthStringContext('tenantId', tenantId);
const getSetClaimsStoreLogContext = (storeId: unknown) => getBoundedAuthStringContext('storeId', storeId);

const getSetClaimsLogContext = (
    email: unknown,
    metadata: {
        productId?: unknown;
        role?: unknown;
        platformRole?: unknown;
        storeId?: unknown;
        storeIds?: unknown[];
        tenantId?: unknown;
        uid?: unknown;
        userId?: unknown;
    } = {},
) => ({
    ...getSetClaimsEmailLogContext(email),
    ...getSetClaimsUidLogContext(metadata.uid),
    ...getSetClaimsUserLogContext(metadata.userId),
    ...getSetClaimsTenantLogContext(metadata.tenantId),
    ...getSetClaimsStoreLogContext(metadata.storeId),
    ...getBoundedAuthStringContext('productId', metadata.productId),
    ...getBoundedAuthStringContext('role', metadata.role),
    ...getBoundedAuthStringContext('platformRole', metadata.platformRole),
    storeIdsCount: Array.isArray(metadata.storeIds) ? metadata.storeIds.length : undefined,
});

// Input validation schema
const setClaimsSchema = z.object({
    uid: z.string().optional().refine(
        val => !val || /^[a-zA-Z0-9_-]+$/.test(val),
        'Invalid UID format'
    ),
    targetStoreId: z.number().int().positive().optional(),
    productId: z.string().trim().max(12).optional(),
});

async function createAnswerlatticeCustomTokenIfNeeded(
    email: string,
    displayName: string | null | undefined,
    customClaims: Record<string, unknown>,
): Promise<string | null> {
    if (shouldUseSharedAnswerlatticeFirebase) return null;

    if (!answerlatticeAdminApp) {
        logAuthDiagnostic('answerlattice_firebase_admin_missing_for_auth_sync');
        return null;
    }

    let answerlatticeUid: string;

    try {
        const answerlatticeUser = await requireAnswerlatticeAuthAdmin().getUserByEmail(email);
        answerlatticeUid = answerlatticeUser.uid;
    } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') {
            logAuthFailure('answerlattice_user_lookup_failed_for_auth_sync', error, getSetClaimsEmailLogContext(email));
            throw error;
        }

        try {
            const newAnswerlatticeUser = await requireAnswerlatticeAuthAdmin().createUser({
                email,
                emailVerified: true,
                displayName: displayName || undefined,
            });
            answerlatticeUid = newAnswerlatticeUser.uid;
        } catch (createError: any) {
            if (createError?.code !== 'auth/email-already-exists') throw createError;
            answerlatticeUid = (await requireAnswerlatticeAuthAdmin().getUserByEmail(email)).uid;
        }
    }

    await requireAnswerlatticeAuthAdmin().setCustomUserClaims(answerlatticeUid, customClaims);
    return requireAnswerlatticeAuthAdmin().createCustomToken(answerlatticeUid, customClaims);
}

async function getAnswerlatticeAuthUserByEmail(email: string): Promise<any | null> {
    if (shouldUseSharedAnswerlatticeFirebase) return null;
    const db = answerlatticeFirestoreAdmin;
    if (!db) return null;

    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!normalizedEmail) return null;

    return getUniqueAuthUserByEmailFromCollection(
        db.collection(DB_COLLECTIONS.USERS),
        normalizedEmail,
    );
}

const getStoreIdsClaim = (dbUser: any): string[] => {
    const rawStoreIds = Array.isArray(dbUser?.storeIds)
        ? dbUser.storeIds
        : Array.isArray(dbUser?.stores)
            ? dbUser.stores.map((store: any) => store?.storeId)
            : [];

    const storeIds = rawStoreIds
        .filter((storeId: unknown) => storeId !== null && storeId !== undefined && storeId !== '')
        .map((storeId: unknown) => normalizeStorePermissionScopeDocumentId(storeId)?.documentId)
        .filter((storeId: string | undefined): storeId is string => Boolean(storeId));

    const primaryStoreScope = normalizeStorePermissionScopeDocumentId(dbUser?.storeId);
    if (primaryStoreScope) {
        storeIds.push(primaryStoreScope.documentId);
    }

    return Array.from(new Set(storeIds));
};

const normalizeEmail = (value: unknown) => String(value || '').toLowerCase().trim();

const canAccessStore = (dbUser: any, targetStoreId: number): boolean => {
    const targetStoreScope = normalizeStorePermissionScopeDocumentId(targetStoreId);
    if (!targetStoreScope) return false;

    const storeIds = getStoreIdsClaim(dbUser);
    return storeIds.some((storeId) => storeId === targetStoreScope.documentId);
};

const buildAnswerlatticeScopedFallbackUser = (
    fallbackDbUser: any,
    scope: { tenantId: number; storeId: number; role?: string } | null,
): any => {
    if (!fallbackDbUser || !scope) return fallbackDbUser;

    const role = scope.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    const stores = [{
        role,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
    }];

    return {
        ...fallbackDbUser,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role,
        tenantId: scope.tenantId,
        tId: scope.tenantId,
        storeId: scope.storeId,
        sId: scope.storeId,
        storeIds: [scope.storeId],
        stores,
    };
};

const resolveClaimStoreScope = (dbUser: any, targetStoreId?: number): StorePermissionScopeDocumentId | null => {
    const baseStoreScope = normalizeStorePermissionScopeDocumentId(dbUser?.storeId);
    const targetStoreScope = targetStoreId ? normalizeStorePermissionScopeDocumentId(targetStoreId) : null;

    if (!targetStoreScope || targetStoreScope.numericId === baseStoreScope?.numericId) {
        return baseStoreScope;
    }

    return targetStoreScope;
};

const buildAnswerlatticePermissionClaims = (permissions: Partial<Record<AnswerlatticePermissionKey, boolean>>) => (
    ANSWERLATTICE_ALL_PERMISSIONS.reduce((acc, permission) => {
        acc[permission] = permissions[permission] === true;
        return acc;
    }, {} as Record<AnswerlatticePermissionKey, boolean>)
);

const resolveAnswerlatticePermissionClaims = (params: {
    productId: ProductId;
    rawRoles: unknown;
    roleId: unknown;
    storeScope: StorePermissionScopeDocumentId;
    tenantId: number;
    platformRole: unknown;
}) => {
    if (params.productId !== PRODUCT_IDS.ANSWERLATTICE) return {};

    const rawRoleId = typeof params.roleId === 'string'
        ? params.roleId
        : DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    const normalizedRoleId = rawRoleId.trim();
    if (!normalizedRoleId || normalizedRoleId !== rawRoleId || normalizedRoleId.length > 120) {
        return buildAnswerlatticePermissionClaims({});
    }
    if (isPlatformSupportRole(params.platformRole) || normalizedRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
        return buildAnswerlatticePermissionClaims(DEFAULT_ANSWERLATTICE_ROLE_METADATA[DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER].permissions);
    }

    const defaultRole = Object.entries(DEFAULT_ANSWERLATTICE_ROLE_METADATA)
        .find(([roleId]) => roleId === normalizedRoleId)?.[1];
    let rolePermissions = defaultRole?.permissions || {};

    if (!defaultRole) {
        const roles = normalizeAnswerlatticeRolesForStore(
            params.rawRoles,
            params.tenantId,
            params.storeScope.numericId,
            'system',
        ).roles;
        rolePermissions = findAnswerlatticeRole(roles, normalizedRoleId)?.permissions || {};
    }

    return buildAnswerlatticePermissionClaims(normalizeAnswerlatticeRolePermissions(rolePermissions));
};

const normalizeProductId = (value: unknown): ProductId => {
    if (typeof value !== 'string') return DEFAULT_PRODUCT_ID;
    const normalized = value.trim().toUpperCase();
    return Object.values(PRODUCT_IDS).includes(normalized as ProductId)
        ? normalized as ProductId
        : DEFAULT_PRODUCT_ID;
};

const isPlatformSupportRole = (value: unknown): boolean => {
    const normalized = String(value || '').toUpperCase();
    return normalized === ECOMSAI_PLATFORM_USER_ROLE || normalized === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    try {
        if (!session?.user?.email) {
            return authJson(
                { error: 'Missing email in session' },
                { status: 400 }
            );
        }

        const sessionUserId = resolveCurrentSessionUserDocumentId(session);
        if (!sessionUserId) {
            return authJson({ error: 'Forbidden' }, { status: 403 });
        }
        const rateLimitConfig = getRateLimitForFeature('AUTH_CLAIM_SYNC');
        const setClaimsUserRateLimitHash = hashPublicRateLimitValue(sessionUserId);
        const rateLimit = await checkRateLimit({
            key: `${SET_CLAIMS_RATE_LIMIT_KEY}:${setClaimsUserRateLimitHash}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded - Set Claims', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: request.nextUrl.pathname,
                feature: 'AUTH_CLAIM_SYNC',
                limit: rateLimitConfig.limit,
                waitSeconds,
                window: rateLimitConfig.window,
            }, 'medium');

            return authJson(
                {
                    error: providerUnavailable
                        ? 'Authentication service is temporarily unavailable. Please try again.'
                        : 'Too many attempts. Please wait before trying again.',
                    retryAfter: waitSeconds,
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                    },
                },
            );
        }

        // Get Firebase UID from request body (optional - we'll create if needed).
        // Empty body is equivalent to `{}` for OAuth custom-token creation.
        const bodyResult = await readOptionalBoundedJsonBody(request, SET_CLAIMS_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
            tooLargeMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) {
            logAuthDiagnostic('set_claims_invalid_or_oversized_body', getSetClaimsEmailLogContext(session.user.email));
            return withCredentialResponseHeaders(bodyResult.response);
        }
        const body = bodyResult.data;

        // Validate input (OWASP A03: Injection Prevention)
        const validation = validateAPIInput(setClaimsSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logAuthDiagnostic('set_claims_invalid_input', {
                ...getSetClaimsEmailLogContext(session.user.email),
                validationErrorPresent: errorMsg.length > 0,
                validationErrorLength: errorMsg.length,
            });
            return authJson(
                { error: 'Invalid input' },
                { status: 400 }
            );
        }

        let { uid, targetStoreId } = validation.data;
        const requestedProductId = normalizeProductId(validation.data.productId);
        const shouldUseAnswerlatticeUserContext = requestedProductId === PRODUCT_IDS.ANSWERLATTICE && !shouldUseSharedAnswerlatticeFirebase;
        const answerlatticeSessionScope = shouldUseAnswerlatticeUserContext
            ? resolveAnswerlatticeSessionScope(session)
            : null;
        const effectiveTargetStoreId = shouldUseAnswerlatticeUserContext
            ? (targetStoreId || answerlatticeSessionScope?.storeId)
            : targetStoreId;

        const defaultDbUser = shouldUseAnswerlatticeUserContext
            ? await getAuthUserByEmail(session.user.email)
            : null;
        const sessionPlatformRole = resolveExactSessionPlatformRole(session);
        const defaultPlatformRole = (defaultDbUser as any)?.platformRole;
        const hasDefaultPlatformAccess = isPlatformSupportRole(sessionPlatformRole)
            && isPlatformSupportRole(defaultPlatformRole);

        const answerlatticeDbUser = shouldUseAnswerlatticeUserContext
            ? await getAnswerlatticeAuthUserByEmail(session.user.email)
            : null;
        const answerlatticeDbUserState = answerlatticeDbUser
            ? readActiveAnswerlatticeStaffClaimState(answerlatticeDbUser)
            : null;
        if (shouldUseAnswerlatticeUserContext && answerlatticeDbUser && !answerlatticeDbUserState) {
            logAuthDiagnostic('set_claims_inactive_answerlattice_auth_profile_rejected', {
                ...getSetClaimsEmailLogContext(session.user.email),
                ...getSetClaimsUserLogContext(answerlatticeDbUser.id),
            });
            return authJson({ error: 'Forbidden' }, { status: 403 });
        }
        const answerlatticeUserMatchesRequestedStore = answerlatticeDbUser && (
            !effectiveTargetStoreId
            || Boolean(getAnswerlatticeStaffClaimMembership(answerlatticeDbUserState, effectiveTargetStoreId))
        );
        const scopedDefaultUser = shouldUseAnswerlatticeUserContext
            ? buildAnswerlatticeScopedFallbackUser(defaultDbUser, answerlatticeSessionScope)
            : defaultDbUser;

        // Get user from the product-specific auth profile. Answerlattice has its own
        // Firebase project, so tenant/store claims must come from the Answerlattice
        // user doc when one exists. Platform/support access is preserved as a
        // platformRole overlay, not as a reason to mint Answerlattice tokens for the
        // default MenuList tenant.
        let dbUser: any = shouldUseAnswerlatticeUserContext && hasDefaultPlatformAccess && answerlatticeUserMatchesRequestedStore
            ? {
                ...answerlatticeDbUser,
                platformRole: defaultPlatformRole,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                productId: PRODUCT_IDS.ANSWERLATTICE,
            }
            : shouldUseAnswerlatticeUserContext && hasDefaultPlatformAccess && defaultDbUser
                ? scopedDefaultUser
                : shouldUseAnswerlatticeUserContext
                    ? answerlatticeDbUser
                    : await getAuthUserByEmail(session.user.email);

        if (!dbUser && shouldUseAnswerlatticeUserContext) {
            const fallbackDbUser: any = scopedDefaultUser || defaultDbUser || await getAuthUserByEmail(session.user.email);
            const fallbackPlatformRole = String(fallbackDbUser?.platformRole || '').toUpperCase();
            if (isPlatformSupportRole(fallbackPlatformRole)) {
                dbUser = buildAnswerlatticeScopedFallbackUser(fallbackDbUser, answerlatticeSessionScope);
            }
        }

        if (!dbUser) {
            return authJson(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const answerlatticeClaimState = shouldUseAnswerlatticeUserContext
            ? readActiveAnswerlatticeStaffClaimState(dbUser)
            : null;
        if (shouldUseAnswerlatticeUserContext && !answerlatticeClaimState) {
            return authJson({ error: 'Forbidden' }, { status: 403 });
        }
        const resolvedTargetStoreId = effectiveTargetStoreId
            || answerlatticeClaimState?.primaryMembership?.storeId;
        const canAccessTargetStore = resolvedTargetStoreId
            ? shouldUseAnswerlatticeUserContext
                ? Boolean(getAnswerlatticeStaffClaimMembership(answerlatticeClaimState, resolvedTargetStoreId))
                : canAccessStore(dbUser, resolvedTargetStoreId)
            : false;
        if (resolvedTargetStoreId && !hasDefaultPlatformAccess && !canAccessTargetStore) {
            logAuthDiagnostic('set_claims_store_switch_outside_user_stores_rejected', {
                ...getSetClaimsEmailLogContext(session.user.email),
                ...getSetClaimsStoreLogContext(resolvedTargetStoreId),
                ...getSetClaimsUserLogContext(dbUser.id),
            });
            return authJson({ error: 'Forbidden' }, { status: 403 });
        }
        const claimStoreScope = resolvedTargetStoreId && (hasDefaultPlatformAccess || canAccessTargetStore)
            ? normalizeStorePermissionScopeDocumentId(resolvedTargetStoreId)
            : resolveClaimStoreScope(dbUser, resolvedTargetStoreId);
        if (!claimStoreScope) {
            logAuthDiagnostic('set_claims_invalid_workspace_scope_rejected', {
                ...getSetClaimsEmailLogContext(session.user.email),
                ...getSetClaimsTenantLogContext(dbUser.tenantId ?? dbUser.tId),
                ...getSetClaimsStoreLogContext(dbUser.storeId),
                ...getSetClaimsUserLogContext(dbUser.id),
            });
            return authJson({ error: 'Forbidden' }, { status: 403 });
        }
        const claimsDb = shouldUseAnswerlatticeUserContext
            ? answerlatticeFirestoreAdmin
            : firestoreAdmin;
        if (!claimsDb || typeof (claimsDb as any).collection !== 'function') {
            logAuthDiagnostic('set_claims_product_firestore_unavailable', {
                ...getSetClaimsEmailLogContext(session.user.email),
                ...getBoundedAuthStringContext('productId', requestedProductId),
            });
            return authJson({ error: 'Authentication service is not available' }, { status: 503 });
        }
        const canonicalStoreSnapshot = await claimsDb
            .collection(DB_COLLECTIONS.STORES)
            .doc(claimStoreScope.documentId)
            .get();
        const canonicalWorkspace = canonicalStoreSnapshot.exists
            ? resolveSetClaimsWorkspaceFromStore({
                dbUserTenantId: dbUser.tenantId ?? dbUser.tId,
                hasPlatformAccess: hasDefaultPlatformAccess,
                storeData: canonicalStoreSnapshot.data(),
                storeDocumentId: canonicalStoreSnapshot.id,
            })
            : null;
        if (!canonicalWorkspace) {
            logAuthDiagnostic('set_claims_canonical_workspace_rejected', {
                ...getSetClaimsEmailLogContext(session.user.email),
                ...getSetClaimsTenantLogContext(dbUser.tenantId ?? dbUser.tId),
                ...getSetClaimsStoreLogContext(claimStoreScope.documentId),
                ...getSetClaimsUserLogContext(dbUser.id),
            });
            return authJson({ error: 'Forbidden' }, { status: 403 });
        }
        const claimTenantScope = canonicalWorkspace.tenantScope;

        // A Firebase store claim must come from the exact current membership.
        // Account-level role/platformRole fields cannot supply store authority.
        const storeRole = shouldUseAnswerlatticeUserContext
            ? getAnswerlatticeStaffClaimMembership(answerlatticeClaimState, claimStoreScope.numericId)?.role
            : Array.isArray(dbUser.stores)
                ? dbUser.stores.find((store: any) => (
                    normalizeStorePermissionScopeDocumentId(store?.storeId)?.numericId === claimStoreScope.numericId
                ))?.role
                : undefined;
        const userRole = resolveSetClaimsRole({
            hasPlatformAccess: hasDefaultPlatformAccess,
            userRole: storeRole,
        });
        if (!userRole) {
            logAuthDiagnostic('set_claims_missing_or_privileged_store_role_rejected', {
                ...getSetClaimsEmailLogContext(session.user.email),
                ...getSetClaimsStoreLogContext(claimStoreScope.documentId),
                ...getSetClaimsUserLogContext(dbUser.id),
            });
            return authJson({ error: 'Forbidden' }, { status: 403 });
        }
        const productId = shouldUseAnswerlatticeUserContext
            ? PRODUCT_IDS.ANSWERLATTICE
            : normalizeProductId(dbUser.pId || dbUser.productId);
        const answerlatticePermissionClaims = resolveAnswerlatticePermissionClaims({
            productId,
            rawRoles: canonicalStoreSnapshot.data()?.answerlatticeRoles,
            roleId: userRole,
            storeScope: claimStoreScope,
            tenantId: claimTenantScope.numericId,
            platformRole: productId === PRODUCT_IDS.ANSWERLATTICE
                ? normalizeAnswerlatticeStaffClaimPlatformRole(dbUser.platformRole)
                : dbUser.platformRole,
        });
        const platformRole = productId === PRODUCT_IDS.ANSWERLATTICE
            ? normalizeAnswerlatticeStaffClaimPlatformRole(dbUser.platformRole)
            : dbUser.platformRole || 'USER';

        const customClaims = {
            ...(productId === PRODUCT_IDS.ANSWERLATTICE ? {
                accessRevision: answerlatticeClaimState?.accessRevision || 0,
            } : {}),
            pId: productId,
            role: userRole,
            platformRole,
            tenantId: claimTenantScope.documentId,
            storeId: claimStoreScope.documentId,
            uId: dbUser.id,
            admin: hasAnswerlatticeTenantAdminClaim(userRole, dbUser.platformRole),
            storeIds: productId === PRODUCT_IDS.ANSWERLATTICE
                ? [claimStoreScope.documentId]
                : Array.from(new Set([
                    ...getStoreIdsClaim(dbUser),
                    claimStoreScope.documentId,
                ])),
            ...answerlatticePermissionClaims,
        };
        let validatedDefaultFirebaseUser: Awaited<ReturnType<typeof authAdmin.getUser>> | null = null;
        if (uid) {
            validatedDefaultFirebaseUser = await authAdmin.getUser(uid);
            if (normalizeEmail(validatedDefaultFirebaseUser.email) !== normalizeEmail(session.user.email)) {
                logAuthDiagnostic('set_claims_uid_email_mismatch_rejected', {
                    ...getSetClaimsEmailLogContext(session.user.email),
                    ...getSetClaimsUidLogContext(uid),
                });
                return authJson({ error: 'Forbidden' }, { status: 403 });
            }
        }

        let answerlatticeCustomToken: string | null = null;
        if (shouldUseAnswerlatticeUserContext) {
            try {
                answerlatticeCustomToken = await createAnswerlatticeCustomTokenIfNeeded(
                    session.user.email,
                    session.user.name,
                    customClaims,
                );
            } catch (error) {
                logAuthFailure('answerlattice_firebase_custom_token_sync_failed', error, {
                    ...getSetClaimsLogContext(session.user.email, {
                        productId,
                        role: customClaims.role,
                        platformRole: customClaims.platformRole,
                        storeId: claimStoreScope.documentId,
                        tenantId: customClaims.tenantId,
                        userId: customClaims.uId,
                    }),
                });
                return authJson(
                    { error: 'Answerlattice Firebase Auth is not available' },
                    { status: 503 }
                );
            }
        }

        // If UID provided, set claims on existing user
        if (uid) {
            if (!validatedDefaultFirebaseUser) {
                logAuthDiagnostic('set_claims_uid_validation_state_missing', {
                    ...getSetClaimsEmailLogContext(session.user.email),
                    ...getSetClaimsUidLogContext(uid),
                });
                return authJson({ error: 'Forbidden' }, { status: 403 });
            }
            await authAdmin.setCustomUserClaims(uid, customClaims);
            const customToken = await authAdmin.createCustomToken(uid, customClaims);

            logAuthDiagnostic('set_claims_existing_firebase_user_synced', {
                ...getSetClaimsLogContext(session.user.email, {
                    productId,
                    role: customClaims.role,
                    platformRole: customClaims.platformRole,
                    storeId: customClaims.storeId,
                    storeIds: customClaims.storeIds,
                    tenantId: customClaims.tenantId,
                    uid,
                    userId: customClaims.uId,
                }),
            });

            return authJson({
                success: true,
                customToken,
                claims: customClaims,
                answerlatticeCustomToken,
            });
        }

        // No UID - create custom token for OAuth users
        // Try to get or create Firebase user by email
        try {
            const firebaseUser = await authAdmin.getUserByEmail(session.user.email);
            uid = firebaseUser.uid;
        } catch (error: any) {
            if (error?.code !== 'auth/user-not-found') {
                logAuthFailure('firebase_user_lookup_failed_during_auth_sync', error, getSetClaimsEmailLogContext(session.user.email));
                throw error;
            }

            try {
                const newUser = await authAdmin.createUser({
                    email: session.user.email,
                    emailVerified: true,
                    displayName: session.user.name || undefined,
                });
                uid = newUser.uid;
            } catch (createError: any) {
                if (createError?.code !== 'auth/email-already-exists') throw createError;
                uid = (await authAdmin.getUserByEmail(session.user.email)).uid;
            }
            logAuthDiagnostic('firebase_auth_user_created_for_oauth_login', {
                ...getSetClaimsEmailLogContext(session.user.email),
                ...getSetClaimsUidLogContext(uid),
            });
        }

        // Set custom claims
        await authAdmin.setCustomUserClaims(uid, customClaims);

        // Create custom token for client to sign in with
        const customToken = await authAdmin.createCustomToken(uid, customClaims);

        logAuthDiagnostic('set_claims_oauth_custom_token_created', {
            ...getSetClaimsLogContext(session.user.email, {
                productId,
                role: customClaims.role,
                platformRole: customClaims.platformRole,
                storeId: customClaims.storeId,
                storeIds: customClaims.storeIds,
                tenantId: customClaims.tenantId,
                uid,
                userId: customClaims.uId,
            }),
        });

        return authJson({
            success: true,
            customToken,  // Client can use this to sign in
            answerlatticeCustomToken,
            claims: customClaims
        });

    } catch (error) {
        logAuthFailure('set_claims_failed', error, getSetClaimsEmailLogContext(session?.user?.email));
        return authJson(
            { error: 'Failed to set custom claims' },
            { status: 500 }
        );
    }
});
