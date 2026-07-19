import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    ANSWERLATTICE_PERMISSION_KEYS,
    AnswerlatticePermissionKey,
    AnswerlatticeRoleDefinition,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    DEFAULT_ANSWERLATTICE_ROLE_METADATA,
    isDefaultAnswerlatticeRoleId,
    normalizeAnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { STAFF_EMAIL_DOMAIN } from '@constant/urls';
import {
    ECOMSAI_PLATFORM_SUPPORT_USER_ROLE,
    ECOMSAI_PLATFORM_USER_ROLE,
} from '@constant/user';
import { formatStaffLoginId, getDisplayEmail, isInternalAuthEmail, normalizeStaffLoginUsername } from '@lib/auth/loginIdentifiers';
import { AuthUserIdentityConflictError, getAuthUserByEmail } from '@lib/auth/serverUserContext';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    findAnswerlatticeRole,
    getAnswerlatticeDb,
    normalizeAnswerlatticeRolesForStore,
    requireAnswerlatticePermission,
    requireAnswerlatticeTeamPermission,
} from '@lib/answerlattice/accessControl';
import {
    getAnswerlatticeSecurityLogContext,
    getBoundedAnswerlatticeStringContext,
    logAnswerlatticeDiagnostic,
    logAnswerlatticeFailure,
} from '@lib/answerlattice/diagnostics';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    normalizeAnswerlatticeStaffUserId,
    requireAnswerlatticeStaffUserId,
} from '@lib/answerlattice/staffUserIdBoundary';
import {
    AnswerlatticeStaffStoreMembership,
    getAnswerlatticeStaffMembership,
    isAnswerlatticeManagedStaffIdentityCollision,
    isAnswerlatticeStaffSelfTarget,
    isAnswerlatticeStaffAccountActive,
    isAnswerlatticeStaffRemovalReplay,
    readAnswerlatticeStaffAccessState,
    resolveAnswerlatticeStaffAuthLookup,
    shouldSendAnswerlatticeStaffSetupEmail,
} from '@lib/answerlattice/staffAccessContracts';
import {
    buildAnswerlatticeStaffClaimAccessProjection,
    buildAnswerlatticeStaffClaimStateSignature,
    normalizeAnswerlatticeStaffClaimPlatformRole,
    selectAnswerlatticeStaffClaimMembership,
} from '@lib/answerlattice/staffClaimsContracts';
import { syncAnswerlatticeStaffProductAccountBridge } from '@lib/answerlattice/staffAccessBridge';
import {
    buildAnswerlatticeRoleCreationFingerprint,
    classifyAnswerlatticeRoleCreationReplay,
    normalizeAnswerlatticeRoleInputPermissions,
} from '@lib/answerlattice/staffRoleContracts';
import {
    AnswerlatticeStaffTransactionError,
    createAnswerlatticeStaffMembershipTransaction,
    getAnswerlatticeRoleAssignedUserIdsInTransaction,
    isAnswerlatticeRoleAssignedInTransaction,
    removeAnswerlatticeStaffMembershipTransaction,
    updateAnswerlatticeStaffMembershipTransaction,
} from '@lib/answerlattice/staffAccessTransactions';
import {
    isAnswerlatticeActiveStoreInScope,
} from '@lib/answerlattice/sessionScope';
import { answerlatticeAuthAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin, authAdmin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { logger } from '@lib/monitoring/logger';
import { normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const STAFF_LOGIN_ID_PREFIX = '77';
const STAFF_AUTH_MODE_EMAIL = 'email';
const STAFF_AUTH_MODE_OWNER_PASSCODE = 'owner_passcode';
const STAFF_STORE_USER_QUERY_LIMIT = 500;
const ANSWERLATTICE_CUSTOM_ROLE_LIMIT = 25;
const ANSWERLATTICE_STAFF_MUTATION_MAX_BODY_BYTES = 16 * 1024;
const FIREBASE_AUTH_SEND_OOB_CODE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode';
const ANSWERLATTICE_STAFF_PASSWORD_RESET_PROVIDER_TIMEOUT_MS = 10_000;
const ANSWERLATTICE_STAFF_POLICY_ERROR_CODES = {
    MULTI_WORKSPACE_AUTH_CHANGE: 'MULTI_WORKSPACE_AUTH_CHANGE',
    SELF_UPDATE_BLOCKED: 'SELF_UPDATE_BLOCKED',
} as const;

type AnswerlatticeStaffPolicyErrorCode = typeof ANSWERLATTICE_STAFF_POLICY_ERROR_CODES[keyof typeof ANSWERLATTICE_STAFF_POLICY_ERROR_CODES];

class AnswerlatticeStaffPolicyError extends Error {
    readonly code: AnswerlatticeStaffPolicyErrorCode;

    constructor(code: AnswerlatticeStaffPolicyErrorCode) {
        super(code);
        this.name = 'AnswerlatticeStaffPolicyError';
        this.code = code;
    }
}

const getAnswerlatticeStaffPolicyErrorCode = (error: unknown): AnswerlatticeStaffPolicyErrorCode | null => (
    error instanceof AnswerlatticeStaffPolicyError ? error.code : null
);

const optionalTrimmedStringSchema = (max: number) => z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    return value;
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
    requestId: z.string().trim().uuid(),
}).strict();

const AnswerlatticeStaffUserIdSchema = z.string()
    .trim()
    .max(160)
    .refine((value) => normalizeAnswerlatticeStaffUserId(value) === value, 'Invalid user ID');

const UpdateAnswerlatticeStaffSchema = z.object({
    userId: AnswerlatticeStaffUserIdSchema,
    name: optionalTrimmedStringSchema(160),
    active: z.boolean().optional(),
    roleId: optionalTrimmedStringSchema(120),
    countryCode: optionalTrimmedStringSchema(8),
    dialCode: optionalTrimmedStringSchema(8),
    phoneNumber: optionalTrimmedStringSchema(32),
}).strict();

const UserIdSchema = z.object({
    userId: AnswerlatticeStaffUserIdSchema,
}).strict();

const SaveAnswerlatticeRoleSchema = z.object({
    requestId: z.string().trim().uuid().optional(),
    role: z.object({
        active: z.boolean().optional(),
        description: z.string().trim().max(300).optional(),
        id: z.string().trim().min(1).max(120).optional(),
        name: z.string().trim().min(1).max(80),
        permissions: RolePermissionsSchema,
    }).strict(),
}).strict();

const DeleteAnswerlatticeRoleSchema = z.object({
    roleId: z.string().trim().min(1).max(120),
}).strict();

type CreateAnswerlatticeStaffInput = {
    countryCode?: string;
    dialCode?: string;
    email: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
    requestId: string;
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
    requestId?: string;
    role: {
        active?: boolean;
        description?: string;
        id?: string;
        name: string;
        permissions: Record<string, boolean>;
    };
};

const buildDeterministicAnswerlatticeRoleId = (
    tenantId: number,
    storeId: number,
    requestId: string,
) => `custom-${storeId}-${createHash('sha256')
    .update(`${PRODUCT_IDS.ANSWERLATTICE}:${tenantId}:${storeId}:role:${requestId}`)
    .digest('hex')
    .slice(0, 20)}`;

type DeleteAnswerlatticeRoleInput = {
    roleId: string;
};

type DefaultAuthUserDoc = {
    id: string;
    [key: string]: unknown;
};

const isUnknownRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const getRecord = (value: unknown): Record<string, unknown> => (
    isUnknownRecord(value) ? value : {}
);

const privateJson = (body: unknown, status = 200) => (
    NextResponse.json(body, {
        headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
        status,
    })
);

const jsonError = (error: string, status: number, code?: string) => (
    privateJson({ error, code }, status)
);

const readAnswerlatticeStaffMutationBody = async (request: NextRequest) => {
    const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_STAFF_MUTATION_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid input',
        tooLargeMessage: 'Request body too large',
    });
    if (bodyResult.ok === true) return { data: bodyResult.data, success: true as const };

    const isTooLarge = bodyResult.response.status === 413;
    return {
        error: isTooLarge ? 'Request body too large' : 'Invalid JSON',
        response: jsonError(
            isTooLarge ? 'Request body too large' : 'Invalid input',
            isTooLarge ? 413 : 400,
            isTooLarge ? 'REQUEST_TOO_LARGE' : 'INVALID_INPUT',
        ),
        success: false as const,
    };
};

const getValidationLogError = (validation: { success: boolean; error?: string }) => (
    validation.success ? 'Invalid input' : validation.error || 'Invalid input'
);

const getDefaultAuthUserByEmail = async (email: string): Promise<DefaultAuthUserDoc | null> => (
    await getAuthUserByEmail(email) as DefaultAuthUserDoc | null
);

