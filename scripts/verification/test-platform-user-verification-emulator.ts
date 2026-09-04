#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_ROLE_IDS } from '@data/shared/defaultRoles';
import { admin, authAdmin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { createStaffUser } from '@lib/staffManagement/server';

const TENANT_ID = 99691;
const STORE_ID = 99692;
const PLATFORM_USER_ID = 'menulist-platform-verification-test-operator';
const USER_ID = 'menulist-platform-verification-test-user';
const USER_EMAIL = 'menulist-platform-verification-test@example.invalid';

const role = (id: string, name: string) => ({
    active: true,
    createdBy: PLATFORM_USER_ID,
    createdOn: '2026-09-01T00:00:00.000Z',
    description: `${name} role`,
    id,
    modifiedBy: PLATFORM_USER_ID,
    modifiedOn: '2026-09-01T00:00:00.000Z',
    name,
    permissions: {},
});

const deleteAuthUserIfPresent = async () => {
    try {
        const user = await authAdmin.getUserByEmail(USER_EMAIL);
        await authAdmin.deleteUser(user.uid);
    } catch (error: any) {
        assert.equal(error?.code, 'auth/user-not-found');
    }
};

const cleanup = async () => {
    await deleteAuthUserIfPresent();
    await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(USER_ID).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(PLATFORM_USER_ID).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(STORE_ID)).delete(),
        firestoreAdmin.collection(DB_COLLECTIONS.STAFF_STORE_ACCESS_STATE).doc(`${TENANT_ID}_${STORE_ID}`).delete(),
    ]);
};

const run = async () => {
    assert(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'FIREBASE_AUTH_EMULATOR_HOST is required');
    assert(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');

    await cleanup();
    await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(PLATFORM_USER_ID).set({
            active: true,
            authDisabled: false,
            blocked: false,
            deleted: false,
            email: 'menulist-platform-verification-operator@example.invalid',
            isVerified: true,
            pId: 'ML',
            platformRole: 'PLATFORM',
        }),
        firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(STORE_ID)).set({
            active: true,
            deleted: false,
            isMaster: true,
            name: 'Platform verification test store',
            roles: [
                role(DEFAULT_ROLE_IDS.OWNER, 'Owner'),
                role(DEFAULT_ROLE_IDS.STAFF, 'Staff'),
            ],
            storeId: STORE_ID,
            tenantId: TENANT_ID,
        }),
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(USER_ID).set({
            active: true,
            authDisabled: false,
            blocked: false,
            deleted: false,
            email: USER_EMAIL,
            isVerified: false,
            name: 'Platform verification test user',
            pId: 'ML',
            platformRole: 'USER',
            storeId: STORE_ID,
            storeIds: [STORE_ID],
            stores: [{ name: 'Platform verification test store', role: DEFAULT_ROLE_IDS.STAFF, storeId: STORE_ID }],
            tenantId: TENANT_ID,
        }),
    ]);

    const request = new NextRequest('http://localhost/api/auth/create-staff', {
        body: JSON.stringify({
            email: USER_EMAIL,
            name: 'Platform verification test user',
            role: DEFAULT_ROLE_IDS.STAFF,
            storeId: STORE_ID,
            tenantId: TENANT_ID,
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
    });
    const session = {
        platformRole: 'PLATFORM',
        user: {
            email: 'menulist-platform-verification-operator@example.invalid',
            id: PLATFORM_USER_ID,
            platformRole: 'PLATFORM',
        },
    };

    const response = await createStaffUser(request, session);
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.mode, 'existing_user_auth_bound');
    assert.equal(body.userId, USER_ID);
    assert.equal(body.email, USER_EMAIL);
    assert.equal(body.user?.id, USER_ID);
    assert.equal(body.user?.isVerified, true);

    const [authUser, userSnapshot] = await Promise.all([
        authAdmin.getUserByEmail(USER_EMAIL),
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(USER_ID).get(),
    ]);
    assert.equal(userSnapshot.data()?.firebaseUid, authUser.uid);
    assert.equal(userSnapshot.data()?.isVerified, true);
};

run()
    .then(() => console.log('Platform user verification emulator test passed.'))
    .finally(async () => {
        await cleanup();
        await admin.app().delete();
    });
