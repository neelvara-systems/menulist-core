import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    ANSWERLATTICE_PERMISSION_KEYS,
    AnswerlatticePermissionKey,
    AnswerlatticeRoleDefinition,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    DEFAULT_ANSWERLATTICE_ROLE_METADATA,
    normalizeAnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { STAFF_EMAIL_DOMAIN } from '@constant/urls';
import { formatStaffLoginId, getDisplayEmail, isInternalAuthEmail, normalizeStaffLoginUsername } from '@lib/auth/loginIdentifiers';
import { getAuthUserByEmail } from '@lib/auth/serverUserContext';
import {
    ensureAnswerlatticeRolesForStore,
    findAnswerlatticeRole,
    getAnswerlatticeDb,
    normalizeAnswerlatticeRolesForStore,
    requireAnswerlatticePermission,
    requireAnswerlatticeTeamPermission,
} from '@lib/answerlattice/accessControl';
import { answerlatticeAuthAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin, authAdmin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { validateAPIInput } from '@lib/security/inputValidation';
import { buildSecurityContext } from '@lib/security/securityContext';
import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const STAFF_LOGIN_ID_PREFIX = '77';
const STAFF_AUTH_MODE_EMAIL = 'email';
const STAFF_AUTH_MODE_OWNER_PASSCODE = 'owner_passcode';

const optionalTrimmedStringSchema = (max: number) => z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    return String(value);
}, z.string().trim().max(max).optional());

const optionalEmailSchema = z.string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .default('')
    .refine((value) => !value || z.string().email().safeParse(value).success, 'Invalid email address');

const RolePermissionsSchema = z.record(z.boolean()).transform((permissions) => {
    const normalized: Record<string, boolean> = {};
    ANSWERLATTICE_ALL_PERMISSIONS.forEach((permission) => {
        normalized[permission] = permissions[permission] === true;
    });
    return normalized;
});

const CreateAnswerlatticeStaffSchema = z.object({
    email: optionalEmailSchema,
    name: optionalTrimmedStringSchema(160),
    roleId: optionalTrimmedStringSchema(120),
    countryCode: optionalTrimmedStringSchema(8),
    dialCode: optionalTrimmedStringSchema(8),
    phoneNumber: optionalTrimmedStringSchema(32),
});

const UpdateAnswerlatticeStaffSchema = z.object({
    userId: z.string().trim().min(1).max(160),
    name: optionalTrimmedStringSchema(160),
    active: z.boolean().optional(),
    roleId: optionalTrimmedStringSchema(120),
    countryCode: optionalTrimmedStringSchema(8),
    dialCode: optionalTrimmedStringSchema(8),
    phoneNumber: optionalTrimmedStringSchema(32),
});

const UserIdSchema = z.object({
    userId: z.string().trim().min(1).max(160),
});

const SaveAnswerlatticeRoleSchema = z.object({
    role: z.object({
        active: z.boolean().optional(),
        description: z.string().trim().max(300).optional(),
        id: z.string().trim().min(1).max(120).optional(),
        name: z.string().trim().min(1).max(80),
        permissions: RolePermissionsSchema,
    }),
});

const DeleteAnswerlatticeRoleSchema = z.object({
    roleId: z.string().trim().min(1).max(120),
});

type CreateAnswerlatticeStaffInput = {
    countryCode?: string;
    dialCode?: string;
    email: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
};

type UpdateAnswerlatticeStaffInput = {
    active?: boolean;
    countryCode?: string;
    dialCode?: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
    userId: string;
};

type UserIdInput = {
    userId: string;
};

type SaveAnswerlatticeRoleInput = {
    role: {
        active?: boolean;
        description?: string;
        id?: string;
        name: string;
        permissions: Record<string, boolean>;
    };
};

type DeleteAnswerlatticeRoleInput = {
    roleId: string;
};

type DefaultAuthUserDoc = {
    id: string;
    [key: string]: any;
};

const isPositiveId = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isSafeInteger(numberValue) && numberValue > 0;
};

const jsonError = (error: string, status: number, code?: string) => (
    NextResponse.json({ error, code }, { status })
);

const getValidationLogError = (validation: { success: boolean; error?: string }) => (
    validation.success ? 'Invalid input' : validation.error || 'Invalid input'
);

const getDefaultAuthUserByEmail = async (email: string): Promise<DefaultAuthUserDoc | null> => (
    await getAuthUserByEmail(email) as DefaultAuthUserDoc | null
);

const sanitizeFirestoreValue = (value: any): any => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeFirestoreValue(item)).filter((item) => item !== undefined);
    }
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        if (typeof value.toDate === 'function' && typeof value.toMillis === 'function') return value;
        const result: Record<string, any> = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            const sanitized = sanitizeFirestoreValue(nestedValue);
            if (sanitized !== undefined) result[key] = sanitized;
        });
        return result;
    }
    return value;
};

const getRequestIp = (request: NextRequest) => (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
);

const applyRateLimit = async (
    request: NextRequest,
    session: any,
    feature: 'DATA_READ' | 'DATA_WRITE' | 'AUTH_SENSITIVE',
    keyPrefix: string,
) => {
    const config = getRateLimitForFeature(feature);
    const result = await checkRateLimit({
        key: `${keyPrefix}:${session?.uId || session?.user?.id || getRequestIp(request)}`,
        ...config,
    });
    if (result.allowed) return null;

    logger.security('Rate Limit Exceeded', {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        feature,
    }, 'medium');

    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 });
};

const logSecurity = (
    event: string,
    session: any,
    request: NextRequest,
    details: Record<string, unknown>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
) => {
    logger.security(event, {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        ...details,
    }, severity);
};

const generateDigits = (length: number) => {
    let output = '';
    while (output.length < length) {
        output += String(randomBytes(length).readUIntBE(0, Math.min(6, length))).replace(/\D/g, '');
    }
    return output.slice(0, length);
};

const generateStaffPasscode = () => generateDigits(8);

