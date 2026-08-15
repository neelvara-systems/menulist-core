import { FEATURE_FLAGS } from '@config/features';
import { PRODUCT_IDS } from '@constant/product';
import {
    getOwnerNotificationRegistryEntry,
    OWNER_NOTIFICATION_COLLECTIONS,
    type OwnerNotificationChannel,
    type OwnerNotificationProductId,
} from '@data/shared/ownerNotificationRegistry';
import {
    getOwnerNotificationDeliveryClaimDecision,
    getNextOwnerNotificationProcessingAttempt,
    isOwnerNotificationEventWithinByteLimit,
    projectOwnerNotificationPersistedEvent,
    projectOwnerNotificationRateLimitCount,
} from '@data/shared/ownerNotificationDeliveryBoundary';
import { planNotificationOsChannels } from '@data/shared/notificationOs';
import { getAnswerlatticeRetentionFields, type AnswerlatticeRetentionKey } from '@lib/answerlattice/dataRetention';
import { admin } from '@lib/firebase/firebaseAdmin';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { sanitizeForFirestore as sanitizeFirestoreValue } from '@lib/firestore/sanitizeForFirestore';
import { getBoundedNotificationStringContext, logNotificationFailure } from '@lib/notifications/notificationDiagnostics';
import { secureLog } from '@lib/security/secureLogger';
import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendOwnerNotificationEmail, isOwnerNotificationEmailConfigured } from './channels/email';
import { sendOwnerNotificationWhatsApp, isOwnerNotificationWhatsAppConfigured } from './channels/whatsapp';
import {
    buildFormattedNotificationMetadata,
    resolveOwnerNotificationFormattingContext,
} from './formatters';
import {
    resolveOwnerNotificationRecipient,
    resolveOwnerNotificationScope,
} from './recipientResolver';
import { renderOwnerNotificationTemplate } from './templates';
import type {
    EnqueueOwnerNotificationInput,
    OwnerNotificationChannelResult,
    OwnerNotificationEventDoc,
    OwnerNotificationEventStatus,
    OwnerNotificationProcessResult,
    OwnerNotificationRecipient,
} from './types';

const MAX_PER_RECIPIENT_PER_DAY = 20;
const MAX_PER_STORE_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const MENULIST_OWNER_NOTIFICATION_RETENTION_DAYS = 30;
const MENULIST_OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS = 2;
const OWNER_NOTIFICATION_EVENT_STATUSES: OwnerNotificationEventStatus[] = [
    'pending',
    'processing',
    'delivered',
    'partial',
    'failed',
    'skipped',
];

function getDbForProduct(productId: OwnerNotificationProductId): Firestore | null {
    if (productId === PRODUCT_IDS.ANSWERLATTICE) {
        return answerlatticeFirestoreAdmin;
    }
    return admin.firestore();
}

function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

function safeId(input: string): string {
    return sha256(input).slice(0, 40);
}

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

function maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return '***';
    return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '***';
    return `***${digits.slice(-4)}`;
}

function getRetentionFieldsForProduct(
    productId: OwnerNotificationProductId,
    key: AnswerlatticeRetentionKey,
    from?: Timestamp,
) {
    return productId === PRODUCT_IDS.ANSWERLATTICE
        ? getAnswerlatticeRetentionFields(key, from)
        : {
            expiresAt: Timestamp.fromMillis(
                (from ?? Timestamp.now()).toMillis()
                + (
                    key === 'ownerNotificationRateLimits'
                        ? MENULIST_OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS
                        : MENULIST_OWNER_NOTIFICATION_RETENTION_DAYS
                ) * DAY_MS,
            ),
        };
}

function sanitizeForFirestore(value: any): any {
    return sanitizeFirestoreValue(value, {
        dateTransform: (date) => date.toISOString(),
        undefinedObjectValue: 'omit',
    });
}

