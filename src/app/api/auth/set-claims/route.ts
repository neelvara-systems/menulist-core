export const dynamic = 'force-dynamic';
import { DEFAULT_PRODUCT_ID, PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    type AnswerlatticePermissionKey,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    DEFAULT_ANSWERLATTICE_ROLE_METADATA,
    normalizeAnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { ECOMSAI_PLATFORM_SUPPORT_USER_ROLE, ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { getAuthUserByEmail } from '@lib/auth/serverUserContext';
import { shouldUseSharedAnswerlatticeFirebase } from '@lib/firebase/answerlatticeConfig';
import { answerlatticeAdminApp, answerlatticeAuthAdmin, answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { authAdmin } from '@lib/firebase/firebaseAdmin';
import { validateAPIInput } from '@lib/security/inputValidation';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
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

// Input validation schema
const setClaimsSchema = z.object({
    uid: z.string().optional().refine(
        val => !val || /^[a-zA-Z0-9_-]+$/.test(val),
        'Invalid UID format'
    ),
    targetStoreId: z.number().int().positive().optional(),
    productId: z.string().trim().max(12).optional(),
});

async function readSetClaimsBody(request: NextRequest): Promise<unknown | null> {
    const rawBody = await request.text();
    if (!rawBody.trim()) return {};

    try {
        return JSON.parse(rawBody);
    } catch {
        return null;
    }
}

async function createAnswerlatticeCustomTokenIfNeeded(
    email: string,
    displayName: string | null | undefined,
    customClaims: Record<string, unknown>,
): Promise<string | null> {
    if (shouldUseSharedAnswerlatticeFirebase) return null;

    if (!answerlatticeAdminApp) {
        secureLog('[Auth] Answerlattice Firebase Admin not configured for separate auth sync');
        return null;
    }

    let answerlatticeUid: string;

    try {
        const answerlatticeUser = await answerlatticeAuthAdmin.getUserByEmail(email);
        answerlatticeUid = answerlatticeUser.uid;
    } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') {
            secureError('[Auth] Answerlattice user lookup failed during auth sync', error, { email });
            throw error;
        }

        const newAnswerlatticeUser = await answerlatticeAuthAdmin.createUser({
            email,
            emailVerified: true,
            displayName: displayName || undefined,
        });
        answerlatticeUid = newAnswerlatticeUser.uid;
    }

    await answerlatticeAuthAdmin.setCustomUserClaims(answerlatticeUid, customClaims);
    return answerlatticeAuthAdmin.createCustomToken(answerlatticeUid, customClaims);
}

async function getAnswerlatticeAuthUserByEmail(email: string): Promise<any | null> {
    if (shouldUseSharedAnswerlatticeFirebase) return null;
    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') return null;

    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!normalizedEmail) return null;

    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

const getStoreIdsClaim = (dbUser: any): string[] => {
    const rawStoreIds = Array.isArray(dbUser?.storeIds)
        ? dbUser.storeIds
        : Array.isArray(dbUser?.stores)
            ? dbUser.stores.map((store: any) => store?.storeId)
            : [];

    const storeIds = rawStoreIds
        .filter((storeId: unknown) => storeId !== null && storeId !== undefined && storeId !== '')
        .map((storeId: unknown) => String(storeId));

    if (dbUser?.storeId !== null && dbUser?.storeId !== undefined && dbUser?.storeId !== '') {
        storeIds.push(String(dbUser.storeId));
    }

    return Array.from(new Set(storeIds));
};

const normalizeEmail = (value: unknown) => String(value || '').toLowerCase().trim();

const canAccessStore = (dbUser: any, targetStoreId: number): boolean => {
    const storeIds = getStoreIdsClaim(dbUser);
    return storeIds.some((storeId) => Number(storeId) === Number(targetStoreId));
};

const resolveClaimStoreId = (dbUser: any, targetStoreId?: number): number => {
    const baseStoreId = Number(dbUser?.storeId);
    if (!targetStoreId || Number(targetStoreId) === baseStoreId) {
        return baseStoreId;
    }

    return Number(targetStoreId);
};

const hasTenantAdminClaim = (role: unknown, platformRole: unknown): boolean => {
    const normalizedRole = String(role || '').toLowerCase();
    const normalizedPlatformRole = String(platformRole || '').toUpperCase();

    return normalizedPlatformRole === 'PLATFORM'
        || normalizedRole === 'platform'
        || normalizedRole === 'owner';
};

const buildAnswerlatticePermissionClaims = (permissions: Partial<Record<AnswerlatticePermissionKey, boolean>>) => (
    ANSWERLATTICE_ALL_PERMISSIONS.reduce((acc, permission) => {
        acc[permission] = permissions[permission] === true;
        return acc;
    }, {} as Record<AnswerlatticePermissionKey, boolean>)
);

const resolveAnswerlatticePermissionClaims = async (params: {
    productId: ProductId;
    roleId: unknown;
    storeId: number;
    platformRole: unknown;
}) => {
    if (params.productId !== PRODUCT_IDS.ANSWERLATTICE) return {};

    const normalizedRoleId = String(params.roleId || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF).trim().toLowerCase();
    if (isPlatformSupportRole(params.platformRole) || normalizedRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
        return buildAnswerlatticePermissionClaims(DEFAULT_ANSWERLATTICE_ROLE_METADATA[DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER].permissions);
    }

    const defaultRole = Object.entries(DEFAULT_ANSWERLATTICE_ROLE_METADATA)
        .find(([roleId]) => roleId === normalizedRoleId)?.[1];
    let rolePermissions = defaultRole?.permissions || {};

    const db = answerlatticeFirestoreAdmin as any;
    if (db && typeof db.collection === 'function' && params.storeId) {
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(params.storeId)).get();
        const roles = Array.isArray(storeSnap.data()?.answerlatticeRoles) ? storeSnap.data()?.answerlatticeRoles : [];
        const storeRole = roles.find((role: any) => String(role?.id || '').trim().toLowerCase() === normalizedRoleId);
        if (storeRole?.active === false) {
            rolePermissions = {};
        } else if (storeRole?.permissions) {
            rolePermissions = storeRole.permissions;
        }
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
            return NextResponse.json(
                { error: 'Missing email in session' },
                { status: 400 }
            );
        }

        // Get Firebase UID from request body (optional - we'll create if needed).
        // Empty body is equivalent to `{}` for OAuth custom-token creation.
        const body = await readSetClaimsBody(request);
        if (body === null) {
            secureLog('[Auth] Invalid JSON for set-claims');
            return NextResponse.json(
                { error: 'Invalid input' },
                { status: 400 }
            );
        }

        // Validate input (OWASP A03: Injection Prevention)
        const validation = validateAPIInput(setClaimsSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            secureLog('[Auth] Invalid input for set-claims', { validationError: errorMsg });
            return NextResponse.json(
                { error: 'Invalid input' },
                { status: 400 }
            );
        }

        let { uid, targetStoreId } = validation.data;
        const requestedProductId = normalizeProductId(validation.data.productId);
        const shouldUseAnswerlatticeUserContext = requestedProductId === PRODUCT_IDS.ANSWERLATTICE && !shouldUseSharedAnswerlatticeFirebase;

        const defaultDbUser = shouldUseAnswerlatticeUserContext
            ? await getAuthUserByEmail(session.user.email)
            : null;
        const hasDefaultPlatformAccess = isPlatformSupportRole((defaultDbUser as any)?.platformRole)
            || isPlatformSupportRole((session as any)?.platformRole)
            || isPlatformSupportRole((session as any)?.user?.platformRole);

        const answerlatticeDbUser = shouldUseAnswerlatticeUserContext
            ? await getAnswerlatticeAuthUserByEmail(session.user.email)
            : null;
        if (shouldUseAnswerlatticeUserContext && answerlatticeDbUser && (
            answerlatticeDbUser.active === false
            || answerlatticeDbUser.deleted === true
            || answerlatticeDbUser.authDisabled === true
        )) {
            secureLog('[Auth] Rejected inactive Answerlattice auth profile', {
                email: session.user.email,
                userId: answerlatticeDbUser.id,
            });
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const answerlatticeUserMatchesRequestedStore = answerlatticeDbUser && (
            !targetStoreId || canAccessStore(answerlatticeDbUser, targetStoreId)
        );

        // Get user from the product-specific auth profile. Answerlattice has its own
        // Firebase project, so tenant/store claims must come from the Answerlattice
        // user doc when one exists. Platform/support access is preserved as a
        // platformRole overlay, not as a reason to mint Answerlattice tokens for the
        // default MenuList tenant.
        let dbUser: any = shouldUseAnswerlatticeUserContext && hasDefaultPlatformAccess && answerlatticeUserMatchesRequestedStore
            ? {
                ...answerlatticeDbUser,
                platformRole: (defaultDbUser as any)?.platformRole || (answerlatticeDbUser as any)?.platformRole,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                productId: PRODUCT_IDS.ANSWERLATTICE,
            }
            : shouldUseAnswerlatticeUserContext && hasDefaultPlatformAccess && defaultDbUser
                ? {
                    ...defaultDbUser,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                }
                : shouldUseAnswerlatticeUserContext
                    ? answerlatticeDbUser
                    : await getAuthUserByEmail(session.user.email);

        if (!dbUser && shouldUseAnswerlatticeUserContext) {
            const fallbackDbUser: any = defaultDbUser || await getAuthUserByEmail(session.user.email);
            const fallbackPlatformRole = String(fallbackDbUser?.platformRole || '').toUpperCase();
            if (isPlatformSupportRole(fallbackPlatformRole)) {
                dbUser = {
                    ...fallbackDbUser,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                };
            }
        }

        if (!dbUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (targetStoreId && !hasDefaultPlatformAccess && !canAccessStore(dbUser, targetStoreId)) {
            secureLog('[Auth] Rejected set-claims store switch outside user stores', {
                requestedStoreId: targetStoreId,
                userId: dbUser.id,
            });
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const claimStoreId = hasDefaultPlatformAccess && shouldUseAnswerlatticeUserContext
            ? Number(dbUser?.storeId)
            : resolveClaimStoreId(dbUser, targetStoreId);

        // Get user's current-store role. Older/platform records may still carry
        // a top-level role, so keep that as the compatibility fallback.
        const storeRole = Array.isArray(dbUser.stores)
            ? dbUser.stores.find((store: any) => Number(store.storeId) === claimStoreId)?.role
            : undefined;
        const userRole = storeRole || dbUser.role;
        const productId = normalizeProductId(dbUser.pId || dbUser.productId);
        const answerlatticePermissionClaims = await resolveAnswerlatticePermissionClaims({
            productId,
            roleId: userRole,
            storeId: claimStoreId,
            platformRole: dbUser.platformRole,
        });

        const customClaims = {
            pId: productId,
            role: userRole || 'OWNER',
            platformRole: dbUser.platformRole || 'USER',
            tenantId: String(dbUser.tenantId),
            storeId: String(claimStoreId),
            uId: dbUser.id,
            admin: hasTenantAdminClaim(userRole, dbUser.platformRole),
            storeIds: getStoreIdsClaim(dbUser),
            ...answerlatticePermissionClaims,
        };
        const answerlatticeCustomToken = await createAnswerlatticeCustomTokenIfNeeded(
            session.user.email,
            session.user.name,
            customClaims,
        );

        // If UID provided, set claims on existing user
        if (uid) {
            const firebaseUser = await authAdmin.getUser(uid);
            if (normalizeEmail(firebaseUser.email) !== normalizeEmail(session.user.email)) {
                secureLog('[Auth] Rejected set-claims UID/email mismatch', {
                    uid,
                    sessionEmail: session.user.email,
                });
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await authAdmin.setCustomUserClaims(uid, customClaims);
            const customToken = await authAdmin.createCustomToken(uid, customClaims);

            secureLog('[Auth] Custom claims set for existing Firebase user', {
                uid,
                email: session.user.email,
                role: customClaims.role,
                platformRole: customClaims.platformRole,
                tenantId: customClaims.tenantId,
                storeId: customClaims.storeId,
            });

            return NextResponse.json({
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
                secureError('[Auth] Firebase user lookup failed during auth sync', error, { email: session.user.email });
                throw error;
            }

            const newUser = await authAdmin.createUser({
                email: session.user.email,
                emailVerified: true,
                displayName: session.user.name || undefined,
            });
            uid = newUser.uid;
            secureLog('[Auth] Created Firebase Auth user for OAuth login', { email: session.user.email, uid });
        }

        // Set custom claims
        await authAdmin.setCustomUserClaims(uid, customClaims);

        // Create custom token for client to sign in with
        const customToken = await authAdmin.createCustomToken(uid, customClaims);

        secureLog('[Auth] Custom token created for OAuth user', {
            uid,
            email: session.user.email,
            role: customClaims.role,
            platformRole: customClaims.platformRole,
            tenantId: customClaims.tenantId,
            storeId: customClaims.storeId,
        });

        return NextResponse.json({
            success: true,
            customToken,  // Client can use this to sign in
            answerlatticeCustomToken,
            claims: customClaims
        });

    } catch (error) {
        secureError('Failed to set custom claims', error as Error, { email: session?.user?.email });
        return NextResponse.json(
            { error: 'Failed to set custom claims' },
            { status: 500 }
        );
    }
});
