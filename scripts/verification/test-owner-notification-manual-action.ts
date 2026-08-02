#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import {
  buildOwnerNotificationManualSendFingerprint,
  isMatchingOwnerNotificationManualSendEvent,
  type OwnerNotificationManualSendIdentity,
} from '../../src/lib/ops/ownerNotificationManualAction';

const expected: OwnerNotificationManualSendIdentity = {
  actionId: 'action-123',
  channel: 'email',
  destination: 'owner@example.com',
  eventId: 'original-event-123',
  productId: 'ML',
  reason: 'Owner requested a manual retry',
};
const now = Timestamp.fromMillis(1_800_000_000_000);
const persisted = {
  productId: 'ML',
  triggerType: 'SUBSCRIPTION_PAYMENT_FAILED',
  tenantId: '11',
  storeId: '22',
  referenceId: 'manual-original-event-123-action-123',
  dedupeKey: 'ML|SUBSCRIPTION_PAYMENT_FAILED|11|22|manual-original-event-123-action-123',
  recipientRole: 'billing_owner',
  requestedChannels: ['email'],
  recipientHints: { email: 'owner@example.com' },
  metadata: {
    manualRecipientOverride: true,
    originalEventId: 'original-event-123',
    manualActionFingerprint: buildOwnerNotificationManualSendFingerprint(expected),
  },
  priority: 'required',
  status: 'pending',
  source: {
    runtime: 'next',
    path: 'src/app/api/ops/owner-notifications/route.ts:manualSend',
  },
  createdAt: now,
  updatedAt: now,
};

assert.equal(isMatchingOwnerNotificationManualSendEvent({ expected, persisted }), true);
for (const changed of [
  { ...expected, actionId: 'action-456' },
  { ...expected, channel: 'whatsapp' as const, destination: '919999999999' },
  { ...expected, destination: 'other@example.com' },
  { ...expected, eventId: 'another-event-123' },
  { ...expected, productId: 'AL' as const },
  { ...expected, reason: 'Different reason' },
]) {
  assert.equal(
    isMatchingOwnerNotificationManualSendEvent({ expected: changed, persisted }),
    false,
    'an action ID replay must bind every manual-send effect dimension',
  );
}
for (const malformed of [
  { ...persisted, requestedChannels: ['email', 'whatsapp'] },
  { ...persisted, recipientHints: { email: 'other@example.com' } },
  { ...persisted, metadata: { ...persisted.metadata, manualRecipientOverride: false } },
  { ...persisted, metadata: { ...persisted.metadata, manualActionFingerprint: 'bad' } },
  { ...persisted, dedupeKey: 'forged' },
]) {
  assert.equal(isMatchingOwnerNotificationManualSendEvent({ expected, persisted: malformed }), false);
}

process.stdout.write('Owner notification manual action tests passed.\n');
