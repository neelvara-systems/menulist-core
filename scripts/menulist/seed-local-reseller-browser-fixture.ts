#!/usr/bin/env ts-node

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { MENULIST_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { deleteApp as deleteAdminApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { deleteApp, initializeApp as initializeClientApp } from 'firebase/app';
import {
    connectAuthEmulator,
    getAuth as getClientAuth,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';

const PROJECT_ID = 'menulist-qa';
const RESELLER_USER_ID = 'menulist-local-browser-reseller';
const RESELLER_PROFILE_ID = 'menulist-local-browser-reseller-profile';
const PLATFORM_USER_ID = 'menulist-local-browser-platform';
const RESELLER_CLIENT_SUBSCRIPTION_ID = 'menulist-local-browser-reseller-client';
const LOCAL_REPORT_ENQUIRY_ID = 'menulist-local-browser-report-enquiry';
const RESELLER_CLIENT_STORE_ID = 99611;
const RESELLER_CLIENT_TENANT_ID = 99601;

const RESELLER_EMAIL = String(process.env.MENULIST_LOCAL_RESELLER_EMAIL || '').trim().toLowerCase();
const RESELLER_PASSWORD = String(process.env.MENULIST_LOCAL_RESELLER_PASSWORD || '');
const PLATFORM_EMAIL = String(process.env.MENULIST_LOCAL_PLATFORM_EMAIL || '').trim().toLowerCase();
const PLATFORM_PASSWORD = String(process.env.MENULIST_LOCAL_PLATFORM_PASSWORD || '');

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Firebase Auth and Firestore emulator hosts are required.');
}
if ((process.env.GCLOUD_PROJECT || PROJECT_ID) !== PROJECT_ID) {
    throw new Error(`Local reseller fixture refuses project ${String(process.env.GCLOUD_PROJECT)}.`);
}
if (!RESELLER_EMAIL || !RESELLER_PASSWORD || !PLATFORM_EMAIL || !PLATFORM_PASSWORD) {
    throw new Error('Local reseller and platform fixture credentials are required.');
}
if (RESELLER_PASSWORD.length < 12 || PLATFORM_PASSWORD.length < 12) {
    throw new Error('Local fixture passwords must contain at least 12 characters.');
}

const appName = 'menulist-local-reseller-browser-fixture';
const existingApp = getApps().find((candidate) => candidate.name === appName);
const app = existingApp || initializeApp({ projectId: PROJECT_ID }, appName);
const auth = getAuth(app);
const db = getFirestore(app);

async function upsertAuthUser(params: {
    displayName: string;
    email: string;
    password: string;
    platformRole: string;
    resellerProfileId?: string;
    userId: string;
}): Promise<void> {
    try {
        await auth.getUser(params.userId);
        await auth.updateUser(params.userId, {
            disabled: false,
            displayName: params.displayName,
            email: params.email,
            emailVerified: true,
            password: params.password,
        });
    } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
        await auth.createUser({
            disabled: false,
            displayName: params.displayName,
            email: params.email,
            emailVerified: true,
            password: params.password,
            uid: params.userId,
        });
    }

    await auth.setCustomUserClaims(params.userId, {
        pId: PRODUCT_IDS.MENULIST,
        platformRole: params.platformRole,
        ...(params.resellerProfileId ? { resellerProfileId: params.resellerProfileId } : {}),
        role: '',
        storeIds: [],
        uId: params.userId,
    });
}

const userDocument = (params: {
    email: string;
    name: string;
    platformRole: string;
    resellerProfileId?: string;
    userId: string;
}) => ({
    active: true,
    authDisabled: false,
    createdOn: Timestamp.now(),
    deleted: false,
    email: params.email,
    firebaseUid: params.userId,
    id: params.userId,
    isVerified: true,
    name: params.name,
    onboardingSource: 'LOCAL_CERTIFICATION',
    pId: PRODUCT_IDS.MENULIST,
    platformRole: params.platformRole,
    productId: PRODUCT_IDS.MENULIST,
    profileImage: '',
    ...(params.resellerProfileId ? { resellerProfileId: params.resellerProfileId } : {}),
    role: '',
    storeIds: [],
    stores: [],
    uId: params.userId,
});

async function seedFirestore(): Promise<void> {
    const now = Timestamp.now();
    const validUntil = Timestamp.fromMillis(now.toMillis() + (45 * 24 * 60 * 60 * 1000));
    const batch = db.batch();
    batch.set(db.collection(DB_COLLECTIONS.USERS).doc(RESELLER_USER_ID), userDocument({
        email: RESELLER_EMAIL,
        name: 'MenuList Local QA Reseller',
        platformRole: RESELLER_USER_ROLE,
        resellerProfileId: RESELLER_PROFILE_ID,
        userId: RESELLER_USER_ID,
    }));
    batch.set(db.collection(DB_COLLECTIONS.USERS).doc(PLATFORM_USER_ID), userDocument({
        email: PLATFORM_EMAIL,
        name: 'MenuList Local QA Platform',
        platformRole: MENULIST_PLATFORM_USER_ROLE,
        userId: PLATFORM_USER_ID,
    }));
    batch.set(db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(RESELLER_PROFILE_ID), {
        active: true,
        activatedAt: now,
        addressLine: 'Local emulator fixture',
        authUserId: RESELLER_USER_ID,
        city: 'Bengaluru',
        country: 'India',
        createdBy: PLATFORM_USER_ID,
        createdOn: now,
        currentActiveOfflineStores: 1,
        email: RESELLER_EMAIL,
        id: RESELLER_PROFILE_ID,
        maxOfflineActivations: 20,
        modifiedOn: now,
        name: 'MenuList Local QA Reseller',
        phone: '0000000000',
        postalCode: '560001',
        state: 'Karnataka',
        totalOfflineStores: 1,
        totalOnlineStores: 0,
        totalRevenueCollectedPaise: 499000,
        totalStoresOnboarded: 1,
        totalTransactions: 1,
        username: 'menulist_local_qa_reseller',
    });
    batch.set(db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(RESELLER_CLIENT_SUBSCRIPTION_ID), {
        amount: 499000,
        billingMode: 'manual',
        commitmentPeriodMonths: 6,
        createdOn: now,
        currency: 'INR',
        id: RESELLER_CLIENT_SUBSCRIPTION_ID,
        manualPaymentConfirmed: true,
        manualPaymentEvidenceType: 'local_certification_non_payment',
        modifiedOn: now,
        name: 'MenuList Local QA Client',
        onboardingSource: 'RESELLER_ONBOARDING',
        pId: PRODUCT_IDS.MENULIST,
        planType: 'MONTH',
        productId: PRODUCT_IDS.MENULIST,
        quantity: 1,
        resellerId: RESELLER_USER_ID,
        resellerPricingTier: 'STANDARD',
        resellerProfileId: RESELLER_PROFILE_ID,
        sId: RESELLER_CLIENT_STORE_ID,
        status: 'active',
        storeId: RESELLER_CLIENT_STORE_ID,
        tId: RESELLER_CLIENT_TENANT_ID,
        tenantId: RESELLER_CLIENT_TENANT_ID,
        validUntil,
    });
    batch.set(db.collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES).doc(LOCAL_REPORT_ENQUIRY_ID), {
        createdOn: now,
        helpTopic: 'demo',
        id: LOCAL_REPORT_ENQUIRY_ID,
        message: 'Local emulator certification enquiry. No external contact or provider action is permitted.',
        modifiedOn: now,
        name: 'MenuList Local QA Owner',
        phoneNumber: '0000000000',
        source: 'menulist_public_contact',
        sourceKind: 'shareable_tool_report',
        sourcePath: '/tools/menu-readiness-check',
        sourcePrimaryNumber: 3,
        sourceReportStatus: 'missing_basics',
        sourceToolId: 'menu-readiness-check',
        status: 'new',
        workEmail: 'menulist.qa.owner@neelvara.com',
        sourceContext: {
            businessContext: 'Local emulator certification fixture',
            businessName: 'MenuList Local QA Business',
            missingCount: 3,
            notCheckedCount: 1,
            primaryNumber: 3,
            reportGeneratedAt: new Date(now.toMillis()).toISOString(),
            reportStatus: 'missing_basics',
            setupJobList: [
                {
                    id: 'confirm-hours',
                    label: 'Confirm current business hours',
                    reason: 'The local report fixture marks hours as missing.',
                },
            ],
            sourceKind: 'shareable_tool_report',
            toolId: 'menu-readiness-check',
            unclearCount: 1,
        },
    });
    await batch.commit();
}

