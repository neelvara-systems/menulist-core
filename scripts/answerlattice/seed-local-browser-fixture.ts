#!/usr/bin/env ts-node

import { createDefaultAnswerlatticeRoles } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const menuListProjectId = 'menulist-qa';
const answerlatticeProjectId = 'neelvara-answerlattice-qa';
const browserAuthProjectId = 'demo-answerlattice-browser';
const email = String(process.env.ANSWERLATTICE_LOCAL_FIXTURE_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ANSWERLATTICE_LOCAL_FIXTURE_PASSWORD || '');

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Firebase Auth and Firestore emulator hosts are required.');
}
if (!email || !password) {
    throw new Error('Fixture email and password are required.');
}

const menuListApp = initializeApp({ projectId: menuListProjectId }, 'menulist-local-fixture');
const answerlatticeApp = initializeApp({ projectId: answerlatticeProjectId }, 'answerlattice-local-fixture');
const browserAuthApp = initializeApp({ projectId: browserAuthProjectId }, 'answerlattice-browser-auth-fixture');
const menuListAuth = getAuth(menuListApp);
const answerlatticeAuth = getAuth(answerlatticeApp);
const browserAuth = getAuth(browserAuthApp);
const menuListDb = getFirestore(menuListApp);
const answerlatticeDb = getFirestore(answerlatticeApp);
const now = Timestamp.now();

const menuListTenantId = 99001;
const menuListStoreId = 99101;
const answerlatticeTenantId = 78001;
const answerlatticeStoreId = 78101;
const userId = 'answerlattice-local-menulist-owner';
const subscriptionId = 'answerlattice-local-active-subscription';

const answerlatticeMembership = {
    name: 'MenuList Support Workspace',
    role: 'owner',
    storeId: answerlatticeStoreId,
};
const productAccount = {
    accessRevision: 1,
    active: true,
    authDisabled: false,
    deleted: false,
    role: 'owner',
    sId: answerlatticeStoreId,
    storeId: answerlatticeStoreId,
    storeIds: [answerlatticeStoreId],
    tId: answerlatticeTenantId,
    tenantId: answerlatticeTenantId,
};

async function upsertAuthUser(
    auth: ReturnType<typeof getAuth>,
    customClaims: Record<string, unknown>,
): Promise<void> {
    try {
        await auth.getUser(userId);
        await auth.updateUser(userId, {
            disabled: false,
            displayName: 'MenuList QA Owner',
            email,
            emailVerified: true,
            password,
        });
    } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
        await auth.createUser({
            disabled: false,
            displayName: 'MenuList QA Owner',
            email,
            emailVerified: true,
            password,
            uid: userId,
        });
    }

    await auth.setCustomUserClaims(userId, customClaims);
}

