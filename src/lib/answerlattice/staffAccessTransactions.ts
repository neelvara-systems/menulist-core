import {
    createDefaultAnswerlatticeRoles,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    isDefaultAnswerlatticeRoleId,
} from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import {
    AnswerlatticeStaffStoreMembership,
    buildAnswerlatticeStaffAccessFields,
    getAnswerlatticeStaffMembership,
    isAnswerlatticeStaffAccountActive,
    readAnswerlatticeStaffAccessState,
    selectAnswerlatticeStaffPrimaryMembership,
} from '@lib/answerlattice/staffAccessContracts';
import {
    isAnswerlatticeActiveStoreInScope,
    isAnswerlatticeStoreInScope,
} from '@lib/answerlattice/sessionScope';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const ANSWERLATTICE_STAFF_QUERY_LIMIT = 500;

export type AnswerlatticeStaffTransactionErrorCode =
    | 'ALREADY_ASSIGNED'
    | 'FORBIDDEN'
    | 'IDEMPOTENCY_CONFLICT'
    | 'INACTIVE_ACCOUNT_WITH_MEMBERSHIPS'
    | 'LAST_OWNER'
    | 'MULTI_WORKSPACE_ACTIVE_CHANGE'
    | 'ROLE_IN_USE'
    | 'ROLE_NOT_FOUND'
    | 'STORE_MAPPING_NOT_FOUND'
    | 'STORE_NOT_FOUND'
    | 'USER_NOT_FOUND'
    | 'WORKSPACE_LIFECYCLE_INVALID';

export class AnswerlatticeStaffTransactionError extends Error {
    readonly code: AnswerlatticeStaffTransactionErrorCode;

    constructor(code: AnswerlatticeStaffTransactionErrorCode) {
        super(code);
        this.code = code;
        this.name = 'AnswerlatticeStaffTransactionError';
        Object.setPrototypeOf(this, AnswerlatticeStaffTransactionError.prototype);
    }
}

type StaffTransactionResult = {
    accessChanged: boolean;
    accessRevision: number;
    currentData: FirebaseFirestore.DocumentData;
    memberships: AnswerlatticeStaffStoreMembership[];
    nextData: FirebaseFirestore.DocumentData;
    primaryMembership: AnswerlatticeStaffStoreMembership | null;
    replay: boolean;
};

const requireScopedStore = (
    snapshot: FirebaseFirestore.DocumentSnapshot,
    tenantId: number,
    storeId: number,
) => {
    if (!snapshot.exists || !isAnswerlatticeActiveStoreInScope(snapshot.data(), { tenantId, storeId }, snapshot.id)) {
        throw new AnswerlatticeStaffTransactionError('STORE_NOT_FOUND');
    }
    return snapshot.data() || {};
};

const getActiveRoleIds = (
    storeData: FirebaseFirestore.DocumentData,
    tenantId: number,
    storeId: number,
): Set<string> => {
    const roles = new Map(
        createDefaultAnswerlatticeRoles({ createdBy: 'system', sId: storeId, tId: tenantId })
            .map((role) => [role.id, role.active !== false] as const),
    );
    const seenCustomRoleIds = new Set<string>();
    if (Array.isArray(storeData.answerlatticeRoles)) {
        storeData.answerlatticeRoles.forEach((candidate: unknown) => {
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
            const role = candidate as Record<string, unknown>;
            const rawRoleId = typeof role.id === 'string' ? role.id : '';
            const roleId = rawRoleId.trim();
            if (!roleId || roleId !== rawRoleId || roleId.length > 120 || isDefaultAnswerlatticeRoleId(roleId)) return;
            if (seenCustomRoleIds.has(roleId)) {
                roles.delete(roleId);
                return;
            }
            seenCustomRoleIds.add(roleId);
            roles.set(roleId, role.active === true);
        });
    }
    return new Set(Array.from(roles).filter(([, active]) => active).map(([roleId]) => roleId));
};

const requireRole = (
    storeData: FirebaseFirestore.DocumentData,
    tenantId: number,
    storeId: number,
    roleId: string,
) => {
    if (!getActiveRoleIds(storeData, tenantId, storeId).has(roleId)) {
        throw new AnswerlatticeStaffTransactionError('ROLE_NOT_FOUND');
    }
};

