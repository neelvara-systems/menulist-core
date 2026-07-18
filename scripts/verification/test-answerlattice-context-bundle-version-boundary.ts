import assert from 'node:assert/strict';
import * as appBoundary from '../../src/lib/answerlattice/compiledContext';
import { getAnswerlatticeTimestampMillis } from '../../src/lib/answerlattice/cacheFreshness';
import { normalizeCacheVersion } from '../../src/lib/answerlattice/cacheVersionManifest';
import * as functionsBoundary from '../../functions-answerlattice/src/answerlattice/compiledContextVersions';
import * as sharedFunctionsBoundary from '../../functions/src/answerlattice/compiledContextVersions';

for (const boundary of [appBoundary, functionsBoundary, sharedFunctionsBoundary]) {
    assert.equal(boundary.normalizeAnswerlatticeStoredBundleVersion(0), 0);
    assert.equal(boundary.normalizeAnswerlatticeStoredBundleVersion(7), 7);
    assert.equal(boundary.normalizeAnswerlatticeStoredBundleVersion('7'), 7);
    assert.equal(boundary.normalizeAnswerlatticeStoredBundleVersion('07'), null);
    assert.equal(boundary.normalizeAnswerlatticeStoredBundleVersion('7e0'), null);
    assert.equal(boundary.normalizeAnswerlatticeStoredBundleVersion(7.5), null);
    assert.equal(boundary.normalizeAnswerlatticeStoredBundleVersion(Number.MAX_SAFE_INTEGER + 1), null);
    assert.equal(boundary.resolveAnswerlatticeExistingBundleVersion(null), 0);
    assert.equal(boundary.resolveAnswerlatticeExistingBundleVersion({ bundleVersion: '7', activeVersion: 6, lastReadyVersion: 5 }), 7);
    assert.equal(boundary.resolveAnswerlatticeExistingBundleVersion({ bundleVersion: 'bad' }), null);
    assert.equal(boundary.getNextAnswerlatticeBundleVersion({ bundleVersion: 7 }), 8);
    assert.equal(boundary.getNextAnswerlatticeBundleVersion({ bundleVersion: Number.MAX_SAFE_INTEGER }), null);
    assert.deepEqual(
        boundary.getAnswerlatticeBundleBuildClaimDecision(
            { bundleVersion: 7 },
            { status: 'building', bundleVersion: 8, expiresAt: { toMillis: () => 1_100 } },
            1_000,
        ),
        { status: 'active', bundleVersion: 7 },
    );
    assert.deepEqual(
        boundary.getAnswerlatticeBundleBuildClaimDecision(
            { bundleVersion: 7 },
            { status: 'building', bundleVersion: 8, expiresAt: { toMillis: () => 900 } },
            1_000,
        ),
        { status: 'claimable', bundleVersion: 9 },
    );
    assert.deepEqual(
        boundary.getAnswerlatticeBundleBuildClaimDecision(
            { bundleVersion: 7 },
            { status: 'failed', bundleVersion: 8, expiresAt: { toMillis: () => 1_100 } },
            1_000,
        ),
        { status: 'claimable', bundleVersion: 9 },
    );
    assert.deepEqual(
        boundary.getAnswerlatticeBundleBuildClaimDecision(
            { bundleVersion: 7 },
            { status: 'building', bundleVersion: 8, expiresAt: { toMillis: () => { throw new Error('malformed'); } } },
            1_000,
        ),
        { status: 'claimable', bundleVersion: 9 },
    );
    assert.deepEqual(
        boundary.getAnswerlatticeBundleBuildClaimDecision(
            { bundleVersion: Number.MAX_SAFE_INTEGER },
            null,
            1_000,
        ),
        { status: 'invalid', bundleVersion: Number.MAX_SAFE_INTEGER },
    );
    assert.equal(boundary.hasExactAnswerlatticeReadyBundleVersions({ bundleVersion: 7, activeVersion: 7, lastReadyVersion: 7 }), true);
    assert.equal(boundary.hasExactAnswerlatticeReadyBundleVersions({ bundleVersion: '7', activeVersion: 7, lastReadyVersion: 7 }), false);
    assert.equal(boundary.areAnswerlatticeCompiledSourceVersionsValid({ kb: 3, canonical: '4' }), true);
    assert.equal(boundary.areAnswerlatticeCompiledSourceVersionsValid({ kb: '03' }), false);
    assert.equal(boundary.areAnswerlatticeCompiledSourceVersionsValid({ kb: 3.5 }), false);
    assert.equal(Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ kb: '3' }, { kb: 3 }]), true);
    assert.equal(Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ kb: '03' }, { kb: 3 }]), false);
}

assert.equal(normalizeCacheVersion(1), 1);
assert.equal(normalizeCacheVersion('1'), 1);
assert.equal(normalizeCacheVersion(0), undefined);
assert.equal(normalizeCacheVersion(-1), undefined);
assert.equal(normalizeCacheVersion(1.5), undefined);
assert.equal(normalizeCacheVersion('01'), undefined);
assert.equal(normalizeCacheVersion('1e0'), undefined);
assert.equal(normalizeCacheVersion(Number.MAX_SAFE_INTEGER + 1), undefined);

assert.equal(getAnswerlatticeTimestampMillis({ toMillis: () => 42 }), 42);
assert.equal(getAnswerlatticeTimestampMillis(new Date('2026-02-28T12:00:00.000Z')), 1_772_280_000_000);
assert.equal(getAnswerlatticeTimestampMillis({ toMillis: () => Number.NaN }), 0);
assert.equal(getAnswerlatticeTimestampMillis({ toMillis: () => Number.POSITIVE_INFINITY }), 0);
assert.equal(getAnswerlatticeTimestampMillis({ toMillis: () => -1 }), 0);
assert.equal(getAnswerlatticeTimestampMillis({ toMillis: () => { throw new Error('malformed timestamp'); } }), 0);
assert.equal(getAnswerlatticeTimestampMillis({ toDate: () => new Date() }), 0);
assert.equal(getAnswerlatticeTimestampMillis('2026-02-28T12:00:00.000Z'), 0);
assert.equal(getAnswerlatticeTimestampMillis(1_772_280_000_000), 0);

console.log('Answerlattice context-bundle version boundaries passed.');
