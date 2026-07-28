#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_ROLE_IDS } from '@data/shared/defaultRoles';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { addAuthPlatformUser, getOAuthUserDocumentId } from '@lib/auth/serverUserContext';
import {
    createStaffUserDocumentTransaction,
    prepareStaffAccessStateScope,
    readStaffAccessStateInTransaction,
    runStaffRoleMutationTransaction,
    runStaffUserMutationTransaction,
    StaffConcurrencyError,
    writeStaffBlockedAccessStateInTransaction,
} from '@lib/staffManagement/concurrencyBoundary';
import type { StoreRoleDataType } from '@type/platform/roles';

const tenantId = 93101;
const timestamp = () => admin.firestore.Timestamp.now();
const role = (id: string): StoreRoleDataType => ({
    active: true,
    createdBy: 'emulator',
    createdOn: '2026-07-11T00:00:00.000Z',
    description: id,
    id,
    modifiedBy: 'emulator',
    modifiedOn: '2026-07-11T00:00:00.000Z',
    name: id,
    permissions: {},
});

const seedStore = async (storeId: number, roles: StoreRoleDataType[] = [
    role(DEFAULT_ROLE_IDS.OWNER),
    role(DEFAULT_ROLE_IDS.STAFF),
]) => firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).set({
    active: true,
    deleted: false,
    name: `Store ${storeId}`,
    roles,
    storeId,
    tenantId,
});

const seedUser = async (userId: string, stores: Array<{ role: string; storeId: number }>) => (
    firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId).set({
        active: true,
        authDisabled: false,
        deleted: false,
        email: `${userId}@example.com`,
        storeId: stores[0]?.storeId,
        storeIds: stores.map(({ storeId }) => storeId),
        stores: stores.map((mapping) => ({ ...mapping, name: `Store ${mapping.storeId}` })),
        tenantId,
    })
);

const userUpdate = (nextMappings: Array<{ name: string; role: string; storeId: number }>) => ({
    modifiedOn: timestamp(),
    ...(nextMappings[0] ? { storeId: nextMappings[0].storeId } : {}),
    storeIds: nextMappings.map(({ storeId }) => storeId),
    stores: nextMappings,
});

const verifyConcurrentAddsPreserveEveryMapping = async (): Promise<void> => {
    const originalStoreId = 93200;
    const addedStoreIds = Array.from({ length: 8 }, (_, index) => 93201 + index);
    await Promise.all([originalStoreId, ...addedStoreIds].map((storeId) => seedStore(storeId)));
    await seedUser('staff-concurrent-add', [{ role: DEFAULT_ROLE_IDS.STAFF, storeId: originalStoreId }]);

    await Promise.all(addedStoreIds.map((storeId) => runStaffUserMutationTransaction({
        buildUpdate: ({ nextMappings }) => userUpdate(nextMappings),
        db: firestoreAdmin,
        mutation: {
            kind: 'add',
            mapping: { name: `Forged ${storeId}`, role: DEFAULT_ROLE_IDS.STAFF, storeId },
        },
        tenantId,
        userId: 'staff-concurrent-add',
    })));

    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-concurrent-add').get();
    const data = snapshot.data() || {};
    assert.deepEqual(
        [...data.storeIds].sort((left: number, right: number) => left - right),
        [originalStoreId, ...addedStoreIds],
        'Concurrent store additions must not lose mappings',
    );
    assert(
        data.stores.every((mapping: { name: string; storeId: number }) => mapping.name === `Store ${mapping.storeId}`),
        'Persisted mapping names must come from canonical store documents',
    );
};