const buildManagedStaffEmail = (tenantId: number, loginId: string) => (
    `answerlattice-staff-${tenantId}-${loginId}@${STAFF_EMAIL_DOMAIN}`.toLowerCase()
);

const isManagedStaffEmail = (email?: string) => (
    String(email || '').toLowerCase().trim().endsWith(`@${STAFF_EMAIL_DOMAIN}`)
);

const getStaffAuthMode = (data: any) => (
    data?.staffAuthMode === STAFF_AUTH_MODE_OWNER_PASSCODE || isManagedStaffEmail(data?.email)
        ? STAFF_AUTH_MODE_OWNER_PASSCODE
        : STAFF_AUTH_MODE_EMAIL
);

const getStaffDisplayEmail = (data: any) => (
    getStaffAuthMode(data) === STAFF_AUTH_MODE_OWNER_PASSCODE || isInternalAuthEmail(data?.email)
        ? ''
        : getDisplayEmail(data?.email)
);

const generateUniqueAnswerlatticeStaffLoginId = async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const loginId = `${STAFF_LOGIN_ID_PREFIX}${generateDigits(8)}`;
        const defaultSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.USERS)
            .where('loginUsername', '==', loginId)
            .limit(1)
            .get();
        if (!defaultSnapshot.empty) continue;

        const db = getAnswerlatticeDb();
        const answerlatticeSnapshot = db
            ? await db.collection(DB_COLLECTIONS.USERS)
                .where('loginUsername', '==', loginId)
                .limit(1)
                .get()
            : null;
        if (!answerlatticeSnapshot || answerlatticeSnapshot.empty) return loginId;
    }

    throw new Error('ANSWERLATTICE_STAFF_LOGIN_ID_GENERATION_FAILED');
};

const resolveStaffLoginDisplayId = (value?: string | null) => formatStaffLoginId(value);

const resolveStaffLoginUsername = (value?: string | null) => normalizeStaffLoginUsername(value);

const sendFirebasePasswordResetEmail = async (email: string) => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
        return { ok: false, error: 'FIREBASE_API_KEY_MISSING' };
    }

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
        body: JSON.stringify({
            email,
            requestType: 'PASSWORD_RESET',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });

    if (response.ok) return { ok: true };
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data?.error?.message || 'PASSWORD_RESET_EMAIL_FAILED' };
};

const serializeTimestamp = (value: any) => {
    if (!value) return undefined;
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.toMillis === 'function') return value.toMillis();
    return undefined;
};

const sanitizeAnswerlatticeStaffUser = (id: string, data: any, roles: AnswerlatticeRoleDefinition[]) => {
    const stores = Array.isArray(data?.stores)
        ? data.stores
            .filter((store: any) => isPositiveId(store?.storeId))
            .map((store: any) => ({
                storeId: Number(store.storeId),
                name: String(store.name || ''),
                role: String(store.role || ''),
            }))
        : [];
    const roleId = stores.find((store: any) => Number(store.storeId) === Number(data?.storeId || data?.sId))?.role
        || data?.role
        || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    const role = findAnswerlatticeRole(roles, roleId);

    return {
        id,
        active: data?.active !== false,
        authDisabled: data?.authDisabled === true,
        countryCode: data?.countryCode || '',
        createdVia: data?.createdVia || '',
        deleted: data?.deleted === true,
        dialCode: data?.dialCode || '',
        displayEmail: getStaffDisplayEmail(data),
        email: data?.email || '',
        isVerified: data?.isVerified === true,
        loginUsername: data?.loginUsername || '',
        name: data?.name || '',
        phoneNumber: data?.phoneNumber || '',
        phoneUsername: data?.phoneUsername || '',
        profileImage: data?.profileImage || data?.image || '',
        roleId,
        roleName: role?.name || roleId,
        sessionRevokedAt: serializeTimestamp(data?.sessionRevokedAt),
        staffAuthMode: getStaffAuthMode(data),
        staffLoginId: resolveStaffLoginDisplayId(data?.staffLoginId || data?.loginUsername),
        storeId: Number(data?.storeId || data?.sId) || stores[0]?.storeId,
        storeIds: Array.isArray(data?.storeIds)
            ? data.storeIds.filter(isPositiveId).map(Number)
            : stores.map((store) => store.storeId),
        stores,
        tenantId: Number(data?.tenantId || data?.tId),
    };
};

const getAnswerlatticeUserByEmail = async (email: string) => {
    const db = getAnswerlatticeDb();
    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!db || !normalizedEmail) return null;

    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ref: doc.ref, data: doc.data() };
};

const getAnswerlatticeUserById = async (userId: string) => {
    const db = getAnswerlatticeDb();
    if (!db) return null;
    const doc = await db.collection(DB_COLLECTIONS.USERS).doc(userId).get();
    return doc.exists ? { id: doc.id, ref: doc.ref, data: doc.data() || {} } : null;
};

