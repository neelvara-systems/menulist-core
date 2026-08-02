import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { ALL_PERMISSIONS, PERMISSIONS, PermissionKey } from "@constant/permissions";
import { STAFF_EMAIL_DOMAIN } from "@constant/urls";
import { MENULIST_PLATFORM_USER_ROLE } from "@constant/user";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
import { createDefaultRoles, DEFAULT_ROLE_IDS, DEFAULT_ROLE_METADATA, generateCustomRoleId } from "@data/shared/defaultRoles";
import { formatStaffLoginId, getDisplayEmail, isInternalAuthEmail, normalizeStaffLoginUsername } from "@lib/auth/loginIdentifiers";
import { authAdmin, firestoreAdmin, admin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { hasPermission, normalizeRolePermissions } from "@lib/permissions/hasPermission";
import { resolveStorePermissionSessionScope } from "@lib/permissions/scopeDocumentId";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    getBoundedSecurityRouteContext,
    getBoundedSecurityStringContext,
} from "@lib/security/securityDiagnostics";
import { logger } from "@lib/monitoring/logger";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import type { StoreRoleDataType } from "@type/platform/roles";
import type { StoreDataType } from "@type/platform/store";
import type { UserStoreMappingType } from "@type/platform/user";
import { randomBytes, randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import type {
    CreateStaffInput,
    DeleteRoleInput,
    ForceSignOutStaffInput,
    RemoveStaffInput,
    ResetStaffPasswordInput,
    RoleMutationResponse,
    SaveRoleInput,
    StaffMutationResponse,
    StaffStoreOption,
    StaffStoreMappingInput,
    StaffUserSummary,
    UpdateStaffInput,
} from "./types";
import { getBoundedStaffStringContext, logStaffDiagnostic } from "./diagnostics";
import {
    createStaffUserDocumentTransaction,
    runStaffRoleMutationTransaction,
    runStaffUserMutationTransaction,
    StaffConcurrencyError,
} from "./concurrencyBoundary";
import {
    isStaffUnknownRecord,
    normalizePersistedStaffStoreMappings,
    normalizeStaffScopeNumericId,
    normalizeStaffStoreScopeDocumentId,
    staffTargetHasOwnerAccess,
} from "./scopeBoundary";

const USERS_COLLECTION = DB_COLLECTIONS.USERS;
const STORES_COLLECTION = DB_COLLECTIONS.STORES;
const STAFF_AUTH_MODE_EMAIL = "email";
const STAFF_AUTH_MODE_OWNER_PASSCODE = "owner_passcode";
const STAFF_LOGIN_ID_PREFIX = "88";
const STAFF_MUTATION_MAX_BODY_BYTES = 16 * 1024;
const STAFF_PASSCODE_RESET_LEASE_MS = 15 * 60 * 1000;
const STAFF_PASSWORD_RESET_PROVIDER_TIMEOUT_MS = 10_000;
const STAFF_EMAIL_QUERY_LIMIT = 2;
const FIREBASE_AUTH_SEND_OOB_CODE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode";
const MAX_STAFF_STORE_MAPPINGS = FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1;
const STAFF_TENANT_STORE_QUERY_LIMIT = MAX_STAFF_STORE_MAPPINGS + 1;

const optionalEmailSchema = z.string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .default("")
    .refine((value) => !value || z.string().email().safeParse(value).success, "Invalid email address");

const optionalTrimmedStringSchema = (max: number) => z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    return String(value);
}, z.string().trim().max(max).optional());

function normalizeStaffUserId(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const userId = value.trim();
    return userId === value && userId.length > 0 && userId.length <= 160 && isValidFirestoreDocumentId(userId)
        ? userId
        : null;
}

const StaffUserIdSchema = z.string()
    .min(1)
    .max(160)
    .refine((value) => normalizeStaffUserId(value) === value, "Invalid user ID");

const StaffScopeIdSchema = z.number().int().positive().safe();

const StoreMappingSchema = z.object({
    storeId: StaffScopeIdSchema,
    name: z.string().trim().max(160).optional(),
    role: z.string().trim().min(1).max(120).optional(),
});

export const CreateStaffSchema = z.object({
    email: optionalEmailSchema,
    name: optionalTrimmedStringSchema(160),
    tenantId: StaffScopeIdSchema,
    storeId: StaffScopeIdSchema,
    storeName: optionalTrimmedStringSchema(160),
    role: optionalTrimmedStringSchema(120),
    countryCode: optionalTrimmedStringSchema(8),
    dialCode: optionalTrimmedStringSchema(8),
    phoneNumber: optionalTrimmedStringSchema(32),
});

export const UpdateStaffSchema = z.object({
    userId: StaffUserIdSchema,
    tenantId: StaffScopeIdSchema,
    name: optionalTrimmedStringSchema(160),
    active: z.boolean().optional(),
    storeId: StaffScopeIdSchema.optional(),
    stores: z.array(StoreMappingSchema).min(1).max(MAX_STAFF_STORE_MAPPINGS).optional(),
    countryCode: optionalTrimmedStringSchema(8),
    dialCode: optionalTrimmedStringSchema(8),
    phoneNumber: optionalTrimmedStringSchema(32),
    alternatePhoneNumber: z.object({
        countryCode: optionalTrimmedStringSchema(8),
        dialCode: optionalTrimmedStringSchema(8),
        phoneNumber: optionalTrimmedStringSchema(32),
    }).optional(),
});

export const RemoveStaffSchema = z.object({
    userId: StaffUserIdSchema,
    tenantId: StaffScopeIdSchema,
    storeId: StaffScopeIdSchema,
});

export const ResetStaffPasswordSchema = z.object({
    userId: StaffUserIdSchema,
    tenantId: StaffScopeIdSchema,
    storeId: StaffScopeIdSchema,
});

export const ForceSignOutStaffSchema = ResetStaffPasswordSchema;

const RolePermissionsSchema = z.record(z.boolean()).transform((permissions) => {
    const normalized: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach((permission) => {
        normalized[permission] = permissions[permission] === true;
    });
    return normalized;
});

export const SaveRoleSchema = z.object({
    role: z.object({
        active: z.boolean().optional(),
        description: z.string().trim().max(300).optional(),
        id: z.string().trim().min(1).max(120).optional(),
        name: z.string().trim().min(1).max(80),
        permissions: RolePermissionsSchema,
    }),
    storeId: StaffScopeIdSchema,
    tenantId: StaffScopeIdSchema,
});

export const DeleteRoleSchema = z.object({
    roleId: z.string().trim().min(1).max(120),
    storeId: StaffScopeIdSchema,
    tenantId: StaffScopeIdSchema,
});

const isPlatformSession = (session: any) => (
    resolveExactSessionPlatformRole(session) === MENULIST_PLATFORM_USER_ROLE
);

const isPositiveId = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
);

const jsonError = (
    error: string,
    status: number,
    code?: string,
) => NextResponse.json({ error, code }, { status });

const staffConcurrencyErrorResponse = (error: unknown): NextResponse | null => {
    if (!(error instanceof StaffConcurrencyError)) return null;
    switch (error.code) {
        case "ALREADY_ASSIGNED":
            return jsonError("This user is already assigned to this store", 409, error.code);
        case "DUPLICATE_STORE_MAPPING":
        case "ROLE_NOT_FOUND":
            return jsonError("Invalid store or role", 400, error.code);
        case "FORBIDDEN":
            return jsonError("Forbidden", 403, error.code);
        case "LAST_OWNER":
            return jsonError("Add another Owner before removing this access.", 409, error.code);
        case "ROLE_IN_USE":
            return jsonError("This role is assigned to active staff. Reassign them before turning it off.", 409, error.code);
        case "STORE_MAPPING_NOT_FOUND":
            return jsonError("Staff member is not assigned to this store", 404, error.code);
        case "STORE_NOT_FOUND":
            return jsonError("Store not found", 404, error.code);
        case "USER_NOT_FOUND":
            return jsonError("Staff member not found", 404, error.code);
        case "USER_ALREADY_EXISTS":
            return jsonError("This staff account was already created. Refresh the staff list.", 409, "STAFF_ALREADY_CREATED");
        default:
            return null;
    }
};

const readStaffMutationBody = (request: NextRequest) => readBoundedJsonBody(
    request,
    STAFF_MUTATION_MAX_BODY_BYTES,
    {
        invalidJsonMessage: "Invalid input",
        tooLargeMessage: "Request body too large",
    },
);

const STAFF_STORE_MAPPING_ERROR_CODES = new Set([
    'DUPLICATE_STORE_MAPPING',
    'STORE_NOT_FOUND',
    'ROLE_NOT_FOUND',
] as const);

type StaffStoreMappingErrorCode = typeof STAFF_STORE_MAPPING_ERROR_CODES extends Set<infer Code> ? Code : never;

const createStaffStoreMappingError = (code: StaffStoreMappingErrorCode) => Object.assign(
    new Error('STAFF_STORE_MAPPING_VALIDATION_FAILED'),
    { staffMappingCode: code },
);

const sanitizeFirestoreValue = (value: any): any => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value && typeof value === "object" && typeof value.toDate === "function" && typeof value.toMillis === "function") {
        return value;
    }
    if (Array.isArray(value)) {
        return value
            .map((item) => sanitizeFirestoreValue(item))
            .filter((item) => item !== undefined);
    }
    if (value && typeof value === "object" && !(value instanceof Date)) {
        const result: Record<string, any> = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            const sanitized = sanitizeFirestoreValue(nestedValue);
            if (sanitized !== undefined) result[key] = sanitized;
        });
        return result;
    }
    return value;
};

const isManagedStaffEmail = (email?: string) => (
    String(email || "").toLowerCase().trim().endsWith(`@${STAFF_EMAIL_DOMAIN}`)
);

const getStaffAuthMode = (data: any) => (
    data?.staffAuthMode === STAFF_AUTH_MODE_OWNER_PASSCODE || isManagedStaffEmail(data?.email)
        ? STAFF_AUTH_MODE_OWNER_PASSCODE
        : STAFF_AUTH_MODE_EMAIL
);