const verifyConcurrentUpsertPreservesOtherMappings = async (): Promise<void> => {
    const originalStoreId = 93220;
    const addedStoreId = 93221;
    await Promise.all([originalStoreId, addedStoreId].map((storeId) => seedStore(storeId)));
    await seedUser('staff-concurrent-upsert', [{ role: DEFAULT_ROLE_IDS.STAFF, storeId: originalStoreId }]);
    await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-concurrent-upsert').update({ isVerified: false });

    await Promise.all([
        runStaffUserMutationTransaction({
            buildUpdate: ({ nextMappings }) => userUpdate(nextMappings),
            db: firestoreAdmin,
            mutation: {
                kind: 'add',
                mapping: { name: 'Forged added store', role: DEFAULT_ROLE_IDS.STAFF, storeId: addedStoreId },
            },
            tenantId,
            userId: 'staff-concurrent-upsert',
        }),
        runStaffUserMutationTransaction({
            buildUpdate: ({ nextMappings }) => ({
                ...userUpdate(nextMappings),
                firebaseUid: 'verified-auth-uid',
                isVerified: true,
            }),
            db: firestoreAdmin,
            mutation: {
                kind: 'upsert',
                mapping: { name: 'Forged original store', role: DEFAULT_ROLE_IDS.STAFF, storeId: originalStoreId },
                verified: true,
            },
            tenantId,
            userId: 'staff-concurrent-upsert',
        }),
    ]);

    const [snapshot, stateSnapshot] = await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-concurrent-upsert').get(),
        firestoreAdmin.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE).doc(`${tenantId}_${originalStoreId}`).get(),
    ]);
    const data = snapshot.data() || {};
    assert.deepEqual(
        [...data.storeIds].sort((left: number, right: number) => left - right),
        [originalStoreId, addedStoreId],
        'Auth-binding mapping upsert must not lose a concurrent store addition',
    );
    assert.equal(data.firebaseUid, 'verified-auth-uid');
    assert.equal(data.isVerified, true);
    assert(
        stateSnapshot.data()?.assignments?.some(({ userId }: { userId: string }) => userId === 'staff-concurrent-upsert'),
        'Successful Auth binding must activate the verified staff assignment in the same transaction',
    );
    assert(
        data.stores.every((mapping: { name: string; storeId: number }) => mapping.name === `Store ${mapping.storeId}`),
        'Auth-binding mapping upsert must keep canonical store names',
    );
};

const verifyConcurrentCreateClaimsOneUserAndOneAssignment = async (): Promise<void> => {
    const storeId = 93250;
    await seedStore(storeId);
    const create = () => createStaffUserDocumentTransaction({
        data: {
            active: true,
            authDisabled: false,
            deleted: false,
            email: 'staff-concurrent-create@example.com',
            tenantId,
        },
        db: firestoreAdmin,
        mappings: [{ name: 'Forged store name', role: DEFAULT_ROLE_IDS.STAFF, storeId }],
        tenantId,
        userId: 'staff-concurrent-create',
    });
    const results = await Promise.allSettled([create(), create()]);
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const rejected = results.find(({ status }) => status === 'rejected');
    assert(
        rejected?.status === 'rejected'
        && rejected.reason instanceof StaffConcurrencyError
        && rejected.reason.code === 'USER_ALREADY_EXISTS',
        'Concurrent staff creation must claim the deterministic user document once',
    );
    const [userSnapshot, stateSnapshot] = await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-concurrent-create').get(),
        firestoreAdmin.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE).doc(`${tenantId}_${storeId}`).get(),
    ]);
    assert.equal(userSnapshot.data()?.stores?.[0]?.name, `Store ${storeId}`);
    const assignments = stateSnapshot.data()?.assignments || [];
    assert.equal(assignments.filter(({ userId }: { userId: string }) => userId === 'staff-concurrent-create').length, 1);
};

const verifyConcurrentOAuthCreateClaimsOneUser = async (): Promise<void> => {
    const email = 'oauth-concurrent@example.com';
    const results = await Promise.all(Array.from({ length: 6 }, () => addAuthPlatformUser({
        active: true,
        email,
        isVerified: true,
        name: 'OAuth Concurrent',
        platformRole: 'OWNER',
        storeId: null,
        stores: [],
        tenantId: null,
    })));
    const expectedUserId = getOAuthUserDocumentId(email);
    assert(expectedUserId, 'OAuth user ID must be deterministic');
    assert(results.every(({ id }) => id === expectedUserId), 'Every concurrent OAuth create must resolve one user ID');
    const matchingUsers = await firestoreAdmin.collection(DB_COLLECTIONS.USERS).where('email', '==', email).get();
    assert.equal(matchingUsers.size, 1, 'Concurrent OAuth sign-ins must create one user document');
};