function getOwnerNotificationDeliveryError(result?: OwnerNotificationChannelResult): string | null {
    if (!result || result.ok) return null;
    const { error, skippedReason } = result;
    if (typeof skippedReason === 'string' && skippedReason.length > 0) {
        return skippedReason;
    }
    if (typeof error === 'string' && error.length > 0) {
        return error;
    }
    return 'owner_notification_delivery_failed';
}

function getDedupeKey(input: EnqueueOwnerNotificationInput): string {
    const scopeId = input.workspaceId || input.storeId || 'account';
    return [
        input.productId,
        input.triggerType,
        input.tenantId,
        scopeId,
        input.referenceId,
    ].join('|');
}

async function incrementRateLimit(
    db: Firestore,
    params: {
        productId: OwnerNotificationProductId;
        channel: OwnerNotificationChannel;
        recipientHash: string;
        storeId?: string;
        tenantId: string;
    },
): Promise<boolean> {
    const dateKey = todayKey();
    const recipientLimitId = safeId([
        params.productId,
        params.channel,
        params.recipientHash,
        dateKey,
    ].join('|'));
    const recipientRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.RATE_LIMITS).doc(recipientLimitId);

    const storeLimitId = params.storeId
        ? safeId([params.productId, 'store', params.tenantId, params.storeId, dateKey].join('|'))
        : null;
    const storeRef = storeLimitId
        ? db.collection(OWNER_NOTIFICATION_COLLECTIONS.RATE_LIMITS).doc(storeLimitId)
        : null;

    return db.runTransaction(async (tx) => {
        const now = Timestamp.now();
        const recipientSnap = await tx.get(recipientRef);
        const recipientCount = recipientSnap.exists
            ? projectOwnerNotificationRateLimitCount(recipientSnap.data(), {
                productId: params.productId,
                dateKey,
                kind: 'recipient',
                channel: params.channel,
                recipientHash: params.recipientHash,
            })
            : 0;
        if (recipientCount === null) return false;
        if (recipientCount >= MAX_PER_RECIPIENT_PER_DAY) return false;

        if (storeRef) {
            const storeSnap = await tx.get(storeRef);
            const storeCount = storeSnap.exists
                ? projectOwnerNotificationRateLimitCount(storeSnap.data(), {
                    productId: params.productId,
                    dateKey,
                    kind: 'store',
                    tenantId: params.tenantId,
                    storeId: params.storeId,
                })
                : 0;
            if (storeCount === null) return false;
            if (storeCount >= MAX_PER_STORE_PER_DAY) return false;
            tx.set(storeRef, {
                productId: params.productId,
                scope: 'store',
                tenantId: params.tenantId,
                storeId: params.storeId,
                dateKey,
                count: FieldValue.increment(1),
                updatedAt: now,
                ...getRetentionFieldsForProduct(params.productId, 'ownerNotificationRateLimits', now),
            }, { merge: true });
        }

        tx.set(recipientRef, {
            productId: params.productId,
            channel: params.channel,
            recipientHash: params.recipientHash,
            dateKey,
            count: FieldValue.increment(1),
            updatedAt: now,
            ...getRetentionFieldsForProduct(params.productId, 'ownerNotificationRateLimits', now),
        }, { merge: true });

        return true;
    });
}

type OwnerNotificationDeliveryClaim = {
    decision: 'claimed' | 'terminal' | 'ambiguous' | 'invalid';
    existingStatus?: 'sent' | 'failed' | 'skipped' | 'rate_limited';
};