const requireScopedUserState = (
    snapshot: FirebaseFirestore.DocumentSnapshot,
    tenantId: number,
    storeId: number,
) => {
    if (!snapshot.exists) throw new AnswerlatticeStaffTransactionError('USER_NOT_FOUND');
    const currentData = snapshot.data() || {};
    const state = readAnswerlatticeStaffAccessState(currentData);
    if (!state || state.tenantId !== tenantId) {
        throw new AnswerlatticeStaffTransactionError('FORBIDDEN');
    }
    const currentMembership = getAnswerlatticeStaffMembership(state, storeId);
    if (!currentMembership || currentData.deleted === true) {
        throw new AnswerlatticeStaffTransactionError('STORE_MAPPING_NOT_FOUND');
    }
    return { currentData, currentMembership, state };
};

const isActiveOwnerForStore = (
    document: FirebaseFirestore.QueryDocumentSnapshot,
    tenantId: number,
    storeId: number,
    excludedUserId: string,
): boolean => {
    if (document.id === excludedUserId) return false;
    const data = document.data();
    if (data.active === false || data.deleted === true || data.authDisabled === true) return false;
    const state = readAnswerlatticeStaffAccessState(data);
    return Boolean(
        state
        && state.tenantId === tenantId
        && getAnswerlatticeStaffMembership(state, storeId)?.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER,
    );
};

const requireAnotherOwnerInTransaction = async (params: {
    db: FirebaseFirestore.Firestore;
    storeId: number;
    targetUserId: string;
    tenantId: number;
    transaction: FirebaseFirestore.Transaction;
}) => {
    const query = params.db.collection(DB_COLLECTIONS.USERS)
        .where('tenantId', '==', params.tenantId)
        .where('storeIds', 'array-contains', params.storeId)
        .limit(ANSWERLATTICE_STAFF_QUERY_LIMIT);
    const snapshot = await params.transaction.get(query);
    const hasAnotherOwner = snapshot.docs.some((document) => isActiveOwnerForStore(
        document,
        params.tenantId,
        params.storeId,
        params.targetUserId,
    ));
    if (!hasAnotherOwner) {
        throw new AnswerlatticeStaffTransactionError('LAST_OWNER');
    }
};

const getMembershipRequest = (
    data: FirebaseFirestore.DocumentData,
    storeId: number,
): { fingerprint: string; requestId: string } | null => {
    const requests = data.membershipCreationRequests;
    const candidate = requests && typeof requests === 'object' && !Array.isArray(requests)
        ? requests[String(storeId)]
        : null;
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        const requestId = typeof candidate.requestId === 'string' ? candidate.requestId : '';
        const fingerprint = typeof candidate.fingerprint === 'string' ? candidate.fingerprint : '';
        if (requestId && fingerprint) return { fingerprint, requestId };
    }
    const legacyRequestId = typeof data.creationRequestId === 'string' ? data.creationRequestId : '';
    const legacyFingerprint = typeof data.creationRequestFingerprint === 'string' ? data.creationRequestFingerprint : '';
    return legacyRequestId && legacyFingerprint
        ? { fingerprint: legacyFingerprint, requestId: legacyRequestId }
        : null;
};