const syncDefaultAuthProductAccount = async (params: {
    active?: boolean;
    email: string;
    firebaseUid?: string;
    loginUsername?: string;
    name: string;
    roleId: string;
    session: any;
    staffAuthMode: string;
    storeId: number;
    storeName: string;
    tenantId: number;
    userId: string;
}) => {
    const now = admin.firestore.Timestamp.now();
    const existingDefaultUser = await getDefaultAuthUserByEmail(params.email);
    const defaultUserId = existingDefaultUser?.id || params.userId;
    const shouldSetRootAnswerlatticeScope = !existingDefaultUser?.tenantId || !existingDefaultUser?.storeId || existingDefaultUser?.pId === PRODUCT_IDS.ANSWERLATTICE;
    const productAccount = sanitizeFirestoreValue({
        active: params.active !== false,
        tenantId: params.tenantId,
        storeId: params.storeId,
        role: params.roleId,
        platformRole: existingDefaultUser?.platformRole || 'USER',
        storeIds: [params.storeId],
        updatedAt: now,
    });
    const loginUsername = resolveStaffLoginUsername(params.loginUsername || existingDefaultUser?.loginUsername || existingDefaultUser?.staffLoginId);
    const staffLoginId = resolveStaffLoginDisplayId(params.loginUsername || existingDefaultUser?.staffLoginId || existingDefaultUser?.loginUsername);
    const defaultUserUpdate = sanitizeFirestoreValue({
        email: params.email,
        name: params.name,
        active: existingDefaultUser?.active === false ? false : true,
        authDisabled: existingDefaultUser?.authDisabled === true ? true : false,
        isVerified: true,
        firebaseUid: params.firebaseUid || existingDefaultUser?.firebaseUid,
        loginUsername,
        staffAuthMode: params.staffAuthMode,
        staffLoginId,
        productAccounts: {
            [PRODUCT_IDS.ANSWERLATTICE]: productAccount,
        },
        modifiedOn: now,
        ...(shouldSetRootAnswerlatticeScope ? {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tenantId: params.tenantId,
            storeId: params.storeId,
            tId: params.tenantId,
            sId: params.storeId,
            uId: params.userId,
            role: params.roleId,
            stores: [{
                storeId: params.storeId,
                name: params.storeName,
                role: params.roleId,
            }],
            storeIds: [params.storeId],
            platformRole: existingDefaultUser?.platformRole || 'USER',
        } : {}),
    });

    await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(defaultUserId).set(defaultUserUpdate, { merge: true });
};

const updateDefaultAuthProductAccountStatus = async (params: {
    active: boolean;
    email?: string;
    roleId?: string;
    storeId?: number;
    storeIds?: number[];
    userId: string;
}) => {
    const existingDefaultUser = params.email ? await getDefaultAuthUserByEmail(params.email) : null;
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(existingDefaultUser?.id || params.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;
    const userData = userSnap.data() || {};
    const productAccounts = userData.productAccounts || {};
    const account = productAccounts[PRODUCT_IDS.ANSWERLATTICE] || {};
    await userRef.set(sanitizeFirestoreValue({
        productAccounts: {
            [PRODUCT_IDS.ANSWERLATTICE]: {
                ...account,
                active: params.active,
                ...(params.roleId ? { role: params.roleId } : {}),
                ...(params.storeId ? { storeId: params.storeId } : {}),
                ...(params.storeIds ? { storeIds: params.storeIds } : {}),
                updatedAt: admin.firestore.Timestamp.now(),
            },
        },
        modifiedOn: admin.firestore.Timestamp.now(),
        ...((userData.pId === PRODUCT_IDS.ANSWERLATTICE || userData.productId === PRODUCT_IDS.ANSWERLATTICE) ? {
            active: params.active,
            authDisabled: params.active ? false : true,
            ...(params.roleId ? { role: params.roleId } : {}),
            ...(params.storeId ? { storeId: params.storeId, sId: params.storeId } : {}),
            ...(params.storeIds ? { storeIds: params.storeIds } : {}),
        } : {}),
    }), { merge: true });
};

const createOrGetDefaultFirebaseUser = async (params: {
    displayName: string;
    email: string;
    password: string;
}) => {
    try {
        return await authAdmin.createUser({
            displayName: params.displayName,
            email: params.email,
            emailVerified: false,
            password: params.password,
        });
    } catch (error: any) {
        if (error?.code !== 'auth/email-already-exists') throw error;
        return authAdmin.getUserByEmail(params.email);
    }
};

const ensureAnswerlatticeAuthUserDisabledState = async (email: string, disabled: boolean) => {
    try {
        const answerlatticeUser = await answerlatticeAuthAdmin.getUserByEmail(email);
        if (answerlatticeUser.disabled !== disabled) {
            await answerlatticeAuthAdmin.updateUser(answerlatticeUser.uid, { disabled });
        }
    } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') throw error;
    }
};

const revokeDefaultFirebaseRefreshTokens = async (data: any, fallbackEmail: string, context: Record<string, unknown>) => {
    const email = String(fallbackEmail || data?.email || '').toLowerCase().trim();
    if (!data?.firebaseUid && !email) return null;
    try {
        const firebaseUser = data?.firebaseUid
            ? await authAdmin.getUser(String(data.firebaseUid))
            : await authAdmin.getUserByEmail(email);
        await authAdmin.revokeRefreshTokens(firebaseUser.uid);
        return firebaseUser;
    } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') throw error;
        logger.warn('[Answerlattice Staff] Default Firebase Auth user missing during session revoke', {
            ...context,
            email,
        });
        return null;
    }
};

const isPlatformRole = (value: unknown) => String(value || '').toUpperCase() === 'PLATFORM';

const buildAnswerlatticePermissionClaims = (
    roles: AnswerlatticeRoleDefinition[],
    roleId: string,
    platformRole?: string,
) => {
    const normalizedRoleId = String(roleId || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF).trim();
    const permissions = isPlatformRole(platformRole) || normalizedRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        ? normalizeAnswerlatticeRolePermissions(DEFAULT_ANSWERLATTICE_ROLE_METADATA[DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER].permissions)
        : normalizeAnswerlatticeRolePermissions(findAnswerlatticeRole(roles, normalizedRoleId)?.permissions);

    return ANSWERLATTICE_ALL_PERMISSIONS.reduce((acc, permission) => {
        acc[permission] = permissions[permission] === true;
        return acc;
    }, {} as Record<AnswerlatticePermissionKey, boolean>);
};

