import { DB_COLLECTIONS } from "@constant/database";
import { ALL_PERMISSIONS, PERMISSIONS, PermissionKey } from "@constant/permissions";
import { STAFF_EMAIL_DOMAIN } from "@constant/urls";
import { ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { createDefaultRoles, DEFAULT_ROLE_IDS, DEFAULT_ROLE_METADATA, generateCustomRoleId } from "@data/shared/defaultRoles";
import { formatStaffLoginId, getDisplayEmail, isInternalAuthEmail, normalizeStaffLoginUsername } from "@lib/auth/loginIdentifiers";
import { authAdmin, firestoreAdmin, admin } from "@lib/firebase/firebaseAdmin";
import { hasPermission, normalizeRolePermissions } from "@lib/permissions/hasPermission";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { logger } from "@lib/monitoring/logger";
import type { StoreRoleDataType } from "@type/platform/roles";
import type { StoreDataType } from "@type/platform/store";
import type { UserStoreMappingType } from "@type/platform/user";
import { randomBytes } from "crypto";
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

const USERS_COLLECTION = DB_COLLECTIONS.USERS;
const STORES_COLLECTION = DB_COLLECTIONS.STORES;
const STAFF_AUTH_MODE_EMAIL = "email";
const STAFF_AUTH_MODE_OWNER_PASSCODE = "owner_passcode";
const STAFF_LOGIN_ID_PREFIX = "88";

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

const StoreMappingSchema = z.object({
    storeId: z.number().int().positive(),
    name: z.string().trim().max(160).optional(),
    role: z.string().trim().min(1).max(120).optional(),
});

export const CreateStaffSchema = z.object({
    email: optionalEmailSchema,
    name: optionalTrimmedStringSchema(160),
    tenantId: z.number().int().positive(),
    storeId: z.number().int().positive(),
    storeName: optionalTrimmedStringSchema(160),
    role: optionalTrimmedStringSchema(120),
    countryCode: optionalTrimmedStringSchema(8),
    dialCode: optionalTrimmedStringSchema(8),
    phoneNumber: optionalTrimmedStringSchema(32),
});

export const UpdateStaffSchema = z.object({
    userId: z.string().trim().min(1).max(160),
    tenantId: z.number().int().positive(),
    name: optionalTrimmedStringSchema(160),
    active: z.boolean().optional(),
    storeId: z.number().int().positive().optional(),
    stores: z.array(StoreMappingSchema).min(1).max(25).optional(),
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
    userId: z.string().trim().min(1).max(160),
    tenantId: z.number().int().positive(),
    storeId: z.number().int().positive(),
});

export const ResetStaffPasswordSchema = z.object({
    userId: z.string().trim().min(1).max(160),
    tenantId: z.number().int().positive(),
    storeId: z.number().int().positive(),
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
    storeId: z.number().int().positive(),
    tenantId: z.number().int().positive(),
});

export const DeleteRoleSchema = z.object({
    roleId: z.string().trim().min(1).max(120),
    storeId: z.number().int().positive(),
    tenantId: z.number().int().positive(),
});

const isPlatformSession = (session: any) => (
    session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
    || session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
);

const getRequestIp = (request: NextRequest) => (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"
);

const getSessionTenantId = (session: any) => Number(session?.tId ?? session?.user?.tenantId);
const getSessionStoreId = (session: any) => Number(session?.sId ?? session?.user?.storeId);

const isPositiveId = (value: unknown): value is number => (
    Number.isSafeInteger(Number(value)) && Number(value) > 0
);

const jsonError = (
    error: string,
    status: number,
    code?: string,
) => NextResponse.json({ error, code }, { status });

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
            logger.warn("[staff] Firebase Auth user missing during staff access sync", {
                ...context,
                disabled,
            });
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
            logger.warn("[staff] Firebase Auth user missing during staff token revocation", context);
            return false;
        }

        throw error;
    }
};

const buildSessionRevocationFields = (
    session: any,
    now: admin.firestore.Timestamp,
    reason: string,
) => sanitizeFirestoreValue({
    authTokensRevokedAt: now,
    sessionRevokedAt: now,
    sessionRevokedBy: session?.uId || session?.user?.id,
    sessionRevokedByEmail: session?.user?.email,
    sessionRevokedReason: reason,
});

