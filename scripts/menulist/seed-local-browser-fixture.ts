#!/usr/bin/env ts-node

import { DB_COLLECTIONS } from '@constant/database';
import { MENULIST_B2C_PLAN_IDS } from '@constant/menulistPlans';
import { PRODUCT_IDS } from '@constant/product';
import { createDefaultRoles, getOwnerRoleId } from '@data/defaultRoles';
import { buildSummaryProjectPayload } from '@lib/firestore/summaryProjectsWriter';
import { isCompleteSummaryProject, parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { isReadableStoreDocument } from '@lib/store/storeDocumentBoundary';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { deleteApp, initializeApp as initializeClientApp } from 'firebase/app';
import {
    connectAuthEmulator,
    getAuth as getClientAuth,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import {
    connectFirestoreEmulator,
    doc as clientDoc,
    getDoc as getClientDoc,
    getFirestore as getClientFirestore,
} from 'firebase/firestore';

const PROJECT_ID = 'menulist-qa';
const USER_ID = 'menulist-local-browser-owner';
const TENANT_ID = 99601;
const STORE_ID = 99611;
const BRANCH_STORE_ID = 99612;
const SUBSCRIPTION_ID = 'menulist-local-browser-pro';
const PROJECT_DOCUMENT_ID = `${TENANT_ID}-default-${STORE_ID}`;
const MAX_FIXTURE_PROJECT_DOCUMENTS = 400;
const FIXTURE_EMAIL = String(process.env.MENULIST_LOCAL_FIXTURE_EMAIL || '').trim().toLowerCase();
const FIXTURE_PASSWORD = String(process.env.MENULIST_LOCAL_FIXTURE_PASSWORD || '');
const FIXTURE_MENU_STATE = String(process.env.MENULIST_LOCAL_FIXTURE_MENU_STATE || 'empty').trim();
const FIXTURE_PUBLIC_LINK_STATE = String(process.env.MENULIST_LOCAL_FIXTURE_PUBLIC_LINK_STATE || 'configured').trim();

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Firebase Auth and Firestore emulator hosts are required.');
}
if ((process.env.GCLOUD_PROJECT || PROJECT_ID) !== PROJECT_ID) {
    throw new Error(`Local MenuList fixture refuses project ${String(process.env.GCLOUD_PROJECT)}.`);
}
if (!FIXTURE_EMAIL || !FIXTURE_PASSWORD) {
    throw new Error('MENULIST_LOCAL_FIXTURE_EMAIL and MENULIST_LOCAL_FIXTURE_PASSWORD are required.');
}
if (FIXTURE_PASSWORD.length < 12) {
    throw new Error('The local fixture password must contain at least 12 characters.');
}
if (!['empty', 'seeded'].includes(FIXTURE_MENU_STATE)) {
    throw new Error('MENULIST_LOCAL_FIXTURE_MENU_STATE must be empty or seeded.');
}
if (!['configured', 'missing'].includes(FIXTURE_PUBLIC_LINK_STATE)) {
    throw new Error('MENULIST_LOCAL_FIXTURE_PUBLIC_LINK_STATE must be configured or missing.');
}

const app = initializeApp({ projectId: PROJECT_ID }, 'menulist-local-browser-fixture');
const auth = getAuth(app);
const db = getFirestore(app);
const now = Timestamp.now();
const cycleEndDate = Timestamp.fromMillis(now.toMillis() + (30 * 24 * 60 * 60 * 1000));
const ownerRoleId = getOwnerRoleId();

async function upsertAuthUser(): Promise<void> {
    try {
        await auth.getUser(USER_ID);
        await auth.updateUser(USER_ID, {
            disabled: false,
            displayName: 'MenuList Local QA Owner',
            email: FIXTURE_EMAIL,
            emailVerified: true,
            password: FIXTURE_PASSWORD,
        });
    } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
        await auth.createUser({
            disabled: false,
            displayName: 'MenuList Local QA Owner',
            email: FIXTURE_EMAIL,
            emailVerified: true,
            password: FIXTURE_PASSWORD,
            uid: USER_ID,
        });
    }

    await auth.setCustomUserClaims(USER_ID, {
        pId: PRODUCT_IDS.MENULIST,
        platformRole: 'OWNER',
        role: ownerRoleId,
        sId: String(STORE_ID),
        storeId: String(STORE_ID),
        storeIds: [String(STORE_ID), String(BRANCH_STORE_ID)],
        tId: String(TENANT_ID),
        tenantId: String(TENANT_ID),
        uId: USER_ID,
    });
}

