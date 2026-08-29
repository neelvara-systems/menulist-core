#!/usr/bin/env ts-node

import { createDefaultAnswerlatticeRoles } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { MENULIST_B2C_PLAN_IDS } from '@constant/menulistPlans';
import { PRODUCT_IDS } from '@constant/product';
import { createDefaultRoles, getOwnerRoleId } from '@data/defaultRoles';
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
import { buildHostedHelpRegistryDoc } from '@lib/answerlattice/hostedHelpServer';
import { buildAnswerlatticeWidgetApiStateWithNewKey } from '@lib/answerlattice/widgetKeyManager';
import { createHash } from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const menuListProjectId = 'menulist-qa';
const answerlatticeProjectId = 'neelvara-answerlattice-qa';
// Credentials login is intentionally established through the shared MenuList
// Firebase Auth client before `/api/auth/set-claims` issues the separate
// Answerlattice custom token. Seed the same emulator project namespace that
// the login screen and the NextAuth credentials provider actually use.
const browserAuthProjectId = menuListProjectId;
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
const currentBillingPeriod = now.toDate().getFullYear() * 100 + (now.toDate().getMonth() + 1);
const cycleStartDate = Timestamp.fromMillis(now.toMillis() - 60_000);
const cycleEndDate = Timestamp.fromMillis(now.toMillis() + (30 * 24 * 60 * 60 * 1000));