const verifyConcurrentOwnerRemovalPreservesOneOwner = async (): Promise<void> => {
    const storeId = 93300;
    await seedStore(storeId);
    await Promise.all([
        seedUser('staff-owner-a', [{ role: DEFAULT_ROLE_IDS.OWNER, storeId }]),
        seedUser('staff-owner-b', [{ role: DEFAULT_ROLE_IDS.OWNER, storeId }]),
    ]);

    const results = await Promise.allSettled(['staff-owner-a', 'staff-owner-b'].map((userId) => (
        runStaffUserMutationTransaction({
            buildUpdate: ({ currentData, nextMappings, shouldDeactivate }) => ({
                ...userUpdate(nextMappings),
                active: shouldDeactivate ? false : currentData.active,
                authDisabled: shouldDeactivate,
                deleted: shouldDeactivate,
            }),
            db: firestoreAdmin,
            mutation: { kind: 'remove', storeId },
            tenantId,
            userId,
        })
    )));
    const resultSummary = results.map((result) => result.status === 'fulfilled'
        ? 'fulfilled'
        : {
            code: result.reason?.code,
            message: result.reason?.message,
            name: result.reason?.name,
        });
    assert.equal(
        results.filter(({ status }) => status === 'fulfilled').length,
        1,
        JSON.stringify(resultSummary),
    );
    const rejected = results.find(({ status }) => status === 'rejected');
    assert(
        rejected?.status === 'rejected'
        && rejected.reason instanceof StaffConcurrencyError
        && rejected.reason.code === 'LAST_OWNER',
        'The second concurrent owner removal must be rejected as LAST_OWNER',
    );

    const ownerSnapshots = await Promise.all(['staff-owner-a', 'staff-owner-b'].map((userId) => (
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId).get()
    )));
    const activeOwners = ownerSnapshots.filter((snapshot) => {
        const data = snapshot.data() || {};
        return data.active !== false
            && data.deleted !== true
            && data.stores?.some((mapping: { role: string; storeId: number }) => (
                mapping.storeId === storeId && mapping.role === DEFAULT_ROLE_IDS.OWNER
            ));
    });
    assert.equal(activeOwners.length, 1, 'Exactly one active owner must remain');
};

const verifyBlockedOwnerDoesNotSatisfyLastOwner = async (): Promise<void> => {
    const storeId = 93350;
    await seedStore(storeId);
    await Promise.all([
        seedUser('staff-blocked-owner-a', [{ role: DEFAULT_ROLE_IDS.OWNER, storeId }]),
        seedUser('staff-blocked-owner-b', [{ role: DEFAULT_ROLE_IDS.OWNER, storeId }]),
    ]);
    const ownerARef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-blocked-owner-a');
    const ownerA = await ownerARef.get();
    const scope = await prepareStaffAccessStateScope(firestoreAdmin, ownerA.data() || {});
    assert(scope, 'Owner access state scope must be prepared');
    await firestoreAdmin.runTransaction(async (transaction) => {
        const states = await readStaffAccessStateInTransaction(transaction, firestoreAdmin, scope);
        const freshOwnerA = await transaction.get(ownerARef);
        writeStaffBlockedAccessStateInTransaction(
            transaction,
            scope,
            states,
            freshOwnerA.data() || {},
            freshOwnerA.id,
            true,
        );
        transaction.update(ownerARef, { blocked: true });
    });

    await assert.rejects(
        runStaffUserMutationTransaction({
            buildUpdate: ({ nextMappings }) => userUpdate(nextMappings),
            db: firestoreAdmin,
            mutation: { kind: 'remove', storeId },
            tenantId,
            userId: 'staff-blocked-owner-b',
        }),
        (error: unknown) => error instanceof StaffConcurrencyError && error.code === 'LAST_OWNER',
        'A blocked owner must not satisfy the last-owner invariant',
    );
};

