import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as appBoundary from '../../src/lib/answerlattice/compiledContext';
import { getAnswerlatticeTimestampMillis } from '../../src/lib/answerlattice/cacheFreshness';
import { normalizeCacheVersion } from '../../src/lib/answerlattice/cacheVersionManifest';
import { buildCacheKey, normalizeCachedCanonicalAnswer } from '../../src/lib/answerlattice/instantCache';
import * as functionsBoundary from '../../functions-answerlattice/src/answerlattice/compiledContextVersions';
import { normalizeAnswerlatticeFunctionPublicCitations } from '../../functions-answerlattice/src/answerlattice/publicCitationBoundary';
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

const sourceVersions = appBoundary.normalizeCompiledSourceVersions({ canonical: 4, kb: 3 });
const bundlePath = appBoundary.getPrivateBundlePath(10, 20, 7, 'mcp/entity-index.json');
const manifest = {
    schemaVersion: appBoundary.ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
    pId: 'AL',
    tId: 10,
    sId: 20,
    publicBundleId: 'pb_12345678',
    bundleVersion: 7,
    activeVersion: 7,
    lastReadyVersion: 7,
    status: 'ready',
    sourceVersions,
    stats: appBoundary.EMPTY_BUNDLE_STATS,
    limits: appBoundary.ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
    bundles: {
        'private:mcp/entity-index.json': {
            path: bundlePath,
            bytes: 200,
            hash: `sha256:${'a'.repeat(64)}`,
        },
    },
};
assert.equal(appBoundary.isAnswerlatticeContextBundleManifestForScope(manifest, 10, 20), true);
assert.equal(appBoundary.isAnswerlatticeContextBundleManifestForScope({ ...manifest, tId: 11 }, 10, 20), false);
assert.equal(appBoundary.isAnswerlatticeContextBundleManifestForScope({ ...manifest, activeVersion: 6 }, 10, 20), false);
assert.equal(appBoundary.getAnswerlatticeBundleRefPath(manifest, 'private:mcp/entity-index.json', 10, 20), bundlePath);
assert.equal(appBoundary.getAnswerlatticeBundleRefPath({
    ...manifest,
    bundles: {
        'private:mcp/entity-index.json': {
            ...manifest.bundles['private:mcp/entity-index.json'],
            path: appBoundary.getPrivateBundlePath(10, 21, 7, 'mcp/entity-index.json'),
        },
    },
}, 'private:mcp/entity-index.json', 10, 20), null);
assert.equal(appBoundary.getAnswerlatticeContextBundleObjectMaxBytes('public', 'widget-bootstrap.json'), 50_000);
assert.equal(appBoundary.getAnswerlatticeContextBundleObjectMaxBytes('public', 'routes/r_billing.json'), 50_000);
assert.equal(appBoundary.getAnswerlatticeContextBundleObjectMaxBytes('public', 'docs-nav.json'), 512 * 1024);
assert.equal(appBoundary.getAnswerlatticeContextBundleObjectMaxBytes('private', 'mcp/entity-index.json'), 2 * 1024 * 1024);

const cacheKey = buildCacheKey(10, 20, 'billing:plan', 4, 'pro:annual', 'owner', 'active');
assert.match(cacheKey, /^canon:v4:10:20:e:[A-Za-z0-9_-]+:v4:p:[A-Za-z0-9_-]+:r:[A-Za-z0-9_-]+:s:[A-Za-z0-9_-]+$/);
assert.equal(cacheKey.includes('billing:plan'), false);
const cachedPayload = normalizeCachedCanonicalAnswer({
    craftedAnswer: 'Use the approved billing workflow.',
    canonicalAnswerId: 'answer-1',
    confidence: 'high',
    answerType: 'explanation',
    matchedEntityIds: ['billing:plan'],
    citations: [{ id: 'docs', title: 'Billing docs', url: 'https://example.com/billing' }],
    procedure: null,
    cachedAt: Date.now(),
    answerVersion: 4,
    topEntityId: 'billing:plan',
    sourceVersions: { canonical: 2 },
}, { topEntityId: 'billing:plan', answerVersion: 4 });
assert.ok(cachedPayload);
assert.equal(normalizeCachedCanonicalAnswer({ ...cachedPayload, answerVersion: 5 }, {
    topEntityId: 'billing:plan',
    answerVersion: 4,
}), null);

assert.deepEqual(normalizeAnswerlatticeFunctionPublicCitations([
    { id: 'blocked', title: 'Internal', url: 'http://127.0.0.1/private' },
    { id: 'public', title: 'Public docs', url: 'https://example.com/docs' },
]), [{ id: 'public', title: 'Public docs', url: 'https://example.com/docs' }]);

const repoRoot = path.resolve(__dirname, '../..');
const appBuilderSource = readFileSync(path.join(repoRoot, 'src/lib/answerlattice/contextBundleBuilderServer.ts'), 'utf8');
const functionsBuilderSource = readFileSync(path.join(repoRoot, 'functions-answerlattice/src/answerlattice/contextBundleBuilder.ts'), 'utf8');
const initializationSource = readFileSync(path.join(repoRoot, 'src/lib/answerlattice/compiledSourceVersionsAdmin.ts'), 'utf8');
for (const source of [appBuilderSource, functionsBuilderSource]) {
    assert.equal(source.includes("'manifest.json': {"), false, 'manifest objects must not be uploaded before the final projection exists');
    assert.ok(source.includes('publicManifest'), 'builder must publish a public manifest projection');
    assert.ok(source.includes('loadBoundedDocs'), 'builder must fail instead of silently truncating governed source data');
    assert.ok(source.includes('deleteFiles'), 'failed bundle versions must be cleaned up best effort');
}
assert.ok(appBuilderSource.includes('getAnswerlatticeContextBundleObjectMaxBytes'), 'app builder must enforce object caps');
assert.ok(functionsBuilderSource.includes('maxPublicObjectBytes'), 'Functions builder must persist the general public object cap');
assert.ok(initializationSource.includes('transaction.create(sourceRef'), 'control-plane initialization must create missing source state only');
assert.ok(initializationSource.includes('transaction.create(manifestRef'), 'control-plane initialization must create missing manifest state only');
assert.equal(initializationSource.includes('const batch = db.batch()'), false, 'control-plane initialization must not merge-reset existing state');

console.log('Answerlattice context-bundle version boundaries passed.');