const sanitizeFirestoreValue = <T>(value: T) => sanitizeForFirestore(value, {
    undefinedObjectValue: 'omit',
});

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
        key: buildAnswerlatticeRateLimitKey(keyPrefix, session?.uId || session?.user?.id || getRequestIp(request)),
        ...config,
    });
    if (result.allowed) return null;

    logger.security('Rate Limit Exceeded', {
        ...getAnswerlatticeSecurityLogContext(session, request, request.nextUrl.pathname, {
            ...getBoundedAnswerlatticeStringContext('feature', feature),
            ...getBoundedAnswerlatticeStringContext('keyPrefix', keyPrefix),
        }),
    }, 'medium');

    return privateJson({ error: 'Too many requests. Please wait before trying again.' }, 429);
};

const getAnswerlatticeSecurityDetailsContext = (
    details: Record<string, unknown>,
): Record<string, boolean | number | string | null | undefined> => (
    Object.entries(details).reduce<Record<string, boolean | number | string | null | undefined>>((acc, [key, value]) => {
        if (value === undefined || value === null || typeof value === 'boolean') {
            acc[key] = value as boolean | null | undefined;
            return acc;
        }
        Object.assign(acc, getBoundedAnswerlatticeStringContext(key, value));
        return acc;
    }, {})
);