async function verifyClientCredential(params: {
    email: string;
    expectedUserId: string;
    password: string;
    suffix: string;
}): Promise<void> {
    const clientApp = initializeClientApp({
        apiKey: 'menulist-local-emulator-only',
        appId: `menulist-local-${params.suffix}-fixture`,
        projectId: PROJECT_ID,
    }, `menulist-local-${params.suffix}-client-verification`);
    try {
        const clientAuth = getClientAuth(clientApp);
        connectAuthEmulator(clientAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
            disableWarnings: true,
        });
        const credential = await signInWithEmailAndPassword(clientAuth, params.email, params.password);
        if (credential.user.uid !== params.expectedUserId) {
            throw new Error(`Local ${params.suffix} credential returned the wrong user.`);
        }
        await signOut(clientAuth);
    } finally {
        await deleteApp(clientApp);
    }
}

async function verifyFixture(): Promise<void> {
    const [
        resellerAuth,
        platformAuth,
        resellerUser,
        platformUser,
        profile,
        clientSubscription,
        reportEnquiry,
    ] = await Promise.all([
        auth.getUser(RESELLER_USER_ID),
        auth.getUser(PLATFORM_USER_ID),
        db.collection(DB_COLLECTIONS.USERS).doc(RESELLER_USER_ID).get(),
        db.collection(DB_COLLECTIONS.USERS).doc(PLATFORM_USER_ID).get(),
        db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(RESELLER_PROFILE_ID).get(),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(RESELLER_CLIENT_SUBSCRIPTION_ID).get(),
        db.collection(DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES).doc(LOCAL_REPORT_ENQUIRY_ID).get(),
    ]);
    if (
        !resellerUser.exists
        || !platformUser.exists
        || !profile.exists
        || !clientSubscription.exists
        || !reportEnquiry.exists
    ) {
        throw new Error('Local reseller browser fixture Firestore readback failed.');
    }
    if (
        resellerAuth.customClaims?.platformRole !== RESELLER_USER_ROLE
        || resellerAuth.customClaims?.resellerProfileId !== RESELLER_PROFILE_ID
        || resellerUser.data()?.platformRole !== RESELLER_USER_ROLE
        || resellerUser.data()?.resellerProfileId !== RESELLER_PROFILE_ID
        || profile.data()?.authUserId !== RESELLER_USER_ID
        || clientSubscription.data()?.manualPaymentEvidenceType !== 'local_certification_non_payment'
        || clientSubscription.data()?.resellerId !== RESELLER_USER_ID
        || clientSubscription.data()?.resellerProfileId !== RESELLER_PROFILE_ID
        || reportEnquiry.data()?.source !== 'menulist_public_contact'
        || reportEnquiry.data()?.sourceKind !== 'shareable_tool_report'
        || reportEnquiry.data()?.sourceContext?.toolId !== 'menu-readiness-check'
    ) {
        throw new Error('Local reseller browser fixture authority readback failed.');
    }
    if (
        platformAuth.customClaims?.platformRole !== MENULIST_PLATFORM_USER_ROLE
        || platformUser.data()?.platformRole !== MENULIST_PLATFORM_USER_ROLE
    ) {
        throw new Error('Local platform browser fixture authority readback failed.');
    }
    await verifyClientCredential({
        email: RESELLER_EMAIL,
        expectedUserId: RESELLER_USER_ID,
        password: RESELLER_PASSWORD,
        suffix: 'reseller',
    });
    await verifyClientCredential({
        email: PLATFORM_EMAIL,
        expectedUserId: PLATFORM_USER_ID,
        password: PLATFORM_PASSWORD,
        suffix: 'platform',
    });
}

async function main(): Promise<void> {
    try {
        await Promise.all([
            upsertAuthUser({
                displayName: 'MenuList Local QA Reseller',
                email: RESELLER_EMAIL,
                password: RESELLER_PASSWORD,
                platformRole: RESELLER_USER_ROLE,
                resellerProfileId: RESELLER_PROFILE_ID,
                userId: RESELLER_USER_ID,
            }),
            upsertAuthUser({
                displayName: 'MenuList Local QA Platform',
                email: PLATFORM_EMAIL,
                password: PLATFORM_PASSWORD,
                platformRole: MENULIST_PLATFORM_USER_ROLE,
                userId: PLATFORM_USER_ID,
            }),
        ]);
        await seedFirestore();
        await verifyFixture();
        process.stdout.write('MenuList local reseller and platform browser fixtures ready in Firebase emulators.\n');
    } finally {
        await deleteAdminApp(app);
    }
}

main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Local reseller fixture failed.'}\n`);
    process.exitCode = 1;
});
