import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import {
    WHATSAPP_OS_GRAPH_API_VERSION,
    WHATSAPP_OS_LIMITS,
    type WhatsAppOsSendRequest,
    type WhatsAppOsSendResult,
    assertWhatsAppOsSendRequest,
} from '@data/shared/whatsappOs';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { createHash } from 'node:crypto';
import { Firestore, Timestamp } from 'firebase-admin/firestore';

const PROVIDER_TIMEOUT_MS = 15_000;

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

function rejected(errorCode: string): WhatsAppOsSendResult {
    return {
        accepted: false,
        ambiguous: false,
        status: 'configuration_rejected',
        errorCode,
    };
}

function getProviderMessageId(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const messages = (value as { messages?: unknown }).messages;
    if (!Array.isArray(messages)) return undefined;
    const candidate = (messages[0] as { id?: unknown } | undefined)?.id;
    if (typeof candidate !== 'string') return undefined;
    const normalized = candidate.trim();
    if (
        !normalized
        || normalized.length > WHATSAPP_OS_LIMITS.MAX_PROVIDER_MESSAGE_ID_LENGTH
        || /[\u0000-\u001f\u007f]/.test(normalized)
    ) return undefined;
    return normalized;
}

function buildProviderBody(request: WhatsAppOsSendRequest): Record<string, unknown> {
    if (request.template) {
        return {
            messaging_product: 'whatsapp',
            to: request.to,
            type: 'template',
            template: {
                name: request.template.name,
                language: { code: request.template.language },
                ...(request.template.parameters?.length
                    ? {
                        components: [{
                            type: 'body',
                            parameters: request.template.parameters.map((text) => ({ type: 'text', text })),
                        }],
                    }
                    : {}),
            },
        };
    }
    return {
        messaging_product: 'whatsapp',
        to: request.to,
        type: 'text',
        text: { body: request.session?.text || '' },
    };
}

async function persistProviderReference(
    request: WhatsAppOsSendRequest,
    providerMessageId: string,
): Promise<void> {
    const db: Firestore | null = request.productCode === 'AL' ? answerlatticeFirestoreAdmin : firestoreAdmin;
    if (!db) throw new Error('WHATSAPP_OS_FIRESTORE_UNAVAILABLE');
    const providerMessageIdHash = sha256(providerMessageId);
    const now = Timestamp.now();
    const collection = request.productCode === 'AL'
        ? DB_COLLECTIONS.ANSWERLATTICE_WHATSAPP_OS_MESSAGE_REFS
        : DB_COLLECTIONS.WHATSAPP_OS_MESSAGE_REFS;
    const ref = db.collection(collection).doc(providerMessageIdHash);
    await db.runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        if (current.exists) {
            if (current.get('unresolved') === true && !current.get('ownerDocumentId')) {
                const providerStatus = current.get('providerStatus');
                const statusOccurredAt = current.get('statusOccurredAt');
                transaction.set(ref, {
                    productCode: request.productCode,
                    workflow: request.ownerReference.workflow,
                    ownerDocumentId: request.ownerReference.documentId,
                    localDeliveryReference: request.localDeliveryReference,
                    unresolved: false,
                    updatedAt: now,
                }, { merge: true });
                if (
                    (providerStatus === 'sent' || providerStatus === 'delivered' || providerStatus === 'read' || providerStatus === 'failed')
                    && statusOccurredAt instanceof Timestamp
                ) {
                    const ownerCollection = request.ownerReference.workflow === 'phone_otp'
                        ? DB_COLLECTIONS.AUTH_PHONE_OTP_CHALLENGES
                        : request.ownerReference.workflow === 'owner_notification'
                            ? DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES
                            : null;
                    if (ownerCollection) {
                        transaction.set(db.collection(ownerCollection).doc(request.ownerReference.documentId), {
                            providerStatus,
                            providerStatusAt: statusOccurredAt,
                        }, { merge: true });
                    }
                }
                return;
            }
            if (
                current.get('productCode') !== request.productCode
                || current.get('workflow') !== request.ownerReference.workflow
                || current.get('ownerDocumentId') !== request.ownerReference.documentId
                || current.get('localDeliveryReference') !== request.localDeliveryReference
            ) throw new Error('WHATSAPP_OS_PROVIDER_REFERENCE_COLLISION');
            return;
        }
        transaction.create(ref, {
            productCode: request.productCode,
            workflow: request.ownerReference.workflow,
            ownerDocumentId: request.ownerReference.documentId,
            localDeliveryReference: request.localDeliveryReference,
            providerMessageIdHash,
            providerStatus: 'accepted',
            statusOccurredAt: now,
            createdAt: now,
            updatedAt: now,
            expiresAt: Timestamp.fromMillis(
                now.toMillis() + WHATSAPP_OS_LIMITS.PROVIDER_RECORD_RETENTION_DAYS * 86_400_000,
            ),
        });
    });
}

