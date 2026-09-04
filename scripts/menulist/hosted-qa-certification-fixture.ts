#!/usr/bin/env tsx

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore';

const QA_PROJECT_ID = 'menulist-qa';
const OPERATOR_EMAIL = 'admin@neelvara.com';
const FIXTURE_PREFIX = 'ml-hosted-qa-certification';
const MAX_LEASE_HOURS = 72;
const PERSISTENT_OWNER_EMAIL = 'menulist.qa.owner.85ee58de7d@neelvara.com';
const PERSISTENT_OWNER_END = Timestamp.fromDate(new Date('2099-12-31T23:59:59.000Z'));

type Command = 'prepare' | 'make-persistent' | 'repair-shape' | 'seed-menu' | 'set-location-capacity' | 'verify' | 'cleanup';

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

function readArg(name: string): string | null {
    const prefix = `--${name}=`;
    const match = process.argv.slice(3).find(argument => argument.startsWith(prefix));
    return match ? match.slice(prefix.length) : null;
}

function readCommand(): Command {
    const command = process.argv[2];
    if (
        command === 'prepare'
        || command === 'make-persistent'
        || command === 'repair-shape'
        || command === 'seed-menu'
        || command === 'set-location-capacity'
        || command === 'verify'
        || command === 'cleanup'
    ) return command;
    throw new Error(
        `Usage: hosted-qa-certification-fixture.ts <prepare|make-persistent|repair-shape|seed-menu|set-location-capacity|verify|cleanup> --confirm-project=${QA_PROJECT_ID}`
        + ' [--fixture-id=<id>] [--credential-output=/absolute/path] [--location-capacity=<1-10>]',
    );
}

function requireProjectConfirmation(): void {
    const configuredProject = process.env.MENULIST_FIREBASE_PROJECT_ID
        || process.env.GCLOUD_PROJECT
        || process.env.GOOGLE_CLOUD_PROJECT;
    if (readArg('confirm-project') !== QA_PROJECT_ID || configuredProject !== QA_PROJECT_ID) {
        throw new Error(
            `MenuList QA fixture refuses project ${String(configuredProject || 'unset')}. `
            + `Set MENULIST_FIREBASE_PROJECT_ID=${QA_PROJECT_ID} and pass --confirm-project=${QA_PROJECT_ID}.`,
        );
    }
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        throw new Error('Hosted MenuList QA fixture refuses emulator hosts.');
    }
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
    ephemeralAdcDirectory = await mkdtemp(join(tmpdir(), 'menulist-qa-adc-'));
    const credentialPath = join(ephemeralAdcDirectory, 'application_default_credentials.json');
    await writeFile(credentialPath, JSON.stringify({
        client_id: firebaseCliApi.clientId(),
        client_secret: firebaseCliApi.clientSecret(),
        quota_project_id: QA_PROJECT_ID,
        refresh_token: refreshToken,
        type: 'authorized_user',
    }), { mode: 0o600 });
    await chmod(credentialPath, 0o600);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
}

const command = readCommand();
requireProjectConfirmation();

let db: Firestore;
let auth: Auth;

async function initializeServices(): Promise<void> {
    await establishEphemeralFirebaseCliAdc();
    if (getApps().length === 0) {
        initializeApp({
            credential: applicationDefault(),
            projectId: QA_PROJECT_ID,
        });
    }
    db = getFirestore();
    auth = getAuth();
}

function normalizeFixtureId(value: string | null): string {
    if (!value || !/^ml-hosted-qa-certification-[a-z0-9]{10}$/.test(value)) {
        throw new Error(`Pass --fixture-id=${FIXTURE_PREFIX}-<10 lowercase letters or digits>.`);
    }
    return value;
}

function readLocationCapacity(): number {
    const raw = readArg('location-capacity');
    const capacity = Number(raw);
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 10) {
        throw new Error('Pass --location-capacity=<integer from 1 to 10>.');
    }
    return capacity;
}