const syncAnswerlatticeAuthClaimsForStaffUser = async (params: {
    active: boolean;
    email: string;
    platformRole?: string;
    roleId: string;
    roles: AnswerlatticeRoleDefinition[];
    storeId: number;
    storeIds: number[];
    tenantId: number;
    userId: string;
}) => {
    const email = String(params.email || '').toLowerCase().trim();
    if (!email) return;

    try {
        const answerlatticeUser = await answerlatticeAuthAdmin.getUserByEmail(email);
        const platformRole = params.platformRole || 'USER';
        const adminClaim = isPlatformRole(platformRole) || params.roleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER;
        await answerlatticeAuthAdmin.setCustomUserClaims(answerlatticeUser.uid, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            role: params.roleId,
            platformRole,
            tenantId: String(params.tenantId),
            storeId: String(params.storeId),
            uId: params.userId,
            admin: adminClaim,
            storeIds: params.storeIds.map((storeId) => String(storeId)),
            ...buildAnswerlatticePermissionClaims(params.roles, params.roleId, platformRole),
        });
        if (answerlatticeUser.disabled !== !params.active) {
            await answerlatticeAuthAdmin.updateUser(answerlatticeUser.uid, { disabled: !params.active });
        }
        await answerlatticeAuthAdmin.revokeRefreshTokens(answerlatticeUser.uid);
    } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') throw error;
    }
};

const validateRoleForAssignment = (
    roles: AnswerlatticeRoleDefinition[],
    roleId: string,
) => {
    const role = roles.find((item) => item.id === roleId && item.active !== false);
    if (!role) throw new Error('ROLE_NOT_FOUND');
    return role;
};

const ensureAnotherActiveOwner = async (
    tenantId: number,
    storeId: number,
    targetUserId: string,
) => {
    const db = getAnswerlatticeDb();
    if (!db) throw new Error('ANSWERLATTICE_FIREBASE_NOT_CONFIGURED');

    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('tenantId', '==', tenantId)
        .get();
    const hasOtherOwner = snapshot.docs.some((doc) => {
        if (doc.id === targetUserId) return false;
        const data = doc.data();
        if (data?.active === false || data?.deleted === true) return false;
        return (Array.isArray(data?.stores) ? data.stores : []).some((store: any) => (
            Number(store?.storeId) === storeId && store?.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        ));
    });

    if (!hasOtherOwner) throw new Error('LAST_OWNER');
};

const ensureNotSelfDestructive = (session: any, targetUserId: string) => {
    if (targetUserId && (session?.uId === targetUserId || session?.user?.id === targetUserId)) {
        throw new Error('SELF_UPDATE_BLOCKED');
    }
};

const roleIsAssignedToActiveUser = async (tenantId: number, storeId: number, roleId: string) => {
    const db = getAnswerlatticeDb();
    if (!db) return false;
    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('tenantId', '==', tenantId)
        .get();

    return snapshot.docs.some((doc) => {
        const data = doc.data();
        if (data?.active === false || data?.deleted === true) return false;
        return (Array.isArray(data?.stores) ? data.stores : []).some((store: any) => (
            Number(store?.storeId) === storeId && store?.role === roleId
        ));
    });
};

const verifyStaffFeature = () => FEATURE_FLAGS.ENABLE_ANSWERLATTICE_STAFF_ACCESS;

export const listAnswerlatticeStaffUsers = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'DATA_READ', 'answerlattice-staff-read');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticeTeamPermission(request, session);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const db = getAnswerlatticeDb();
    if (!db) return jsonError('Answerlattice Firebase is not configured', 503, 'ANSWERLATTICE_FIREBASE_NOT_CONFIGURED');

    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('tenantId', '==', access.scope.tenantId)
        .get();
    const users = snapshot.docs
        .map((doc) => sanitizeAnswerlatticeStaffUser(doc.id, doc.data(), access.roles))
        .filter((user) => user.deleted !== true)
        .filter((user) => user.storeIds.includes(access.scope.storeId))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

    return NextResponse.json({
        access,
        roles: access.roles,
        store: {
            name: access.storeName,
            storeId: access.scope.storeId,
            tenantId: access.scope.tenantId,
        },
        users,
    }, {
        headers: { 'Cache-Control': 'private, no-store' },
    });
};

