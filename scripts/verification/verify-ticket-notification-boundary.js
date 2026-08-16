#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const route = read('src/app/api/notifications/send/route.ts');
const client = read('src/lib/notifications/client.ts');
const ticketDal = read('src/database/tickets/index.ts');
const sender = read('src/lib/notifications/index.ts');
const claim = read('src/lib/notifications/deliveryClaim.ts');
const projector = read('src/lib/notifications/ticketNotificationBoundary.ts');
const templates = read('src/lib/notifications/templates.ts');
const sharedIndexes = JSON.parse(read('firestore.indexes.json'));
const answerlatticeIndexes = JSON.parse(read('firestore-answerlattice.indexes.json'));

const requireText = (source, token, label) => assert.ok(source.includes(token), `${label}: missing ${token}`);
const forbidText = (source, token, label) => assert.ok(!source.includes(token), `${label}: forbidden ${token}`);

for (const token of [
  'failClosedOnProviderError: true',
  "rateLimitResult.reason === 'provider_unavailable'",
  'ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT',
  'normalizeAnswerlatticeSupportTicketId(parsed.data.ticketId)',
  'tenantId: parsed.data.tId',
  'storeId: parsed.data.sId',
  '.collection(DB_COLLECTIONS.SUPPORT_TICKETS)',
  'parseAnswerlatticeSupportTicketDocument({',
  'scope: {',
  'projectTicketNotification({',
  'sendNotification(projection.payload)',
]) requireText(route, token, 'notification route');
for (const token of ['recipientEmail:', 'referenceId:', 'metadata:', 'skipDedup', 'productId:']) {
  forbidText(route.slice(route.indexOf('const NotificationRequestSchema'), route.indexOf('export const POST')), token, 'public request schema');
}
forbidText(route, 'catch (err: any)', 'notification route error boundary');
requireText(client, "eventType: 'TICKET_CREATED' | 'TICKET_REPLY' | 'TICKET_STATUS_CHANGED';", 'client trigger contract');
requireText(client, 'tId: number;', 'client trigger tenant scope');
requireText(client, 'sId: number;', 'client trigger store scope');
for (const token of ['recipientEmail:', 'referenceId:', 'metadata?:', 'skipDedup?:']) forbidText(client, token, 'client trigger authority');
requireText(ticketDal, "eventType: 'TICKET_CREATED',\n                    ticketId: docRef.id", 'ticket-created trigger');
requireText(ticketDal, 'tId: submitData.tId', 'ticket-created trigger tenant scope');
requireText(ticketDal, "eventType: 'TICKET_REPLY',\n                    ticketId,\n                    messageId: persistedMessage.id", 'ticket-reply trigger');
requireText(ticketDal, 'tId: mutationContext.scope.tId', 'ticket-reply trigger tenant scope');
requireText(ticketDal, "eventType: 'TICKET_STATUS_CHANGED'", 'ticket-status trigger');
requireText(ticketDal, 'tId: mutationContext.scope.tId', 'ticket-status trigger tenant scope');
requireText(ticketDal, 'sId: mutationContext.scope.sId', 'ticket-status trigger store scope');
requireText(ticketDal, 'const updateData: UpdateData<DocumentData> = {', 'ticket update existing-document contract');
requireText(ticketDal, 'transaction.update(ticketRef, updateData);', 'ticket update existing-document contract');
forbidText(ticketDal, 'transaction.set(ticketRef, updateData, { merge: true });', 'ticket update existing-document contract');
for (const token of [
  'recipientEmail: data.clientDetails.email',
  'recipientEmail: notifyEmail',
  'skipDedup: true',
  'referenceId: `ticket-status-',
]) forbidText(ticketDal, token, 'ticket DAL client authority');

for (const token of [
  'recipientEmail = normalizeRecipientEmail(params.ticket.clientDetails?.email)',
  'referenceId: `ticket-created-${ticketId}`',
  'referenceId: `ticket-reply-${ticketId}-${messageId}`',
  'referenceId: `ticket-status-${ticketId}-${statuses.length}-${newStatus}`',
]) requireText(projector, token, 'server ticket projection');

for (const token of [
  'claimNotificationDelivery({',
  'if (!claim.claimed) return false;',
  'finalizeNotificationDelivery({',
  'productId: PRODUCT_IDS.ANSWERLATTICE',
  'if (productId === PRODUCT_IDS.MENULIST) {',
  'productId: PRODUCT_IDS.MENULIST',
  ".where('productId', '==', target.productId)",
  'connectionTimeout: 10_000',
  'greetingTimeout: 10_000',
  'socketTimeout: 15_000',
  '`<${getSafeLogId(eventType, referenceId)}@menulist.ai>`',
]) requireText(sender, token, 'notification sender');
forbidText(sender, 'productId: productId || PRODUCT_IDS.MENULIST', 'notification sender product isolation');
const hasIndex = (manifest, collectionGroup, fields) => manifest.indexes.some((index) => (
  index.collectionGroup === collectionGroup
  && fields.every((field, position) => index.fields[position]?.fieldPath === field)
));
assert.ok(
  hasIndex(answerlatticeIndexes, 'answerlattice_notificationLogs', ['productId', 'recipientEmail', 'status', 'createdAt']),
  'dedicated Answerlattice notification rate query requires the product-first composite index',
);
assert.ok(
  hasIndex(sharedIndexes, 'notificationLogs', ['productId', 'recipientEmail', 'status', 'createdAt']),
  'shared notification rate query requires the product-first composite index',
);
for (const token of ['runTransaction', "current.status === 'sent'", "current.status === 'sending'", 'current.claimId !== params.claimId']) {
  requireText(claim, token, 'delivery claim');
}
requireText(templates, 'function safeHtmlText', 'template HTML escape');
requireText(templates, 'function safeSubjectText', 'template subject safety');
requireText(templates, "return url.protocol === 'https:'", 'template URL allowlist');

for (const doc of [
  '__docs__/answerlattice/email-notifications/README.md',
  '__docs__/answerlattice/email-notifications/email-notifications_impl.md',
  '__docs__/answerlattice/email-notifications/email-notifications_firebase.md',
  '__docs__/audits/menulist-production-readiness-audit.md',
  '__docs__/changelog.md',
]) requireText(read(doc), 'ticket notification authority hardening', doc);

process.stdout.write('Ticket notification authority boundary verification passed.\n');
