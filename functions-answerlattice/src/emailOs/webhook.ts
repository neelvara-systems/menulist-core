import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Request, Response } from 'express';
import * as logger from 'firebase-functions/logger';
import { Resend } from 'resend';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    EMAIL_OS_LIMITS,
    EMAIL_OS_DELIVERY_STATUS_PRECEDENCE,
    EmailOsDeliveryStatus,
    buildEmailOsProviderIdentityHash,
    buildEmailOsRecipientHash,
    normalizeEmailOsProviderEvent,
    shouldAdvanceEmailOsDeliveryStatus,
} from '../sharedData/emailOs';

type RawBodyRequest = Request & { rawBody?: Buffer };
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

function isDeliveryStatus(value: unknown): value is EmailOsDeliveryStatus {
    return typeof value === 'string' && value in EMAIL_OS_DELIVERY_STATUS_PRECEDENCE;
}

function readHeader(request: Request, name: string): string | null {
    const value = request.header(name);
    return value && value.length <= EMAIL_OS_LIMITS.MAX_PROVIDER_EVENT_ID_LENGTH ? value : null;
}

export async function handleAnswerlatticeEmailOsWebhook(request: RawBodyRequest, response: Response): Promise<void> {
    if (request.method !== 'POST') {
        response.set('Allow', 'POST').status(405).send('Method not allowed');
        return;
    }
    // Keep signed outcome reconciliation active during an outbound-send pause.
    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_EMAIL_OS) {
        response.status(503).send('Email provider not active');
        return;
    }

    const secret = process.env.ANSWERLATTICE_RESEND_WEBHOOK_SECRET?.trim();
    const eventId = readHeader(request, 'svix-id');
    const timestamp = readHeader(request, 'svix-timestamp');
    const signature = readHeader(request, 'svix-signature');
    const rawBody = request.rawBody;
    if (!secret || !eventId || !timestamp || !signature || !rawBody) {
        response.status(400).send('Invalid webhook');
        return;
    }
    if (rawBody.length > EMAIL_OS_LIMITS.MAX_PROVIDER_EVENT_BODY_BYTES) {
        response.status(413).send('Webhook too large');
        return;
    }

    let event;
    try {
        const verified = new Resend().webhooks.verify({
            payload: rawBody.toString('utf8'),
            headers: { id: eventId, timestamp, signature },
            webhookSecret: secret,
        });
        event = normalizeEmailOsProviderEvent(verified, eventId);
    } catch {
        response.status(400).send('Invalid webhook');
        return;
    }

    const receiptId = sha256(event.providerEventId);
    const occurredAtMillis = Date.parse(event.occurredAt);
    const expiresAt = Timestamp.fromMillis(Date.now() + EMAIL_OS_LIMITS.RETENTION_DAYS * 86_400_000);
    let duplicate = false;

    await firestoreAdmin.runTransaction(async (transaction) => {
        const receiptRef = firestoreAdmin.collection(DB_COLLECTIONS.EMAIL_OS_WEBHOOK_RECEIPTS).doc(receiptId);
        const receipt = await transaction.get(receiptRef);
        if (receipt.exists) {
            duplicate = true;
            return;
        }

        let deliveryUpdate: { ref: FirebaseFirestore.DocumentReference; fields: Record<string, unknown> } | null = null;
        if (event.providerMessageId && event.deliveryStatus) {
            const providerMessageIdHash = buildEmailOsProviderIdentityHash(event.providerMessageId, sha256);
            let delivery: FirebaseFirestore.DocumentSnapshot | undefined;
            if (event.localDeliveryId) {
                const directMatch = await transaction.get(
                    firestoreAdmin.collection(DB_COLLECTIONS.EMAIL_OS_DELIVERIES).doc(event.localDeliveryId),
                );
                if (directMatch.exists && directMatch.get('productCode') === 'AL') delivery = directMatch;
            }
            if (!delivery) {
                const query = firestoreAdmin.collection(DB_COLLECTIONS.EMAIL_OS_DELIVERIES)
                    .where('providerMessageIdHash', '==', providerMessageIdHash)
                    .limit(1);
                const matches = await transaction.get(query);
                delivery = matches.docs[0];
            }
            if (delivery?.exists) {
                const currentStatus = delivery.get('status');
                const currentOccurredAt = delivery.get('statusOccurredAt');
                const currentMillis = typeof currentOccurredAt?.toMillis === 'function' ? currentOccurredAt.toMillis() : 0;
                if (
                    isDeliveryStatus(currentStatus)
                    && shouldAdvanceEmailOsDeliveryStatus(currentStatus, event.deliveryStatus, currentMillis, occurredAtMillis)
                ) {
                    deliveryUpdate = {
                        ref: delivery.ref,
                        fields: {
                            providerMessageId: event.providerMessageId,
                            providerMessageIdHash,
                            status: event.deliveryStatus,
                            statusOccurredAt: Timestamp.fromMillis(occurredAtMillis),
                            lastProviderEventType: event.eventType,
                            updatedAt: FieldValue.serverTimestamp(),
                        },
                    };
                }
            }
        }

        transaction.create(receiptRef, {
            provider: event.provider,
            eventType: event.eventType,
            providerEventIdHash: receiptId,
            providerMessageIdHash: event.providerMessageId
                ? buildEmailOsProviderIdentityHash(event.providerMessageId, sha256)
                : null,
            receivedAt: FieldValue.serverTimestamp(),
            expiresAt,
        });
        if (deliveryUpdate) transaction.set(deliveryUpdate.ref, deliveryUpdate.fields, { merge: true });

        if (event.recipient && event.suppressionAction) {
            const recipientHash = buildEmailOsRecipientHash('AL', event.recipient, sha256);
            const suppressionRef = firestoreAdmin.collection(DB_COLLECTIONS.EMAIL_OS_SUPPRESSIONS).doc(recipientHash);
            transaction.set(suppressionRef, {
                active: event.suppressionAction === 'activate',
                reason: event.suppressionReason,
                recipientHash,
                sourceEventType: event.eventType,
                sourceProviderMessageIdHash: event.providerMessageId
                    ? buildEmailOsProviderIdentityHash(event.providerMessageId, sha256)
                    : null,
                updatedAt: FieldValue.serverTimestamp(),
                expiresAt: event.suppressionAction === 'activate' ? FieldValue.delete() : expiresAt,
            }, { merge: true });
        }
    });

    logger.info('[EmailOS] Answerlattice provider event accepted', {
        duplicate,
        eventType: event.eventType,
        providerMessageIdPresent: Boolean(event.providerMessageId),
    });
    response.status(200).json({ accepted: true, duplicate });
}
