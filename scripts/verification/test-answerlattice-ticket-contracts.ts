import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { Timestamp } from 'firebase/firestore';
import {
    ANSWERLATTICE_TICKET_DOCUMENT_LIMIT,
    ANSWERLATTICE_TICKET_MESSAGE_LIMIT,
    ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT,
    isAnswerlatticeTicketStatusTransitionAllowed,
    prepareAnswerlatticeTicketMessageForPersistence,
    parseAnswerlatticeSupportTicketDocument,
    parseAnswerlatticeTicketMutation,
} from '@lib/answerlattice/supportTicketLifecycle';
import { resolveAnswerlatticeSupportTicketActor } from '@lib/answerlattice/supportTicketActor';
import {
    calculateSupportTicketSLAStatus,
    getFirstSupportTicketResponse,
    getSupportTicketTimestampMillis,
} from '@type/supportTicket';

const ROOT = path.resolve(__dirname, '..', '..');
const NOW = Timestamp.fromMillis(1_700_000_000_000);
assert.deepEqual(resolveAnswerlatticeSupportTicketActor({
    uId: 123,
    user: { id: 'firebase-uid', name: 'Owner', email: 'OWNER@example.com' },
}), { id: '123', name: 'Owner', email: 'owner@example.com' });
assert.throws(() => resolveAnswerlatticeSupportTicketActor({
    user: { id: '', name: 'Owner', email: 'owner@example.com' },
}), /answerlattice_ticket_actor_invalid/);
const actor = { id: 'owner-1', name: 'Owner', email: 'owner@example.com' };
const persistedMessageWithoutAttachments = prepareAnswerlatticeTicketMessageForPersistence({
    id: 'message-with-optional-attachments',
    text: 'Reply',
    type: 'user',
    sender: actor,
    timestamp: NOW,
    attachments: undefined,
});
assert.equal(
    Object.prototype.hasOwnProperty.call(persistedMessageWithoutAttachments, 'attachments'),
    false,
    'optional attachment fields must not reach the Firestore web SDK as undefined',
);
const baseTicket = {
    pId: 'AL',
    tId: 1,
    sId: 101,
    subject: 'Billing question',
    status: 'Open',
    priority: 'Normal' as const,
    category: 'Billing Inquiry',
    message: 'Please help.',
    documents: [],
    platformNotes: '',
    platformTags: [],
    contextKeys: ['billing'],
    deleted: false,
    statuses: [{ status: 'Open', timestamp: NOW, createdBy: actor, remark: 'Created' }],
    messages: [],
};

const mutation = parseAnswerlatticeTicketMutation({
    id: 'ticket-1',
    status: 'In Progress',
    priority: 'High',
    messages: [{ forged: true }],
    pId: 'ML',
    tId: 999,
    sId: 999,
});
assert.deepEqual(mutation, { status: 'In Progress', priority: 'High' });
assert.throws(() => parseAnswerlatticeTicketMutation({ status: 'unknown' }));
assert.throws(() => parseAnswerlatticeTicketMutation({ platformNotes: 'x'.repeat(4001) }));
assert.equal(isAnswerlatticeTicketStatusTransitionAllowed('Open', 'Resolved'), true);
assert.equal(isAnswerlatticeTicketStatusTransitionAllowed('Open', 'Re-Opened'), false);
assert.equal(isAnswerlatticeTicketStatusTransitionAllowed('Closed', 'Re-Opened'), true);
assert.equal(isAnswerlatticeTicketStatusTransitionAllowed('Closed', 'Open'), false);
assert.equal(ANSWERLATTICE_TICKET_MESSAGE_LIMIT, 50);
assert.equal(ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT, 25);
assert.equal(ANSWERLATTICE_TICKET_DOCUMENT_LIMIT, 4);