async function prepare(): Promise<void> {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
    const fixtureId = `${FIXTURE_PREFIX}-${suffix}`;
    const markerRef = db.collection('platformSummary').doc(`${fixtureId}-marker`);
    assert.equal((await markerRef.get()).exists, false, 'Fixture marker already exists.');

    const email = `menulist.qa.owner.${suffix}@neelvara.com`;
    const password = `MLqa!${randomBytes(18).toString('base64url')}`;
    const businessName = `MenuList QA Certification ${suffix.toUpperCase()}`;
    const subdomain = `qa-rc-${suffix}`;
    const credentialOutput = readArg('credential-output')
        || `/tmp/${fixtureId}-credentials.json`;
    if (!credentialOutput.startsWith('/tmp/') || !credentialOutput.endsWith('.json')) {
        throw new Error('Credential output must be an absolute /tmp/*.json path.');
    }

    const authUser = await auth.createUser({
        disabled: false,
        displayName: businessName,
        email,
        emailVerified: true,
        password,
    });

    let tenantId = 0;
    let storeId = 0;
    try {
        const [
            { createTenantStoreInTransaction, preCheckSubdomain },
            { getOwnerRoleId },
        ] = await Promise.all([
            import('../../src/lib/onboarding/createTenantStore'),
            import('../../src/data/defaultRoles'),
        ]);
        const preCheckedSubdomain = await preCheckSubdomain(db, subdomain);
        assert.equal(preCheckedSubdomain, subdomain, 'Disposable QA subdomain is unavailable.');

        const result = await db.runTransaction(async transaction => {
            const core = await createTenantStoreInTransaction(transaction, db, {
                businessName,
                businessType: 'Restaurant',
                businessIndustry: 'B2C',
                email,
                onboardingSource: 'RESELLER_ONBOARDING',
                subdomain: { preChecked: preCheckedSubdomain },
                includeTimeSlotPresets: true,
                storeExtra: {
                    activePlanType: 'menulist_pro',
                    qaCertificationFixture: fixtureId,
                },
                tenantExtra: { qaCertificationFixture: fixtureId },
            });
            const issuedAt = core.now;
            const expiresAt = Timestamp.fromMillis(
                issuedAt.toMillis() + (MAX_LEASE_HOURS * 60 * 60 * 1000),
            );
            const operationId = `qa_cert_${randomUUID()}`;
            const ownerRoleId = getOwnerRoleId();
            const subscriptionRef = db.collection('subscriptions').doc(fixtureId);

            transaction.create(db.collection('users').doc(authUser.uid), {
                active: true,
                createdOn: issuedAt,
                createdVia: 'qa-certification-fixture',
                email,
                firebaseUid: authUser.uid,
                isVerified: true,
                loginEmail: email,
                modifiedOn: issuedAt,
                name: businessName,
                onboardingSource: 'RESELLER_ONBOARDING',
                platformRole: 'OWNER',
                role: ownerRoleId,
                storeId: core.storeId,
                storeIds: [core.storeId],
                stores: [{ name: core.storeName, role: ownerRoleId, storeId: core.storeId }],
                tenantId: core.tenantId,
            });
            transaction.create(subscriptionRef, {
                analyticsEntitlement: {
                    activePlanType: 'menulist_pro',
                    source: 'menulist_hosted_qa_certification_fixture',
                    status: 'active',
                    syncedAt: issuedAt,
                },
                amount: 0,
                billingHistory: [],
                billingMode: 'manual',
                createdOn: issuedAt,
                currency: 'INR',
                cycleEndDate: expiresAt,
                cycleStartDate: issuedAt,
                email,
                id: fixtureId,
                lastWebhook: null,
                manualPaymentConfirmed: true,
                manualPaymentConfirmedAt: issuedAt,
                manualPaymentEvidenceType: 'qa_certification_non_payment',
                monthlyCredits: 75,
                monthlyCreditsAllowance: 75,
                name: businessName,
                pId: 'ML',
                paymentMethod: null,
                paymentProvider: 'razorpay',
                planId: 'menulist_pro',
                planName: 'MenuList Pro — QA Certification',
                planType: 'MONTH',
                productId: 'ML',
                providerPlanId: 'qa_certification_menulist_pro',
                providerStatus: 'active',
                providerSubscriptionId: fixtureId,
                qaCertification: {
                    expiresAt,
                    fixture: true,
                    issuedAt,
                    maxLeaseHours: MAX_LEASE_HOURS,
                    operationId,
                    projectId: QA_PROJECT_ID,
                    purpose: 'menulist_hosted_release_candidate',
                },
                quantity: 1,
                renewsOn: null,
                requestId: operationId,
                sId: core.storeId,
                shortUrl: '',
                status: 'active',
                statuses: [{
                    amount: 0,
                    currency: 'INR',
                    remark: 'Synthetic non-payment entitlement for hosted QA certification only.',
                    status: 'active',
                    timestamp: issuedAt,
                }],
                storeId: core.storeId,
                subscriptionEndDate: expiresAt,
                subscriptionStartDate: issuedAt,
                tId: core.tenantId,
                tenantId: core.tenantId,
                topUpCredits: 0,
                totalPaymentsMadeCount: 0,
                totalPaymentsNeededCount: 0,
                traceId: operationId,
                updatedOn: issuedAt,
                userId: authUser.uid,
                userType: 'B2C',
            });
            transaction.create(markerRef, {
                authUid: authUser.uid,
                createdOn: issuedAt,
                email,
                expiresAt,
                fixtureType: 'menulist_hosted_qa_certification_fixture',
                operationId,
                pId: 'ML',
                productId: 'ML',
                sId: core.storeId,
                status: 'active',
                storeId: core.storeId,
                subscriptionId: fixtureId,
                tId: core.tenantId,
                tenantId: core.tenantId,
            });
            return core;
        });
        tenantId = result.tenantId;
        storeId = result.storeId;
        await auth.setCustomUserClaims(authUser.uid, {
            platformRole: 'OWNER',
            role: getOwnerRoleId(),
            storeId: String(storeId),
            storeIds: [String(storeId)],
            tenantId: String(tenantId),
            uId: authUser.uid,
        });
        await writeFile(credentialOutput, JSON.stringify({ email, password }, null, 2), { mode: 0o600 });
        await chmod(credentialOutput, 0o600);
        process.stdout.write(JSON.stringify({
            credentialOutput,
            email,
            expiresAt: new Date(Date.now() + (MAX_LEASE_HOURS * 60 * 60 * 1000)).toISOString(),
            fixtureId,
            projectId: QA_PROJECT_ID,
            scope: { storeId, tenantId },
            status: 'prepared',
            subdomain,
        }, null, 2) + '\n');
    } catch (error) {
        if (tenantId > 0 || storeId > 0) {
            process.stderr.write('Fixture persistence may be partial; inspect the marker before retrying.\n');
        } else {
            await auth.deleteUser(authUser.uid).catch(() => undefined);
        }
        throw error;
    }
}