const revokeStaffSessions = async (
    data: any,
    session: any,
    now: admin.firestore.Timestamp,
    reason: string,
    context: Record<string, unknown>,
) => {
    await revokeStaffFirebaseRefreshTokens(data, {
        ...context,
        reason,
    });

    return buildSessionRevocationFields(session, now, reason);
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

const sanitizeStaffUser = (id: string, data: any): StaffUserSummary => {
    const stores = Array.isArray(data?.stores)
        ? data.stores
            .filter((store: any) => isPositiveId(store?.storeId))
            .map((store: any) => ({
                storeId: Number(store.storeId),
                name: String(store.name || ""),
                role: String(store.role || ""),
            }))
        : [];

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
        phoneNumber: data?.phoneNumber || "",
        phoneUsername: data?.phoneUsername || "",
        platformRole: data?.platformRole || "USER",
        profileImage: data?.profileImage || data?.image || "",
        role: data?.role || "",
        sessionRevokedAt: serializeStaffTimestamp(data?.sessionRevokedAt),
        staffAuthMode: getStaffAuthMode(data),
        staffLoginId: resolveStaffLoginDisplayId(data?.staffLoginId || data?.loginUsername),
        storeId: Number(data?.storeId) || stores[0]?.storeId,
        storeIds: Array.isArray(data?.storeIds)
            ? data.storeIds.filter(isPositiveId).map(Number)
            : stores.map((store) => store.storeId),
        stores,
        tenantId: Number(data?.tenantId),
    };
};

const sanitizeStoreOption = (store: StoreDataType): StaffStoreOption => ({
    active: store?.active !== false,
    isMaster: store?.isMaster === true,
    name: store?.name || `Store ${store?.storeId}`,
    roles: (store?.roles || []).map((role: StoreRoleDataType) => ({
        active: role.active !== false,
        description: role.description,
        id: role.id,
        name: role.name,
    })),
    storeId: Number(store?.storeId),
    tenantId: Number(store?.tenantId),
});

const fetchStoreById = async (storeId: number): Promise<StoreDataType | null> => {
    const snapshot = await firestoreAdmin.collection(STORES_COLLECTION).doc(String(storeId)).get();
    return snapshot.exists ? snapshot.data() as StoreDataType : null;
};

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
        .get();

    return snapshot.docs.map((doc) => doc.data() as StoreDataType);
};

const DEFAULT_ROLE_ID_VALUES = Object.values(DEFAULT_ROLE_IDS);

const ensureDefaultRolesForStore = async (
    store: StoreDataType,
    actorEmail?: string,
) => {
    const currentRoles = Array.isArray(store?.roles) ? store.roles : [];
    let changed = false;
    const normalizedCurrentRoles = currentRoles.map((role) => {
        const defaultMetadata = DEFAULT_ROLE_METADATA[role?.id as keyof typeof DEFAULT_ROLE_METADATA];
        if (!defaultMetadata) return role;

        const normalizedPermissions = normalizeRolePermissions(role.permissions, defaultMetadata.permissions);
        const hasPermissionDrift = ALL_PERMISSIONS.some((permission) => (
            role.permissions?.[permission] !== normalizedPermissions[permission]
        ));

        if (!hasPermissionDrift) return role;
        changed = true;
        return {
            ...role,
            permissions: normalizedPermissions,
        };
    });
    const existingRoleIds = new Set(normalizedCurrentRoles.map((role) => role?.id).filter(Boolean));
    const missingDefaults = DEFAULT_ROLE_ID_VALUES.filter((roleId) => !existingRoleIds.has(roleId));
    if (!missingDefaults.length && !changed) return store;

    const defaultRoles = createDefaultRoles(Number(store.storeId), actorEmail || "system")
        .filter((role) => missingDefaults.includes(role.id as typeof DEFAULT_ROLE_ID_VALUES[number]));
    const nextRoles = [...normalizedCurrentRoles, ...defaultRoles];

    await firestoreAdmin.collection(STORES_COLLECTION).doc(String(store.storeId)).update(sanitizeFirestoreValue({
        modifiedBy: actorEmail || "system",
        modifiedOn: admin.firestore.Timestamp.now(),
        roles: nextRoles,
    }));

    logger.info("[staff] Backfilled missing default roles for store", {
        missingDefaults,
        normalizedDefaultRoles: changed,
        storeId: store.storeId,
        tenantId: store.tenantId,
    });

    return {
        ...store,
        roles: nextRoles,
    };
};