const lateSla = calculateSupportTicketSLAStatus({
    ...baseTicket,
    createdOn: NOW,
    priority: 'High',
    messages: [{
        id: 'staff-reply',
        text: 'Reply',
        type: 'user',
        sender: { id: 'support-1', name: 'Support', email: 'support@example.com' },
        timestamp: Timestamp.fromMillis(NOW.toMillis() + (3 * 60 * 60 * 1000)),
    }],
    statuses: [
        ...baseTicket.statuses,
        {
            status: 'Resolved',
            timestamp: Timestamp.fromMillis(NOW.toMillis() + (25 * 60 * 60 * 1000)),
            createdBy: { id: 'support-1', name: 'Support', email: 'support@example.com' },
            remark: 'Resolved',
        },
    ],
    clientDetails: {
        storeName: 'Workspace',
        tenantName: 'Tenant',
        email: actor.email,
        phone: '',
    },
    uId: actor.id,
}, NOW.toMillis() + (26 * 60 * 60 * 1000));
assert.equal(lateSla?.responseStatus, 'breached');
assert.equal(lateSla?.resolutionStatus, 'breached');
assert.equal(getFirstSupportTicketResponse({
    clientDetails: {
        storeName: 'Workspace',
        tenantName: 'Tenant',
        email: actor.email,
        phone: '',
    },
    messages: [{
        id: 'staff-without-email',
        text: 'Reply',
        type: 'user',
        sender: { id: 'support-1', name: 'Support', email: '' },
        timestamp: NOW,
    }],
    uId: actor.id,
})?.id, 'staff-without-email');

assert.equal(
    getSupportTicketTimestampMillis({ seconds: 1_700_000_000, nanoseconds: 123_000_000 }),
    1_700_000_000_123,
);
assert.equal(getSupportTicketTimestampMillis({ seconds: 1.5 }), null);
assert.equal(getSupportTicketTimestampMillis({ seconds: 1, nanoseconds: 1_000_000_000 }), null);
assert.equal(getSupportTicketTimestampMillis({ toMillis: () => '1700000000000' }), null);
const hostileTimestamp = Object.defineProperty({}, 'toMillis', {
    get() {
        throw new Error('hostile timestamp getter');
    },
}) as Timestamp;
assert.equal(getSupportTicketTimestampMillis(hostileTimestamp), null);
assert.doesNotThrow(() => calculateSupportTicketSLAStatus({
    ...baseTicket,
    createdOn: hostileTimestamp,
}, NOW.toMillis()));
assert.equal(calculateSupportTicketSLAStatus({
    ...baseTicket,
    createdOn: hostileTimestamp,
}, NOW.toMillis()), null);

assert.ok(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: baseTicket,
    scope: { tId: 1, sId: 101 },
}));
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'malformed-client-details',
    value: {
        ...baseTicket,
        clientDetails: {
            storeName: { unsafe: true },
            tenantName: 'Tenant',
            email: actor.email,
            phone: '',
        },
    },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'malformed-platform-tags',
    value: {
        ...baseTicket,
        platformTags: ['Bug', { unsafe: true }],
    },
}), null);
assert.ok(parseAnswerlatticeSupportTicketDocument({
    id: 'server-escalation-ticket',
    value: {
        ...baseTicket,
        source: 'ai_escalation',
        knowledgeCandidate: true,
        escalationContext: {
            triggerTypes: ['explicit_user_request'],
            query: 'I still need help',
            escalatedAt: new Date(NOW.toMillis()).toISOString(),
        },
    },
}));
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'malformed-server-escalation-ticket',
    value: {
        ...baseTicket,
        source: 'ai_escalation',
        knowledgeCandidate: true,
        escalationContext: {
            triggerTypes: ['unsupported_trigger'],
            query: 'I still need help',
            escalatedAt: 'not-a-date',
        },
    },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'unowned-escalation-fields',
    value: {
        ...baseTicket,
        knowledgeCandidate: true,
    },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: { ...baseTicket, pId: 'ML' },
    scope: { tId: 1, sId: 101 },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: {
        ...baseTicket,
        documents: Array.from({ length: ANSWERLATTICE_TICKET_DOCUMENT_LIMIT + 1 }, (_, index) => ({
            name: `file-${index}.txt`,
            type: 'text/plain',
            size: 1,
            url: `https://firebasestorage.googleapis.com/file-${index}`,
        })),
    },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: {
        ...baseTicket,
        documents: [{
            name: '',
            type: 'text/plain',
            size: 1,
            url: 'https://firebasestorage.googleapis.com/file',
        }],
    },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: {
        ...baseTicket,
        documents: [{
            name: 'too-large.txt',
            type: 'text/plain',
            size: (10 * 1024 * 1024) + 1,
            url: 'https://firebasestorage.googleapis.com/file',
        }],
    },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: baseTicket,
    scope: { tId: 2, sId: 202 },
}), null);
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: {
        ...baseTicket,
        messages: Array.from({ length: ANSWERLATTICE_TICKET_MESSAGE_LIMIT + 1 }, (_, index) => ({
            id: `message-${index}`,
            text: 'Reply',
            type: 'user',
            sender: actor,
            timestamp: NOW,
        })),
    },
}), null);

