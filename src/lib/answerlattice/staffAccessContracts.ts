import { DEFAULT_ANSWERLATTICE_ROLE_IDS } from '@constant/answerlattice/permissions';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';

export type AnswerlatticeStaffStoreMembership = {
    name: string;
    role: string;
    storeId: number;
};

export type AnswerlatticeStaffAccessState = {
    accessRevision: number;
    memberships: AnswerlatticeStaffStoreMembership[];
    primaryMembership: AnswerlatticeStaffStoreMembership | null;
    tenantId: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeRoleId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const roleId = value.trim();
    return roleId && roleId === value && roleId.length <= 120 ? roleId : null;
};

const normalizeMembershipName = (value: unknown): string => (
    typeof value === 'string' ? value.trim().slice(0, 200) : ''
);

const normalizeConsistentScopeAliases = (...values: unknown[]): number | null | undefined => {
    const suppliedValues = values.filter((value) => value !== undefined);
    if (suppliedValues.length === 0) return undefined;
    if (suppliedValues.every((value) => value === null)) return undefined;
    if (suppliedValues.some((value) => value === null)) return null;
    const normalizedValues = suppliedValues.map(normalizeAnswerlatticeScopeDocumentId);
    const firstValue = normalizedValues[0];
    return firstValue && normalizedValues.every((value) => value === firstValue)
        ? firstValue
        : null;
};

export const normalizeAnswerlatticeStaffAccessRevision = (value: unknown): number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
);

export const normalizeAnswerlatticeStaffMemberships = (
    value: unknown,
): AnswerlatticeStaffStoreMembership[] | null => {
    if (!Array.isArray(value)) return null;

    const memberships: AnswerlatticeStaffStoreMembership[] = [];
    const seenStoreIds = new Set<number>();
    for (const candidate of value) {
        if (!isRecord(candidate)) return null;
        const storeId = normalizeConsistentScopeAliases(candidate.storeId, candidate.sId);
        const role = normalizeRoleId(candidate.role);
        if (!storeId || !role || seenStoreIds.has(storeId)) return null;
        seenStoreIds.add(storeId);
        memberships.push({
            name: normalizeMembershipName(candidate.name),
            role,
            storeId,
        });
    }

    return memberships;
};

export const readAnswerlatticeStaffAccessState = (
    value: unknown,
): AnswerlatticeStaffAccessState | null => {
    if (!isRecord(value)) return null;
    if (
        (value.pId !== undefined && value.pId !== PRODUCT_IDS.ANSWERLATTICE)
        || (value.productId !== undefined && value.productId !== PRODUCT_IDS.ANSWERLATTICE)
    ) return null;
    const tenantId = normalizeConsistentScopeAliases(value.tenantId, value.tId);
    if (!tenantId) return null;

    const primaryStoreId = normalizeConsistentScopeAliases(value.storeId, value.sId);
    if (primaryStoreId === null) return null;

    let memberships: AnswerlatticeStaffStoreMembership[];
    if ('stores' in value) {
        const normalizedMemberships = normalizeAnswerlatticeStaffMemberships(value.stores);
        if (normalizedMemberships === null) return null;
        memberships = normalizedMemberships;
    } else {
        const legacyRole = normalizeRoleId(value.role);
        memberships = primaryStoreId && legacyRole
            ? [{ name: '', role: legacyRole, storeId: primaryStoreId }]
            : [];
    }

    const primaryMembership = memberships.find(({ storeId }) => storeId === primaryStoreId)
        || memberships[0]
        || null;

    return {
        accessRevision: normalizeAnswerlatticeStaffAccessRevision(value.accessRevision),
        memberships,
        primaryMembership,
        tenantId,
    };
};

export const getAnswerlatticeStaffMembership = (
    state: AnswerlatticeStaffAccessState,
    storeId: number,
): AnswerlatticeStaffStoreMembership | null => (
    state.memberships.find((membership) => membership.storeId === storeId) || null
);

export const selectAnswerlatticeStaffPrimaryMembership = (
    memberships: AnswerlatticeStaffStoreMembership[],
    preferredStoreId?: unknown,
): AnswerlatticeStaffStoreMembership | null => {
    const normalizedPreferredStoreId = normalizeAnswerlatticeScopeDocumentId(preferredStoreId);
    return memberships.find(({ storeId }) => storeId === normalizedPreferredStoreId)
        || memberships[0]
        || null;
};

