import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeCompiledSourceVersions,
} from '../../src/lib/answerlattice/compiledContext';
import {
    getAnswerlatticeTenantSummaryShardId,
} from '../../src/lib/answerlattice/tenantSummaryAdmin';
import { saveAnswerlatticeWorkspaceProfileAdmin } from '../../src/lib/answerlattice/workspaceProfileServer';
import { answerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';

const db = answerlatticeFirestoreAdmin;
const tenantId = 29001;
const storeId = 29002;
const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(getAnswerlatticeTenantSummaryShardId(tenantId, storeId));
const versionsRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId));
const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId));
const launchProfileCreatedAt = new Date('2026-07-01T00:00:00.000Z');

const initialProfile = {
    productName: 'Example SaaS',
    productUrl: 'https://app.example.com',
    supportEmail: 'support@example.com',
    billingModel: 'subscription' as const,
    primarySurfaces: ['billing'],
    timeZone: 'UTC',
    businessDayEndTime: '00:00',
};

const updatedProfile = {
    ...initialProfile,
    primarySurfaces: ['billing', 'settings'],
    timeZone: 'Asia/Kolkata',
    businessDayEndTime: '23:00',
};

async function run() {
    await Promise.all([
        storeRef.delete(),
        summaryRef.delete(),
        versionsRef.delete(),
        manifestRef.delete(),
    ]);
    await storeRef.set({
        ...initialProfile,
        id: storeId,
        pId: 'AL',
        productId: 'AL',
        sId: storeId,
        storeId,
        tId: tenantId,
        tenantId,
        answerlatticeWorkspaceProfileRevision: 0,
        answerlatticeLaunchProfile: {
            ...initialProfile,
            createdAt: launchProfileCreatedAt,
            revision: 0,
        },
    });

    const saved = await saveAnswerlatticeWorkspaceProfileAdmin({
        db,
        expectedRevision: 0,
        profile: updatedProfile,
        storeId,
        tenantId,
    });
    assert.equal(saved.status, 'saved');
    assert.equal(saved.status === 'saved' ? saved.revision : -1, 1);

    const [storeSnapshot, summarySnapshot, versionsSnapshot, manifestSnapshot] = await Promise.all([
        storeRef.get(),
        summaryRef.get(),
        versionsRef.get(),
        manifestRef.get(),
    ]);
    const store = storeSnapshot.data() || {};
    assert.equal(store.answerlatticeWorkspaceProfileRevision, 1);
    assert.equal(store.timeZone, 'Asia/Kolkata');
    assert.equal(store.businessDayEndTime, '23:00');
    assert.equal(store.answerlatticeLaunchProfile?.revision, 1);
    assert.equal(store.answerlatticeLaunchProfile?.createdAt?.toDate().toISOString(), launchProfileCreatedAt.toISOString());

    const summary = summarySnapshot.data() || {};
    assert.equal(summary.tenants?.[`${tenantId}_${storeId}`]?.pId, 'AL');
    assert.equal(summary.tenants?.[`${tenantId}_${storeId}`]?.timeZone, 'Asia/Kolkata');
    assert.equal(summary.tenants?.[`${tenantId}_${storeId}`]?.businessDayEndTime, '23:00');

    const versions = versionsSnapshot.data() || {};
    assert.equal(areAnswerlatticeCompiledSourceVersionsValid(versions), true);
    assert.deepEqual(normalizeCompiledSourceVersions(versions), {
        workspaceProfile: 1,
        widgetConfig: 0,
        kb: 0,
        docsNav: 0,
        entities: 0,
        entityRelations: 0,
        canonical: 0,
        surfaces: 0,
        releases: 0,
        branding: 0,
        mcpPolicy: 0,
        predictiveTriggers: 0,
    });
    assert.equal(versions.workspaceProfile, 1);
    assert.equal(versions.pId, 'AL');
    assert.equal(versions.tId, tenantId);
    assert.equal(versions.sId, storeId);
    const manifest = manifestSnapshot.data() || {};
    assert.equal(isAnswerlatticeContextBundleManifestForScope(manifest, tenantId, storeId), true);
    assert.equal(manifest.status, 'stale');
    assert.equal(manifest.staleReason, 'workspace_profile_update');
    assert.equal(manifest.sourceVersions?.workspaceProfile, 0);

    const stale = await saveAnswerlatticeWorkspaceProfileAdmin({
        db,
        expectedRevision: 0,
        profile: { ...updatedProfile, productName: 'Stale edit' },
        storeId,
        tenantId,
    });
    assert.deepEqual(stale, { status: 'conflict', revision: 1 });
    assert.equal((await storeRef.get()).data()?.productName, 'Example SaaS');

    const unchanged = await saveAnswerlatticeWorkspaceProfileAdmin({
        db,
        expectedRevision: 1,
        profile: updatedProfile,
        storeId,
        tenantId,
    });
    assert.equal(unchanged.status, 'unchanged');
    assert.equal((await versionsRef.get()).data()?.workspaceProfile, 1);

    await manifestRef.set({
        pId: 'AL',
        tId: tenantId + 1,
        sId: storeId,
    }, { merge: true });
    await assert.rejects(
        saveAnswerlatticeWorkspaceProfileAdmin({
            db,
            expectedRevision: 1,
            profile: { ...updatedProfile, productName: 'Must not save' },
            storeId,
            tenantId,
        }),
        /compiled context manifest is invalid/,
    );
    const storeAfterInvalidManifest = (await storeRef.get()).data() || {};
    assert.equal(storeAfterInvalidManifest.productName, 'Example SaaS');
    assert.equal(storeAfterInvalidManifest.answerlatticeWorkspaceProfileRevision, 1);
    assert.equal((await versionsRef.get()).data()?.workspaceProfile, 1);

    const forbidden = await saveAnswerlatticeWorkspaceProfileAdmin({
        db,
        expectedRevision: 1,
        profile: updatedProfile,
        storeId,
        tenantId: tenantId + 1,
    });
    assert.deepEqual(forbidden, { status: 'forbidden' });

    process.stdout.write('Answerlattice workspace-profile emulator flow passed.\n');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
