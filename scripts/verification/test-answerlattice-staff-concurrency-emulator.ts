#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    createDefaultAnswerlatticeRoles,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
} from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { syncAnswerlatticeStaffProductAccountBridge } from '@lib/answerlattice/staffAccessBridge';
import {
    AnswerlatticeStaffTransactionError,
    createAnswerlatticeStaffMembershipTransaction,
    isAnswerlatticeRoleAssignedInTransaction,
    removeAnswerlatticeStaffMembershipTransaction,
    updateAnswerlatticeStaffMembershipTransaction,
} from '@lib/answerlattice/staffAccessTransactions';

const tenantId = 781001;
const customRoleId = 'custom-concurrency';
const timestamp = () => admin.firestore.Timestamp.now();

const rolesForStore = (storeId: number) => [
    ...createDefaultAnswerlatticeRoles({ createdBy: 'emulator', sId: storeId, tId: tenantId }),
    {
        active: true,
        createdBy: 'emulator',
        createdOn: '2026-07-13T00:00:00.000Z',
        description: 'Custom concurrency role',
        id: customRoleId,
        name: 'Custom concurrency',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        permissions: {},
        sId: storeId,
        tId: tenantId,
    },
];

const seedStore = async (storeId: number) => firestoreAdmin
    .collection(DB_COLLECTIONS.STORES)
    .doc(String(storeId))
    .set({
        active: true,
        answerlatticeRoles: rolesForStore(storeId),
        deleted: false,
        name: `Workspace ${storeId}`,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        sId: storeId,
        storeId,
        tId: tenantId,
        tenantId,
    });

const seedUser = async (params: {
    active?: boolean;
    authDisabled?: boolean;
    deleted?: boolean;
    memberships: Array<{ name: string; role: string; storeId: number }>;
    tenant?: number;
    userId: string;
}) => {
    const scopedTenantId = params.tenant || tenantId;
    const primary = params.memberships[0];
    await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(params.userId).set({
        accessRevision: 1,
        active: params.active ?? true,
        authDisabled: params.authDisabled ?? false,
        deleted: params.deleted ?? false,
        email: `${params.userId}@example.com`,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: primary?.role,
        sId: primary?.storeId,
        storeId: primary?.storeId,
        storeIds: params.memberships.map(({ storeId }) => storeId),
        stores: params.memberships,
        tId: scopedTenantId,
        tenantId: scopedTenantId,
    });
};

const lifecycleUpdate = () => ({
    deletedAt: timestamp(),
    modifiedOn: timestamp(),
});

const verifyConcurrentOwnerRemoval = async () => {
    const storeId = 781101;
    await seedStore(storeId);
    await Promise.all([
        seedUser({ memberships: [{ name: 'A', role: 'owner', storeId }], userId: 'al-owner-a' }),
        seedUser({ memberships: [{ name: 'B', role: 'owner', storeId }], userId: 'al-owner-b' }),
    ]);

    const results = await Promise.allSettled(['al-owner-a', 'al-owner-b'].map((userId) => (
        removeAnswerlatticeStaffMembershipTransaction({
            db: firestoreAdmin,
            lifecycleUpdate: lifecycleUpdate(),
            storeId,
            tenantId,
            userId,
        })
    )));
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const rejected = results.find(({ status }) => status === 'rejected');
    assert(
        rejected?.status === 'rejected'
        && rejected.reason instanceof AnswerlatticeStaffTransactionError
        && rejected.reason.code === 'LAST_OWNER',
    );

    const snapshots = await Promise.all(['al-owner-a', 'al-owner-b'].map((userId) => (
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId).get()
    )));
    const activeOwners = snapshots.filter((snapshot) => {
        const data = snapshot.data() || {};
        return data.active !== false
            && data.deleted !== true
            && data.stores?.some((membership: { role: string; storeId: number }) => (
                membership.storeId === storeId && membership.role === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
            ));
    });
    assert.equal(activeOwners.length, 1);
};

