import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';
import type {
    AuthSessionProductAccount,
    AuthSessionStoreMapping,
    AuthSessionUserType,
} from '@type/loginUser';
import type LoginUserType from '@type/loginUser';
import type { PlatformBlockDetails, PlatformBlockEntityType } from '@type/platform/blocking';

type UnknownRecord = Record<string, unknown>;
type WithoutNullValues<T> = {
    [Key in keyof T]: Exclude<T[Key], null>;
};

const INVALID_SCOPE = Symbol('invalid-login-session-scope');

const isRecord = (value: unknown): value is UnknownRecord => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const boundedString = (value: unknown, maxLength: number, allowEmpty = false): string | null => {
    if (typeof value !== 'string' || value.length > maxLength) return null;
    if (!allowEmpty && value.trim().length === 0) return null;
    return value;
};

const optionalBoundedString = (value: unknown, maxLength: number): string | undefined | null => {
    if (value === undefined) return undefined;
    return boundedString(value, maxLength, true);
};

const optionalBoolean = (value: unknown): boolean | undefined | null => {
    if (value === undefined) return undefined;
    return typeof value === 'boolean' ? value : null;
};

const hasNoNullValues = <T extends UnknownRecord>(
    value: T,
): value is T & WithoutNullValues<T> => (
    Object.values(value).every((item) => item !== null)
);

const normalizeNullableScopeId = (value: unknown): number | null | undefined => {
    if (value === null) return null;
    return normalizeStoreSwitchStoreId(value) ?? undefined;
};

const normalizeProductId = (value: unknown): ProductId | null => (
    typeof value === 'string' && Object.values(PRODUCT_IDS).includes(value as ProductId)
        ? value as ProductId
        : null
);

const isExactIsoTimestamp = (value: string): boolean => {
    const millis = Date.parse(value);
    return Number.isFinite(millis) && new Date(millis).toISOString() === value;
};

const normalizeStores = (value: unknown): AuthSessionStoreMapping[] | null => {
    if (!Array.isArray(value)) return null;
    const roles = new Map<number, string>();
    for (const item of value) {
        if (!isRecord(item)) return null;
        const storeId = normalizeStoreSwitchStoreId(item.storeId);
        const role = boundedString(item.role, 64, true);
        if (!storeId || role === null) return null;
        const existingRole = roles.get(storeId);
        if (existingRole !== undefined && existingRole !== role) return null;
        roles.set(storeId, role);
    }
    return Array.from(roles, ([storeId, role]) => ({ role, storeId }));
};

const normalizeStoreIds = (value: unknown): number[] | null => {
    if (!Array.isArray(value)) return null;
    const normalized: number[] = [];
    for (const item of value) {
        const storeId = normalizeStoreSwitchStoreId(item);
        if (!storeId) return null;
        normalized.push(storeId);
    }
    return Array.from(new Set(normalized));
};

const normalizeProductAccounts = (
    value: unknown,
): Partial<Record<ProductId, AuthSessionProductAccount>> | undefined | null => {
    if (value === undefined) return undefined;
    if (!isRecord(value)) return null;

    const accounts: Partial<Record<ProductId, AuthSessionProductAccount>> = {};
    for (const [key, account] of Object.entries(value)) {
        const productId = normalizeProductId(key);
        if (!productId || !isRecord(account)) return null;
        const tenantId = normalizeOptionalConsistentScopeIds([
            account.tenantId,
            account.tId,
        ]);
        const storeId = normalizeOptionalConsistentScopeIds([
            account.storeId,
            account.sId,
        ]);
        const storeIds = account.storeIds === undefined
            ? undefined
            : normalizeStoreIds(account.storeIds);
        const role = optionalBoundedString(account.role, 64);
        const platformRole = optionalBoundedString(account.platformRole, 64);
        const active = optionalBoolean(account.active);
        const authDisabled = optionalBoolean(account.authDisabled);
        const deleted = optionalBoolean(account.deleted);
        const accessRevision = account.accessRevision === undefined
            ? undefined
            : (
                typeof account.accessRevision === 'number'
                && Number.isSafeInteger(account.accessRevision)
                && account.accessRevision >= 0
                    ? account.accessRevision
                    : null
            );
        if (
            tenantId === INVALID_SCOPE
            || storeId === INVALID_SCOPE
            || storeIds === null
            || role === null
            || platformRole === null
            || active === null
            || authDisabled === null
            || deleted === null
            || accessRevision === null
        ) return null;

        accounts[productId] = {
            ...(accessRevision !== undefined ? { accessRevision } : {}),
            ...(active !== undefined ? { active } : {}),
            ...(authDisabled !== undefined ? { authDisabled } : {}),
            ...(deleted !== undefined ? { deleted } : {}),
            ...(platformRole !== undefined ? { platformRole } : {}),
            ...(role !== undefined ? { role } : {}),
            ...(storeId !== undefined ? { storeId } : {}),
            ...(storeIds !== undefined ? { storeIds } : {}),
            ...(tenantId !== undefined ? { tenantId } : {}),
        };
    }
    return accounts;
};

