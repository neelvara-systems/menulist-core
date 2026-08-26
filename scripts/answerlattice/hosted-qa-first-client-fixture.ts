#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmod, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createDefaultAnswerlatticeRoles, DEFAULT_ANSWERLATTICE_ROLE_IDS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticePlanById } from '@data/answerlattice/plans';
import { getOwnerRoleId } from '@data/defaultRoles';
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
import { getContextContentSummaryDocId, parseProductSurfaceSaveInput } from '@lib/answerlattice/productSurfaceContent';
import {
    ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE,
    getAnswerlatticeTenantSummaryShardId,
} from '@lib/answerlattice/tenantSummaryAdmin';
import { createTenantStoreInTransaction } from '@lib/onboarding/createTenantStore';
import { applicationDefault, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore';

const MENULIST_QA_PROJECT_ID = 'menulist-qa';
const ANSWERLATTICE_QA_PROJECT_ID = 'neelvara-answerlattice-qa';
const OPERATOR_EMAIL = 'admin@neelvara.com';
const FIXTURE_PREFIX = 'al-first-client-qa';
const MAX_LEASE_HOURS = 72;
const ALLOWED_ORIGINS = ['https://app.menulist.digital'];

function getQaLaunchMonthlyCredits(): number {
    const plan = getAnswerlatticePlanById('answerlattice_launch', 'MONTH');
    if (!plan || !Number.isSafeInteger(plan.priceINR.monthlyCredits) || plan.priceINR.monthlyCredits <= 0) {
        throw new Error('Answerlattice Launch monthly credits are not configured safely.');
    }
    return plan.priceINR.monthlyCredits;
}

type Command = 'prepare' | 'reconcile' | 'verify' | 'inspect' | 'cleanup-empty';

type FirebaseCliAccount = {
    tokens: { refresh_token?: string };
    user: { email?: string };
};

type FirebaseCliAuth = {
    findAccountByEmail(email: string): FirebaseCliAccount | undefined;
};

type FirebaseCliApi = {
    clientId(): string;
    clientSecret(): string;
};

type FixtureCredentials = {
    credentialVersion: 1;
    email: string;
    fixtureId: string;
    password: string;
    scope: { storeId: number; tenantId: number };
    widgetKey: string;
};

const SURFACE_TEMPLATES = {
    onboarding: {
        label: 'Onboarding',
        routePatterns: ['/onboarding', '/setup/*', '/get-started/*'],
        feature: 'onboarding',
        page: 'setup',
        workflow: 'complete_setup',
        entityHints: ['setup', 'import', 'activation'],
        tags: ['onboarding', 'setup'],
        priority: 110,
    },
    settings: {
        label: 'Settings',
        routePatterns: ['/settings', '/settings/*'],
        feature: 'settings',
        page: 'settings',
        workflow: 'manage_workspace',
        entityHints: ['settings', 'workspace', 'configuration'],
        tags: ['settings'],
        priority: 100,
    },
    billing: {
        label: 'Billing',
        routePatterns: ['/billing', '/billing/*', '/settings/billing/*'],
        feature: 'billing',
        page: 'billing',
        workflow: 'manage_subscription',
        entityHints: ['invoice', 'subscription', 'payment'],
        tags: ['billing', 'subscription'],
        priority: 120,
    },
} as const;

function readArg(name: string): string | null {
    const prefix = `--${name}=`;
    const match = process.argv.slice(3).find(argument => argument.startsWith(prefix));
    return match ? match.slice(prefix.length) : null;
}

function readCommand(): Command {
    const command = process.argv[2];
    if (
        command === 'prepare'
        || command === 'reconcile'
        || command === 'verify'
        || command === 'inspect'
        || command === 'cleanup-empty'
    ) return command;
    throw new Error(
        'Usage: hosted-qa-first-client-fixture.ts <prepare|reconcile|verify|inspect|cleanup-empty> '
        + `--confirm-menulist-project=${MENULIST_QA_PROJECT_ID} `
        + `--confirm-answerlattice-project=${ANSWERLATTICE_QA_PROJECT_ID} `
        + '[--fixture-id=<id>] [--credential-output=/tmp/file.json]',
    );
}

function requireProjectConfirmation(): void {
    if (
        readArg('confirm-menulist-project') !== MENULIST_QA_PROJECT_ID
        || readArg('confirm-answerlattice-project') !== ANSWERLATTICE_QA_PROJECT_ID
    ) {
        throw new Error('Both exact QA project confirmations are required.');
    }
    if (
        process.env.FIRESTORE_EMULATOR_HOST
        || process.env.FIREBASE_AUTH_EMULATOR_HOST
        || process.env.FIREBASE_STORAGE_EMULATOR_HOST
    ) {
        throw new Error('Hosted first-client fixture refuses emulator hosts.');
    }
}

function normalizeFixtureId(value: string | null): string {
    if (!value || !/^al-first-client-qa-[a-z0-9]{10}$/.test(value)) {
        throw new Error(`Pass --fixture-id=${FIXTURE_PREFIX}-<10 lowercase letters or digits>.`);
    }
    return value;
}

function getUserDocumentId(email: string): string {
    return `oauth_${createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 40)}`;
}

function resolveFirebaseCliModule(name: 'api.js' | 'auth.js'): string {
    const firebaseBin = execFileSync('which', ['firebase'], { encoding: 'utf8' }).trim();
    const resolvedBin = realpathSync(firebaseBin);
    return join(dirname(resolvedBin), '..', name);
}

let ephemeralAdcDirectory: string | null = null;

async function establishEphemeralFirebaseCliAdc(): Promise<void> {
    const localRequire = createRequire(__filename);
    const firebaseCliAuth = localRequire(resolveFirebaseCliModule('auth.js')) as FirebaseCliAuth;
    const firebaseCliApi = localRequire(resolveFirebaseCliModule('api.js')) as FirebaseCliApi;
    const account = firebaseCliAuth.findAccountByEmail(OPERATOR_EMAIL);
    const refreshToken = account?.tokens.refresh_token;
    if (!account || account.user.email !== OPERATOR_EMAIL || !refreshToken) {
        throw new Error(`Run firebase login --reauth as ${OPERATOR_EMAIL} before using this QA fixture.`);
    }
    ephemeralAdcDirectory = await mkdtemp(join(tmpdir(), 'answerlattice-first-client-qa-adc-'));
    const credentialPath = join(ephemeralAdcDirectory, 'application_default_credentials.json');
    await writeFile(credentialPath, JSON.stringify({
        client_id: firebaseCliApi.clientId(),
        client_secret: firebaseCliApi.clientSecret(),
        quota_project_id: ANSWERLATTICE_QA_PROJECT_ID,
        refresh_token: refreshToken,
        type: 'authorized_user',
    }), { mode: 0o600 });
    await chmod(credentialPath, 0o600);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
}

let menuListApp: App;
let answerlatticeApp: App;
let menuListDb: Firestore;
let answerlatticeDb: Firestore;
let menuListAuth: Auth;
let answerlatticeAuth: Auth;

async function initializeServices(): Promise<void> {
    await establishEphemeralFirebaseCliAdc();
    menuListApp = initializeApp({
        credential: applicationDefault(),
        projectId: MENULIST_QA_PROJECT_ID,
    }, `menulist-${randomUUID()}`);
    answerlatticeApp = initializeApp({
        credential: applicationDefault(),
        projectId: ANSWERLATTICE_QA_PROJECT_ID,
    }, `answerlattice-${randomUUID()}`);
    menuListDb = getFirestore(menuListApp);
    answerlatticeDb = getFirestore(answerlatticeApp);
    menuListAuth = getAuth(menuListApp);
    answerlatticeAuth = getAuth(answerlatticeApp);
}

async function writeInitialSurfaces(params: {
    storeId: number;
    tenantId: number;
    userId: string;
    now: Timestamp;
}): Promise<void> {
    const batch = answerlatticeDb.batch();
    const summarySurfaces: Record<string, unknown> = {};
    Object.entries(SURFACE_TEMPLATES).forEach(([key, template]) => {
        const parsed = parseProductSurfaceSaveInput({
            key,
            label: template.label,
            description: `Initial ${template.label.toLowerCase()} product surface from Answerlattice onboarding.`,
            routePatterns: template.routePatterns,
            feature: template.feature,
            page: template.page,
            workflow: template.workflow,
            entityHints: template.entityHints,
            tags: template.tags,
            active: true,
            priority: template.priority,
            visibility: { helpWidget: true, helpCenter: true, changelog: true },
        }, { tId: params.tenantId, sId: params.storeId });
        const docId = `${params.tenantId}_${params.storeId}_${parsed.key}`;
        batch.create(answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES).doc(docId), {
            ...parsed,
            createdOn: params.now,
            modifiedOn: params.now,
            createdBy: params.userId,
            modifiedBy: params.userId,
            uId: params.userId,
            onboardingSource: 'ANSWERLATTICE_QA_FIRST_CLIENT_FIXTURE',
            qaFirstClientFixture: true,
        });
        summarySurfaces[parsed.key] = {
            key: parsed.key,
            label: parsed.label,
            routePatterns: parsed.routePatterns,
            feature: parsed.feature,
            page: parsed.page,
            workflow: parsed.workflow,
            entityHints: parsed.entityHints,
            entityIds: [],
            tags: parsed.tags,
            visibility: parsed.visibility,
            articles: [],
            changelogs: [],
            tickets: { total: 0, open: 0, recentDisplayIds: [] },
        };
    });
    batch.create(
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getContextContentSummaryDocId(params.tenantId, params.storeId)),
        {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tId: params.tenantId,
            tenantId: params.tenantId,
            sId: params.storeId,
            storeId: params.storeId,
            generatedAt: params.now,
            source: 'answerlattice_qa_first_client_fixture',
            surfaceCount: Object.keys(SURFACE_TEMPLATES).length,
            articleCount: 0,
            changelogCount: 0,
            ticketCount: 0,
            surfaces: summarySurfaces,
            qaFirstClientFixture: true,
        },
    );
    await batch.commit();
}