const verifyMembershipPreservationAndScope = async () => {
    const firstStoreId = 781201;
    const secondStoreId = 781202;
    await Promise.all([seedStore(firstStoreId), seedStore(secondStoreId)]);
    await seedUser({
        memberships: [
            { name: 'Primary', role: 'owner', storeId: firstStoreId },
            { name: 'Second', role: 'staff', storeId: secondStoreId },
        ],
        userId: 'al-multi-workspace',
    });
    await seedUser({
        memberships: [{ name: 'Primary guard', role: 'owner', storeId: firstStoreId }],
        userId: 'al-multi-workspace-owner-guard',
    });

    const updated = await updateAnswerlatticeStaffMembershipTransaction({
        db: firestoreAdmin,
        profileUpdate: { modifiedOn: timestamp() },
        roleId: customRoleId,
        storeId: secondStoreId,
        storeName: 'Second',
        tenantId,
        userId: 'al-multi-workspace',
    });
    assert.deepEqual(updated.memberships.map(({ storeId }) => storeId), [firstStoreId, secondStoreId]);
    assert.equal(updated.primaryMembership?.storeId, firstStoreId);
    assert.equal(updated.nextData.role, DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER);
    assert.equal(updated.memberships[1].role, customRoleId);

    await assert.rejects(
        updateAnswerlatticeStaffMembershipTransaction({
            active: false,
            db: firestoreAdmin,
            profileUpdate: { modifiedOn: timestamp() },
            storeId: secondStoreId,
            storeName: 'Second',
            tenantId,
            userId: 'al-multi-workspace',
        }),
        (error: unknown) => error instanceof AnswerlatticeStaffTransactionError
            && error.code === 'MULTI_WORKSPACE_ACTIVE_CHANGE',
    );

    await seedUser({
        memberships: [
            { name: 'Platform primary', role: 'staff', storeId: firstStoreId },
            { name: 'Platform second', role: 'staff', storeId: secondStoreId },
        ],
        userId: 'al-platform-multi-workspace',
    });
    const platformDeactivated = await updateAnswerlatticeStaffMembershipTransaction({
        active: false,
        allowMultiWorkspaceActiveChange: true,
        db: firestoreAdmin,
        profileUpdate: { modifiedOn: timestamp() },
        storeId: secondStoreId,
        storeName: 'Second',
        tenantId,
        userId: 'al-platform-multi-workspace',
    });
    assert.equal(platformDeactivated.nextData.active, false);
    assert.equal(platformDeactivated.nextData.authDisabled, true);
    const platformReactivated = await updateAnswerlatticeStaffMembershipTransaction({
        active: true,
        allowMultiWorkspaceActiveChange: true,
        db: firestoreAdmin,
        profileUpdate: { modifiedOn: timestamp() },
        storeId: secondStoreId,
        storeName: 'Second',
        tenantId,
        userId: 'al-platform-multi-workspace',
    });
    assert.equal(platformReactivated.nextData.active, true);
    assert.equal(platformReactivated.nextData.authDisabled, false);

    const soleOwnerStoreId = 781203;
    const recoveryStoreId = 781204;
    await Promise.all([seedStore(soleOwnerStoreId), seedStore(recoveryStoreId)]);
    await seedUser({
        memberships: [
            { name: 'Sole owner', role: 'owner', storeId: soleOwnerStoreId },
            { name: 'Recovery workspace', role: 'staff', storeId: recoveryStoreId },
        ],
        userId: 'al-platform-cross-workspace-owner',
    });
    await assert.rejects(
        updateAnswerlatticeStaffMembershipTransaction({
            active: false,
            allowMultiWorkspaceActiveChange: true,
            db: firestoreAdmin,
            profileUpdate: { modifiedOn: timestamp() },
            storeId: recoveryStoreId,
            storeName: 'Recovery workspace',
            tenantId,
            userId: 'al-platform-cross-workspace-owner',
        }),
        (error: unknown) => error instanceof AnswerlatticeStaffTransactionError
            && error.code === 'LAST_OWNER',
        'Platform account recovery must protect Owner memberships in every affected workspace.',
    );

    const removed = await removeAnswerlatticeStaffMembershipTransaction({
        db: firestoreAdmin,
        lifecycleUpdate: lifecycleUpdate(),
        storeId: firstStoreId,
        tenantId,
        userId: 'al-multi-workspace',
    });
    assert.deepEqual(removed.memberships.map(({ storeId }) => storeId), [secondStoreId]);
    assert.equal(removed.primaryMembership?.storeId, secondStoreId);
    assert.equal(removed.nextData.storeId, secondStoreId);
    assert.equal(removed.nextData.sId, secondStoreId);
    assert.equal(removed.nextData.role, customRoleId);

    await seedUser({
        active: true,
        authDisabled: true,
        memberships: [
            { name: 'Disabled primary', role: 'owner', storeId: firstStoreId },
            { name: 'Disabled second', role: 'staff', storeId: secondStoreId },
        ],
        userId: 'al-disabled-multi-workspace',
    });
    const disabledRemoval = await removeAnswerlatticeStaffMembershipTransaction({
        db: firestoreAdmin,
        lifecycleUpdate: lifecycleUpdate(),
        storeId: secondStoreId,
        tenantId,
        userId: 'al-disabled-multi-workspace',
    });
    assert.equal(disabledRemoval.nextData.active, false);
    assert.equal(disabledRemoval.nextData.authDisabled, true);
    assert.deepEqual(disabledRemoval.nextData.storeIds, [firstStoreId]);

    await seedUser({
        memberships: [{ name: 'Foreign', role: 'staff', storeId: secondStoreId }],
        tenant: tenantId + 1,
        userId: 'al-foreign-user',
    });
    await assert.rejects(
        removeAnswerlatticeStaffMembershipTransaction({
            db: firestoreAdmin,
            lifecycleUpdate: lifecycleUpdate(),
            storeId: secondStoreId,
            tenantId,
            userId: 'al-foreign-user',
        }),
        (error: unknown) => error instanceof AnswerlatticeStaffTransactionError
            && error.code === 'FORBIDDEN',
    );
};