async function readFixture(fixtureId: string, options: { allowExpired?: boolean } = {}) {
    const markerRef = db.collection('platformSummary').doc(`${fixtureId}-marker`);
    const subscriptionRef = db.collection('subscriptions').doc(fixtureId);
    const [marker, subscription] = await Promise.all([markerRef.get(), subscriptionRef.get()]);
    assert.equal(marker.exists, true, 'MenuList QA fixture marker is missing.');
    assert.equal(subscription.exists, true, 'MenuList QA fixture subscription is missing.');
    const markerData = marker.data() || {};
    const subscriptionData = subscription.data() || {};
    assert.equal(markerData.fixtureType, 'menulist_hosted_qa_certification_fixture');
    assert.equal(markerData.subscriptionId, fixtureId);
    assert.equal(subscriptionData.qaCertification?.fixture, true);
    assert.equal(subscriptionData.qaCertification?.projectId, QA_PROJECT_ID);
    assert.ok(
        subscriptionData.qaCertification?.purpose === 'menulist_hosted_release_candidate'
        || subscriptionData.qaCertification?.purpose === 'menulist_persistent_phone_owner',
        'MenuList QA fixture purpose is invalid.',
    );
    assert.equal(subscriptionData.manualPaymentEvidenceType, 'qa_certification_non_payment');
    assert.equal(subscriptionData.amount, 0);
    assert.equal(subscriptionData.pId, 'ML');
    assert.equal(subscriptionData.productId, 'ML');
    assert.equal(subscriptionData.status, 'active');
    assert.ok(subscriptionData.cycleStartDate instanceof Timestamp);
    assert.ok(subscriptionData.cycleEndDate instanceof Timestamp);
    assert.ok(subscriptionData.subscriptionStartDate instanceof Timestamp);
    assert.ok(subscriptionData.subscriptionEndDate instanceof Timestamp);
    assert.ok(subscriptionData.manualPaymentConfirmedAt instanceof Timestamp);
    assert.ok(subscriptionData.qaCertification?.issuedAt instanceof Timestamp);
    assert.ok(subscriptionData.qaCertification?.expiresAt instanceof Timestamp);
    assert.ok(subscriptionData.statuses?.[0]?.timestamp instanceof Timestamp);
    if (!options.allowExpired) {
        assert.ok(subscriptionData.cycleEndDate.toMillis() > Date.now());
    }
    assert.equal(markerData.authUid, subscriptionData.userId);
    assert.equal(markerData.tenantId, subscriptionData.tenantId);
    assert.equal(markerData.storeId, subscriptionData.storeId);
    return { markerData, subscriptionData };
}