const normalizeOptionalConsistentScopeIds = (
    values: readonly unknown[],
): number | null | undefined | typeof INVALID_SCOPE => {
    const supplied = values.filter((value) => value !== undefined);
    if (supplied.length === 0) return undefined;
    const normalized = supplied.map((value) => (
        value === null ? null : normalizeStoreSwitchStoreId(value) ?? INVALID_SCOPE
    ));
    const first = normalized[0];
    return normalized.every((value) => Object.is(value, first))
        ? first
        : INVALID_SCOPE;
};

const normalizeBlockDetails = (value: unknown): PlatformBlockDetails | undefined | null => {
    if (value === undefined) return undefined;
    if (!isRecord(value)) return null;
    const blocked = optionalBoolean(value.blocked);
    const reason = boundedString(value.reason, 500, true);
    const updatedAt = boundedString(value.updatedAt, 64);
    if (blocked === undefined || blocked === null || reason === null || !updatedAt || value.source !== 'platform_settings') {
        return null;
    }
    const entityType = value.entityType === undefined
        ? undefined
        : (['tenant', 'store', 'user'].includes(String(value.entityType))
            ? value.entityType as PlatformBlockEntityType
            : null);
    const entityId = value.entityId === undefined
        ? undefined
        : (typeof value.entityId === 'string' || typeof value.entityId === 'number' ? value.entityId : null);
    const stringFields = {
        blockedAt: optionalBoundedString(value.blockedAt, 64),
        blockedByEmail: optionalBoundedString(value.blockedByEmail, 320),
        blockedByUserId: optionalBoundedString(value.blockedByUserId, 256),
        blockedReason: optionalBoundedString(value.blockedReason, 500),
        unblockedAt: optionalBoundedString(value.unblockedAt, 64),
        unblockedByEmail: optionalBoundedString(value.unblockedByEmail, 320),
        unblockedByUserId: optionalBoundedString(value.unblockedByUserId, 256),
        unblockedReason: optionalBoundedString(value.unblockedReason, 500),
        updatedByEmail: optionalBoundedString(value.updatedByEmail, 320),
        updatedByUserId: optionalBoundedString(value.updatedByUserId, 256),
    };
    if (entityType === null || entityId === null || !hasNoNullValues(stringFields)) {
        return null;
    }
    const normalized: PlatformBlockDetails = {
        blocked,
        reason,
        source: 'platform_settings',
        updatedAt,
        ...(entityType ? { entityType } : {}),
        ...(entityId !== undefined ? { entityId } : {}),
    };
    if (stringFields.blockedAt !== undefined) normalized.blockedAt = stringFields.blockedAt;
    if (stringFields.blockedByEmail !== undefined) normalized.blockedByEmail = stringFields.blockedByEmail;
    if (stringFields.blockedByUserId !== undefined) normalized.blockedByUserId = stringFields.blockedByUserId;
    if (stringFields.blockedReason !== undefined) normalized.blockedReason = stringFields.blockedReason;
    if (stringFields.unblockedAt !== undefined) normalized.unblockedAt = stringFields.unblockedAt;
    if (stringFields.unblockedByEmail !== undefined) normalized.unblockedByEmail = stringFields.unblockedByEmail;
    if (stringFields.unblockedByUserId !== undefined) normalized.unblockedByUserId = stringFields.unblockedByUserId;
    if (stringFields.unblockedReason !== undefined) normalized.unblockedReason = stringFields.unblockedReason;
    if (stringFields.updatedByEmail !== undefined) normalized.updatedByEmail = stringFields.updatedByEmail;
    if (stringFields.updatedByUserId !== undefined) normalized.updatedByUserId = stringFields.updatedByUserId;
    return normalized;
};

