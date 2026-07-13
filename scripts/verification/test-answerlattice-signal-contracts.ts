import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
    buildAnswerlatticeSignalDocumentId,
    hashAnswerlatticeSignalIdentity,
    normalizeExactAnswerlatticeSignalScopeId,
} from '@lib/answerlattice/signalIdentity';

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
assert.equal(hashAnswerlatticeSignalIdentity('same'), hashAnswerlatticeSignalIdentity('same'));
assert.equal(normalizeExactAnswerlatticeSignalScopeId(1), 1);
assert.equal(normalizeExactAnswerlatticeSignalScopeId(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
for (const value of ['1', '01', '1e0', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, true, null]) {
    assert.equal(normalizeExactAnswerlatticeSignalScopeId(value), null);
}

const emitter = fs.readFileSync(path.join(ROOT, 'src/lib/answerlattice/signalEmitter.ts'), 'utf8');
const publicSignalRoute = fs.readFileSync(path.join(ROOT, 'src/app/api/answerlattice/public/v1/signals/route.ts'), 'utf8');
const signalDal = fs.readFileSync(path.join(ROOT, 'src/database/answerlattice/signalEvents.ts'), 'utf8');
assert.ok(emitter.includes('buildAnswerlatticeSignalDocumentId'));
assert.ok(emitter.includes('dedupKey: persistentDedupKey'));
assert.ok(emitter.includes('Promise<boolean>'));
assert.ok(publicSignalRoute.includes("request.headers.get('idempotency-key')"));
assert.ok(publicSignalRoute.includes('SIGNAL_PERSISTENCE_UNAVAILABLE'));
assert.ok(signalDal.includes("where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)"));
assert.ok(signalDal.includes('MAX_BATCH_SIGNAL_ENTITIES = 300'));
assert.ok(signalDal.includes('const existingSnapshot = await getDoc(signalRef)'));
assert.ok(signalDal.includes("getAnswerlatticeRetentionExpiryMillis('signalEvents')"));
assert.ok(emitter.includes("getAnswerlatticeRetentionExpiryMillis('signalEvents', now.getTime())"));
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
    assert.ok(manifest.fieldOverrides.some((entry) => (
        entry.collectionGroup === 'answerlattice_signalEvents'
        && entry.fieldPath === 'expiresAt'
        && entry.ttl === true
    )), `${indexFile} must enable signal-event TTL`);
}

console.log('Answerlattice signal identity and query contracts passed.');
