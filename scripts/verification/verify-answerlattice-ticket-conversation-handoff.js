#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireText = (source, token, label) => assert.ok(source.includes(token), `${label}: missing ${token}`);
const forbidText = (source, token, label) => assert.ok(!source.includes(token), `${label}: forbidden ${token}`);

const lifecycle = read('src/lib/answerlattice/supportTicketLifecycle.ts');
const attachmentBoundary = read('src/lib/answerlattice/supportTicketAttachmentBoundary.ts');
const ticketTypes = read('src/types/supportTicket.ts');
const ticketDal = read('src/database/tickets/index.ts');
const notificationRoute = read('src/app/api/notifications/send/route.ts');
const widgetEscalation = read('src/lib/answerlattice/widgetEscalationServer.ts');
const chatDal = read('src/database/chatSessions/index.ts');
const dedicatedRules = read('firestore-answerlattice.rules');
const sharedRules = read('firestore.rules');
const dedicatedStorage = read('storage-answerlattice.rules');
const sharedStorage = read('storage.rules');
const platformQueue = read('src/components/templates/platform/supportTickets/PlatformTicketsView.tsx');
const analytics = read('src/components/templates/platform/supportTickets/AnalyticsView.tsx');
const exportConfig = read('src/components/templates/platform/supportTickets/exportConfig.ts');
const ticketActions = read('src/components/templates/platform/supportTickets/TicketActions.tsx');
const ticketDetail = read('src/components/templates/platform/supportTickets/TicketDetailView.tsx');

requireText(lifecycle, 'ANSWERLATTICE_TICKET_MESSAGE_LIMIT = 50', 'ticket message limit');
requireText(lifecycle, 'ANSWERLATTICE_TICKET_STATUS_HISTORY_LIMIT = 25', 'ticket status limit');
requireText(
  lifecycle,
  'ANSWERLATTICE_TICKET_DOCUMENT_LIMIT = ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT',
  'ticket document limit',
);
requireText(lifecycle, 'ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES', 'ticket persisted attachment size');
requireText(attachmentBoundary, 'ANSWERLATTICE_TICKET_ATTACHMENT_LIMIT = 4', 'ticket upload count');
requireText(attachmentBoundary, 'ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024', 'ticket upload size');
for (const [label, rules] of [['dedicated rules', dedicatedRules], ['shared rules', sharedRules]]) {
  requireText(rules, 'answerlatticeSupportTicketMessageCount(data) <= 50', label);
  requireText(rules, 'answerlatticeSupportTicketStatusCount(data) <= 25', label);
  requireText(rules, "data.documents.size() <= 4", label);
  requireText(rules, 'answerlatticeSupportTicketMessagesAppendOne', label);
  requireText(rules, 'answerlatticeSupportTicketStatusesAppendOne', label);
}

for (const token of [
  'session: scope,',
  'mutationContext.scope,',
  'runTransaction(answerlatticeFirebaseClient',
  'if (transactionResult.statusChanged)',
  'recipientEmail !== actor.email',
  'isPlatformTicketAdminSession',
]) requireText(ticketDal, token, 'ticket DAL');

for (const token of [
  'getFirstSupportTicketResponse',
  'calculateSupportTicketSLAStatus',
  'firstResponseMillis',
  'resolutionMillis',
]) requireText(ticketTypes, token, 'ticket SLA contract');
for (const [label, source] of [
  ['platform queue', platformQueue],
  ['ticket analytics', analytics],
  ['ticket export', exportConfig],
]) {
  requireText(source, 'calculateSupportTicketSLAStatus', label);
  forbidText(source, 'messages.length > 1', label);
}
for (const [label, source] of [
  ['ticket actions', ticketActions],
  ['ticket detail', ticketDetail],
]) requireText(source, 'getSupportTicketAttachmentDownloadUrl({', label);

for (const token of [
  'ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT',
  'tenantId: parsed.data.tId',
  'storeId: parsed.data.sId',
  'parseAnswerlatticeSupportTicketDocument({',
  'sendNotification(projection.payload)',
]) requireText(notificationRoute, token, 'notification route');

for (const token of [
  'transaction.create(ticketRef, ticket)',
  'transaction.set(historyRef, historyUpdate, { merge: true })',
  'widgetEscalation?.searchHistoryId !== searchHistoryId',
]) requireText(widgetEscalation, token, 'widget handoff');

for (const token of [
  "deferPersistedChatImageCleanup(imageUrls, 'session_delete')",
  'storageFilesDeleted: 0',
]) requireText(chatDal, token, 'shared chat-image retention');

for (const [label, rules] of [['dedicated storage', dedicatedStorage], ['shared storage', sharedStorage]]) {
  requireText(rules, 'isPlatformSupport()', label);
  requireText(rules, 'supportTickets/documents/{tId}/{sId}/{fileId}', label);
  requireText(rules, 'supportTickets/messages/{tId}/{sId}/{fileId}', label);
}

const docs = [
  '__docs__/answerlattice/ticket-system/README.md',
  '__docs__/answerlattice/ticket-system/ticket-system_spec.md',
  '__docs__/answerlattice/ticket-system/ticket-system_impl.md',
  '__docs__/answerlattice/ticket-system/ticket-system_firebase.md',
  '__docs__/answerlattice/ticket-system/ticket-system_helpdoc.md',
  '__docs__/answerlattice/ticket-system/ticket-system_mobile-support.md',
  '__docs__/answerlattice/ticket-system/ticket-system_marketing.md',
  '__docs__/answerlattice/ticket-system/ticket-system_website.md',
  '__docs__/answerlattice/ticket-system/ticket-system_test-cases.md',
  '__docs__/answerlattice/email-notifications/README.md',
  '__docs__/answerlattice/email-notifications/email-notifications_spec.md',
  '__docs__/answerlattice/email-notifications/email-notifications_impl.md',
  '__docs__/answerlattice/email-notifications/email-notifications_firebase.md',
].map(read).join('\n');

for (const token of [
  '50 messages',
  '25 status',
  'four',
  'outbound only',
  'not a contractual',
  'not approved product truth',
  'reply-by-email',
]) requireText(docs, token, 'Feature 21 documentation');
for (const token of [
  'MenuList\'s ticket system',
  '500 maximum',
  '200 maximum',
]) forbidText(docs, token, 'Feature 21 documentation');

process.stdout.write('Answerlattice ticket, conversation, handoff, and email boundary verified.\n');