const normalizeSessionUser = (value: unknown): AuthSessionUserType | null => {
    if (!isRecord(value)) return null;
    const id = boundedString(value.id, 256);
    const email = boundedString(value.email, 320);
    const name = boundedString(value.name, 300, true);
    const role = boundedString(value.role, 64, true);
    const platformRole = boundedString(value.platformRole, 64);
    const tenantId = normalizeNullableScopeId(value.tenantId);
    const storeId = normalizeNullableScopeId(value.storeId);
    const storeIds = normalizeStoreIds(value.storeIds);
    const stores = normalizeStores(value.stores);
    const pId = normalizeProductId(value.pId);
    const productId = normalizeProductId(value.productId);
    const productAccounts = normalizeProductAccounts(value.productAccounts);
    const active = optionalBoolean(value.active);
    const isVerified = optionalBoolean(value.isVerified);
    const authDisabled = optionalBoolean(value.authDisabled);
    const blocked = optionalBoolean(value.blocked);
    const deleted = optionalBoolean(value.deleted);
    const authIssuedAt = value.authIssuedAt === undefined
        ? undefined
        : (typeof value.authIssuedAt === 'number' && Number.isSafeInteger(value.authIssuedAt) && value.authIssuedAt > 0
            ? value.authIssuedAt
            : null);

    if (
        !id || !email || name === null || role === null || !platformRole
        || tenantId === undefined || storeId === undefined
        || !storeIds || !stores || !pId || !productId || productAccounts === null
        || active === undefined || active === null
        || isVerified === undefined || isVerified === null
        || authDisabled === null || blocked === null || deleted === null || authIssuedAt === null
    ) return null;

    const blockDetails = normalizeBlockDetails(value.blockDetails);
    const optionalStrings = {
        countryCode: optionalBoundedString(value.countryCode, 8),
        dialCode: optionalBoundedString(value.dialCode, 8),
        displayEmail: optionalBoundedString(value.displayEmail, 320),
        image: value.image === null ? null : optionalBoundedString(value.image, 2048),
        loginUsername: optionalBoundedString(value.loginUsername, 320),
        phone: optionalBoundedString(value.phone, 64),
        phoneNumber: optionalBoundedString(value.phoneNumber, 64),
        phoneUsername: optionalBoundedString(value.phoneUsername, 320),
        profileImage: optionalBoundedString(value.profileImage, 2048),
        resellerProfileId: optionalBoundedString(value.resellerProfileId, 256),
        staffLoginId: optionalBoundedString(value.staffLoginId, 320),
    };
    if (blockDetails === null || !hasNoNullValues(optionalStrings)) return null;
    const staffAuthMode = value.staffAuthMode === undefined
        ? undefined
        : (value.staffAuthMode === 'email' || value.staffAuthMode === 'owner_passcode' ? value.staffAuthMode : null);
    const phoneLoginEnabled = optionalBoolean(value.phoneLoginEnabled);
    const sessionRevokedAt = value.sessionRevokedAt === undefined
        ? undefined
        : (typeof value.sessionRevokedAt === 'string' || typeof value.sessionRevokedAt === 'number'
            ? value.sessionRevokedAt
            : null);
    if (staffAuthMode === null || phoneLoginEnabled === null || sessionRevokedAt === null) return null;

    const normalizedUser: AuthSessionUserType = {
        active,
        ...(authDisabled !== undefined ? { authDisabled } : {}),
        ...(authIssuedAt !== undefined ? { authIssuedAt } : {}),
        ...(blocked !== undefined ? { blocked } : {}),
        ...(blockDetails ? { blockDetails } : {}),
        ...(deleted !== undefined ? { deleted } : {}),
        email,
        id,
        isVerified,
        name,
        pId,
        platformRole,
        ...(productAccounts ? { productAccounts } : {}),
        productId,
        role,
        storeId,
        storeIds,
        stores,
        tenantId,
        ...(phoneLoginEnabled !== undefined ? { phoneLoginEnabled } : {}),
        ...(sessionRevokedAt !== undefined ? { sessionRevokedAt } : {}),
        ...(staffAuthMode ? { staffAuthMode } : {}),
    };
    if (optionalStrings.countryCode !== undefined) normalizedUser.countryCode = optionalStrings.countryCode;
    if (optionalStrings.dialCode !== undefined) normalizedUser.dialCode = optionalStrings.dialCode;
    if (optionalStrings.displayEmail !== undefined) normalizedUser.displayEmail = optionalStrings.displayEmail;
    if (optionalStrings.image !== undefined) normalizedUser.image = optionalStrings.image;
    if (optionalStrings.loginUsername !== undefined) normalizedUser.loginUsername = optionalStrings.loginUsername;
    if (optionalStrings.phone !== undefined) normalizedUser.phone = optionalStrings.phone;
    if (optionalStrings.phoneNumber !== undefined) normalizedUser.phoneNumber = optionalStrings.phoneNumber;
    if (optionalStrings.phoneUsername !== undefined) normalizedUser.phoneUsername = optionalStrings.phoneUsername;
    if (optionalStrings.profileImage !== undefined) normalizedUser.profileImage = optionalStrings.profileImage;
    if (optionalStrings.resellerProfileId !== undefined) normalizedUser.resellerProfileId = optionalStrings.resellerProfileId;
    if (optionalStrings.staffLoginId !== undefined) normalizedUser.staffLoginId = optionalStrings.staffLoginId;
    return normalizedUser;
};