export const createAnswerlatticeStaffUser = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'AUTH_SENSITIVE', 'answerlattice-staff-create');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticeTeamPermission(request, session);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const validation = validateAPIInput(CreateAnswerlatticeStaffSchema, await request.json().catch(() => ({})));
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Create', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as CreateAnswerlatticeStaffInput;
    const requestedRoleId = input.roleId || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    if (requestedRoleId !== DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF && !access.permissions[ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]) {
        return jsonError('You do not have permission to assign roles.', 403, 'ROLE_ASSIGNMENT_FORBIDDEN');
    }

    try {
        validateRoleForAssignment(access.roles, requestedRoleId);
    } catch {
        return jsonError('Invalid role', 400, 'ROLE_NOT_FOUND');
    }

    const db = getAnswerlatticeDb();
    if (!db) return jsonError('Answerlattice Firebase is not configured', 503, 'ANSWERLATTICE_FIREBASE_NOT_CONFIGURED');

    const hasEmail = Boolean(input.email);
    const staffLoginUsername = await generateUniqueAnswerlatticeStaffLoginId();
    const staffLoginId = resolveStaffLoginDisplayId(staffLoginUsername);
    const loginEmail = hasEmail ? String(input.email) : buildManagedStaffEmail(access.scope.tenantId, staffLoginUsername);
    const existingAnswerlatticeUser = await getAnswerlatticeUserByEmail(loginEmail);
    if (existingAnswerlatticeUser && Number(existingAnswerlatticeUser.data.tenantId) !== access.scope.tenantId) {
        return jsonError('This email is registered with another Answerlattice workspace.', 409, 'EMAIL_OTHER_TENANT');
    }

    const normalizedPhone = normalizePhoneNumberForStorage({
        countryCode: input.countryCode,
        dialCode: input.dialCode,
        phoneNumber: input.phoneNumber,
    });
    const displayName = input.name || normalizedPhone.phoneNumber || (hasEmail ? String(input.email).split('@')[0] : `Support ${staffLoginId.slice(-4)}`);
    const tempPasscode = hasEmail ? '' : generateStaffPasscode();
    const tempPassword = tempPasscode || randomBytes(24).toString('base64url');
    const defaultFirebaseUser = await createOrGetDefaultFirebaseUser({
        displayName,
        email: loginEmail,
        password: tempPassword,
    });
    const existingDefaultUser = await getDefaultAuthUserByEmail(loginEmail);
    const userId = existingAnswerlatticeUser?.id || existingDefaultUser?.id || defaultFirebaseUser.uid;
    const now = admin.firestore.Timestamp.now();
    const phoneUsername = normalizedPhone.phoneUsername;
    const stores = [{
        storeId: access.scope.storeId,
        name: access.storeName,
        role: requestedRoleId,
    }];
    const staffAuthMode = hasEmail ? STAFF_AUTH_MODE_EMAIL : STAFF_AUTH_MODE_OWNER_PASSCODE;

    const userDoc = sanitizeFirestoreValue({
        active: true,
        authDisabled: false,
        countryCode: input.phoneNumber ? normalizedPhone.countryCode : input.countryCode,
        createdBy: session?.user?.email,
        createdOn: existingAnswerlatticeUser?.data?.createdOn || now,
        createdVia: hasEmail ? 'answerlattice-staff-invite' : 'answerlattice-owner-passcode',
        deleted: false,
        dialCode: input.phoneNumber ? normalizedPhone.dialCode : input.dialCode,
        email: loginEmail,
        firebaseUid: defaultFirebaseUser.uid,
        isVerified: true,
        loginUsername: resolveStaffLoginUsername(existingAnswerlatticeUser?.data?.loginUsername || existingAnswerlatticeUser?.data?.staffLoginId) || staffLoginUsername,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        name: displayName,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        phone: normalizedPhone.phone || undefined,
        phoneNumber: input.phoneNumber ? normalizedPhone.phoneNumber : input.phoneNumber,
        phoneUsername: phoneUsername || undefined,
        platformRole: 'USER',
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: requestedRoleId,
        sId: access.scope.storeId,
        staffAuthMode,
        staffLoginId: resolveStaffLoginDisplayId(existingAnswerlatticeUser?.data?.staffLoginId || existingAnswerlatticeUser?.data?.loginUsername || staffLoginUsername),
        storeId: access.scope.storeId,
        storeIds: [access.scope.storeId],
        stores,
        tId: access.scope.tenantId,
        tenantId: access.scope.tenantId,
        uId: userId,
    });

    await db.collection(DB_COLLECTIONS.USERS).doc(userId).set(userDoc, { merge: true });
    await syncDefaultAuthProductAccount({
        active: true,
        email: loginEmail,
        firebaseUid: defaultFirebaseUser.uid,
        loginUsername: userDoc.loginUsername,
        name: displayName,
        roleId: requestedRoleId,
        session,
        staffAuthMode,
        storeId: access.scope.storeId,
        storeName: access.storeName,
        tenantId: access.scope.tenantId,
        userId,
    });
    await syncAnswerlatticeAuthClaimsForStaffUser({
        active: true,
        email: loginEmail,
        platformRole: userDoc.platformRole,
        roleId: requestedRoleId,
        roles: access.roles,
        storeId: access.scope.storeId,
        storeIds: userDoc.storeIds,
        tenantId: access.scope.tenantId,
        userId,
    });

    let passwordResetEmail: { ok: boolean; error?: string } = { ok: false };
    if (hasEmail) {
        passwordResetEmail = await sendFirebasePasswordResetEmail(loginEmail);
        if (passwordResetEmail.ok) {
            await db.collection(DB_COLLECTIONS.USERS).doc(userId).set({
                passwordResetEmailSentAt: now,
                passwordResetRequestedAt: now,
                passwordResetRequestedBy: session?.uId || session?.user?.id,
            }, { merge: true });
        }
    }

    logger.info('[Answerlattice Staff] Staff user created', {
        authMode: staffAuthMode,
        tenantId: access.scope.tenantId,
        storeId: access.scope.storeId,
        userId,
    });

    return NextResponse.json({
        success: true,
        message: hasEmail
            ? 'Team member added. They can set their password from the email.'
            : 'Team member added. Share the staff ID and temporary passcode.',
        passwordResetEmailError: hasEmail && !passwordResetEmail.ok ? passwordResetEmail.error : undefined,
        passwordResetEmailSent: hasEmail ? passwordResetEmail.ok : false,
        staffAuthMode,
        staffLoginId: userDoc.staffLoginId,
        temporaryPasscode: tempPasscode || undefined,
        user: sanitizeAnswerlatticeStaffUser(userId, userDoc, access.roles),
        userId,
    });
};

