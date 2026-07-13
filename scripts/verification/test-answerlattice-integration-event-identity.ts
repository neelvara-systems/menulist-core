import assert from 'assert';
import {
    buildIntegrationEventDocumentId,
    buildIntegrationEventFingerprint,
} from '../../functions-answerlattice/src/integrations/eventIdentity';

const first = buildIntegrationEventDocumentId({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    deduplicationKey: 'run-1:nightly_summary',
});
assert.ok(first?.startsWith('integration_'));
assert.equal(first, buildIntegrationEventDocumentId({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    deduplicationKey: 'run-1:nightly_summary',
}));
assert.notEqual(first, buildIntegrationEventDocumentId({
    tId: 1,
    sId: 3,
    eventType: 'nightly_summary',
    deduplicationKey: 'run-1:nightly_summary',
}));
assert.equal(buildIntegrationEventDocumentId({ tId: 0, sId: 2, eventType: 'nightly_summary', deduplicationKey: 'y' }), null);
assert.equal(buildIntegrationEventDocumentId({ tId: 1, sId: 2, eventType: 'unknown', deduplicationKey: 'y' }), null);
assert.equal(buildIntegrationEventDocumentId({ tId: 1, sId: 2, eventType: 'nightly_summary', deduplicationKey: '' }), null);

const fingerprint = buildIntegrationEventFingerprint({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    severity: 'low',
    payload: { coverageRate: 0.8, errors: ['none'] },
});
assert.ok(fingerprint);
assert.equal(fingerprint, buildIntegrationEventFingerprint({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    severity: 'low',
    payload: { errors: ['none'], coverageRate: 0.8 },
}));
assert.notEqual(fingerprint, buildIntegrationEventFingerprint({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    severity: 'low',
    payload: { coverageRate: 0.7, errors: ['none'] },
}));
assert.equal(buildIntegrationEventFingerprint({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    severity: 'low',
    payload: { nested: { secret: 'not allowed' } },
}), null);
const unsafePayload = Object.create(null) as Record<string, unknown>;
unsafePayload.__proto__ = 'not allowed';
assert.equal(buildIntegrationEventFingerprint({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    severity: 'low',
    payload: unsafePayload,
}), null);
assert.equal(buildIntegrationEventFingerprint({
    tId: 1,
    sId: 2,
    eventType: 'nightly_summary',
    severity: 'low',
    payload: { errors: ['1', '2', '3', '4', '5', '6'] },
}), null);

console.log('Answerlattice integration event identity contracts passed.');
