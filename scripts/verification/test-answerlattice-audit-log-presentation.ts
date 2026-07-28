#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    formatAnswerlatticeAuditTimestamp,
    getAnswerlatticeAuditStateSummary,
} from '../../src/lib/answerlattice/auditLogPresentation';

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
