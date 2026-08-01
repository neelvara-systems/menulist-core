#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import {
    formatAnswerlatticeAuditTimestamp,
    getAnswerlatticeAuditStateSummary,
    parseAnswerlatticeAuditLog,
} from '../../src/lib/answerlattice/auditLogPresentation';

const storedAuditLog = {
    pId: 'AL',
    tId: 1,
    sId: 101,
    action: 'entity_candidate_review_note',
    entityType: 'entityCandidate',
    entityId: 'candidate_1',
    performedBy: 'owner-1',
    timestamp: Timestamp.fromMillis(1_700_000_000_000),
    newState: { status: 'reviewed' },
};

assert.deepEqual(
    parseAnswerlatticeAuditLog('audit_1', storedAuditLog, { tId: 1, sId: 101 }),
    { id: 'audit_1', ...storedAuditLog },
);
assert.equal(
    parseAnswerlatticeAuditLog('audit_1', { ...storedAuditLog, sId: 202 }, { tId: 1, sId: 101 }),
    null,
);
assert.equal(
    parseAnswerlatticeAuditLog('audit_1', { ...storedAuditLog, performedBy: { forged: true } }, { tId: 1, sId: 101 }),
    null,
);
assert.equal(
    parseAnswerlatticeAuditLog('audit_1', { ...storedAuditLog, timestamp: new Date() }, { tId: 1, sId: 101 }),
    null,
);

assert.notEqual(formatAnswerlatticeAuditTimestamp(new Date('2026-07-26T10:00:00Z')), 'Unknown');
assert.equal(formatAnswerlatticeAuditTimestamp('not-a-date'), 'Unknown');
assert.equal(formatAnswerlatticeAuditTimestamp({
    get toDate() {
        throw new Error('timestamp getter must be contained');
    },
}), 'Unknown');
assert.equal(formatAnswerlatticeAuditTimestamp({
    toDate() {
        throw new Error('timestamp conversion must be contained');
    },
}), 'Unknown');

assert.equal(getAnswerlatticeAuditStateSummary({ reason: ' Reviewed evidence ' }), 'Reviewed evidence');
assert.equal(
    getAnswerlatticeAuditStateSummary({ driftClasses: ['content', 42, 'scope'] }),
    'Classes: content, scope',
);
assert.equal(getAnswerlatticeAuditStateSummary({ mutationType: 'content_refinement' }), 'Type: content_refinement');
assert.equal(getAnswerlatticeAuditStateSummary({
    get reason() {
        throw new Error('state getter must be contained');
    },
}), '');

console.log('Answerlattice audit-log presentation tests passed');