const logSecurity = (
    event: string,
    session: any,
    request: NextRequest,
    details: Record<string, unknown>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
) => {
    logger.security(event, {
        ...getAnswerlatticeSecurityLogContext(
            session,
            request,
            request.nextUrl.pathname,
            getAnswerlatticeSecurityDetailsContext(details),
        ),
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

const buildDeterministicAnswerlatticeStaffLoginId = (
    tenantId: number,
    storeId: number,
    requestId: string,
) => {
    const digest = createHash('sha256')
        .update(`${PRODUCT_IDS.ANSWERLATTICE}:${tenantId}:${storeId}:${requestId}`)
        .digest('hex');
    const digits = digest
        .slice(0, 14)
        .split('')
        .map((value) => String(Number.parseInt(value, 16) % 10))
        .join('');
    return `${STAFF_LOGIN_ID_PREFIX}${digits}`;
};

const buildAnswerlatticeStaffCreationFingerprint = (
    input: CreateAnswerlatticeStaffInput,
    tenantId: number,
    storeId: number,
) => createHash('sha256').update(JSON.stringify({
    countryCode: input.countryCode || '',
    dialCode: input.dialCode || '',
    email: input.email || '',
    name: input.name || '',
    phoneNumber: input.phoneNumber || '',
    requestId: input.requestId,
    roleId: input.roleId || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF,
    storeId,
    tenantId,
})).digest('hex');

const isManagedStaffEmail = (email?: string) => (
    String(email || '').toLowerCase().trim().endsWith(`@${STAFF_EMAIL_DOMAIN}`)
);

const getStaffAuthMode = (value: unknown) => {
    const data = getRecord(value);
    return (
    data.staffAuthMode === STAFF_AUTH_MODE_OWNER_PASSCODE || isManagedStaffEmail(
        typeof data.email === 'string' ? data.email : '',
    )
        ? STAFF_AUTH_MODE_OWNER_PASSCODE
        : STAFF_AUTH_MODE_EMAIL
    );
};

const getStaffDisplayEmail = (value: unknown) => {
    const data = getRecord(value);
    const email = typeof data.email === 'string' ? data.email : '';
    return getStaffAuthMode(data) === STAFF_AUTH_MODE_OWNER_PASSCODE || isInternalAuthEmail(email)
        ? ''
        : getDisplayEmail(email);
};

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

const getFirebaseAuthApiKey = () => process.env.FIREBASE_API_KEY;

const normalizeFirebaseAuthApiKey = (value?: string) => {
    const apiKey = String(value || '').trim();
    if (!apiKey || /[\s\x00-\x1F\x7F]/.test(apiKey)) return null;
    return apiKey;
};

const buildFirebasePasswordResetEndpoint = (apiKey: string) => {
    const endpoint = new URL(FIREBASE_AUTH_SEND_OOB_CODE_URL);
    endpoint.searchParams.set('key', apiKey);
    return endpoint.toString();
};

const getPasswordResetProviderLogContext = (email: string, response?: Response) => ({
    provider: 'firebase_auth_send_oob_code',
    ...getBoundedAnswerlatticeStringContext('email', email),
    responseOk: response?.ok,
    responseStatus: response?.status,
});

const sendFirebasePasswordResetEmail = async (email: string) => {
    const apiKey = normalizeFirebaseAuthApiKey(getFirebaseAuthApiKey());
    if (!apiKey) {
        return { ok: false, error: 'FIREBASE_API_KEY_MISSING' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANSWERLATTICE_STAFF_PASSWORD_RESET_PROVIDER_TIMEOUT_MS);

    try {
        const response = await fetch(buildFirebasePasswordResetEndpoint(apiKey), {
            body: JSON.stringify({
                email,
                requestType: 'PASSWORD_RESET',
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            redirect: 'manual',
            signal: controller.signal,
        });

        if (response.ok) return { ok: true };
        logAnswerlatticeFailure(
            'answerlattice_staff_password_reset_provider_rejected',
            undefined,
            getPasswordResetProviderLogContext(email, response),
        );
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_staff_password_reset_provider_failed',
            error,
            getPasswordResetProviderLogContext(email),
        );
    } finally {
        clearTimeout(timeout);
    }

    return { ok: false, error: 'PASSWORD_RESET_EMAIL_FAILED' };
};

const serializeTimestamp = (value: unknown) => {
    if (!value) return undefined;
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value !== 'object') return undefined;
    const timestamp = value as { toDate?: () => Date; toMillis?: () => number };
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    return undefined;
};

const sanitizeAnswerlatticeStaffUser = (
    id: string,
    data: unknown,
    roles: AnswerlatticeRoleDefinition[],
    workspaceStoreId: number,
) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const record = data as Record<string, unknown>;
    const accessState = readAnswerlatticeStaffAccessState(record);
    if (!accessState) return null;
    const currentMembership = getAnswerlatticeStaffMembership(accessState, workspaceStoreId);
    if (!currentMembership) return null;
    const stores = accessState.memberships;
    const roleId = currentMembership.role;
    const role = findAnswerlatticeRole(roles, roleId);

    return {
        id,
        accessRevision: accessState.accessRevision,
        active: isAnswerlatticeStaffAccountActive(record, accessState),
        authDisabled: record.authDisabled === true,
        countryCode: typeof record.countryCode === 'string' ? record.countryCode : '',
        createdVia: typeof record.createdVia === 'string' ? record.createdVia : '',
        deleted: record.deleted === true,
        dialCode: typeof record.dialCode === 'string' ? record.dialCode : '',
        displayEmail: getStaffDisplayEmail(record),
        email: typeof record.email === 'string' ? record.email : '',
        isVerified: record.isVerified === true,
        loginUsername: typeof record.loginUsername === 'string' ? record.loginUsername : '',
        name: typeof record.name === 'string' ? record.name : '',
        phoneNumber: typeof record.phoneNumber === 'string' ? record.phoneNumber : '',
        phoneUsername: typeof record.phoneUsername === 'string' ? record.phoneUsername : '',
        profileImage: typeof record.profileImage === 'string'
            ? record.profileImage
            : typeof record.image === 'string' ? record.image : '',
        roleId,
        roleName: role?.name || roleId,
        sessionRevokedAt: serializeTimestamp(record.sessionRevokedAt),
        staffAuthMode: getStaffAuthMode(record),
        staffLoginId: resolveStaffLoginDisplayId(
            typeof record.staffLoginId === 'string'
                ? record.staffLoginId
                : typeof record.loginUsername === 'string' ? record.loginUsername : '',
        ),
        storeId: workspaceStoreId,
        storeIds: stores.map((store) => store.storeId),
        stores,
        tenantId: accessState.tenantId,
    };
};

const getAnswerlatticeUserByEmail = async (email: string) => {
    const db = getAnswerlatticeDb();
    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!db || !normalizedEmail) return null;

    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('email', '==', normalizedEmail)
        .limit(2)
        .get();
    if (snapshot.empty) return null;
    if (snapshot.size !== 1) throw new AnswerlatticeStaffTransactionError('FORBIDDEN');

    const doc = snapshot.docs[0];
    return { id: doc.id, ref: doc.ref, data: doc.data() };
};

const getAnswerlatticeUserById = async (userId: string) => {
    const db = getAnswerlatticeDb();
    if (!db) return null;
    const normalizedUserId = normalizeAnswerlatticeStaffUserId(userId);
    if (!normalizedUserId) return null;
    const doc = await db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId).get();
    return doc.exists ? { id: doc.id, ref: doc.ref, data: doc.data() || {} } : null;
};

const syncDefaultAuthProductAccount = async (params: {
    accessRevision: number;
    active?: boolean;
    email: string;
    fallbackStoreId: number;
    firebaseUid?: string;
    loginUsername?: string;
    memberships: AnswerlatticeStaffStoreMembership[];
    name: string;
    primaryMembership: AnswerlatticeStaffStoreMembership | null;
    staffAuthMode: string;
    tenantId: number;
    userId: string;
}) => {
    const existingDefaultUser = await getDefaultAuthUserByEmail(params.email);
    const userId = requireAnswerlatticeStaffUserId(params.userId);
    const defaultUserId = requireAnswerlatticeStaffUserId(existingDefaultUser?.id || userId);
    await syncAnswerlatticeStaffProductAccountBridge({
        ...params,
        active: params.active !== false,
        db: firestoreAdmin,
        defaultUserId,
        userId,
    });
};

const createOrGetDefaultFirebaseUser = async (params: {
    displayName: string;
    email: string;
    password: string;
}) => {
    try {
        const user = await authAdmin.createUser({
            displayName: params.displayName,
            email: params.email,
            emailVerified: false,
            password: params.password,
        });
        return { created: true, user };
    } catch (error: unknown) {
        if (getErrorCode(error) !== 'auth/email-already-exists') throw error;
        return { created: false, user: await authAdmin.getUserByEmail(params.email) };
    }
};

const cleanupUnadoptedDefaultFirebaseUser = async (params: {
    db: FirebaseFirestore.Firestore;
    firebaseUid: string;
    tenantId: number;
    userId: string;
}) => {
    try {
        const userId = requireAnswerlatticeStaffUserId(params.userId);
        const userSnapshot = await params.db.collection(DB_COLLECTIONS.USERS).doc(userId).get();
        if (userSnapshot.data()?.firebaseUid === params.firebaseUid) return;
        await authAdmin.deleteUser(params.firebaseUid);
    } catch (error) {
        logAnswerlatticeFailure('answerlattice_staff_auth_compensation_failed', error, {
            ...getBoundedAnswerlatticeStringContext('tenantId', params.tenantId),
            ...getBoundedAnswerlatticeStringContext('userId', params.userId),
        });
    }
};

const getErrorCode = (error: unknown): string => (
    error && typeof error === 'object' && 'code' in error ? String(error.code || '') : ''
);

const revokeDefaultFirebaseRefreshTokens = async (
    data: Record<string, unknown>,
    fallbackEmail: string,
    context: Record<string, unknown>,
) => {
    const lookup = resolveAnswerlatticeStaffAuthLookup({
        dataEmail: data.email,
        fallbackEmail,
        firebaseUid: data.firebaseUid,
    });
    if (!lookup) return null;
    try {
        const firebaseUser = lookup.type === 'email'
            ? await authAdmin.getUserByEmail(lookup.email)
            : await authAdmin.getUser(lookup.uid);
        await authAdmin.revokeRefreshTokens(firebaseUser.uid);
        return firebaseUser;
    } catch (error: unknown) {
        if (getErrorCode(error) !== 'auth/user-not-found') throw error;
        logAnswerlatticeDiagnostic('answerlattice_staff_default_auth_user_missing_on_revoke', {
            ...getAnswerlatticeSecurityDetailsContext(context),
            ...getBoundedAnswerlatticeStringContext(
                lookup.type === 'email' ? 'email' : 'firebaseUid',
                lookup.type === 'email' ? lookup.email : lookup.uid,
            ),
        });
        return null;
    }
};

const isPlatformRole = (value: unknown) => {
    const role = String(value || '').toUpperCase();
    return role === ECOMSAI_PLATFORM_USER_ROLE || role === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE;
};

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

const readAnswerlatticeStaffClaimStoreProjection = async (params: {
    accountActive: boolean;
    db: FirebaseFirestore.Firestore;
    platformRole: string;
    roleId: string;
    state: ReturnType<typeof readAnswerlatticeStaffAccessState> & {};
    storeId: number;
}) => {
    const storeSnapshot = await params.db.collection(DB_COLLECTIONS.STORES).doc(String(params.storeId)).get();
    const storeData = storeSnapshot.data();
    const storeIsActive = storeSnapshot.exists && isAnswerlatticeActiveStoreInScope(
        storeData,
        { storeId: params.storeId, tenantId: params.state.tenantId },
        storeSnapshot.id,
    );
    const roles = storeIsActive
        ? normalizeAnswerlatticeRolesForStore(
            storeData?.answerlatticeRoles,
            params.state.tenantId,
            params.storeId,
            'system',
        ).roles
        : [];
    const expectedStoreIds = [String(params.storeId)];
    const claimAccess = buildAnswerlatticeStaffClaimAccessProjection({
        accountActive: params.accountActive,
        roleId: params.roleId,
        storeIds: expectedStoreIds,
        storeIsActive,
    });
    const adminClaim = params.accountActive && (
        isPlatformRole(params.platformRole)
        || (storeIsActive && params.roleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER)
    );
    const permissionClaims = buildAnswerlatticePermissionClaims(
        roles,
        claimAccess.roleId,
        params.accountActive ? params.platformRole : undefined,
    );

    return {
        adminClaim,
        claimAccess,
        permissionClaims,
        signature: buildAnswerlatticeStaffClaimStateSignature({
            accountActive: params.accountActive,
            admin: adminClaim,
            permissions: permissionClaims,
            platformRole: params.platformRole,
            roleId: claimAccess.roleId,
            storeId: params.storeId,
            storeIds: claimAccess.storeIds,
            storeIsActive,
            tenantId: params.state.tenantId,
        }),
    };
};

const syncAnswerlatticeAuthClaimsForStaffUser = async (params: {
    fallbackStoreId: number;
    forceClaimsRefresh?: boolean;
    forceRevoke?: boolean;
    userId: string;
}) => {
    const db = getAnswerlatticeDb();
    if (!db) throw new Error('ANSWERLATTICE_STAFF_CLAIM_SYNC_FIREBASE_UNAVAILABLE');
    const normalizedUserId = requireAnswerlatticeStaffUserId(params.userId);

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const target = await getAnswerlatticeUserById(normalizedUserId);
        if (!target) throw new Error('ANSWERLATTICE_STAFF_CLAIM_SYNC_USER_MISSING');
        const data = getRecord(target.data);
        const state = readAnswerlatticeStaffAccessState(data);
        if (!state) throw new Error('ANSWERLATTICE_STAFF_CLAIM_SYNC_STATE_INVALID');
        const email = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
        if (!email) throw new Error('ANSWERLATTICE_STAFF_CLAIM_SYNC_EMAIL_MISSING');
        const platformRole = normalizeAnswerlatticeStaffClaimPlatformRole(data.platformRole);
        const active = data.active !== false && data.deleted !== true && data.authDisabled !== true && state.memberships.length > 0;
        let synchronizedClaimState: {
            signature: string;
            storeId: number;
        } | null = null;
        try {
            const answerlatticeUser = await answerlatticeAuthAdmin.getUserByEmail(email);
            const selectedMembership = selectAnswerlatticeStaffClaimMembership(state, {
                currentClaimStoreId: answerlatticeUser.customClaims?.storeId,
                preferredStoreId: params.fallbackStoreId,
            });
            const storeId = selectedMembership?.storeId || params.fallbackStoreId;
            const roleId = selectedMembership?.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
            const expectedClaimRoleId = active ? roleId : 'inactive';
            const expectedClaimStoreIds = active ? [String(storeId)] : [];
            const currentStoreIds = Array.isArray(answerlatticeUser.customClaims?.storeIds)
                ? answerlatticeUser.customClaims.storeIds.map((value: unknown) => String(value))
                : [];
            const claimsNeedUpdate = params.forceClaimsRefresh === true
                || answerlatticeUser.customClaims?.accessRevision !== state.accessRevision
                || answerlatticeUser.customClaims?.pId !== PRODUCT_IDS.ANSWERLATTICE
                || String(answerlatticeUser.customClaims?.tenantId || '') !== String(state.tenantId)
                || String(answerlatticeUser.customClaims?.storeId || '') !== String(storeId)
                || String(answerlatticeUser.customClaims?.role || '') !== expectedClaimRoleId
                || String(answerlatticeUser.customClaims?.platformRole || '') !== platformRole
                || String(answerlatticeUser.customClaims?.uId || '') !== normalizedUserId
                || JSON.stringify(currentStoreIds) !== JSON.stringify(expectedClaimStoreIds);
            const disabledNeedsUpdate = answerlatticeUser.disabled === active;
            if (claimsNeedUpdate) {
                const claimState = await readAnswerlatticeStaffClaimStoreProjection({
                    accountActive: active,
                    db,
                    platformRole,
                    roleId,
                    state,
                    storeId,
                });
                await answerlatticeAuthAdmin.setCustomUserClaims(answerlatticeUser.uid, {
                    accessRevision: state.accessRevision,
                    admin: claimState.adminClaim,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    platformRole,
                    role: claimState.claimAccess.roleId,
                    storeId: String(storeId),
                    storeIds: claimState.claimAccess.storeIds,
                    tenantId: String(state.tenantId),
                    uId: normalizedUserId,
                    ...claimState.permissionClaims,
                });
                synchronizedClaimState = {
                    signature: claimState.signature,
                    storeId,
                };
            }
            if (disabledNeedsUpdate) {
                await answerlatticeAuthAdmin.updateUser(answerlatticeUser.uid, { disabled: !active });
            }
            if (claimsNeedUpdate || disabledNeedsUpdate || params.forceRevoke) {
                await answerlatticeAuthAdmin.revokeRefreshTokens(answerlatticeUser.uid);
            }
        } catch (error: unknown) {
            if (getErrorCode(error) !== 'auth/user-not-found') throw error;
            return;
        }

        const refreshed = await getAnswerlatticeUserById(normalizedUserId);
        const refreshedData = getRecord(refreshed?.data);
        const refreshedState = readAnswerlatticeStaffAccessState(refreshedData);
        if (!refreshedState) throw new Error('ANSWERLATTICE_STAFF_CLAIM_SYNC_STATE_INVALID');
        if (refreshedState.accessRevision !== state.accessRevision) continue;
        if (!synchronizedClaimState) return;

        const refreshedMembership = selectAnswerlatticeStaffClaimMembership(refreshedState, {
            currentClaimStoreId: synchronizedClaimState.storeId,
            preferredStoreId: params.fallbackStoreId,
        });
        const refreshedStoreId = refreshedMembership?.storeId || params.fallbackStoreId;
        const refreshedRoleId = refreshedMembership?.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
        const refreshedPlatformRole = normalizeAnswerlatticeStaffClaimPlatformRole(refreshedData.platformRole);
        const refreshedActive = refreshedData.active !== false
            && refreshedData.deleted !== true
            && refreshedData.authDisabled !== true
            && refreshedState.memberships.length > 0;
        const refreshedClaimState = await readAnswerlatticeStaffClaimStoreProjection({
            accountActive: refreshedActive,
            db,
            platformRole: refreshedPlatformRole,
            roleId: refreshedRoleId,
            state: refreshedState,
            storeId: refreshedStoreId,
        });
        if (
            refreshedStoreId === synchronizedClaimState.storeId
            && refreshedClaimState.signature === synchronizedClaimState.signature
        ) {
            return;
        }
    }

    throw new Error('ANSWERLATTICE_STAFF_CLAIM_SYNC_STATE_CONFLICT');
};