const getStaffDisplayEmail = (data: any) => (
    getStaffAuthMode(data) === STAFF_AUTH_MODE_OWNER_PASSCODE || isInternalAuthEmail(data?.email)
        ? ""
        : getDisplayEmail(data?.email)
);

const serializeStaffTimestamp = (value: any) => {
    if (!value) return undefined;
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (typeof value.toMillis === "function") return value.toMillis();
    return undefined;
};

const getStaffAuthDiagnosticContext = ({
    context,
    data,
    disabled,
    email,
    firebaseUid,
}: {
    context?: Record<string, unknown>;
    data?: Record<string, any>;
    disabled?: boolean;
    email?: string;
    firebaseUid?: string;
}) => ({
    ...(typeof disabled === "boolean" ? { disabled } : {}),
    hasEmail: Boolean(email),
    hasFirebaseUid: Boolean(firebaseUid),
    ...getBoundedStaffStringContext("action", context?.action),
    ...getBoundedStaffStringContext("reason", context?.reason),
    ...getBoundedStaffStringContext("tenantId", context?.tenantId ?? data?.tenantId),
    ...getBoundedStaffStringContext("storeId", context?.storeId ?? data?.storeId),
    ...getBoundedStaffStringContext("userId", context?.userId ?? data?.id),
});

const syncStaffFirebaseAuthDisabledState = async (
    data: any,
    disabled: boolean,
    context: Record<string, unknown>,
) => {
    const email = String(data?.email || "").toLowerCase().trim();
    const firebaseUid = data?.firebaseUid ? String(data.firebaseUid) : "";
    if (!firebaseUid && !email) return false;

    try {
        const firebaseUser = firebaseUid
            ? await authAdmin.getUser(firebaseUid)
            : await authAdmin.getUserByEmail(email);

        if (firebaseUser.disabled !== disabled) {
            await authAdmin.updateUser(firebaseUser.uid, { disabled });
        }

        return true;
    } catch (error: any) {
        if (error?.code === "auth/user-not-found") {
            logStaffDiagnostic("staff_auth_user_missing_during_access_sync", getStaffAuthDiagnosticContext({
                context,
                data,
                disabled,
                email,
                firebaseUid,
            }));
            return false;
        }

        throw error;
    }
};

const revokeStaffFirebaseRefreshTokens = async (
    data: any,
    context: Record<string, unknown>,
) => {
    const email = String(data?.email || "").toLowerCase().trim();
    const firebaseUid = data?.firebaseUid ? String(data.firebaseUid) : "";
    if (!firebaseUid && !email) return false;

    try {
        const firebaseUser = firebaseUid
            ? await authAdmin.getUser(firebaseUid)
            : await authAdmin.getUserByEmail(email);

        await authAdmin.revokeRefreshTokens(firebaseUser.uid);
        return true;
    } catch (error: any) {
        if (error?.code === "auth/user-not-found") {
            logStaffDiagnostic("staff_auth_user_missing_during_token_revocation", getStaffAuthDiagnosticContext({
                context,
                data,
                email,
                firebaseUid,
            }));
            return false;
        }

        throw error;
    }
};

const revokeStaffFirebaseRefreshTokensAfterCommit = async (
    data: any,
    context: Record<string, unknown>,
) => {
    try {
        return await revokeStaffFirebaseRefreshTokens(data, context);
    } catch {
        logStaffDiagnostic("staff_auth_token_revocation_post_commit_failed", {
            ...getBoundedStaffStringContext("action", context.action),
            ...getBoundedStaffStringContext("reason", context.reason),
            ...getBoundedStaffStringContext("tenantId", context.tenantId),
            ...getBoundedStaffStringContext("storeId", context.storeId),
            ...getBoundedStaffStringContext("userId", context.userId),
        });
        return false;
    }
};

const buildSessionRevocationFields = (
    session: any,
    now: admin.firestore.Timestamp,
    reason: string,
) => {
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) throw new Error("INVALID_SESSION_ACTOR");
    return sanitizeFirestoreValue({
        authTokensRevokedAt: now,
        sessionRevokedAt: now,
        sessionRevokedBy: actorId,
        sessionRevokedByEmail: session?.user?.email,
        sessionRevokedReason: reason,
    });
};

const generateDigits = (length: number) => {
    let output = "";
    while (output.length < length) {
        output += String(randomBytes(length).readUIntBE(0, Math.min(6, length))).replace(/\D/g, "");
    }
    return output.slice(0, length);
};

const generateStaffPasscode = () => generateDigits(8);

const buildManagedStaffEmail = (tenantId: number, loginId: string) => (
    `staff-${tenantId}-${loginId}@${STAFF_EMAIL_DOMAIN}`.toLowerCase()
);

const generateUniqueStaffLoginId = async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const loginId = `${STAFF_LOGIN_ID_PREFIX}${generateDigits(8)}`;
        const existing = await firestoreAdmin
            .collection(USERS_COLLECTION)
            .where("loginUsername", "==", loginId)
            .limit(1)
            .get();
        if (existing.empty) return loginId;
    }

    throw new Error("STAFF_LOGIN_ID_GENERATION_FAILED");
};

const resolveStaffLoginDisplayId = (value?: string | null) => formatStaffLoginId(value);

const resolveStaffLoginUsername = (value?: string | null) => normalizeStaffLoginUsername(value);

const getStaffTimestampMillis = (value: unknown): number => {
    if (value instanceof Date) return value.getTime();
    if (isStaffUnknownRecord(value) && typeof value.toMillis === "function") {
        const millis = value.toMillis();
        return Number.isFinite(millis) ? millis : 0;
    }
    return 0;
};

class StaffPasscodeResetInProgressError extends Error {}
class StaffPasscodeResetScopeConflictError extends Error {}


type StaffUserSanitizeOptions = {
    visibleStoreIds?: number[];
};

const sanitizeStaffUser = (
    id: string,
    data: any,
    options: StaffUserSanitizeOptions = {},
): StaffUserSummary => {
    const visibleStoreIds = options.visibleStoreIds?.length
        ? new Set(options.visibleStoreIds.filter(isPositiveId))
        : null;
    const canShowStore = (storeId: unknown) => {
        const normalizedStoreId = normalizeStaffScopeNumericId(storeId);
        return normalizedStoreId !== null && (!visibleStoreIds || visibleStoreIds.has(normalizedStoreId));
    };
    const rawStores = normalizePersistedStaffStoreMappings(data?.stores);
    const stores = rawStores.filter((store) => canShowStore(store.storeId));
    const rawStoreIds = Array.isArray(data?.storeIds)
        ? data.storeIds
            .map(normalizeStaffScopeNumericId)
            .filter((storeId: number | null): storeId is number => storeId !== null)
        : rawStores.map((store) => store.storeId);
    const storeIds = rawStoreIds.filter(canShowStore);
    const normalizedDefaultStoreId = normalizeStaffScopeNumericId(data?.storeId);
    const defaultStoreId = normalizedDefaultStoreId !== null && canShowStore(normalizedDefaultStoreId)
        ? normalizedDefaultStoreId
        : stores[0]?.storeId || storeIds[0];

    return {
        id,
        active: data?.active !== false,
        authDisabled: data?.authDisabled === true,
        alternatePhoneNumber: data?.alternatePhoneNumber,
        countryCode: data?.countryCode,
        createdVia: data?.createdVia,
        deleted: data?.deleted === true,
        dialCode: data?.dialCode,
        displayEmail: getStaffDisplayEmail(data),
        email: data?.email || "",
        isVerified: data?.isVerified === true,
        loginUsername: data?.loginUsername || "",
        name: data?.name || "",
        ownerProtected: rawStores.some((store) => store.role === DEFAULT_ROLE_IDS.OWNER),
        phoneNumber: data?.phoneNumber || "",
        phoneUsername: data?.phoneUsername || "",
        platformRole: data?.platformRole || "USER",
        profileImage: data?.profileImage || data?.image || "",
        role: data?.role || "",
        sessionRevokedAt: serializeStaffTimestamp(data?.sessionRevokedAt),
        staffAuthMode: getStaffAuthMode(data),
        staffLoginId: resolveStaffLoginDisplayId(data?.staffLoginId || data?.loginUsername),
        storeId: defaultStoreId,
        storeIds,
        stores,
        tenantId: normalizeStaffScopeNumericId(data?.tenantId) || 0,
    };
};

const sanitizeStaffUserForAuthority = (id: string, data: any, authority: any): StaffUserSummary => (
    sanitizeStaffUser(id, data, {
        visibleStoreIds: authority?.isMaster ? undefined : [authority?.sessionStoreId].filter(isPositiveId),
    })
);

const sanitizeStoreOption = (store: StoreDataType): StaffStoreOption => ({
    active: store?.active !== false,
    isMaster: store?.isMaster === true,
    name: store?.name || `Store ${store?.storeId}`,
    roles: (store?.roles || []).map((role: StoreRoleDataType) => ({
        active: role.active !== false,
        description: role.description,
        id: role.id,
        name: role.name,
        permissions: normalizeRolePermissions(
            role.permissions,
            DEFAULT_ROLE_METADATA[role.id as keyof typeof DEFAULT_ROLE_METADATA]?.permissions,
        ),
    })),
    storeId: normalizeStaffScopeNumericId(store?.storeId) || 0,
    tenantId: normalizeStaffScopeNumericId(store?.tenantId) || 0,
});

const fetchStoreById = async (storeId: number): Promise<StoreDataType | null> => {
    const storeScope = normalizeStaffStoreScopeDocumentId(storeId);
    if (!storeScope) return null;

    const snapshot = await firestoreAdmin.collection(STORES_COLLECTION).doc(storeScope.documentId).get();
    return snapshot.exists ? snapshot.data() as StoreDataType : null;
};

const isEligibleStaffTargetStore = (
    store: StoreDataType | null | undefined,
    tenantId: number,
): store is StoreDataType => (
    Boolean(store)
    && normalizeStaffScopeNumericId(store?.tenantId) === tenantId
    && store?.active !== false
    && store?.deleted !== true
    && !isPlatformEntityBlocked(store)
);

const fetchStoresByIds = async (storeIds: number[]) => {
    const uniqueIds = Array.from(new Set(storeIds));
    const entries = await Promise.all(uniqueIds.map(async (storeId) => {
        const store = await fetchStoreById(storeId);
        return [storeId, store] as const;
    }));
    return new Map(entries);
};