async function seedFirestore(): Promise<void> {
    const [masterProjects, branchProjects] = await Promise.all([
        db.collection(DB_COLLECTIONS.PROJECTS)
            .doc(String(TENANT_ID))
            .collection(String(STORE_ID))
            .get(),
        db.collection(DB_COLLECTIONS.PROJECTS)
            .doc(String(TENANT_ID))
            .collection(String(BRANCH_STORE_ID))
            .get(),
    ]);
    if (masterProjects.size + branchProjects.size > MAX_FIXTURE_PROJECT_DOCUMENTS) {
        throw new Error('Local MenuList browser fixture project cleanup exceeds its safe bound.');
    }

    const batch = db.batch();
    const businessName = 'MenuList Local Browser QA';
    const storeKey = 'menulist-local-browser-qa';
    const publicAddressFields = FIXTURE_PUBLIC_LINK_STATE === 'configured'
        ? { customDomain: `${storeKey}.localhost`, domainVerified: true, subdomain: storeKey }
        : {
            customDomain: FieldValue.delete(),
            domainVerified: FieldValue.delete(),
            subdomain: FieldValue.delete(),
        };

    batch.set(db.collection(DB_COLLECTIONS.TENANTS).doc(String(TENANT_ID)), {
        active: true,
        createdOn: now,
        customDomain: FieldValue.delete(),
        deleted: false,
        id: TENANT_ID,
        name: businessName,
        onboardingSource: 'RESELLER_ONBOARDING',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        storesList: [
            {
                active: true,
                isMaster: true,
                name: businessName,
                storeId: STORE_ID,
                storeKey,
                tenantName: businessName,
            },
            {
                active: true,
                isMaster: false,
                name: 'Local QA Branch',
                outletSlug: 'local-qa-branch',
                previousOutletSlugs: [],
                storeId: BRANCH_STORE_ID,
                storeKey: 'local_qa_branch',
                tenantName: businessName,
            },
        ],
        tId: TENANT_ID,
        tenantId: TENANT_ID,
        subdomain: FieldValue.delete(),
    }, { merge: true });

    batch.set(db.collection(DB_COLLECTIONS.STORES).doc(String(STORE_ID)), {
        active: true,
        activePlanType: MENULIST_B2C_PLAN_IDS.PRO,
        businessCategory: 'Restaurant',
        businessIndustry: 'B2C',
        businessType: 'Restaurant',
        city: 'Bengaluru',
        contactPersonEmail: FIXTURE_EMAIL,
        contactPersonName: 'MenuList Local QA Owner',
        contactPersonNumber: '0000000000',
        createdOn: now,
        ...publicAddressFields,
        currencyCode: 'INR',
        currencySymbol: '₹',
        deleted: false,
        email: FIXTURE_EMAIL,
        id: STORE_ID,
        isMaster: true,
        logo: '',
        name: businessName,
        onboardingSource: 'RESELLER_ONBOARDING',
        pId: PRODUCT_IDS.MENULIST,
        phoneNumber: '0000000000',
        posSync: FieldValue.delete(),
        productId: PRODUCT_IDS.MENULIST,
        keywords: FieldValue.delete(),
        metaDescription: FieldValue.delete(),
        metaTitle: FieldValue.delete(),
        printableAssetStylePreferences: FieldValue.delete(),
        roles: createDefaultRoles(STORE_ID, FIXTURE_EMAIL),
        sId: STORE_ID,
        state: 'Karnataka',
        storeId: STORE_ID,
        storeKey,
        tId: TENANT_ID,
        tenantId: TENANT_ID,
        tenantName: businessName,
        tagline: FieldValue.delete(),
        timeZone: 'Asia/Kolkata',
    }, { merge: true });

    batch.set(db.collection(DB_COLLECTIONS.STORES).doc(String(BRANCH_STORE_ID)), {
        active: true,
        activePlanType: MENULIST_B2C_PLAN_IDS.PRO,
        businessCategory: 'Restaurant',
        businessIndustry: 'B2C',
        businessType: 'Restaurant',
        city: 'Bengaluru',
        contactPersonEmail: FIXTURE_EMAIL,
        contactPersonName: 'MenuList Local QA Owner',
        contactPersonNumber: '0000000000',
        createdOn: now,
        currencyCode: 'INR',
        currencySymbol: '₹',
        deleted: false,
        email: FIXTURE_EMAIL,
        id: BRANCH_STORE_ID,
        isMaster: false,
        logo: '',
        name: 'Local QA Branch',
        onboardingSource: 'RESELLER_ONBOARDING',
        outletSlug: 'local-qa-branch',
        pId: PRODUCT_IDS.MENULIST,
        phoneNumber: '0000000000',
        posSync: FieldValue.delete(),
        productId: PRODUCT_IDS.MENULIST,
        roles: createDefaultRoles(BRANCH_STORE_ID, FIXTURE_EMAIL),
        sId: BRANCH_STORE_ID,
        state: 'Karnataka',
        storeId: BRANCH_STORE_ID,
        storeKey: 'local_qa_branch',
        tId: TENANT_ID,
        tenantId: TENANT_ID,
        tenantName: businessName,
        timeZone: 'Asia/Kolkata',
    }, { merge: true });

    batch.set(db.collection(DB_COLLECTIONS.USERS).doc(USER_ID), {
        active: true,
        authDisabled: false,
        createdOn: now,
        deleted: false,
        email: FIXTURE_EMAIL,
        firebaseUid: USER_ID,
        id: USER_ID,
        isVerified: true,
        loginEmail: FIXTURE_EMAIL,
        name: 'MenuList Local QA Owner',
        onboardingSource: 'RESELLER_ONBOARDING',
        pId: PRODUCT_IDS.MENULIST,
        platformRole: 'OWNER',
        productId: PRODUCT_IDS.MENULIST,
        role: ownerRoleId,
        sId: STORE_ID,
        storeId: STORE_ID,
        storeIds: [STORE_ID, BRANCH_STORE_ID],
        stores: [
            { name: businessName, role: ownerRoleId, storeId: STORE_ID },
            { name: 'Local QA Branch', role: ownerRoleId, storeId: BRANCH_STORE_ID },
        ],
        tId: TENANT_ID,
        tenantId: TENANT_ID,
        uId: USER_ID,
    }, { merge: true });

    batch.set(db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(SUBSCRIPTION_ID), {
        analyticsEntitlement: {
            activePlanType: MENULIST_B2C_PLAN_IDS.PRO,
            source: 'menulist_local_browser_fixture',
            status: 'active',
            syncedAt: now,
        },
        amount: 0,
        billingHistory: [],
        billingMode: 'manual',
        createdOn: now,
        currency: 'INR',
        cycleEndDate,
        cycleStartDate: now,
        email: FIXTURE_EMAIL,
        id: SUBSCRIPTION_ID,
        manualPaymentConfirmed: true,
        manualPaymentConfirmedAt: now,
        manualPaymentEvidenceType: 'local_certification_non_payment',
        monthlyCredits: 250,
        monthlyCreditsAllowance: 250,
        name: businessName,
        pId: PRODUCT_IDS.MENULIST,
        paymentMethod: null,
        paymentProvider: 'razorpay',
        planId: MENULIST_B2C_PLAN_IDS.PRO,
        planName: 'MenuList Pro — Local Certification',
        planType: 'MONTH',
        productId: PRODUCT_IDS.MENULIST,
        providerPlanId: 'local_certification_menulist_pro',
        providerStatus: 'active',
        providerSubscriptionId: SUBSCRIPTION_ID,
        quantity: 2,
        sId: STORE_ID,
        status: 'active',
        storeId: STORE_ID,
        subscriptionEndDate: cycleEndDate,
        subscriptionStartDate: now,
        tId: TENANT_ID,
        tenantId: TENANT_ID,
        topUpCredits: 0,
        totalPaymentsMadeCount: 0,
        totalPaymentsNeededCount: 0,
        updatedOn: now,
        userId: USER_ID,
        userType: 'B2C',
    }, { merge: true });

    const projectRef = db.collection(DB_COLLECTIONS.PROJECTS)
        .doc(String(TENANT_ID))
        .collection(String(STORE_ID))
        .doc(PROJECT_DOCUMENT_ID);
    const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${STORE_ID}`);
    const branchProjectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${BRANCH_STORE_ID}`);
    for (const projectDocument of masterProjects.docs) {
        if (FIXTURE_MENU_STATE !== 'seeded' || projectDocument.id !== PROJECT_DOCUMENT_ID) {
            batch.delete(projectDocument.ref);
        }
    }
    for (const projectDocument of branchProjects.docs) {
        batch.delete(projectDocument.ref);
    }
    batch.delete(branchProjectsSummaryRef);
    batch.delete(db.collection(DB_COLLECTIONS.POS_SYNC_SECRETS).doc(`${TENANT_ID}_${STORE_ID}`));
    batch.delete(db.collection(DB_COLLECTIONS.POS_SYNC_SECRETS).doc(`${TENANT_ID}_${BRANCH_STORE_ID}`));

    if (FIXTURE_MENU_STATE === 'seeded') {
        batch.set(projectRef, {
            active: true,
            config: { design: { menu: { showItemPrices: true } } },
            createdBy: 'MenuList Local QA Owner',
            createdOn: now,
            defaultLanguage: 'en',
            deleted: false,
            description: 'Deterministic local certification menu',
            files: [{
                extractedData: {
                    data: {
                        categories: [{ active: true, id: 'qa-drinks', name: { en: 'Drinks' } }],
                        items: [{
                            active: true,
                            category: 'qa-drinks',
                            description: { en: 'Deterministic local fixture item' },
                            id: 'qa-filter-coffee',
                            name: { en: 'Filter Coffee' },
                            price: '80',
                        }],
                        languages: [{ code: 'en', isPrimary: true, name: 'English' }],
                    },
                },
                index: 0,
                name: 'local-certification-menu.json',
                size: 1024,
                type: 'application/json',
                uid: 'local-certification-menu',
                url: 'https://example.invalid/local-certification-menu.json',
            }],
            isDefault: true,
            languages: ['en'],
            modifiedBy: 'MenuList Local QA Owner',
            modifiedOn: now,
            name: 'Menu',
            onboardingSource: 'RESELLER_ONBOARDING',
            pId: PRODUCT_IDS.MENULIST,
            projectId: PROJECT_DOCUMENT_ID,
            role: ownerRoleId,
            sId: STORE_ID,
            storeId: STORE_ID,
            tId: TENANT_ID,
            tenantId: TENANT_ID,
            uId: USER_ID,
        });
        batch.set(projectsSummaryRef, {
            lastUpdated: now,
            ...buildSummaryProjectPayload(PROJECT_DOCUMENT_ID, {
                active: true,
                description: 'Deterministic local certification menu',
                isDefault: true,
                name: 'Menu',
                slug: 'menu',
            }),
        });
    } else {
        batch.delete(projectRef);
        batch.delete(projectsSummaryRef);
    }

    await batch.commit();
}