const syncAnswerlatticeAuthClaimsForRoleMembers = async (params: {
    fallbackStoreId: number;
    userIds: string[];
}) => {
    const concurrency = 5;
    for (let index = 0; index < params.userIds.length; index += concurrency) {
        await Promise.all(params.userIds.slice(index, index + concurrency).map((userId) => (
            syncAnswerlatticeAuthClaimsForStaffUser({
                fallbackStoreId: params.fallbackStoreId,
                forceClaimsRefresh: true,
                forceRevoke: true,
                userId,
            })
        )));
    }
};

const repairAnswerlatticeStaffAccessProjections = async (params: {
    data: Record<string, unknown>;
    fallbackStoreId: number;
    forceClaimsRevoke?: boolean;
    operation: string;
    revokeDefault?: boolean;
    syncBridge?: boolean;
    syncClaims?: boolean;
    userId: string;
}): Promise<boolean> => {
    const state = readAnswerlatticeStaffAccessState(params.data);
    if (!state) {
        logAnswerlatticeFailure('answerlattice_staff_projection_state_invalid', undefined, {
            ...getBoundedAnswerlatticeStringContext('operation', params.operation),
            ...getBoundedAnswerlatticeStringContext('userId', params.userId),
        });
        return false;
    }

    const tasks: Array<{ name: string; run: () => Promise<unknown> }> = [];
    if (params.syncBridge) {
        tasks.push({
            name: 'default_product_account_bridge',
            run: () => syncDefaultAuthProductAccount({
                accessRevision: state.accessRevision,
                active: isAnswerlatticeStaffAccountActive(params.data, state),
                email: typeof params.data.email === 'string' ? params.data.email : '',
                fallbackStoreId: params.fallbackStoreId,
                firebaseUid: typeof params.data.firebaseUid === 'string' ? params.data.firebaseUid : undefined,
                loginUsername: typeof params.data.loginUsername === 'string' ? params.data.loginUsername : undefined,
                memberships: state.memberships,
                name: typeof params.data.name === 'string' ? params.data.name : '',
                primaryMembership: state.primaryMembership,
                staffAuthMode: getStaffAuthMode(params.data),
                tenantId: state.tenantId,
                userId: params.userId,
            }),
        });
    }
    if (params.syncClaims) {
        tasks.push({
            name: 'answerlattice_auth_claims',
            run: () => syncAnswerlatticeAuthClaimsForStaffUser({
                fallbackStoreId: params.fallbackStoreId,
                forceRevoke: params.forceClaimsRevoke,
                userId: params.userId,
            }),
        });
    }
    if (params.revokeDefault) {
        tasks.push({
            name: 'default_auth_revoke',
            run: () => revokeDefaultFirebaseRefreshTokens(
                params.data,
                typeof params.data.email === 'string' ? params.data.email : '',
                {
                    action: params.operation,
                    storeId: params.fallbackStoreId,
                    tenantId: state.tenantId,
                    userId: params.userId,
                },
            ),
        });
    }

    const results = await Promise.allSettled(tasks.map(({ run }) => run()));
    let complete = true;
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') return;
        complete = false;
        logAnswerlatticeFailure('answerlattice_staff_projection_repair_failed', result.reason, {
            ...getBoundedAnswerlatticeStringContext('operation', params.operation),
            ...getBoundedAnswerlatticeStringContext('projection', tasks[index]?.name || 'unknown'),
            ...getBoundedAnswerlatticeStringContext('userId', params.userId),
        });
    });
    return complete;
};

const validateRoleForAssignment = (
    roles: AnswerlatticeRoleDefinition[],
    roleId: string,
) => {
    const role = roles.find((item) => item.id === roleId && item.active !== false);
    if (!role) throw new Error('ROLE_NOT_FOUND');
    return role;
};

const ensureNotSelfDestructive = (session: any, targetUserId: string, targetEmail?: unknown) => {
    if (isAnswerlatticeStaffSelfTarget({
        sessionEmail: session?.user?.email,
        sessionUserId: session?.uId || session?.user?.id,
        targetEmail,
        targetUserId,
    })) {
        throw new AnswerlatticeStaffPolicyError(ANSWERLATTICE_STAFF_POLICY_ERROR_CODES.SELF_UPDATE_BLOCKED);
    }
};

const ensureWorkspaceLocalAuthMutation = (
    accessState: ReturnType<typeof readAnswerlatticeStaffAccessState>,
    isPlatformAdmin: boolean,
) => {
    if (accessState && accessState.memberships.length > 1 && !isPlatformAdmin) {
        throw new AnswerlatticeStaffPolicyError(
            ANSWERLATTICE_STAFF_POLICY_ERROR_CODES.MULTI_WORKSPACE_AUTH_CHANGE,
        );
    }
};

const canManageAnswerlatticeOwner = (access: {
    currentRoleId: string;
    isPlatformAdmin: boolean;
}) => access.isPlatformAdmin || access.currentRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER;

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
        .where('storeIds', 'array-contains', access.scope.storeId)
        .limit(STAFF_STORE_USER_QUERY_LIMIT + 1)
        .get();
    if (snapshot.size > STAFF_STORE_USER_QUERY_LIMIT) {
        return jsonError(
            'This workspace has too many team members to load safely.',
            409,
            'STAFF_LIST_LIMIT_EXCEEDED',
        );
    }
    const users = snapshot.docs
        .map((doc) => sanitizeAnswerlatticeStaffUser(doc.id, doc.data(), access.roles, access.scope.storeId))
        .filter((user): user is NonNullable<typeof user> => Boolean(user))
        .filter((user) => user.tenantId === access.scope.tenantId)
        .filter((user) => user.deleted !== true)
        .filter((user) => user.storeIds.includes(access.scope.storeId))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

    return privateJson({
        access,
        roles: access.roles,
        store: {
            name: access.storeName,
            storeId: access.scope.storeId,
            tenantId: access.scope.tenantId,
        },
        users,
    });
};