const fetchStoresForTenant = async (tenantId: number): Promise<StoreDataType[]> => {
    const snapshot = await firestoreAdmin
        .collection(STORES_COLLECTION)
        .where("tenantId", "==", tenantId)
        .where("active", "==", true)
        .limit(STAFF_TENANT_STORE_QUERY_LIMIT)
        .get();

    if (snapshot.size > MAX_STAFF_STORE_MAPPINGS) {
        throw new Error("STAFF_TENANT_STORE_LIMIT_EXCEEDED");
    }

    return snapshot.docs.map((doc) => doc.data() as StoreDataType);
};

const DEFAULT_ROLE_ID_VALUES = Object.values(DEFAULT_ROLE_IDS);

const repairDefaultRoles = (
    currentRoles: StoreRoleDataType[],
    storeId: number,
    actorEmail: string,
) => {
    let normalizedDefaultRoles = false;
    const normalizedCurrentRoles = currentRoles.map((role) => {
        const defaultMetadata = DEFAULT_ROLE_METADATA[role?.id as keyof typeof DEFAULT_ROLE_METADATA];
        if (!defaultMetadata) return role;

        const normalizedPermissions = normalizeRolePermissions(role.permissions, defaultMetadata.permissions);
        const hasPermissionDrift = ALL_PERMISSIONS.some((permission) => (
            role.permissions?.[permission] !== normalizedPermissions[permission]
        ));
        if (!hasPermissionDrift) return role;
        normalizedDefaultRoles = true;
        return { ...role, permissions: normalizedPermissions };
    });
    const existingRoleIds = new Set(normalizedCurrentRoles.map((role) => role?.id).filter(Boolean));
    const missingRoleIds = DEFAULT_ROLE_ID_VALUES.filter((roleId) => !existingRoleIds.has(roleId));
    const missingRoles = createDefaultRoles(storeId, actorEmail)
        .filter((role) => missingRoleIds.includes(role.id as typeof DEFAULT_ROLE_ID_VALUES[number]));

    return {
        changed: normalizedDefaultRoles || missingRoles.length > 0,
        missingDefaultRoleCount: missingRoles.length,
        normalizedDefaultRoles,
        roles: [...normalizedCurrentRoles, ...missingRoles],
    };
};

const ensureDefaultRolesForStore = async (
    store: StoreDataType,
    actorEmail?: string,
) => {
    const storeScope = normalizeStaffStoreScopeDocumentId(store?.storeId);
    const tenantId = normalizeStaffScopeNumericId(store?.tenantId);
    if (!storeScope || tenantId === null) return store;
    const actor = actorEmail || "system";
    const preflightRepair = repairDefaultRoles(
        Array.isArray(store?.roles) ? store.roles : [],
        storeScope.numericId,
        actor,
    );
    if (!preflightRepair.changed) return store;

    const repair = await runStaffRoleMutationTransaction({
        actorEmail: actor,
        buildResult: (currentRoles) => {
            const latestRepair = repairDefaultRoles(currentRoles, storeScope.numericId, actor);
            return { result: latestRepair, roles: latestRepair.roles };
        },
        db: firestoreAdmin,
        modifiedOn: admin.firestore.Timestamp.now(),
        storeId: storeScope.numericId,
        tenantId,
    });

    logStaffDiagnostic("staff_default_roles_backfilled", {
        missingDefaultRoleCount: repair.missingDefaultRoleCount,
        normalizedDefaultRoles: repair.normalizedDefaultRoles,
        ...getBoundedStaffStringContext("storeId", store.storeId),
        ...getBoundedStaffStringContext("tenantId", store.tenantId),
    });

    return {
        ...store,
        roles: repair.roles,
    };
};

const getAuthority = async (session: any, tenantId: number, targetStoreIds: number[]) => {
    const sessionScope = resolveStorePermissionSessionScope(session);
    const sessionTenantId = sessionScope?.tenantScope.numericId ?? null;
    const sessionStoreId = sessionScope?.storeScope.numericId ?? null;

    if (isPlatformSession(session)) {
        return {
            canAssignRoles: true,
            canManageUsers: true,
            isMaster: true,
            sessionStoreId,
        };
    }

    if (!sessionTenantId || sessionTenantId !== tenantId || !sessionStoreId) {
        return null;
    }

    const authorityStore = await fetchStoreById(sessionStoreId);
    if (!isEligibleStaffTargetStore(authorityStore, tenantId)) {
        return null;
    }

    const roleId = session?.user?.stores?.find((store: any) => (
        normalizeStaffScopeNumericId(store?.storeId) === sessionStoreId
    ))?.role
        || session?.role
        || session?.user?.role;

    const targetIsOwnStoreOnly = targetStoreIds.every((storeId) => storeId === sessionStoreId);
    const isMaster = authorityStore.isMaster === true;
    if (!targetIsOwnStoreOnly && !isMaster) {
        return null;
    }

    return {
        canAssignRoles: hasPermission(roleId, authorityStore.roles || [], PERMISSIONS.ASSIGN_ROLES),
        canManageUsers: hasPermission(roleId, authorityStore.roles || [], PERMISSIONS.MANAGE_USERS),
        isMaster,
        sessionStoreId,
    };
};

const DIRECT_STAFF_SECURITY_DETAIL_KEYS = new Set(["code", "feature"]);

const getStaffSecurityDetailsLogContext = (
    details: Record<string, unknown> = {},
): Record<string, boolean | number | string | undefined> => {
    const boundedDetails: Record<string, boolean | number | string | undefined> = {};

    Object.entries(details).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            boundedDetails[`${key}Present`] = false;
            return;
        }

        if (typeof value === "boolean") {
            boundedDetails[key] = value;
            return;
        }

        if (DIRECT_STAFF_SECURITY_DETAIL_KEYS.has(key)) {
            boundedDetails[key] = String(value).slice(0, 64);
            return;
        }

        if (Array.isArray(value)) {
            boundedDetails[`${key}Count`] = value.length;
            return;
        }

        if (typeof value === "object") {
            boundedDetails[`${key}Present`] = true;
            boundedDetails[`${key}FieldCount`] = Object.keys(value).length;
            return;
        }

        Object.assign(boundedDetails, getBoundedStaffStringContext(key, value));
    });

    return boundedDetails;
};

const logSecurity = (
    event: string,
    session: any,
    request: NextRequest,
    details: Record<string, unknown>,
    severity: "low" | "medium" | "high" | "critical" = "high",
) => {
    logger.security(event, {
        ...getBoundedSecurityRouteContext(session, request),
        ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
        ...getStaffSecurityDetailsLogContext(details),
    }, severity);
};

const ownerTargetMutationError = (
    authority: { canAssignRoles?: boolean } | null | undefined,
    targetData: unknown,
    session: any,
    request: NextRequest,
    action: string,
): NextResponse | null => {
    if (authority?.canAssignRoles || !staffTargetHasOwnerAccess(targetData)) return null;
    logSecurity("Authorization Failed - Owner Staff Target", session, request, { action }, "high");
    return jsonError("Only an Owner can manage an Owner account.", 403, "OWNER_MANAGEMENT_FORBIDDEN");
};

const assertOwnerTargetMutationAllowed = (
    authority: { canAssignRoles?: boolean } | null | undefined,
    targetData: unknown,
) => {
    if (!authority?.canAssignRoles && staffTargetHasOwnerAccess(targetData)) {
        throw new StaffConcurrencyError("FORBIDDEN");
    }
};

const validateStoreMappings = async (
    mappings: StaffStoreMappingInput[],
    tenantId: number,
) => {
    const normalized = mappings.map((mapping) => ({
        storeId: mapping.storeId,
        name: mapping.name || "",
        role: mapping.role || DEFAULT_ROLE_IDS.STAFF,
    }));

    const duplicateStoreIds = normalized
        .map((mapping) => mapping.storeId)
        .filter((storeId, index, list) => list.indexOf(storeId) !== index);
    if (duplicateStoreIds.length) {
        throw createStaffStoreMappingError("DUPLICATE_STORE_MAPPING");
    }

    const storeMap = await fetchStoresByIds(normalized.map((mapping) => mapping.storeId));

    for (const mapping of normalized) {
        let store = storeMap.get(mapping.storeId);
        if (!isEligibleStaffTargetStore(store, tenantId)) {
            throw createStaffStoreMappingError("STORE_NOT_FOUND");
        }

        const roleExists = (store.roles || []).some((item: StoreRoleDataType) => item.id === mapping.role && item.active !== false);
        if (!roleExists && DEFAULT_ROLE_ID_VALUES.includes(mapping.role as typeof DEFAULT_ROLE_ID_VALUES[number])) {
            store = await ensureDefaultRolesForStore(store, "system");
            storeMap.set(mapping.storeId, store);
        }

        const role = (store.roles || []).find((item: StoreRoleDataType) => item.id === mapping.role && item.active !== false);
        if (!role) {
            throw createStaffStoreMappingError("ROLE_NOT_FOUND");
        }

        mapping.name = store.name || `Store ${mapping.storeId}`;
    }

    return normalized as UserStoreMappingType[];
};

const roleOrStoreMappingsChanged = (currentStores: UserStoreMappingType[], nextStores: UserStoreMappingType[]) => {
    const normalize = (stores: UserStoreMappingType[]) => stores
        .map((store) => ({
            storeId: normalizeStaffScopeNumericId(store.storeId),
            role: store.role || "",
        }))
        .filter((store): store is { storeId: number; role: string } => store.storeId !== null)
        .sort((a, b) => a.storeId - b.storeId);

    return JSON.stringify(normalize(currentStores || [])) !== JSON.stringify(normalize(nextStores || []));
};

