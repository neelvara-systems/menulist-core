#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '@constant/database';
import {
    ANSWERLATTICE_WORKSPACE_ERASURE_COLLECTIONS,
    ANSWERLATTICE_WORKSPACE_RETAINED_COLLECTIONS,
    answerlatticeWorkspaceLifecycleRequestSchema,
    canRecoverAnswerlatticeWorkspace,
    canStartAnswerlatticeWorkspaceErasure,
    classifyAnswerlatticeWorkspaceRecord,
    getAnswerlatticeWorkspaceCloseConfirmation,
    getAnswerlatticeWorkspaceEraseAfterMillis,
    getAnswerlatticeWorkspaceEraseConfirmation,
    getAnswerlatticeWorkspaceRecoverConfirmation,
    hasExactAnswerlatticeProductIdentity,
    hasExactAnswerlatticeWorkspaceScope,
    isAnswerlatticeWorkspaceBillingActivationAllowed,
    isExactAnswerlatticeWorkspaceConfirmation,
} from '@lib/answerlattice/workspaceLifecycleContracts';

const scope = { tId: 17, sId: 29 };
const closeConfirmation = getAnswerlatticeWorkspaceCloseConfirmation(scope);
const recoverConfirmation = getAnswerlatticeWorkspaceRecoverConfirmation(scope);
const eraseConfirmation = getAnswerlatticeWorkspaceEraseConfirmation(scope);

assert.equal(closeConfirmation, 'AL:17:29:CLOSE');
assert.equal(recoverConfirmation, 'AL:17:29:RECOVER');
assert.equal(eraseConfirmation, 'AL:17:29:ERASE');
assert.equal(isExactAnswerlatticeWorkspaceConfirmation(closeConfirmation, closeConfirmation), true);
assert.equal(isExactAnswerlatticeWorkspaceConfirmation('AL:17:29:close', closeConfirmation), false);
assert.equal(isExactAnswerlatticeWorkspaceConfirmation('AL:17:30:CLOSE', closeConfirmation), false);

assert.equal(hasExactAnswerlatticeProductIdentity({ pId: 'AL' }), true);
assert.equal(hasExactAnswerlatticeProductIdentity({ productId: 'AL' }), true);
assert.equal(hasExactAnswerlatticeProductIdentity({ pId: 'AL', productId: 'ML' }), false);
assert.equal(hasExactAnswerlatticeProductIdentity({}), false);

assert.equal(hasExactAnswerlatticeWorkspaceScope({
    tId: 17,
    tenantId: 17,
    sId: 29,
    storeId: 29,
}, scope), true);
assert.equal(hasExactAnswerlatticeWorkspaceScope({
    tId: '17',
    sId: '29',
}, scope), true);
assert.equal(hasExactAnswerlatticeWorkspaceScope({
    tId: 17,
    tenantId: 18,
    sId: 29,
}, scope), false);

assert.equal(isAnswerlatticeWorkspaceBillingActivationAllowed({
    active: true,
}), true);
assert.equal(isAnswerlatticeWorkspaceBillingActivationAllowed({
    active: true,
    answerlatticeWorkspaceLifecycle: { state: 'active' },
}), true);
for (const state of ['closing', 'closed', 'erasing', 'erased', 'unknown']) {
    assert.equal(isAnswerlatticeWorkspaceBillingActivationAllowed({
        active: state === 'unknown',
        answerlatticeWorkspaceLifecycle: { state },
    }), false, `${state} workspace must reject billing activation`);
}
assert.equal(isAnswerlatticeWorkspaceBillingActivationAllowed({
    active: false,
    answerlatticeWorkspaceLifecycle: { state: 'active' },
}), false);
assert.equal(hasExactAnswerlatticeWorkspaceScope({
    tId: 17,
    sId: 30,
}, scope), false);

assert.equal(classifyAnswerlatticeWorkspaceRecord({
    pId: 'AL',
    tId: 17,
    sId: 29,
}, scope, 'required'), 'exact');
assert.equal(classifyAnswerlatticeWorkspaceRecord({
    tId: 17,
    sId: 29,
}, scope, 'required'), 'ambiguous');
assert.equal(classifyAnswerlatticeWorkspaceRecord({
    pId: 'ML',
    tId: 17,
    sId: 29,
}, scope, 'required'), 'ambiguous');
assert.equal(classifyAnswerlatticeWorkspaceRecord({
    pId: 'AL',
    tId: 17,
    sId: 30,
}, scope, 'required'), 'foreign');
assert.equal(classifyAnswerlatticeWorkspaceRecord({
    pId: 'ML',
    tId: 17,
    sId: 29,
}, scope, 'dedicated'), 'foreign');