async function writeOnboardingControlPlane(params: {
    storeId: number;
    tenantId: number;
}): Promise<void> {
    const scope = { tId: params.tenantId, sId: params.storeId };
    const sourceVersions = normalizeCompiledSourceVersions({
        surfaces: 1,
        widgetConfig: 1,
        workspaceProfile: 1,
    });
    const now = FieldValue.serverTimestamp();
    const key = `${params.tenantId}_${params.storeId}`;
    const batch = answerlatticeDb.batch();

    batch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeSourceVersionsDocId(params.tenantId, params.storeId)),
        {
            ...getAnswerlatticeMissingSourceVersionsBase(scope),
            ...sourceVersions,
            lastReason: 'initial_surfaces_created',
            lastSourceType: 'answerlattice_product_surfaces',
            updatedAt: now,
        },
        { merge: false },
    );
    batch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeBundleManifestDocId(params.tenantId, params.storeId)),
        {
            ...getAnswerlatticeMissingBundleManifestBase(scope),
            lastReason: 'client_onboarding',
            lastSourceType: 'answerlattice_workspace',
            sourceVersions,
            status: 'empty',
            updatedAt: now,
        },
        { merge: false },
    );
    batch.set(
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeTenantSummaryShardId(params.tenantId, params.storeId)),
        {
            summaryType: ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE,
            shardVersion: 1,
            tenants: {
                [key]: {
                    active: true,
                    businessDayEndTime: '23:59',
                    hasEntities: false,
                    lastSeenAt: now,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    sId: params.storeId,
                    source: 'client_onboarding',
                    tId: params.tenantId,
                    timeZone: 'Asia/Kolkata',
                    updatedAt: now,
                },
            },
            updatedAt: now,
        },
        { merge: true },
    );
    await batch.commit();
}