const getUsersForStore = async (tenantId: number, storeId: number) => {
    const storeIdVariants: Array<number | string> = [storeId, String(storeId)];
    const storeIdArraySnapshots = storeIdVariants.map((storeIdValue) => (
        firestoreAdmin
            .collection(USERS_COLLECTION)
            .where("storeIds", "array-contains", storeIdValue)
            .get()
    ));
    const legacyStoreIdSnapshots = storeIdVariants.map((storeIdValue) => (
        firestoreAdmin
            .collection(USERS_COLLECTION)
            .where("storeId", "==", storeIdValue)
            .get()
    ));
    const snapshots = await Promise.all([
        ...storeIdArraySnapshots,
        ...legacyStoreIdSnapshots,
    ]);
    const docsById = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();

    snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((doc) => {
            if (normalizeStaffScopeNumericId(doc.data()?.tenantId) === tenantId) {
                docsById.set(doc.id, doc);
            }
        });
    });

    return Array.from(docsById.values());
};

const ensureNotSelfDestructive = (session: any, targetUserId: string) => {
    const sessionUserId = resolveCurrentSessionUserDocumentId(session);
    if (!isPlatformSession(session) && targetUserId && sessionUserId === targetUserId) {
        throw new Error("SELF_UPDATE_BLOCKED");
    }
};

const applyRateLimit = async (
    request: NextRequest,
    session: any,
    feature: "DATA_READ" | "DATA_WRITE" | "AUTH_SENSITIVE",
    keyPrefix: string,
) => {
    const config = getRateLimitForFeature(feature);
    const sessionUserId = resolveCurrentSessionUserDocumentId(session);
    if (!sessionUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const identityKey = hashPublicRateLimitValue(sessionUserId);
    const key = `${keyPrefix}:${identityKey}`;
    const result = await checkRateLimit({ key, ...config });
    if (result.allowed) return null;

    logSecurity("Rate Limit Exceeded", session, request, { feature }, "medium");

    return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 },
    );
};

const getFirebaseAuthApiKey = () => process.env.FIREBASE_API_KEY;

const normalizeFirebaseAuthApiKey = (value?: string) => {
    const apiKey = String(value || "").trim();
    if (!apiKey || /[\s\x00-\x1F\x7F]/.test(apiKey)) return null;
    return apiKey;
};

const buildFirebasePasswordResetEndpoint = (apiKey: string) => {
    const endpoint = new URL(FIREBASE_AUTH_SEND_OOB_CODE_URL);
    endpoint.searchParams.set("key", apiKey);
    return endpoint.toString();
};

const resolveStoreMappingErrorCode = (error: unknown): string => {
    const rawCode = error && typeof error === 'object'
        ? (error as { staffMappingCode?: unknown }).staffMappingCode
        : null;
    if (typeof rawCode === 'string' && STAFF_STORE_MAPPING_ERROR_CODES.has(rawCode as StaffStoreMappingErrorCode)) {
        return rawCode;
    }

    return 'INVALID_STORE_OR_ROLE';
};