const verifyUnverifiedOwnerDoesNotSatisfyLastOwner = async (): Promise<void> => {
    const storeId = 93375;
    await seedStore(storeId);
    await Promise.all([
        seedUser('staff-verified-owner', [{ role: DEFAULT_ROLE_IDS.OWNER, storeId }]),
        seedUser('staff-unverified-owner', [{ role: DEFAULT_ROLE_IDS.OWNER, storeId }]),
    ]);
    await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-unverified-owner').update({ isVerified: false });

    await assert.rejects(
        runStaffUserMutationTransaction({
            buildUpdate: ({ nextMappings }) => userUpdate(nextMappings),
            db: firestoreAdmin,
            mutation: { kind: 'remove', storeId },
            tenantId,
            userId: 'staff-verified-owner',
        }),
        (error: unknown) => error instanceof StaffConcurrencyError && error.code === 'LAST_OWNER',
        'An unverified Owner placeholder must not satisfy the last-owner invariant',
    );
};

const verifyRoleAssignmentAndDeactivationCannotBothCommit = async (): Promise<void> => {
    const storeId = 93400;
    const customRoleId = 'custom-concurrent';
    await seedStore(storeId, [
        role(DEFAULT_ROLE_IDS.OWNER),
        role(DEFAULT_ROLE_IDS.STAFF),
        role(customRoleId),
    ]);
    await seedUser('staff-role-race', [{ role: DEFAULT_ROLE_IDS.STAFF, storeId }]);

    const results = await Promise.allSettled([
        runStaffUserMutationTransaction({
            buildUpdate: ({ nextMappings }) => userUpdate(nextMappings),
            db: firestoreAdmin,
            mutation: {
                kind: 'replace',
                mappings: [{ name: 'Store 93400', role: customRoleId, storeId }],
            },
            tenantId,
            userId: 'staff-role-race',
        }),
        runStaffRoleMutationTransaction({
            actorEmail: 'owner@example.com',
            buildResult: (roles) => {
                const nextRoles = roles.map((currentRole) => (
                    currentRole.id === customRoleId ? { ...currentRole, active: false } : currentRole
                ));
                return { result: nextRoles, roles: nextRoles };
            },
            db: firestoreAdmin,
            deactivatingRoleId: customRoleId,
            modifiedOn: timestamp(),
            storeId,
            tenantId,
        }),
    ]);
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);

    const [userSnapshot, storeSnapshot] = await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-role-race').get(),
        firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get(),
    ]);
    const assignedRole = userSnapshot.data()?.stores?.[0]?.role;
    const persistedRole = storeSnapshot.data()?.roles?.find((candidate: StoreRoleDataType) => candidate.id === customRoleId);
    assert(
        assignedRole !== customRoleId || persistedRole?.active !== false,
        'An inactive role must never be committed as an active staff assignment',
    );
};

const verifyConcurrentRoleEditsPreserveBothChanges = async (): Promise<void> => {
    const storeId = 93500;
    await seedStore(storeId);
    await Promise.all(['custom-a', 'custom-b'].map((roleId) => runStaffRoleMutationTransaction({
        actorEmail: 'owner@example.com',
        buildResult: (roles) => {
            const nextRoles = [...roles, role(roleId)];
            return { result: nextRoles, roles: nextRoles };
        },
        db: firestoreAdmin,
        modifiedOn: timestamp(),
        storeId,
        tenantId,
    })));
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
    const roleIds = snapshot.data()?.roles?.map(({ id }: StoreRoleDataType) => id) || [];
    assert(roleIds.includes('custom-a') && roleIds.includes('custom-b'), 'Concurrent role edits must both persist');
};

