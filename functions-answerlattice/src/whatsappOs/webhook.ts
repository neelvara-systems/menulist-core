import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    WHATSAPP_OS_LIMITS,
    type WhatsAppOsProviderStatus,
    shouldAdvanceWhatsAppOsProviderStatus,
} from '../sharedData/whatsappOs';

type RawBodyRequest = Request & { rawBody?: Buffer };
type ProviderStatusEvent = { providerMessageId: string; status: WhatsAppOsProviderStatus; occurredAt: Timestamp };
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function readSecret(name: 'ANSWERLATTICE_WHATSAPP_APP_SECRET' | 'ANSWERLATTICE_WHATSAPP_VERIFY_TOKEN'): string {
    return process.env[name]?.trim() || '';
}

function verifySignature(request: RawBodyRequest): boolean {
    const secret = readSecret('ANSWERLATTICE_WHATSAPP_APP_SECRET');
    const signature = request.header('x-hub-signature-256') || '';
    const rawBody = request.rawBody;
    if (!secret || !rawBody || rawBody.length > WHATSAPP_OS_LIMITS.MAX_WEBHOOK_BODY_BYTES || !signature.startsWith('sha256=')) return false;
    const supplied = signature.slice(7);
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
    return timingSafeEqual(Buffer.from(supplied.toLowerCase(), 'hex'), Buffer.from(expected, 'hex'));
}

function parseEvents(body: unknown): ProviderStatusEvent[] {
    if (!isRecord(body) || body.object !== 'whatsapp_business_account') return [];
    const events: ProviderStatusEvent[] = [];
    for (const entry of Array.isArray(body.entry) ? body.entry : []) {
        if (!isRecord(entry)) continue;
        for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
            if (!isRecord(change) || change.field !== 'messages' || !isRecord(change.value)) continue;
            for (const item of Array.isArray(change.value.statuses) ? change.value.statuses : []) {
                if (!isRecord(item)) continue;
                const providerMessageId = typeof item.id === 'string' ? item.id.trim() : '';
                const status = item.status === 'sent' || item.status === 'delivered' || item.status === 'read' || item.status === 'failed' ? item.status : null;
                const seconds = typeof item.timestamp === 'string' && /^\d{1,12}$/.test(item.timestamp) ? Number(item.timestamp) : 0;
                const millis = seconds * 1_000;
                if (!providerMessageId || providerMessageId.length > WHATSAPP_OS_LIMITS.MAX_PROVIDER_MESSAGE_ID_LENGTH || /[\u0000-\u001f\u007f]/.test(providerMessageId) || !status || !Number.isSafeInteger(seconds) || millis < Date.UTC(2020, 0, 1) || millis > Date.now() + 86_400_000) continue;
                events.push({ providerMessageId, status, occurredAt: Timestamp.fromMillis(millis) });
                if (events.length > 100) throw new Error('WHATSAPP_OS_WEBHOOK_STATUS_LIMIT_EXCEEDED');
            }
        }
    }
    return events;
}

async function persistEvent(event: ProviderStatusEvent): Promise<void> {
    const providerMessageIdHash = sha256(event.providerMessageId);
    const receiptId = sha256(`${providerMessageIdHash}\0${event.status}\0${event.occurredAt.toMillis()}`);
    const receiptRef = firestoreAdmin.collection(DB_COLLECTIONS.WHATSAPP_OS_WEBHOOK_RECEIPTS).doc(receiptId);
    const mappingRef = firestoreAdmin.collection(DB_COLLECTIONS.WHATSAPP_OS_MESSAGE_REFS).doc(providerMessageIdHash);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const receipt = await transaction.get(receiptRef);
        const mapping = await transaction.get(mappingRef);
        if (receipt.exists) return;
        const current = mapping.get('providerStatus');
        const currentOccurredAt = mapping.get('statusOccurredAt');
        const currentOccurredAtMillis = typeof currentOccurredAt?.toMillis === 'function'
            ? currentOccurredAt.toMillis()
            : 0;
        const advance = mapping.exists
            && (current === 'accepted' || current === 'sent' || current === 'delivered' || current === 'read' || current === 'failed')
            && shouldAdvanceWhatsAppOsProviderStatus(
                current,
                event.status,
                currentOccurredAtMillis,
                event.occurredAt.toMillis(),
            );
        const now = Timestamp.now();
        transaction.create(receiptRef, {
            providerMessageIdHash,
            providerStatus: event.status,
            statusOccurredAt: event.occurredAt,
            resolved: mapping.exists,
            createdAt: now,
            expiresAt: Timestamp.fromMillis(now.toMillis() + WHATSAPP_OS_LIMITS.PROVIDER_RECORD_RETENTION_DAYS * 86_400_000),
        });
        if (!mapping.exists) {
            transaction.create(mappingRef, {
                providerMessageIdHash,
                providerStatus: event.status,
                statusOccurredAt: event.occurredAt,
                unresolved: true,
                createdAt: now,
                updatedAt: now,
                expiresAt: Timestamp.fromMillis(now.toMillis() + WHATSAPP_OS_LIMITS.PROVIDER_RECORD_RETENTION_DAYS * 86_400_000),
            });
            return;
        }
        if (!advance) return;
        transaction.set(mappingRef, { providerStatus: event.status, statusOccurredAt: event.occurredAt, updatedAt: now }, { merge: true });
        const ownerDocumentId = mapping.get('ownerDocumentId');
        if (mapping.get('workflow') === 'owner_notification' && typeof ownerDocumentId === 'string') {
            transaction.set(firestoreAdmin.collection(DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES).doc(ownerDocumentId), {
                providerStatus: event.status,
                providerStatusAt: event.occurredAt,
            }, { merge: true });
        }
    });
}

export async function handleAnswerlatticeWhatsAppOsWebhook(request: RawBodyRequest, response: Response): Promise<void> {
    // Verification and signed status reconciliation must continue while sends
    // are paused, otherwise accepted messages can never reach terminal state.
    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_WHATSAPP_OS) {
        response.status(503).send('WhatsApp provider not active');
        return;
    }
    if (request.method === 'GET') {
        const token = typeof request.query['hub.verify_token'] === 'string' ? request.query['hub.verify_token'] : '';
        const challenge = typeof request.query['hub.challenge'] === 'string' ? request.query['hub.challenge'] : '';
        const mode = request.query['hub.mode'];
        if (mode === 'subscribe' && challenge && token && token === readSecret('ANSWERLATTICE_WHATSAPP_VERIFY_TOKEN')) {
            response.status(200).send(challenge);
            return;
        }
        response.status(403).send('Forbidden');
        return;
    }
    if (request.method !== 'POST') {
        response.set('Allow', 'GET, POST').status(405).send('Method not allowed');
        return;
    }
    if (!verifySignature(request)) {
        response.status(400).send('Invalid webhook');
        return;
    }
    const events = parseEvents(request.body);
    for (const event of events) await persistEvent(event);
    response.status(200).send('OK');
}