async function verifyFixture(): Promise<void> {
    const projectRef = db.collection(DB_COLLECTIONS.PROJECTS)
        .doc(String(TENANT_ID))
        .collection(String(STORE_ID))
        .doc(PROJECT_DOCUMENT_ID);
    const [
        authUser,
        tenant,
        store,
        branchStore,
        user,
        subscription,
        project,
        masterProjects,
        branchProjects,
        storePosSyncSecret,
        branchPosSyncSecret,
    ] = await Promise.all([
        auth.getUser(USER_ID),
        db.collection(DB_COLLECTIONS.TENANTS).doc(String(TENANT_ID)).get(),
        db.collection(DB_COLLECTIONS.STORES).doc(String(STORE_ID)).get(),
        db.collection(DB_COLLECTIONS.STORES).doc(String(BRANCH_STORE_ID)).get(),
        db.collection(DB_COLLECTIONS.USERS).doc(USER_ID).get(),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(SUBSCRIPTION_ID).get(),
        projectRef.get(),
        db.collection(DB_COLLECTIONS.PROJECTS)
            .doc(String(TENANT_ID))
            .collection(String(STORE_ID))
            .get(),
        db.collection(DB_COLLECTIONS.PROJECTS)
            .doc(String(TENANT_ID))
            .collection(String(BRANCH_STORE_ID))
            .get(),
        db.collection(DB_COLLECTIONS.POS_SYNC_SECRETS).doc(`${TENANT_ID}_${STORE_ID}`).get(),
        db.collection(DB_COLLECTIONS.POS_SYNC_SECRETS).doc(`${TENANT_ID}_${BRANCH_STORE_ID}`).get(),
    ]);
    if (!tenant.exists || !store.exists || !branchStore.exists || !user.exists || !subscription.exists) {
        throw new Error('Local MenuList browser fixture readback failed.');
    }
    if (!isReadableStoreDocument(store.data(), STORE_ID)) {
        throw new Error('Local MenuList browser fixture store shape readback failed.');
    }
    if (!isReadableStoreDocument(branchStore.data(), BRANCH_STORE_ID)) {
        throw new Error('Local MenuList browser fixture branch store shape readback failed.');
    }
    if (store.data()?.sId !== STORE_ID || store.data()?.tId !== TENANT_ID) {
        throw new Error('Local MenuList browser fixture store alias readback failed.');
    }
    if (FIXTURE_PUBLIC_LINK_STATE === 'configured') {
        if (
            store.data()?.subdomain !== 'menulist-local-browser-qa'
            || store.data()?.customDomain !== 'menulist-local-browser-qa.localhost'
            || store.data()?.domainVerified !== true
        ) {
            throw new Error('Local MenuList browser fixture public-link readback failed.');
        }
    } else if (store.data()?.subdomain || store.data()?.customDomain || store.data()?.domainVerified !== undefined) {
        throw new Error('Local MenuList browser fixture missing-link readback failed.');
    }
    if (branchStore.data()?.sId !== BRANCH_STORE_ID || branchStore.data()?.tId !== TENANT_ID) {
        throw new Error('Local MenuList browser fixture branch store alias readback failed.');
    }
    if (store.data()?.posSync !== undefined || branchStore.data()?.posSync !== undefined || storePosSyncSecret.exists || branchPosSyncSecret.exists) {
        throw new Error('Local MenuList browser fixture POS sync cleanup readback failed.');
    }
    if (authUser.customClaims?.pId !== PRODUCT_IDS.MENULIST
        || authUser.customClaims?.platformRole !== 'OWNER'
        || String(authUser.customClaims?.tenantId) !== String(TENANT_ID)
        || String(authUser.customClaims?.storeId) !== String(STORE_ID)
        || !Array.isArray(authUser.customClaims?.storeIds)
        || !authUser.customClaims.storeIds.includes(String(BRANCH_STORE_ID))) {
        throw new Error('Local MenuList browser fixture claims readback failed.');
    }
    if (subscription.data()?.amount !== 0
        || subscription.data()?.manualPaymentEvidenceType !== 'local_certification_non_payment') {
        throw new Error('Local MenuList browser fixture payment boundary readback failed.');
    }
    if (project.exists !== (FIXTURE_MENU_STATE === 'seeded')) {
        throw new Error('Local MenuList browser fixture menu-state readback failed.');
    }
    if (!branchProjects.empty) {
        throw new Error('Local MenuList browser fixture branch must begin without a menu.');
    }
    const expectedMasterProjectCount = FIXTURE_MENU_STATE === 'seeded' ? 1 : 0;
    if (masterProjects.size !== expectedMasterProjectCount) {
        throw new Error('Local MenuList browser fixture master project cleanup readback failed.');
    }

    const clientApp = initializeClientApp({
        apiKey: 'menulist-local-emulator-only',
        appId: 'menulist-local-browser-fixture',
        projectId: PROJECT_ID,
    }, 'menulist-local-browser-client-verification');
    try {
        const clientAuth = getClientAuth(clientApp);
        connectAuthEmulator(clientAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
            disableWarnings: true,
        });
        const credential = await signInWithEmailAndPassword(clientAuth, FIXTURE_EMAIL, FIXTURE_PASSWORD);
        if (credential.user.uid !== USER_ID) {
            throw new Error('Local MenuList browser fixture credential readback returned the wrong user.');
        }
        const clientDb = getClientFirestore(clientApp);
        const [firestoreHost, firestorePort] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
        connectFirestoreEmulator(clientDb, firestoreHost, Number(firestorePort));
        const summarySnapshot = await getClientDoc(clientDoc(
            clientDb,
            DB_COLLECTIONS.PLATFORM_SUMMARY,
            `projects_${STORE_ID}`,
        ));
        const summaryProjects = parseSummaryProjects(summarySnapshot.data());
        const summaryProject = summaryProjects[PROJECT_DOCUMENT_ID];
        if (FIXTURE_MENU_STATE === 'seeded' && (
            !summarySnapshot.exists()
            || !isCompleteSummaryProject(summaryProject || {})
        )) {
            throw new Error('Local MenuList browser fixture project summary is not client-readable.');
        }
        if (FIXTURE_MENU_STATE === 'empty' && summaryProject) {
            throw new Error('Local MenuList browser fixture empty summary is not client-readable.');
        }
        await signOut(clientAuth);
    } catch (error) {
        throw new Error(
            'Local MenuList browser fixture is not reachable through the configured Auth/Firestore emulators. '
            + 'Verify that ports 9099 and 8080 are running with default project menulist-qa.',
            { cause: error },
        );
    } finally {
        await deleteApp(clientApp);
    }
}

async function main(): Promise<void> {
    await upsertAuthUser();
    await seedFirestore();
    await verifyFixture();
    process.stdout.write('MenuList local browser fixture ready in Firebase emulators.\n');
}

main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Local fixture failed.'}\n`);
    process.exitCode = 1;
});
