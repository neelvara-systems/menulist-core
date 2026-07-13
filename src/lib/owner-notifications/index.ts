import { FEATURE_FLAGS } from '@config/features';
import { PRODUCT_IDS } from '@constant/product';
import {
    getOwnerNotificationRegistryEntry,
    OWNER_NOTIFICATION_COLLECTIONS,
    type OwnerNotificationChannel,
    type OwnerNotificationProductId,
} from '@data/shared/ownerNotificationRegistry';
import { getNextOwnerNotificationProcessingAttempt } from '@data/shared/ownerNotificationDeliveryBoundary';
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
        const db = answerlatticeFirestoreAdmin as any;
        return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
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
        : {};
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

function resolveRequestedChannels(
    registryChannels: OwnerNotificationChannel[],
    requested?: OwnerNotificationChannel[],
): OwnerNotificationChannel[] {
    const allowed = requested?.length
        ? registryChannels.filter((channel) => requested.includes(channel))
        : registryChannels;

    return allowed.filter((channel) => {
        if (channel === 'email') return FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_EMAIL;
        if (channel === 'whatsapp') return FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_WHATSAPP;
        return false;
    });
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
    const recipientLimitId = safeId([
        params.productId,
        params.channel,
        params.recipientHash,
        todayKey(),
    ].join('|'));
    const recipientRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.RATE_LIMITS).doc(recipientLimitId);

    const storeLimitId = params.storeId
        ? safeId([params.productId, 'store', params.tenantId, params.storeId, todayKey()].join('|'))
        : null;
    const storeRef = storeLimitId
        ? db.collection(OWNER_NOTIFICATION_COLLECTIONS.RATE_LIMITS).doc(storeLimitId)
        : null;

    return db.runTransaction(async (tx) => {
        const now = Timestamp.now();
        const recipientSnap = await tx.get(recipientRef);
        const recipientCount = Number(recipientSnap.data()?.count || 0);
        if (recipientCount >= MAX_PER_RECIPIENT_PER_DAY) return false;

        if (storeRef) {
            const storeSnap = await tx.get(storeRef);
            const storeCount = Number(storeSnap.data()?.count || 0);
            if (storeCount >= MAX_PER_STORE_PER_DAY) return false;
            tx.set(storeRef, {
                productId: params.productId,
                scope: 'store',
                tenantId: params.tenantId,
                storeId: params.storeId,
                dateKey: todayKey(),
                count: FieldValue.increment(1),
                updatedAt: now,
                ...getRetentionFieldsForProduct(params.productId, 'ownerNotificationRateLimits', now),
            }, { merge: true });
        }

        tx.set(recipientRef, {
            productId: params.productId,
            channel: params.channel,
            recipientHash: params.recipientHash,
            dateKey: todayKey(),
            count: FieldValue.increment(1),
            updatedAt: now,
            ...getRetentionFieldsForProduct(params.productId, 'ownerNotificationRateLimits', now),
        }, { merge: true });

        return true;
    });
}

async function writeDelivery(params: {
    db: Firestore;
    event: OwnerNotificationEventDoc;
    eventId: string;
    channel: OwnerNotificationChannel;
    recipient: OwnerNotificationRecipient;
    recipientValue: string;
    status: 'sent' | 'failed' | 'skipped' | 'rate_limited';
    templateKey: string;
    templateVersion: string;
    subject?: string;
    result?: OwnerNotificationChannelResult;
}): Promise<void> {
    const recipientHash = sha256(params.recipientValue.toLowerCase());
    const deliveryId = safeId(`${params.eventId}|${params.channel}|${recipientHash}`);
    const recipientMasked = params.channel === 'email'
        ? maskEmail(params.recipientValue)
        : maskPhone(params.recipientValue);
    const attemptedAt = Timestamp.now();
    const deliveryRef = params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES).doc(deliveryId);

    await params.db.runTransaction(async (transaction) => {
        const existing = await transaction.get(deliveryRef);
        const createdAt = existing.data()?.createdAt || attemptedAt;
        transaction.set(deliveryRef, sanitizeForFirestore({
            eventId: params.eventId,
            productId: params.event.productId,
            triggerType: params.event.triggerType,
            channel: params.channel,
            recipientRole: params.recipient.role,
            recipientHash,
            recipientMasked,
            status: params.status,
            subject: params.subject || null,
            templateKey: params.templateKey,
            templateVersion: params.templateVersion,
            providerMessageId: params.result?.providerMessageId || null,
            error: getOwnerNotificationDeliveryError(params.result),
            attempt: params.event.processingAttempt || 1,
            createdAt,
            lastAttemptAt: attemptedAt,
            sentAt: params.status === 'sent' ? attemptedAt : null,
            ...getRetentionFieldsForProduct(params.event.productId, 'ownerNotificationDeliveries', createdAt),
        }), { merge: true });
    });
}

export function getOwnerNotificationReadiness(productId: OwnerNotificationProductId = PRODUCT_IDS.MENULIST) {
    return {
        enabled: FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS,
        emailEnabled: FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_EMAIL,
        whatsappEnabled: FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_WHATSAPP,
        emailConfigured: isOwnerNotificationEmailConfigured(),
        whatsappConfigured: isOwnerNotificationWhatsAppConfigured(),
        productId,
    };
}