const verifyCreateIdempotencyAndConcurrentMerge = async () => {
    const firstStoreId = 781301;
    const secondStoreId = 781302;
    await Promise.all([seedStore(firstStoreId), seedStore(secondStoreId)]);
    const baseData = {
        createdOn: timestamp(),
        email: 'al-idempotent@example.com',
        name: 'Idempotent member',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
    };
    const first = () => createAnswerlatticeStaffMembershipTransaction({
        baseData,
        db: firestoreAdmin,
        fingerprint: 'fingerprint-1',
        membership: { name: 'First', role: 'staff', storeId: firstStoreId },
        requestId: 'request-1',
        tenantId,
        userId: 'al-idempotent',
    });
    const replayResults = await Promise.all([first(), first()]);
    assert.equal(replayResults.filter(({ replay }) => replay).length, 1);
    assert.equal(replayResults.filter(({ replay }) => !replay).length, 1);

    await assert.rejects(
        createAnswerlatticeStaffMembershipTransaction({
            baseData,
            db: firestoreAdmin,
            fingerprint: 'changed-fingerprint',
            membership: { name: 'First', role: 'staff', storeId: firstStoreId },
            requestId: 'request-1',
            tenantId,
            userId: 'al-idempotent',
        }),
        (error: unknown) => error instanceof AnswerlatticeStaffTransactionError
            && error.code === 'IDEMPOTENCY_CONFLICT',
    );

    const merged = await createAnswerlatticeStaffMembershipTransaction({
        baseData,
        db: firestoreAdmin,
        fingerprint: 'fingerprint-2',
        membership: { name: 'Second', role: 'staff', storeId: secondStoreId },
        requestId: 'request-2',
        tenantId,
        userId: 'al-idempotent',
    });
    assert.deepEqual(merged.memberships.map(({ storeId }) => storeId), [firstStoreId, secondStoreId]);
    assert.equal(merged.primaryMembership?.storeId, firstStoreId);

    await seedUser({
        active: false,
        authDisabled: true,
        memberships: [{ name: 'Inactive first', role: 'staff', storeId: firstStoreId }],
        userId: 'al-inactive-membership',
    });
    await assert.rejects(
        createAnswerlatticeStaffMembershipTransaction({
            baseData,
            db: firestoreAdmin,
            fingerprint: 'inactive-fingerprint',
            membership: { name: 'Inactive second', role: 'staff', storeId: secondStoreId },
            requestId: 'inactive-request',
            tenantId,
            userId: 'al-inactive-membership',
        }),
        (error: unknown) => error instanceof AnswerlatticeStaffTransactionError
            && error.code === 'INACTIVE_ACCOUNT_WITH_MEMBERSHIPS',
    );

    const staleReplayUserId = 'al-stale-create-replay';
    const staleReplayRequest = {
        baseData: {
            ...baseData,
            email: 'al-stale-replay@example.com',
        },
        db: firestoreAdmin,
        fingerprint: 'stale-replay-fingerprint',
        membership: { name: 'Stale replay', role: 'staff', storeId: firstStoreId },
        requestId: 'stale-replay-request',
        tenantId,
        userId: staleReplayUserId,
    };
    await createAnswerlatticeStaffMembershipTransaction(staleReplayRequest);
    await removeAnswerlatticeStaffMembershipTransaction({
        db: firestoreAdmin,
        lifecycleUpdate: lifecycleUpdate(),
        storeId: firstStoreId,
        tenantId,
        userId: staleReplayUserId,
    });
    await assert.rejects(
        createAnswerlatticeStaffMembershipTransaction(staleReplayRequest),
        (error: unknown) => error instanceof AnswerlatticeStaffTransactionError
            && error.code === 'IDEMPOTENCY_CONFLICT',
        'A delayed create replay must not restore a removed workspace membership.',
    );
    const explicitReAdd = await createAnswerlatticeStaffMembershipTransaction({
        ...staleReplayRequest,
        fingerprint: 'explicit-readd-fingerprint',
        requestId: 'explicit-readd-request',
    });
    assert.equal(explicitReAdd.replay, false);
    assert.deepEqual(explicitReAdd.memberships.map(({ storeId }) => storeId), [firstStoreId]);
    assert.equal(explicitReAdd.nextData.deleted, false);
    assert.equal(explicitReAdd.nextData.deletedAt, null);
};

