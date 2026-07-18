import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_ROLE_IDS } from '@data/shared/defaultRoles';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import type { StoreRoleDataType } from '@type/platform/roles';
import type { UserStoreMappingType } from '@type/platform/user';
import { Timestamp } from 'firebase-admin/firestore';
import {
    isStaffUnknownRecord,
    normalizePersistedStaffStoreMappings,
    normalizeStaffScopeNumericId,
    normalizeStaffStoreScopeDocumentId,
} from './scopeBoundary';

export type StaffConcurrencyErrorCode =
    | 'ALREADY_ASSIGNED'
    | 'DUPLICATE_STORE_MAPPING'
    | 'FORBIDDEN'
    | 'LAST_OWNER'
    | 'ROLE_IN_USE'
    | 'ROLE_NOT_FOUND'
    | 'STORE_MAPPING_NOT_FOUND'
    | 'STORE_NOT_FOUND'
    | 'USER_ALREADY_EXISTS'
    | 'USER_NOT_FOUND';

export class StaffConcurrencyError extends Error {
    readonly code: StaffConcurrencyErrorCode;

    constructor(code: StaffConcurrencyErrorCode) {
        super(code);
        Object.setPrototypeOf(this, StaffConcurrencyError.prototype);
        this.name = 'StaffConcurrencyError';
        this.code = code;
    }
}

type StaffUserMutation =
    | { kind: 'add'; mapping: UserStoreMappingType }
    | { kind: 'upsert'; mapping: UserStoreMappingType; verified?: boolean }
    | { active?: boolean; kind: 'replace'; mappings?: UserStoreMappingType[]; verified?: boolean }
    | { kind: 'remove'; storeId: number };

type StaffUserMutationContext = {
    currentData: FirebaseFirestore.DocumentData;
    currentMappings: UserStoreMappingType[];
    mappingsChanged: boolean;
    nextMappings: UserStoreMappingType[];
    shouldDeactivate: boolean;
};

type RunStaffUserMutationParams = {
    buildUpdate: (context: StaffUserMutationContext) => FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
    db: FirebaseFirestore.Firestore;
    mutation: StaffUserMutation;
    tenantId: number;
    userId: string;
};

type CreateStaffUserDocumentParams = {
    data: FirebaseFirestore.DocumentData;
    db: FirebaseFirestore.Firestore;
    mappings: UserStoreMappingType[];
    tenantId: number;
    userId: string;
};

type RunStaffRoleMutationParams<Result> = {
    actorEmail: string;
    buildResult: (roles: StoreRoleDataType[]) => {
        result: Result;
        roles: StoreRoleDataType[];
    };
    db: FirebaseFirestore.Firestore;
    deactivatingRoleId?: string;
    modifiedOn: FirebaseFirestore.Timestamp;
    storeId: number;
    tenantId: number;
};

type StaffAccessAssignment = {
    role: string;
    userId: string;
};

export type StaffAccessStateScope = {
    storeIds: number[];
    tenantId: number;
};

export type StaffAccessStateTransactionSnapshot = {
    ref: FirebaseFirestore.DocumentReference;
    snapshot: FirebaseFirestore.DocumentSnapshot;
    storeId: number;
};

class StaffAccessGuardExpansionError extends Error {
    readonly storeIds: number[];

    constructor(storeIds: number[]) {
        super('STAFF_ACCESS_GUARD_EXPANSION_REQUIRED');
        Object.setPrototypeOf(this, StaffAccessGuardExpansionError.prototype);
        this.name = 'StaffAccessGuardExpansionError';
        this.storeIds = storeIds;
    }
}

const getAccessStateId = (tenantId: number, storeId: number): string => `${tenantId}_${storeId}`;

