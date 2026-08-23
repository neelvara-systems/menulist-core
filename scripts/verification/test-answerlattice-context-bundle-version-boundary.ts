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
import {
    getExpectedAnswerlatticePublicBundleId as getExpectedAppPublicBundleId,
    isExpectedAnswerlatticePublicBundleId as isExpectedAppPublicBundleId,
} from '../../src/lib/answerlattice/publicBundleIdentityServer';

const publicBundleSalt = 'answerlattice-public-bundle-test-salt-2026';
const expectedPublicBundleId = getExpectedAppPublicBundleId(10, 20, publicBundleSalt);
assert.ok(expectedPublicBundleId);
assert.equal(isExpectedAppPublicBundleId(expectedPublicBundleId, 10, 20, publicBundleSalt), true);
assert.equal(isExpectedAppPublicBundleId(expectedPublicBundleId, 10, 21, publicBundleSalt), false);
assert.equal(getExpectedAppPublicBundleId(10, 20, 'short'), null);
assert.equal(
    functionsBoundary.getExpectedAnswerlatticePublicBundleId(10, 20, publicBundleSalt),
    expectedPublicBundleId,
);
assert.equal(
    sharedFunctionsBoundary.getExpectedAnswerlatticePublicBundleId(10, 20, publicBundleSalt),
    expectedPublicBundleId,
);

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
    assert.equal(
        boundary.normalizeCompiledSourceVersions({ branding: 2, mcpPolicy: 3 }).branding,
        2,
        'reserved branding counters must remain part of the normalized invalidation snapshot',
    );
    assert.equal(
        boundary.normalizeCompiledSourceVersions({ branding: 2, mcpPolicy: 3 }).mcpPolicy,
        3,
        'reserved MCP-policy counters must remain part of the normalized invalidation snapshot',
    );
    assert.equal(Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ kb: '3' }, { kb: 3 }]), true);
    assert.equal(Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ kb: '03' }, { kb: 3 }]), false);
    assert.equal(
        Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ branding: 1 }, { branding: 2 }]),
        false,
        'reserved branding counter changes must supersede a concurrent bundle build',
    );
    assert.equal(
        Reflect.apply(boundary.compiledSourceVersionsEqual, null, [{ mcpPolicy: 1 }, { mcpPolicy: 2 }]),
        false,
        'reserved MCP-policy counter changes must supersede a concurrent bundle build',
    );
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
assert.equal(
    functionsBoundary.shouldDeleteAnswerlatticeContextBundleVersion(3, 5, new Set([4, 5])),
    true,
);
assert.equal(
    functionsBoundary.shouldDeleteAnswerlatticeContextBundleVersion(6, 5, new Set([4, 5])),
    false,
    'retention must never delete a newer bundle created during cleanup',
);
assert.equal(
    sharedFunctionsBoundary.shouldDeleteAnswerlatticeContextBundleVersion(6, 5, new Set([4, 5])),
    false,
);

const cacheKey = buildCacheKey(10, 20, 'billing:plan', 4, 'How do I change plans?', 'billing-context-v1', 'pro:annual', 'owner', 'active');
assert.match(cacheKey, /^canon:v5:10:20:e:[A-Za-z0-9_-]+:v4:q:[A-Za-z0-9_-]+:c:[A-Za-z0-9_-]+:p:[A-Za-z0-9_-]+:r:[A-Za-z0-9_-]+:s:[A-Za-z0-9_-]+$/);
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
for (const sensitiveQueryKey of ['accessToken', 'apiKey', 'clientSecret', 'refreshToken', 'sig']) {
    assert.deepEqual(normalizeAnswerlatticeFunctionPublicCitations([{
        id: `blocked-${sensitiveQueryKey}`,
        title: 'Sensitive URL',
        url: `https://docs.example.com/private?${sensitiveQueryKey}=secret`,
    }]), [], `Functions public citation projection must reject ${sensitiveQueryKey}`);
}
for (const privateIpv6Url of [
    'http://[fe80::1]/internal',
    'http://[fe90::1]/internal',
    'http://[fea0::1]/internal',
    'http://[febf::1]/internal',
    'http://[fec0::1]/internal',
    'http://[feff::1]/internal',
]) {
    assert.deepEqual(normalizeAnswerlatticeFunctionPublicCitations([{
        id: 'blocked-private-ipv6',
        title: 'Private IPv6 address',
        url: privateIpv6Url,
    }]), [], `Functions public citation projection must reject ${privateIpv6Url}`);
}
assert.deepEqual(normalizeAnswerlatticeFunctionPublicCitations([{
    id: 'public-monkey-guide',
    title: 'Monkey guide',
    url: 'https://docs.example.com/guide?monkey=capuchin',
}]), [{
    id: 'public-monkey-guide',
    title: 'Monkey guide',
    url: 'https://docs.example.com/guide?monkey=capuchin',
}]);

