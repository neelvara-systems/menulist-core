import assert from 'node:assert/strict';

import {
    normalizeSignalDeskDocumentId,
    SIGNALDESK_DOCUMENT_ID_MAX_LENGTH,
} from '../../src/lib/signaldesk/documentIdBoundary';
import { SignalDeskTargetImportSchema } from '../../src/lib/signaldesk/targetContracts';

assert.equal(normalizeSignalDeskDocumentId('content_source_1'), 'content_source_1');
assert.equal(normalizeSignalDeskDocumentId(' content_source_1'), null);
assert.equal(normalizeSignalDeskDocumentId('content_source_1 '), null);
assert.equal(normalizeSignalDeskDocumentId('sources/content_source_1'), null);
assert.equal(normalizeSignalDeskDocumentId('.'), null);
assert.equal(normalizeSignalDeskDocumentId('..'), null);
assert.equal(normalizeSignalDeskDocumentId('__reserved__'), null);
assert.equal(normalizeSignalDeskDocumentId('a'.repeat(SIGNALDESK_DOCUMENT_ID_MAX_LENGTH + 1)), null);
assert.equal(normalizeSignalDeskDocumentId('market_pod_1', 160), 'market_pod_1');

const targetImport = {
    idempotencyKey: 'document-id-boundary-import',
    rows: [{ displayName: 'Boundary Test Business' }],
    sourceName: 'Boundary test',
    sourcePolicyId: 'source_policy_1',
};
assert.equal(SignalDeskTargetImportSchema.safeParse(targetImport).success, true);
assert.equal(
    SignalDeskTargetImportSchema.safeParse({ ...targetImport, sourcePolicyId: ' source_policy_1' }).success,
    false,
);
assert.equal(
    SignalDeskTargetImportSchema.safeParse({ ...targetImport, sourcePolicyId: 'policies/source_policy_1' }).success,
    false,
);

process.stdout.write('SignalDesk document ID boundary tests passed.\n');