async function claimDelivery(params: {
    db: Firestore;
    event: OwnerNotificationEventDoc;
    eventId: string;
    channel: OwnerNotificationChannel;
    recipient: OwnerNotificationRecipient;
    recipientValue: string;
    templateKey: string;
    templateVersion: string;
    subject?: string;
}): Promise<OwnerNotificationDeliveryClaim> {
    const recipientHash = sha256(params.recipientValue.toLowerCase());
    const deliveryId = safeId(`${params.eventId}|${params.channel}|${recipientHash}`);
    const recipientMasked = params.channel === 'email'
        ? maskEmail(params.recipientValue)
        : maskPhone(params.recipientValue);
    const attemptedAt = Timestamp.now();
    const deliveryRef = params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES).doc(deliveryId);
    const attempt = params.event.processingAttempt;
    if (!attempt) return { decision: 'invalid' };

    return params.db.runTransaction(async (transaction): Promise<OwnerNotificationDeliveryClaim> => {
        const existing = await transaction.get(deliveryRef);
        const existingData = existing.data();
        if (
            existing.exists
            && (
                existingData?.eventId !== params.eventId
                || existingData?.productId !== params.event.productId
                || existingData?.channel !== params.channel
                || existingData?.recipientHash !== recipientHash
                || !(existingData?.createdAt instanceof Timestamp)
            )
        ) return { decision: 'invalid' };

        const decision = getOwnerNotificationDeliveryClaimDecision(
            existingData?.status,
            existingData?.attempt,
            attempt,
        );
        if (decision === 'terminal') {
            const existingStatus = existingData?.status;
            if (
                existingStatus !== 'sent'
                && existingStatus !== 'failed'
                && existingStatus !== 'skipped'
                && existingStatus !== 'rate_limited'
            ) return { decision: 'invalid' };
            return {
                decision,
                existingStatus,
            };
        }
        if (decision !== 'claim') return { decision };

        const createdAt = existing.exists
            ? existingData?.createdAt instanceof Timestamp
                ? existingData.createdAt
                : null
            : attemptedAt;
        if (!createdAt) return { decision: 'invalid' };
        transaction.set(deliveryRef, sanitizeForFirestore({
            eventId: params.eventId,
            productId: params.event.productId,
            triggerType: params.event.triggerType,
            channel: params.channel,
            recipientRole: params.recipient.role,
            recipientHash,
            recipientMasked,
            status: 'sending',
            subject: params.subject || null,
            templateKey: params.templateKey,
            templateVersion: params.templateVersion,
            providerMessageId: null,
            error: null,
            attempt,
            createdAt,
            lastAttemptAt: attemptedAt,
            sentAt: null,
            ...getRetentionFieldsForProduct(params.event.productId, 'ownerNotificationDeliveries', createdAt),
        }));
        return { decision: 'claimed' };
    });
}

async function finalizeDelivery(params: {
    db: Firestore;
    event: OwnerNotificationEventDoc;
    eventId: string;
    channel: OwnerNotificationChannel;
    recipientValue: string;
    status: 'sent' | 'failed' | 'skipped' | 'rate_limited';
    result?: OwnerNotificationChannelResult;
}): Promise<void> {
    const recipientHash = sha256(params.recipientValue.toLowerCase());
    const deliveryId = safeId(`${params.eventId}|${params.channel}|${recipientHash}`);
    const deliveryRef = params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES).doc(deliveryId);
    const attempt = params.event.processingAttempt;
    if (!attempt) throw new Error('owner_notification_delivery_attempt_missing');

    await params.db.runTransaction(async (transaction) => {
        const existing = await transaction.get(deliveryRef);
        const data = existing.data();
        if (
            !existing.exists
            || data?.eventId !== params.eventId
            || data?.productId !== params.event.productId
            || data?.channel !== params.channel
            || data?.recipientHash !== recipientHash
            || data?.status !== 'sending'
            || data?.attempt !== attempt
            || !(data?.createdAt instanceof Timestamp)
        ) throw new Error('owner_notification_delivery_claim_mismatch');

        const finalizedAt = Timestamp.now();
        transaction.set(deliveryRef, {
            ...data,
            status: params.status,
            providerMessageId: params.result?.providerMessageId || null,
            error: getOwnerNotificationDeliveryError(params.result),
            lastAttemptAt: finalizedAt,
            sentAt: params.status === 'sent' ? finalizedAt : null,
        });
    });
}

