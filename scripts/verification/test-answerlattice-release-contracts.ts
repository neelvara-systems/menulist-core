import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import {
    ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES,
    AnswerlatticeReleaseActionResultSchema,
    AnswerlatticeStoredReleaseSchema,
    normalizeAnswerlatticeVersionLabel,
    parseAnswerlatticeReleaseAction,
} from '../../src/lib/answerlattice/releaseContracts';

const validCreate = {
    action: 'create',
    requestId: 'release_request_123',
    versionLabel: '2.4.1',
    versionNormalized: 2_004_001,
    releasedAt: '2026-07-11T10:00:00.000Z',
    entityChanges: ['billing', 'invoices'],
};

assert.deepEqual(parseAnswerlatticeReleaseAction(validCreate), validCreate);
assert.deepEqual(normalizeAnswerlatticeVersionLabel('v2.4.1'), { label: '2.4.1', normalized: 2_004_001 });
assert.deepEqual(normalizeAnswerlatticeVersionLabel('2'), { label: '2', normalized: 2_000_000 });
assert.equal(normalizeAnswerlatticeVersionLabel('2.1000.1'), null);
assert.equal(normalizeAnswerlatticeVersionLabel('latest'), null);
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, extra: true }), null, 'unknown request fields must fail closed');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, entityChanges: ['billing', 'billing'] }), null, 'duplicate entity IDs must fail');
assert.equal(parseAnswerlatticeReleaseAction({
    ...validCreate,
    entityChanges: Array.from({ length: ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES + 1 }, (_, index) => `entity-${index}`),
}), null, 'release entity fan-out must be capped');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, releasedAt: 'not-a-date' }), null, 'release timestamps must be ISO dates');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, versionNormalized: 2_004_002 }), null, 'version labels and normalized versions must agree');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, versionLabel: 'v2.4.1' }), null, 'stored release labels must use canonical numeric form');
assert.equal(parseAnswerlatticeReleaseAction({ action: 'activate', requestId: 'activate_12345', releaseId: 'release/unsafe' }), null);
assert.deepEqual(parseAnswerlatticeReleaseAction({
    action: 'activate',
    requestId: 'activate_12345',
    releaseId: 'release_safe',
}), {
    action: 'activate',
    requestId: 'activate_12345',
    releaseId: 'release_safe',
});

const timestamp = Timestamp.fromMillis(1_700_000_000_000);
const stored = {
    pId: 'AL',
    tId: 1,
    sId: 101,
    versionLabel: '2.4.1',
    versionNormalized: 2_004_001,
    releasedAt: timestamp,
    entityChanges: ['billing'],
    status: 'pending',
    requestId: 'release_request_123',
    requestFingerprint: 'a'.repeat(64),
    createdOn: timestamp,
    createdBy: 'owner@example.com',
    modifiedOn: timestamp,
    modifiedBy: 'owner@example.com',
};
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse(stored).success, true);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, pId: 'ML' }).success, false);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, tId: '1' }).success, false);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, status: 'published' }).success, false);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, versionNormalized: 2_004_002 }).success, false);
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    success: true,
    action: 'activate',
    releaseId: 'release_safe',
    status: 'active',
    evaluatedAnswers: 2,
    driftedAnswers: 1,
    replayed: false,
}).success, true);

process.stdout.write('Answerlattice release contract tests passed.\n');
