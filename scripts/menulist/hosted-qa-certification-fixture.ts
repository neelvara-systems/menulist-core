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

type Command = 'prepare' | 'repair-shape' | 'verify' | 'cleanup';

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
    if (command === 'prepare' || command === 'repair-shape' || command === 'verify' || command === 'cleanup') return command;
    throw new Error(
        `Usage: hosted-qa-certification-fixture.ts <prepare|repair-shape|verify|cleanup> --confirm-project=${QA_PROJECT_ID}`
        + ' [--fixture-id=<id>] [--credential-output=/absolute/path]',
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
    const localRequire = createRequire(import.meta.url);
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

async function readFixture(fixtureId: string) {
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
    assert.equal(subscriptionData.qaCertification?.purpose, 'menulist_hosted_release_candidate');
    assert.equal(subscriptionData.manualPaymentEvidenceType, 'qa_certification_non_payment');
    assert.equal(subscriptionData.amount, 0);
    assert.equal(subscriptionData.pId, 'ML');
    assert.equal(subscriptionData.productId, 'ML');
    assert.equal(subscriptionData.status, 'active');
    assert.ok(subscriptionData.cycleEndDate instanceof Timestamp);
    assert.ok(subscriptionData.cycleEndDate.toMillis() > Date.now());
    assert.equal(markerData.authUid, subscriptionData.userId);
    assert.equal(markerData.tenantId, subscriptionData.tenantId);
    assert.equal(markerData.storeId, subscriptionData.storeId);
    return { markerData, subscriptionData };
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
    process.stdout.write(JSON.stringify({
        email: markerData.email,
        expiresAt: subscriptionData.cycleEndDate.toDate().toISOString(),
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { storeId: markerData.storeId, tenantId: markerData.tenantId },
        status: 'verified',
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
    else if (command === 'repair-shape') await repairShape();
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