async function reconcileQaPlanCredits(marker: Record<string, any>): Promise<void> {
    const expectedAllowance = getQaLaunchMonthlyCredits();
    const subscriptionRef = answerlatticeDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(marker.subscriptionId);
    const storeRef = answerlatticeDb.collection(DB_COLLECTIONS.STORES).doc(String(marker.storeId));
    await answerlatticeDb.runTransaction(async transaction => {
        const [subscriptionSnapshot, storeSnapshot] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(storeRef),
        ]);
        assert.equal(subscriptionSnapshot.exists, true, 'QA fixture subscription is missing.');
        assert.equal(storeSnapshot.exists, true, 'QA fixture store is missing.');
        const subscription = subscriptionSnapshot.data() || {};
        const storeSummary = storeSnapshot.data()?.answerlatticeSubscription || {};
        assert.equal(subscription.qaCertification?.purpose, 'answerlattice_first_client_hosted_qa');
        assert.equal(storeSummary.qaCertification?.purpose, 'answerlattice_first_client_hosted_qa');

        const reconcileRemaining = (record: Record<string, any>) => {
            const currentAllowance = record.monthlyCreditsAllowance;
            const currentRemaining = record.monthlyCredits;
            assert.equal(Number.isSafeInteger(currentAllowance) && currentAllowance > 0, true);
            assert.equal(Number.isSafeInteger(currentRemaining) && currentRemaining >= 0, true);
            const consumed = Math.max(currentAllowance - currentRemaining, 0);
            return Math.max(expectedAllowance - consumed, 0);
        };
        transaction.update(subscriptionRef, {
            monthlyCreditsAllowance: expectedAllowance,
            monthlyCredits: reconcileRemaining(subscription),
            updatedOn: FieldValue.serverTimestamp(),
        });
        transaction.update(storeRef, {
            'answerlatticeSubscription.monthlyCreditsAllowance': expectedAllowance,
            'answerlatticeSubscription.monthlyCredits': reconcileRemaining(storeSummary),
            'answerlatticeSubscription.updatedAt': FieldValue.serverTimestamp(),
        });
    });
}

