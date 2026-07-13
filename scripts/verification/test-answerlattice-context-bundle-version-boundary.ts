import assert from 'node:assert/strict';
import * as appBoundary from '../../src/lib/answerlattice/compiledContext';
import * as functionsBoundary from '../../functions-answerlattice/src/answerlattice/compiledContextVersions';

for (const boundary of [appBoundary, functionsBoundary]) {
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
    assert.equal(boundary.hasExactAnswerlatticeReadyBundleVersions({ bundleVersion: 7, activeVersion: 7, lastReadyVersion: 7 }), true);
    assert.equal(boundary.hasExactAnswerlatticeReadyBundleVersions({ bundleVersion: '7', activeVersion: 7, lastReadyVersion: 7 }), false);
    assert.equal(boundary.areAnswerlatticeCompiledSourceVersionsValid({ kb: 3, canonical: '4' }), true);
    assert.equal(boundary.areAnswerlatticeCompiledSourceVersionsValid({ kb: '03' }), false);
    assert.equal(boundary.areAnswerlatticeCompiledSourceVersionsValid({ kb: 3.5 }), false);
    assert.equal(Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ kb: '3' }, { kb: 3 }]), true);
    assert.equal(Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ kb: '03' }, { kb: 3 }]), false);
}

console.log('Answerlattice context-bundle version boundaries passed.');