export const buildAnswerlatticeStaffAccessFields = (params: {
    accessRevision: number;
    active: boolean;
    memberships: AnswerlatticeStaffStoreMembership[];
    preferredStoreId?: unknown;
    tenantId: number;
}) => {
    const active = params.active && params.memberships.length > 0;
    const primaryMembership = selectAnswerlatticeStaffPrimaryMembership(
        params.memberships,
        params.preferredStoreId,
    );
    return {
        accessRevision: params.accessRevision,
        active,
        authDisabled: !active,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: primaryMembership?.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF,
        sId: primaryMembership?.storeId ?? null,
        storeId: primaryMembership?.storeId ?? null,
        storeIds: params.memberships.map(({ storeId }) => storeId),
        stores: params.memberships,
        tId: params.tenantId,
        tenantId: params.tenantId,
    };
};

export const isAnswerlatticeStaffAccountActive = (
    value: unknown,
    state = readAnswerlatticeStaffAccessState(value),
): boolean => {
    if (!isRecord(value) || !state || state.memberships.length === 0) return false;
    return value.active !== false
        && value.authDisabled !== true
        && value.deleted !== true;
};

export const isAnswerlatticeStaffUserInScope = (
    value: unknown,
    tenantId: number,
    storeId: number,
): boolean => {
    const state = readAnswerlatticeStaffAccessState(value);
    return Boolean(
        state
        && state.tenantId === tenantId
        && getAnswerlatticeStaffMembership(state, storeId),
    );
};

const normalizeStaffIdentityValue = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const normalizeStaffIdentityEmail = (value: unknown): string => (
    normalizeStaffIdentityValue(value).toLowerCase()
);

export const isAnswerlatticeStaffSelfTarget = (params: {
    sessionEmail?: unknown;
    sessionUserId?: unknown;
    targetEmail?: unknown;
    targetUserId?: unknown;
}): boolean => {
    const sessionUserId = normalizeStaffIdentityValue(params.sessionUserId);
    const targetUserId = normalizeStaffIdentityValue(params.targetUserId);
    if (sessionUserId && targetUserId && sessionUserId === targetUserId) return true;

    const sessionEmail = normalizeStaffIdentityEmail(params.sessionEmail);
    const targetEmail = normalizeStaffIdentityEmail(params.targetEmail);
    return Boolean(sessionEmail && targetEmail && sessionEmail === targetEmail);
};

export const shouldSendAnswerlatticeStaffSetupEmail = (params: {
    hasEmail: boolean;
    replay: boolean;
}): boolean => params.hasEmail && !params.replay;

export const isAnswerlatticeManagedStaffIdentityCollision = (params: {
    existingRequestId: unknown;
    existingUser: boolean;
    hasEmail: boolean;
    requestId: string;
}): boolean => params.existingUser
    && !params.hasEmail
    && params.existingRequestId !== params.requestId;

export type AnswerlatticeStaffAuthLookup =
    | { email: string; type: 'email' }
    | { type: 'uid'; uid: string };

export const resolveAnswerlatticeStaffAuthLookup = (params: {
    dataEmail?: unknown;
    fallbackEmail?: unknown;
    firebaseUid?: unknown;
}): AnswerlatticeStaffAuthLookup | null => {
    const email = normalizeStaffIdentityEmail(params.fallbackEmail)
        || normalizeStaffIdentityEmail(params.dataEmail);
    if (email) return { email, type: 'email' };

    const uid = normalizeStaffIdentityValue(params.firebaseUid);
    return uid ? { type: 'uid', uid } : null;
};

export const isAnswerlatticeStaffRemovalReplay = (params: {
    state: AnswerlatticeStaffAccessState;
    storeId: number;
    value: unknown;
}): boolean => {
    if (!isRecord(params.value) || getAnswerlatticeStaffMembership(params.state, params.storeId)) {
        return false;
    }
    return normalizeAnswerlatticeScopeDocumentId(params.value.workspaceAccessRemovedStoreId) === params.storeId;
};
