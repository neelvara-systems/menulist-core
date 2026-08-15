import * as crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import {
  WHATSAPP_OS_LIMITS,
  type WhatsAppOsProviderStatus,
  shouldAdvanceWhatsAppOsProviderStatus,
} from '../sharedData/whatsappOs';

type ProviderStatusEvent = {
  providerMessageId: string;
  status: WhatsAppOsProviderStatus;
  occurredAt: Timestamp;
};

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseStatus(value: unknown): WhatsAppOsProviderStatus | null {
  return value === 'sent' || value === 'delivered' || value === 'read' || value === 'failed'
    ? value
    : null;
}

function parseTimestamp(value: unknown): Timestamp | null {
  if (typeof value !== 'string' || !/^\d{1,12}$/.test(value)) return null;
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return null;
  const millis = seconds * 1_000;
  const now = Date.now();
  return millis >= Date.UTC(2020, 0, 1) && millis <= now + 86_400_000
    ? Timestamp.fromMillis(millis)
    : null;
}

function parseProviderStatusEvents(body: unknown): ProviderStatusEvent[] {
  if (!isRecord(body) || body.object !== 'whatsapp_business_account') return [];
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const events: ProviderStatusEvent[] = [];
  for (const rawEntry of entries) {
    if (!isRecord(rawEntry)) continue;
    const changes = Array.isArray(rawEntry.changes) ? rawEntry.changes : [];
    for (const rawChange of changes) {
      if (!isRecord(rawChange) || rawChange.field !== 'messages' || !isRecord(rawChange.value)) continue;
      const statuses = Array.isArray(rawChange.value.statuses) ? rawChange.value.statuses : [];
      for (const rawStatus of statuses) {
        if (!isRecord(rawStatus)) continue;
        const providerMessageId = typeof rawStatus.id === 'string' ? rawStatus.id.trim() : '';
        const status = parseStatus(rawStatus.status);
        const occurredAt = parseTimestamp(rawStatus.timestamp);
        if (
          !providerMessageId
          || providerMessageId.length > WHATSAPP_OS_LIMITS.MAX_PROVIDER_MESSAGE_ID_LENGTH
          || /[\u0000-\u001f\u007f]/.test(providerMessageId)
          || !status
          || !occurredAt
        ) continue;
        events.push({ providerMessageId, status, occurredAt });
        if (events.length > 100) throw new Error('WHATSAPP_OS_WEBHOOK_STATUS_LIMIT_EXCEEDED');
      }
    }
  }
  return events;
}

function getOwnerRef(
  workflow: unknown,
  ownerDocumentId: unknown,
): FirebaseFirestore.DocumentReference | null {
  if (typeof ownerDocumentId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(ownerDocumentId)) {
    return null;
  }
  if (workflow === 'owner_notification') {
    return firestoreAdmin.collection(DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES).doc(ownerDocumentId);
  }
  if (workflow === 'phone_otp') {
    return firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_CHALLENGES).doc(ownerDocumentId);
  }
  return null;
}

async function persistStatusEvent(event: ProviderStatusEvent): Promise<void> {
  const providerMessageIdHash = sha256(event.providerMessageId);
  const receiptId = sha256(`${providerMessageIdHash}\0${event.status}\0${event.occurredAt.toMillis()}`);
  const receiptRef = firestoreAdmin.collection(DB_COLLECTIONS.WHATSAPP_OS_WEBHOOK_RECEIPTS).doc(receiptId);
  const mappingRef = firestoreAdmin.collection(DB_COLLECTIONS.WHATSAPP_OS_MESSAGE_REFS).doc(providerMessageIdHash);
  const expiresAt = Timestamp.fromMillis(
    Date.now() + WHATSAPP_OS_LIMITS.PROVIDER_RECORD_RETENTION_DAYS * 86_400_000,
  );

  await firestoreAdmin.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptRef);
    const mapping = await transaction.get(mappingRef);
    if (receipt.exists) return;

    const currentStatus = mapping.get('providerStatus');
    const currentOccurredAt = mapping.get('statusOccurredAt');
    const currentOccurredAtMillis = typeof currentOccurredAt?.toMillis === 'function'
      ? currentOccurredAt.toMillis()
      : 0;
    const shouldAdvance = mapping.exists
      && (currentStatus === 'accepted' || currentStatus === 'sent' || currentStatus === 'delivered'
        || currentStatus === 'read' || currentStatus === 'failed')
      && shouldAdvanceWhatsAppOsProviderStatus(
        currentStatus,
        event.status,
        currentOccurredAtMillis,
        event.occurredAt.toMillis(),
      );
    const ownerRef = mapping.exists
      ? getOwnerRef(mapping.get('workflow'), mapping.get('ownerDocumentId'))
      : null;
    const now = Timestamp.now();

    transaction.create(receiptRef, {
      providerMessageIdHash,
      providerStatus: event.status,
      statusOccurredAt: event.occurredAt,
      resolved: mapping.exists,
      createdAt: now,
      expiresAt,
    });
    if (!mapping.exists) {
      transaction.create(mappingRef, {
        providerMessageIdHash,
        providerStatus: event.status,
        statusOccurredAt: event.occurredAt,
        unresolved: true,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      });
      return;
    }
    if (!shouldAdvance) return;
    transaction.set(mappingRef, {
      providerStatus: event.status,
      statusOccurredAt: event.occurredAt,
      updatedAt: now,
    }, { merge: true });
    if (ownerRef) {
      transaction.set(ownerRef, {
        providerStatus: event.status,
        providerStatusAt: event.occurredAt,
      }, { merge: true });
    }
  });
}

export async function persistWhatsAppOsProviderStatuses(body: unknown): Promise<number> {
  const events = parseProviderStatusEvents(body);
  for (const event of events) await persistStatusEvent(event);
  return events.length;
}