async function makePersistent(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    if (readArg('confirm-persistent-owner') !== PERSISTENT_OWNER_EMAIL) {
        throw new Error(`Pass --confirm-persistent-owner=${PERSISTENT_OWNER_EMAIL}.`);
    }
    const { markerData, subscriptionData } = await readFixture(fixtureId, { allowExpired: true });
    assert.equal(markerData.email, PERSISTENT_OWNER_EMAIL, 'Persistent owner email does not match the canonical QA account.');
    assert.equal(subscriptionData.email, PERSISTENT_OWNER_EMAIL, 'Subscription email does not match the canonical QA account.');

    const markerRef = db.collection('platformSummary').doc(`${fixtureId}-marker`);
    const subscriptionRef = db.collection('subscriptions').doc(fixtureId);
    const updatedOn = Timestamp.now();
    await db.runTransaction(async transaction => {
        const [marker, subscription] = await Promise.all([
            transaction.get(markerRef),
            transaction.get(subscriptionRef),
        ]);
        assert.equal(marker.data()?.authUid, markerData.authUid);
        assert.equal(subscription.data()?.userId, markerData.authUid);
        assert.equal(subscription.data()?.amount, 0);
        assert.equal(subscription.data()?.manualPaymentEvidenceType, 'qa_certification_non_payment');
        transaction.update(subscriptionRef, {
            cycleEndDate: PERSISTENT_OWNER_END,
            subscriptionEndDate: PERSISTENT_OWNER_END,
            validUntil: PERSISTENT_OWNER_END,
            status: 'active',
            providerStatus: 'active',
            'qaCertification.expiresAt': PERSISTENT_OWNER_END,
            'qaCertification.maxLeaseHours': null,
            'qaCertification.persistentOwner': true,
            'qaCertification.purpose': 'menulist_persistent_phone_owner',
            updatedOn,
        });
        transaction.update(markerRef, {
            expiresAt: PERSISTENT_OWNER_END,
            persistentOwner: true,
            status: 'active',
            updatedOn,
        });
    });
    process.stdout.write(JSON.stringify({
        email: PERSISTENT_OWNER_EMAIL,
        expiresAt: PERSISTENT_OWNER_END.toDate().toISOString(),
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { storeId: markerData.storeId, tenantId: markerData.tenantId },
        status: 'persistent-owner-enabled',
    }, null, 2) + '\n');
}