const menuListTenantId = 99001;
const menuListStoreId = 99101;
const answerlatticeTenantId = 78001;
const answerlatticeStoreId = 78101;
let userId = 'answerlattice-local-menulist-owner';
const menuListSubscriptionId = 'menulist-local-active-subscription';
const subscriptionId = 'answerlattice-local-active-subscription';
const hostedHelpDomain = 'help.menulist.test';
const hostedHelpConfig = {
    enabled: true,
    domains: [hostedHelpDomain],
    primaryDomain: hostedHelpDomain,
    title: 'MenuList Help Center',
    description: 'Reviewed guidance for MenuList owners and staff.',
    showFaqs: true,
    showChangelog: true,
    noIndex: true,
};
const localWidgetAllowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3014',
    'http://127.0.0.1:3014',
    'http://localhost:3020',
    'http://127.0.0.1:3020',
    'https://app.menulist.digital',
];
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
    let existingUser: Awaited<ReturnType<typeof auth.getUser>> | null = null;

    try {
        existingUser = await auth.getUserByEmail(email);
        userId = existingUser.uid;
    } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
    }

    if (!existingUser) {
        try {
            existingUser = await auth.getUser(userId);
        } catch (error) {
            if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
        }
    }

    if (existingUser) {
        await auth.updateUser(userId, {
            disabled: false,
            displayName: 'MenuList QA Owner',
            email,
            emailVerified: true,
            password,
        });
    } else {
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
    const menuListOwnerRoleId = getOwnerRoleId(menuListStoreId);

    menuListBatch.set(menuListDb.collection(DB_COLLECTIONS.TENANTS).doc(String(menuListTenantId)), {
        active: true,
        createdOn: now,
        deleted: false,
        id: menuListTenantId,
        name: 'MenuList QA Client',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        storesList: [{
            isMaster: true,
            name: 'MenuList Raw Test Client',
            storeId: menuListStoreId,
            storeKey: 'menulist-raw-test-client',
            tenantName: 'MenuList QA Client',
        }],
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
        roles: createDefaultRoles(menuListStoreId, email),
        sId: menuListStoreId,
        state: 'Karnataka',
        storeKey: 'menulist-raw-test-client',
        storeId: menuListStoreId,
        isMaster: true,
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
        role: menuListOwnerRoleId,
        sId: menuListStoreId,
        storeId: menuListStoreId,
        storeIds: [menuListStoreId],
        stores: [{ name: 'MenuList Raw Test Client', role: menuListOwnerRoleId, storeId: menuListStoreId }],
        tId: menuListTenantId,
        tenantId: menuListTenantId,
    }, { merge: true });
    menuListBatch.set(menuListDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(menuListSubscriptionId), {
        analyticsEntitlement: {
            activePlanType: MENULIST_B2C_PLAN_IDS.PRO,
            source: 'answerlattice_local_first_client_fixture',
            status: 'active',
            syncedAt: now,
        },
        amount: 0,
        billingHistory: [],
        billingMode: 'manual',
        createdOn: now,
        currency: 'INR',
        cycleEndDate,
        cycleStartDate,
        email,
        id: menuListSubscriptionId,
        manualPaymentConfirmed: true,
        manualPaymentConfirmedAt: now,
        manualPaymentEvidenceType: 'local_certification_non_payment',
        monthlyCredits: 250,
        monthlyCreditsAllowance: 250,
        name: 'MenuList Raw Test Client',
        pId: PRODUCT_IDS.MENULIST,
        paymentMethod: null,
        paymentProvider: 'razorpay',
        planId: MENULIST_B2C_PLAN_IDS.PRO,
        planName: 'MenuList Pro — Local Certification',
        planType: 'MONTH',
        productId: PRODUCT_IDS.MENULIST,
        providerPlanId: 'local_certification_menulist_pro',
        providerStatus: 'active',
        providerSubscriptionId: menuListSubscriptionId,
        quantity: 1,
        sId: menuListStoreId,
        status: 'active',
        storeId: menuListStoreId,
        subscriptionEndDate: cycleEndDate,
        subscriptionStartDate: cycleStartDate,
        tId: menuListTenantId,
        tenantId: menuListTenantId,
        topUpCredits: 0,
        updatedOn: now,
        userId,
        userType: 'B2C',
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
            monthlyCredits: 100,
            monthlyCreditsAllowance: 100,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            planId: 'answerlattice_launch',
            planName: 'Launch',
            providerStatus: 'active',
            sId: answerlatticeStoreId,
            status: 'active',
            tId: answerlatticeTenantId,
            topUpCredits: 0,
        },
        authDisabled: false,
        createdOn: now,
        deleted: false,
        id: answerlatticeStoreId,
        hostedHelpConfig,
        hostedHelpConfigVersion: 1,
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
        widgetAllowedOrigins: localWidgetAllowedOrigins,
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
        creditsLastResetMonth: currentBillingPeriod,
        cycleEndDate,
        cycleStartDate,
        id: subscriptionId,
        monthlyCredits: 100,
        monthlyCreditsAllowance: 100,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        planId: 'answerlattice_launch',
        planName: 'Launch',
        productId: PRODUCT_IDS.ANSWERLATTICE,
        providerStatus: 'active',
        manualPaymentConfirmed: true,
        sId: answerlatticeStoreId,
        status: 'active',
        storeId: answerlatticeStoreId,
        tId: answerlatticeTenantId,
        tenantId: answerlatticeTenantId,
        topUpCredits: 0,
        updatedOn: FieldValue.serverTimestamp(),
        userId,
    }, { merge: true });
    const hostedHelpRegistryDoc = buildHostedHelpRegistryDoc({
        domain: hostedHelpDomain,
        tId: answerlatticeTenantId,
        sId: answerlatticeStoreId,
        config: hostedHelpConfig,
        status: {
            domainStatus: 'verified',
            domainVerified: true,
            domainVerifiedAt: now.toDate().toISOString(),
            domainLastCheckedAt: now.toDate().toISOString(),
        },
    });
    if (!hostedHelpRegistryDoc) {
        throw new Error('Local hosted-help registry fixture is invalid.');
    }
    answerlatticeBatch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(hostedHelpDomain),
        hostedHelpRegistryDoc,
        { merge: true },
    );
    // A fresh browser fixture must not ship hidden approved product truth. The
    // former billing answer referenced an entity that the fixture never created,
    // so reruns also remove those two known legacy documents from older fixtures.
    answerlatticeBatch.delete(
        answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX).doc('entity_index_billing'),
    );
    answerlatticeBatch.delete(
        answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc('canonical_billing_payment_recovery'),
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
