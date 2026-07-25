#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { executeAnswerlatticeChangelogAction } from '../../src/lib/answerlattice/changelogServer';
import type { AnswerlatticeAccessContext } from '../../src/lib/answerlattice/accessControl';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { isAnswerlatticeContextBundleManifestForScope } from '../../src/lib/answerlattice/compiledContext';
import { Timestamp } from 'firebase-admin/firestore';

const access: AnswerlatticeAccessContext = {
    canUseManagement: true,
    currentRoleId: 'owner',
    isPlatformAdmin: false,
    permissions: {} as AnswerlatticeAccessContext['permissions'],
    roles: [],
    scope: { tenantId: 1, storeId: 101 },
    storeName: 'Example',
    user: { id: 'owner-1', email: 'owner@example.com', name: 'Owner' },
};
const scope = { tId: 1, sId: 101 };

const entry = (title: string, files: Array<Record<string, unknown>> = []) => ({
    title,
    description: { type: 'doc', content: [{ type: 'paragraph' }] },
    tags: ['New Feature'],
    releasedOn: '2026-07-11T10:00:00.000Z',
    published: false,
    version: null,
    contextKeys: [],
    kbSources: [],
    youtubeLinks: [],
    files: files as any,
    entityChanges: [],
    releaseId: null,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db) throw new Error('Answerlattice Firestore Admin is required');
    for (const name of ['changelog', 'answerlattice_changelogEntryIndex', 'answerlattice_releases', 'platformSummary']) {
        await db.recursiveDelete(db.collection(name));
    }

    const releasedAt = Timestamp.fromDate(new Date('2026-07-11T10:00:00.000Z'));
    await db.collection('answerlattice_releases').doc('release-linked').set({
        pId: 'AL', tId: 1, sId: 101,
        versionLabel: '1.0.0', versionNormalized: 1_000_000,
        releasedAt, entityChanges: ['billing'], status: 'active',
        createdOn: releasedAt, createdBy: 'Owner', modifiedOn: releasedAt, modifiedBy: 'Owner',
    });

    const sourceVersionsRef = db.collection('platformSummary').doc('sourceVersions_1_101');
    await sourceVersionsRef.set({ pId: 'ML', tId: 1, sId: 101, marker: 'foreign-source' });
    await assert.rejects(executeAnswerlatticeChangelogAction({
        action: 'create', requestId: 'create_request_1', scope, entry: entry('First release'),
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await sourceVersionsRef.get()).data()?.marker, 'foreign-source');
    assert.equal(
        (await db.collection('answerlattice_changelogEntryIndex').get()).empty,
        true,
        'ownership conflict must roll back the changelog mutation',
    );
    await sourceVersionsRef.delete();

    const created = await executeAnswerlatticeChangelogAction({
        action: 'create', requestId: 'create_request_1', scope, entry: entry('First release'),
    }, access);
    assert.equal(created.action, 'create');
    assert.equal(created.replayed, false);
    const initialManifest = (await db.collection('platformSummary').doc('bundleManifest_1_101').get()).data();
    assert.equal(
        isAnswerlatticeContextBundleManifestForScope(initialManifest, 1, 101),
        true,
        'first changelog invalidation must create a complete valid compiled-context manifest',
    );
    const replay = await executeAnswerlatticeChangelogAction({
        action: 'create', requestId: 'create_request_1', scope, entry: entry('First release'),
    }, access);
    assert.equal(replay.replayed, true);
    await assert.rejects(executeAnswerlatticeChangelogAction({
        action: 'create', requestId: 'create_request_1', scope, entry: entry('Changed payload'),
    }, access));

    const pageRef = db.collection('changelog').doc('1').collection('101').doc(created.pageId);
    const seededPage = (await pageRef.get()).data()!;
    seededPage.entries[0].likes = 3;
    await pageRef.update({ entries: seededPage.entries });
    const file = { name: 'old.png', size: 100, type: 'image/png', url: 'https://example.com/old.png', uid: 'old-file' };
    const updated = await executeAnswerlatticeChangelogAction({
        action: 'update', requestId: 'update_request_1', scope, entryId: created.entryId, entry: entry('Updated release', [file]),
    }, access);
    assert.equal(updated.replayed, false);
    const updatedAgain = await executeAnswerlatticeChangelogAction({
        action: 'update', requestId: 'update_request_2', scope, entryId: created.entryId, entry: entry('Updated again'),
    }, access);
    assert.deepEqual(updatedAgain.removedFileUrls, ['https://example.com/old.png']);
    const pageAfterUpdate = (await pageRef.get()).data();
    assert.equal(pageAfterUpdate?.entries[0]?.title, 'Updated again');
    assert.equal(pageAfterUpdate?.entries[0]?.likes, 3, 'owner edits must preserve feedback counters');

    const deleted = await executeAnswerlatticeChangelogAction({
        action: 'delete', requestId: 'delete_request_1', scope, entryId: created.entryId,
    }, access);
    assert.equal(deleted.replayed, false);
    const deleteReplay = await executeAnswerlatticeChangelogAction({
        action: 'delete', requestId: 'delete_request_2', scope, entryId: created.entryId,
    }, access);
    assert.equal(deleteReplay.replayed, true);
    const index = (await db.collection('answerlattice_changelogEntryIndex').doc(created.entryId).get()).data();
    assert.equal(index?.deleted, true);
    assert.ok(index?.expiresAt instanceof Timestamp);

    const [parallelA, parallelB] = await Promise.all([
        executeAnswerlatticeChangelogAction({ action: 'create', requestId: 'parallel_request_a', scope, entry: entry('Parallel A') }, access),
        executeAnswerlatticeChangelogAction({ action: 'create', requestId: 'parallel_request_b', scope, entry: entry('Parallel B') }, access),
    ]);
    assert.notEqual(parallelA.entryId, parallelB.entryId);
    const latest = await db.collection('changelog').doc('1').collection('101').orderBy('pageNumber', 'desc').limit(1).get();
    const latestData = latest.docs[0]?.data();
    assert.equal(new Set(latestData?.entryIds || []).size, latestData?.entryIds?.length, 'concurrent creates must not lose or duplicate entries');
    assert.ok((latestData?.entryIds || []).includes(parallelA.entryId));
    assert.ok((latestData?.entryIds || []).includes(parallelB.entryId));

    const linkedReleaseEntry = {
        ...entry('Published release'),
        published: true,
        version: '1.0.0',
        entityChanges: ['billing'],
        releaseId: 'release-linked',
    };
    const published = await executeAnswerlatticeChangelogAction({
        action: 'create', requestId: 'published_request_1', scope, entry: linkedReleaseEntry,
    }, access);
    assert.equal(published.replayed, false);
    await assert.rejects(executeAnswerlatticeChangelogAction({
        action: 'create', requestId: 'published_request_unlinked', scope, entry: { ...linkedReleaseEntry, releaseId: null },
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 400);
    await assert.rejects(executeAnswerlatticeChangelogAction({
        action: 'create', requestId: 'published_request_mismatch', scope, entry: { ...linkedReleaseEntry, entityChanges: ['settings'] },
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);

    await assert.rejects(executeAnswerlatticeChangelogAction({
        action: 'create',
        requestId: 'wrong_scope_request',
        scope: { tId: 2, sId: 202 },
        entry: entry('Wrong workspace'),
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);

    const sourceVersions = (await db.collection('platformSummary').doc('sourceVersions_1_101').get()).data();
    assert.ok(Number(sourceVersions?.releases) >= 7, 'every non-replayed mutation must invalidate compiled release context once');
}

run()
    .then(() => process.stdout.write('Answerlattice changelog emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
