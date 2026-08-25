#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { applicationDefault, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import {
    FieldValue,
    Timestamp,
    getFirestore,
    type DocumentReference,
    type Firestore,
} from 'firebase-admin/firestore';

const QA_PROJECT_ID = 'neelvara-answerlattice-qa';
const OPERATOR_EMAIL = 'admin@neelvara.com';
const FIXTURE_PREFIX = 'al-hosted-qa-certification';
const MAX_LEASE_HOURS = 72;

type Command = 'prepare' | 'repair-summary' | 'verify' | 'cleanup';

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

function readPositiveIntegerArg(name: string): number {
    const raw = readArg(name);
    const value = Number(raw);
    if (!raw || !Number.isSafeInteger(value) || value <= 0 || String(value) !== raw) {
        throw new Error(`Pass --${name}=<positive-safe-integer>.`);
    }
    return value;
}

function readCommand(): Command {
    const command = process.argv[2];
    if (command === 'prepare' || command === 'repair-summary' || command === 'verify' || command === 'cleanup') return command;
    throw new Error('Usage: hosted-qa-certification-entitlement.ts <prepare|repair-summary|verify|cleanup> --confirm-project=neelvara-answerlattice-qa --tenant-id=<id> --store-id=<id> [--user-id=<firebase-uid>]');
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
    ephemeralAdcDirectory = await mkdtemp(join(tmpdir(), 'answerlattice-qa-adc-'));
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
const confirmedProject = readArg('confirm-project');
const configuredProject = process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
if (confirmedProject !== QA_PROJECT_ID || configuredProject !== QA_PROJECT_ID) {
    throw new Error(`QA certification entitlement refuses project ${String(configuredProject || 'unset')}. Pass --confirm-project=${QA_PROJECT_ID}.`);
}
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error('Hosted QA certification entitlement refuses emulator hosts.');
}

const tId = readPositiveIntegerArg('tenant-id');
const sId = readPositiveIntegerArg('store-id');
const userId = readArg('user-id');
if (command === 'prepare' && (!userId || userId.length > 160 || userId.trim() !== userId || userId.includes('/'))) {
    throw new Error('Pass --user-id=<bounded Firebase uid>.');
}

const fixtureId = `${FIXTURE_PREFIX}-${tId}-${sId}`;
const markerId = `${fixtureId}-marker`;
let app: App;
let db: Firestore;
let subscriptionRef: DocumentReference;
let markerRef: DocumentReference;
let storeRef: DocumentReference;

function assertFixture(data: FirebaseFirestore.DocumentData): void {
    assert.equal(data.qaCertification?.fixture, true);
    assert.equal(data.qaCertification?.projectId, QA_PROJECT_ID);
    assert.equal(data.qaCertification?.purpose, 'answerlattice_hosted_release_candidate');
    assert.equal(data.pId, 'AL');
    assert.equal(data.productId, 'AL');
    assert.equal(data.tId, tId);
    assert.equal(data.tenantId, tId);
    assert.equal(data.sId, sId);
    assert.equal(data.storeId, sId);
}

function assertMarker(data: FirebaseFirestore.DocumentData): void {
    assert.equal(data.fixtureType, 'answerlattice_hosted_qa_certification_entitlement');
    assert.equal(data.subscriptionId, fixtureId);
    assert.equal(data.pId, 'AL');
    assert.equal(data.productId, 'AL');
    assert.equal(data.tId, tId);
    assert.equal(data.sId, sId);
}

function buildStoreSubscriptionSummary(
    subscription: FirebaseFirestore.DocumentData,
    updatedAt: Timestamp,
): FirebaseFirestore.DocumentData {
    return {
        id: fixtureId,
        providerSubscriptionId: fixtureId,
        providerPlanId: subscription.providerPlanId,
        pId: 'AL',
        productId: 'AL',
        tId,
        tenantId: tId,
        sId,
        storeId: sId,
        planId: subscription.planId,
        planName: subscription.planName,
        planType: subscription.planType,
        status: 'active',
        providerStatus: 'active',
        cycleStartDate: subscription.cycleStartDate,
        cycleEndDate: subscription.cycleEndDate,
        subscriptionStartDate: subscription.subscriptionStartDate,
        subscriptionEndDate: subscription.subscriptionEndDate,
        monthlyCreditsAllowance: subscription.monthlyCreditsAllowance,
        monthlyCredits: subscription.monthlyCredits,
        topUpCredits: subscription.topUpCredits,
        creditsLastResetMonth: subscription.creditsLastResetMonth,
        manualPaymentEvidenceType: 'qa_certification_non_payment',
        qaCertification: subscription.qaCertification,
        updatedAt,
    };
}

async function assertExactWorkspace(): Promise<void> {
    const store = await storeRef.get();
    assert.equal(store.exists, true, 'Answerlattice QA workspace does not exist.');
    const data = store.data() || {};
    assert.equal(data.pId, 'AL');
    assert.equal(data.productId, 'AL');
    assert.equal(data.tId, tId);
    assert.equal(data.tenantId, tId);
    assert.equal(data.sId, sId);
    assert.equal(data.storeId, sId);
}