async function verify(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const { markerData, subscriptionData } = await readFixture(fixtureId);
    const [authUser, tenant, store, user] = await Promise.all([
        auth.getUser(markerData.authUid),
        db.collection('tenants').doc(String(markerData.tenantId)).get(),
        db.collection('stores').doc(String(markerData.storeId)).get(),
        db.collection('users').doc(markerData.authUid).get(),
    ]);
    assert.equal(authUser.disabled, false);
    assert.equal(authUser.email, markerData.email);
    assert.equal(authUser.emailVerified, true);
    assert.equal(authUser.customClaims?.platformRole, 'OWNER');
    assert.equal(authUser.customClaims?.role, user.data()?.role);
    assert.equal(authUser.customClaims?.tenantId, String(markerData.tenantId));
    assert.equal(authUser.customClaims?.storeId, String(markerData.storeId));
    assert.equal(authUser.customClaims?.uId, markerData.authUid);
    assert.equal(tenant.exists, true);
    assert.equal(store.exists, true);
    assert.equal(user.exists, true);
    assert.equal(store.data()?.activePlanType, 'menulist_pro');
    assert.equal(store.data()?.qaCertificationFixture, fixtureId);
    assert.equal(user.data()?.tenantId, markerData.tenantId);
    assert.equal(user.data()?.storeId, markerData.storeId);
    const tenantStores = Array.isArray(tenant.data()?.storesList)
        ? tenant.data()!.storesList.filter((entry: unknown): entry is Record<string, unknown> => (
            Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
        ))
        : [];
    const activeStoreIds = tenantStores.flatMap((entry: Record<string, unknown>) => {
        const candidate = Number(entry.storeId);
        return entry.active !== false && Number.isSafeInteger(candidate) && candidate > 0
            ? [candidate]
            : [];
    });
    const userStoreIds = Array.isArray(user.data()?.storeIds)
        ? user.data()!.storeIds.map(Number).filter((candidate: number) => Number.isSafeInteger(candidate) && candidate > 0)
        : [];
    const userStoreMappings = Array.isArray(user.data()?.stores)
        ? user.data()!.stores.flatMap((entry: unknown) => {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
            const candidate = Number((entry as Record<string, unknown>).storeId);
            return Number.isSafeInteger(candidate) && candidate > 0 ? [candidate] : [];
        })
        : [];
    const claimStoreIds = Array.isArray(authUser.customClaims?.storeIds)
        ? authUser.customClaims.storeIds.map(Number).filter((candidate: number) => Number.isSafeInteger(candidate) && candidate > 0)
        : [];
    for (const activeStoreId of activeStoreIds) {
        assert.ok(userStoreIds.includes(activeStoreId), `User storeIds is missing active store ${activeStoreId}.`);
        assert.ok(userStoreMappings.includes(activeStoreId), `User stores mapping is missing active store ${activeStoreId}.`);
        assert.ok(claimStoreIds.includes(activeStoreId), `Firebase claims storeIds is missing active store ${activeStoreId}.`);
    }
    process.stdout.write(JSON.stringify({
        activeStoreCount: activeStoreIds.length,
        firebaseClaimStoreCount: claimStoreIds.length,
        email: markerData.email,
        expiresAt: subscriptionData.cycleEndDate.toDate().toISOString(),
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { storeId: markerData.storeId, tenantId: markerData.tenantId },
        status: 'verified',
        userStoreAccessCount: userStoreIds.length,
    }, null, 2) + '\n');
}

