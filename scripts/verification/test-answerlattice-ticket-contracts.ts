import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { Timestamp } from 'firebase/firestore';
import {
    isAnswerlatticeTicketStatusTransitionAllowed,
    parseAnswerlatticeSupportTicketDocument,
    parseAnswerlatticeTicketMutation,
} from '@lib/answerlattice/supportTicketLifecycle';

const ROOT = path.resolve(__dirname, '..', '..');
const NOW = Timestamp.fromMillis(1_700_000_000_000);
const actor = { id: 'owner-1', name: 'Owner', email: 'owner@example.com' };
const baseTicket = {
    pId: 'AL',
    tId: 1,
    sId: 101,
    subject: 'Billing question',
    status: 'Open',
    priority: 'Normal',
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

assert.ok(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: baseTicket,
    scope: { tId: 1, sId: 101 },
}));
assert.equal(parseAnswerlatticeSupportTicketDocument({
    id: 'ticket-1',
    value: { ...baseTicket, pId: 'ML' },
    scope: { tId: 1, sId: 101 },
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
        messages: Array.from({ length: 501 }, (_, index) => ({
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
assert.ok(!ticketDal.includes('const updatedMessages = [...currentMessages, message]'), 'ticket replies must not rebuild from caller state');
assert.ok(!ticketDal.includes('const updatedStatuses = [...currentStatuses'), 'ticket statuses must not rebuild from caller state');

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