async function prepare(): Promise<void> {
    await assertExactWorkspace();
    const [existingFixture, existingMarker, scopedRows, store] = await Promise.all([
        subscriptionRef.get(),
        markerRef.get(),
        db.collection('subscriptions')
            .where('pId', '==', 'AL')
            .where('productId', '==', 'AL')
            .where('tId', '==', tId)
            .where('tenantId', '==', tId)
            .where('sId', '==', sId)
            .where('storeId', '==', sId)
            .limit(5)
            .get(),
        storeRef.get(),
    ]);
    assert.equal(existingFixture.exists, false, 'Clean up the previous hosted QA certification entitlement first.');
    assert.equal(existingMarker.exists, false, 'Clean up the previous hosted QA certification marker first.');
    assert.equal(
        scopedRows.docs.some(document => document.data().status === 'active'),
        false,
        'A current active subscription already exists; a QA lease is not permitted.',
    );

    const issuedAt = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(issuedAt.toMillis() + (MAX_LEASE_HOURS * 60 * 60 * 1000));
    const operationId = `qa_cert_${randomUUID()}`;
    const billingPeriod = (issuedAt.toDate().getUTCFullYear() * 100) + issuedAt.toDate().getUTCMonth() + 1;
    const previousStoreSubscriptionSummary = store.data()?.answerlatticeSubscription;
    const subscription = {
        id: fixtureId,
        providerSubscriptionId: fixtureId,
        providerPlanId: 'qa_certification_answerlattice_launch',
        paymentProvider: 'razorpay',
        pId: 'AL',
        productId: 'AL',
        tId,
        tenantId: tId,
        sId,
        storeId: sId,
        userId,
        name: 'Answerlattice Hosted QA Certification',
        email: 'admin@neelvara.com',
        userType: 'B2B',
        status: 'active',
        providerStatus: 'active',
        planName: 'Launch — QA Certification',
        planId: 'answerlattice_launch',
        planType: 'YEAR',
        amount: 0,
        currency: 'INR',
        billingMode: 'manual',
        manualPaymentConfirmed: true,
        manualPaymentConfirmedAt: issuedAt,
        manualPaymentEvidenceType: 'qa_certification_non_payment',
        cycleStartDate: issuedAt,
        cycleEndDate: expiresAt,
        renewsOn: null,
        subscriptionStartDate: issuedAt,
        subscriptionEndDate: expiresAt,
        pastDueSinceAt: null,
        quantity: 1,
        monthlyCreditsAllowance: 150,
        monthlyCredits: 150,
        topUpCredits: 0,
        creditsLastResetMonth: billingPeriod,
        totalPaymentsNeededCount: 0,
        totalPaymentsMadeCount: 0,
        shortUrl: '',
        paymentMethod: null,
        billingHistory: [],
        statuses: [{
            status: 'active',
            timestamp: issuedAt,
            amount: 0,
            currency: 'INR',
            remark: 'Synthetic non-payment entitlement for hosted QA certification only.',
        }],
        qaCertification: {
            fixture: true,
            projectId: QA_PROJECT_ID,
            purpose: 'answerlattice_hosted_release_candidate',
            operationId,
            issuedAt,
            expiresAt,
            maxLeaseHours: MAX_LEASE_HOURS,
        },
        createdOn: issuedAt,
        updatedOn: issuedAt,
        traceId: operationId,
        requestId: operationId,
    };
    const batch = db.batch();
    batch.create(subscriptionRef, subscription);
    batch.create(markerRef, {
        pId: 'AL',
        productId: 'AL',
        tId,
        sId,
        fixtureType: 'answerlattice_hosted_qa_certification_entitlement',
        subscriptionId: fixtureId,
        operationId,
        issuedAt,
        expiresAt,
        status: 'active',
        previousStoreSubscriptionSummaryPresent: previousStoreSubscriptionSummary !== undefined,
        previousStoreSubscriptionSummary: previousStoreSubscriptionSummary ?? null,
        summaryBindingApplied: true,
        summaryBoundAt: issuedAt,
    });
    batch.set(storeRef, {
        answerlatticeSubscription: buildStoreSubscriptionSummary(subscription, issuedAt),
    }, { merge: true });
    await batch.commit();
    process.stdout.write(JSON.stringify({
        expiresAt: expiresAt.toDate().toISOString(),
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { tId, sId },
        status: 'prepared',
    }, null, 2) + '\n');
}