export const createAnswerlatticeStaffMembershipTransaction = async (params: {
    baseData: FirebaseFirestore.DocumentData;
    db: FirebaseFirestore.Firestore;
    fingerprint: string;
    membership: AnswerlatticeStaffStoreMembership;
    requestId: string;
    tenantId: number;
    userId: string;
}): Promise<StaffTransactionResult> => params.db.runTransaction(async (transaction) => {
    const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId);
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(params.membership.storeId));
    const [storeSnapshot, userSnapshot] = await Promise.all([
        transaction.get(storeRef),
        transaction.get(userRef),
    ]);
    const storeData = requireScopedStore(storeSnapshot, params.tenantId, params.membership.storeId);
    requireRole(storeData, params.tenantId, params.membership.storeId, params.membership.role);

    const currentData = userSnapshot.data() || {};
    const currentState = userSnapshot.exists ? readAnswerlatticeStaffAccessState(currentData) : null;
    if (userSnapshot.exists && (!currentState || currentState.tenantId !== params.tenantId)) {
        throw new AnswerlatticeStaffTransactionError('FORBIDDEN');
    }
    const existingMembership = currentState
        ? getAnswerlatticeStaffMembership(currentState, params.membership.storeId)
        : null;
    const existingRequest = getMembershipRequest(currentData, params.membership.storeId);
    if (existingRequest?.requestId === params.requestId) {
        if (existingRequest.fingerprint !== params.fingerprint || !existingMembership) {
            throw new AnswerlatticeStaffTransactionError('IDEMPOTENCY_CONFLICT');
        }
        return {
            accessChanged: false,
            accessRevision: currentState!.accessRevision,
            currentData,
            memberships: currentState!.memberships,
            nextData: currentData,
            primaryMembership: currentState!.primaryMembership,
            replay: true,
        };
    }
    if (existingMembership) {
        throw new AnswerlatticeStaffTransactionError('ALREADY_ASSIGNED');
    }
    if (
        currentState
        && currentState.memberships.length > 0
        && !isAnswerlatticeStaffAccountActive(currentData, currentState)
    ) {
        throw new AnswerlatticeStaffTransactionError('INACTIVE_ACCOUNT_WITH_MEMBERSHIPS');
    }

    const memberships = [...(currentState?.memberships || []), params.membership];
    const primaryMembership = selectAnswerlatticeStaffPrimaryMembership(
        memberships,
        currentState?.primaryMembership?.storeId,
    );
    const accessRevision = (currentState?.accessRevision || 0) + 1;
    const membershipCreationRequests = {
        ...(currentData.membershipCreationRequests
            && typeof currentData.membershipCreationRequests === 'object'
            && !Array.isArray(currentData.membershipCreationRequests)
            ? currentData.membershipCreationRequests
            : {}),
        [String(params.membership.storeId)]: {
            fingerprint: params.fingerprint,
            requestId: params.requestId,
        },
    };
    const accessFields = buildAnswerlatticeStaffAccessFields({
        accessRevision,
        active: true,
        memberships,
        preferredStoreId: primaryMembership?.storeId,
        tenantId: params.tenantId,
    });
    const writeData = {
        ...params.baseData,
        ...accessFields,
        countryCode: currentData.countryCode || params.baseData.countryCode,
        createdBy: currentData.createdBy || params.baseData.createdBy,
        createdOn: currentData.createdOn || params.baseData.createdOn,
        createdVia: currentData.createdVia || params.baseData.createdVia,
        creationRequestFingerprint: currentData.creationRequestFingerprint || params.fingerprint,
        creationRequestId: currentData.creationRequestId || params.requestId,
        deleted: false,
        deletedAt: null,
        dialCode: currentData.dialCode || params.baseData.dialCode,
        email: currentData.email || params.baseData.email,
        firebaseUid: currentData.firebaseUid || params.baseData.firebaseUid,
        loginUsername: currentData.loginUsername || params.baseData.loginUsername,
        membershipCreationRequests,
        name: currentData.name || params.baseData.name,
        phone: currentData.phone || params.baseData.phone,
        phoneNumber: currentData.phoneNumber || params.baseData.phoneNumber,
        phoneUsername: currentData.phoneUsername || params.baseData.phoneUsername,
        platformRole: currentData.platformRole || params.baseData.platformRole,
        staffAuthMode: currentData.staffAuthMode || params.baseData.staffAuthMode,
        staffLoginId: currentData.staffLoginId || params.baseData.staffLoginId,
    };
    const nextData = { ...currentData, ...writeData };
    transaction.set(userRef, sanitizeForFirestore(writeData, { undefinedObjectValue: 'omit' }), { merge: true });
    return {
        accessChanged: true,
        accessRevision,
        currentData,
        memberships,
        nextData,
        primaryMembership,
        replay: false,
    };
});