async function seedFirestore(): Promise<void> {
    const menuListBatch = menuListDb.batch();

    menuListBatch.set(menuListDb.collection(DB_COLLECTIONS.TENANTS).doc(String(menuListTenantId)), {
        active: true,
        createdOn: now,
        id: menuListTenantId,
        name: 'MenuList QA Client',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        tId: menuListTenantId,
        tenantId: menuListTenantId,
    });
    menuListBatch.set(menuListDb.collection(DB_COLLECTIONS.STORES).doc(String(menuListStoreId)), {
        active: true,
        businessCategory: 'Restaurant',
        businessType: 'Restaurant',
        city: 'Bengaluru',
        contactPersonEmail: email,
        contactPersonName: 'MenuList QA Owner',
        contactPersonNumber: '0000000000',
        createdOn: now,
        currencyCode: 'INR',
        currencySymbol: 'INR',
        deleted: false,
        email,
        id: menuListStoreId,
        logo: '',
        name: 'MenuList Raw Test Client',
        pId: PRODUCT_IDS.MENULIST,
        phoneNumber: '0000000000',
        productId: PRODUCT_IDS.MENULIST,
        roles: [],
        sId: menuListStoreId,
        state: 'Karnataka',
        storeKey: 'menulist-raw-test-client',
        storeId: menuListStoreId,
        tId: menuListTenantId,
        tenantName: 'MenuList QA Client',
        tenantId: menuListTenantId,
    });
    menuListBatch.set(menuListDb.collection(DB_COLLECTIONS.USERS).doc(userId), {
        active: true,
        authDisabled: false,
        createdOn: now,
        deleted: false,
        email,
        id: userId,
        isVerified: true,
        name: 'MenuList QA Owner',
        pId: PRODUCT_IDS.MENULIST,
        platformRole: 'USER',
        productAccounts: {
            [PRODUCT_IDS.ANSWERLATTICE]: productAccount,
        },
        productId: PRODUCT_IDS.MENULIST,
        role: 'owner',
        sId: menuListStoreId,
        storeId: menuListStoreId,
        storeIds: [menuListStoreId],
        stores: [{ name: 'MenuList Raw Test Client', role: 'owner', storeId: menuListStoreId }],
        tId: menuListTenantId,
        tenantId: menuListTenantId,
    });

    const answerlatticeBatch = answerlatticeDb.batch();
    answerlatticeBatch.set(answerlatticeDb.collection(DB_COLLECTIONS.TENANTS).doc(String(answerlatticeTenantId)), {
        active: true,
        createdOn: now,
        id: answerlatticeTenantId,
        name: 'MenuList Support Tenant',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        tId: answerlatticeTenantId,
        tenantId: answerlatticeTenantId,
    });
    answerlatticeBatch.set(answerlatticeDb.collection(DB_COLLECTIONS.STORES).doc(String(answerlatticeStoreId)), {
        active: true,
        answerlatticeRoles: createDefaultAnswerlatticeRoles({
            createdBy: userId,
            sId: answerlatticeStoreId,
            tId: answerlatticeTenantId,
        }),
        answerlatticeSubscription: {
            id: subscriptionId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            planId: 'answerlattice_starter',
            planName: 'Starter',
            providerStatus: 'active',
            sId: answerlatticeStoreId,
            status: 'active',
            tId: answerlatticeTenantId,
        },
        authDisabled: false,
        createdOn: now,
        deleted: false,
        id: answerlatticeStoreId,
        name: 'MenuList Support Workspace',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        sId: answerlatticeStoreId,
        storeId: answerlatticeStoreId,
        tId: answerlatticeTenantId,
        tenantId: answerlatticeTenantId,
        timeZone: 'Asia/Kolkata',
    });
    answerlatticeBatch.set(answerlatticeDb.collection(DB_COLLECTIONS.USERS).doc(userId), {
        active: true,
        authDisabled: false,
        createdOn: now,
        deleted: false,
        email,
        id: userId,
        isVerified: true,
        name: 'MenuList QA Owner',
        pId: PRODUCT_IDS.ANSWERLATTICE,
        platformRole: 'USER',
        productAccounts: {
            [PRODUCT_IDS.ANSWERLATTICE]: productAccount,
        },
        productId: PRODUCT_IDS.ANSWERLATTICE,
        role: 'owner',
        sId: answerlatticeStoreId,
        storeId: answerlatticeStoreId,
        storeIds: [answerlatticeStoreId],
        stores: [answerlatticeMembership],
        tId: answerlatticeTenantId,
        tenantId: answerlatticeTenantId,
    });
    answerlatticeBatch.set(answerlatticeDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId), {
        active: true,
        billingMode: 'manual',
        createdOn: now,
        id: subscriptionId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        planId: 'answerlattice_starter',
        planName: 'Starter',
        productId: PRODUCT_IDS.ANSWERLATTICE,
        providerStatus: 'active',
        manualPaymentConfirmed: true,
        sId: answerlatticeStoreId,
        status: 'active',
        storeId: answerlatticeStoreId,
        tId: answerlatticeTenantId,
        tenantId: answerlatticeTenantId,
        updatedOn: FieldValue.serverTimestamp(),
        userId,
    });

    await Promise.all([menuListBatch.commit(), answerlatticeBatch.commit()]);
}

async function run(): Promise<void> {
    await Promise.all([
        // Browser Auth emulator requests resolve against the emulator launch project.
        upsertAuthUser(browserAuth, {
            pId: PRODUCT_IDS.MENULIST,
            role: 'owner',
            sId: menuListStoreId,
            storeId: menuListStoreId,
            tId: menuListTenantId,
            tenantId: menuListTenantId,
        }),
        upsertAuthUser(menuListAuth, {
            pId: PRODUCT_IDS.MENULIST,
            role: 'owner',
            sId: menuListStoreId,
            storeId: menuListStoreId,
            tId: menuListTenantId,
            tenantId: menuListTenantId,
        }),
        upsertAuthUser(answerlatticeAuth, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            role: 'owner',
            sId: answerlatticeStoreId,
            storeId: answerlatticeStoreId,
            tId: answerlatticeTenantId,
            tenantId: answerlatticeTenantId,
        }),
    ]);
    await seedFirestore();
    process.stdout.write(`Local Answerlattice browser fixture ready for ${email}.\n`);
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