export const updateAnswerlatticeStaffUser = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'DATA_WRITE', 'answerlattice-staff-update');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticeTeamPermission(request, session);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const validation = validateAPIInput(UpdateAnswerlatticeStaffSchema, await request.json().catch(() => ({})));
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Update', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as UpdateAnswerlatticeStaffInput;
    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = target.data || {};
    if (Number(existingData.tenantId || existingData.tId) !== access.scope.tenantId) {
        logSecurity('Authorization Failed - Answerlattice Staff Tenant Mismatch', session, request, {
            requestedTenantId: access.scope.tenantId,
            targetTenantId: existingData.tenantId || existingData.tId,
            userId: input.userId,
        }, 'critical');
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }

    const currentStores = Array.isArray(existingData.stores) ? existingData.stores : [];
    const currentStore = currentStores.find((store: any) => Number(store.storeId) === access.scope.storeId);
    if (!currentStore) return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');

    const nextRoleId = input.roleId || currentStore.role || existingData.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    const roleChanged = nextRoleId !== currentStore.role;
    if (roleChanged && !access.permissions[ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]) {
        return jsonError('You do not have permission to change roles.', 403, 'ROLE_ASSIGNMENT_FORBIDDEN');
    }
    try {
        validateRoleForAssignment(access.roles, nextRoleId);
    } catch {
        return jsonError('Invalid role', 400, 'ROLE_NOT_FOUND');
    }

    try {
        if (input.active === false || roleChanged) {
            ensureNotSelfDestructive(session, input.userId);
        }
        if ((input.active === false || roleChanged) && currentStore.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER && nextRoleId !== DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
            await ensureAnotherActiveOwner(access.scope.tenantId, access.scope.storeId, input.userId);
        }
    } catch (error: any) {
        if (error?.message === 'SELF_UPDATE_BLOCKED') return jsonError('You cannot remove or deactivate your own access.', 409, 'SELF_UPDATE_BLOCKED');
        if (error?.message === 'LAST_OWNER') return jsonError('Add another Owner before removing this access.', 409, 'LAST_OWNER');
        throw error;
    }

    const now = admin.firestore.Timestamp.now();
    const nextStores = currentStores.map((store: any) => (
        Number(store.storeId) === access.scope.storeId
            ? { ...store, name: access.storeName, role: nextRoleId }
            : store
    ));
    const active = input.active;
    const shouldNormalizePhone = input.phoneNumber !== undefined || input.dialCode !== undefined || input.countryCode !== undefined;
    const normalizedPhone = shouldNormalizePhone
        ? normalizePhoneNumberForStorage({
            countryCode: input.countryCode ?? existingData.countryCode,
            dialCode: input.dialCode ?? existingData.dialCode,
            phoneNumber: input.phoneNumber ?? existingData.phoneNumber,
        })
        : null;
    const updateData = sanitizeFirestoreValue({
        active,
        authDisabled: active === undefined ? undefined : active === false,
        countryCode: normalizedPhone ? normalizedPhone.countryCode : input.countryCode,
        dialCode: normalizedPhone ? normalizedPhone.dialCode : input.dialCode,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        name: input.name,
        phone: normalizedPhone ? normalizedPhone.phone : undefined,
        phoneNumber: normalizedPhone ? normalizedPhone.phoneNumber : input.phoneNumber,
        phoneUsername: normalizedPhone ? normalizedPhone.phoneUsername : undefined,
        role: nextRoleId,
        stores: nextStores,
        sessionRevokedAt: active === false ? now : undefined,
        sessionRevokedBy: active === false ? session?.uId || session?.user?.id : undefined,
        sessionRevokedByEmail: active === false ? session?.user?.email : undefined,
        sessionRevokedReason: active === false ? 'answerlattice_staff_deactivated' : undefined,
    });

    await target.ref.update(updateData);
    if (active !== undefined) {
        if (active === false) {
            await revokeDefaultFirebaseRefreshTokens(existingData, existingData.email, {
                action: 'answerlattice-staff-deactivate',
                tenantId: access.scope.tenantId,
                storeId: access.scope.storeId,
                userId: input.userId,
            });
        }
        await updateDefaultAuthProductAccountStatus({
            active,
            email: existingData.email,
            roleId: nextRoleId,
            userId: input.userId,
        });
        await ensureAnswerlatticeAuthUserDisabledState(String(existingData.email || ''), active === false);
    } else if (roleChanged) {
        await updateDefaultAuthProductAccountStatus({
            active: existingData.active !== false,
            email: existingData.email,
            roleId: nextRoleId,
            userId: input.userId,
        });
    }
    if (active !== undefined || roleChanged) {
        await syncAnswerlatticeAuthClaimsForStaffUser({
            active: active ?? existingData.active !== false,
            email: existingData.email,
            platformRole: existingData.platformRole,
            roleId: nextRoleId,
            roles: access.roles,
            storeId: access.scope.storeId,
            storeIds: nextStores.map((store: any) => Number(store.storeId)).filter(isPositiveId),
            tenantId: access.scope.tenantId,
            userId: input.userId,
        });
    }

    const updated = await target.ref.get();
    return NextResponse.json({
        success: true,
        user: sanitizeAnswerlatticeStaffUser(input.userId, updated.data(), access.roles),
        userId: input.userId,
    });
};

export const removeAnswerlatticeStaffUser = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'DATA_WRITE', 'answerlattice-staff-remove');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticeTeamPermission(request, session);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const validation = validateAPIInput(UserIdSchema, {
        userId: request.nextUrl.searchParams.get('userId'),
    });
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Remove', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as UserIdInput;
    try {
        ensureNotSelfDestructive(session, input.userId);
    } catch {
        return jsonError('You cannot remove your own access.', 409, 'SELF_UPDATE_BLOCKED');
    }

    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = target.data || {};
    const currentStores = Array.isArray(existingData.stores) ? existingData.stores : [];
    const currentStore = currentStores.find((store: any) => Number(store.storeId) === access.scope.storeId);
    if (!currentStore) return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
    if (currentStore.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
        try {
            await ensureAnotherActiveOwner(access.scope.tenantId, access.scope.storeId, input.userId);
        } catch (error: any) {
            if (error?.message === 'LAST_OWNER') return jsonError('Add another Owner before removing this access.', 409, 'LAST_OWNER');
            throw error;
        }
    }

    const now = admin.firestore.Timestamp.now();
    const nextStores = currentStores.filter((store: any) => Number(store.storeId) !== access.scope.storeId);
    const shouldDeactivate = nextStores.length === 0;
    await target.ref.update(sanitizeFirestoreValue({
        active: shouldDeactivate ? false : existingData.active,
        authDisabled: shouldDeactivate ? true : existingData.authDisabled,
        deleted: shouldDeactivate ? true : existingData.deleted === true ? false : existingData.deleted,
        deletedAt: shouldDeactivate ? now : existingData.deletedAt ?? null,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        storeId: shouldDeactivate ? access.scope.storeId : Number(nextStores[0]?.storeId || existingData.storeId),
        storeIds: nextStores.map((store: any) => Number(store.storeId)),
        stores: nextStores,
        sessionRevokedAt: shouldDeactivate ? now : undefined,
        sessionRevokedBy: shouldDeactivate ? session?.uId || session?.user?.id : undefined,
        sessionRevokedByEmail: shouldDeactivate ? session?.user?.email : undefined,
        sessionRevokedReason: shouldDeactivate ? 'answerlattice_staff_removed' : undefined,
    }));
    const nextPrimaryStore = nextStores[0] || null;
    await updateDefaultAuthProductAccountStatus({
        active: !shouldDeactivate,
        email: existingData.email,
        roleId: nextPrimaryStore?.role,
        storeId: nextPrimaryStore ? Number(nextPrimaryStore.storeId) : undefined,
        storeIds: nextStores.map((store: any) => Number(store.storeId)).filter(isPositiveId),
        userId: input.userId,
    });
    await syncAnswerlatticeAuthClaimsForStaffUser({
        active: !shouldDeactivate,
        email: existingData.email,
        platformRole: existingData.platformRole,
        roleId: nextPrimaryStore?.role || currentStore.role || existingData.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF,
        roles: access.roles,
        storeId: nextPrimaryStore ? Number(nextPrimaryStore.storeId) : access.scope.storeId,
        storeIds: nextStores.map((store: any) => Number(store.storeId)).filter(isPositiveId),
        tenantId: access.scope.tenantId,
        userId: input.userId,
    });
    if (shouldDeactivate) {
        await revokeDefaultFirebaseRefreshTokens(existingData, existingData.email, {
            action: 'answerlattice-staff-remove-last-workspace',
            tenantId: access.scope.tenantId,
            storeId: access.scope.storeId,
            userId: input.userId,
        });
        await ensureAnswerlatticeAuthUserDisabledState(String(existingData.email || ''), true);
    }

    const updated = await target.ref.get();
    return NextResponse.json({
        success: true,
        user: sanitizeAnswerlatticeStaffUser(input.userId, updated.data(), access.roles),
        userId: input.userId,
    });
};