const sendFirebasePasswordResetEmail = async (email: string) => {
    const apiKey = normalizeFirebaseAuthApiKey(getFirebaseAuthApiKey());
    if (!apiKey) {
        return { ok: false, error: "FIREBASE_API_KEY_MISSING" };
    }

    try {
        const response = await fetch(buildFirebasePasswordResetEndpoint(apiKey), {
            body: JSON.stringify({
                email,
                requestType: "PASSWORD_RESET",
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
            redirect: "manual",
            signal: AbortSignal.timeout(STAFF_PASSWORD_RESET_PROVIDER_TIMEOUT_MS),
        });

        if (response.ok) return { ok: true };
        return {
            ok: false,
            error: "PASSWORD_RESET_EMAIL_FAILED",
        };
    } catch {
        return {
            ok: false,
            error: "PASSWORD_RESET_EMAIL_REQUEST_FAILED",
        };
    }
};

const recordStaffPasswordSetupEmailMetadata = async (
    userRef: FirebaseFirestore.DocumentReference,
    now: admin.firestore.Timestamp,
    actorId: string,
    context: { storeId: number; tenantId: number; userId: string },
) => {
    try {
        await userRef.update(sanitizeFirestoreValue({
            passwordResetEmailSentAt: now,
            passwordResetRequestedAt: now,
            passwordResetRequestedBy: actorId,
        }));
        return true;
    } catch {
        logStaffDiagnostic("staff_password_setup_metadata_write_failed", {
            ...getBoundedStaffStringContext("tenantId", context.tenantId),
            ...getBoundedStaffStringContext("storeId", context.storeId),
            ...getBoundedStaffStringContext("userId", context.userId),
        });
        return false;
    }
};

export const listStaffUsers = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "DATA_READ", "staff-read");
    if (rateLimit) return rateLimit;

    const tenantId = normalizeStaffScopeNumericId(request.nextUrl.searchParams.get("tenantId"));
    const storeId = normalizeStaffScopeNumericId(request.nextUrl.searchParams.get("storeId"));

    if (tenantId === null || storeId === null) {
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const authority = await getAuthority(session, tenantId, [storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff List", session, request, { tenantId, storeId }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const targetStore = await fetchStoreById(storeId);
    if (!isEligibleStaffTargetStore(targetStore, tenantId)) {
        return jsonError("Store not found", 404, "STORE_NOT_FOUND");
    }

    const docs = await getUsersForStore(tenantId, storeId);
    const rawStoreOptionDocs = authority.isMaster
        ? await fetchStoresForTenant(tenantId)
        : [targetStore];
    if (
        authority.isMaster
        && !rawStoreOptionDocs.some((store) => (
            normalizeStaffScopeNumericId(store?.storeId) === storeId
        ))
    ) {
        // Current stores always persist active=true. Keep a bounded compatibility
        // path for a legacy target row where that field is absent without letting
        // historical inactive outlets consume the active-store sentinel.
        rawStoreOptionDocs.unshift(targetStore);
        if (rawStoreOptionDocs.length > MAX_STAFF_STORE_MAPPINGS) {
            throw new Error("STAFF_TENANT_STORE_LIMIT_EXCEEDED");
        }
    }
    const storeOptionDocs = await Promise.all(rawStoreOptionDocs
        .filter((store): store is StoreDataType => isEligibleStaffTargetStore(store, tenantId))
        .map((store) => ensureDefaultRolesForStore(store, session?.user?.email)));
    const stores = storeOptionDocs
        .map(sanitizeStoreOption)
        .sort((a, b) => a.name.localeCompare(b.name));
    const users = docs
        .map((doc) => sanitizeStaffUserForAuthority(doc.id, doc.data(), authority))
        .filter((user) => user.deleted !== true)
        .filter((user) => user.storeIds?.includes(storeId) || user.stores?.some((store) => store.storeId === storeId))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

    return NextResponse.json({ stores, users });
};

export const createStaffUser = async (
    request: NextRequest,
    session: any,
) => {
    if (!FEATURE_FLAGS.ENABLE_SERVER_STAFF_CREATION) {
        return jsonError("Feature disabled", 404, "FEATURE_DISABLED");
    }

    const rateLimit = await applyRateLimit(request, session, "AUTH_SENSITIVE", "staff-create");
    if (rateLimit) return rateLimit;
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) return jsonError("Forbidden", 403, "FORBIDDEN");

    const bodyResult = await readStaffMutationBody(request);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = validateAPIInput(CreateStaffSchema, bodyResult.data);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Create", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as CreateStaffInput;
    const requestedRole = input.role || DEFAULT_ROLE_IDS.STAFF;
    const authority = await getAuthority(session, input.tenantId, [input.storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Create", session, request, {
            tenantId: input.tenantId,
            storeId: input.storeId,
        }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    if (requestedRole !== DEFAULT_ROLE_IDS.STAFF && !authority.canAssignRoles) {
        logSecurity("Authorization Failed - Staff Role Assignment", session, request, {
            requestedRole,
            storeId: input.storeId,
        }, "high");
        return jsonError("You do not have permission to assign roles", 403, "ROLE_ASSIGNMENT_FORBIDDEN");
    }

    let stores: UserStoreMappingType[];
    try {
        stores = await validateStoreMappings([{
            name: input.storeName,
            role: requestedRole,
            storeId: input.storeId,
        }], input.tenantId);
    } catch (error: any) {
        const code = resolveStoreMappingErrorCode(error);
        logSecurity('Input Validation Failed - Staff Store Mapping', session, request, {
            code,
            tenantId: input.tenantId,
            storeId: input.storeId,
        }, 'medium');
        return jsonError("Invalid store or role", 400, code);
    }

    const hasStaffEmail = Boolean(input.email);
    const existingUserQuery = hasStaffEmail
        ? await firestoreAdmin
            .collection(USERS_COLLECTION)
            .where("email", "==", input.email)
            .limit(STAFF_EMAIL_QUERY_LIMIT)
            .get()
        : null;

    const now = admin.firestore.Timestamp.now();

    if (existingUserQuery && existingUserQuery.size > 1) {
        logSecurity("Staff Email Authority Ambiguous", session, request, {
            tenantId: input.tenantId,
            storeId: input.storeId,
            matchingRecordCount: existingUserQuery.size,
        }, "critical");
        return jsonError(
            "This staff account cannot be created. Contact MenuList support.",
            409,
            "EMAIL_RECORD_AMBIGUOUS",
        );
    }

    if (existingUserQuery && !existingUserQuery.empty) {
        const existingDoc = existingUserQuery.docs[0];
        const existingData = existingDoc.data();

        if (normalizeStaffScopeNumericId(existingData.tenantId) !== input.tenantId) {
            return jsonError(
                "This email is registered with another business. Staff can only belong to one business.",
                409,
                "EMAIL_OTHER_TENANT",
            );
        }
        if (isPlatformEntityBlocked(existingData)) {
            return jsonError("This staff member is blocked by MenuList support.", 403, "ACCOUNT_BLOCKED");
        }
        const ownerTargetError = ownerTargetMutationError(
            authority,
            existingData,
            session,
            request,
            "staff_add_store",
        );
        if (ownerTargetError) return ownerTargetError;

        if (existingData.isVerified !== true) {
            const existingFirebaseUid = typeof existingData.firebaseUid === "string"
                ? existingData.firebaseUid.trim()
                : "";
            if (existingFirebaseUid) {
                return jsonError(
                    "This account has an incomplete authentication binding. Contact MenuList support.",
                    409,
                    "AUTH_BINDING_INVALID",
                );
            }

            const loginEmail = String(input.email);
            const existingDisplayName = typeof existingData.name === "string" ? existingData.name.trim() : "";
            const displayName = input.name || existingDisplayName || loginEmail.split("@")[0];
            const tempPassword = randomBytes(24).toString("base64url");
            let firebaseUid: string;

            try {
                const firebaseUser = await authAdmin.createUser({
                    displayName,
                    email: loginEmail,
                    emailVerified: false,
                    password: tempPassword,
                });
                firebaseUid = firebaseUser.uid;
            } catch (error: any) {
                if (error?.code === "auth/email-already-exists") {
                    return jsonError("This email is already registered in the auth system", 409, "EMAIL_EXISTS");
                }
                if (error?.code === "auth/invalid-email") {
                    return jsonError("Invalid email address", 400, "INVALID_EMAIL");
                }
                throw error;
            }

            let mutationResult;
            try {
                mutationResult = await runStaffUserMutationTransaction({
                    buildUpdate: ({ currentData, nextMappings }) => {
                        assertOwnerTargetMutationAllowed(authority, currentData);
                        if (
                            currentData.isVerified === true
                            || (typeof currentData.firebaseUid === "string" && currentData.firebaseUid.trim())
                        ) {
                            throw new StaffConcurrencyError("USER_ALREADY_EXISTS");
                        }
                        const nextStoreIds = nextMappings.map(({ storeId }) => storeId);
                        const currentDefaultStoreId = normalizeStaffScopeNumericId(currentData.storeId);
                        return sanitizeFirestoreValue({
                            active: true,
                            authDisabled: false,
                            deleted: false,
                            deletedAt: null,
                            email: loginEmail,
                            firebaseUid,
                            isVerified: true,
                            modifiedBy: session?.user?.email,
                            modifiedOn: now,
                            name: displayName,
                            platformRole: currentData.platformRole || "USER",
                            staffAuthMode: STAFF_AUTH_MODE_EMAIL,
                            storeId: currentDefaultStoreId && nextStoreIds.includes(currentDefaultStoreId)
                                ? currentDefaultStoreId
                                : input.storeId,
                            storeIds: nextStoreIds,
                            stores: nextMappings,
                        });
                    },
                    db: firestoreAdmin,
                    mutation: { kind: "upsert", mapping: stores[0], verified: true },
                    tenantId: input.tenantId,
                    userId: existingDoc.id,
                });
            } catch (error) {
                try {
                    await authAdmin.deleteUser(firebaseUid);
                } catch {
                    logStaffDiagnostic("staff_verify_auth_compensation_failed", {
                        ...getBoundedStaffStringContext("tenantId", input.tenantId),
                        ...getBoundedStaffStringContext("storeId", input.storeId),
                        ...getBoundedStaffStringContext("userId", existingDoc.id),
                        hasFirebaseUid: true,
                    });
                }
                const response = staffConcurrencyErrorResponse(error);
                if (response) return response;
                throw error;
            }

            const passwordResetEmail = await sendFirebasePasswordResetEmail(loginEmail);
            if (passwordResetEmail.ok) {
                await recordStaffPasswordSetupEmailMetadata(existingDoc.ref, now, actorId, {
                    storeId: input.storeId,
                    tenantId: input.tenantId,
                    userId: existingDoc.id,
                });
            } else {
                logStaffDiagnostic("staff_password_setup_email_failed", {
                    ...getBoundedStaffStringContext("providerFailureCode", passwordResetEmail.error),
                    ...getBoundedStaffStringContext("tenantId", input.tenantId),
                    ...getBoundedStaffStringContext("storeId", input.storeId),
                    ...getBoundedStaffStringContext("userId", existingDoc.id),
                });
            }

            logStaffDiagnostic("staff_existing_user_auth_bound", {
                ...getBoundedStaffStringContext("tenantId", input.tenantId),
                ...getBoundedStaffStringContext("storeId", input.storeId),
                ...getBoundedStaffStringContext("userId", existingDoc.id),
            });

            return NextResponse.json({
                success: true,
                email: loginEmail,
                message: "Staff access verified. They can set their password via the login page.",
                mode: "existing_user_auth_bound",
                passwordResetEmailError: passwordResetEmail.ok ? undefined : "password_reset_email_failed",
                passwordResetEmailSent: passwordResetEmail.ok,
                staffAuthMode: STAFF_AUTH_MODE_EMAIL,
                user: sanitizeStaffUserForAuthority(existingDoc.id, mutationResult.updatedData, authority),
                userId: existingDoc.id,
            } satisfies StaffMutationResponse);
        }

        const sessionRevocationFields = buildSessionRevocationFields(
            session,
            now,
            "staff_store_mapping_added",
        );

        let mutationResult;
        try {
            mutationResult = await runStaffUserMutationTransaction({
                buildUpdate: ({ currentData, nextMappings }) => {
                    assertOwnerTargetMutationAllowed(authority, currentData);
                    const nextStoreIds = nextMappings.map(({ storeId }) => storeId);
                    const currentDefaultStoreId = normalizeStaffScopeNumericId(currentData.storeId);
                    return sanitizeFirestoreValue({
                        active: true,
                        authDisabled: false,
                        deleted: false,
                        deletedAt: null,
                        modifiedBy: session?.user?.email,
                        modifiedOn: now,
                        storeId: currentDefaultStoreId && nextStoreIds.includes(currentDefaultStoreId)
                            ? currentDefaultStoreId
                            : input.storeId,
                        storeIds: nextStoreIds,
                        stores: nextMappings,
                        ...sessionRevocationFields,
                    });
                },
                db: firestoreAdmin,
                mutation: { kind: "add", mapping: stores[0] },
                tenantId: input.tenantId,
                userId: existingDoc.id,
            });
        } catch (error) {
            const response = staffConcurrencyErrorResponse(error);
            if (response) return response;
            throw error;
        }

        await revokeStaffFirebaseRefreshTokensAfterCommit(mutationResult.currentData, {
            action: "staff-add-store",
            reason: "staff_store_mapping_added",
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: existingDoc.id,
        });
        await syncStaffFirebaseAuthDisabledState(mutationResult.currentData, false, {
            action: "staff-reactivate-on-store-add",
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: existingDoc.id,
        });

        const updated = sanitizeStaffUserForAuthority(existingDoc.id, mutationResult.updatedData, authority);

        logStaffDiagnostic("staff_existing_user_added_to_store", {
            ...getBoundedStaffStringContext("tenantId", input.tenantId),
            ...getBoundedStaffStringContext("storeId", input.storeId),
            ...getBoundedStaffStringContext("userId", existingDoc.id),
        });

        const response: StaffMutationResponse = {
            success: true,
            email: input.email,
            message: "Existing staff member added to this store.",
            mode: "existing_user_added_to_store",
            staffAuthMode: getStaffAuthMode(existingData),
            staffLoginId: resolveStaffLoginDisplayId(existingData.staffLoginId || existingData.loginUsername),
            user: updated,
            userId: existingDoc.id,
        };
        return NextResponse.json(response);
    }

    const staffLoginUsername = await generateUniqueStaffLoginId();
    const staffLoginId = resolveStaffLoginDisplayId(staffLoginUsername);
    const loginEmail = hasStaffEmail
        ? String(input.email)
        : buildManagedStaffEmail(input.tenantId, staffLoginUsername);
    const tempPasscode = hasStaffEmail ? "" : generateStaffPasscode();
    const tempPassword = tempPasscode || randomBytes(24).toString("base64url");
    const authMode = hasStaffEmail ? STAFF_AUTH_MODE_EMAIL : STAFF_AUTH_MODE_OWNER_PASSCODE;
    const normalizedPhone = normalizePhoneNumberForStorage({
        countryCode: input.countryCode,
        dialCode: input.dialCode,
        phoneNumber: input.phoneNumber,
    });
    const displayName = input.name || normalizedPhone.phoneNumber || (hasStaffEmail ? String(input.email).split("@")[0] : `Staff ${staffLoginId.slice(-4)}`);
    const phoneUsername = normalizedPhone.phoneUsername;
    let firebaseUid: string;
    let createdFirebaseAuthUser = false;

    try {
        const firebaseUser = await authAdmin.createUser({
            displayName,
            email: loginEmail,
            emailVerified: false,
            password: tempPassword,
        });
        firebaseUid = firebaseUser.uid;
        createdFirebaseAuthUser = true;
    } catch (error: any) {
        if (error?.code === "auth/email-already-exists") {
            return hasStaffEmail
                ? jsonError("This email is already registered in the auth system", 409, "EMAIL_EXISTS")
                : jsonError("Could not reserve a Staff ID. Please try again.", 409, "STAFF_LOGIN_COLLISION");
        } else if (error?.code === "auth/invalid-email") {
            return jsonError("Invalid email address", 400, "INVALID_EMAIL");
        } else {
            throw error;
        }
    }

    const newUserDoc = sanitizeFirestoreValue({
        active: true,
        authDisabled: false,
        countryCode: input.phoneNumber ? normalizedPhone.countryCode : input.countryCode,
        createdBy: session?.user?.email,
        createdOn: now,
        createdVia: hasStaffEmail ? "staff-invite" : "staff-owner-passcode",
        deleted: false,
        dialCode: input.phoneNumber ? normalizedPhone.dialCode : input.dialCode,
        email: loginEmail,
        firebaseUid,
        isVerified: true,
        loginUsername: staffLoginUsername,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        name: displayName,
        phone: normalizedPhone.phone || undefined,
        phoneNumber: input.phoneNumber ? normalizedPhone.phoneNumber : input.phoneNumber,
        platformRole: "USER",
        phoneUsername: phoneUsername || undefined,
        staffAuthMode: authMode,
        staffLoginId,
        storeId: input.storeId,
        storeIds: [input.storeId],
        stores,
        tenantId: input.tenantId,
    });

    const deterministicUserRef = firestoreAdmin.collection(USERS_COLLECTION).doc(firebaseUid);
    let persistedNewUserDoc = newUserDoc;
    let docRef: FirebaseFirestore.DocumentReference;
    try {
        persistedNewUserDoc = await createStaffUserDocumentTransaction({
            data: newUserDoc,
            db: firestoreAdmin,
            mappings: stores,
            tenantId: input.tenantId,
            userId: firebaseUid,
        });
        docRef = deterministicUserRef;
    } catch (error: any) {
        const concurrencyResponse = staffConcurrencyErrorResponse(error);
        if (createdFirebaseAuthUser) {
            try {
                await authAdmin.deleteUser(firebaseUid);
            } catch {
                logStaffDiagnostic("staff_create_auth_compensation_failed", {
                    ...getBoundedStaffStringContext("tenantId", input.tenantId),
                    ...getBoundedStaffStringContext("storeId", input.storeId),
                    hasFirebaseUid: Boolean(firebaseUid),
                });
            }
        }
        if (concurrencyResponse) return concurrencyResponse;
        throw error;
    }

    let passwordResetEmail: { ok: boolean; error?: string } = { ok: false };
    if (hasStaffEmail) {
        passwordResetEmail = await sendFirebasePasswordResetEmail(loginEmail);
        if (passwordResetEmail.ok) {
            await recordStaffPasswordSetupEmailMetadata(docRef, now, actorId, {
                storeId: input.storeId,
                tenantId: input.tenantId,
                userId: docRef.id,
            });
        } else {
            logStaffDiagnostic("staff_password_setup_email_failed", {
                ...getBoundedStaffStringContext("providerFailureCode", passwordResetEmail.error),
                ...getBoundedStaffStringContext("tenantId", input.tenantId),
                ...getBoundedStaffStringContext("storeId", input.storeId),
                ...getBoundedStaffStringContext("userId", docRef.id),
            });
        }
    }

    logStaffDiagnostic("staff_user_created", {
        authMode,
        ...getBoundedStaffStringContext("tenantId", input.tenantId),
        ...getBoundedStaffStringContext("storeId", input.storeId),
        ...getBoundedStaffStringContext("userId", docRef.id),
    });

    const response: StaffMutationResponse = {
        success: true,
        email: loginEmail,
        message: hasStaffEmail
            ? "Staff user created. They can set their password via the login page."
            : "Staff user created. Share the staff ID and temporary passcode with them.",
        mode: "new_user_created",
        passwordResetEmailError: hasStaffEmail && !passwordResetEmail.ok ? "password_reset_email_failed" : undefined,
        passwordResetEmailSent: hasStaffEmail ? passwordResetEmail.ok : false,
        staffAuthMode: authMode,
        staffLoginId,
        temporaryPasscode: tempPasscode || undefined,
        user: sanitizeStaffUserForAuthority(docRef.id, persistedNewUserDoc, authority),
        userId: docRef.id,
    };

    return NextResponse.json(response);
};

export const updateStaffUser = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "DATA_WRITE", "staff-update");
    if (rateLimit) return rateLimit;

    const bodyResult = await readStaffMutationBody(request);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = validateAPIInput(UpdateStaffSchema, bodyResult.data);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Update", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as UpdateStaffInput;
    const targetUserId = normalizeStaffUserId(input.userId);
    if (!targetUserId) {
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    let targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(targetUserId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (normalizeStaffScopeNumericId(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Tenant Mismatch", session, request, {
            targetTenantId: existingData.tenantId,
            requestedTenantId: input.tenantId,
            userId: targetUserId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const currentStores = normalizePersistedStaffStoreMappings(existingData.stores);
    let nextStores: UserStoreMappingType[];
    try {
        nextStores = input.stores
            ? await validateStoreMappings(input.stores, input.tenantId)
            : currentStores;
    } catch (error: any) {
        const code = resolveStoreMappingErrorCode(error);
        logSecurity('Input Validation Failed - Staff Store Mapping', session, request, {
            code,
            tenantId: input.tenantId,
            userId: targetUserId,
        }, 'medium');
        return jsonError("Invalid store or role", 400, code);
    }

    if (input.storeId && !nextStores.some((store) => store.storeId === input.storeId)) {
        return jsonError("Default store must be assigned to this staff member", 400, "STORE_MAPPING_REQUIRED");
    }

    const targetStoreIds = Array.from(new Set([
        ...currentStores.map((store) => store.storeId),
        ...nextStores.map((store) => store.storeId),
        ...(input.storeId ? [input.storeId] : []),
    ]));

    const existingDefaultStoreId = normalizeStaffScopeNumericId(existingData.storeId);
    const authorityTargetStoreIds = targetStoreIds.length
        ? targetStoreIds
        : existingDefaultStoreId === null ? [] : [existingDefaultStoreId];
    const authority = await getAuthority(session, input.tenantId, authorityTargetStoreIds);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Update", session, request, {
            tenantId: input.tenantId,
            userId: targetUserId,
        }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }
    const ownerTargetError = ownerTargetMutationError(
        authority,
        existingData,
        session,
        request,
        "staff_update",
    );
    if (ownerTargetError) return ownerTargetError;

    const mappingsChanged = input.stores ? roleOrStoreMappingsChanged(currentStores, nextStores) : false;
    if (mappingsChanged && !authority.canAssignRoles) {
        logSecurity("Authorization Failed - Staff Mapping Update", session, request, {
            tenantId: input.tenantId,
            userId: targetUserId,
        }, "high");
        return jsonError("You do not have permission to change store or role assignments", 403, "ROLE_ASSIGNMENT_FORBIDDEN");
    }

    try {
        if (input.active === false || input.stores !== undefined) {
            ensureNotSelfDestructive(session, targetUserId);
        }
    } catch (error: any) {
        if (error?.message === "SELF_UPDATE_BLOCKED") {
            return jsonError("You cannot remove or deactivate your own access.", 409, "SELF_UPDATE_BLOCKED");
        }
        throw error;
    }

    const now = admin.firestore.Timestamp.now();
    const shouldRevokeSessions = input.active === false || input.stores !== undefined;
    const sessionRevocationFields = shouldRevokeSessions
        ? buildSessionRevocationFields(
            session,
            now,
            input.active === false ? "staff_deactivated" : "staff_store_mapping_changed",
        )
        : {};
    let mutationResult;
    try {
        mutationResult = await runStaffUserMutationTransaction({
            buildUpdate: ({ currentData, mappingsChanged: freshMappingsChanged, nextMappings }) => {
                assertOwnerTargetMutationAllowed(authority, currentData);
                if (freshMappingsChanged && !authority.canAssignRoles) {
                    throw new StaffConcurrencyError("FORBIDDEN");
                }
                const nextStoreIds = nextMappings.map(({ storeId }) => storeId);
                const currentDefaultStoreId = normalizeStaffScopeNumericId(currentData.storeId);
                const nextDefaultStoreId = input.storeId && nextStoreIds.includes(input.storeId)
                    ? input.storeId
                    : currentDefaultStoreId && nextStoreIds.includes(currentDefaultStoreId)
                        ? currentDefaultStoreId
                        : nextStoreIds[0];
                const shouldNormalizePhone = input.phoneNumber !== undefined
                    || input.dialCode !== undefined
                    || input.countryCode !== undefined;
                const normalizedPhone = shouldNormalizePhone
                    ? normalizePhoneNumberForStorage({
                        countryCode: input.countryCode ?? currentData.countryCode,
                        dialCode: input.dialCode ?? currentData.dialCode,
                        phoneNumber: input.phoneNumber ?? currentData.phoneNumber,
                    })
                    : null;
                return sanitizeFirestoreValue({
                    active: input.active,
                    alternatePhoneNumber: input.alternatePhoneNumber,
                    authDisabled: input.active === undefined
                        ? undefined
                        : input.active === false || isPlatformEntityBlocked(currentData),
                    countryCode: normalizedPhone ? normalizedPhone.countryCode : input.countryCode,
                    dialCode: normalizedPhone ? normalizedPhone.dialCode : input.dialCode,
                    modifiedBy: session?.user?.email,
                    modifiedOn: now,
                    name: input.name,
                    phone: normalizedPhone ? normalizedPhone.phone : undefined,
                    phoneNumber: normalizedPhone ? normalizedPhone.phoneNumber : input.phoneNumber,
                    phoneUsername: normalizedPhone ? normalizedPhone.phoneUsername : undefined,
                    storeId: input.stores ? nextDefaultStoreId : input.storeId,
                    storeIds: input.stores ? nextStoreIds : undefined,
                    stores: input.stores ? nextMappings : undefined,
                    ...sessionRevocationFields,
                });
            },
            db: firestoreAdmin,
            mutation: { active: input.active, kind: "replace", mappings: input.stores ? nextStores : undefined },
            tenantId: input.tenantId,
            userId: targetUserId,
        });
    } catch (error) {
        const response = staffConcurrencyErrorResponse(error);
        if (response) return response;
        throw error;
    }

    if (shouldRevokeSessions) {
        await revokeStaffFirebaseRefreshTokensAfterCommit(mutationResult.currentData, {
            action: "staff-active-toggle",
            reason: input.active === false ? "staff_deactivated" : "staff_store_mapping_changed",
            tenantId: input.tenantId,
            userId: targetUserId,
        });
    }

    if (input.active !== undefined) {
        await syncStaffFirebaseAuthDisabledState(
            mutationResult.currentData,
            input.active === false || isPlatformEntityBlocked(mutationResult.currentData),
            {
                action: "staff-active-toggle",
                tenantId: input.tenantId,
                userId: targetUserId,
            },
        );
    }

    const response: StaffMutationResponse = {
        success: true,
        mode: "user_updated",
        user: sanitizeStaffUserForAuthority(targetUserId, mutationResult.updatedData, authority),
        userId: targetUserId,
    };

    return NextResponse.json(response);
};

export const removeStaffFromStore = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "DATA_WRITE", "staff-delete");
    if (rateLimit) return rateLimit;

    const validation = validateAPIInput(RemoveStaffSchema, {
        tenantId: normalizeStaffScopeNumericId(request.nextUrl.searchParams.get("tenantId")),
        storeId: normalizeStaffScopeNumericId(request.nextUrl.searchParams.get("storeId")),
        userId: request.nextUrl.searchParams.get("userId"),
    });

    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Remove", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as RemoveStaffInput;
    const targetUserId = normalizeStaffUserId(input.userId);
    if (!targetUserId) {
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const authority = await getAuthority(session, input.tenantId, [input.storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Remove", session, request, {
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: targetUserId,
        }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    try {
        ensureNotSelfDestructive(session, targetUserId);
    } catch (error: any) {
        if (error?.message === "SELF_UPDATE_BLOCKED") {
            return jsonError("You cannot remove your own access.", 409, "SELF_UPDATE_BLOCKED");
        }
        throw error;
    }

    const targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(targetUserId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (normalizeStaffScopeNumericId(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Remove Tenant Mismatch", session, request, {
            requestedTenantId: input.tenantId,
            targetTenantId: existingData.tenantId,
            userId: targetUserId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }
    const ownerTargetError = ownerTargetMutationError(
        authority,
        existingData,
        session,
        request,
        "staff_remove",
    );
    if (ownerTargetError) return ownerTargetError;

    const now = admin.firestore.Timestamp.now();
    let mutationResult;
    try {
        mutationResult = await runStaffUserMutationTransaction({
            buildUpdate: ({ currentData, nextMappings, shouldDeactivate }) => {
                assertOwnerTargetMutationAllowed(authority, currentData);
                const nextStoreIds = nextMappings.map(({ storeId }) => storeId);
                const currentDefaultStoreId = normalizeStaffScopeNumericId(currentData.storeId);
                return sanitizeFirestoreValue({
                    active: shouldDeactivate ? false : currentData.active,
                    authDisabled: shouldDeactivate ? true : currentData.authDisabled,
                    deleted: shouldDeactivate ? true : currentData.deleted === true ? false : currentData.deleted,
                    deletedAt: shouldDeactivate ? now : currentData.deletedAt ?? null,
                    modifiedBy: session?.user?.email,
                    modifiedOn: now,
                    storeId: shouldDeactivate
                        ? input.storeId
                        : currentDefaultStoreId && nextStoreIds.includes(currentDefaultStoreId)
                            ? currentDefaultStoreId
                            : nextStoreIds[0],
                    storeIds: nextStoreIds,
                    stores: nextMappings,
                    ...buildSessionRevocationFields(
                        session,
                        now,
                        shouldDeactivate ? "staff_removed_from_last_store" : "staff_store_mapping_removed",
                    ),
                });
            },
            db: firestoreAdmin,
            mutation: { kind: "remove", storeId: input.storeId },
            tenantId: input.tenantId,
            userId: targetUserId,
        });
    } catch (error) {
        const response = staffConcurrencyErrorResponse(error);
        if (response) return response;
        throw error;
    }

    await revokeStaffFirebaseRefreshTokensAfterCommit(mutationResult.currentData, {
        action: "staff-remove-store",
        reason: "staff_store_mapping_removed",
        tenantId: input.tenantId,
        storeId: input.storeId,
        userId: targetUserId,
    });

    if (mutationResult.shouldDeactivate) {
        await syncStaffFirebaseAuthDisabledState(mutationResult.currentData, true, {
            action: "staff-remove-last-store",
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: targetUserId,
        });
    }

    const response: StaffMutationResponse = {
        success: true,
        mode: mutationResult.shouldDeactivate ? "user_deactivated" : "store_mapping_removed",
        user: sanitizeStaffUserForAuthority(targetUserId, mutationResult.updatedData, authority),
        userId: targetUserId,
    };

    return NextResponse.json(response);
};

export const requestStaffPasswordReset = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "AUTH_SENSITIVE", "staff-password-reset");
    if (rateLimit) return rateLimit;
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) return jsonError("Forbidden", 403, "FORBIDDEN");

    const bodyResult = await readStaffMutationBody(request);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = validateAPIInput(ResetStaffPasswordSchema, bodyResult.data);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Password Reset", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as ResetStaffPasswordInput;
    const targetUserId = normalizeStaffUserId(input.userId);
    if (!targetUserId) {
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const authority = await getAuthority(session, input.tenantId, [input.storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Password Reset", session, request, {
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: targetUserId,
        }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    try {
        ensureNotSelfDestructive(session, targetUserId);
    } catch (error: any) {
        if (error?.message === "SELF_UPDATE_BLOCKED") {
            return jsonError("Use Account access to change your own password.", 409, "SELF_UPDATE_BLOCKED");
        }
        throw error;
    }

    const targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(targetUserId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (normalizeStaffScopeNumericId(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Password Reset Tenant Mismatch", session, request, {
            requestedTenantId: input.tenantId,
            targetTenantId: existingData.tenantId,
            userId: targetUserId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }
    const ownerTargetError = ownerTargetMutationError(
        authority,
        existingData,
        session,
        request,
        "staff_password_reset",
    );
    if (ownerTargetError) return ownerTargetError;

    const currentStores = normalizePersistedStaffStoreMappings(existingData.stores);
    const hasStoreAccess = currentStores.some((store) => store.storeId === input.storeId);
    if (!hasStoreAccess || existingData.deleted === true) {
        return jsonError("Staff member is not assigned to this store", 404, "STORE_MAPPING_NOT_FOUND");
    }
    if (isPlatformEntityBlocked(existingData)) {
        return jsonError("This staff member is blocked by MenuList support.", 403, "ACCOUNT_BLOCKED");
    }
    if (existingData.active === false) {
        return jsonError("Activate this staff member before creating a new passcode.", 409, "STAFF_INACTIVE");
    }

    const email = String(existingData.email || "").toLowerCase().trim();
    if (!email) {
        return jsonError("Staff member does not have a login account", 400, "LOGIN_MISSING");
    }

    let firebaseUser;
    try {
        firebaseUser = existingData.firebaseUid
            ? await authAdmin.getUser(String(existingData.firebaseUid))
            : await authAdmin.getUserByEmail(email);
    } catch (error: any) {
        if (error?.code === "auth/user-not-found") {
            return jsonError("This staff member does not have a Firebase Auth login account.", 409, "AUTH_USER_NOT_FOUND");
        }
        throw error;
    }

    const existingLoginUsername = resolveStaffLoginUsername(existingData.loginUsername || existingData.staffLoginId);
    const loginUsername = existingLoginUsername || await generateUniqueStaffLoginId();
    const loginId = resolveStaffLoginDisplayId(loginUsername);
    const temporaryPasscode = generateStaffPasscode();
    const now = admin.firestore.Timestamp.now();
    const passcodeResetOperationId = randomUUID();
    const passcodeResetLeaseExpiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + STAFF_PASSCODE_RESET_LEASE_MS);
    try {
        await firestoreAdmin.runTransaction(async (transaction) => {
            const freshTargetDoc = await transaction.get(targetDoc.ref);
            if (!freshTargetDoc.exists) throw new StaffPasscodeResetScopeConflictError();
            const freshData = freshTargetDoc.data() || {};
            assertOwnerTargetMutationAllowed(authority, freshData);
            const freshMappings = normalizePersistedStaffStoreMappings(freshData.stores);
            if (
                normalizeStaffScopeNumericId(freshData.tenantId) !== input.tenantId
                || !freshMappings.some((store) => store.storeId === input.storeId)
                || freshData.deleted === true
                || freshData.active === false
                || isPlatformEntityBlocked(freshData)
            ) {
                throw new StaffPasscodeResetScopeConflictError();
            }
            const pending = isStaffUnknownRecord(freshData.passcodeResetPending)
                ? freshData.passcodeResetPending
                : null;
            if (pending && getStaffTimestampMillis(pending.leaseExpiresAt) > now.toMillis()) {
                throw new StaffPasscodeResetInProgressError();
            }
            transaction.update(targetDoc.ref, {
                passcodeResetPending: {
                    leaseExpiresAt: passcodeResetLeaseExpiresAt,
                    operationId: passcodeResetOperationId,
                    requestedAt: now,
                    requestedBy: actorId,
                },
            });
        });
    } catch (error) {
        if (error instanceof StaffPasscodeResetInProgressError) {
            return jsonError("A passcode reset is already in progress.", 409, "PASSCODE_RESET_IN_PROGRESS");
        }
        if (error instanceof StaffPasscodeResetScopeConflictError) {
            return jsonError("Staff access changed. Refresh and try again.", 409, "STAFF_SCOPE_CHANGED");
        }
        const concurrencyResponse = staffConcurrencyErrorResponse(error);
        if (concurrencyResponse) return concurrencyResponse;
        throw error;
    }
    try {
        await authAdmin.updateUser(firebaseUser.uid, {
            disabled: false,
            password: temporaryPasscode,
        });
        await authAdmin.revokeRefreshTokens(firebaseUser.uid);
    } catch (error) {
        try {
            await firestoreAdmin.runTransaction(async (transaction) => {
                const freshTargetDoc = await transaction.get(targetDoc.ref);
                if (!freshTargetDoc.exists) return;
                const pending = freshTargetDoc.data()?.passcodeResetPending;
                if (!isStaffUnknownRecord(pending) || pending.operationId !== passcodeResetOperationId) return;
                transaction.update(targetDoc.ref, {
                    passcodeResetPending: admin.firestore.FieldValue.delete(),
                });
            });
        } catch {
            logStaffDiagnostic("staff_passcode_reset_pending_cleanup_failed", {
                ...getBoundedStaffStringContext("tenantId", input.tenantId),
                ...getBoundedStaffStringContext("storeId", input.storeId),
                ...getBoundedStaffStringContext("userId", targetUserId),
                hasOperationId: Boolean(passcodeResetOperationId),
            });
        }
        throw error;
    }
    const finalizedResetData = sanitizeFirestoreValue({
        authDisabled: false,
        authTokensRevokedAt: now,
        isVerified: true,
        loginUsername,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        passcodeResetAt: now,
        passcodeResetBy: actorId,
        passwordResetRequestedAt: now,
        passwordResetRequestedBy: actorId,
        sessionRevokedAt: now,
        sessionRevokedBy: actorId,
        sessionRevokedByEmail: session?.user?.email,
        sessionRevokedReason: "staff_passcode_reset",
        staffLoginId: loginId,
    });
    finalizedResetData.passcodeResetPending = admin.firestore.FieldValue.delete();
    let resetAuditFinalized = true;
    try {
        await firestoreAdmin.runTransaction(async (transaction) => {
            const freshTargetDoc = await transaction.get(targetDoc.ref);
            if (!freshTargetDoc.exists) throw new StaffPasscodeResetScopeConflictError();
            const pending = freshTargetDoc.data()?.passcodeResetPending;
            if (!isStaffUnknownRecord(pending) || pending.operationId !== passcodeResetOperationId) {
                throw new StaffPasscodeResetScopeConflictError();
            }
            transaction.update(targetDoc.ref, finalizedResetData);
        });
    } catch {
        resetAuditFinalized = false;
        logStaffDiagnostic("staff_passcode_reset_audit_finalize_failed", {
            ...getBoundedStaffStringContext("tenantId", input.tenantId),
            ...getBoundedStaffStringContext("storeId", input.storeId),
            ...getBoundedStaffStringContext("userId", targetUserId),
            hasOperationId: Boolean(passcodeResetOperationId),
        });
    }

    logStaffDiagnostic("staff_owner_passcode_reset", {
        ...getBoundedStaffStringContext("tenantId", input.tenantId),
        ...getBoundedStaffStringContext("storeId", input.storeId),
        ...getBoundedStaffStringContext("userId", targetUserId),
    });

    const updatedSnapshot = resetAuditFinalized ? await targetDoc.ref.get() : null;
    const updatedStaffData = updatedSnapshot?.data() || {
        ...existingData,
        ...finalizedResetData,
        passcodeResetPending: {
            leaseExpiresAt: passcodeResetLeaseExpiresAt,
            operationId: passcodeResetOperationId,
            requestedAt: now,
            requestedBy: actorId,
        },
    };

    return NextResponse.json({
        success: true,
        message: "Temporary staff passcode created.",
        mode: "user_updated",
        staffAuthMode: getStaffAuthMode(existingData),
        staffLoginId: loginId,
        temporaryPasscode,
        user: sanitizeStaffUserForAuthority(targetUserId, updatedStaffData, authority),
        userId: targetUserId,
    } satisfies StaffMutationResponse);
};

export const forceSignOutStaffUser = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "AUTH_SENSITIVE", "staff-force-signout");
    if (rateLimit) return rateLimit;

    const bodyResult = await readStaffMutationBody(request);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = validateAPIInput(ForceSignOutStaffSchema, bodyResult.data);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Force Signout", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as ForceSignOutStaffInput;
    const targetUserId = normalizeStaffUserId(input.userId);
    if (!targetUserId) {
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const authority = await getAuthority(session, input.tenantId, [input.storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Force Signout", session, request, {
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: targetUserId,
        }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    try {
        ensureNotSelfDestructive(session, targetUserId);
    } catch (error: any) {
        if (error?.message === "SELF_UPDATE_BLOCKED") {
            return jsonError("You cannot sign yourself out from here.", 409, "SELF_UPDATE_BLOCKED");
        }
        throw error;
    }

    const targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(targetUserId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (normalizeStaffScopeNumericId(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Force Signout Tenant Mismatch", session, request, {
            requestedTenantId: input.tenantId,
            targetTenantId: existingData.tenantId,
            userId: targetUserId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const currentStores = normalizePersistedStaffStoreMappings(existingData.stores);
    const hasStoreAccess = currentStores.some((store) => store.storeId === input.storeId);
    if (!hasStoreAccess || existingData.deleted === true) {
        return jsonError("Staff member is not assigned to this store", 404, "STORE_MAPPING_NOT_FOUND");
    }
    if (existingData.active === false) {
        return jsonError("This staff member is already deactivated.", 409, "STAFF_INACTIVE");
    }
    const ownerTargetError = ownerTargetMutationError(
        authority,
        existingData,
        session,
        request,
        "staff_force_signout",
    );
    if (ownerTargetError) return ownerTargetError;

    const now = admin.firestore.Timestamp.now();
    let mutationResult;
    try {
        mutationResult = await runStaffUserMutationTransaction({
            buildUpdate: ({ currentData }) => {
                assertOwnerTargetMutationAllowed(authority, currentData);
                const freshMappings = normalizePersistedStaffStoreMappings(currentData.stores);
                if (!freshMappings.some((store) => store.storeId === input.storeId)) {
                    throw new StaffConcurrencyError("STORE_MAPPING_NOT_FOUND");
                }
                if (currentData.deleted === true || currentData.active === false) {
                    throw new StaffConcurrencyError("FORBIDDEN");
                }
                return sanitizeFirestoreValue({
                    modifiedBy: session?.user?.email,
                    modifiedOn: now,
                    ...buildSessionRevocationFields(session, now, "owner_force_signout"),
                });
            },
            db: firestoreAdmin,
            mutation: { kind: "replace" },
            tenantId: input.tenantId,
            userId: targetUserId,
        });
    } catch (error) {
        const response = staffConcurrencyErrorResponse(error);
        if (response) return response;
        throw error;
    }

    await revokeStaffFirebaseRefreshTokensAfterCommit(mutationResult.currentData, {
        action: "staff-force-signout",
        reason: "owner_force_signout",
        tenantId: input.tenantId,
        storeId: input.storeId,
        userId: targetUserId,
    });

    logStaffDiagnostic("staff_owner_forced_session_signout", {
        ...getBoundedStaffStringContext("tenantId", input.tenantId),
        ...getBoundedStaffStringContext("storeId", input.storeId),
        ...getBoundedStaffStringContext("userId", targetUserId),
    });

    return NextResponse.json({
        success: true,
        message: "Staff member signed out.",
        mode: "session_revoked",
        user: sanitizeStaffUserForAuthority(targetUserId, mutationResult.updatedData, authority),
        userId: targetUserId,
    } satisfies StaffMutationResponse);
};

const getRoleEditAuthority = async (
    request: NextRequest,
    session: any,
    tenantId: number,
    storeId: number,
) => {
    const authority = await getAuthority(session, tenantId, [storeId]);
    if (!authority?.canAssignRoles) {
        logSecurity("Authorization Failed - Role Management", session, request, {
            tenantId,
            storeId,
        }, "high");
        return null;
    }
    return authority;
};

export const saveRoleDefinition = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "DATA_WRITE", "staff-role-save");
    if (rateLimit) return rateLimit;

    const bodyResult = await readStaffMutationBody(request);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = validateAPIInput(SaveRoleSchema, bodyResult.data);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Role Save", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as SaveRoleInput;
    const authority = await getRoleEditAuthority(request, session, input.tenantId, input.storeId);
    if (!authority) return jsonError("Forbidden", 403, "FORBIDDEN");

    const storeScope = normalizeStaffStoreScopeDocumentId(input.storeId);
    if (!storeScope) return jsonError("Invalid input", 400, "INVALID_INPUT");

    const roleId = input.role.id || generateCustomRoleId();

    if (roleId === DEFAULT_ROLE_IDS.OWNER) {
        return jsonError("Owner role is locked", 409, "OWNER_ROLE_LOCKED");
    }

    const actorEmail = session?.user?.email || "system";
    const now = new Date().toISOString();
    let response: RoleMutationResponse;
    try {
        response = await runStaffRoleMutationTransaction({
            actorEmail,
            buildResult: (roles) => {
                const existingIndex = input.role.id ? roles.findIndex((role) => role.id === input.role.id) : -1;
                const existingRole = existingIndex >= 0 ? roles[existingIndex] : null;
                const nextRole: StoreRoleDataType = {
                    active: input.role.active ?? existingRole?.active ?? true,
                    createdBy: existingRole?.createdBy || actorEmail,
                    createdOn: existingRole?.createdOn || now,
                    description: input.role.description || "",
                    id: roleId,
                    modifiedBy: actorEmail,
                    modifiedOn: now,
                    name: input.role.name,
                    permissions: input.role.permissions as Record<PermissionKey, boolean>,
                };
                if (existingIndex >= 0) roles[existingIndex] = nextRole;
                else roles.push(nextRole);
                return {
                    result: { role: nextRole, roles, success: true },
                    roles,
                };
            },
            db: firestoreAdmin,
            deactivatingRoleId: input.role.active === false ? roleId : undefined,
            modifiedOn: admin.firestore.Timestamp.now(),
            storeId: input.storeId,
            tenantId: input.tenantId,
        });
    } catch (error) {
        const errorResponse = staffConcurrencyErrorResponse(error);
        if (errorResponse) return errorResponse;
        throw error;
    }

    return NextResponse.json(response);
};

export const deleteRoleDefinition = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "DATA_WRITE", "staff-role-delete");
    if (rateLimit) return rateLimit;

    const validation = validateAPIInput(DeleteRoleSchema, {
        roleId: request.nextUrl.searchParams.get("roleId"),
        storeId: normalizeStaffScopeNumericId(request.nextUrl.searchParams.get("storeId")),
        tenantId: normalizeStaffScopeNumericId(request.nextUrl.searchParams.get("tenantId")),
    });
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Role Delete", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as DeleteRoleInput;
    const authority = await getRoleEditAuthority(request, session, input.tenantId, input.storeId);
    if (!authority) return jsonError("Forbidden", 403, "FORBIDDEN");

    const storeScope = normalizeStaffStoreScopeDocumentId(input.storeId);
    if (!storeScope) return jsonError("Invalid input", 400, "INVALID_INPUT");

    if (input.roleId === DEFAULT_ROLE_IDS.OWNER) {
        return jsonError("Owner role is locked", 409, "OWNER_ROLE_LOCKED");
    }

    const actorEmail = session?.user?.email || "system";
    const now = new Date().toISOString();
    let roles: StoreRoleDataType[];
    try {
        roles = await runStaffRoleMutationTransaction({
            actorEmail,
            buildResult: (currentRoles) => {
                const nextRoles = currentRoles.map((role) => (
                    role.id === input.roleId
                        ? {
                            ...role,
                            active: false,
                            modifiedBy: actorEmail,
                            modifiedOn: now,
                        }
                        : role
                ));
                return { result: nextRoles, roles: nextRoles };
            },
            db: firestoreAdmin,
            deactivatingRoleId: input.roleId,
            modifiedOn: admin.firestore.Timestamp.now(),
            storeId: input.storeId,
            tenantId: input.tenantId,
        });
    } catch (error) {
        const errorResponse = staffConcurrencyErrorResponse(error);
        if (errorResponse) return errorResponse;
        throw error;
    }

    return NextResponse.json({
        roles,
        success: true,
    } satisfies RoleMutationResponse);
};
