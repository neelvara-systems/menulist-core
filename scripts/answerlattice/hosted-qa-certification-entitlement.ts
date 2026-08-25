#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

const QA_PROJECT_ID = 'neelvara-answerlattice-qa';
const FIXTURE_PREFIX = 'al-hosted-qa-certification';
const MAX_LEASE_HOURS = 72;

type Command = 'prepare' | 'verify' | 'cleanup';

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
    if (command === 'prepare' || command === 'verify' || command === 'cleanup') return command;
    throw new Error('Usage: hosted-qa-certification-entitlement.ts <prepare|verify|cleanup> --confirm-project=neelvara-answerlattice-qa --tenant-id=<id> --store-id=<id> --user-id=<firebase-uid>');
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
if (!userId || userId.length > 160 || userId.trim() !== userId || userId.includes('/')) {
    throw new Error('Pass --user-id=<bounded Firebase uid>.');
}

const fixtureId = `${FIXTURE_PREFIX}-${tId}-${sId}`;
const markerId = `${fixtureId}-marker`;
const app = initializeApp({
    credential: applicationDefault(),
    projectId: QA_PROJECT_ID,
}, 'answerlattice-hosted-qa-certification-entitlement');
const db = getFirestore(app);
const subscriptionRef = db.collection('subscriptions').doc(fixtureId);
const markerRef = db.collection('platformSummary').doc(markerId);
const storeRef = db.collection('stores').doc(String(sId));

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
    const [existingFixture, existingMarker, scopedRows] = await Promise.all([
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
    const batch = db.batch();
    batch.create(subscriptionRef, {
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
    });
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
    });
    await batch.commit();
    process.stdout.write(JSON.stringify({
        expiresAt: expiresAt.toDate().toISOString(),
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { tId, sId },
        status: 'prepared',
    }, null, 2) + '\n');
}

async function verify(): Promise<void> {
    await assertExactWorkspace();
    const [fixture, marker] = await Promise.all([subscriptionRef.get(), markerRef.get()]);
    assert.equal(fixture.exists, true, 'Hosted QA certification entitlement is missing.');
    assert.equal(marker.exists, true, 'Hosted QA certification marker is missing.');
    const data = fixture.data() || {};
    const markerData = marker.data() || {};
    assert.equal(data.pId, 'AL');
    assert.equal(data.productId, 'AL');
    assert.equal(data.tId, tId);
    assert.equal(data.tenantId, tId);
    assert.equal(data.sId, sId);
    assert.equal(data.storeId, sId);
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
    process.stdout.write(JSON.stringify({
        expiresAt: data.cycleEndDate.toDate().toISOString(),
        fixtureId,
        projectId: QA_PROJECT_ID,
        scope: { tId, sId },
        status: 'verified',
    }, null, 2) + '\n');
}

async function cleanup(): Promise<void> {
    const [fixture, marker] = await Promise.all([subscriptionRef.get(), markerRef.get()]);
    if (fixture.exists) {
        const data = fixture.data() || {};
        assert.equal(data.qaCertification?.fixture, true);
        assert.equal(data.qaCertification?.projectId, QA_PROJECT_ID);
        assert.equal(data.qaCertification?.purpose, 'answerlattice_hosted_release_candidate');
        assert.equal(data.tId, tId);
        assert.equal(data.sId, sId);
    }
    if (marker.exists) {
        const data = marker.data() || {};
        assert.equal(data.fixtureType, 'answerlattice_hosted_qa_certification_entitlement');
        assert.equal(data.subscriptionId, fixtureId);
        assert.equal(data.tId, tId);
        assert.equal(data.sId, sId);
    }
    const batch = db.batch();
    if (fixture.exists) batch.delete(subscriptionRef);
    if (marker.exists) batch.delete(markerRef);
    await batch.commit();
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
    try {
        if (command === 'prepare') await prepare();
        else if (command === 'verify') await verify();
        else await cleanup();
    } finally {
        await deleteApp(app);
    }
}

main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
});