const ticketDal = fs.readFileSync(path.join(ROOT, 'src/database/tickets/index.ts'), 'utf8');
assert.ok(ticketDal.includes('runTransaction(answerlatticeFirebaseClient'), 'ticket mutations must use transactions');
assert.ok(ticketDal.includes("where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)"), 'ticket queries must filter the Answerlattice product');
assert.ok(ticketDal.includes('session: scope,'), 'ticket uploads must use the verified target ticket scope');
assert.ok(ticketDal.includes('mutationContext.scope,'), 'ticket reply uploads must preserve the target ticket scope');
assert.ok(ticketDal.includes('if (transactionResult.statusChanged)'), 'all effective status mutations must trigger notification centrally');
assert.ok(ticketDal.includes('answerlattice_ticket_server_escalation_fields_forbidden'), 'browser ticket creation must reject server-owned escalation fields');
assert.ok(!ticketDal.includes("data.source === 'ai_escalation'"), 'browser ticket creation must not choose escalation signal authority');
assert.ok(ticketDal.includes('recipientEmail !== actor.email'), 'customer self-replies must not trigger a support-reply notification');
assert.ok(!ticketDal.includes('const updatedMessages = [...currentMessages, message]'), 'ticket replies must not rebuild from caller state');
assert.ok(!ticketDal.includes('const updatedStatuses = [...currentStatuses'), 'ticket statuses must not rebuild from caller state');
assert.ok(!ticketDal.includes('updateTicket = async (data: any)'), 'ticket updates must keep a typed caller boundary');
assert.ok(!ticketDal.includes('attachments?: any[]'), 'ticket attachments must enter through the runtime-validated unknown boundary');
assert.ok(!ticketDal.includes('_currentStatuses: any[]'), 'legacy ticket status snapshots must not weaken the mutation boundary');
assert.ok(!ticketDal.includes('uploadedUrl: any'), 'ticket storage results must preserve the upload helper return contract');

for (const indexFile of ['firestore-answerlattice.indexes.json', 'firestore.indexes.json']) {
    const indexes = JSON.parse(fs.readFileSync(path.join(ROOT, indexFile), 'utf8')).indexes as Array<any>;
    const supportIndexes = indexes.filter((entry) => entry.collectionGroup === 'supportTickets');
    assert.ok(supportIndexes.some((entry) => {
        const fields = entry.fields.map((field: any) => field.fieldPath).join(',');
        return fields === 'pId,tId,sId,deleted,createdOn';
    }), `${indexFile} must include the scoped active/deleted ticket index`);
    assert.ok(supportIndexes.some((entry) => {
        const fields = entry.fields.map((field: any) => field.fieldPath).join(',');
        return fields === 'pId,deleted,createdOn';
    }), `${indexFile} must include the platform active/deleted ticket index`);
}

console.log('Answerlattice ticket lifecycle contracts passed.');
