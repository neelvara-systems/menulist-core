#!/usr/bin/env ts-node

import { createDefaultAnswerlatticeRoles } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeCompiledSourceVersions,
} from '@lib/answerlattice/compiledContext';
import {
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
} from '@lib/answerlattice/invalidationControlPlane';
import { buildAnswerlatticeWidgetApiStateWithNewKey } from '@lib/answerlattice/widgetKeyManager';
import { createHash } from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const menuListProjectId = 'menulist-qa';
const answerlatticeProjectId = 'neelvara-answerlattice-qa';
const browserAuthProjectId = 'demo-answerlattice-browser';
const email = String(process.env.ANSWERLATTICE_LOCAL_FIXTURE_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ANSWERLATTICE_LOCAL_FIXTURE_PASSWORD || '');
const localWidgetKey = String(process.env.ANSWERLATTICE_LOCAL_WIDGET_KEY || '').trim();

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Firebase Auth and Firestore emulator hosts are required.');
}
if (!email || !password) {
    throw new Error('Fixture email and password are required.');
}
if (localWidgetKey && !/^al_[A-Za-z0-9_-]{20,128}$/.test(localWidgetKey)) {
    throw new Error('Local widget key must use the Answerlattice widget-key format.');
}

const menuListApp = initializeApp({ projectId: menuListProjectId }, 'menulist-local-fixture');
const answerlatticeApp = initializeApp({ projectId: answerlatticeProjectId }, 'answerlattice-local-fixture');
const browserAuthApp = initializeApp({ projectId: browserAuthProjectId }, 'answerlattice-browser-auth-fixture');
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
const answerlatticeScope = {
    sId: answerlatticeStoreId,
    tId: answerlatticeTenantId,
};
const compiledSourceVersions = normalizeCompiledSourceVersions({
    widgetConfig: 1,
    workspaceProfile: 1,
});

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
const localWidgetApi = localWidgetKey
    ? buildAnswerlatticeWidgetApiStateWithNewKey({
        apiKey: localWidgetKey,
        keyHash: createHash('sha256').update(localWidgetKey).digest('hex'),
        name: 'Local browser QA key',
        nowIso: now.toDate().toISOString(),
    }).state
    : undefined;

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
    }, { merge: true });
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
    }, { merge: true });
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
    }, { merge: true });

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
    }, { merge: true });
    answerlatticeBatch.set(answerlatticeDb.collection(DB_COLLECTIONS.STORES).doc(String(answerlatticeStoreId)), {
        active: true,
        ...(localWidgetApi ? { answerlatticeWidgetApi: localWidgetApi } : {}),
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
        productUrl: 'https://app.menulist.digital',
        productId: PRODUCT_IDS.ANSWERLATTICE,
        sId: answerlatticeStoreId,
        storeId: answerlatticeStoreId,
        supportEmail: 'support@neelvara.com',
        tId: answerlatticeTenantId,
        tenantId: answerlatticeTenantId,
        timeZone: 'Asia/Kolkata',
        widgetAllowedOrigins: [
            'http://localhost:3014',
            'https://app.menulist.digital',
        ],
    }, { merge: true });
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
    }, { merge: true });
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
    }, { merge: true });
    answerlatticeBatch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX).doc('entity_index_billing'),
        {
            canonicalName: 'Billing payment recovery',
            entityId: 'entity_billing',
            normalizedTokens: ['billing', 'invoice', 'payment', 'method', 'failed', 'renewal', 'retry'],
            pId: PRODUCT_IDS.ANSWERLATTICE,
            prefixTokens: ['bil', 'inv', 'pay', 'met', 'fai', 'ren', 'ret'],
            sId: answerlatticeStoreId,
            synonyms: ['payment method', 'failed renewal', 'billing recovery'],
            tId: answerlatticeTenantId,
            weight: 1,
        },
        { merge: true },
    );
    answerlatticeBatch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc('canonical_billing_payment_recovery'),
        {
            answerType: 'explanation',
            content: {
                detailedExplanation: 'Workspace owners can update the payment method in Billing and retry the failed renewal. Workspace data and approved support content remain intact while payment is recovered.',
                structuredSummary: 'Workspace owners can update the billing payment method and retry the failed renewal; existing workspace data remains intact.',
            },
            createdBy: userId,
            createdOn: now,
            governance: {
                driftFlag: false,
                reviewRequired: false,
            },
            id: 'canonical_billing_payment_recovery',
            modifiedBy: userId,
            modifiedOn: now,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productBinding: {
                applicableVersions: { from: 1, to: null },
                introducedInVersion: 1,
                lastValidatedInVersion: 1,
            },
            sId: answerlatticeStoreId,
            scope: {
                entityIds: ['entity_billing'],
                planIds: [],
                roleIds: [],
                stateIds: [],
            },
            signalMetrics: {
                linkedChatCount: 0,
                linkedTicketCount: 0,
                negativeFeedbackCount: 0,
            },
            slug: 'billing-payment-recovery',
            status: 'active',
            tId: answerlatticeTenantId,
            title: 'How to update the billing payment method',
            validation: {
                confidenceScore: 1,
                lastValidatedOn: now,
                validatedBy: userId,
                validationSource: 'manual',
            },
        },
        { merge: true },
    );
    answerlatticeBatch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
            getAnswerlatticeSourceVersionsDocId(answerlatticeTenantId, answerlatticeStoreId),
        ),
        {
            ...getAnswerlatticeMissingSourceVersionsBase(answerlatticeScope),
            ...compiledSourceVersions,
            updatedAt: now,
        },
    );
    answerlatticeBatch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
            getAnswerlatticeBundleManifestDocId(answerlatticeTenantId, answerlatticeStoreId),
        ),
        {
            ...getAnswerlatticeMissingBundleManifestBase(answerlatticeScope),
            lastReason: 'local_browser_fixture',
            sourceVersions: compiledSourceVersions,
            status: 'empty',
            updatedAt: now,
        },
    );

    await Promise.all([menuListBatch.commit(), answerlatticeBatch.commit()]);

    const [sourceVersionsSnapshot, manifestSnapshot] = await Promise.all([
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
            getAnswerlatticeSourceVersionsDocId(answerlatticeTenantId, answerlatticeStoreId),
        ).get(),
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
            getAnswerlatticeBundleManifestDocId(answerlatticeTenantId, answerlatticeStoreId),
        ).get(),
    ]);
    if (!areAnswerlatticeCompiledSourceVersionsValid(sourceVersionsSnapshot.data())) {
        throw new Error('Local fixture source-version control plane is invalid.');
    }
    if (!isAnswerlatticeContextBundleManifestForScope(
        manifestSnapshot.data(),
        answerlatticeTenantId,
        answerlatticeStoreId,
    )) {
        throw new Error('Local fixture bundle-manifest control plane is invalid.');
    }
}

async function run(): Promise<void> {
    // All Firebase app instances connected to one Auth emulator share its user
    // namespace. Seed the browser identity once with the product scope under
    // test; concurrent per-app writes would race and leave arbitrary claims.
    await upsertAuthUser(browserAuth, {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        role: 'owner',
        sId: answerlatticeStoreId,
        storeId: answerlatticeStoreId,
        tId: answerlatticeTenantId,
        tenantId: answerlatticeTenantId,
        uId: userId,
    });
    await seedFirestore();
    process.stdout.write(`Local Answerlattice browser fixture ready for ${email}.\n`);
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