async function prepare(): Promise<void> {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
    const fixtureId = `${FIXTURE_PREFIX}-${suffix}`;
    const email = `answerlattice.qa.owner.${suffix}@neelvara.com`;
    const password = `ALqa!${randomBytes(18).toString('base64url')}`;
    const widgetKey = `al_${randomUUID().replaceAll('-', '')}`;
    const widgetKeyHash = createHash('sha256').update(widgetKey).digest('hex');
    const userId = getUserDocumentId(email);
    const credentialOutput = readArg('credential-output') || `/tmp/${fixtureId}-credentials.json`;
    if (!credentialOutput.startsWith('/tmp/') || !credentialOutput.endsWith('.json')) {
        throw new Error('Credential output must be an absolute /tmp/*.json path.');
    }

    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + (MAX_LEASE_HOURS * 60 * 60 * 1000));
    const operationId = `qa_first_client_${randomUUID()}`;
    const monthlyCredits = getQaLaunchMonthlyCredits();
    const markerRef = answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`${fixtureId}-marker`);
    assert.equal((await markerRef.get()).exists, false, 'Fixture marker already exists.');

    const menuListAuthUser = await menuListAuth.createUser({
        uid: `${fixtureId}-auth`,
        disabled: false,
        displayName: 'MenuList QA First Client Owner',
        email,
        emailVerified: true,
        password,
    });
    let answerlatticeAuthUser: Awaited<ReturnType<Auth['createUser']>> | null = null;
    let tenantId = 0;
    let storeId = 0;

    try {
        answerlatticeAuthUser = await answerlatticeAuth.createUser({
            disabled: false,
            displayName: 'MenuList QA First Client Owner',
            email,
            emailVerified: true,
        });

        const core = await answerlatticeDb.runTransaction(async transaction => {
            const created = await createTenantStoreInTransaction(transaction, answerlatticeDb, {
                businessName: 'Neelvara Systems QA',
                businessType: 'SaaS',
                businessIndustry: 'B2B',
                email,
                onboardingSource: 'ANSWERLATTICE_QA_FIRST_CLIENT_FIXTURE',
                storeName: 'MenuList QA First Client',
                allowInitialCounters: true,
                tenantExtra: {
                    active: true,
                    billingModel: 'subscription',
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    productName: 'MenuList',
                    productUrl: 'https://app.menulist.digital',
                    supportEmail: 'support@neelvara.com',
                    qaFirstClientFixture: fixtureId,
                },
                storeExtra: {
                    active: true,
                    answerlatticeWorkspaceProfileRevision: 0,
                    answerlatticeLaunchProfile: {
                        billingModel: 'subscription',
                        businessDayEndTime: '23:59',
                        createdAt: now,
                        primarySurfaces: Object.keys(SURFACE_TEMPLATES),
                        productUrl: 'https://app.menulist.digital',
                        supportEmail: 'support@neelvara.com',
                        timeZone: 'Asia/Kolkata',
                    },
                    billingModel: 'subscription',
                    businessDayEndTime: '23:59',
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    primarySurfaces: Object.keys(SURFACE_TEMPLATES),
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    productName: 'MenuList',
                    productUrl: 'https://app.menulist.digital',
                    supportEmail: 'support@neelvara.com',
                    timeZone: 'Asia/Kolkata',
                    widgetAllowedOrigins: ALLOWED_ORIGINS,
                    qaFirstClientFixture: fixtureId,
                },
            });
            return created;
        });
        tenantId = core.tenantId;
        storeId = core.storeId;

        const subscriptionId = `${fixtureId}-subscription`;
        const currentBillingPeriod = now.toDate().getUTCFullYear() * 100 + now.toDate().getUTCMonth() + 1;
        const productAccount = {
            accessRevision: 1,
            active: true,
            authDisabled: false,
            deleted: false,
            role: DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER,
            sId: storeId,
            storeId,
            storeIds: [storeId],
            tId: tenantId,
            tenantId,
        };
        const widgetApiState = buildAnswerlatticeWidgetApiStateWithNewKey({
            apiKey: widgetKey,
            keyHash: widgetKeyHash,
            name: 'MenuList QA first-client widget key',
            nowIso: now.toDate().toISOString(),
        }).state;
        const subscriptionSummary = {
            id: subscriptionId,
            providerSubscriptionId: subscriptionId,
            providerPlanId: 'qa_first_client_answerlattice_launch',
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantId,
            tenantId,
            sId: storeId,
            storeId,
            planId: 'answerlattice_launch',
            planName: 'Launch — QA First Client',
            planType: 'MONTH',
            status: 'active',
            providerStatus: 'active',
            cycleStartDate: now,
            cycleEndDate: expiresAt,
            subscriptionStartDate: now,
            subscriptionEndDate: expiresAt,
            monthlyCreditsAllowance: monthlyCredits,
            monthlyCredits,
            topUpCredits: 0,
            creditsLastResetMonth: currentBillingPeriod,
            manualPaymentEvidenceType: 'qa_certification_non_payment',
            qaCertification: {
                expiresAt,
                fixture: true,
                issuedAt: now,
                maxLeaseHours: MAX_LEASE_HOURS,
                operationId,
                projectId: ANSWERLATTICE_QA_PROJECT_ID,
                purpose: 'answerlattice_first_client_hosted_qa',
            },
            updatedAt: now,
        };

        const menuListBatch = menuListDb.batch();
        menuListBatch.create(menuListDb.collection(DB_COLLECTIONS.USERS).doc(userId), {
            active: true,
            authDisabled: false,
            createdBy: 'Answerlattice QA first-client fixture',
            createdOn: now,
            deleted: false,
            email,
            id: userId,
            image: '',
            isVerified: true,
            modifiedBy: 'Answerlattice QA first-client fixture',
            modifiedOn: now,
            name: 'MenuList QA First Client Owner',
            pId: PRODUCT_IDS.MENULIST,
            platformRole: 'OWNER',
            productAccounts: { [PRODUCT_IDS.ANSWERLATTICE]: productAccount },
            productId: PRODUCT_IDS.MENULIST,
            role: 'PLATFORM',
            sId: 0,
            storeId: null,
            storeIds: [],
            stores: [],
            tId: 0,
            tenantId: null,
            uId: 0,
            qaFirstClientFixture: fixtureId,
        });
        await menuListBatch.commit();

        const answerlatticeBatch = answerlatticeDb.batch();
        const storeRef = answerlatticeDb.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        answerlatticeBatch.set(storeRef, {
            answerlatticeRoles: createDefaultAnswerlatticeRoles({
                createdBy: userId,
                sId: storeId,
                tId: tenantId,
            }),
            answerlatticeSubscription: subscriptionSummary,
            answerlatticeWidgetApi: widgetApiState,
            sId: storeId,
            storeId,
            tId: tenantId,
            tenantId,
        }, { merge: true });
        answerlatticeBatch.create(answerlatticeDb.collection(DB_COLLECTIONS.USERS).doc(userId), {
            active: true,
            authDisabled: false,
            createdOn: now,
            deleted: false,
            email,
            id: userId,
            image: '',
            isVerified: true,
            modifiedOn: now,
            name: 'MenuList QA First Client Owner',
            pId: PRODUCT_IDS.ANSWERLATTICE,
            platformRole: 'OWNER',
            productAccounts: { [PRODUCT_IDS.ANSWERLATTICE]: productAccount },
            productId: PRODUCT_IDS.ANSWERLATTICE,
            role: DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER,
            sId: storeId,
            storeId,
            storeIds: [storeId],
            stores: [{ name: 'MenuList QA First Client', role: DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER, storeId }],
            tId: tenantId,
            tenantId,
            uId: userId,
            qaFirstClientFixture: fixtureId,
        });
        answerlatticeBatch.create(answerlatticeDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId), {
            ...subscriptionSummary,
            amount: 0,
            billingHistory: [],
            billingMode: 'manual',
            createdOn: now,
            currency: 'INR',
            email,
            manualPaymentConfirmed: true,
            manualPaymentConfirmedAt: now,
            name: 'MenuList QA First Client',
            paymentMethod: null,
            paymentProvider: 'razorpay',
            quantity: 1,
            renewsOn: null,
            statuses: [{
                amount: 0,
                currency: 'INR',
                remark: 'Synthetic non-payment entitlement for hosted first-client QA only.',
                status: 'active',
                timestamp: now,
            }],
            totalPaymentsMadeCount: 0,
            totalPaymentsNeededCount: 0,
            updatedOn: now,
            userId,
            userType: 'B2B',
        });
        answerlatticeBatch.create(markerRef, {
            answerlatticeAuthUid: answerlatticeAuthUser.uid,
            authUid: menuListAuthUser.uid,
            createdOn: now,
            email,
            expiresAt,
            fixtureType: 'answerlattice_first_client_hosted_qa_fixture',
            operationId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            sId: storeId,
            status: 'active',
            storeId,
            subscriptionId,
            tId: tenantId,
            tenantId,
            userId,
        });
        await answerlatticeBatch.commit();
        await writeInitialSurfaces({ storeId, tenantId, userId, now });
        await writeOnboardingControlPlane({ storeId, tenantId });

        await menuListAuth.setCustomUserClaims(menuListAuthUser.uid, {
            pId: PRODUCT_IDS.MENULIST,
            platformRole: 'OWNER',
            uId: userId,
        });
        await answerlatticeAuth.setCustomUserClaims(answerlatticeAuthUser.uid, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            role: DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER,
            sId: storeId,
            storeId,
            tId: tenantId,
            tenantId,
            uId: userId,
        });

        const credentials: FixtureCredentials = {
            credentialVersion: 1,
            email,
            fixtureId,
            password,
            scope: { storeId, tenantId },
            widgetKey,
        };
        await writeFile(credentialOutput, JSON.stringify(credentials, null, 2), { mode: 0o600 });
        await chmod(credentialOutput, 0o600);
        assert.equal((await stat(credentialOutput)).mode & 0o777, 0o600);

        process.stdout.write(JSON.stringify({
            credentialOutput,
            email,
            expiresAt: expiresAt.toDate().toISOString(),
            fixtureId,
            projects: {
                answerlattice: ANSWERLATTICE_QA_PROJECT_ID,
                authentication: MENULIST_QA_PROJECT_ID,
            },
            scope: { storeId, tenantId },
            status: 'prepared',
            widgetKeyStoredOnlyInCredentialFile: true,
        }, null, 2) + '\n');
    } catch (error) {
        if (tenantId > 0 || storeId > 0) {
            process.stderr.write('First-client persistence may be partial; inspect both project markers before retrying.\n');
        } else {
            await Promise.allSettled([
                menuListAuth.deleteUser(menuListAuthUser.uid),
                answerlatticeAuthUser ? answerlatticeAuth.deleteUser(answerlatticeAuthUser.uid) : Promise.resolve(),
            ]);
        }
        throw error;
    }
}