export function getOwnerNotificationReadiness(productId: OwnerNotificationProductId = PRODUCT_IDS.MENULIST) {
    return {
        enabled: FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS,
        emailEnabled: FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_EMAIL,
        whatsappEnabled: FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_WHATSAPP,
        emailConfigured: isOwnerNotificationEmailConfigured(productId),
        whatsappConfigured: isOwnerNotificationWhatsAppConfigured(),
        productId,
    };
}

export async function enqueueOwnerNotification(
    input: EnqueueOwnerNotificationInput,
    options: { processImmediately?: boolean; processExisting?: boolean } = {
        processImmediately: true,
    },
): Promise<OwnerNotificationProcessResult | {
    eventId: string;
    status: OwnerNotificationEventStatus;
    created?: boolean;
}> {
    if (!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS) {
        return { eventId: '', status: 'skipped' };
    }
    if (input.productId === PRODUCT_IDS.MENULIST && !FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION) {
        return { eventId: '', status: 'skipped' };
    }
    if (input.productId === PRODUCT_IDS.ANSWERLATTICE && !FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_ANSWERLATTICE_MIGRATION) {
        return { eventId: '', status: 'skipped' };
    }

    const requestedRegistryEntry = getOwnerNotificationRegistryEntry(input.productId, input.triggerType);
    if (!requestedRegistryEntry || requestedRegistryEntry.producerStatus === 'reserved') {
        logNotificationFailure('owner_notification_unknown_trigger', undefined, {
            ...getBoundedNotificationStringContext('productId', input.productId),
            ...getBoundedNotificationStringContext('triggerType', input.triggerType),
        });
        return { eventId: '', status: 'skipped' };
    }
    const triggerType = requestedRegistryEntry.producerStatus === 'alias' ? requestedRegistryEntry.canonicalTriggerType : input.triggerType;
    if (!triggerType) return { eventId: '', status: 'skipped' };
    const registryEntry = getOwnerNotificationRegistryEntry(input.productId, triggerType);
    if (!registryEntry || registryEntry.producerStatus !== 'active') return { eventId: '', status: 'skipped' };
    const normalizedInput = triggerType === input.triggerType ? input : { ...input, triggerType };

    const db = getDbForProduct(input.productId);
    if (!db) {
        logNotificationFailure('owner_notification_firestore_target_unavailable', undefined, {
            ...getBoundedNotificationStringContext('productId', input.productId),
            ...getBoundedNotificationStringContext('triggerType', input.triggerType),
        });
        return { eventId: '', status: 'skipped' };
    }

    const dedupeKey = getDedupeKey(normalizedInput);
    const eventId = safeId(dedupeKey);
    const ref = db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(eventId);
    const now = Timestamp.now();

    const doc: OwnerNotificationEventDoc = {
        productId: input.productId,
        triggerType,
        tenantId: String(input.tenantId),
        ...(input.storeId ? { storeId: String(input.storeId) } : {}),
        ...(input.workspaceId ? { workspaceId: String(input.workspaceId) } : {}),
        referenceId: String(input.referenceId),
        dedupeKey,
        recipientRole: input.recipientRole || registryEntry.recipientRole,
        ...(input.requestedChannels?.length ? { requestedChannels: input.requestedChannels } : {}),
        ...(input.recipientHints ? { recipientHints: sanitizeForFirestore(input.recipientHints) } : {}),
        metadata: sanitizeForFirestore(input.metadata || {}),
        priority: registryEntry.priority,
        status: 'pending',
        source: input.source,
        createdAt: now,
        updatedAt: now,
        ...getRetentionFieldsForProduct(input.productId, 'ownerNotificationEvents', now),
    };
    if (!isOwnerNotificationEventWithinByteLimit(doc)) {
        logNotificationFailure('owner_notification_event_too_large', undefined, {
            ...getBoundedNotificationStringContext('productId', input.productId),
            ...getBoundedNotificationStringContext('triggerType', input.triggerType),
        });
        return { eventId: '', status: 'skipped' };
    }
    const projectedDoc = projectOwnerNotificationPersistedEvent(doc, input.productId);
    if (
        !projectedDoc
        || safeId(projectedDoc.dedupeKey) !== eventId
        || projectedDoc.priority !== registryEntry.priority
    ) {
        logNotificationFailure('owner_notification_event_invalid', undefined, {
            ...getBoundedNotificationStringContext('productId', input.productId),
            ...getBoundedNotificationStringContext('triggerType', input.triggerType),
        });
        return { eventId: '', status: 'skipped' };
    }

    const enqueueResult = await db.runTransaction(async (transaction): Promise<{
        created: boolean;
        status: OwnerNotificationEventStatus;
    }> => {
        const existing = await transaction.get(ref);
        if (existing.exists) {
            const current = projectOwnerNotificationPersistedEvent(existing.data(), input.productId);
            const currentRegistryEntry = current
                ? getOwnerNotificationRegistryEntry(current.productId, current.triggerType)
                : null;
            return {
                created: false,
                status: current
                    && currentRegistryEntry
                    && safeId(current.dedupeKey) === eventId
                    && current.priority === currentRegistryEntry.priority
                    && OWNER_NOTIFICATION_EVENT_STATUSES.includes(current.status)
                    ? current.status
                    : 'skipped',
            };
        }
        transaction.create(ref, doc);
        return { created: true, status: 'pending' };
    });

    if (!options.processImmediately) {
        return {
            eventId,
            status: enqueueResult.status,
            created: enqueueResult.created,
        };
    }
    if (
        !enqueueResult.created
        && options.processExisting === false
        && enqueueResult.status !== 'pending'
    ) {
        return { eventId, status: enqueueResult.status, created: false };
    }

    const processed = await processOwnerNotificationEvent(input.productId, eventId);
    return { ...processed, created: enqueueResult.created };
}