export const requestAnswerlatticeStaffPasswordReset = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'AUTH_SENSITIVE', 'answerlattice-staff-password-reset');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticeTeamPermission(request, session);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const validation = validateAPIInput(UserIdSchema, await request.json().catch(() => ({})));
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Password Reset', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as UserIdInput;
    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = target.data || {};
    if (existingData.active === false || existingData.deleted === true) {
        return jsonError('Activate this team member before creating new login details.', 409, 'STAFF_INACTIVE');
    }

    const email = String(existingData.email || '').toLowerCase().trim();
    if (!email) return jsonError('Team member does not have a login account.', 400, 'LOGIN_MISSING');
    const now = admin.firestore.Timestamp.now();
    const currentStores = Array.isArray(existingData.stores) ? existingData.stores : [];
    const currentStore = currentStores.find((store: any) => Number(store.storeId) === access.scope.storeId);
    const roleId = currentStore?.role || existingData.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    const storeIds = (Array.isArray(existingData.storeIds) ? existingData.storeIds : currentStores.map((store: any) => store.storeId))
        .map(Number)
        .filter(isPositiveId);

    const existingLoginUsername = resolveStaffLoginUsername(existingData.loginUsername || existingData.staffLoginId);
    const loginUsername = existingLoginUsername || await generateUniqueAnswerlatticeStaffLoginId();
    const loginId = resolveStaffLoginDisplayId(loginUsername);
    const temporaryPasscode = generateStaffPasscode();
    const firebaseUser = existingData.firebaseUid
        ? await authAdmin.getUser(String(existingData.firebaseUid))
        : await authAdmin.getUserByEmail(email);
    await authAdmin.updateUser(firebaseUser.uid, {
        disabled: false,
        password: temporaryPasscode,
    });
    await authAdmin.revokeRefreshTokens(firebaseUser.uid);
    await syncAnswerlatticeAuthClaimsForStaffUser({
        active: true,
        email,
        platformRole: existingData.platformRole,
        roleId,
        roles: access.roles,
        storeId: access.scope.storeId,
        storeIds: storeIds.length ? storeIds : [access.scope.storeId],
        tenantId: access.scope.tenantId,
        userId: input.userId,
    });
    await target.ref.update(sanitizeFirestoreValue({
        authDisabled: false,
        authTokensRevokedAt: now,
        loginUsername,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        passcodeResetAt: now,
        passcodeResetBy: session?.uId || session?.user?.id,
        passwordResetRequestedAt: now,
        passwordResetRequestedBy: session?.uId || session?.user?.id,
        sessionRevokedAt: now,
        sessionRevokedBy: session?.uId || session?.user?.id,
        sessionRevokedByEmail: session?.user?.email,
        sessionRevokedReason: 'answerlattice_staff_passcode_reset',
        staffLoginId: loginId,
    }));
    const updated = await target.ref.get();

    return NextResponse.json({
        success: true,
        message: 'Temporary team passcode created.',
        staffAuthMode: getStaffAuthMode(existingData),
        staffLoginId: loginId,
        temporaryPasscode,
        user: sanitizeAnswerlatticeStaffUser(input.userId, updated.data(), access.roles),
        userId: input.userId,
    });
};