async function repairSummary(): Promise<void> {
    await assertExactWorkspace();
    await db.runTransaction(async transaction => {
        const [fixture, marker, store] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(markerRef),
            transaction.get(storeRef),
        ]);
        assert.equal(fixture.exists, true, 'Hosted QA certification entitlement is missing.');
        assert.equal(marker.exists, true, 'Hosted QA certification marker is missing.');
        assert.equal(store.exists, true, 'Answerlattice QA workspace does not exist.');
        const fixtureData = fixture.data() || {};
        const markerData = marker.data() || {};
        const storeData = store.data() || {};
        assertFixture(fixtureData);
        assertMarker(markerData);
        assert.equal(fixtureData.status, 'active');
        assert.ok(fixtureData.cycleEndDate instanceof Timestamp && fixtureData.cycleEndDate.toMillis() > Date.now());

        const update: FirebaseFirestore.DocumentData = {
            summaryBindingApplied: true,
            summaryBoundAt: Timestamp.now(),
        };
        if (!Object.prototype.hasOwnProperty.call(markerData, 'previousStoreSubscriptionSummaryPresent')) {
            update.previousStoreSubscriptionSummaryPresent = storeData.answerlatticeSubscription !== undefined;
            update.previousStoreSubscriptionSummary = storeData.answerlatticeSubscription ?? null;
        }
        transaction.set(markerRef, update, { merge: true });
        transaction.set(storeRef, {
            answerlatticeSubscription: buildStoreSubscriptionSummary(fixtureData, Timestamp.now()),
        }, { merge: true });
    });
    process.stdout.write(JSON.stringify({
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { tId, sId },
        status: 'summary-repaired',
    }, null, 2) + '\n');
}

async function verify(): Promise<void> {
    await assertExactWorkspace();
    const [fixture, marker, store] = await Promise.all([subscriptionRef.get(), markerRef.get(), storeRef.get()]);
    assert.equal(fixture.exists, true, 'Hosted QA certification entitlement is missing.');
    assert.equal(marker.exists, true, 'Hosted QA certification marker is missing.');
    const data = fixture.data() || {};
    const markerData = marker.data() || {};
    const storeSummary = store.data()?.answerlatticeSubscription || {};
    assertFixture(data);
    assertMarker(markerData);
    assert.equal(data.status, 'active');
    assert.equal(data.billingMode, 'manual');
    assert.equal(data.manualPaymentConfirmed, true);
    assert.equal(data.manualPaymentEvidenceType, 'qa_certification_non_payment');
    assert.equal(data.amount, 0);
    assert.equal(data.qaCertification?.fixture, true);
    assert.equal(data.qaCertification?.projectId, QA_PROJECT_ID);
    assert.equal(data.qaCertification?.purpose, 'answerlattice_hosted_release_candidate');
    assert.ok(data.cycleEndDate instanceof Timestamp && data.cycleEndDate.toMillis() > Date.now());
    assert.equal(markerData.subscriptionId, fixtureId);
    assert.equal(markerData.operationId, data.qaCertification.operationId);
    assert.equal(markerData.summaryBindingApplied, true);
    assert.equal(typeof markerData.previousStoreSubscriptionSummaryPresent, 'boolean');
    assert.equal(storeSummary.id, fixtureId);
    assert.equal(storeSummary.providerSubscriptionId, fixtureId);
    assert.equal(storeSummary.status, 'active');
    assert.equal(storeSummary.providerStatus, 'active');
    assert.equal(storeSummary.monthlyCredits, data.monthlyCredits);
    assert.equal(storeSummary.topUpCredits, data.topUpCredits);
    process.stdout.write(JSON.stringify({
        expiresAt: data.cycleEndDate.toDate().toISOString(),
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { tId, sId },
        status: 'verified',
    }, null, 2) + '\n');
}

async function cleanup(): Promise<void> {
    await db.runTransaction(async transaction => {
        const [fixture, marker, store] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(markerRef),
            transaction.get(storeRef),
        ]);
        if (fixture.exists) assertFixture(fixture.data() || {});
        if (marker.exists) assertMarker(marker.data() || {});

        const markerData = marker.data() || {};
        const storeSummary = store.data()?.answerlatticeSubscription;
        if (
            store.exists
            && markerData.summaryBindingApplied === true
            && storeSummary?.id === fixtureId
        ) {
            const previousSummary = markerData.previousStoreSubscriptionSummaryPresent === true
                ? markerData.previousStoreSubscriptionSummary
                : FieldValue.delete();
            transaction.update(storeRef, { answerlatticeSubscription: previousSummary });
        }
        if (fixture.exists) transaction.delete(subscriptionRef);
        if (marker.exists) transaction.delete(markerRef);
    });
    const [remainingFixture, remainingMarker] = await Promise.all([subscriptionRef.get(), markerRef.get()]);
    assert.equal(remainingFixture.exists, false);
    assert.equal(remainingMarker.exists, false);
    process.stdout.write(JSON.stringify({
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { tId, sId },
        status: 'cleaned',
    }, null, 2) + '\n');
}

async function main(): Promise<void> {
    await establishEphemeralFirebaseCliAdc();
    app = initializeApp({
        credential: applicationDefault(),
        projectId: QA_PROJECT_ID,
    }, 'answerlattice-hosted-qa-certification-entitlement');
    db = getFirestore(app);
    subscriptionRef = db.collection('subscriptions').doc(fixtureId);
    markerRef = db.collection('platformSummary').doc(markerId);
    storeRef = db.collection('stores').doc(String(sId));
    try {
        if (command === 'prepare') await prepare();
        else if (command === 'repair-summary') await repairSummary();
        else if (command === 'verify') await verify();
        else await cleanup();
    } finally {
        await deleteApp(app);
        if (ephemeralAdcDirectory) await rm(ephemeralAdcDirectory, { force: true, recursive: true });
    }
}

main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
});
