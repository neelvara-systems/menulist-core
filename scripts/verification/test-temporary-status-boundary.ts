import assert from 'node:assert/strict';
import { readTempStatusResponse } from '@lib/tempStatus/clientResponse';
import { isTempStatusMutationScopeCurrent } from '@lib/tempStatus/serverMutationScope';
import {
    getActiveTempStatus,
    normalizeTempStatusCustomMessage,
    normalizeTempStatusMessage,
    normalizeTempStatusType,
} from '@lib/tempStatus/statusBoundary';
import {
    getTempStatusDraftIssue,
    getTempStatusDraftIssueMessage,
} from '@lib/tempStatus/draftValidation';
import { buildTempStatusSchema } from '@lib/schema';
import {
    fromNativeDateTimeInputValue,
    toNativeDateTimeInputValue,
} from '@util/dateTime';

const now = new Date('2026-07-16T20:00:00.000Z');
const future = '2026-07-18T00:00:00.000Z';

const kolkataExpiry = fromNativeDateTimeInputValue('2026-08-15T22:00', 'Asia/Kolkata');
assert.equal(kolkataExpiry, '2026-08-15T16:30:00.000Z');
assert.equal(toNativeDateTimeInputValue(kolkataExpiry, 'Asia/Kolkata'), '2026-08-15T22:00');

assert.equal(normalizeTempStatusType('closed_today'), 'closed_today');
assert.equal(normalizeTempStatusType('unknown'), null);
assert.equal(normalizeTempStatusMessage('custom', '  Private\n event  '), 'Private event');
assert.equal(normalizeTempStatusMessage('opening_late', undefined), 'Opening late today');
assert.equal(normalizeTempStatusMessage('custom', 'x'.repeat(120)).length, 100);
assert.equal(normalizeTempStatusCustomMessage('\u200B\u202E\n'), '');

assert.equal(getTempStatusDraftIssue({
    customMessage: '',
    expiresAt: future,
    nowMs: now.getTime(),
    statusType: 'custom',
}), 'custom_message_required');
assert.equal(getTempStatusDraftIssue({
    customMessage: '\u200B\u202E',
    expiresAt: future,
    nowMs: now.getTime(),
    statusType: 'custom',
}), 'custom_message_required');
assert.equal(getTempStatusDraftIssue({
    customMessage: 'x'.repeat(101),
    expiresAt: future,
    nowMs: now.getTime(),
    statusType: 'custom',
}), 'custom_message_too_long');
assert.equal(getTempStatusDraftIssue({
    customMessage: '',
    expiresAt: '',
    nowMs: now.getTime(),
    statusType: 'closed_today',
}), 'expiry_required');
assert.equal(getTempStatusDraftIssue({
    customMessage: '',
    expiresAt: 'not-a-date',
    nowMs: now.getTime(),
    statusType: 'closed_today',
}), 'expiry_invalid');
assert.equal(getTempStatusDraftIssue({
    customMessage: '',
    expiresAt: now.toISOString(),
    nowMs: now.getTime(),
    statusType: 'closed_today',
}), 'expiry_not_future');
assert.equal(getTempStatusDraftIssue({
    customMessage: 'Private event',
    expiresAt: future,
    nowMs: now.getTime(),
    statusType: 'custom',
}), null);
assert.equal(getTempStatusDraftIssueMessage('custom_message_required'), 'Enter a custom message.');

assert.deepEqual(getActiveTempStatus({
    expiresAt: future,
    message: '  Closed\nfor maintenance  ',
    type: 'custom',
}, now.getTime()), {
    expiresAt: future,
    message: 'Closed for maintenance',
    type: 'custom',
});
assert.equal(getActiveTempStatus({ expiresAt: now.toISOString(), type: 'closed_today' }, now.getTime()), null);
assert.equal(getActiveTempStatus({ expiresAt: 'not-a-date', type: 'closed_today' }, now.getTime()), null);
assert.equal(getActiveTempStatus({ expiresAt: future, type: 'unknown' }, now.getTime()), null);
assert.equal(getActiveTempStatus(new Proxy({}, {
    get() {
        throw new Error('temporary-status proxy must remain contained');
    },
})), null);
assert.equal(getActiveTempStatus({
    expiresAt: future,
    get message() {
        throw new Error('temporary-status message getter must remain contained');
    },
    type: 'custom',
}, now.getTime())?.message, 'Temporary notice');

assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 11 },
    tenant: { active: true },
    tenantDocumentId: '11',
}), true);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 11, tId: '11' },
    tenant: { active: true },
    tenantDocumentId: '11',
}), true);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tId: 11 },
    tenant: { active: true },
    tenantDocumentId: '11',
}), true);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 12 },
    tenant: { active: true },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 11, tId: 12 },
    tenant: { active: true },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 11, tId: 'invalid' },
    tenant: { active: true },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: false, tenantId: 11 },
    tenant: { active: true },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: 'false', tenantId: 11 },
    tenant: { active: true },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, deleted: 'false', tenantId: 11 },
    tenant: { active: true },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 11 },
    tenant: { blocked: 'false' },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 11 },
    tenant: { blockDetails: { blocked: 'false' } },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: 11 },
    tenant: { blockDetails: { blocked: true } },
    tenantDocumentId: '11',
}), false);
assert.equal(isTempStatusMutationScopeCurrent({
    store: { active: true, tenantId: ' 11' },
    tenant: { active: true },
    tenantDocumentId: '11',
}), false);

assert.deepEqual(buildTempStatusSchema({
    expiresAt: future,
    message: 'Closed today',
    type: 'closed_today',
}, 'Asia/Kolkata', now), {
    '@type': 'OpeningHoursSpecification',
    closes: '00:00',
    description: 'Closed today',
    opens: '00:00',
    validFrom: '2026-07-17',
    validThrough: '2026-07-17',
});
assert.equal(buildTempStatusSchema({ expiresAt: future, type: 'kitchen_closed' }, 'UTC', now), undefined);
assert.equal(buildTempStatusSchema({ expiresAt: 'not-a-date', type: 'closed_today' }, 'UTC', now), undefined);
assert.equal(buildTempStatusSchema({ expiresAt: future, type: 'closed_today' }, 'Invalid/Timezone', now), undefined);

async function runResponseTests() {
    assert.deepEqual(
        await readTempStatusResponse(new Response(JSON.stringify({ effectsPending: true, success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
        }), 'set'),
        { effectsPending: true, success: true },
    );
    assert.deepEqual(
        await readTempStatusResponse(new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
        }), 'clear'),
        { effectsPending: false, success: true },
    );
}

void runResponseTests().then(() => {
    console.log('Temporary-status boundary tests passed.');
});