const verifyRoleAssignmentAndDisableCannotBothCommit = async () => {
    const storeId = 781401;
    const userId = 'al-role-race';
    await seedStore(storeId);
    await seedUser({ memberships: [{ name: 'Role race', role: 'staff', storeId }], userId });

    const disableRole = () => firestoreAdmin.runTransaction(async (transaction) => {
        const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const storeSnapshot = await transaction.get(storeRef);
        assert(storeSnapshot.exists);
        if (await isAnswerlatticeRoleAssignedInTransaction({
            db: firestoreAdmin,
            roleId: customRoleId,
            storeId,
            tenantId,
            transaction,
        })) {
            throw new AnswerlatticeStaffTransactionError('ROLE_IN_USE');
        }
        const nextRoles = (storeSnapshot.data()?.answerlatticeRoles || []).map((role: { active?: boolean; id: string }) => (
            role.id === customRoleId ? { ...role, active: false } : role
        ));
        transaction.update(storeRef, { answerlatticeRoles: nextRoles });
    });
    const assignRole = () => updateAnswerlatticeStaffMembershipTransaction({
        db: firestoreAdmin,
        profileUpdate: { modifiedOn: timestamp() },
        roleId: customRoleId,
        storeId,
        storeName: 'Role race',
        tenantId,
        userId,
    });

    const results = await Promise.allSettled([disableRole(), assignRole()]);
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const [userSnapshot, storeSnapshot] = await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId).get(),
        firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get(),
    ]);
    const assignedRole = userSnapshot.data()?.stores?.[0]?.role;
    const customRole = storeSnapshot.data()?.answerlatticeRoles?.find((role: { id: string }) => role.id === customRoleId);
    assert(
        (assignedRole === customRoleId && customRole?.active !== false)
        || (assignedRole !== customRoleId && customRole?.active === false),
        'A disabled role must never remain assigned to an active member.',
    );

    const duplicateRoleStoreId = 781402;
    await seedStore(duplicateRoleStoreId);
    const duplicateStoreRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(duplicateRoleStoreId));
    const duplicateStoreSnapshot = await duplicateStoreRef.get();
    await duplicateStoreRef.update({
        answerlatticeRoles: [
            ...(duplicateStoreSnapshot.data()?.answerlatticeRoles || []),
            {
                active: true,
                id: customRoleId,
                name: 'Duplicate authority',
                permissions: { canAssignRoles: true },
            },
        ],
    });
    await assert.rejects(
        createAnswerlatticeStaffMembershipTransaction({
            baseData: { email: 'duplicate-role@example.com', name: 'Duplicate role member' },
            db: firestoreAdmin,
            fingerprint: 'duplicate-role-fingerprint',
            membership: { name: 'Duplicate role', role: customRoleId, storeId: duplicateRoleStoreId },
            requestId: 'duplicate-role-request',
            tenantId,
            userId: 'al-duplicate-role-member',
        }),
        (error: unknown) => error instanceof AnswerlatticeStaffTransactionError
            && error.code === 'ROLE_NOT_FOUND',
        'An ambiguous duplicate custom role must fail closed during assignment.',
    );

    const inactiveAssignedUserId = 'al-inactive-custom-role-member';
    await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(inactiveAssignedUserId).set({
        accessRevision: 1,
        active: false,
        authDisabled: true,
        deleted: false,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: customRoleId,
        sId: duplicateRoleStoreId,
        storeId: duplicateRoleStoreId,
        storeIds: [duplicateRoleStoreId],
        stores: [{ name: 'Duplicate role', role: customRoleId, storeId: duplicateRoleStoreId }],
        tId: tenantId,
        tenantId,
    });
    await firestoreAdmin.runTransaction(async (transaction) => {
        assert.equal(await isAnswerlatticeRoleAssignedInTransaction({
            db: firestoreAdmin,
            roleId: customRoleId,
            storeId: duplicateRoleStoreId,
            tenantId,
            transaction,
        }), true, 'Inactive memberships must continue to protect their referenced custom role.');
    });
};

