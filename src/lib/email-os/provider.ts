import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { createHash } from 'node:crypto';
import { DocumentReference, FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import {
    EMAIL_OS_LIMITS,
    EMAIL_OS_DELIVERY_STATUS_PRECEDENCE,
    EMAIL_OS_DELIVERY_TAG_NAME,
    EMAIL_OS_PROVIDER,
    EmailOsDeliveryStatus,
    EmailOsEnvelope,
    EmailOsProviderResult,
    assertEmailOsEnvelope,
    assertEmailOsSenderDomain,
    buildEmailOsIdempotencyKey,
    buildEmailOsProviderIdentityHash,
    buildEmailOsRecipientHash,
    shouldAdvanceEmailOsDeliveryStatus,
} from '../../data/shared/emailOs';

type RuntimeConfig = {
    db: Firestore;
    deliveries: string;
    suppressions: string;
    apiKey: string;
    allowedFromDomain: string;
};

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

function configurationRejected(code: string): EmailOsProviderResult {
    return {
        accepted: false,
        provider: EMAIL_OS_PROVIDER,
        status: 'configuration_rejected',
        retryable: false,
        ambiguous: false,
        errorCode: code,
    };
}

function isDeliveryStatus(value: unknown): value is EmailOsDeliveryStatus {
    return typeof value === 'string' && value in EMAIL_OS_DELIVERY_STATUS_PRECEDENCE;
}

function existingDeliveryResult(data: Record<string, unknown>): EmailOsProviderResult {
    const status = isDeliveryStatus(data.status) ? data.status : 'outcome_unknown';
    const providerMessageId = typeof data.providerMessageId === 'string' ? data.providerMessageId : undefined;
    return {
        accepted: Boolean(providerMessageId),
        provider: EMAIL_OS_PROVIDER,
        providerMessageId,
        status,
        retryable: data.retryable === true,
        ambiguous: data.ambiguous === true || status === 'queued' || status === 'outcome_unknown',
        errorCode: typeof data.errorCode === 'string' ? data.errorCode : 'EMAIL_OS_DELIVERY_ALREADY_CLAIMED',
    };
}

async function advanceDeliveryStatus(
    runtime: RuntimeConfig,
    deliveryRef: DocumentReference,
    nextStatus: EmailOsDeliveryStatus,
    fields: Record<string, unknown>,
): Promise<void> {
    const nextOccurredAtMillis = Date.now();
    await runtime.db.runTransaction(async (transaction) => {
        const current = await transaction.get(deliveryRef);
        const currentStatus = current.get('status');
        const currentOccurredAt = current.get('statusOccurredAt');
        const currentOccurredAtMillis = typeof currentOccurredAt?.toMillis === 'function' ? currentOccurredAt.toMillis() : 0;
        if (
            current.exists
            && isDeliveryStatus(currentStatus)
            && !shouldAdvanceEmailOsDeliveryStatus(
                currentStatus,
                nextStatus,
                currentOccurredAtMillis,
                nextOccurredAtMillis,
            )
        ) return;
        transaction.set(deliveryRef, {
            ...fields,
            status: nextStatus,
            statusOccurredAt: Timestamp.fromMillis(nextOccurredAtMillis),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    });
}

function resolveRuntime(envelope: EmailOsEnvelope): RuntimeConfig | null {
    if (envelope.productCode === 'ML') {
        if (!FEATURE_FLAGS.ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND) return null;
        const apiKey = process.env.MENULIST_RESEND_API_KEY?.trim();
        const allowedFromDomain = process.env.MENULIST_EMAIL_OS_FROM_DOMAIN?.trim().toLowerCase();
        return apiKey && allowedFromDomain ? {
            db: firestoreAdmin,
            deliveries: DB_COLLECTIONS.EMAIL_OS_DELIVERIES,
            suppressions: DB_COLLECTIONS.EMAIL_OS_SUPPRESSIONS,
            apiKey,
            allowedFromDomain,
        } : null;
    }
    if (envelope.productCode === 'AL') {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND || !answerlatticeFirestoreAdmin) return null;
        const apiKey = process.env.ANSWERLATTICE_RESEND_API_KEY?.trim();
        const allowedFromDomain = process.env.ANSWERLATTICE_EMAIL_OS_FROM_DOMAIN?.trim().toLowerCase();
        return apiKey && allowedFromDomain ? {
            db: answerlatticeFirestoreAdmin,
            deliveries: DB_COLLECTIONS.ANSWERLATTICE_EMAIL_OS_DELIVERIES,
            suppressions: DB_COLLECTIONS.ANSWERLATTICE_EMAIL_OS_SUPPRESSIONS,
            apiKey,
            allowedFromDomain,
        } : null;
    }
    return null;
}

export async function sendServerEmailOs(envelopeInput: EmailOsEnvelope): Promise<EmailOsProviderResult> {
    if (!FEATURE_FLAGS.ENABLE_EMAIL_OS) return configurationRejected('EMAIL_OS_DISABLED');
    const envelope = assertEmailOsEnvelope(envelopeInput);
    const runtime = resolveRuntime(envelope);
    if (!runtime) return configurationRejected('EMAIL_OS_PROVIDER_SEND_DISABLED_OR_CONFIG_MISSING');
    assertEmailOsSenderDomain(envelope.from, runtime.allowedFromDomain);

    const recipientHash = buildEmailOsRecipientHash(envelope.productCode, envelope.to, sha256);
    const suppression = await runtime.db.collection(runtime.suppressions).doc(recipientHash).get();
    if (suppression.exists && suppression.get('active') === true) {
        return {
            accepted: false,
            provider: EMAIL_OS_PROVIDER,
            status: 'suppressed',
            retryable: false,
            ambiguous: false,
            errorCode: 'EMAIL_OS_RECIPIENT_SUPPRESSED',
        };
    }

    const idempotencyKey = buildEmailOsIdempotencyKey(envelope, sha256);
    const deliveryId = idempotencyKey.slice(idempotencyKey.lastIndexOf('/') + 1);
    const deliveryRef = runtime.db.collection(runtime.deliveries).doc(deliveryId);
    const expiresAt = Timestamp.fromMillis(Date.now() + EMAIL_OS_LIMITS.RETENTION_DAYS * 86_400_000);
    const existingDelivery = await runtime.db.runTransaction(async (transaction) => {
        const current = await transaction.get(deliveryRef);
        if (current.exists) {
            const data = current.data() as Record<string, unknown>;
            if (data.status === 'failed' && data.retryable === true && data.ambiguous !== true) {
                transaction.set(deliveryRef, {
                    status: 'queued',
                    statusOccurredAt: FieldValue.serverTimestamp(),
                    retryable: false,
                    ambiguous: false,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                return null;
            }
            return data;
        }
        transaction.create(deliveryRef, {
            productCode: envelope.productCode,
            classification: envelope.classification,
            eventType: envelope.eventType,
            localDeliveryReference: envelope.localDeliveryReference,
            provider: EMAIL_OS_PROVIDER,
            recipientHash,
            status: 'queued',
            statusOccurredAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            expiresAt,
        });
        return null;
    });
    if (existingDelivery) return existingDeliveryResult(existingDelivery);

    try {
        const providerResponse = await new Resend(runtime.apiKey).emails.send({
            from: envelope.from,
            to: envelope.to,
            replyTo: envelope.replyTo,
            subject: envelope.subject,
            html: envelope.html,
            text: envelope.text,
            tags: [
                ...Array.from(envelope.tags || []),
                { name: EMAIL_OS_DELIVERY_TAG_NAME, value: deliveryId },
            ],
        }, { idempotencyKey });
        if (providerResponse.error) {
            const retryable = providerResponse.error.statusCode === 429 || (providerResponse.error.statusCode || 0) >= 500;
            await advanceDeliveryStatus(runtime, deliveryRef, 'failed', {
                errorCode: providerResponse.error.name,
                retryable,
                ambiguous: false,
            });
            return {
                accepted: false,
                provider: EMAIL_OS_PROVIDER,
                status: 'failed',
                retryable,
                ambiguous: false,
                errorCode: providerResponse.error.name,
            };
        }
        const providerMessageId = providerResponse.data.id;
        await advanceDeliveryStatus(runtime, deliveryRef, 'sent', {
            providerMessageId,
            providerMessageIdHash: buildEmailOsProviderIdentityHash(providerMessageId, sha256),
            retryable: false,
            ambiguous: false,
            errorCode: null,
        });
        return {
            accepted: true,
            provider: EMAIL_OS_PROVIDER,
            providerMessageId,
            status: 'sent',
            retryable: false,
            ambiguous: false,
        };
    } catch {
        try {
            await advanceDeliveryStatus(runtime, deliveryRef, 'outcome_unknown', {
                errorCode: 'EMAIL_OS_PROVIDER_OUTCOME_UNKNOWN',
                retryable: false,
                ambiguous: true,
            });
        } catch {
            // The pre-provider claim still prevents a duplicate send; a signed webhook can reconcile it later.
        }
        return {
            accepted: false,
            provider: EMAIL_OS_PROVIDER,
            status: 'outcome_unknown',
            retryable: false,
            ambiguous: true,
            errorCode: 'EMAIL_OS_PROVIDER_OUTCOME_UNKNOWN',
        };
    }
}