async function repairShape(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const { markerData } = await readFixture(fixtureId);
    const tenantRef = db.collection('tenants').doc(String(markerData.tenantId));
    const storeRef = db.collection('stores').doc(String(markerData.storeId));
    await db.runTransaction(async transaction => {
        const [tenant, store] = await Promise.all([
            transaction.get(tenantRef),
            transaction.get(storeRef),
        ]);
        assert.equal(tenant.exists, true);
        assert.equal(store.exists, true);
        assert.equal(tenant.data()?.qaCertificationFixture, fixtureId);
        assert.equal(store.data()?.qaCertificationFixture, fixtureId);
        const storeKey = String(store.data()?.storeKey || 'main_store');
        const storesList = Array.isArray(tenant.data()?.storesList)
            ? tenant.data()!.storesList.map((entry: Record<string, unknown>) => (
                String(entry.storeId) === String(markerData.storeId)
                    ? { ...entry, storeKey }
                    : entry
            ))
            : [];
        transaction.update(tenantRef, { deleted: false, storesList });
        transaction.update(storeRef, {
            city: '',
            contactPersonEmail: markerData.email,
            contactPersonName: '',
            contactPersonNumber: '',
            currencyCode: 'INR',
            currencySymbol: '₹',
            deleted: false,
            logo: '',
            phoneNumber: '',
            state: '',
        });
    });
    process.stdout.write(JSON.stringify({
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { storeId: markerData.storeId, tenantId: markerData.tenantId },
        status: 'shape-repaired',
    }, null, 2) + '\n');
}

async function setLocationCapacity(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const locationCapacity = readLocationCapacity();
    const { markerData } = await readFixture(fixtureId);
    const markerRef = db.collection('platformSummary').doc(`${fixtureId}-marker`);
    const subscriptionRef = db.collection('subscriptions').doc(fixtureId);
    await db.runTransaction(async transaction => {
        const [marker, subscription] = await Promise.all([
            transaction.get(markerRef),
            transaction.get(subscriptionRef),
        ]);
        assert.equal(marker.data()?.fixtureType, 'menulist_hosted_qa_certification_fixture');
        assert.equal(marker.data()?.tenantId, markerData.tenantId);
        assert.equal(subscription.data()?.qaCertification?.fixture, true);
        assert.equal(subscription.data()?.manualPaymentEvidenceType, 'qa_certification_non_payment');
        assert.equal(subscription.data()?.amount, 0);
        assert.equal(subscription.data()?.monthlyCredits, subscription.data()?.monthlyCreditsAllowance);
        const issuedAt = Timestamp.now();
        transaction.update(subscriptionRef, {
            monthlyCredits: 75 * locationCapacity,
            monthlyCreditsAllowance: 75 * locationCapacity,
            quantity: locationCapacity,
            'qaCertification.locationCapacity': locationCapacity,
            updatedOn: issuedAt,
        });
        transaction.update(markerRef, {
            locationCapacity,
            updatedOn: issuedAt,
        });
    });
    process.stdout.write(JSON.stringify({
        fixtureId,
        locationCapacity,
        projectId: QA_PROJECT_ID,
        scope: { storeId: markerData.storeId, tenantId: markerData.tenantId },
        status: 'location-capacity-set',
    }, null, 2) + '\n');
}