const normalizeAssignments = (value: unknown): StaffAccessAssignment[] => {
    if (!Array.isArray(value)) return [];
    const assignments = new Map<string, StaffAccessAssignment>();
    value.forEach((candidate) => {
        if (!isStaffUnknownRecord(candidate)) return;
        const userId = typeof candidate.userId === 'string' ? candidate.userId.trim() : '';
        const role = typeof candidate.role === 'string' ? candidate.role.trim() : '';
        if (!userId || !role) return;
        assignments.set(userId, { role, userId });
    });
    return Array.from(assignments.values()).sort((left, right) => left.userId.localeCompare(right.userId));
};

const mappingsChanged = (
    currentMappings: UserStoreMappingType[],
    nextMappings: UserStoreMappingType[],
): boolean => {
    const comparable = (mappings: UserStoreMappingType[]) => mappings
        .map(({ role, storeId }) => ({ role: role || '', storeId }))
        .sort((left, right) => left.storeId - right.storeId);
    return JSON.stringify(comparable(currentMappings)) !== JSON.stringify(comparable(nextMappings));
};

const getUsersForStore = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    storeId: number,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> => {
    const storeIdVariants: Array<number | string> = [storeId, String(storeId)];
    const queries = [
        ...storeIdVariants.map((value) => db.collection(DB_COLLECTIONS.USERS).where('storeIds', 'array-contains', value).get()),
        ...storeIdVariants.map((value) => db.collection(DB_COLLECTIONS.USERS).where('storeId', '==', value).get()),
    ];
    const snapshots = await Promise.all(queries);
    const documents = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    snapshots.forEach((snapshot) => snapshot.docs.forEach((document) => {
        if (normalizeStaffScopeNumericId(document.data().tenantId) === tenantId) {
            documents.set(document.id, document);
        }
    }));
    return Array.from(documents.values());
};

const initializeAccessState = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    storeId: number,
): Promise<void> => {
    const stateRef = db.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE).doc(getAccessStateId(tenantId, storeId));
    if ((await stateRef.get()).exists) return;
    const users = await getUsersForStore(db, tenantId, storeId);
    const assignments = users.flatMap((document) => {
        const data = document.data();
        if (data.active === false || data.deleted === true || data.isVerified === false || isPlatformEntityBlocked(data)) return [];
        const mapping = normalizePersistedStaffStoreMappings(data.stores).find((item) => item.storeId === storeId);
        return mapping ? [{ role: mapping.role, userId: document.id }] : [];
    });

    await db.runTransaction(async (transaction) => {
        const current = await transaction.get(stateRef);
        if (current.exists) return;
        transaction.create(stateRef, {
            assignments: normalizeAssignments(assignments),
            revision: 0,
            storeId,
            tenantId,
            updatedAt: Timestamp.now(),
        });
    });
};

const initializeAccessStates = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    storeIds: number[],
): Promise<void> => {
    await Promise.all(Array.from(new Set(storeIds)).map((storeId) => initializeAccessState(db, tenantId, storeId)));
};

export const prepareStaffAccessStateScope = async (
    db: FirebaseFirestore.Firestore,
    data: FirebaseFirestore.DocumentData,
): Promise<StaffAccessStateScope | null> => {
    const tenantId = normalizeStaffScopeNumericId(data.tenantId);
    if (tenantId === null) return null;
    const storeIds = Array.from(new Set(
        normalizePersistedStaffStoreMappings(data.stores).map(({ storeId }) => storeId),
    )).sort((left, right) => left - right);
    if (!storeIds.length) return null;
    await initializeAccessStates(db, tenantId, storeIds);
    return { storeIds, tenantId };
};

export const readStaffAccessStateInTransaction = async (
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    scope: StaffAccessStateScope,
): Promise<StaffAccessStateTransactionSnapshot[]> => Promise.all(scope.storeIds.map(async (storeId) => {
    const ref = db.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE).doc(getAccessStateId(scope.tenantId, storeId));
    return { ref, snapshot: await transaction.get(ref), storeId };
}));