export async function processOwnerNotificationEvent(
    productId: OwnerNotificationProductId,
    eventId: string,
): Promise<OwnerNotificationProcessResult> {
    const db = getDbForProduct(productId);
    if (!db) {
        return { eventId, status: 'failed', sent: 0, failed: 1, skipped: 0 };
    }

    const eventRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(eventId);
    const claim = await db.runTransaction(async (transaction): Promise<{
        event: OwnerNotificationEventDoc | null;
        status: OwnerNotificationProcessResult['status'];
        claimReason?: OwnerNotificationProcessResult['claimReason'];
    }> => {
        const snap = await transaction.get(eventRef);
        if (!snap.exists) {
            return { event: null, status: 'failed', claimReason: 'not_found_or_product_mismatch' };
        }

        const current = projectOwnerNotificationPersistedEvent(snap.data(), productId);
        const registryEntry = current
            ? getOwnerNotificationRegistryEntry(current.productId, current.triggerType)
            : null;
        if (
            !current
            || safeId(current.dedupeKey) !== eventId
            || !registryEntry
            || current.priority !== registryEntry.priority
        ) {
            return { event: null, status: 'failed', claimReason: 'not_found_or_product_mismatch' };
        }
        const processingAttempt = getNextOwnerNotificationProcessingAttempt(
            current.status,
            current.processingAttempt,
        );
        if (processingAttempt === null) {
            return { event: null, status: current.status, claimReason: 'not_claimable' };
        }
        const now = Timestamp.now();
        transaction.set(eventRef, {
            status: 'processing',
            processingAttempt,
            processingStartedAt: now,
            updatedAt: now,
        }, { merge: true });
        return {
            event: {
                ...current,
                status: 'processing' as const,
                processingAttempt,
                updatedAt: now,
            },
            status: 'processing',
        };
    });
    if (!claim.event) {
        return {
            eventId,
            status: claim.status,
            sent: 0,
            failed: claim.status === 'failed' ? 1 : 0,
            skipped: claim.status === 'skipped' ? 1 : 0,
            claimed: false,
            claimReason: claim.claimReason,
        };
    }
    const event = claim.event;

    const registryEntry = getOwnerNotificationRegistryEntry(event.productId, event.triggerType);
    if (!registryEntry) {
        await eventRef.set(
            {
                status: 'skipped',
                error: 'unknown_trigger',
                updatedAt: Timestamp.now(),
            },
            { merge: true },
        );
        return { eventId, status: 'skipped', sent: 0, failed: 0, skipped: 1 };
    }

    try {
        const scope = await resolveOwnerNotificationScope(event);
        if (
            (event.productId === PRODUCT_IDS.MENULIST && !scope.storeData)
            || (event.productId === PRODUCT_IDS.ANSWERLATTICE && !scope.workspaceData)
        ) {
            await eventRef.set({
                status: 'failed',
                error: 'scope_not_found_or_mismatch',
                processedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            }, { merge: true });
            return { eventId, status: 'failed', sent: 0, failed: 1, skipped: 0 };
        }
        const recipient = resolveOwnerNotificationRecipient(event, scope);
        const dataForContext = event.productId === PRODUCT_IDS.ANSWERLATTICE
            ? scope.workspaceData
            : scope.storeData;
        const context = resolveOwnerNotificationFormattingContext(dataForContext, {
            currencyCode: typeof event.metadata.currency === 'string' ? event.metadata.currency : undefined,
            currencySymbol: typeof event.metadata.currencySymbol === 'string' ? event.metadata.currencySymbol : undefined,
        });
        const metadata = buildFormattedNotificationMetadata({
            ...event.metadata,
            storeName: event.metadata.storeName || dataForContext?.name || dataForContext?.businessName || recipient.name,
            productName: event.metadata.productName || dataForContext?.productName || dataForContext?.name,
            workspaceName: event.metadata.workspaceName || dataForContext?.companyName || dataForContext?.businessName,
            recipientName: event.metadata.recipientName || recipient.name,
            supportEmail: event.metadata.supportEmail || dataForContext?.supportEmail,
        }, context);
        const template = renderOwnerNotificationTemplate(event.productId, registryEntry.templateKey, metadata);

        if (!template) {
            await eventRef.set(
                {
                    status: 'failed',
                    error: 'template_not_found',
                    updatedAt: Timestamp.now(),
                },
                { merge: true },
            );
            return { eventId, status: 'failed', sent: 0, failed: 1, skipped: 0 };
        }

        const channelPlan = planNotificationOsChannels({
            allowedChannels: registryEntry.defaultChannels,
            requestedChannels: event.requestedChannels,
            mode: event.priority === 'critical' ? 'all_eligible_critical' : recipient.channelMode,
            preferredChannels: recipient.preferredChannels,
            email: recipient.email,
            emailVerified: recipient.emailVerified,
            emailInternalIdentity: recipient.emailInternalIdentity,
            whatsappNumber: recipient.whatsappNumber,
            phoneVerified: recipient.phoneVerified,
            whatsappConsentGranted: recipient.whatsappConsent,
            requiresWhatsAppConsent: registryEntry.requiresWhatsAppConsent,
            enabledChannels: {
                email: FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_EMAIL,
                whatsapp:
                    FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_WHATSAPP &&
                    (event.productId === 'ML'
                        ? FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS
                        : FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WHATSAPP_OS_OWNER_NOTIFICATIONS),
            },
        }).filter((item) => item.reason !== 'not_requested' && item.reason !== 'channel_disabled');
        if (!channelPlan.length) {
            await eventRef.set(
                {
                    status: 'skipped',
                    error: 'no_enabled_channels',
                    updatedAt: Timestamp.now(),
                },
                { merge: true },
            );
            return { eventId, status: 'skipped', sent: 0, failed: 0, skipped: 1 };
        }

        let sent = 0;
        let failed = 0;
        let skipped = 0;

        for (const planItem of channelPlan) {
            const channel = planItem.channel;
            const recipientValue = channel === 'email' ? recipient.email : recipient.whatsappNumber;
            const persistedRecipientValue = recipientValue
                || (channel === 'email' ? 'missing@email' : 'missing-phone');
            const deliveryClaim = await claimDelivery({
                db,
                event,
                eventId,
                channel,
                recipient,
                recipientValue: persistedRecipientValue,
                templateKey: template.templateKey,
                templateVersion: template.templateVersion,
                subject: template.subject,
            });

            if (deliveryClaim.decision === 'terminal') {
                if (deliveryClaim.existingStatus === 'sent') sent++;
                else if (deliveryClaim.existingStatus === 'failed') failed++;
                else skipped++;
                continue;
            }
            if (deliveryClaim.decision !== 'claimed') {
                failed++;
                continue;
            }

            if (!planItem.eligible) {
                skipped++;
                await finalizeDelivery({
                    db,
                    event,
                    eventId,
                    channel,
                    recipientValue: persistedRecipientValue,
                    status: 'skipped',
                    result: { ok: false, skippedReason: planItem.reason },
                });
                continue;
            }

            if (!recipientValue) throw new Error('owner_notification_planned_recipient_missing');

            const recipientHash = sha256(recipientValue.toLowerCase());
            const allowed = event.priority === 'critical'
                ? true
                : await incrementRateLimit(db, {
                    productId: event.productId,
                    channel,
                    recipientHash,
                    tenantId: event.tenantId,
                    storeId: event.storeId,
                });

            if (!allowed) {
                skipped++;
                await finalizeDelivery({
                    db,
                    event,
                    eventId,
                    channel,
                    recipientValue,
                    status: 'rate_limited',
                    result: { ok: false, skippedReason: 'rate_limited' },
                });
                continue;
            }

            const result = channel === 'email'
                ? await sendOwnerNotificationEmail({
                    productCode: event.productId,
                    to: recipientValue,
                    subject: template.subject,
                    html: template.html,
                    eventType: event.triggerType,
                    referenceId: eventId,
                })
                : await sendOwnerNotificationWhatsApp({
                    productCode: event.productId,
                    messageClass: event.priority === 'critical' ? 'transactional' : 'operational',
                    workflow: 'owner_notification',
                    localDeliveryReference: `${eventId}:${channel}`,
                    ownerDocumentId: safeId(`${eventId}|${channel}|${sha256(recipientValue.toLowerCase())}`),
                    consentGranted: recipient.whatsappConsent,
                    to: recipientValue,
                    text: template.text,
                    sessionActive: event.metadata.whatsappSessionActive === true,
                    templateKey: registryEntry.templateKey,
                });

            if (result.ok) {
                sent++;
            } else if (result.skippedReason) {
                skipped++;
            } else {
                failed++;
            }

            if (result.ambiguous) {
                // Keep the claimed row in `sending`. A later event retry must not
                // duplicate a provider request whose outcome is unknown.
                continue;
            }

            await finalizeDelivery({
                db,
                event,
                eventId,
                channel,
                recipientValue,
                status: result.ok ? 'sent' : (result.skippedReason ? 'skipped' : 'failed'),
                result,
            });
        }

        const status = sent > 0 && failed === 0
            ? 'delivered'
            : sent > 0
                ? 'partial'
                : failed > 0
                    ? 'failed'
                    : 'skipped';

        await eventRef.set({
            status,
            processedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            error: failed > 0 ? 'one_or_more_channels_failed' : null,
        }, { merge: true });

        secureLog('[OwnerNotifications] Event processed', {
            ...getBoundedNotificationStringContext('productId', event.productId),
            ...getBoundedNotificationStringContext('triggerType', event.triggerType),
            ...getBoundedNotificationStringContext('eventId', eventId),
            status,
            sent,
            failed,
            skipped,
        });

        return { eventId, status, sent, failed, skipped };
    } catch (error) {
        await eventRef.set({
            status: 'failed',
            error: 'owner_notification_processing_failed',
            processedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }, { merge: true });
        logNotificationFailure('owner_notification_processing_failed', error, {
            ...getBoundedNotificationStringContext('productId', productId),
            ...getBoundedNotificationStringContext('eventId', eventId),
        });
        return { eventId, status: 'failed', sent: 0, failed: 1, skipped: 0 };
    }
}