const closeRequest = answerlatticeWorkspaceLifecycleRequestSchema.parse({
    action: 'close',
    confirmation: closeConfirmation,
    reason: 'Owner verified workspace closure request.',
    ...scope,
});
assert.equal(closeRequest.action, 'close');
assert.equal(answerlatticeWorkspaceLifecycleRequestSchema.safeParse({
    action: 'close',
    confirmation: closeConfirmation,
    reason: 'short',
    ...scope,
}).success, false);
assert.equal(answerlatticeWorkspaceLifecycleRequestSchema.safeParse({
    action: 'start_erasure',
    billingReview: 'resolved',
    confirmation: eraseConfirmation,
    exportDecision: 'completed',
    reason: 'Verified permanent erasure request.',
    retainedEvidenceAcknowledged: false,
    ...scope,
}).success, false);

const closedAt = Date.UTC(2026, 6, 1);
const eraseAfter = getAnswerlatticeWorkspaceEraseAfterMillis(closedAt);
assert.equal(canRecoverAnswerlatticeWorkspace({
    eraseAfterMillis: eraseAfter,
    nowMillis: eraseAfter - 1,
    state: 'closed',
}), true);
assert.equal(canRecoverAnswerlatticeWorkspace({
    eraseAfterMillis: eraseAfter,
    nowMillis: eraseAfter,
    state: 'closed',
}), false);
assert.equal(canRecoverAnswerlatticeWorkspace({
    eraseAfterMillis: eraseAfter,
    nowMillis: eraseAfter - 1,
    state: 'erasing',
}), false);

assert.deepEqual(canStartAnswerlatticeWorkspaceErasure({
    activeSubscription: false,
    billingReview: 'resolved',
    eraseAfterMillis: eraseAfter,
    exportDecision: 'waived',
    legalHold: false,
    nowMillis: eraseAfter,
    retainedEvidenceAcknowledged: true,
    state: 'closed',
}), { allowed: true });
assert.equal(canStartAnswerlatticeWorkspaceErasure({
    activeSubscription: true,
    billingReview: 'resolved',
    eraseAfterMillis: eraseAfter,
    exportDecision: 'waived',
    legalHold: false,
    nowMillis: eraseAfter,
    retainedEvidenceAcknowledged: true,
    state: 'closed',
}).reason, 'ACTIVE_SUBSCRIPTION');
assert.equal(canStartAnswerlatticeWorkspaceErasure({
    activeSubscription: false,
    billingReview: 'resolved',
    eraseAfterMillis: eraseAfter,
    exportDecision: 'waived',
    legalHold: true,
    nowMillis: eraseAfter,
    retainedEvidenceAcknowledged: true,
    state: 'closed',
}).reason, 'LEGAL_HOLD_ACTIVE');

const deletionCollections = new Set(
    ANSWERLATTICE_WORKSPACE_ERASURE_COLLECTIONS.map(({ collection }) => collection),
);
assert.equal(deletionCollections.size, ANSWERLATTICE_WORKSPACE_ERASURE_COLLECTIONS.length);
assert.equal(deletionCollections.has(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS), true);
assert.equal(deletionCollections.has(DB_COLLECTIONS.SUPPORT_TICKETS), true);
assert.equal(deletionCollections.has(DB_COLLECTIONS.SUBSCRIPTIONS), false);
assert.equal(deletionCollections.has(DB_COLLECTIONS.PAYMENT_TRANSACTIONS), false);
assert.equal(ANSWERLATTICE_WORKSPACE_RETAINED_COLLECTIONS.includes(DB_COLLECTIONS.SUBSCRIPTIONS), true);
assert.equal(ANSWERLATTICE_WORKSPACE_RETAINED_COLLECTIONS.includes(DB_COLLECTIONS.PAYMENT_TRANSACTIONS), true);

process.stdout.write('Answerlattice workspace lifecycle contract tests passed.\n');
