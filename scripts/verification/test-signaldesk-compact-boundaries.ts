#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    SignalDeskAiCriticOutputSchema,
    readSignalDeskAiResponseText,
} from '../../src/lib/signaldesk/aiProvider';
import {
    parseSignalDeskTargetImportCsv,
    SIGNALDESK_IMPORT_CSV_COLUMNS,
} from '../../src/lib/signaldesk/csvImport';

const header = SIGNALDESK_IMPORT_CSV_COLUMNS.join(',');
const validRows = parseSignalDeskTargetImportCsv([
    header,
    'Boundary Cafe,restaurant,Pune,India,https://example.com,OWNER@EXAMPLE.COM,+919876543210,https://example.com/menu,boundary.cafe,owner-consent-2026',
].join('\n'));
assert.equal(validRows.length, 1);
assert.equal(validRows[0].email, 'owner@example.com');
assert.equal(validRows[0].phone, '+919876543210');
assert.equal(validRows[0].instagram, 'boundary.cafe');

for (const invalidRow of [
    'Bad Website,restaurant,Pune,India,javascript:alert(1),owner@example.com,+919876543210,https://example.com/menu,boundary.cafe,owner-consent-2026',
    'Bad Email,restaurant,Pune,India,https://example.com,not-an-email,+919876543210,https://example.com/menu,boundary.cafe,owner-consent-2026',
    'Bad Phone,restaurant,Pune,India,https://example.com,owner@example.com,9876543210,https://example.com/menu,boundary.cafe,owner-consent-2026',
    'Bad Handle,restaurant,Pune,India,https://example.com,owner@example.com,+919876543210,https://example.com/menu,@Boundary Cafe,owner-consent-2026',
]) {
    assert.throws(
        () => parseSignalDeskTargetImportCsv(`${header}\n${invalidRow}`),
        /SIGNALDESK_IMPORT_CSV_INVALID:Row 2 contains an invalid target value/,
    );
}

const revisedOutput = {
    confidence: 'medium',
    nextAction: 'review',
    reasons: ['Corrected using supplied evidence.'],
    rejectedFacts: [],
};
const criticBase = {
    confidence: 'medium',
    reasons: ['Review needed.'],
    rejectedFacts: [],
};
assert.equal(
    SignalDeskAiCriticOutputSchema.safeParse({
        ...criticBase,
        verdict: 'revise',
        revisedOutput,
    }).success,
    true,
);
assert.equal(
    SignalDeskAiCriticOutputSchema.safeParse({ ...criticBase, verdict: 'revise' }).success,
    false,
    'A revise verdict must not be accepted without its replacement output',
);
assert.equal(
    SignalDeskAiCriticOutputSchema.safeParse({
        ...criticBase,
        verdict: 'pass',
        revisedOutput,
    }).success,
    false,
    'A pass verdict must not smuggle an unused replacement output',
);

assert.equal(readSignalDeskAiResponseText({ text: '{"ok":true}' }), '{"ok":true}');
assert.equal(readSignalDeskAiResponseText({ text: 41 }), '');
assert.equal(readSignalDeskAiResponseText({
    get text() {
        throw new Error('getter must stay contained');
    },
}), '');

console.log('SignalDesk compact boundary verification passed.');