async function readFixture(fixtureId: string) {
    const marker = await answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`${fixtureId}-marker`)
        .get();
    assert.equal(marker.exists, true, 'First-client fixture marker is missing.');
    const markerData = marker.data() || {};
    assert.equal(markerData.fixtureType, 'answerlattice_first_client_hosted_qa_fixture');
    assert.equal(markerData.pId, PRODUCT_IDS.ANSWERLATTICE);
    assert.equal(markerData.productId, PRODUCT_IDS.ANSWERLATTICE);
    assert.ok(markerData.expiresAt instanceof Timestamp);
    return markerData;
}

async function verify(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const marker = await readFixture(fixtureId);
    const tenantSummaryShardId = getAnswerlatticeTenantSummaryShardId(marker.tenantId, marker.storeId);
    const [
        menuListAuthUser,
        answerlatticeAuthUser,
        menuListUser,
        answerlatticeUser,
        tenant,
        store,
        subscription,
        surfaces,
        summary,
        sourceVersions,
        bundleManifest,
        tenantSummaryShard,
    ] = await Promise.all([
        menuListAuth.getUser(marker.authUid),
        answerlatticeAuth.getUser(marker.answerlatticeAuthUid),
        menuListDb.collection(DB_COLLECTIONS.USERS).doc(marker.userId).get(),
        answerlatticeDb.collection(DB_COLLECTIONS.USERS).doc(marker.userId).get(),
        answerlatticeDb.collection(DB_COLLECTIONS.TENANTS).doc(String(marker.tenantId)).get(),
        answerlatticeDb.collection(DB_COLLECTIONS.STORES).doc(String(marker.storeId)).get(),
        answerlatticeDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(marker.subscriptionId).get(),
        answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES)
            .where('tId', '==', marker.tenantId)
            .where('sId', '==', marker.storeId)
            .limit(10)
            .get(),
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getContextContentSummaryDocId(marker.tenantId, marker.storeId))
            .get(),
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeSourceVersionsDocId(marker.tenantId, marker.storeId))
            .get(),
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeBundleManifestDocId(marker.tenantId, marker.storeId))
            .get(),
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(tenantSummaryShardId)
            .get(),
    ]);
    assert.equal(menuListAuthUser.email, marker.email);
    assert.equal(menuListAuthUser.emailVerified, true);
    assert.equal(answerlatticeAuthUser.email, marker.email);
    assert.equal(answerlatticeAuthUser.emailVerified, true);
    assert.equal(menuListUser.exists, true);
    assert.equal(menuListUser.data()?.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.tenantId, marker.tenantId);
    assert.equal(menuListUser.data()?.productAccounts?.[PRODUCT_IDS.ANSWERLATTICE]?.storeId, marker.storeId);
    assert.equal(answerlatticeUser.exists, true);
    assert.equal(answerlatticeUser.data()?.role, DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER);
    assert.equal(tenant.data()?.qaFirstClientFixture, fixtureId);
    assert.equal(store.data()?.qaFirstClientFixture, fixtureId);
    assert.deepEqual(store.data()?.widgetAllowedOrigins, ALLOWED_ORIGINS);
    assert.equal(store.data()?.answerlatticeSubscription?.status, 'active');
    assert.equal(store.data()?.answerlatticeSubscription?.manualPaymentEvidenceType, 'qa_certification_non_payment');
    assert.equal(store.data()?.answerlatticeSubscription?.monthlyCreditsAllowance, getQaLaunchMonthlyCredits());
    assert.equal(subscription.data()?.amount, 0);
    assert.equal(subscription.data()?.status, 'active');
    assert.equal(subscription.data()?.qaCertification?.purpose, 'answerlattice_first_client_hosted_qa');
    assert.equal(subscription.data()?.monthlyCreditsAllowance, getQaLaunchMonthlyCredits());
    assert.equal(surfaces.size, Object.keys(SURFACE_TEMPLATES).length);
    assert.equal(summary.data()?.surfaceCount, Object.keys(SURFACE_TEMPLATES).length);
    assert.equal(areAnswerlatticeCompiledSourceVersionsValid(sourceVersions.data()), true);
    assert.equal(sourceVersions.data()?.surfaces, 1);
    assert.equal(sourceVersions.data()?.widgetConfig, 1);
    assert.equal(sourceVersions.data()?.workspaceProfile, 1);
    assert.equal(
        isAnswerlatticeContextBundleManifestForScope(
            bundleManifest.data(),
            marker.tenantId,
            marker.storeId,
        ),
        true,
    );
    assert.equal(bundleManifest.data()?.sourceVersions?.surfaces, 1);
    assert.equal(tenantSummaryShard.data()?.summaryType, ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE);
    assert.equal(tenantSummaryShard.data()?.tenants?.[`${marker.tenantId}_${marker.storeId}`]?.active, true);
    assert.equal(tenantSummaryShard.data()?.tenants?.[`${marker.tenantId}_${marker.storeId}`]?.hasEntities, false);
    const widgetState = store.data()?.answerlatticeWidgetApi || {};
    assert.equal(typeof widgetState.activeKeyHash, 'string');
    assert.match(widgetState.activeKeyHash, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(store.data()).includes('al_'), true, 'Masked key metadata should retain the public prefix.');
    for (const forbiddenRawKeyField of ['apiKey', 'rawKey', 'widgetKey']) {
        assert.equal(
            Object.hasOwn(store.data() || {}, forbiddenRawKeyField)
                || Object.hasOwn(widgetState, forbiddenRawKeyField),
            false,
            `Raw widget key field must not be persisted: ${forbiddenRawKeyField}`,
        );
    }

    process.stdout.write(JSON.stringify({
        email: marker.email,
        expiresAt: marker.expiresAt.toDate().toISOString(),
        fixtureId,
        projects: {
            answerlattice: ANSWERLATTICE_QA_PROJECT_ID,
            authentication: MENULIST_QA_PROJECT_ID,
        },
        scope: { storeId: marker.storeId, tenantId: marker.tenantId },
        status: 'verified',
        surfaces: surfaces.size,
        credits: {
            allowance: subscription.data()?.monthlyCreditsAllowance,
            remaining: subscription.data()?.monthlyCredits,
        },
    }, null, 2) + '\n');
}