const verifyMalformedAccessStateFailsClosed = async (): Promise<void> => {
    const storeId = 93550;
    const stateRef = firestoreAdmin.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE)
        .doc(`${tenantId}_${storeId}`);
    await seedStore(storeId);
    await runStaffRoleMutationTransaction({
        actorEmail: 'owner@example.com',
        buildResult: (roles) => ({ result: roles, roles }),
        db: firestoreAdmin,
        modifiedOn: timestamp(),
        storeId,
        tenantId,
    });
    const validState = (await stateRef.get()).data();
    assert(validState, 'Access state initialization must persist exact guard truth');

    const malformedStates: Array<Record<string, unknown>> = [
        { revision: '1' },
        { tenantId: tenantId + 1 },
        {
            assignments: [
                { role: DEFAULT_ROLE_IDS.OWNER, userId: 'duplicate-owner' },
                { role: DEFAULT_ROLE_IDS.STAFF, userId: 'duplicate-owner' },
            ],
        },
        {
            assignments: Array.from({ length: 501 }, (_, index) => ({
                role: DEFAULT_ROLE_IDS.STAFF,
                userId: `overflow-staff-${index}`,
            })),
        },
    ];

    for (const malformed of malformedStates) {
        await stateRef.set({ ...validState, ...malformed });
        await assert.rejects(
            runStaffRoleMutationTransaction({
                actorEmail: 'owner@example.com',
                buildResult: (roles) => ({ result: roles, roles }),
                db: firestoreAdmin,
                modifiedOn: timestamp(),
                storeId,
                tenantId,
            }),
            (error: unknown) => error instanceof StaffConcurrencyError && error.code === 'FORBIDDEN',
            'Malformed staff access guard state must fail closed before store-role mutation',
        );
    }
};

const verifyLegacyMappingWithoutAliasesStillGuardsRole = async (): Promise<void> => {
    const storeId = 93575;
    const customRoleId = 'legacy-mapping-role';
    await seedStore(storeId, [
        role(DEFAULT_ROLE_IDS.OWNER),
        role(DEFAULT_ROLE_IDS.STAFF),
        role(customRoleId),
    ]);
    await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('staff-legacy-alias-gap').set({
        active: true,
        deleted: false,
        email: 'staff-legacy-alias-gap@example.com',
        isVerified: true,
        stores: [{ name: `Store ${storeId}`, role: customRoleId, storeId }],
        tenantId,
    });

    await assert.rejects(
        runStaffRoleMutationTransaction({
            actorEmail: 'owner@example.com',
            buildResult: (roles) => ({
                result: roles.map((currentRole) => (
                    currentRole.id === customRoleId ? { ...currentRole, active: false } : currentRole
                )),
                roles: roles.map((currentRole) => (
                    currentRole.id === customRoleId ? { ...currentRole, active: false } : currentRole
                )),
            }),
            db: firestoreAdmin,
            deactivatingRoleId: customRoleId,
            modifiedOn: timestamp(),
            storeId,
            tenantId,
        }),
        (error: unknown) => error instanceof StaffConcurrencyError && error.code === 'ROLE_IN_USE',
        'A legacy exact store mapping must guard role use even when storeId/storeIds aliases are missing',
    );
};

const run = async (): Promise<void> => {
    assert(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
    await verifyConcurrentAddsPreserveEveryMapping();
    await verifyConcurrentUpsertPreservesOtherMappings();
    await verifyConcurrentCreateClaimsOneUserAndOneAssignment();
    await verifyConcurrentOAuthCreateClaimsOneUser();
    await verifyConcurrentOwnerRemovalPreservesOneOwner();
    await verifyBlockedOwnerDoesNotSatisfyLastOwner();
    await verifyUnverifiedOwnerDoesNotSatisfyLastOwner();
    await verifyRoleAssignmentAndDeactivationCannotBothCommit();
    await verifyConcurrentRoleEditsPreserveBothChanges();
    await verifyMalformedAccessStateFailsClosed();
    await verifyLegacyMappingWithoutAliasesStillGuardsRole();
    console.log('Staff concurrency emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