const getAuthority = async (session: any, tenantId: number, targetStoreIds: number[]) => {
    const sessionTenantId = getSessionTenantId(session);
    const sessionStoreId = getSessionStoreId(session);

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
    if (!authorityStore || Number(authorityStore.tenantId) !== tenantId) {
        return null;
    }

    const roleId = session?.user?.stores?.find((store: any) => Number(store?.storeId) === sessionStoreId)?.role
        || session?.role
        || session?.user?.role;

    const targetIsOwnStoreOnly = targetStoreIds.every((storeId) => Number(storeId) === sessionStoreId);
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

const logSecurity = (
    event: string,
    session: any,
    request: NextRequest,
    details: Record<string, unknown>,
    severity: "low" | "medium" | "high" | "critical" = "high",
) => {
    logger.security(event, {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        ...details,
    }, severity);
};

const validateStoreMappings = async (
    mappings: StaffStoreMappingInput[],
    tenantId: number,
) => {
    const normalized = mappings.map((mapping) => ({
        storeId: Number(mapping.storeId),
        name: mapping.name || "",
        role: mapping.role || DEFAULT_ROLE_IDS.STAFF,
    }));

    const duplicateStoreIds = normalized
        .map((mapping) => mapping.storeId)
        .filter((storeId, index, list) => list.indexOf(storeId) !== index);
    if (duplicateStoreIds.length) {
        throw new Error("DUPLICATE_STORE_MAPPING");
    }

    const storeMap = await fetchStoresByIds(normalized.map((mapping) => mapping.storeId));

    for (const mapping of normalized) {
        let store = storeMap.get(mapping.storeId);
        if (!store || Number(store.tenantId) !== tenantId) {
            throw new Error("STORE_NOT_FOUND");
        }

        const roleExists = (store.roles || []).some((item: StoreRoleDataType) => item.id === mapping.role && item.active !== false);
        if (!roleExists && DEFAULT_ROLE_ID_VALUES.includes(mapping.role as typeof DEFAULT_ROLE_ID_VALUES[number])) {
            store = await ensureDefaultRolesForStore(store, "system");
            storeMap.set(mapping.storeId, store);
        }

        const role = (store.roles || []).find((item: StoreRoleDataType) => item.id === mapping.role && item.active !== false);
        if (!role) {
            throw new Error("ROLE_NOT_FOUND");
        }

        mapping.name = mapping.name || store.name || `Store ${mapping.storeId}`;
    }

    return normalized as UserStoreMappingType[];
};

const roleOrStoreMappingsChanged = (currentStores: UserStoreMappingType[], nextStores: UserStoreMappingType[]) => {
    const normalize = (stores: UserStoreMappingType[]) => stores
        .map((store) => ({
            storeId: Number(store.storeId),
            role: store.role || "",
        }))
        .sort((a, b) => a.storeId - b.storeId);

    return JSON.stringify(normalize(currentStores || [])) !== JSON.stringify(normalize(nextStores || []));
};

const getUsersForTenant = async (tenantId: number) => {
    const snapshot = await firestoreAdmin
        .collection(USERS_COLLECTION)
        .where("tenantId", "==", tenantId)
        .get();

    return snapshot.docs;
};

const ensureAnotherActiveOwner = async (
    tenantId: number,
    storeId: number,
    targetUserId: string,
) => {
    const docs = await getUsersForTenant(tenantId);
    const hasOtherOwner = docs.some((doc) => {
        if (doc.id === targetUserId) return false;
        const data = doc.data();
        if (data?.active === false || data?.deleted === true) return false;
        return (Array.isArray(data?.stores) ? data.stores : []).some((store: any) => (
            Number(store?.storeId) === storeId && store?.role === DEFAULT_ROLE_IDS.OWNER
        ));
    });

    if (!hasOtherOwner) {
        throw new Error("LAST_OWNER");
    }
};

const ensureNotSelfDestructive = (session: any, targetUserId: string) => {
    if (!isPlatformSession(session) && targetUserId && session?.uId === targetUserId) {
        throw new Error("SELF_UPDATE_BLOCKED");
    }
};

const roleIsAssignedToActiveUser = async (tenantId: number, storeId: number, roleId: string) => {
    const docs = await getUsersForTenant(tenantId);
    return docs.some((doc) => {
        const data = doc.data();
        if (data?.active === false || data?.deleted === true) return false;
        return (Array.isArray(data?.stores) ? data.stores : []).some((store: any) => (
            Number(store?.storeId) === storeId && store?.role === roleId
        ));
    });
};

const applyRateLimit = async (
    request: NextRequest,
    session: any,
    feature: "DATA_READ" | "DATA_WRITE" | "AUTH_SENSITIVE",
    keyPrefix: string,
) => {
    const config = getRateLimitForFeature(feature);
    const key = `${keyPrefix}:${session?.uId || session?.user?.id || getRequestIp(request)}`;
    const result = await checkRateLimit({ key, ...config });
    if (result.allowed) return null;

    logger.security("Rate Limit Exceeded", {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        feature,
    }, "medium");

    return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 },
    );
};