export function isWhatsAppOsConfigured(productCode: 'ML' | 'AL' = 'ML'): boolean {
    if (!FEATURE_FLAGS.ENABLE_WHATSAPP_OS) return false;
    if (productCode === 'AL') {
        return Boolean(
            FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WHATSAPP_OS_OWNER_NOTIFICATIONS
            && process.env.ANSWERLATTICE_WHATSAPP_PHONE_NUMBER_ID?.trim()
            && process.env.ANSWERLATTICE_WHATSAPP_ACCESS_TOKEN?.trim(),
        );
    }
    return Boolean(menulistServerEnv.whatsappPhoneNumberId && menulistServerEnv.whatsappAccessToken);
}

export async function sendServerWhatsAppOs(input: WhatsAppOsSendRequest): Promise<WhatsAppOsSendResult> {
    if (!FEATURE_FLAGS.ENABLE_WHATSAPP_OS) return rejected('WHATSAPP_OS_DISABLED');

    let request: WhatsAppOsSendRequest;
    try {
        request = assertWhatsAppOsSendRequest(input);
    } catch (error) {
        return {
            accepted: false,
            ambiguous: false,
            status: 'policy_rejected',
            errorCode: error instanceof Error ? error.message : 'WHATSAPP_OS_REQUEST_REJECTED',
        };
    }

    const phoneNumberId = request.productCode === 'AL'
        ? process.env.ANSWERLATTICE_WHATSAPP_PHONE_NUMBER_ID?.trim()
        : menulistServerEnv.whatsappPhoneNumberId;
    const accessToken = request.productCode === 'AL'
        ? process.env.ANSWERLATTICE_WHATSAPP_ACCESS_TOKEN?.trim()
        : menulistServerEnv.whatsappAccessToken;
    if (!phoneNumberId || !accessToken) return rejected('WHATSAPP_OS_CONFIG_MISSING');
    if (
        request.productCode === 'AL'
        && !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WHATSAPP_OS_OWNER_NOTIFICATIONS
    ) return rejected('WHATSAPP_OS_PRODUCT_SEND_DISABLED');

    try {
        const response = await fetch(
            `https://graph.facebook.com/${WHATSAPP_OS_GRAPH_API_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`,
            {
                method: 'POST',
                redirect: 'manual',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildProviderBody(request)),
                signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
            },
        );
        if (!response.ok) {
            return {
                accepted: false,
                ambiguous: false,
                status: 'failed',
                errorCode: 'WHATSAPP_OS_PROVIDER_REJECTED',
            };
        }
        const parsed = await readJsonResponseWithLimit(response, WHATSAPP_OS_LIMITS.MAX_PROVIDER_BODY_BYTES);
        const providerMessageId = getProviderMessageId(parsed);
        if (!providerMessageId) {
            return {
                accepted: true,
                ambiguous: true,
                status: 'accepted',
                errorCode: 'WHATSAPP_OS_PROVIDER_ID_MISSING',
            };
        }
        try {
            await persistProviderReference(request, providerMessageId);
        } catch {
            return {
                accepted: true,
                ambiguous: true,
                providerMessageId,
                status: 'accepted',
                errorCode: 'WHATSAPP_OS_PROVIDER_REFERENCE_PERSIST_UNKNOWN',
            };
        }
        return { accepted: true, ambiguous: false, providerMessageId, status: 'accepted' };
    } catch {
        return {
            accepted: false,
            ambiguous: true,
            status: 'failed',
            errorCode: 'WHATSAPP_OS_PROVIDER_OUTCOME_UNKNOWN',
        };
    }
}