async function reconcile(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const marker = await readFixture(fixtureId);
    const scopedCollections = [
        DB_COLLECTIONS.KB_ARTICLES,
        DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
        DB_COLLECTIONS.ANSWERLATTICE_ENTITIES,
        DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS,
        DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES,
        DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS,
    ];
    for (const collectionName of scopedCollections) {
        const rows = await answerlatticeDb.collection(collectionName)
            .where('tId', '==', marker.tenantId)
            .where('sId', '==', marker.storeId)
            .limit(1)
            .get();
        assert.equal(rows.empty, true, `Refusing to reconcile a non-empty workspace: ${collectionName}.`);
    }
    const surfaces = await answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES)
        .where('tId', '==', marker.tenantId)
        .where('sId', '==', marker.storeId)
        .limit(Object.keys(SURFACE_TEMPLATES).length + 1)
        .get();
    assert.equal(surfaces.size, Object.keys(SURFACE_TEMPLATES).length);
    assert.equal(surfaces.docs.every(document => document.data().qaFirstClientFixture === true), true);
    await writeOnboardingControlPlane({
        storeId: marker.storeId,
        tenantId: marker.tenantId,
    });
    await reconcileQaPlanCredits(marker);
    process.stdout.write(JSON.stringify({ fixtureId, status: 'reconciled' }, null, 2) + '\n');
}

