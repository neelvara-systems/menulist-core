#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { projectTicketNotification } from '../../src/lib/notifications/ticketNotificationBoundary';
import { resolveNotificationTemplate } from '../../src/lib/notifications/templates';
import type { SupportTicketType } from '../../src/types/supportTicket';

const timestamp = Timestamp.fromMillis(1_800_000_000_000);
const ticket: SupportTicketType = {
    category: 'General Question',
    clientDetails: {
        email: ' Owner@Example.com ',
        phone: '',
        storeName: 'Owner & Co',
        tenantName: 'Tenant',
    },
    displayId: 'TICKET',
    documents: [],
    id: 'ticket-1',
    message: '',
    messages: [{
        id: 'message-1',
        sender: { email: 'support@example.com', id: 'support-1', name: '<Support>' },
        text: '<img src=x onerror=alert(1)> & resolved',
        timestamp,
        type: 'user',
    }],
    platformNotes: '',
    platformTags: [],
    priority: 'Normal',
    statuses: [{
        createdBy: { email: 'support@example.com', id: 'support-1', name: 'Support' },
        remark: '<b>Resolved</b> & safe',
        status: 'Resolved',
        timestamp,
    }],
    status: 'Resolved',
    subject: 'Help <needed>\r\nBcc: attacker@example.com',
};

const created = projectTicketNotification({ eventType: 'TICKET_CREATED', ticket });
if (!created.ok) throw new Error('created notification projection failed');
assert.equal(created.ok, true);
assert.equal(created.payload.recipientEmail, 'owner@example.com');
assert.equal(created.payload.referenceId, 'ticket-created-ticket-1');
assert.equal('skipDedup' in created.payload, false);

const reply = projectTicketNotification({ eventType: 'TICKET_REPLY', messageId: 'message-1', ticket });
if (!reply.ok) throw new Error('reply notification projection failed');
assert.equal(reply.ok, true);
assert.equal(reply.payload.referenceId, 'ticket-reply-ticket-1-message-1');
assert.equal(reply.payload.metadata.replyPreview, '<img src=x onerror=alert(1)> & resolved');

const status = projectTicketNotification({ eventType: 'TICKET_STATUS_CHANGED', ticket });
const statusReplay = projectTicketNotification({ eventType: 'TICKET_STATUS_CHANGED', ticket });
if (!status.ok) throw new Error('status notification projection failed');
assert.equal(status.ok, true);
assert.deepEqual(statusReplay, status, 'status notification identity must not depend on request time');
assert.equal(status.payload.referenceId, 'ticket-status-ticket-1-1-Resolved');

assert.equal(projectTicketNotification({ eventType: 'TICKET_REPLY', ticket }).ok, false);
assert.equal(projectTicketNotification({ eventType: 'TICKET_REPLY', messageId: 'missing', ticket }).ok, false);
assert.equal(projectTicketNotification({
    eventType: 'TICKET_REPLY',
    messageId: 'message-1',
    ticket: {
        ...ticket,
        messages: [{ ...ticket.messages![0], sender: { ...ticket.messages![0].sender, email: 'owner@example.com' } }],
    },
}).ok, false, 'the ticket creator must not receive a notification for their own reply');
assert.equal(projectTicketNotification({
    eventType: 'TICKET_CREATED',
    ticket: { ...ticket, clientDetails: { ...ticket.clientDetails!, email: 'not-an-email' } },
}).ok, false);

const rendered = resolveNotificationTemplate(reply.payload.eventType, {
    ...reply.payload.metadata,
    recipientName: reply.payload.recipientName,
    ticketUrl: 'javascript:alert(1)',
});
assert.ok(rendered);
assert.ok(!rendered!.html.includes('<img src=x'));
assert.ok(rendered!.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(rendered!.html.includes('Owner &amp; Co'));
assert.ok(!rendered!.html.includes('javascript:alert'));
assert.ok(!rendered!.subject.includes('\r'));
assert.ok(!rendered!.subject.includes('\n'));

process.stdout.write('Ticket notification projection and template tests passed.\n');