const repoRoot = path.resolve(__dirname, '../..');
const appBuilderSource = readFileSync(path.join(repoRoot, 'src/lib/answerlattice/contextBundleBuilderServer.ts'), 'utf8');
const functionsBuilderSource = readFileSync(path.join(repoRoot, 'functions-answerlattice/src/answerlattice/contextBundleBuilder.ts'), 'utf8');
const advancedBrandingDalSource = readFileSync(path.join(repoRoot, 'src/database/answerlattice/branding.ts'), 'utf8');
const initializationSource = readFileSync(path.join(repoRoot, 'src/lib/answerlattice/compiledSourceVersionsAdmin.ts'), 'utf8');
const appInvalidationSource = readFileSync(path.join(repoRoot, 'src/lib/answerlattice/invalidationOwnership.ts'), 'utf8');
const dedicatedInvalidationSource = readFileSync(path.join(repoRoot, 'functions-answerlattice/src/answerlattice/compiledContextVersions.ts'), 'utf8');
const sharedInvalidationSource = readFileSync(path.join(repoRoot, 'functions/src/answerlattice/compiledContextVersions.ts'), 'utf8');
const dedicatedCacheInvalidationSource = readFileSync(path.join(repoRoot, 'functions-answerlattice/src/answerlattice/cacheVersionManifest.ts'), 'utf8');
const sharedCacheInvalidationSource = readFileSync(path.join(repoRoot, 'functions/src/answerlattice/cacheVersionManifest.ts'), 'utf8');
const dedicatedPublishingSource = readFileSync(path.join(repoRoot, 'functions-answerlattice/src/logic/kbPublishingLifecycle.ts'), 'utf8');
const sharedPublishingSource = readFileSync(path.join(repoRoot, 'functions/src/logic/kbPublishingLifecycle.ts'), 'utf8');
for (const source of [appBuilderSource, functionsBuilderSource]) {
    assert.equal(source.includes("'manifest.json': {"), false, 'manifest objects must not be uploaded before the final projection exists');
    assert.ok(source.includes('publicManifest'), 'builder must publish a public manifest projection');
    assert.ok(source.includes('loadBoundedDocs'), 'builder must fail instead of silently truncating governed source data');
    assert.ok(source.includes('deleteFiles'), 'failed bundle versions must be cleaned up best effort');
    assert.ok(source.includes('sourceVersions,'), 'private product summary must retain the complete invalidation snapshot');
    assert.equal(source.includes('branding_${tId}_${sId}'), false, 'bundle builders must not read the rollout-gated advanced branding profile');
    assert.equal(source.includes('mcpPolicy_${tId}_${sId}'), false, 'bundle builders must not read an MCP authorization policy document');
    assert.equal(source.includes("'branding.json'"), false, 'bundle builders must not serialize an advanced branding payload');
    assert.equal(source.includes("'mcp/policy.json'"), false, 'bundle builders must not serialize an MCP authorization policy payload');
    const identityValidationIndex = source.indexOf('const publicBundleId = getPublicBundleId(existingManifest, tenantId, storeId);');
    const leaseClaimIndex = source.indexOf('const claim = await db.runTransaction');
    assert.ok(identityValidationIndex >= 0, 'bundle builders must validate the public bundle identity');
    assert.ok(leaseClaimIndex >= 0, 'bundle builders must claim a build lease transactionally');
    assert.ok(
        identityValidationIndex < leaseClaimIndex,
        'bundle builders must reject invalid public ownership configuration before claiming a build lease',
    );
}
assert.equal(
    advancedBrandingDalSource.includes('markAnswerlatticeCompiledContextSourceChanged'),
    false,
    'saving the non-delivered advanced branding profile must not stale or rebuild compiled context',
);
assert.ok(appBuilderSource.includes('getAnswerlatticeContextBundleObjectMaxBytes'), 'app builder must enforce object caps');
assert.ok(functionsBuilderSource.includes('maxPublicObjectBytes'), 'Functions builder must persist the general public object cap');
assert.ok(initializationSource.includes('transaction.create(sourceRef'), 'control-plane initialization must create missing source state only');
assert.ok(initializationSource.includes('transaction.create(manifestRef'), 'control-plane initialization must create missing manifest state only');
assert.equal(initializationSource.includes('const batch = db.batch()'), false, 'control-plane initialization must not merge-reset existing state');
assert.match(appInvalidationSource, /sourceVersionsSnapshot\.exists[\s\S]*data\.pId !== PRODUCT_IDS\.ANSWERLATTICE/);
for (const source of [dedicatedInvalidationSource, sharedInvalidationSource]) {
    assert.match(source, /transaction\.get\(sourceVersionsRef\)[\s\S]*transaction\.get\(manifestRef\)/);
    assert.match(source, /sourceVersionsSnapshot\.exists[\s\S]*sourceVersions\?\.pId !== 'AL'/);
    assert.match(source, /isOwnedAnswerlatticeBundleManifest\(manifestSnapshot\.data\(\), tenantId, storeId\)/);
    assert.match(source, /getMissingAnswerlatticeBundleManifestBase\(tenantId, storeId\)/);
}
for (const source of [dedicatedCacheInvalidationSource, sharedCacheInvalidationSource]) {
    assert.match(source, /transaction\.get\(cacheVersionRef\)/);
    assert.match(source, /cacheVersion\?\.pId !== 'AL'[\s\S]*cacheVersion\?\.source !== source/);
    assert.match(source, /appendCompiledContextSourceChanges\(transaction, db, \[source, \.\.\.additionalContextSources\]/);
}
for (const source of [dedicatedPublishingSource, sharedPublishingSource]) {
    assert.match(source, /await appendAnswerlatticeCacheVersionBump\([\s\S]*maintenanceMetadata,[\s\S]*\['docsNav'\]/);
    assert.doesNotMatch(source, /transaction\.set\(sourceVersionsRef/);
    assert.doesNotMatch(source, /transaction\.set\(bundleManifestRef/);
}
for (const source of [appBuilderSource, functionsBuilderSource]) {
    assert.match(source, /currentManifestSnap[\s\S]*currentLockSnap[\s\S]*status !== 'building'/);
    assert.match(source, /currentLock\?\.bundleVersion !==/);
    assert.match(
        source,
        /const manifest = await db\.runTransaction[\s\S]*transaction\.get\(sourceVersionsRef\)[\s\S]*sourceVersionsAtCommit/,
        'bundle finalization must classify source-version drift from the transaction-current source row',
    );
    assert.match(
        source,
        /currentManifest\?\.status !== 'building' && currentManifest\?\.status !== 'stale'/,
        'an exact active lease must accept stale-during-build invalidation for superseded cleanup',
    );
    assert.match(
        source,
        /const superseded = currentManifest\?\.status === 'stale'/,
        'stale-during-build invalidation must never publish the generated version as ready',
    );
    assert.match(
        source,
        /if \(currentManifest\?\.status === 'building'\) \{[\s\S]*?transaction\.set\(lockRef, \{/,
        'failure cleanup must preserve a newer stale manifest while terminating its exact lease',
    );
}
assert.ok(
    appBuilderSource.indexOf('const manifest = await db.runTransaction')
        < appBuilderSource.indexOf('await uploadBundleManifestObjectBestEffort'),
    'app bundle manifest objects must use the transaction-committed ready/superseded projection',
);
assert.match(
    appBuilderSource,
    /bundleManifestCache\.delete\(`\$\{tenantId\}_\$\{storeId\}`\)/,
    'app bundle completion must force the next reader to reload transaction-current Firestore truth',
);
assert.doesNotMatch(
    appBuilderSource,
    /bundleManifestCache\.set\(`\$\{tenantId\}_\$\{storeId\}`/,
    'app bundle completion must not reinstall a stale ready manifest after concurrent invalidation',
);
assert.ok(
    functionsBuilderSource.indexOf('const manifest = await db.runTransaction')
        < functionsBuilderSource.indexOf('await uploadManifestObjectBestEffort'),
    'Functions bundle manifest objects must use the transaction-committed ready/superseded projection',
);
assert.match(
    appBuilderSource,
    /transaction\.set\(lockRef, \{[\s\S]*?reason: buildReason,\n        \}\);/,
    'app bundle claims must replace expired locks so stale terminal fields cannot survive',
);
assert.match(
    functionsBuilderSource,
    /transaction\.set\(lockRef, \{[\s\S]*?reason: 'nightly_repair',[\s\S]*?sourceVersionsAtStart: currentSourceVersions,\n        \}\);/,
    'Functions bundle claims must replace expired locks so stale terminal fields cannot survive',
);

console.log('Answerlattice context-bundle version boundaries passed.');