const normalizeLoginUserSessionValue = (value: unknown): LoginUserType | null => {
    if (!isRecord(value)) return null;
    const user = normalizeSessionUser(value.user);
    if (!user) return null;

    const tId = normalizeNullableScopeId(value.tId);
    const sId = normalizeNullableScopeId(value.sId);
    const uId = boundedString(value.uId, 256);
    const role = boundedString(value.role, 64, true);
    const platformRole = boundedString(value.platformRole, 64);
    const pId = normalizeProductId(value.pId);
    const productId = value.productId === undefined ? undefined : normalizeProductId(value.productId);
    const expires = boundedString(value.expires, 64);
    const authIssuedAt = value.authIssuedAt === undefined
        ? undefined
        : (typeof value.authIssuedAt === 'number' && Number.isSafeInteger(value.authIssuedAt) && value.authIssuedAt > 0
            ? value.authIssuedAt
            : null);

    if (
        tId === undefined || sId === undefined || !uId || role === null || !platformRole || !pId
        || productId === null || !expires || authIssuedAt === null
        || !isExactIsoTimestamp(expires)
        || user.id !== uId || user.tenantId !== tId || user.storeId !== sId
        || user.role !== role || user.platformRole !== platformRole || user.pId !== pId
        || user.productId !== user.pId
        || (productId !== undefined && (productId !== pId || user.productId !== productId))
        || (authIssuedAt !== undefined && user.authIssuedAt !== undefined && user.authIssuedAt !== authIssuedAt)
    ) return null;

    return {
        ...(authIssuedAt !== undefined ? { authIssuedAt } : {}),
        expires,
        pId,
        platformRole,
        ...(productId ? { productId } : {}),
        role,
        sId,
        tId,
        uId,
        user,
    };
};

export const normalizeLoginUserSession = (value: unknown): LoginUserType | null => {
    try {
        return normalizeLoginUserSessionValue(value);
    } catch {
        return null;
    }
};