export const updateAnswerlatticeStaffMembershipTransaction = async (params: {
    active?: boolean;
    allowMultiWorkspaceActiveChange?: boolean;
    db: FirebaseFirestore.Firestore;
    profileUpdate: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
    roleId?: string;
    storeId: number;
    storeName: string;
    tenantId: number;
    userId: string;
}): Promise<StaffTransactionResult> => params.db.runTransaction(async (transaction) => {
    const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId);
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(params.storeId));
    const [storeSnapshot, userSnapshot] = await Promise.all([
        transaction.get(storeRef),
        transaction.get(userRef),
    ]);
    const storeData = requireScopedStore(storeSnapshot, params.tenantId, params.storeId);
    const { currentData, currentMembership, state } = requireScopedUserState(
        userSnapshot,
        params.tenantId,
        params.storeId,
    );
    const nextRoleId = params.roleId || currentMembership.role;
    requireRole(storeData, params.tenantId, params.storeId, nextRoleId);
    const roleChanged = nextRoleId !== currentMembership.role;
    const currentActive = currentData.active !== false && currentData.authDisabled !== true;
    const activeChanged = params.active !== undefined && params.active !== currentActive;
    if (activeChanged && state.memberships.length > 1 && !params.allowMultiWorkspaceActiveChange) {
        throw new AnswerlatticeStaffTransactionError('MULTI_WORKSPACE_ACTIVE_CHANGE');
    }
    const ownerStoreIdsToProtect = new Set<number>();
    if (activeChanged && params.active === false) {
        state.memberships.forEach((membership) => {
            if (membership.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
                ownerStoreIdsToProtect.add(membership.storeId);
            }
        });
    } else if (
        currentMembership.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        && roleChanged
        && nextRoleId !== DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
    ) {
        ownerStoreIdsToProtect.add(params.storeId);
    }
    for (const ownerStoreId of Array.from(ownerStoreIdsToProtect)) {
        await requireAnotherOwnerInTransaction({
            db: params.db,
            storeId: ownerStoreId,
            targetUserId: params.userId,
            tenantId: params.tenantId,
            transaction,
        });
    }

    const memberships = state.memberships.map((membership) => (
        membership.storeId === params.storeId
            ? { ...membership, name: params.storeName, role: nextRoleId }
            : membership
    ));
    const accessChanged = roleChanged || activeChanged;
    const accessRevision = state.accessRevision + (accessChanged ? 1 : 0);
    const active = params.active ?? currentActive;
    const accessFields = buildAnswerlatticeStaffAccessFields({
        accessRevision,
        active,
        memberships,
        preferredStoreId: state.primaryMembership?.storeId,
        tenantId: params.tenantId,
    });
    const nextData = {
        ...currentData,
        ...params.profileUpdate,
        ...accessFields,
    };
    transaction.update(userRef, sanitizeForFirestore({
        ...params.profileUpdate,
        ...accessFields,
    }, { undefinedObjectValue: 'omit' }));
    return {
        accessChanged,
        accessRevision,
        currentData,
        memberships,
        nextData,
        primaryMembership: selectAnswerlatticeStaffPrimaryMembership(memberships, accessFields.storeId),
        replay: false,
    };
});

export const removeAnswerlatticeStaffMembershipTransaction = async (params: {
    deactivationUpdate?: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
    db: FirebaseFirestore.Firestore;
    lifecycleUpdate: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
    storeId: number;
    tenantId: number;
    userId: string;
}): Promise<StaffTransactionResult> => params.db.runTransaction(async (transaction) => {
    const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId);
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(params.storeId));
    const [storeSnapshot, userSnapshot] = await Promise.all([
        transaction.get(storeRef),
        transaction.get(userRef),
    ]);
    requireScopedStore(storeSnapshot, params.tenantId, params.storeId);
    const { currentData, currentMembership, state } = requireScopedUserState(
        userSnapshot,
        params.tenantId,
        params.storeId,
    );
    if (currentMembership.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) {
        await requireAnotherOwnerInTransaction({
            db: params.db,
            storeId: params.storeId,
            targetUserId: params.userId,
            tenantId: params.tenantId,
            transaction,
        });
    }

    const memberships = state.memberships.filter(({ storeId }) => storeId !== params.storeId);
    const primaryMembership = selectAnswerlatticeStaffPrimaryMembership(
        memberships,
        state.primaryMembership?.storeId,
    );
    const accessRevision = state.accessRevision + 1;
    const shouldDeactivate = memberships.length === 0;
    const currentActive = isAnswerlatticeStaffAccountActive(currentData, state);
    const accessFields = buildAnswerlatticeStaffAccessFields({
        accessRevision,
        active: shouldDeactivate ? false : currentActive,
        memberships,
        preferredStoreId: primaryMembership?.storeId,
        tenantId: params.tenantId,
    });
    const deactivationUpdate = shouldDeactivate ? params.deactivationUpdate || {} : {};
    const deletionFields = {
        deleted: shouldDeactivate,
        deletedAt: shouldDeactivate ? deactivationUpdate.deletedAt ?? null : null,
    };
    const nextData = {
        ...currentData,
        ...params.lifecycleUpdate,
        ...deactivationUpdate,
        ...accessFields,
        ...deletionFields,
    };
    transaction.update(userRef, sanitizeForFirestore({
        ...params.lifecycleUpdate,
        ...deactivationUpdate,
        ...accessFields,
        ...deletionFields,
    }, { undefinedObjectValue: 'omit' }));
    return {
        accessChanged: true,
        accessRevision,
        currentData,
        memberships,
        nextData,
        primaryMembership,
        replay: false,
    };
});