const sendFirebasePasswordResetEmail = async (email: string) => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
        return { ok: false, error: "FIREBASE_API_KEY_MISSING" };
    }

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
        body: JSON.stringify({
            email,
            requestType: "PASSWORD_RESET",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    });

    if (response.ok) return { ok: true };

    const data = await response.json().catch(() => ({}));
    return {
        ok: false,
        error: data?.error?.message || "PASSWORD_RESET_EMAIL_FAILED",
    };
};

export const listStaffUsers = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "DATA_READ", "staff-read");
    if (rateLimit) return rateLimit;

    const tenantId = Number(request.nextUrl.searchParams.get("tenantId"));
    const storeId = Number(request.nextUrl.searchParams.get("storeId"));

    if (!isPositiveId(tenantId) || !isPositiveId(storeId)) {
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const authority = await getAuthority(session, tenantId, [storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff List", session, request, { tenantId, storeId }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const docs = await getUsersForTenant(tenantId);
    const rawStoreOptionDocs = authority.isMaster
        ? await fetchStoresForTenant(tenantId)
        : [await fetchStoreById(storeId)].filter(Boolean) as StoreDataType[];
    const storeOptionDocs = await Promise.all(rawStoreOptionDocs
        .filter((store): store is StoreDataType => Boolean(store && Number(store.tenantId) === tenantId))
        .map((store) => ensureDefaultRolesForStore(store, session?.user?.email)));
    const stores = storeOptionDocs
        .map(sanitizeStoreOption)
        .sort((a, b) => a.name.localeCompare(b.name));
    const users = docs
        .map((doc) => sanitizeStaffUser(doc.id, doc.data()))
        .filter((user) => user.deleted !== true)
        .filter((user) => user.storeIds?.includes(storeId) || user.stores?.some((store) => Number(store.storeId) === storeId))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

    return NextResponse.json({ stores, users });
};

export const createStaffUser = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "AUTH_SENSITIVE", "staff-create");
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const validation = validateAPIInput(CreateStaffSchema, body);
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
        return jsonError("Invalid store or role", 400, error.message);
    }

    const hasStaffEmail = Boolean(input.email);
    const existingUserQuery = hasStaffEmail
        ? await firestoreAdmin
            .collection(USERS_COLLECTION)
            .where("email", "==", input.email)
            .limit(1)
            .get()
        : null;

    const now = admin.firestore.Timestamp.now();

    if (existingUserQuery && !existingUserQuery.empty) {
        const existingDoc = existingUserQuery.docs[0];
        const existingData = existingDoc.data();

        if (Number(existingData.tenantId) !== input.tenantId) {
            return jsonError(
                "This email is registered with another business. Staff can only belong to one business.",
                409,
                "EMAIL_OTHER_TENANT",
            );
        }
        if (isPlatformEntityBlocked(existingData)) {
            return jsonError("This staff member is blocked by MenuList support.", 403, "ACCOUNT_BLOCKED");
        }

        const currentStores: UserStoreMappingType[] = Array.isArray(existingData.stores) ? existingData.stores : [];
        const alreadyHasStore = currentStores.some((store) => Number(store.storeId) === input.storeId);
        if (alreadyHasStore) {
            return jsonError("This user is already assigned to this store", 409, "ALREADY_ASSIGNED");
        }

        const nextStores = [...currentStores, stores[0]];
        const nextStoreIds = Array.from(new Set(nextStores.map((store) => Number(store.storeId))));

        await syncStaffFirebaseAuthDisabledState(existingData, false, {
            action: "staff-reactivate-on-store-add",
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: existingDoc.id,
        });

        await existingDoc.ref.update(sanitizeFirestoreValue({
            active: true,
            authDisabled: false,
            deleted: false,
            deletedAt: null,
            modifiedBy: session?.user?.email,
            modifiedOn: now,
            storeId: existingData.storeId || input.storeId,
            storeIds: nextStoreIds,
            stores: nextStores,
        }));

        const updated = sanitizeStaffUser(existingDoc.id, {
            ...existingData,
            active: true,
            authDisabled: false,
            deleted: false,
            deletedAt: null,
            storeId: existingData.storeId || input.storeId,
            storeIds: nextStoreIds,
            stores: nextStores,
        });

        logger.info("[staff] Existing user added to store", {
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: existingDoc.id,
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
            try {
                const existingAuthUser = await authAdmin.getUserByEmail(loginEmail);
                firebaseUid = existingAuthUser.uid;
            } catch {
                return jsonError("This email is already registered in the auth system", 409, "EMAIL_EXISTS");
            }
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

    const docRef = await firestoreAdmin.collection(USERS_COLLECTION).add(newUserDoc);

    let passwordResetEmail: { ok: boolean; error?: string } = { ok: false };
    if (hasStaffEmail) {
        passwordResetEmail = await sendFirebasePasswordResetEmail(loginEmail);
        if (passwordResetEmail.ok) {
            await docRef.update(sanitizeFirestoreValue({
                passwordResetEmailSentAt: now,
                passwordResetRequestedAt: now,
                passwordResetRequestedBy: session?.uId || session?.user?.id,
            }));
        } else {
            logger.warn("[staff] Password setup email failed", {
                error: passwordResetEmail.error,
                tenantId: input.tenantId,
                storeId: input.storeId,
                userId: docRef.id,
            });
        }
    }

    logger.info("[staff] New staff user created", {
        authMode,
        tenantId: input.tenantId,
        storeId: input.storeId,
        userId: docRef.id,
    });

    const response: StaffMutationResponse = {
        success: true,
        email: loginEmail,
        message: hasStaffEmail
            ? "Staff user created. They can set their password via the login page."
            : "Staff user created. Share the staff ID and temporary passcode with them.",
        mode: "new_user_created",
        passwordResetEmailError: hasStaffEmail && !passwordResetEmail.ok ? passwordResetEmail.error : undefined,
        passwordResetEmailSent: hasStaffEmail ? passwordResetEmail.ok : false,
        staffAuthMode: authMode,
        staffLoginId,
        temporaryPasscode: tempPasscode || undefined,
        user: sanitizeStaffUser(docRef.id, newUserDoc),
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

    const body = await request.json();
    const validation = validateAPIInput(UpdateStaffSchema, body);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Update", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as UpdateStaffInput;

    let targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(input.userId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (Number(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Tenant Mismatch", session, request, {
            targetTenantId: existingData.tenantId,
            requestedTenantId: input.tenantId,
            userId: input.userId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const currentStores = Array.isArray(existingData.stores) ? existingData.stores : [];
    let nextStores: UserStoreMappingType[];
    try {
        nextStores = input.stores
            ? await validateStoreMappings(input.stores, input.tenantId)
            : currentStores;
    } catch (error: any) {
        return jsonError("Invalid store or role", 400, error.message);
    }

    if (input.storeId && !nextStores.some((store) => Number(store.storeId) === input.storeId)) {
        return jsonError("Default store must be assigned to this staff member", 400, "STORE_MAPPING_REQUIRED");
    }

    const targetStoreIds = Array.from(new Set([
        ...(currentStores || []).map((store: any) => Number(store.storeId)).filter(isPositiveId),
        ...(nextStores || []).map((store: any) => Number(store.storeId)).filter(isPositiveId),
        ...(input.storeId ? [input.storeId] : []),
    ]));

    const authority = await getAuthority(session, input.tenantId, targetStoreIds.length ? targetStoreIds : [Number(existingData.storeId)]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Update", session, request, {
            tenantId: input.tenantId,
            userId: input.userId,
        }, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const mappingsChanged = input.stores ? roleOrStoreMappingsChanged(currentStores, nextStores) : false;
    if (mappingsChanged && !authority.canAssignRoles) {
        logSecurity("Authorization Failed - Staff Mapping Update", session, request, {
            tenantId: input.tenantId,
            userId: input.userId,
        }, "high");
        return jsonError("You do not have permission to change store or role assignments", 403, "ROLE_ASSIGNMENT_FORBIDDEN");
    }

    try {
        if (input.active === false || mappingsChanged) {
            ensureNotSelfDestructive(session, input.userId);
        }

        if (input.active === false || mappingsChanged) {
            const currentOwnerStoreIds = currentStores
                .filter((store: any) => store?.role === DEFAULT_ROLE_IDS.OWNER)
                .map((store: any) => Number(store.storeId))
                .filter(isPositiveId);
            const nextOwnerStoreIds = nextStores
                .filter((store: any) => store?.role === DEFAULT_ROLE_IDS.OWNER)
                .map((store: any) => Number(store.storeId))
                .filter(isPositiveId);

            for (const storeId of currentOwnerStoreIds) {
                if (input.active === false || !nextOwnerStoreIds.includes(storeId)) {
                    await ensureAnotherActiveOwner(input.tenantId, storeId, input.userId);
                }
            }
        }
    } catch (error: any) {
        if (error?.message === "SELF_UPDATE_BLOCKED") {
            return jsonError("You cannot remove or deactivate your own access.", 409, "SELF_UPDATE_BLOCKED");
        }
        if (error?.message === "LAST_OWNER") {
            return jsonError("Add another Owner before removing this access.", 409, "LAST_OWNER");
        }
        throw error;
    }

    const nextStoreIds = nextStores.map((store) => Number(store.storeId));
    const nextDefaultStoreId = input.storeId && nextStoreIds.includes(input.storeId)
        ? input.storeId
        : nextStoreIds[0] || existingData.storeId;

    const now = admin.firestore.Timestamp.now();
    const sessionRevocationFields = input.active === false
        ? await revokeStaffSessions(existingData, session, now, "staff_deactivated", {
            action: "staff-active-toggle",
            tenantId: input.tenantId,
            userId: input.userId,
        })
        : {};
    const shouldNormalizePhone = input.phoneNumber !== undefined || input.dialCode !== undefined || input.countryCode !== undefined;
    const normalizedPhone = shouldNormalizePhone
        ? normalizePhoneNumberForStorage({
            countryCode: input.countryCode ?? existingData.countryCode,
            dialCode: input.dialCode ?? existingData.dialCode,
            phoneNumber: input.phoneNumber ?? existingData.phoneNumber,
        })
        : null;
    const updateData = sanitizeFirestoreValue({
        active: input.active,
        alternatePhoneNumber: input.alternatePhoneNumber,
        authDisabled: input.active === undefined ? undefined : input.active === false || isPlatformEntityBlocked(existingData),
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
        stores: input.stores ? nextStores : undefined,
        ...sessionRevocationFields,
    });

    if (input.active !== undefined) {
        await syncStaffFirebaseAuthDisabledState(existingData, input.active === false || isPlatformEntityBlocked(existingData), {
            action: "staff-active-toggle",
            tenantId: input.tenantId,
            userId: input.userId,
        });
    }

    await targetDoc.ref.update(updateData);

    targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(input.userId).get();
    const response: StaffMutationResponse = {
        success: true,
        mode: "user_updated",
        user: sanitizeStaffUser(input.userId, targetDoc.data()),
        userId: input.userId,
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
        tenantId: Number(request.nextUrl.searchParams.get("tenantId")),
        storeId: Number(request.nextUrl.searchParams.get("storeId")),
        userId: request.nextUrl.searchParams.get("userId"),
    });

    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Remove", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as RemoveStaffInput;
    const authority = await getAuthority(session, input.tenantId, [input.storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Remove", session, request, input, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    try {
        ensureNotSelfDestructive(session, input.userId);
    } catch (error: any) {
        if (error?.message === "SELF_UPDATE_BLOCKED") {
            return jsonError("You cannot remove your own access.", 409, "SELF_UPDATE_BLOCKED");
        }
        throw error;
    }

    const targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(input.userId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (Number(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Remove Tenant Mismatch", session, request, {
            requestedTenantId: input.tenantId,
            targetTenantId: existingData.tenantId,
            userId: input.userId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const currentStores: UserStoreMappingType[] = Array.isArray(existingData.stores) ? existingData.stores : [];
    const currentMapping = currentStores.find((store) => Number(store.storeId) === input.storeId);
    if (!currentMapping) {
        return jsonError("Staff member is not assigned to this store", 404, "STORE_MAPPING_NOT_FOUND");
    }

    if (currentMapping.role === DEFAULT_ROLE_IDS.OWNER) {
        try {
            await ensureAnotherActiveOwner(input.tenantId, input.storeId, input.userId);
        } catch (error: any) {
            if (error?.message === "LAST_OWNER") {
                return jsonError("Add another Owner before removing this access.", 409, "LAST_OWNER");
            }
            throw error;
        }
    }

    const nextStores = currentStores.filter((store) => Number(store.storeId) !== input.storeId);
    const nextStoreIds = nextStores.map((store) => Number(store.storeId));
    const shouldDeactivate = nextStores.length === 0;
    const now = admin.firestore.Timestamp.now();
    const sessionRevocationFields = shouldDeactivate
        ? await revokeStaffSessions(existingData, session, now, "staff_removed_from_last_store", {
            action: "staff-remove-last-store",
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: input.userId,
        })
        : {};

    const updateData = sanitizeFirestoreValue({
        active: shouldDeactivate ? false : existingData.active,
        authDisabled: shouldDeactivate ? true : existingData.authDisabled,
        deleted: shouldDeactivate ? true : existingData.deleted === true ? false : existingData.deleted,
        deletedAt: shouldDeactivate ? now : existingData.deletedAt ?? null,
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        storeId: shouldDeactivate ? input.storeId : (nextStoreIds.includes(Number(existingData.storeId)) ? existingData.storeId : nextStoreIds[0]),
        storeIds: nextStoreIds,
        stores: nextStores,
        ...sessionRevocationFields,
    });

    if (shouldDeactivate) {
        await syncStaffFirebaseAuthDisabledState(existingData, true, {
            action: "staff-remove-last-store",
            tenantId: input.tenantId,
            storeId: input.storeId,
            userId: input.userId,
        });
    }

    await targetDoc.ref.update(updateData);

    const updatedSnapshot = await firestoreAdmin.collection(USERS_COLLECTION).doc(input.userId).get();
    const response: StaffMutationResponse = {
        success: true,
        mode: shouldDeactivate ? "user_deactivated" : "store_mapping_removed",
        user: sanitizeStaffUser(input.userId, updatedSnapshot.data()),
        userId: input.userId,
    };

    return NextResponse.json(response);
};

export const requestStaffPasswordReset = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "AUTH_SENSITIVE", "staff-password-reset");
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const validation = validateAPIInput(ResetStaffPasswordSchema, body);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Password Reset", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as ResetStaffPasswordInput;
    const authority = await getAuthority(session, input.tenantId, [input.storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Password Reset", session, request, input, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(input.userId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (Number(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Password Reset Tenant Mismatch", session, request, {
            requestedTenantId: input.tenantId,
            targetTenantId: existingData.tenantId,
            userId: input.userId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const currentStores: UserStoreMappingType[] = Array.isArray(existingData.stores) ? existingData.stores : [];
    const hasStoreAccess = currentStores.some((store) => Number(store.storeId) === input.storeId);
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
    await authAdmin.updateUser(firebaseUser.uid, {
        disabled: false,
        password: temporaryPasscode,
    });
    await authAdmin.revokeRefreshTokens(firebaseUser.uid);
    await targetDoc.ref.update(sanitizeFirestoreValue({
        authDisabled: false,
        authTokensRevokedAt: now,
        isVerified: true,
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
        sessionRevokedReason: "staff_passcode_reset",
        staffLoginId: loginId,
    }));

    logger.info("[staff] Owner-managed staff passcode reset", {
        tenantId: input.tenantId,
        storeId: input.storeId,
        userId: input.userId,
    });

    const updatedSnapshot = await targetDoc.ref.get();

    return NextResponse.json({
        success: true,
        message: "Temporary staff passcode created.",
        mode: "user_updated",
        staffAuthMode: getStaffAuthMode(existingData),
        staffLoginId: loginId,
        temporaryPasscode,
        user: sanitizeStaffUser(input.userId, updatedSnapshot.data()),
        userId: input.userId,
    } satisfies StaffMutationResponse);
};

export const forceSignOutStaffUser = async (
    request: NextRequest,
    session: any,
) => {
    const rateLimit = await applyRateLimit(request, session, "AUTH_SENSITIVE", "staff-force-signout");
    if (rateLimit) return rateLimit;

    const body = await request.json();
    const validation = validateAPIInput(ForceSignOutStaffSchema, body);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Staff Force Signout", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as ForceSignOutStaffInput;
    const authority = await getAuthority(session, input.tenantId, [input.storeId]);
    if (!authority?.canManageUsers) {
        logSecurity("Authorization Failed - Staff Force Signout", session, request, input, "high");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    try {
        ensureNotSelfDestructive(session, input.userId);
    } catch (error: any) {
        if (error?.message === "SELF_UPDATE_BLOCKED") {
            return jsonError("You cannot sign yourself out from here.", 409, "SELF_UPDATE_BLOCKED");
        }
        throw error;
    }

    const targetDoc = await firestoreAdmin.collection(USERS_COLLECTION).doc(input.userId).get();
    if (!targetDoc.exists) {
        return jsonError("Staff member not found", 404, "USER_NOT_FOUND");
    }

    const existingData = targetDoc.data() || {};
    if (Number(existingData.tenantId) !== input.tenantId) {
        logSecurity("Authorization Failed - Staff Force Signout Tenant Mismatch", session, request, {
            requestedTenantId: input.tenantId,
            targetTenantId: existingData.tenantId,
            userId: input.userId,
        }, "critical");
        return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const currentStores: UserStoreMappingType[] = Array.isArray(existingData.stores) ? existingData.stores : [];
    const hasStoreAccess = currentStores.some((store) => Number(store.storeId) === input.storeId);
    if (!hasStoreAccess || existingData.deleted === true) {
        return jsonError("Staff member is not assigned to this store", 404, "STORE_MAPPING_NOT_FOUND");
    }
    if (existingData.active === false) {
        return jsonError("This staff member is already deactivated.", 409, "STAFF_INACTIVE");
    }

    const now = admin.firestore.Timestamp.now();
    const sessionRevocationFields = await revokeStaffSessions(existingData, session, now, "owner_force_signout", {
        action: "staff-force-signout",
        tenantId: input.tenantId,
        storeId: input.storeId,
        userId: input.userId,
    });

    await targetDoc.ref.update(sanitizeFirestoreValue({
        modifiedBy: session?.user?.email,
        modifiedOn: now,
        ...sessionRevocationFields,
    }));

    logger.info("[staff] Owner forced staff session signout", {
        tenantId: input.tenantId,
        storeId: input.storeId,
        userId: input.userId,
    });

    const updatedSnapshot = await targetDoc.ref.get();
    return NextResponse.json({
        success: true,
        message: "Staff member signed out.",
        mode: "session_revoked",
        user: sanitizeStaffUser(input.userId, updatedSnapshot.data()),
        userId: input.userId,
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

    const body = await request.json();
    const validation = validateAPIInput(SaveRoleSchema, body);
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Role Save", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as SaveRoleInput;
    const authority = await getRoleEditAuthority(request, session, input.tenantId, input.storeId);
    if (!authority) return jsonError("Forbidden", 403, "FORBIDDEN");

    const store = await fetchStoreById(input.storeId);
    if (!store || Number(store.tenantId) !== input.tenantId) {
        return jsonError("Store not found", 404, "STORE_NOT_FOUND");
    }

    const roles = Array.isArray(store.roles) ? [...store.roles] : [];
    const existingIndex = input.role.id ? roles.findIndex((role) => role.id === input.role.id) : -1;
    const existingRole = existingIndex >= 0 ? roles[existingIndex] : null;
    const roleId = input.role.id || generateCustomRoleId();

    if (roleId === DEFAULT_ROLE_IDS.OWNER) {
        return jsonError("Owner role is locked", 409, "OWNER_ROLE_LOCKED");
    }

    if (input.role.active === false && await roleIsAssignedToActiveUser(input.tenantId, input.storeId, roleId)) {
        return jsonError("This role is assigned to active staff. Reassign them before turning it off.", 409, "ROLE_IN_USE");
    }

    const now = new Date().toISOString();
    const nextRole: StoreRoleDataType = {
        active: input.role.active ?? existingRole?.active ?? true,
        createdBy: existingRole?.createdBy || session?.user?.email || "system",
        createdOn: existingRole?.createdOn || now,
        description: input.role.description || "",
        id: roleId,
        modifiedBy: session?.user?.email || "system",
        modifiedOn: now,
        name: input.role.name,
        permissions: input.role.permissions as Record<PermissionKey, boolean>,
    };

    if (existingIndex >= 0) roles[existingIndex] = nextRole;
    else roles.push(nextRole);

    await firestoreAdmin.collection(STORES_COLLECTION).doc(String(input.storeId)).update(sanitizeFirestoreValue({
        modifiedBy: session?.user?.email,
        modifiedOn: admin.firestore.Timestamp.now(),
        roles,
    }));

    const response: RoleMutationResponse = {
        role: nextRole,
        roles,
        success: true,
    };

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
        storeId: Number(request.nextUrl.searchParams.get("storeId")),
        tenantId: Number(request.nextUrl.searchParams.get("tenantId")),
    });
    if (!validation.success) {
        const validationError = (validation as { success: false; error: string }).error;
        logSecurity("Input Validation Failed - Role Delete", session, request, { error: validationError }, "medium");
        return jsonError("Invalid input", 400, "INVALID_INPUT");
    }

    const input = validation.data as DeleteRoleInput;
    const authority = await getRoleEditAuthority(request, session, input.tenantId, input.storeId);
    if (!authority) return jsonError("Forbidden", 403, "FORBIDDEN");

    if (input.roleId === DEFAULT_ROLE_IDS.OWNER) {
        return jsonError("Owner role is locked", 409, "OWNER_ROLE_LOCKED");
    }

    if (await roleIsAssignedToActiveUser(input.tenantId, input.storeId, input.roleId)) {
        return jsonError("This role is assigned to active staff. Reassign them before turning it off.", 409, "ROLE_IN_USE");
    }

    const store = await fetchStoreById(input.storeId);
    if (!store || Number(store.tenantId) !== input.tenantId) {
        return jsonError("Store not found", 404, "STORE_NOT_FOUND");
    }

    const roles = (store.roles || []).map((role) => (
        role.id === input.roleId
            ? {
                ...role,
                active: false,
                modifiedBy: session?.user?.email || "system",
                modifiedOn: new Date().toISOString(),
            }
            : role
    ));

    await firestoreAdmin.collection(STORES_COLLECTION).doc(String(input.storeId)).update(sanitizeFirestoreValue({
        modifiedBy: session?.user?.email,
        modifiedOn: admin.firestore.Timestamp.now(),
        roles,
    }));

    return NextResponse.json({
        roles,
        success: true,
    } satisfies RoleMutationResponse);
};