export const writeStaffBlockedAccessStateInTransaction = (
    transaction: FirebaseFirestore.Transaction,
    scope: StaffAccessStateScope,
    states: StaffAccessStateTransactionSnapshot[],
    currentData: FirebaseFirestore.DocumentData,
    userId: string,
    blocked: boolean,
): void => {
    if (normalizeStaffScopeNumericId(currentData.tenantId) !== scope.tenantId) {
        throw new StaffConcurrencyError('FORBIDDEN');
    }
    const mappings = normalizePersistedStaffStoreMappings(currentData.stores);
    if (mappings.some(({ storeId }) => !scope.storeIds.includes(storeId))) {
        throw new StaffConcurrencyError('FORBIDDEN');
    }
    const mappingByStoreId = new Map(mappings.map((mapping) => [mapping.storeId, mapping]));
    const canAssign = !blocked
        && currentData.active !== false
        && currentData.deleted !== true
        && currentData.isVerified !== false;

    states.forEach(({ ref, snapshot, storeId }) => {
        if (!snapshot.exists) throw new StaffConcurrencyError('FORBIDDEN');
        const assignments = new Map(
            normalizeAssignments(snapshot.data()?.assignments).map((assignment) => [assignment.userId, assignment]),
        );
        assignments.delete(userId);
        const mapping = mappingByStoreId.get(storeId);
        if (canAssign && mapping) assignments.set(userId, { role: mapping.role, userId });
        transaction.set(ref, {
            assignments: Array.from(assignments.values()).sort((left, right) => left.userId.localeCompare(right.userId)),
            revision: Number(snapshot.data()?.revision || 0) + 1,
            storeId,
            tenantId: scope.tenantId,
            updatedAt: Timestamp.now(),
        });
    });
};

const normalizeAndValidateMappings = (
    tenantId: number,
    mappings: UserStoreMappingType[],
    storesById: Map<number, FirebaseFirestore.DocumentData>,
): UserStoreMappingType[] => {
    const uniqueStoreIds = new Set(mappings.map(({ storeId }) => storeId));
    if (uniqueStoreIds.size !== mappings.length) throw new StaffConcurrencyError('DUPLICATE_STORE_MAPPING');

    return mappings.map((mapping) => {
        const data = storesById.get(mapping.storeId);
        if (
            !data
            || normalizeStaffScopeNumericId(data.tenantId) !== tenantId
            || data.active === false
            || data.deleted === true
            || isPlatformEntityBlocked(data)
        ) {
            throw new StaffConcurrencyError('STORE_NOT_FOUND');
        }
        const roles = Array.isArray(data.roles) ? data.roles as StoreRoleDataType[] : [];
        if (!roles.some((role) => role.id === mapping.role && role.active !== false)) {
            throw new StaffConcurrencyError('ROLE_NOT_FOUND');
        }
        return {
            role: mapping.role,
            storeId: mapping.storeId,
            name: typeof data.name === 'string' && data.name.trim()
                ? data.name.trim()
                : `Store ${mapping.storeId}`,
        };
    });
};