async function inspect(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const marker = await readFixture(fixtureId);
    const entities = await answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', marker.tenantId)
        .where('sId', '==', marker.storeId)
        .limit(250)
        .get();

    process.stdout.write(JSON.stringify({
        fixtureId,
        scope: { storeId: marker.storeId, tenantId: marker.tenantId },
        entities: entities.docs
            .map(document => ({
                id: document.id,
                name: String(document.data().name || ''),
                slug: String(document.data().slug || ''),
                status: String(document.data().status || ''),
            }))
            .sort((left, right) => left.name.localeCompare(right.name)),
        status: 'inspected',
    }, null, 2) + '\n');
}

async function cleanupEmpty(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const marker = await readFixture(fixtureId);
    const scopedCollections = [
        DB_COLLECTIONS.KB_ARTICLES,
        DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
        DB_COLLECTIONS.ANSWERLATTICE_ENTITIES,
        DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS,
        DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES,
        DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS,
        DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
        DB_COLLECTIONS.SUPPORT_TICKETS,
        DB_COLLECTIONS.CHAT_SESSIONS,
    ];
    for (const collectionName of scopedCollections) {
        const rows = await answerlatticeDb.collection(collectionName)
            .where('tId', '==', marker.tenantId)
            .where('sId', '==', marker.storeId)
            .limit(1)
            .get();
        assert.equal(rows.empty, true, `Fixture has test data in ${collectionName}; use the workspace lifecycle cleanup.`);
    }

    const surfaces = await answerlatticeDb.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES)
        .where('tId', '==', marker.tenantId)
        .where('sId', '==', marker.storeId)
        .limit(10)
        .get();
    assert.equal(surfaces.size, Object.keys(SURFACE_TEMPLATES).length);
    assert.equal(surfaces.docs.every(doc => doc.data().qaFirstClientFixture === true), true);

    const answerlatticeBatch = answerlatticeDb.batch();
    surfaces.docs.forEach(document => answerlatticeBatch.delete(document.ref));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(marker.subscriptionId));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.USERS).doc(marker.userId));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.STORES).doc(String(marker.storeId)));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.TENANTS).doc(String(marker.tenantId)));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`${fixtureId}-marker`));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getContextContentSummaryDocId(marker.tenantId, marker.storeId)));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(marker.tenantId, marker.storeId)));
    answerlatticeBatch.delete(answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(marker.tenantId, marker.storeId)));
    answerlatticeBatch.update(
        answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeTenantSummaryShardId(marker.tenantId, marker.storeId)),
        {
            [`tenants.${marker.tenantId}_${marker.storeId}`]: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        },
    );
    answerlatticeBatch.set(answerlatticeDb.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
        [`stores.${String(marker.storeId)}`]: FieldValue.delete(),
        lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });
    await answerlatticeBatch.commit();
    await menuListDb.collection(DB_COLLECTIONS.USERS).doc(marker.userId).delete();
    await Promise.all([
        menuListAuth.deleteUser(marker.authUid),
        answerlatticeAuth.deleteUser(marker.answerlatticeAuthUid),
    ]);
    process.stdout.write(JSON.stringify({ fixtureId, status: 'cleaned-empty' }, null, 2) + '\n');
}

async function main(): Promise<void> {
    const command = readCommand();
    requireProjectConfirmation();
    await initializeServices();
    try {
        if (command === 'prepare') await prepare();
        else if (command === 'reconcile') await reconcile();
        else if (command === 'verify') await verify();
        else if (command === 'inspect') await inspect();
        else await cleanupEmpty();
    } finally {
        await Promise.allSettled([deleteApp(menuListApp), deleteApp(answerlatticeApp)]);
        if (ephemeralAdcDirectory) await rm(ephemeralAdcDirectory, { force: true, recursive: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
