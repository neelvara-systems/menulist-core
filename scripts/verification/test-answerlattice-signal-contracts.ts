import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
    buildAnswerlatticeSignalDocumentId,
    buildAnswerlatticeSignalMemoryDedupKey,
    buildAnswerlatticeSignalPayloadFingerprint,
    hashAnswerlatticeSignalIdentity,
    normalizeExactAnswerlatticeSignalScopeId,
} from '@lib/answerlattice/signalIdentity';
import { sanitizeAnswerlatticeSignalMetadata } from '@lib/answerlattice/signalEmitter';
import { redactAnswerlatticeSupportEvidenceText } from '@data/shared/answerlatticeSupportEvidencePrivacy';

const ROOT = path.resolve(__dirname, '..', '..');
const first = buildAnswerlatticeSignalDocumentId({
    tId: 1,
    sId: 101,
    deduplicationKey: 'ticket:ticket_resolution_ticket-1',
});
const second = buildAnswerlatticeSignalDocumentId({
    tId: '1',
    sId: '101',
    deduplicationKey: 'ticket:ticket_resolution_ticket-1',
});
assert.ok(first?.startsWith('sig_'));
assert.equal(first, second);
assert.notEqual(first, buildAnswerlatticeSignalDocumentId({
    tId: 1,
    sId: 102,
    deduplicationKey: 'ticket:ticket_resolution_ticket-1',
}));
assert.equal(buildAnswerlatticeSignalDocumentId({ tId: ' 1', sId: 101, deduplicationKey: 'x' }), null);
assert.equal(buildAnswerlatticeSignalDocumentId({ tId: 1, sId: 101, deduplicationKey: '' }), null);
assert.equal(buildAnswerlatticeSignalDocumentId({ tId: 1, sId: 101, deduplicationKey: 123 }), null);
assert.equal(hashAnswerlatticeSignalIdentity('same'), hashAnswerlatticeSignalIdentity('same'));
assert.equal(
    buildAnswerlatticeSignalMemoryDedupKey({ tId: 1, sId: 101, deduplicationKey: 'ticket:ticket-1' }),
    '1:101:ticket:ticket-1',
);
assert.notEqual(
    buildAnswerlatticeSignalMemoryDedupKey({ tId: 1, sId: 101, deduplicationKey: 'ticket:ticket-1' }),
    buildAnswerlatticeSignalMemoryDedupKey({ tId: 2, sId: 101, deduplicationKey: 'ticket:ticket-1' }),
    'process-local dedupe identity must not collide across tenants',
);
assert.equal(buildAnswerlatticeSignalMemoryDedupKey({ tId: '1', sId: 101, deduplicationKey: 'x' }), null);
const payloadFingerprint = buildAnswerlatticeSignalPayloadFingerprint({
    type: 'ticket',
    entityId: 'entity-1',
    deduplicationKey: 'ticket:ticket-1',
    metadata: { subject: 'Need help', nested: { b: 2, a: 1 } },
});
assert.equal(payloadFingerprint, buildAnswerlatticeSignalPayloadFingerprint({
    type: 'ticket',
    entityId: 'entity-1',
    deduplicationKey: 'ticket:ticket-1',
    metadata: { nested: { a: 1, b: 2 }, subject: 'Need help' },
}));
assert.notEqual(payloadFingerprint, buildAnswerlatticeSignalPayloadFingerprint({
    type: 'ticket',
    entityId: 'entity-1',
    deduplicationKey: 'ticket:ticket-1',
    metadata: { subject: 'Changed payload' },
}));
assert.equal(normalizeExactAnswerlatticeSignalScopeId(1), 1);
assert.equal(normalizeExactAnswerlatticeSignalScopeId(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
for (const value of ['1', '01', '1e0', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, true, null]) {
    assert.equal(normalizeExactAnswerlatticeSignalScopeId(value), null);
}

const cyclicMetadata: Record<string, unknown> = { subject: 'Need help' };
cyclicMetadata.self = cyclicMetadata;
assert.doesNotThrow(() => buildAnswerlatticeSignalPayloadFingerprint({
    type: 'ticket',
    entityId: 'entity-1',
    deduplicationKey: 'ticket:cyclic',
    metadata: cyclicMetadata,
}));
assert.doesNotThrow(() => buildAnswerlatticeSignalPayloadFingerprint({
    type: { toString: () => { throw new Error('crafted identity coercion'); } },
    entityId: 'entity-1',
    deduplicationKey: 'ticket:crafted',
    metadata: new Proxy({}, {
        ownKeys() {
            throw new Error('crafted metadata proxy');
        },
    }),
}));
assert.deepEqual(sanitizeAnswerlatticeSignalMetadata(new Proxy({}, {
    ownKeys() {
        throw new Error('crafted metadata proxy');
    },
})), {});
assert.deepEqual(sanitizeAnswerlatticeSignalMetadata({ finite: 2, invalid: Number.NaN }), {
    finite: 2,
    invalid: null,
});
assert.deepEqual(sanitizeAnswerlatticeSignalMetadata({
    invalidDate: new Date(Number.NaN),
    nestedProxy: new Proxy({}, {
        ownKeys() {
            throw new Error('crafted nested metadata proxy');
        },
    }),
}), {
    invalidDate: null,
    nestedProxy: null,
});
assert.equal(redactAnswerlatticeSupportEvidenceText({
    toString() {
        throw new Error('crafted redaction coercion');
    },
}), '');

const clientEmitter = fs.readFileSync(path.join(ROOT, 'src/lib/answerlattice/signalEmitter.ts'), 'utf8');
const serverEmitter = fs.readFileSync(path.join(ROOT, 'src/lib/answerlattice/signalEmitterServer.ts'), 'utf8');
const nightly = fs.readFileSync(path.join(ROOT, 'functions-answerlattice/src/answerlattice/answerlatticeNightly.ts'), 'utf8');
const supportBoardSync = fs.readFileSync(path.join(ROOT, 'functions-answerlattice/src/answerlattice/supportBoardSync.ts'), 'utf8');
const resolutionExtractor = fs.readFileSync(path.join(ROOT, 'functions-answerlattice/src/answerlattice/resolutionExtractor.ts'), 'utf8');
const draftGenerator = fs.readFileSync(path.join(ROOT, 'functions-answerlattice/src/answerlattice/draftGenerator.ts'), 'utf8');
const publicSignalRoute = fs.readFileSync(path.join(ROOT, 'src/app/api/answerlattice/public/v1/signals/route.ts'), 'utf8');
const signalDal = fs.readFileSync(path.join(ROOT, 'src/database/answerlattice/signalEvents.ts'), 'utf8');
assert.ok(serverEmitter.includes('buildAnswerlatticeSignalDocumentId'));
assert.ok(serverEmitter.includes('await collectionRef.doc(docId).create(payload)'));
assert.ok(clientEmitter.includes('buildAnswerlatticeSignalMemoryDedupKey'));
const driftSignalQuery = nightly.slice(
    nightly.indexOf('const signalsQuery = db'),
    nightly.indexOf('const [answersSnap, entitiesSnap, signalsSnap]'),
);
assert.ok(driftSignalQuery.includes(".where('pId', '==', 'AL')"));
assert.ok(driftSignalQuery.includes(".orderBy('timestamp', 'desc')"));
const signalMutation = nightly.slice(
    nightly.indexOf('async function runSignalMutation('),
    nightly.indexOf('async function resolveUnresolvedSignals('),
);
assert.ok(signalMutation.includes(".where('pId', '==', 'AL')"));
const unresolvedResolution = nightly.slice(
    nightly.indexOf('async function resolveUnresolvedSignals('),
    nightly.indexOf('async function aggregateCoverageKPI('),
);
assert.ok(unresolvedResolution.includes(".where('pId', '==', 'AL')"));
const unresolvedEntityIndexQuery = unresolvedResolution.slice(
    unresolvedResolution.indexOf('.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)'),
    unresolvedResolution.indexOf("window: 'all'"),
);
assert.ok(
    unresolvedEntityIndexQuery.includes(".where('pId', '==', 'AL')"),
    'unresolved-signal entity matching must use only the Answerlattice product index',
);
const mutationImpact = nightly.slice(
    nightly.indexOf('async function countMutationImpactSignals('),
    nightly.indexOf('async function trackMutationImpact('),
);
assert.ok(mutationImpact.includes(".where('pId', '==', 'AL')"));
const supportBoardSignals = supportBoardSync.slice(
    supportBoardSync.indexOf('async function loadSupportBoardSourceDocs('),
    supportBoardSync.indexOf('async function upsertSupportBoardCards('),
);
assert.ok(
    (supportBoardSignals.match(/\.where\('pId', '==', PRODUCT_ID\)/g) || []).length >= 2,
    'support-board history and signal windows must each be product-partitioned',
);
const resolutionSignals = resolutionExtractor.slice(
    resolutionExtractor.indexOf('async function gatherTicketResolutionClusters('),
    resolutionExtractor.indexOf('async function getExistingCanonicalAnswerIds('),
);
assert.ok(resolutionSignals.includes(".where('pId', '==', ANSWERLATTICE_PRODUCT_ID)"));
const draftSignals = draftGenerator.slice(
    draftGenerator.indexOf('async function getSignalExamples('),
    draftGenerator.indexOf('async function getExistingAnswerSummaries('),
);
assert.ok(draftSignals.includes(".where('pId', '==', 'AL')"));
assert.ok(clientEmitter.includes('dedupKey: signal.persistentDedupKey'));
assert.ok(serverEmitter.includes('dedupKey: cleanSignalText(params.persistentDedupKey, 260)'));
assert.ok(clientEmitter.includes('answerlattice_signal_replay_conflict'));
assert.ok(clientEmitter.includes('AnswerlatticeSignalReplayConflictError'));
assert.ok(serverEmitter.includes('AnswerlatticeSignalReplayConflictError'));
assert.ok(clientEmitter.includes('sanitizeAnswerlatticeSignalMetadata'));
assert.ok(!clientEmitter.includes('return String(value);'));
assert.ok(clientEmitter.includes('metadata: sanitizedMetadata'));
assert.ok(!clientEmitter.includes('const sessionDedupKey = getDeduplicationKey(params);'));
assert.ok(clientEmitter.includes('resolutionEventId'));
assert.ok(signalDal.includes('answerlattice_signal_replay_conflict'));
assert.ok(signalDal.includes('buildAnswerlatticeSignalPayloadFingerprint'));
assert.ok(clientEmitter.includes('Promise<boolean>'));
assert.ok(publicSignalRoute.includes("request.headers.get('idempotency-key')"));
assert.ok(publicSignalRoute.includes('IDEMPOTENCY_KEY_CONFLICT'));
assert.ok(publicSignalRoute.includes('IDEMPOTENCY_REPLAY_CONFLICT'));
assert.ok(publicSignalRoute.includes("failureMode: 'throw'"));
assert.ok(publicSignalRoute.includes('SIGNAL_PERSISTENCE_UNAVAILABLE'));
assert.ok(signalDal.includes("where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)"));
assert.ok(signalDal.includes('MAX_BATCH_SIGNAL_ENTITIES = 300'));
assert.ok(signalDal.includes('const existingSnapshot = await getDoc(signalRef)'));
assert.ok(signalDal.includes("getAnswerlatticeRetentionExpiryMillis('signalEvents')"));
assert.ok(serverEmitter.includes("getAnswerlatticeRetentionExpiryMillis('signalEvents', now.getTime())"));
assert.equal(
    fs.readFileSync(path.join(ROOT, 'src/data/shared/answerlatticeRetention.ts'), 'utf8'),
    fs.readFileSync(path.join(ROOT, 'functions-answerlattice/src/sharedData/answerlatticeRetention.ts'), 'utf8'),
    'app and Functions retention policy must stay byte-identical',
);

for (const indexFile of ['firestore-answerlattice.indexes.json', 'firestore.indexes.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, indexFile), 'utf8')) as { indexes: Array<any>; fieldOverrides: Array<any> };
    const indexes = manifest.indexes;
    const signalIndexes = indexes.filter((entry) => entry.collectionGroup === 'answerlattice_signalEvents');
    assert.ok(signalIndexes.some((entry) => (
        entry.fields.map((field: any) => field.fieldPath).join(',') === 'pId,tId,sId,timestamp'
        && entry.fields[3].order === 'DESCENDING'
    )), `${indexFile} must include the product-scoped recent-signal index`);
    assert.ok(signalIndexes.some((entry) => (
        entry.fields.map((field: any) => field.fieldPath).join(',') === 'pId,tId,sId,entityId,timestamp'
    )), `${indexFile} must include the product-scoped entity-signal index`);
    const entitySearchIndexes = indexes.filter((entry) => entry.collectionGroup === 'answerlattice_entitySearchIndex');
    assert.ok(entitySearchIndexes.some((entry) => (
        entry.fields.map((field: any) => field.fieldPath).join(',') === 'pId,tId,sId'
    )), `${indexFile} must include the product-scoped entity-search index`);
    assert.ok(manifest.fieldOverrides.some((entry) => (
        entry.collectionGroup === 'answerlattice_signalEvents'
        && entry.fieldPath === 'expiresAt'
        && entry.ttl === true
    )), `${indexFile} must enable signal-event TTL`);
}

console.log('Answerlattice signal identity and query contracts passed.');