export const createStaffUserDocumentTransaction = async (
    params: CreateStaffUserDocumentParams,
): Promise<FirebaseFirestore.DocumentData> => {
    const orderedStoreIds = Array.from(new Set(params.mappings.map(({ storeId }) => storeId)))
        .sort((left, right) => left - right);
    await initializeAccessStates(params.db, params.tenantId, orderedStoreIds);

    return params.db.runTransaction(async (transaction) => {
        const stateRefs = orderedStoreIds.map((storeId) => (
            params.db.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE).doc(getAccessStateId(params.tenantId, storeId))
        ));
        const storeRefs = orderedStoreIds.map((storeId) => {
            const scope = normalizeStaffStoreScopeDocumentId(storeId);
            if (!scope) throw new StaffConcurrencyError('STORE_NOT_FOUND');
            return params.db.collection(DB_COLLECTIONS.STORES).doc(scope.documentId);
        });
        const stateSnapshots = await Promise.all(stateRefs.map((ref) => transaction.get(ref)));
        const storeSnapshots = await Promise.all(storeRefs.map((ref) => transaction.get(ref)));
        const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId);
        const userSnapshot = await transaction.get(userRef);
        if (userSnapshot.exists) throw new StaffConcurrencyError('USER_ALREADY_EXISTS');

        const storesById = new Map<number, FirebaseFirestore.DocumentData>();
        storeSnapshots.forEach((snapshot, index) => {
            if (snapshot.exists) storesById.set(orderedStoreIds[index], snapshot.data() || {});
        });
        const mappings = normalizeAndValidateMappings(params.tenantId, params.mappings, storesById);
        const assignmentMaps = new Map<number, Map<string, StaffAccessAssignment>>();
        stateSnapshots.forEach((snapshot, index) => {
            if (!snapshot.exists) throw new StaffAccessGuardExpansionError([orderedStoreIds[index]]);
            assignmentMaps.set(orderedStoreIds[index], new Map(
                normalizeAssignments(snapshot.data()?.assignments).map((assignment) => [assignment.userId, assignment]),
            ));
        });
        mappings.forEach((mapping) => assignmentMaps.get(mapping.storeId)?.set(params.userId, {
            role: mapping.role,
            userId: params.userId,
        }));
        stateRefs.forEach((stateRef, index) => transaction.set(stateRef, {
            assignments: Array.from(assignmentMaps.get(orderedStoreIds[index])?.values() || [])
                .sort((left, right) => left.userId.localeCompare(right.userId)),
            revision: Number(stateSnapshots[index].data()?.revision || 0) + 1,
            storeId: orderedStoreIds[index],
            tenantId: params.tenantId,
            updatedAt: Timestamp.now(),
        }));
        const data = {
            ...params.data,
            storeId: mappings[0]?.storeId,
            storeIds: mappings.map(({ storeId }) => storeId),
            stores: mappings,
        };
        transaction.create(userRef, data);
        return data;
    });
};

