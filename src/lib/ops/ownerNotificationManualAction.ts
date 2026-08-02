import type {
  OwnerNotificationChannel,
  OwnerNotificationProductId,
} from '@data/shared/ownerNotificationRegistry';
import { projectOwnerNotificationPersistedEvent } from '@data/shared/ownerNotificationDeliveryBoundary';
import { createHash } from 'crypto';

export type OwnerNotificationManualSendIdentity = {
  actionId: string;
  channel: OwnerNotificationChannel;
  destination: string;
  eventId: string;
  productId: OwnerNotificationProductId;
  reason?: string;
};

export function buildOwnerNotificationManualSendFingerprint(
  identity: OwnerNotificationManualSendIdentity,
): string {
  return createHash('sha256')
    .update(JSON.stringify([
      identity.productId,
      identity.eventId,
      identity.actionId,
      identity.channel,
      identity.destination,
      identity.reason || null,
    ]))
    .digest('hex');
}

export function isMatchingOwnerNotificationManualSendEvent(params: {
  expected: OwnerNotificationManualSendIdentity;
  persisted: unknown;
}): boolean {
  const event = projectOwnerNotificationPersistedEvent(
    params.persisted,
    params.expected.productId,
  );
  if (!event) return false;

  const requestedChannels = event.requestedChannels;
  const hints = event.recipientHints;
  const expectedDestination = params.expected.destination;
  const destinationMatches = params.expected.channel === 'email'
    ? hints?.email === expectedDestination && hints.whatsappNumber === undefined
    : hints?.whatsappNumber === expectedDestination && hints.email === undefined;

  return event.referenceId === `manual-${params.expected.eventId}-${params.expected.actionId}`
    && requestedChannels?.length === 1
    && requestedChannels[0] === params.expected.channel
    && destinationMatches
    && event.metadata.manualRecipientOverride === true
    && event.metadata.originalEventId === params.expected.eventId
    && event.metadata.manualActionFingerprint
      === buildOwnerNotificationManualSendFingerprint(params.expected);
}