export const createAnswerlatticeStaffUser = async (request: NextRequest, session: any) => {
    if (!verifyStaffFeature()) return jsonError('Answerlattice staff access is not enabled.', 403, 'FEATURE_DISABLED');
    const rateLimit = await applyRateLimit(request, session, 'AUTH_SENSITIVE', 'answerlattice-staff-create');
    if (rateLimit) return rateLimit;

    const { access, response } = await requireAnswerlatticeTeamPermission(request, session);
    if (response) return response;
    if (!access) return jsonError('Forbidden', 403, 'FORBIDDEN');

    const bodyResult = await readAnswerlatticeStaffMutationBody(request);
    if (!bodyResult.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Create', session, request, { error: bodyResult.error }, 'medium');
        return bodyResult.response;
    }

    const validation = validateAPIInput(CreateAnswerlatticeStaffSchema, bodyResult.data);
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Create', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as CreateAnswerlatticeStaffInput;
    if (input.email && isInternalAuthEmail(input.email)) {
        return jsonError('Use a business email address or leave email blank for a staff ID.', 400, 'RESERVED_EMAIL');
    }
    const requestedRoleId = input.roleId || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    if (
        requestedRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        && !canManageAnswerlatticeOwner(access)
    ) {
        return jsonError('Only an Owner can grant Owner access.', 403, 'OWNER_ACCESS_FORBIDDEN');
    }
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
    const staffLoginUsername = hasEmail
        ? ''
        : buildDeterministicAnswerlatticeStaffLoginId(
            access.scope.tenantId,
            access.scope.storeId,
            input.requestId,
        );
    const staffLoginId = resolveStaffLoginDisplayId(staffLoginUsername);
    const loginEmail = hasEmail ? String(input.email) : buildManagedStaffEmail(access.scope.tenantId, staffLoginUsername);
    let existingAnswerlatticeUser;
    try {
        existingAnswerlatticeUser = await getAnswerlatticeUserByEmail(loginEmail);
    } catch (error: unknown) {
        if (error instanceof AnswerlatticeStaffTransactionError) {
            logSecurity('Authorization Failed - Answerlattice Staff Identity Conflict', session, request, {
                email: loginEmail,
            }, 'critical');
            return jsonError('This login identity cannot be assigned.', 409, 'IDENTITY_CONFLICT');
        }
        throw error;
    }
    const existingAccessState = existingAnswerlatticeUser
        ? readAnswerlatticeStaffAccessState(existingAnswerlatticeUser.data)
        : null;
    if (existingAnswerlatticeUser && existingAccessState?.tenantId !== access.scope.tenantId) {
        return jsonError('This email is registered with another Answerlattice workspace.', 409, 'EMAIL_OTHER_TENANT');
    }
    const creationFingerprint = buildAnswerlatticeStaffCreationFingerprint(
        input,
        access.scope.tenantId,
        access.scope.storeId,
    );
    if (isAnswerlatticeManagedStaffIdentityCollision({
        existingRequestId: existingAnswerlatticeUser?.data?.creationRequestId,
        existingUser: Boolean(existingAnswerlatticeUser),
        hasEmail,
        requestId: input.requestId,
    })) {
        logSecurity('Authorization Failed - Answerlattice Managed Staff Identity Collision', session, request, {
            userId: existingAnswerlatticeUser.id,
        }, 'critical');
        return jsonError('This login identity cannot be assigned.', 409, 'IDENTITY_CONFLICT');
    }
    if (
        !hasEmail
        && existingAnswerlatticeUser?.data?.creationRequestId === input.requestId
        && existingAnswerlatticeUser.data.creationRequestFingerprint
        && existingAnswerlatticeUser.data.creationRequestFingerprint !== creationFingerprint
    ) {
        return jsonError('This team member request has already been used.', 409, 'IDEMPOTENCY_CONFLICT');
    }

    const normalizedPhone = normalizePhoneNumberForStorage({
        countryCode: input.countryCode,
        dialCode: input.dialCode,
        phoneNumber: input.phoneNumber,
    });
    const displayName = input.name || normalizedPhone.phoneNumber || (hasEmail ? String(input.email).split('@')[0] : `Support ${staffLoginId.slice(-4)}`);
    const tempPasscode = hasEmail ? '' : generateStaffPasscode();
    const tempPassword = tempPasscode || randomBytes(24).toString('base64url');
    let existingDefaultUser;
    try {
        existingDefaultUser = await getDefaultAuthUserByEmail(loginEmail);
    } catch (error: unknown) {
        if (error instanceof AuthUserIdentityConflictError) {
            logSecurity('Authorization Failed - Default Auth Staff Identity Conflict', session, request, {
                email: loginEmail,
            }, 'critical');
            return jsonError('This login identity cannot be assigned.', 409, 'IDENTITY_CONFLICT');
        }
        throw error;
    }
    const defaultFirebaseResult = await createOrGetDefaultFirebaseUser({
        displayName,
        email: loginEmail,
        password: tempPassword,
    });
    const defaultFirebaseUser = defaultFirebaseResult.user;
    const userId = requireAnswerlatticeStaffUserId(existingAnswerlatticeUser?.id || existingDefaultUser?.id || defaultFirebaseUser.uid);
    const now = admin.firestore.Timestamp.now();
    const phoneUsername = normalizedPhone.phoneUsername;
    const membership: AnswerlatticeStaffStoreMembership = {
        storeId: access.scope.storeId,
        name: access.storeName,
        role: requestedRoleId,
    };
    const staffAuthMode = hasEmail ? STAFF_AUTH_MODE_EMAIL : STAFF_AUTH_MODE_OWNER_PASSCODE;

    const baseUserData = sanitizeFirestoreValue({
        active: true,
        authDisabled: false,
        countryCode: input.phoneNumber ? normalizedPhone.countryCode : input.countryCode,
        creationRequestFingerprint: existingAnswerlatticeUser?.data?.creationRequestFingerprint || creationFingerprint,
        creationRequestId: existingAnswerlatticeUser?.data?.creationRequestId || input.requestId,
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
        staffAuthMode,
        staffLoginId: resolveStaffLoginDisplayId(existingAnswerlatticeUser?.data?.staffLoginId || existingAnswerlatticeUser?.data?.loginUsername || staffLoginUsername),
        uId: userId,
    });

    let creationResult;
    try {
        creationResult = await createAnswerlatticeStaffMembershipTransaction({
            baseData: baseUserData,
            db,
            fingerprint: creationFingerprint,
            membership,
            requestId: input.requestId,
            tenantId: access.scope.tenantId,
            userId,
        });
    } catch (error: unknown) {
        if (defaultFirebaseResult.created) {
            await cleanupUnadoptedDefaultFirebaseUser({
                db,
                firebaseUid: defaultFirebaseUser.uid,
                tenantId: access.scope.tenantId,
                userId,
            });
        }
        if (error instanceof AnswerlatticeStaffTransactionError) {
            if (error.code === 'IDEMPOTENCY_CONFLICT') {
                return jsonError('This team member request has already been used.', 409, error.code);
            }
            if (error.code === 'ALREADY_ASSIGNED') {
                return jsonError('This team member already has access to this workspace.', 409, error.code);
            }
            if (error.code === 'INACTIVE_ACCOUNT_WITH_MEMBERSHIPS') {
                return jsonError(
                    'This account is inactive in another workspace. Reactivate it there before adding another workspace.',
                    409,
                    error.code,
                );
            }
            if (error.code === 'ROLE_NOT_FOUND') return jsonError('Invalid role', 400, error.code);
            if (error.code === 'STORE_NOT_FOUND') return jsonError('Workspace not found', 404, error.code);
            if (error.code === 'FORBIDDEN') return jsonError('Forbidden', 403, error.code);
        }
        throw error;
    }
    const userDoc = creationResult.nextData;
    const isCompletedReplay = creationResult.replay;
    if (!hasEmail && !isCompletedReplay) {
        await authAdmin.updateUser(defaultFirebaseUser.uid, {
            disabled: false,
            password: tempPasscode,
        });
    }
    const projectionsComplete = await repairAnswerlatticeStaffAccessProjections({
        data: getRecord(userDoc),
        fallbackStoreId: access.scope.storeId,
        operation: 'answerlattice-staff-create',
        syncBridge: true,
        syncClaims: true,
        userId,
    });
    if (!projectionsComplete) {
        return jsonError(
            'Team member was added, but access refresh did not finish. Try the same add-member action again.',
            503,
            'STAFF_ACCESS_SYNC_FAILED',
        );
    }

    let passwordResetEmail: { ok: boolean; error?: string } = { ok: false };
    if (shouldSendAnswerlatticeStaffSetupEmail({ hasEmail, replay: isCompletedReplay })) {
        passwordResetEmail = await sendFirebasePasswordResetEmail(loginEmail);
        if (passwordResetEmail.ok) {
            await db.collection(DB_COLLECTIONS.USERS).doc(userId).set({
                passwordResetEmailSentAt: now,
                passwordResetRequestedAt: now,
                passwordResetRequestedBy: session?.uId || session?.user?.id,
            }, { merge: true });
        }
    }

    logAnswerlatticeDiagnostic('answerlattice_staff_user_created', {
        ...getBoundedAnswerlatticeStringContext('authMode', staffAuthMode),
        ...getBoundedAnswerlatticeStringContext('tenantId', access.scope.tenantId),
        ...getBoundedAnswerlatticeStringContext('storeId', access.scope.storeId),
        ...getBoundedAnswerlatticeStringContext('userId', userId),
    });

    return privateJson({
        success: true,
        message: isCompletedReplay
            ? 'Team member was already added. Reset their login details if the original passcode was not received.'
            : hasEmail
            ? 'Team member added. They can set their password from the email.'
            : 'Team member added. Share the staff ID and temporary passcode.',
        passwordResetEmailError: hasEmail && !isCompletedReplay && !passwordResetEmail.ok
            ? 'password_reset_email_failed'
            : undefined,
        passwordResetEmailSent: hasEmail && !isCompletedReplay ? passwordResetEmail.ok : false,
        staffAuthMode,
        staffLoginId: userDoc.staffLoginId,
        temporaryPasscode: !isCompletedReplay && tempPasscode ? tempPasscode : undefined,
        user: sanitizeAnswerlatticeStaffUser(userId, userDoc, access.roles, access.scope.storeId),
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

    const bodyResult = await readAnswerlatticeStaffMutationBody(request);
    if (!bodyResult.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Update', session, request, { error: bodyResult.error }, 'medium');
        return bodyResult.response;
    }

    const validation = validateAPIInput(UpdateAnswerlatticeStaffSchema, bodyResult.data);
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Update', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as UpdateAnswerlatticeStaffInput;
    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = getRecord(target.data);
    const existingAccessState = readAnswerlatticeStaffAccessState(existingData);
    if (!existingAccessState || existingAccessState.tenantId !== access.scope.tenantId) {
        logSecurity('Authorization Failed - Answerlattice Staff Tenant Mismatch', session, request, {
            requestedTenantId: access.scope.tenantId,
            targetTenantId: existingData.tenantId || existingData.tId,
            userId: input.userId,
        }, 'critical');
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }

    const currentStore = getAnswerlatticeStaffMembership(existingAccessState, access.scope.storeId);
    if (!currentStore || existingData.deleted === true) {
        return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
    }

    const nextRoleId = input.roleId || currentStore.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF;
    if (
        (currentStore.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
            || nextRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER)
        && !canManageAnswerlatticeOwner(access)
    ) {
        return jsonError('Only an Owner can change Owner access.', 403, 'OWNER_ACCESS_FORBIDDEN');
    }
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
            ensureNotSelfDestructive(session, input.userId, existingData.email);
        }
    } catch (error: unknown) {
        const policyErrorCode = getAnswerlatticeStaffPolicyErrorCode(error);
        if (policyErrorCode === ANSWERLATTICE_STAFF_POLICY_ERROR_CODES.SELF_UPDATE_BLOCKED) return jsonError('You cannot remove or deactivate your own access.', 409, 'SELF_UPDATE_BLOCKED');
        throw error;
    }

    const now = admin.firestore.Timestamp.now();
    const shouldNormalizePhone = input.phoneNumber !== undefined || input.dialCode !== undefined || input.countryCode !== undefined;
    const normalizedPhone = shouldNormalizePhone
        ? normalizePhoneNumberForStorage({
            countryCode: input.countryCode ?? (typeof existingData.countryCode === 'string' ? existingData.countryCode : undefined),
            dialCode: input.dialCode ?? (typeof existingData.dialCode === 'string' ? existingData.dialCode : undefined),
            phoneNumber: input.phoneNumber ?? (typeof existingData.phoneNumber === 'string' ? existingData.phoneNumber : undefined),
        })
        : null;
    const profileUpdate = sanitizeFirestoreValue({
        countryCode: normalizedPhone ? normalizedPhone.countryCode : input.countryCode,
        dialCode: normalizedPhone ? normalizedPhone.dialCode : input.dialCode,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        name: input.name,
        phone: normalizedPhone ? normalizedPhone.phone : undefined,
        phoneNumber: normalizedPhone ? normalizedPhone.phoneNumber : input.phoneNumber,
        phoneUsername: normalizedPhone ? normalizedPhone.phoneUsername : undefined,
        sessionRevokedAt: input.active === false ? now : undefined,
        sessionRevokedBy: input.active === false ? session?.uId || session?.user?.id : undefined,
        sessionRevokedByEmail: input.active === false ? session?.user?.email : undefined,
        sessionRevokedReason: input.active === false ? 'answerlattice_staff_deactivated' : undefined,
    });

    let mutationResult;
    try {
        mutationResult = await updateAnswerlatticeStaffMembershipTransaction({
            active: input.active,
            allowMultiWorkspaceActiveChange: access.isPlatformAdmin,
            db: getAnswerlatticeDb()!,
            profileUpdate,
            roleId: nextRoleId,
            storeId: access.scope.storeId,
            storeName: access.storeName,
            tenantId: access.scope.tenantId,
            userId: input.userId,
        });
    } catch (error: unknown) {
        if (error instanceof AnswerlatticeStaffTransactionError) {
            if (error.code === 'LAST_OWNER') return jsonError('Add another Owner before removing this access.', 409, error.code);
            if (error.code === 'MULTI_WORKSPACE_ACTIVE_CHANGE') {
                return jsonError('Remove this member from the current workspace instead of changing their account status.', 409, error.code);
            }
            if (error.code === 'ROLE_NOT_FOUND') return jsonError('Invalid role', 400, error.code);
            if (error.code === 'STORE_MAPPING_NOT_FOUND' || error.code === 'USER_NOT_FOUND') {
                return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
            }
            if (error.code === 'FORBIDDEN') return jsonError('Forbidden', 403, error.code);
        }
        throw error;
    }
    const nextData = getRecord(mutationResult.nextData);
    const active = isAnswerlatticeStaffAccountActive(nextData);
    const shouldSyncAccess = mutationResult.accessChanged
        || input.active !== undefined
        || input.roleId !== undefined;
    const shouldSyncBridge = shouldSyncAccess || input.name !== undefined;
    const projectionsComplete = await repairAnswerlatticeStaffAccessProjections({
        data: nextData,
        fallbackStoreId: access.scope.storeId,
        operation: 'answerlattice-staff-update',
        revokeDefault: shouldSyncAccess && !active,
        syncBridge: shouldSyncBridge,
        syncClaims: shouldSyncAccess,
        userId: input.userId,
    });
    if (!projectionsComplete) {
        return jsonError(
            'Team member changes were saved, but access refresh did not finish. Try the same change again.',
            503,
            'STAFF_ACCESS_SYNC_FAILED',
        );
    }

    return privateJson({
        success: true,
        user: sanitizeAnswerlatticeStaffUser(input.userId, nextData, access.roles, access.scope.storeId),
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
    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = getRecord(target.data);
    const existingAccessState = readAnswerlatticeStaffAccessState(existingData);
    if (!existingAccessState || existingAccessState.tenantId !== access.scope.tenantId) {
        logSecurity('Authorization Failed - Answerlattice Staff Remove Tenant Mismatch', session, request, {
            requestedTenantId: access.scope.tenantId,
            targetTenantId: existingData.tenantId || existingData.tId,
            userId: input.userId,
        }, 'critical');
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }
    const currentStore = getAnswerlatticeStaffMembership(existingAccessState, access.scope.storeId);
    if (!currentStore || existingData.deleted === true) {
        if (isAnswerlatticeStaffRemovalReplay({
            state: existingAccessState,
            storeId: access.scope.storeId,
            value: existingData,
        })) {
            const replayRepairComplete = await repairAnswerlatticeStaffAccessProjections({
                data: existingData,
                fallbackStoreId: access.scope.storeId,
                forceClaimsRevoke: true,
                operation: 'answerlattice-staff-remove-replay',
                revokeDefault: existingAccessState.memberships.length === 0,
                syncBridge: true,
                syncClaims: true,
                userId: input.userId,
            });
            if (!replayRepairComplete) {
                return jsonError(
                    'Workspace access was removed, but access refresh did not finish. Try removing this member again.',
                    503,
                    'STAFF_ACCESS_SYNC_FAILED',
                );
            }
            return privateJson({ removed: true, replay: true, success: true, userId: input.userId });
        }
        return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
    }
    try {
        ensureNotSelfDestructive(session, input.userId, existingData.email);
    } catch {
        return jsonError('You cannot remove your own access.', 409, 'SELF_UPDATE_BLOCKED');
    }
    if (
        currentStore.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        && !canManageAnswerlatticeOwner(access)
    ) {
        return jsonError('Only an Owner can remove Owner access.', 403, 'OWNER_ACCESS_FORBIDDEN');
    }

    const now = admin.firestore.Timestamp.now();
    let mutationResult;
    try {
        mutationResult = await removeAnswerlatticeStaffMembershipTransaction({
            deactivationUpdate: sanitizeFirestoreValue({
                deletedAt: now,
                sessionRevokedAt: now,
                sessionRevokedBy: session?.uId || session?.user?.id,
                sessionRevokedByEmail: session?.user?.email,
                sessionRevokedReason: 'answerlattice_staff_removed',
            }),
            db: getAnswerlatticeDb()!,
            lifecycleUpdate: sanitizeFirestoreValue({
                modifiedBy: session?.user?.email,
                modifiedOn: now,
                workspaceAccessRemovedAt: now,
                workspaceAccessRemovedBy: session?.uId || session?.user?.id,
                workspaceAccessRemovedStoreId: access.scope.storeId,
            }),
            storeId: access.scope.storeId,
            tenantId: access.scope.tenantId,
            userId: input.userId,
        });
    } catch (error: unknown) {
        if (error instanceof AnswerlatticeStaffTransactionError) {
            if (error.code === 'LAST_OWNER') return jsonError('Add another Owner before removing this access.', 409, error.code);
            if (error.code === 'STORE_MAPPING_NOT_FOUND' || error.code === 'USER_NOT_FOUND') {
                return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
            }
            if (error.code === 'FORBIDDEN') return jsonError('Forbidden', 403, error.code);
        }
        throw error;
    }
    const nextData = getRecord(mutationResult.nextData);
    const shouldDeactivate = mutationResult.memberships.length === 0;
    const projectionsComplete = await repairAnswerlatticeStaffAccessProjections({
        data: nextData,
        fallbackStoreId: access.scope.storeId,
        forceClaimsRevoke: true,
        operation: 'answerlattice-staff-remove',
        revokeDefault: shouldDeactivate,
        syncBridge: true,
        syncClaims: true,
        userId: input.userId,
    });
    if (!projectionsComplete) {
        return jsonError(
            'Workspace access was removed, but access refresh did not finish. Try removing this member again.',
            503,
            'STAFF_ACCESS_SYNC_FAILED',
        );
    }

    return privateJson({
        removed: true,
        success: true,
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

    const bodyResult = await readAnswerlatticeStaffMutationBody(request);
    if (!bodyResult.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Password Reset', session, request, { error: bodyResult.error }, 'medium');
        return bodyResult.response;
    }

    const validation = validateAPIInput(UserIdSchema, bodyResult.data);
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Password Reset', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as UserIdInput;
    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = getRecord(target.data);
    const existingAccessState = readAnswerlatticeStaffAccessState(existingData);
    if (!existingAccessState || existingAccessState.tenantId !== access.scope.tenantId) {
        logSecurity('Authorization Failed - Answerlattice Staff Password Reset Tenant Mismatch', session, request, {
            requestedTenantId: access.scope.tenantId,
            targetTenantId: existingData.tenantId || existingData.tId,
            userId: input.userId,
        }, 'critical');
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }
    const currentStore = getAnswerlatticeStaffMembership(existingAccessState, access.scope.storeId);
    if (!currentStore || existingData.deleted === true) {
        return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
    }
    if (
        currentStore.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        && !canManageAnswerlatticeOwner(access)
    ) {
        return jsonError('Only an Owner can reset another Owner login.', 403, 'OWNER_ACCESS_FORBIDDEN');
    }
    if (!isAnswerlatticeStaffAccountActive(existingData, existingAccessState)) {
        return jsonError('Activate this team member before creating new login details.', 409, 'STAFF_INACTIVE');
    }
    try {
        ensureWorkspaceLocalAuthMutation(existingAccessState, access.isPlatformAdmin);
    } catch (error: unknown) {
        if (getAnswerlatticeStaffPolicyErrorCode(error) === ANSWERLATTICE_STAFF_POLICY_ERROR_CODES.MULTI_WORKSPACE_AUTH_CHANGE) {
            return jsonError(
                'Login details are shared across workspaces. Ask a platform administrator to reset this account.',
                409,
                'MULTI_WORKSPACE_AUTH_CHANGE',
            );
        }
        throw error;
    }

    const email = String(existingData.email || '').toLowerCase().trim();
    if (!email) return jsonError('Team member does not have a login account.', 400, 'LOGIN_MISSING');
    const now = admin.firestore.Timestamp.now();
    const existingLoginUsername = resolveStaffLoginUsername(
        typeof existingData.loginUsername === 'string'
            ? existingData.loginUsername
            : typeof existingData.staffLoginId === 'string' ? existingData.staffLoginId : '',
    );
    const loginUsername = existingLoginUsername || await generateUniqueAnswerlatticeStaffLoginId();
    const loginId = resolveStaffLoginDisplayId(loginUsername);
    const temporaryPasscode = generateStaffPasscode();
    const firebaseUser = await authAdmin.getUserByEmail(email);
    await authAdmin.updateUser(firebaseUser.uid, {
        disabled: false,
        password: temporaryPasscode,
    });
    await authAdmin.revokeRefreshTokens(firebaseUser.uid);
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
    const updatedData = getRecord(updated.data());
    const updatedAccessState = readAnswerlatticeStaffAccessState(updatedData);
    if (!updatedAccessState) return jsonError('Team member access data is invalid.', 409, 'STAFF_ACCESS_INVALID');
    const projectionsComplete = await repairAnswerlatticeStaffAccessProjections({
        data: updatedData,
        fallbackStoreId: access.scope.storeId,
        forceClaimsRevoke: true,
        operation: 'answerlattice-staff-password-reset',
        syncBridge: true,
        syncClaims: true,
        userId: input.userId,
    });
    if (!projectionsComplete) {
        return jsonError(
            'Login details were changed, but access refresh did not finish. Run Login reset again.',
            503,
            'STAFF_ACCESS_SYNC_FAILED',
        );
    }

    return privateJson({
        success: true,
        message: 'Temporary team passcode created.',
        staffAuthMode: getStaffAuthMode(existingData),
        staffLoginId: loginId,
        temporaryPasscode,
        user: sanitizeAnswerlatticeStaffUser(input.userId, updatedData, access.roles, access.scope.storeId),
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

    const bodyResult = await readAnswerlatticeStaffMutationBody(request);
    if (!bodyResult.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Force Signout', session, request, { error: bodyResult.error }, 'medium');
        return bodyResult.response;
    }

    const validation = validateAPIInput(UserIdSchema, bodyResult.data);
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Staff Force Signout', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as UserIdInput;
    const target = await getAnswerlatticeUserById(input.userId);
    if (!target) return jsonError('Team member not found', 404, 'USER_NOT_FOUND');
    const existingData = getRecord(target.data);
    const existingAccessState = readAnswerlatticeStaffAccessState(existingData);
    if (!existingAccessState || existingAccessState.tenantId !== access.scope.tenantId) {
        logSecurity('Authorization Failed - Answerlattice Staff Force Signout Tenant Mismatch', session, request, {
            requestedTenantId: access.scope.tenantId,
            targetTenantId: existingData.tenantId || existingData.tId,
            userId: input.userId,
        }, 'critical');
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }

    const currentStore = getAnswerlatticeStaffMembership(existingAccessState, access.scope.storeId);
    if (!currentStore || existingData.deleted === true) {
        return jsonError('Team member is not assigned to this workspace', 404, 'STORE_MAPPING_NOT_FOUND');
    }
    try {
        ensureNotSelfDestructive(session, input.userId, existingData.email);
    } catch {
        return jsonError('You cannot sign yourself out from here.', 409, 'SELF_UPDATE_BLOCKED');
    }
    if (
        currentStore.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        && !canManageAnswerlatticeOwner(access)
    ) {
        return jsonError('Only an Owner can sign out another Owner.', 403, 'OWNER_ACCESS_FORBIDDEN');
    }
    if (!isAnswerlatticeStaffAccountActive(existingData, existingAccessState)) {
        return jsonError('This team member is already deactivated.', 409, 'STAFF_INACTIVE');
    }
    try {
        ensureWorkspaceLocalAuthMutation(existingAccessState, access.isPlatformAdmin);
    } catch (error: unknown) {
        if (getAnswerlatticeStaffPolicyErrorCode(error) === ANSWERLATTICE_STAFF_POLICY_ERROR_CODES.MULTI_WORKSPACE_AUTH_CHANGE) {
            return jsonError(
                'Sign-out affects every workspace for this account. Ask a platform administrator to continue.',
                409,
                'MULTI_WORKSPACE_AUTH_CHANGE',
            );
        }
        throw error;
    }

    const now = admin.firestore.Timestamp.now();

    const projectionsComplete = await repairAnswerlatticeStaffAccessProjections({
        data: existingData,
        fallbackStoreId: access.scope.storeId,
        forceClaimsRevoke: true,
        operation: 'answerlattice-staff-force-signout',
        revokeDefault: true,
        syncClaims: true,
        userId: input.userId,
    });
    if (!projectionsComplete) {
        return jsonError(
            'Sign-out did not finish for every login session. Try again.',
            503,
            'STAFF_ACCESS_SYNC_FAILED',
        );
    }
    await target.ref.update(sanitizeFirestoreValue({
        authTokensRevokedAt: now,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        sessionRevokedAt: now,
        sessionRevokedBy: session?.uId || session?.user?.id,
        sessionRevokedByEmail: session?.user?.email,
        sessionRevokedReason: 'owner_force_signout',
    }));

    logAnswerlatticeDiagnostic('answerlattice_staff_owner_forced_signout', {
        ...getBoundedAnswerlatticeStringContext('tenantId', access.scope.tenantId),
        ...getBoundedAnswerlatticeStringContext('storeId', access.scope.storeId),
        ...getBoundedAnswerlatticeStringContext('userId', input.userId),
    });

    const updated = await target.ref.get();
    return privateJson({
        success: true,
        message: 'Team member signed out.',
        user: sanitizeAnswerlatticeStaffUser(input.userId, updated.data(), access.roles, access.scope.storeId),
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

    const bodyResult = await readAnswerlatticeStaffMutationBody(request);
    if (!bodyResult.success) {
        logSecurity('Input Validation Failed - Answerlattice Role Save', session, request, { error: bodyResult.error }, 'medium');
        return bodyResult.response;
    }

    const validation = validateAPIInput(SaveAnswerlatticeRoleSchema, bodyResult.data);
    if (!validation.success) {
        logSecurity('Input Validation Failed - Answerlattice Role Save', session, request, { error: getValidationLogError(validation) }, 'medium');
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }

    const input = validation.data as SaveAnswerlatticeRoleInput;
    const db = getAnswerlatticeDb();
    if (!db) return jsonError('Answerlattice Firebase is not configured', 503, 'ANSWERLATTICE_FIREBASE_NOT_CONFIGURED');
    if (!input.role.id && !input.requestId) {
        return jsonError('Invalid input', 400, 'INVALID_INPUT');
    }
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(access.scope.storeId));
    const roleId = input.role.id || buildDeterministicAnswerlatticeRoleId(
        access.scope.tenantId,
        access.scope.storeId,
        input.requestId!,
    );
    const creationFingerprint = input.role.id
        ? undefined
        : buildAnswerlatticeRoleCreationFingerprint({
            ...input.role,
            requestId: input.requestId!,
        }, access.scope.tenantId, access.scope.storeId);
    if (input.role.id && isDefaultAnswerlatticeRoleId(roleId)) {
        return jsonError('Default roles are locked', 409, 'DEFAULT_ROLE_LOCKED');
    }
    const result = await db.runTransaction(async (transaction) => {
        const storeSnap = await transaction.get(storeRef);
        if (!storeSnap.exists) return { error: 'STORE_NOT_FOUND' as const };
        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeActiveStoreInScope(storeData, access.scope, storeSnap.id)) {
            return { error: 'STORE_SCOPE_MISMATCH' as const };
        }

        const existingRoles = normalizeAnswerlatticeRolesForStore(
            storeData.answerlatticeRoles,
            access.scope.tenantId,
            access.scope.storeId,
            session?.user?.email,
        ).roles;
        const existingIndex = existingRoles.findIndex((role) => role.id === roleId);
        const existingRole = existingIndex >= 0 ? existingRoles[existingIndex] : null;
        if (input.role.id && !existingRole) return { error: 'ROLE_NOT_FOUND' as const };
        if (!input.role.id) {
            const replayState = classifyAnswerlatticeRoleCreationReplay(
                existingRole,
                input.requestId!,
                creationFingerprint!,
            );
            if (replayState === 'conflict') {
                return { error: 'IDEMPOTENCY_CONFLICT' as const };
            }
            if (replayState === 'replay') return {
                assignedUserIds: [] as string[],
                nextRole: existingRole!,
                replay: true,
                roles: existingRoles,
            };
        }
        const roleAssignment = existingRole
            ? await getAnswerlatticeRoleAssignedUserIdsInTransaction({
                db,
                roleId,
                storeId: access.scope.storeId,
                tenantId: access.scope.tenantId,
                transaction,
            })
            : { complete: true, userIds: [] };
        if (!roleAssignment.complete) {
            return { error: 'ROLE_MEMBER_SCAN_LIMIT' as const };
        }
        if (input.role.active === false && roleAssignment.userIds.length > 0) {
            return { error: 'ROLE_IN_USE' as const };
        }
        const defaultRoleIds = new Set<string>(Object.values(DEFAULT_ANSWERLATTICE_ROLE_IDS));
        const customRoleCount = existingRoles.filter((role) => !defaultRoleIds.has(role.id)).length;
        if (!existingRole && customRoleCount >= ANSWERLATTICE_CUSTOM_ROLE_LIMIT) {
            return { error: 'ROLE_LIMIT_REACHED' as const };
        }
        const normalizedName = input.role.name.toLowerCase();
        if (existingRoles.some((role) => role.id !== roleId && role.name.trim().toLowerCase() === normalizedName)) {
            return { error: 'ROLE_NAME_EXISTS' as const };
        }

        const now = new Date().toISOString();
        const nextRole: AnswerlatticeRoleDefinition = {
            active: input.role.active ?? existingRole?.active ?? true,
            createdBy: existingRole?.createdBy || session?.user?.email || 'system',
            createdOn: existingRole?.createdOn || now,
            creationRequestFingerprint: existingRole?.creationRequestFingerprint || creationFingerprint,
            creationRequestId: existingRole?.creationRequestId || input.requestId,
            description: input.role.description ?? existingRole?.description ?? '',
            id: roleId,
            modifiedBy: session?.user?.email || 'system',
            modifiedOn: now,
            name: input.role.name,
            permissions: normalizeAnswerlatticeRoleInputPermissions(input.role.permissions),
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
        };
        const roles = [...existingRoles];
        if (existingIndex >= 0) roles[existingIndex] = nextRole;
        else roles.push(nextRole);
        const persistedRoles = roles.filter((role) => !isDefaultAnswerlatticeRoleId(role.id));
        transaction.set(storeRef, sanitizeFirestoreValue({
            answerlatticeRoles: persistedRoles,
            modifiedBy: session?.user?.email,
            modifiedOn: admin.firestore.Timestamp.now(),
        }), { merge: true });
        return { assignedUserIds: roleAssignment.userIds, nextRole, replay: false, roles };
    });
    if ('error' in result) {
        if (result.error === 'STORE_NOT_FOUND') return jsonError('Workspace not found', 404, result.error);
        if (result.error === 'ROLE_NOT_FOUND') return jsonError('Role not found', 404, result.error);
        if (result.error === 'IDEMPOTENCY_CONFLICT') return jsonError('This role request has already been used.', 409, result.error);
        if (result.error === 'ROLE_IN_USE') return jsonError('This role is assigned to team members. Reassign them before turning it off.', 409, result.error);
        if (result.error === 'ROLE_MEMBER_SCAN_LIMIT') return jsonError('This workspace has too many team members for a safe role change.', 409, result.error);
        if (result.error === 'ROLE_LIMIT_REACHED') return jsonError('Role limit reached', 409, result.error);
        if (result.error === 'ROLE_NAME_EXISTS') return jsonError('A role with this name already exists', 409, result.error);
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }

    try {
        await syncAnswerlatticeAuthClaimsForRoleMembers({
            fallbackStoreId: access.scope.storeId,
            userIds: result.assignedUserIds,
        });
    } catch (error) {
        logAnswerlatticeFailure('answerlattice_role_member_claim_sync_failed', error, {
            assignedUserCount: result.assignedUserIds.length,
            ...getBoundedAnswerlatticeStringContext('roleId', roleId),
            ...getBoundedAnswerlatticeStringContext('storeId', access.scope.storeId),
            ...getBoundedAnswerlatticeStringContext('tenantId', access.scope.tenantId),
        });
        return jsonError('Role was saved, but team access refresh did not finish. Save the role again.', 503, 'ROLE_CLAIM_SYNC_FAILED');
    }

    return privateJson({
        role: result.nextRole,
        roles: result.roles,
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
    if (isDefaultAnswerlatticeRoleId(roleId)) {
        return jsonError('Default roles are locked', 409, 'DEFAULT_ROLE_LOCKED');
    }
    const db = getAnswerlatticeDb();
    if (!db) return jsonError('Answerlattice Firebase is not configured', 503, 'ANSWERLATTICE_FIREBASE_NOT_CONFIGURED');
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(access.scope.storeId));
    const result = await db.runTransaction(async (transaction) => {
        const storeSnap = await transaction.get(storeRef);
        if (!storeSnap.exists) return { error: 'STORE_NOT_FOUND' as const };
        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeActiveStoreInScope(storeData, access.scope, storeSnap.id)) {
            return { error: 'STORE_SCOPE_MISMATCH' as const };
        }
        const current = normalizeAnswerlatticeRolesForStore(
            storeData.answerlatticeRoles,
            access.scope.tenantId,
            access.scope.storeId,
            session?.user?.email,
        );
        if (!current.roles.some((role) => role.id === roleId)) {
            return { error: 'ROLE_NOT_FOUND' as const };
        }
        if (await isAnswerlatticeRoleAssignedInTransaction({
            db,
            roleId,
            storeId: access.scope.storeId,
            tenantId: access.scope.tenantId,
            transaction,
        })) {
            return { error: 'ROLE_IN_USE' as const };
        }
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
        const persistedRoles = roles.filter((role) => !isDefaultAnswerlatticeRoleId(role.id));
        transaction.update(storeRef, sanitizeFirestoreValue({
            answerlatticeRoles: persistedRoles,
            modifiedBy: session?.user?.email,
            modifiedOn: admin.firestore.Timestamp.now(),
        }));
        return { roles };
    });
    if ('error' in result) {
        if (result.error === 'STORE_NOT_FOUND') return jsonError('Workspace not found', 404, result.error);
        if (result.error === 'ROLE_NOT_FOUND') return jsonError('Role not found', 404, result.error);
        if (result.error === 'ROLE_IN_USE') return jsonError('This role is assigned to team members. Reassign them before turning it off.', 409, result.error);
        return jsonError('Forbidden', 403, 'FORBIDDEN');
    }

    return privateJson({
        roles: result.roles,
        success: true,
    });
};