export const runStaffUserMutationTransaction = async (
    params: RunStaffUserMutationParams,
): Promise<StaffUserMutationContext & { updatedData: FirebaseFirestore.DocumentData }> => {
    const preflightSnapshot = await params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId).get();
    if (!preflightSnapshot.exists) throw new StaffConcurrencyError('USER_NOT_FOUND');
    const preflightMappings = normalizePersistedStaffStoreMappings(preflightSnapshot.data()?.stores);
    const requestedStoreIds = params.mutation.kind === 'add' || params.mutation.kind === 'upsert'
        ? [params.mutation.mapping.storeId]
        : params.mutation.kind === 'remove'
            ? [params.mutation.storeId]
            : (params.mutation.mappings || []).map(({ storeId }) => storeId);
    const accessChanged = params.mutation.kind !== 'replace'
        || params.mutation.active !== undefined
        || params.mutation.mappings !== undefined;
    const guardedStoreIds = new Set(accessChanged
        ? [...preflightMappings.map(({ storeId }) => storeId), ...requestedStoreIds]
        : []);

    for (let attempt = 0; attempt < 32; attempt += 1) {
        const orderedStoreIds = Array.from(guardedStoreIds).sort((left, right) => left - right);
        await initializeAccessStates(params.db, params.tenantId, orderedStoreIds);
        try {
            return await params.db.runTransaction(async (transaction) => {
                const stateRefs = orderedStoreIds.map((storeId) => (
                    params.db.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE).doc(getAccessStateId(params.tenantId, storeId))
                ));
                const storeRefs = orderedStoreIds.map((storeId) => {
                    const scope = normalizeStaffStoreScopeDocumentId(storeId);
                    if (!scope) throw new StaffConcurrencyError('STORE_NOT_FOUND');
                    return params.db.collection(DB_COLLECTIONS.STORES).doc(scope.documentId);
                });
                const stateSnapshots = await Promise.all(stateRefs.map((ref) => transaction.get(ref)));
                const storeSnapshots = await Promise.all(storeRefs.map((ref) => transaction.get(ref)));
                const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId);
                const userSnapshot = await transaction.get(userRef);
                if (!userSnapshot.exists) throw new StaffConcurrencyError('USER_NOT_FOUND');

                const currentData = userSnapshot.data() || {};
                if (normalizeStaffScopeNumericId(currentData.tenantId) !== params.tenantId) {
                    throw new StaffConcurrencyError('FORBIDDEN');
                }
                const currentMappings = normalizePersistedStaffStoreMappings(currentData.stores);
                if (!accessChanged) {
                    const context: StaffUserMutationContext = {
                        currentData,
                        currentMappings,
                        mappingsChanged: false,
                        nextMappings: currentMappings,
                        shouldDeactivate: false,
                    };
                    const update = params.buildUpdate(context);
                    transaction.update(userRef, update);
                    return { ...context, updatedData: { ...currentData, ...update } };
                }
                const unguardedStoreIds = currentMappings
                    .map(({ storeId }) => storeId)
                    .filter((storeId) => !guardedStoreIds.has(storeId));
                if (unguardedStoreIds.length) throw new StaffAccessGuardExpansionError(unguardedStoreIds);

                const mutation = params.mutation;
                let requestedMappings: UserStoreMappingType[];
                if (mutation.kind === 'add') {
                    if (currentMappings.some(({ storeId }) => storeId === mutation.mapping.storeId)) {
                        throw new StaffConcurrencyError('ALREADY_ASSIGNED');
                    }
                    requestedMappings = [...currentMappings, mutation.mapping];
                } else if (mutation.kind === 'upsert') {
                    requestedMappings = [
                        ...currentMappings.filter(({ storeId }) => storeId !== mutation.mapping.storeId),
                        mutation.mapping,
                    ];
                } else if (mutation.kind === 'remove') {
                    if (!currentMappings.some(({ storeId }) => storeId === mutation.storeId)) {
                        throw new StaffConcurrencyError('STORE_MAPPING_NOT_FOUND');
                    }
                    requestedMappings = currentMappings.filter(({ storeId }) => storeId !== mutation.storeId);
                } else {
                    requestedMappings = mutation.mappings || currentMappings;
                }
                const requestedUnguardedStoreIds = requestedMappings
                    .map(({ storeId }) => storeId)
                    .filter((storeId) => !guardedStoreIds.has(storeId));
                if (requestedUnguardedStoreIds.length) throw new StaffAccessGuardExpansionError(requestedUnguardedStoreIds);

                const storesById = new Map<number, FirebaseFirestore.DocumentData>();
                storeSnapshots.forEach((snapshot, index) => {
                    if (snapshot.exists) storesById.set(orderedStoreIds[index], snapshot.data() || {});
                });
                const nextMappings = requestedMappings.length
                    ? normalizeAndValidateMappings(params.tenantId, requestedMappings, storesById)
                    : [];
                const shouldDeactivate = mutation.kind === 'remove' && nextMappings.length === 0;
                const effectiveActive = mutation.kind === 'add' || mutation.kind === 'upsert'
                    ? true
                    : mutation.kind === 'replace' && mutation.active !== undefined
                        ? mutation.active
                        : shouldDeactivate ? false : currentData.active !== false;
                const effectiveVerified = (
                    mutation.kind === 'upsert' || mutation.kind === 'replace'
                ) && mutation.verified !== undefined
                    ? mutation.verified
                    : currentData.isVerified !== false;
                const assignmentMaps = new Map<number, Map<string, StaffAccessAssignment>>();
                stateSnapshots.forEach((snapshot, index) => {
                    if (!snapshot.exists) throw new StaffAccessGuardExpansionError([orderedStoreIds[index]]);
                    assignmentMaps.set(orderedStoreIds[index], new Map(
                        normalizeAssignments(snapshot.data()?.assignments).map((assignment) => [assignment.userId, assignment]),
                    ));
                });
                assignmentMaps.forEach((assignments) => assignments.delete(params.userId));
                if (effectiveActive && effectiveVerified) {
                    nextMappings.forEach((mapping) => assignmentMaps.get(mapping.storeId)?.set(params.userId, {
                        role: mapping.role,
                        userId: params.userId,
                    }));
                }

                const currentOwnerStoreIds = currentData.active === false
                    || currentData.deleted === true
                    || currentData.isVerified === false
                    ? []
                    : currentMappings.filter(({ role }) => role === DEFAULT_ROLE_IDS.OWNER).map(({ storeId }) => storeId);
                currentOwnerStoreIds.forEach((storeId) => {
                    const hasOwner = Array.from(assignmentMaps.get(storeId)?.values() || [])
                        .some(({ role }) => role === DEFAULT_ROLE_IDS.OWNER);
                    if (!hasOwner) throw new StaffConcurrencyError('LAST_OWNER');
                });

                const context: StaffUserMutationContext = {
                    currentData,
                    currentMappings,
                    mappingsChanged: mappingsChanged(currentMappings, nextMappings),
                    nextMappings,
                    shouldDeactivate,
                };
                const update = params.buildUpdate(context);
                stateRefs.forEach((stateRef, index) => transaction.set(stateRef, {
                    assignments: Array.from(assignmentMaps.get(orderedStoreIds[index])?.values() || [])
                        .sort((left, right) => left.userId.localeCompare(right.userId)),
                    revision: Number(stateSnapshots[index].data()?.revision || 0) + 1,
                    storeId: orderedStoreIds[index],
                    tenantId: params.tenantId,
                    updatedAt: Timestamp.now(),
                }));
                transaction.update(userRef, update);
                return { ...context, updatedData: { ...currentData, ...update } };
            });
        } catch (error) {
            const expansionStoreIds = error instanceof StaffAccessGuardExpansionError
                ? error.storeIds
                : isStaffUnknownRecord(error)
                    && error.message === 'STAFF_ACCESS_GUARD_EXPANSION_REQUIRED'
                    && Array.isArray(error.storeIds)
                    ? error.storeIds.map(normalizeStaffScopeNumericId).filter((storeId): storeId is number => storeId !== null)
                    : null;
            if (!expansionStoreIds?.length) throw error;
            expansionStoreIds.forEach((storeId) => guardedStoreIds.add(storeId));
        }
    }
    throw new Error('STAFF_ACCESS_GUARD_EXPANSION_FAILED');
};