export async function enqueueOwnerNotification(
    input: EnqueueOwnerNotificationInput,
    options: { processImmediately?: boolean; processExisting?: boolean } = { processImmediately: true },
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

    const registryEntry = getOwnerNotificationRegistryEntry(input.productId, input.triggerType);
    if (!registryEntry) {
        logNotificationFailure('owner_notification_unknown_trigger', undefined, {
            ...getBoundedNotificationStringContext('productId', input.productId),
            ...getBoundedNotificationStringContext('triggerType', input.triggerType),
        });
        return { eventId: '', status: 'skipped' };
    }

    const db = getDbForProduct(input.productId);
    if (!db) {
        logNotificationFailure('owner_notification_firestore_target_unavailable', undefined, {
            ...getBoundedNotificationStringContext('productId', input.productId),
            ...getBoundedNotificationStringContext('triggerType', input.triggerType),
        });
        return { eventId: '', status: 'skipped' };
    }

    const dedupeKey = getDedupeKey(input);
    const eventId = safeId(dedupeKey);
    const ref = db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(eventId);
    const now = Timestamp.now();

    const doc: OwnerNotificationEventDoc = {
        productId: input.productId,
        triggerType: input.triggerType,
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

    const enqueueResult = await db.runTransaction(async (transaction): Promise<{
        created: boolean;
        status: OwnerNotificationEventStatus;
    }> => {
        const existing = await transaction.get(ref);
        if (existing.exists) {
            const existingStatus = existing.data()?.status;
            return {
                created: false,
                status: OWNER_NOTIFICATION_EVENT_STATUSES.includes(existingStatus)
                    ? existingStatus
                    : 'skipped',
            };
        }
        transaction.create(ref, doc);
        return { created: true, status: 'pending' };
    });

    if (!options.processImmediately) {
        return { eventId, status: enqueueResult.status, created: enqueueResult.created };
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

        const current = snap.data() as OwnerNotificationEventDoc;
        if (current.productId !== productId) {
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
        await eventRef.set({ status: 'skipped', error: 'unknown_trigger', updatedAt: Timestamp.now() }, { merge: true });
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
            await eventRef.set({ status: 'failed', error: 'template_not_found', updatedAt: Timestamp.now() }, { merge: true });
            return { eventId, status: 'failed', sent: 0, failed: 1, skipped: 0 };
        }

        const channels = resolveRequestedChannels(registryEntry.defaultChannels, event.requestedChannels);
        if (!channels.length) {
            await eventRef.set({ status: 'skipped', error: 'no_enabled_channels', updatedAt: Timestamp.now() }, { merge: true });
            return { eventId, status: 'skipped', sent: 0, failed: 0, skipped: 1 };
        }

        let sent = 0;
        let failed = 0;
        let skipped = 0;

        for (const channel of channels) {
            const recipientValue = channel === 'email' ? recipient.email : recipient.whatsappNumber;
            if (!recipientValue) {
                skipped++;
                await writeDelivery({
                    db,
                    event,
                    eventId,
                    channel,
                    recipient,
                    recipientValue: channel === 'email' ? 'missing@email' : 'missing-phone',
                    status: 'skipped',
                    templateKey: template.templateKey,
                    templateVersion: template.templateVersion,
                    subject: template.subject,
                    result: { ok: false, skippedReason: 'recipient_missing' },
                });
                continue;
            }

            if (channel === 'whatsapp' && registryEntry.requiresWhatsAppConsent && !recipient.whatsappConsent) {
                skipped++;
                await writeDelivery({
                    db,
                    event,
                    eventId,
                    channel,
                    recipient,
                    recipientValue,
                    status: 'skipped',
                    templateKey: template.templateKey,
                    templateVersion: template.templateVersion,
                    subject: template.subject,
                    result: { ok: false, skippedReason: 'whatsapp_consent_missing' },
                });
                continue;
            }

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
                await writeDelivery({
                    db,
                    event,
                    eventId,
                    channel,
                    recipient,
                    recipientValue,
                    status: 'rate_limited',
                    templateKey: template.templateKey,
                    templateVersion: template.templateVersion,
                    subject: template.subject,
                    result: { ok: false, skippedReason: 'rate_limited' },
                });
                continue;
            }

            const result = channel === 'email'
                ? await sendOwnerNotificationEmail({ to: recipientValue, subject: template.subject, html: template.html })
                : await sendOwnerNotificationWhatsApp({
                    to: recipientValue,
                    text: template.text,
                    sessionActive: event.metadata.whatsappSessionActive === true,
                    templateName: typeof event.metadata.whatsappTemplateName === 'string' ? event.metadata.whatsappTemplateName : undefined,
                    templateLanguage: typeof event.metadata.whatsappTemplateLanguage === 'string' ? event.metadata.whatsappTemplateLanguage : undefined,
                    templateParameters: Array.isArray(event.metadata.whatsappTemplateParameters)
                        ? event.metadata.whatsappTemplateParameters.map(String)
                        : undefined,
                });

            if (result.ok) {
                sent++;
            } else if (result.skippedReason) {
                skipped++;
            } else {
                failed++;
            }

            await writeDelivery({
                db,
                event,
                eventId,
                channel,
                recipient,
                recipientValue,
                status: result.ok ? 'sent' : (result.skippedReason ? 'skipped' : 'failed'),
                templateKey: template.templateKey,
                templateVersion: template.templateVersion,
                subject: template.subject,
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