async function seedMenu(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const { markerData } = await readFixture(fixtureId);
    const projectCollection = db.collection('projects')
        .doc(String(markerData.tenantId))
        .collection(String(markerData.storeId));
    const summary = await db.collection('platformSummary').doc(`projects_${String(markerData.storeId)}`).get();
    assert.equal(summary.exists, true, 'Hosted owner menu summary is missing.');
    const matchingProjectIds = Object.entries(summary.data() || {}).flatMap(([key, value]) => {
        if (!key.startsWith('projects.') || !value || typeof value !== 'object' || Array.isArray(value)) return [];
        const localizedName = (value as Record<string, unknown>).name;
        const name = localizedName && typeof localizedName === 'object' && !Array.isArray(localizedName)
            ? (localizedName as Record<string, unknown>).en
            : localizedName;
        return name === 'RC Certification Menu' ? [key.slice('projects.'.length)] : [];
    });
    assert.equal(matchingProjectIds.length, 1, 'Expected exactly one RC Certification Menu created through the hosted owner UI.');
    const [projectDocumentId] = matchingProjectIds;
    assert.ok(projectDocumentId, 'Hosted owner menu identity is missing.');
    const project = await projectCollection.doc(projectDocumentId).get();
    assert.equal(project.exists, true, 'Hosted owner menu document is missing.');
    const projectData = project.data();
    assert.ok(projectData, 'Hosted owner menu data is missing.');
    assert.equal(Number(projectData.tenantId ?? projectData.tId), Number(markerData.tenantId));
    assert.equal(Number(projectData.storeId ?? projectData.sId), Number(markerData.storeId));
    assert.equal(projectData.pId, 'ML');
    const seededAt = Timestamp.now();
    await project.ref.update({
        config: { design: { menu: { showItemPrices: true } } },
        files: [{
            extractedData: {
                data: {
                    categories: [{ active: true, id: 'rc-hot-drinks', name: { en: 'Hot Drinks' } }],
                    items: [{
                        active: true,
                        available: true,
                        category: 'rc-hot-drinks',
                        description: { en: 'Disposable hosted QA fixture item.' },
                        id: 'rc-filter-coffee',
                        name: { en: 'Filter Coffee' },
                        price: '80',
                    }],
                    languages: [{ code: 'en', isPrimary: true, name: 'English' }],
                },
            },
            index: 0,
            name: 'hosted-qa-certification-menu.json',
            size: 1024,
            type: 'application/json',
            uid: `${fixtureId}-menu`,
            url: 'https://example.invalid/hosted-qa-certification-menu.json',
        }],
        languages: ['en'],
        modifiedOn: seededAt,
        qaCertificationFixture: fixtureId,
    });
    process.stdout.write(JSON.stringify({
        fixtureId,
        projectDocumentId: project.id,
        projectId: QA_PROJECT_ID,
        scope: { storeId: markerData.storeId, tenantId: markerData.tenantId },
        status: 'menu-seeded',
    }, null, 2) + '\n');
}

async function cleanup(): Promise<void> {
    const fixtureId = normalizeFixtureId(readArg('fixture-id'));
    const { markerData } = await readFixture(fixtureId);
    const projectRows = await db.collection('projects')
        .doc(String(markerData.tenantId))
        .collection(String(markerData.storeId))
        .limit(1)
        .get();
    assert.equal(
        projectRows.empty,
        true,
        'Fixture has hosted test data. Use the certification cleanup inventory before removing its root scope.',
    );
    const batch = db.batch();
    batch.delete(db.collection('subscriptions').doc(fixtureId));
    batch.delete(db.collection('users').doc(markerData.authUid));
    batch.delete(db.collection('stores').doc(String(markerData.storeId)));
    batch.delete(db.collection('tenants').doc(String(markerData.tenantId)));
    batch.delete(db.collection('platformSummary').doc(`${fixtureId}-marker`));
    batch.update(db.collection('platformSummary').doc('storesSummary'), {
        [`stores.${String(markerData.storeId)}`]: FieldValue.delete(),
        lastUpdated: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    await auth.deleteUser(markerData.authUid);
    process.stdout.write(JSON.stringify({ fixtureId, projectId: QA_PROJECT_ID, status: 'cleaned' }, null, 2) + '\n');
}

async function main(): Promise<void> {
    await initializeServices();
    if (command === 'prepare') await prepare();
    else if (command === 'make-persistent') await makePersistent();
    else if (command === 'repair-shape') await repairShape();
    else if (command === 'seed-menu') await seedMenu();
    else if (command === 'set-location-capacity') await setLocationCapacity();
    else if (command === 'verify') await verify();
    else await cleanup();
}

main()
    .catch(error => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (ephemeralAdcDirectory) {
            await rm(ephemeralAdcDirectory, { force: true, recursive: true });
        }
    });
