#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    markCompiledContextSourceChanged,
} from '../../functions-answerlattice/src/answerlattice/compiledContextVersions';
import {
    appendAnswerlatticeCacheVersionBump,
    bumpAnswerlatticeCacheVersion,
} from '../../functions-answerlattice/src/answerlattice/cacheVersionManifest';
import { repairCompiledContextBundle } from '../../functions-answerlattice/src/answerlattice/contextBundleBuilder';
import { firestoreAdmin as db } from '../../functions-answerlattice/src/firebaseAdmin';
import { isAnswerlatticeContextBundleManifestForScope } from '../../src/lib/answerlattice/compiledContext';

const SCOPE = { tId: 73, sId: 7301 };

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const sourceRef = db.collection('platformSummary').doc(`sourceVersions_${SCOPE.tId}_${SCOPE.sId}`);
    const manifestRef = db.collection('platformSummary').doc(`bundleManifest_${SCOPE.tId}_${SCOPE.sId}`);
    const cacheRef = db.collection('answerlattice_cacheVersions').doc(`canonical_${SCOPE.tId}_${SCOPE.sId}`);

    await Promise.all([
        db.recursiveDelete(db.collection('platformSummary')),
        db.recursiveDelete(db.collection('answerlattice_cacheVersions')),
    ]);

    await markCompiledContextSourceChanged(db, 'canonical', SCOPE.tId, SCOPE.sId, {
        reason: 'contract_test',
    });
    const initialManifest = (await manifestRef.get()).data();
    assert.equal(
        isAnswerlatticeContextBundleManifestForScope(initialManifest, SCOPE.tId, SCOPE.sId),
        true,
        'first Functions invalidation must create a complete valid manifest',
    );
    assert.equal((await sourceRef.get()).data()?.canonical, 1);

    await sourceRef.set({ pId: 'ML', ...SCOPE, marker: 'foreign-source' });
    await assert.rejects(
        markCompiledContextSourceChanged(db, 'canonical', SCOPE.tId, SCOPE.sId),
        /source-version ownership conflict/,
    );
    assert.equal((await sourceRef.get()).data()?.marker, 'foreign-source');

    await sourceRef.delete();
    await manifestRef.set({ pId: 'ML', ...SCOPE, marker: 'foreign-manifest' });
    await assert.rejects(
        markCompiledContextSourceChanged(db, 'canonical', SCOPE.tId, SCOPE.sId),
        /bundle-manifest ownership conflict/,
    );
    assert.equal((await manifestRef.get()).data()?.marker, 'foreign-manifest');

    await manifestRef.delete();
    await cacheRef.set({
        pId: 'ML',
        ...SCOPE,
        source: 'canonical',
        version: 9,
        marker: 'foreign-cache',
    });
    await assert.rejects(
        bumpAnswerlatticeCacheVersion(db, 'canonical', SCOPE.tId, SCOPE.sId),
        /cache-version ownership conflict/,
    );
    assert.equal((await cacheRef.get()).data()?.marker, 'foreign-cache');
    assert.equal((await sourceRef.get()).exists, false, 'cache ownership conflict must roll back source invalidation');

    await cacheRef.delete();
    await db.runTransaction(async transaction => {
        await appendAnswerlatticeCacheVersionBump(
            transaction,
            db,
            'canonical',
            SCOPE.tId,
            SCOPE.sId,
            { reason: 'multi_source_contract_test' },
            ['docsNav'],
        );
    });
    const multiSourceVersions = (await sourceRef.get()).data();
    assert.equal(multiSourceVersions?.canonical, 1);
    assert.equal(multiSourceVersions?.docsNav, 1);
    assert.equal((await cacheRef.get()).data()?.version, 1);
    const lockRef = db.collection('platformSummary').doc(`bundleBuildLock_${SCOPE.tId}_${SCOPE.sId}`);
    await lockRef.set({
        pId: 'ML',
        ...SCOPE,
        status: 'building',
        bundleVersion: 0,
        marker: 'foreign-lock',
    });
    const repair = await repairCompiledContextBundle(SCOPE.tId, SCOPE.sId);
    assert.equal(repair.status, 'failed');
    assert.equal(repair.error, 'invalid_lock_scope');
    assert.equal((await lockRef.get()).data()?.marker, 'foreign-lock');
}

run()
    .then(() => process.stdout.write('Answerlattice compiled-context invalidation emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