export const runStaffRoleMutationTransaction = async <Result>(
    params: RunStaffRoleMutationParams<Result>,
): Promise<Result> => {
    await initializeAccessState(params.db, params.tenantId, params.storeId);
    return params.db.runTransaction(async (transaction) => {
        const stateRef = params.db.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE)
            .doc(getAccessStateId(params.tenantId, params.storeId));
        const storeScope = normalizeStaffStoreScopeDocumentId(params.storeId);
        if (!storeScope) throw new StaffConcurrencyError('STORE_NOT_FOUND');
        const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
        const stateSnapshot = await transaction.get(stateRef);
        const storeSnapshot = await transaction.get(storeRef);
        const store = storeSnapshot.exists ? storeSnapshot.data() : undefined;
        if (
            !store
            || normalizeStaffScopeNumericId(store.tenantId) !== params.tenantId
            || store.active === false
            || store.deleted === true
            || isPlatformEntityBlocked(store)
        ) {
            throw new StaffConcurrencyError('STORE_NOT_FOUND');
        }

        const assignments = normalizeAssignments(stateSnapshot.data()?.assignments);
        if (params.deactivatingRoleId && assignments.some(({ role }) => role === params.deactivatingRoleId)) {
            throw new StaffConcurrencyError('ROLE_IN_USE');
        }
        const currentRoles = Array.isArray(store.roles) ? store.roles as StoreRoleDataType[] : [];
        const { result, roles } = params.buildResult([...currentRoles]);
        transaction.set(stateRef, {
            assignments,
            revision: Number(stateSnapshot.data()?.revision || 0) + 1,
            storeId: params.storeId,
            tenantId: params.tenantId,
            updatedAt: Timestamp.now(),
        });
        transaction.update(storeRef, {
            modifiedBy: params.actorEmail,
            modifiedOn: params.modifiedOn,
            roles,
        });
        return result;
    });
};