export const removeAnswerlatticeWorkspaceMembershipForErasureTransaction = async (params: {
    db: FirebaseFirestore.Firestore;
    storeId: number;
    tenantId: number;
    userId: string;
}): Promise<StaffTransactionResult> => params.db.runTransaction(async (transaction) => {
    const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId);
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(params.storeId));
    const [storeSnapshot, userSnapshot] = await Promise.all([
        transaction.get(storeRef),
        transaction.get(userRef),
    ]);
    const storeData = storeSnapshot.data() || {};
    const lifecycle = storeData.answerlatticeWorkspaceLifecycle;
    if (
        !storeSnapshot.exists
        || !isAnswerlatticeStoreInScope(
            storeData,
            { tenantId: params.tenantId, storeId: params.storeId },
            storeSnapshot.id,
        )
        || !lifecycle
        || typeof lifecycle !== 'object'
        || Array.isArray(lifecycle)
        || !['erasing', 'erased'].includes(String(lifecycle.state || ''))
    ) {
        throw new AnswerlatticeStaffTransactionError('WORKSPACE_LIFECYCLE_INVALID');
    }
    if (!userSnapshot.exists) {
        throw new AnswerlatticeStaffTransactionError('USER_NOT_FOUND');
    }

    const currentData = userSnapshot.data() || {};
    const state = readAnswerlatticeStaffAccessState(currentData);
    if (!state || state.tenantId !== params.tenantId) {
        throw new AnswerlatticeStaffTransactionError('FORBIDDEN');
    }
    const currentMembership = getAnswerlatticeStaffMembership(state, params.storeId);
    if (!currentMembership) {
        return {
            accessChanged: false,
            accessRevision: state.accessRevision,
            currentData,
            memberships: state.memberships,
            nextData: currentData,
            primaryMembership: state.primaryMembership,
            replay: true,
        };
    }

    const memberships = state.memberships.filter(({ storeId }) => storeId !== params.storeId);
    const primaryMembership = selectAnswerlatticeStaffPrimaryMembership(
        memberships,
        state.primaryMembership?.storeId,
    );
    const accessRevision = state.accessRevision + 1;
    const accessFields = buildAnswerlatticeStaffAccessFields({
        accessRevision,
        active: memberships.length > 0,
        memberships,
        preferredStoreId: primaryMembership?.storeId,
        tenantId: params.tenantId,
    });
    const deletionFields = {
        deleted: memberships.length === 0,
        deletedAt: memberships.length === 0
            ? Timestamp.now()
            : null,
    };
    const nextData = {
        ...currentData,
        ...accessFields,
        ...deletionFields,
    };
    const update = sanitizeForFirestore({
        ...accessFields,
        ...deletionFields,
    }, { undefinedObjectValue: 'omit' }) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
    update[`membershipCreationRequests.${String(params.storeId)}`] = FieldValue.delete();
    transaction.update(userRef, update);

    return {
        accessChanged: true,
        accessRevision,
        currentData,
        memberships,
        nextData,
        primaryMembership,
        replay: false,
    };
});

export const getAnswerlatticeRoleAssignedUserIdsInTransaction = async (params: {
    db: FirebaseFirestore.Firestore;
    roleId: string;
    storeId: number;
    tenantId: number;
    transaction: FirebaseFirestore.Transaction;
}): Promise<{ complete: boolean; userIds: string[] }> => {
    const query = params.db.collection(DB_COLLECTIONS.USERS)
        .where('tenantId', '==', params.tenantId)
        .where('storeIds', 'array-contains', params.storeId)
        .limit(ANSWERLATTICE_STAFF_QUERY_LIMIT + 1);
    const snapshot = await params.transaction.get(query);
    const userIds = snapshot.docs.flatMap((document) => {
        const data = document.data();
        const state = readAnswerlatticeStaffAccessState(data);
        return (
            state
            && state.tenantId === params.tenantId
            && getAnswerlatticeStaffMembership(state, params.storeId)?.role === params.roleId
        ) ? [document.id] : [];
    });
    return {
        complete: snapshot.size <= ANSWERLATTICE_STAFF_QUERY_LIMIT,
        userIds,
    };
};

export const isAnswerlatticeRoleAssignedInTransaction = async (params: {
    db: FirebaseFirestore.Firestore;
    roleId: string;
    storeId: number;
    tenantId: number;
    transaction: FirebaseFirestore.Transaction;
}): Promise<boolean> => {
    const result = await getAnswerlatticeRoleAssignedUserIdsInTransaction(params);
    return !result.complete || result.userIds.length > 0;
};