const verifyBridgeRejectsStaleRevision = async () => {
    const firstStoreId = 781501;
    const secondStoreId = 781502;
    const defaultUserId = 'al-default-bridge';
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(defaultUserId);
    await userRef.set({
        email: 'al-default-bridge@example.com',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        storeId: firstStoreId,
        tenantId,
    });
    const memberships = [
        { name: 'First', role: 'owner', storeId: firstStoreId },
        { name: 'Second', role: 'staff', storeId: secondStoreId },
    ];
    assert.equal(await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 3,
        active: true,
        db: firestoreAdmin,
        defaultUserId,
        email: 'al-default-bridge@example.com',
        fallbackStoreId: firstStoreId,
        memberships,
        name: 'Bridge user',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: defaultUserId,
    }), true);
    assert.equal(await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 3,
        active: true,
        db: firestoreAdmin,
        defaultUserId,
        email: 'al-default-bridge@example.com',
        fallbackStoreId: firstStoreId,
        loginUsername: '7712345678',
        memberships,
        name: 'Bridge user renamed',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: defaultUserId,
    }), true, 'An equal revision must still repair changed profile and login fields.');
    assert.equal(await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 3,
        active: true,
        db: firestoreAdmin,
        defaultUserId,
        email: 'al-default-bridge@example.com',
        fallbackStoreId: firstStoreId,
        loginUsername: '7712345678',
        memberships,
        name: 'Bridge user renamed',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: defaultUserId,
    }), false, 'An exact equal-revision replay must not write again.');
    assert.equal(await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 2,
        active: true,
        db: firestoreAdmin,
        defaultUserId,
        email: 'al-default-bridge@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [memberships[0]],
        name: 'Stale bridge user',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: defaultUserId,
    }), false);
    const data = (await userRef.get()).data() || {};
    assert.equal(data.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.accessRevision, 3);
    assert.deepEqual(data.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.storeIds, [firstStoreId, secondStoreId]);
    assert.deepEqual(data.storeIds, [firstStoreId, secondStoreId]);
    assert.equal(data.loginUsername, '7712345678');
    assert.equal(data.name, 'Bridge user renamed');
    assert.equal(data.staffLoginId, 'S-7712345678');

    const legacyRevisionUserId = 'al-default-bridge-legacy-revision';
    const legacyRevisionRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(legacyRevisionUserId);
    await legacyRevisionRef.set({
        accessRevision: 5,
        active: true,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: 'owner',
        storeId: secondStoreId,
        storeIds: [secondStoreId],
        tenantId,
    });
    assert.equal(await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 4,
        active: true,
        db: firestoreAdmin,
        defaultUserId: legacyRevisionUserId,
        email: 'legacy-revision@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [memberships[0]],
        name: 'Stale legacy revision',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: legacyRevisionUserId,
    }), false, 'A legacy root access revision must reject a stale nested-account bridge write.');
    const legacyRevisionData = (await legacyRevisionRef.get()).data() || {};
    assert.equal(legacyRevisionData.accessRevision, 5);
    assert.equal(legacyRevisionData.storeId, secondStoreId);
    assert.equal(legacyRevisionData.productAccounts, undefined);

    const legacyAliasUserId = 'al-default-bridge-legacy-aliases';
    const legacyAliasRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(legacyAliasUserId);
    await legacyAliasRef.set({
        accessRevision: 1,
        active: true,
        authDisabled: false,
        email: 'legacy-alias@example.com',
        isVerified: true,
        loginUsername: '',
        name: 'Legacy alias',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productAccounts: {
            [PRODUCT_IDS.ANSWERLATTICE]: {
                accessRevision: 1,
                active: true,
                authDisabled: false,
                deleted: false,
                role: 'owner',
                storeId: String(firstStoreId),
                storeIds: [String(firstStoreId)],
                tenantId: String(tenantId),
            },
        },
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: 'owner',
        sId: firstStoreId,
        staffAuthMode: 'email',
        staffLoginId: '',
        storeIds: [firstStoreId],
        stores: [memberships[0]],
        tId: tenantId,
    });
    assert.equal(await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 1,
        active: true,
        db: firestoreAdmin,
        defaultUserId: legacyAliasUserId,
        email: 'legacy-alias@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [memberships[0]],
        name: 'Legacy alias',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: legacyAliasUserId,
    }), true, 'Equal-revision legacy aliases must be canonicalized instead of treated as an exact replay.');
    const legacyAliasData = (await legacyAliasRef.get()).data() || {};
    assert.equal(legacyAliasData.storeId, firstStoreId);
    assert.equal(legacyAliasData.tenantId, tenantId);
    assert.equal(legacyAliasData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.storeId, firstStoreId);
    assert.deepEqual(legacyAliasData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.storeIds, [firstStoreId]);
    assert.equal(legacyAliasData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.tenantId, tenantId);

    const menuListUserId = 'al-default-bridge-menulist-root';
    const menuListRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(menuListUserId);
    await menuListRef.set({
        pId: 'ML',
        productId: 'ML',
        role: 'owner',
        storeId: 991,
        tenantId: 990,
    });
    await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 1,
        active: true,
        db: firestoreAdmin,
        defaultUserId: menuListUserId,
        email: 'menulist-root@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [memberships[0]],
        name: 'MenuList root',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: menuListUserId,
    });
    const menuListData = (await menuListRef.get()).data() || {};
    assert.equal(menuListData.pId, 'ML');
    assert.equal(menuListData.tenantId, 990);
    assert.equal(menuListData.storeId, 991);
    assert.equal(menuListData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.tenantId, tenantId);

    const conflictingRootUserId = 'al-default-bridge-conflicting-root';
    const conflictingRootRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(conflictingRootUserId);
    await conflictingRootRef.set({
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: 'owner',
        storeId: 995,
        tenantId: 994,
    });
    await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 1,
        active: true,
        db: firestoreAdmin,
        defaultUserId: conflictingRootUserId,
        email: 'conflicting-root@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [memberships[0]],
        name: 'Conflicting root',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: conflictingRootUserId,
    });
    const conflictingRootData = (await conflictingRootRef.get()).data() || {};
    assert.equal(conflictingRootData.pId, PRODUCT_IDS.MENULIST);
    assert.equal(conflictingRootData.productId, PRODUCT_IDS.ANSWERLATTICE);
    assert.equal(conflictingRootData.tenantId, 994);
    assert.equal(conflictingRootData.storeId, 995);
    assert.equal(conflictingRootData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.tenantId, tenantId);

    const legacyMenuListUserId = 'al-default-bridge-menulist-legacy-root';
    const legacyMenuListRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(legacyMenuListUserId);
    await legacyMenuListRef.set({
        pId: 'ML',
        productId: 'ML',
        role: 'owner',
        sId: 993,
        tId: 992,
    });
    await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 1,
        active: true,
        db: firestoreAdmin,
        defaultUserId: legacyMenuListUserId,
        email: 'menulist-legacy-root@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [memberships[0]],
        name: 'MenuList legacy root',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: legacyMenuListUserId,
    });
    const legacyMenuListData = (await legacyMenuListRef.get()).data() || {};
    assert.equal(legacyMenuListData.pId, 'ML');
    assert.equal(legacyMenuListData.tId, 992);
    assert.equal(legacyMenuListData.sId, 993);
    assert.equal(legacyMenuListData.tenantId, undefined);
    assert.equal(legacyMenuListData.storeId, undefined);

    const removedBridgeUserId = 'al-default-bridge-removed';
    const removedBridgeRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(removedBridgeUserId);
    await removedBridgeRef.set({
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        storeId: firstStoreId,
        tenantId,
    });
    await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 4,
        active: false,
        db: firestoreAdmin,
        defaultUserId: removedBridgeUserId,
        email: 'removed-bridge@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [],
        name: 'Removed bridge',
        primaryMembership: null,
        staffAuthMode: 'email',
        tenantId,
        userId: removedBridgeUserId,
    });
    const removedBridgeData = (await removedBridgeRef.get()).data() || {};
    assert.equal(removedBridgeData.storeId, null);
    assert.equal(removedBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.storeId, null);
    assert.deepEqual(removedBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.storeIds, []);
    assert.equal(removedBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.authDisabled, true);
    assert.equal(removedBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.deleted, true);

    const emptyActiveBridgeUserId = 'al-default-bridge-empty-active';
    const emptyActiveBridgeRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(emptyActiveBridgeUserId);
    await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 1,
        active: true,
        db: firestoreAdmin,
        defaultUserId: emptyActiveBridgeUserId,
        email: 'empty-active@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [],
        name: 'Empty active bridge',
        primaryMembership: null,
        staffAuthMode: 'email',
        tenantId,
        userId: emptyActiveBridgeUserId,
    });
    const emptyActiveBridgeData = (await emptyActiveBridgeRef.get()).data() || {};
    assert.equal(emptyActiveBridgeData.active, false);
    assert.equal(emptyActiveBridgeData.authDisabled, true);
    assert.equal(emptyActiveBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.active, false);
    assert.equal(emptyActiveBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.authDisabled, true);
    assert.equal(emptyActiveBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.deleted, true);

    await syncAnswerlatticeStaffProductAccountBridge({
        accessRevision: 4,
        active: true,
        db: firestoreAdmin,
        defaultUserId: removedBridgeUserId,
        email: 'removed-bridge@example.com',
        fallbackStoreId: firstStoreId,
        memberships: [memberships[0]],
        name: 'Reactivated bridge',
        primaryMembership: memberships[0],
        staffAuthMode: 'email',
        tenantId,
        userId: removedBridgeUserId,
    });
    const reactivatedBridgeData = (await removedBridgeRef.get()).data() || {};
    assert.equal(reactivatedBridgeData.authDisabled, false);
    assert.equal(reactivatedBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.authDisabled, false);
    assert.equal(reactivatedBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.deleted, false);
    assert.equal(reactivatedBridgeData.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.storeId, firstStoreId);
};

const main = async () => {
    await verifyConcurrentOwnerRemoval();
    await verifyMembershipPreservationAndScope();
    await verifyCreateIdempotencyAndConcurrentMerge();
    await verifyRoleAssignmentAndDisableCannotBothCommit();
    await verifyBridgeRejectsStaleRevision();
    console.log('Answerlattice staff concurrency emulator tests passed.');
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