export const forceSignOutAnswerlatticeStaffUser = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'AUTH_SENSITIVE', 'answerlattice-staff-force-signout');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticeTeamPermission(request, session);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const validation = validateAPIInput(UserIdSchema, await request.json().catch(() => ({})));
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Force Signout', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as UserIdInput;
    try {
        ensureNotSelfDestructive(session, input.userId);
    } catch {
        return jsonError('You cannot sign yourself out from here.', 409, 'SELF_UPDATE_BLOCKED');
    }

    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = target.data || {};
    if (Number(existingData.tenantId || existingData.tId) !== access.scope.tenantId) {
        logSecurity('Authorization Failed - Answerlattice Staff Force Signout Tenant Mismatch', session, request, {
            requestedTenantId: access.scope.tenantId,
            targetTenantId: existingData.tenantId || existingData.tId,
            userId: input.userId,
        }, 'critical');
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }

    const currentStores = Array.isArray(existingData.stores) ? existingData.stores : [];
    const currentStore = currentStores.find((store: any) => Number(store.storeId) === access.scope.storeId);
    if (!currentStore || existingData.deleted === true) {
        return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
    }
    if (existingData.active === false) {
        return jsonError('This team member is already deactivated.', 409, 'STAFF_INACTIVE');
    }

    const email = String(existingData.email || '').toLowerCase().trim();
    const roleId = currentStore.role || existingData.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    const storeIds = (Array.isArray(existingData.storeIds) ? existingData.storeIds : currentStores.map((store: any) => store.storeId))
        .map(Number)
        .filter(isPositiveId);
    const now = admin.firestore.Timestamp.now();

    await revokeDefaultFirebaseRefreshTokens(existingData, email, {
        action: 'answerlattice-staff-force-signout',
        tenantId: access.scope.tenantId,
        storeId: access.scope.storeId,
        userId: input.userId,
    });
    await syncAnswerlatticeAuthClaimsForStaffUser({
        active: true,
        email,
        platformRole: existingData.platformRole,
        roleId,
        roles: access.roles,
        storeId: access.scope.storeId,
        storeIds: storeIds.length ? storeIds : [access.scope.storeId],
        tenantId: access.scope.tenantId,
        userId: input.userId,
    });
    await target.ref.update(sanitizeFirestoreValue({
        authTokensRevokedAt: now,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        sessionRevokedAt: now,
        sessionRevokedBy: session?.uId || session?.user?.id,
        sessionRevokedByEmail: session?.user?.email,
        sessionRevokedReason: 'owner_force_signout',
    }));

    logger.info('[Answerlattice Staff] Owner forced team member session signout', {
        tenantId: access.scope.tenantId,
        storeId: access.scope.storeId,
        userId: input.userId,
    });

    const updated = await target.ref.get();
    return NextResponse.json({
        success: true,
        message: 'Team member signed out.',
        user: sanitizeAnswerlatticeStaffUser(input.userId, updated.data(), access.roles),
        userId: input.userId,
    });
};

export const saveAnswerlatticeRoleDefinition = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'DATA_WRITE', 'answerlattice-role-save');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const validation = validateAPIInput(SaveAnswerlatticeRoleSchema, await request.json().catch(() => ({})));
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Role Save', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as SaveAnswerlatticeRoleInput;
    const db = getAnswerlatticeDb();
    if (!db) return jsonError('Answerlattice Firebase is not configured', 503, 'ANSWERLATTICE_FIREBASE_NOT_CONFIGURED');
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(access.scope.storeId));
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) return jsonError('Workspace not found', 404, 'STORE_NOT_FOUND');
    const storeData = storeSnap.data() || {};
    const existingRoles = await ensureAnswerlatticeRolesForStore(storeRef, storeData, session?.user?.email);
    const existingIndex = input.role.id ? existingRoles.findIndex((role) => role.id === input.role.id) : -1;
    const existingRole = existingIndex >= 0 ? existingRoles[existingIndex] : null;
    const roleId = input.role.id || `custom-${access.scope.storeId}-${Date.now()}`;
    if (roleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
        return jsonError('Owner role is locked', 409, 'OWNER_ROLE_LOCKED');
    }
    if (input.role.active === false && await roleIsAssignedToActiveUser(access.scope.tenantId, access.scope.storeId, roleId)) {
        return jsonError('This role is assigned to active team members. Reassign them before turning it off.', 409, 'ROLE_IN_USE');
    }

    const now = new Date().toISOString();
    const nextRole: AnswerlatticeRoleDefinition = {
        active: input.role.active ?? existingRole?.active ?? true,
        createdBy: existingRole?.createdBy || session?.user?.email || 'system',
        createdOn: existingRole?.createdOn || now,
        description: input.role.description || '',
        id: roleId,
        modifiedBy: session?.user?.email || 'system',
        modifiedOn: now,
        name: input.role.name,
        permissions: normalizeAnswerlatticeRolePermissions(input.role.permissions as Record<AnswerlatticePermissionKey, boolean>),
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: access.scope.tenantId,
        sId: access.scope.storeId,
    };
    const roles = [...existingRoles];
    if (existingIndex >= 0) roles[existingIndex] = nextRole;
    else roles.push(nextRole);

    await storeRef.update(sanitizeFirestoreValue({
        answerlatticeRoles: roles,
        modifiedBy: session?.user?.email,
        modifiedOn: admin.firestore.Timestamp.now(),
    }));

    return NextResponse.json({
        role: nextRole,
        roles,
        success: true,
    });
};

export const deleteAnswerlatticeRoleDefinition = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'DATA_WRITE', 'answerlattice-role-delete');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const validation = validateAPIInput(DeleteAnswerlatticeRoleSchema, {
        roleId: request.nextUrl.searchParams.get('roleId'),
    });
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Role Delete', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const { roleId } = validation.data as DeleteAnswerlatticeRoleInput;
    if (roleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
        return jsonError('Owner role is locked', 409, 'OWNER_ROLE_LOCKED');
    }
    if (await roleIsAssignedToActiveUser(access.scope.tenantId, access.scope.storeId, roleId)) {
        return jsonError('This role is assigned to active team members. Reassign them before turning it off.', 409, 'ROLE_IN_USE');
    }

    const db = getAnswerlatticeDb();
    if (!db) return jsonError('Answerlattice Firebase is not configured', 503, 'ANSWERLATTICE_FIREBASE_NOT_CONFIGURED');
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(access.scope.storeId));
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) return jsonError('Workspace not found', 404, 'STORE_NOT_FOUND');
    const storeData = storeSnap.data() || {};
    const current = normalizeAnswerlatticeRolesForStore(storeData.answerlatticeRoles, access.scope.tenantId, access.scope.storeId, session?.user?.email);
    const roles = current.roles.map((role) => (
        role.id === roleId
            ? {
                ...role,
                active: false,
                modifiedBy: session?.user?.email || 'system',
                modifiedOn: new Date().toISOString(),
            }
            : role
    ));

    await storeRef.update(sanitizeFirestoreValue({
        answerlatticeRoles: roles,
        modifiedBy: session?.user?.email,
        modifiedOn: admin.firestore.Timestamp.now(),
    }));

    return NextResponse.json({
        roles,
        success: true,
    });
};
