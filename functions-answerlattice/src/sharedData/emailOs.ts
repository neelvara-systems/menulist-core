/**
 * EmailOS pure cross-runtime contract.
 *
 * This file is self-contained so it can be copied byte-for-byte into the
 * MenuList and Answerlattice Firebase Functions deployment packages.
 */

export const EMAIL_OS_PROVIDER = 'resend' as const;
export const EMAIL_OS_DELIVERY_TAG_NAME = 'email_os_delivery_id' as const;
export const EMAIL_OS_PRODUCT_TAG_NAME = 'email_os_product' as const;

export const EMAIL_OS_PRODUCT_CODES = {
    MENULIST: 'ML',
    ANSWERLATTICE: 'AL',
    CAMPAIGNCUE: 'CC',
    SIGNALDESK: 'SD',
    MYCODEX: 'MC',
} as const;

export type EmailOsProductCode = typeof EMAIL_OS_PRODUCT_CODES[keyof typeof EMAIL_OS_PRODUCT_CODES];
export type EmailOsClassification = 'transactional' | 'operational' | 'marketing';
export type EmailOsActivationState = 'provider_ready_disabled' | 'approval_required' | 'export_only' | 'disabled';

export interface EmailOsProductPolicy {
    productCode: EmailOsProductCode;
    activationState: EmailOsActivationState;
    admittedClassifications: readonly EmailOsClassification[];
    directProviderSendAllowed: boolean;
}

export const EMAIL_OS_PRODUCT_POLICIES: Record<EmailOsProductCode, EmailOsProductPolicy> = {
    ML: {
        productCode: 'ML',
        activationState: 'provider_ready_disabled',
        admittedClassifications: ['transactional', 'operational'],
        directProviderSendAllowed: true,
    },
    AL: {
        productCode: 'AL',
        activationState: 'provider_ready_disabled',
        admittedClassifications: ['transactional', 'operational'],
        directProviderSendAllowed: true,
    },
    SD: {
        productCode: 'SD',
        activationState: 'approval_required',
        admittedClassifications: ['marketing'],
        directProviderSendAllowed: true,
    },
    CC: {
        productCode: 'CC',
        activationState: 'export_only',
        admittedClassifications: [],
        directProviderSendAllowed: false,
    },
    MC: {
        productCode: 'MC',
        activationState: 'disabled',
        admittedClassifications: [],
        directProviderSendAllowed: false,
    },
};

export const EMAIL_OS_LIMITS = {
    MAX_ADDRESS_LENGTH: 320,
    MAX_BODY_BYTES: 512 * 1024,
    MAX_EVENT_TYPE_LENGTH: 100,
    MAX_HTML_LENGTH: 500_000,
    MAX_LOCAL_REFERENCE_LENGTH: 180,
    MAX_PLAIN_TEXT_LENGTH: 200_000,
    MAX_PREVIEW_TEXT_LENGTH: 140,
    MAX_PROVIDER_EVENT_BODY_BYTES: 256 * 1024,
    MAX_PROVIDER_EVENT_ID_LENGTH: 200,
    MAX_PROVIDER_MESSAGE_ID_LENGTH: 200,
    MAX_REPLY_TO_COUNT: 1,
    MAX_SUBJECT_LENGTH: 200,
    MAX_TAG_COUNT: 6,
    MAX_TAG_NAME_LENGTH: 50,
    MAX_TAG_VALUE_LENGTH: 256,
    RETENTION_DAYS: 90,
} as const;

export type EmailOsDeliveryStatus =
    | 'queued'
    | 'outcome_unknown'
    | 'sent'
    | 'delivery_delayed'
    | 'delivered'
    | 'failed'
    | 'suppressed'
    | 'bounced'
    | 'complained';

export const EMAIL_OS_DELIVERY_STATUS_PRECEDENCE: Record<EmailOsDeliveryStatus, number> = {
    queued: 0,
    outcome_unknown: 5,
    sent: 10,
    delivery_delayed: 20,
    delivered: 30,
    failed: 40,
    suppressed: 50,
    bounced: 60,
    complained: 70,
};

export interface EmailOsTag {
    name: string;
    value: string;
}

export interface EmailOsEnvelope {
    productCode: EmailOsProductCode;
    classification: EmailOsClassification;
    eventType: string;
    localDeliveryReference: string;
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
    tags?: readonly EmailOsTag[];
}

export interface EmailOsProviderResult {
    accepted: boolean;
    provider: typeof EMAIL_OS_PROVIDER;
    providerMessageId?: string;
    status: EmailOsDeliveryStatus | 'configuration_rejected';
    retryable: boolean;
    ambiguous: boolean;
    errorCode?: string;
}

export type EmailOsProviderEventType =
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.failed'
    | 'email.bounced'
    | 'email.complained'
    | 'email.suppressed'
    | 'suppression.added'
    | 'suppression.removed';

export interface EmailOsProviderEvent {
    provider: typeof EMAIL_OS_PROVIDER;
    eventType: EmailOsProviderEventType;
    providerEventId: string;
    providerMessageId: string | null;
    localDeliveryId: string | null;
    productCode: EmailOsProductCode | null;
    recipient: string | null;
    occurredAt: string;
    deliveryStatus: EmailOsDeliveryStatus | null;
    suppressionAction: 'activate' | 'deactivate' | null;
    suppressionReason: 'bounce' | 'complaint' | 'provider' | null;
}

export class EmailOsContractError extends Error {
    readonly code: string;

    constructor(code: string) {
        super(code);
        this.name = 'EmailOsContractError';
        this.code = code;
    }
}

const EMAIL_ADDRESS_PATTERN = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
const EVENT_TYPE_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const LOCAL_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const TAG_NAME_PATTERN = /^[a-z0-9_-]+$/;
const TAG_VALUE_PATTERN = /^[A-Za-z0-9 _.-]+$/;

function byteLength(value: string): number {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
    return value.length;
}

function requireBoundedString(value: unknown, maxLength: number, code: string): string {
    if (typeof value !== 'string' || value !== value.trim() || !value || value.length > maxLength || /[\r\n\0]/.test(value)) {
        throw new EmailOsContractError(code);
    }
    return value;
}

export function parseEmailOsMailbox(value: unknown): { mailbox: string; domain: string } {
    const input = requireBoundedString(value, EMAIL_OS_LIMITS.MAX_ADDRESS_LENGTH, 'EMAIL_OS_ADDRESS_INVALID');
    const bracketMatch = input.match(/<([^<>]+)>$/);
    const mailbox = String(bracketMatch?.[1] || input).trim().toLowerCase();
    if (!EMAIL_ADDRESS_PATTERN.test(mailbox) || mailbox.length > EMAIL_OS_LIMITS.MAX_ADDRESS_LENGTH) {
        throw new EmailOsContractError('EMAIL_OS_ADDRESS_INVALID');
    }
    const domain = mailbox.slice(mailbox.lastIndexOf('@') + 1);
    return { mailbox, domain };
}

export function assertEmailOsSenderDomain(value: unknown, allowedDomain: string): string {
    const normalizedAllowedDomain = requireBoundedString(
        allowedDomain.toLowerCase(),
        253,
        'EMAIL_OS_ALLOWED_FROM_DOMAIN_INVALID',
    );
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(normalizedAllowedDomain)) {
        throw new EmailOsContractError('EMAIL_OS_ALLOWED_FROM_DOMAIN_INVALID');
    }
    const parsed = parseEmailOsMailbox(value);
    if (parsed.domain !== normalizedAllowedDomain) {
        throw new EmailOsContractError('EMAIL_OS_SENDER_DOMAIN_REJECTED');
    }
    return typeof value === 'string' ? value : parsed.mailbox;
}

export function assertEmailOsEnvelope(value: EmailOsEnvelope): EmailOsEnvelope {
    const policy = EMAIL_OS_PRODUCT_POLICIES[value.productCode];
    if (!policy || !policy.directProviderSendAllowed) {
        throw new EmailOsContractError('EMAIL_OS_PRODUCT_SEND_PROHIBITED');
    }
    if (!policy.admittedClassifications.includes(value.classification)) {
        throw new EmailOsContractError('EMAIL_OS_CLASSIFICATION_REJECTED');
    }
    const eventType = requireBoundedString(value.eventType, EMAIL_OS_LIMITS.MAX_EVENT_TYPE_LENGTH, 'EMAIL_OS_EVENT_TYPE_INVALID');
    if (!EVENT_TYPE_PATTERN.test(eventType)) throw new EmailOsContractError('EMAIL_OS_EVENT_TYPE_INVALID');
    const localDeliveryReference = requireBoundedString(
        value.localDeliveryReference,
        EMAIL_OS_LIMITS.MAX_LOCAL_REFERENCE_LENGTH,
        'EMAIL_OS_LOCAL_REFERENCE_INVALID',
    );
    if (!LOCAL_REFERENCE_PATTERN.test(localDeliveryReference)) {
        throw new EmailOsContractError('EMAIL_OS_LOCAL_REFERENCE_INVALID');
    }
    parseEmailOsMailbox(value.from);
    parseEmailOsMailbox(value.to);
    if (value.replyTo) parseEmailOsMailbox(value.replyTo);
    const subject = requireBoundedString(value.subject, EMAIL_OS_LIMITS.MAX_SUBJECT_LENGTH, 'EMAIL_OS_SUBJECT_INVALID');
    if (!value.html || value.html.length > EMAIL_OS_LIMITS.MAX_HTML_LENGTH || byteLength(value.html) > EMAIL_OS_LIMITS.MAX_BODY_BYTES) {
        throw new EmailOsContractError('EMAIL_OS_HTML_INVALID');
    }
    if (!value.text || value.text.length > EMAIL_OS_LIMITS.MAX_PLAIN_TEXT_LENGTH || byteLength(value.text) > EMAIL_OS_LIMITS.MAX_BODY_BYTES) {
        throw new EmailOsContractError('EMAIL_OS_TEXT_INVALID');
    }
    const tags = Array.from(value.tags || []);
    if (tags.length > EMAIL_OS_LIMITS.MAX_TAG_COUNT) throw new EmailOsContractError('EMAIL_OS_TAGS_INVALID');
    for (const tag of tags) {
        if (
            !tag
            || typeof tag.name !== 'string'
            || tag.name === EMAIL_OS_DELIVERY_TAG_NAME
            || tag.name === EMAIL_OS_PRODUCT_TAG_NAME
            || tag.name.length < 1
            || tag.name.length > EMAIL_OS_LIMITS.MAX_TAG_NAME_LENGTH
            || !TAG_NAME_PATTERN.test(tag.name)
            || typeof tag.value !== 'string'
            || tag.value.length < 1
            || tag.value.length > EMAIL_OS_LIMITS.MAX_TAG_VALUE_LENGTH
            || !TAG_VALUE_PATTERN.test(tag.value)
        ) {
            throw new EmailOsContractError('EMAIL_OS_TAGS_INVALID');
        }
    }
    return {
        ...value,
        eventType,
        localDeliveryReference,
        subject,
        tags,
    };
}

export function buildEmailOsIdempotencyKey(
    envelope: Pick<EmailOsEnvelope, 'productCode' | 'eventType' | 'localDeliveryReference'>,
    sha256: (value: string) => string,
): string {
    const source = `${envelope.productCode}:${envelope.eventType}:${envelope.localDeliveryReference}`;
    const digest = sha256(source);
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new EmailOsContractError('EMAIL_OS_HASH_INVALID');
    return `email-os/${envelope.productCode.toLowerCase()}/${digest}`;
}

export function buildEmailOsRecipientHash(
    productCode: EmailOsProductCode,
    recipient: string,
    sha256: (value: string) => string,
): string {
    const digest = sha256(`${productCode}:${parseEmailOsMailbox(recipient).mailbox}`);
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new EmailOsContractError('EMAIL_OS_HASH_INVALID');
    return digest;
}

export function buildEmailOsProviderIdentityHash(value: string, sha256: (input: string) => string): string {
    const normalized = requireBoundedString(value, EMAIL_OS_LIMITS.MAX_PROVIDER_MESSAGE_ID_LENGTH, 'EMAIL_OS_PROVIDER_ID_INVALID');
    const digest = sha256(normalized);
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new EmailOsContractError('EMAIL_OS_HASH_INVALID');
    return digest;
}

export function shouldAdvanceEmailOsDeliveryStatus(
    currentStatus: EmailOsDeliveryStatus,
    nextStatus: EmailOsDeliveryStatus,
    currentOccurredAtMillis: number,
    nextOccurredAtMillis: number,
): boolean {
    const currentRank = EMAIL_OS_DELIVERY_STATUS_PRECEDENCE[currentStatus];
    const nextRank = EMAIL_OS_DELIVERY_STATUS_PRECEDENCE[nextStatus];
    if (nextRank > currentRank) return true;
    return nextRank === currentRank && nextOccurredAtMillis > currentOccurredAtMillis;
}

export function isEmailOsProviderEventBoundToProduct(
    event: Pick<EmailOsProviderEvent, 'productCode'>,
    expectedProductCode: EmailOsProductCode,
    hasMatchingDelivery: boolean,
): boolean {
    return hasMatchingDelivery && (event.productCode === null || event.productCode === expectedProductCode);
}

function readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function readProviderEventType(value: unknown): EmailOsProviderEventType {
    const admitted: readonly EmailOsProviderEventType[] = [
        'email.sent',
        'email.delivered',
        'email.delivery_delayed',
        'email.failed',
        'email.bounced',
        'email.complained',
        'email.suppressed',
        'suppression.added',
        'suppression.removed',
    ];
    if (typeof value !== 'string' || !admitted.includes(value as EmailOsProviderEventType)) {
        throw new EmailOsContractError('EMAIL_OS_PROVIDER_EVENT_TYPE_INVALID');
    }
    return value as EmailOsProviderEventType;
}

function readOptionalProviderString(value: unknown, maxLength: number): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value !== value.trim() || value.length > maxLength || /[\r\n\0]/.test(value)) {
        throw new EmailOsContractError('EMAIL_OS_PROVIDER_EVENT_INVALID');
    }
    return value;
}

export function normalizeEmailOsProviderEvent(value: unknown, providerEventId: string): EmailOsProviderEvent {
    const root = readRecord(value);
    if (!root) throw new EmailOsContractError('EMAIL_OS_PROVIDER_EVENT_INVALID');
    const eventType = readProviderEventType(root.type);
    const data = readRecord(root.data);
    if (!data) throw new EmailOsContractError('EMAIL_OS_PROVIDER_EVENT_INVALID');
    const occurredAt = requireBoundedString(
        root.created_at || data.created_at,
        64,
        'EMAIL_OS_PROVIDER_EVENT_TIME_INVALID',
    );
    const occurredAtMillis = Date.parse(occurredAt);
    if (
        !Number.isFinite(occurredAtMillis)
        || occurredAtMillis < Date.UTC(2020, 0, 1)
        || occurredAtMillis > Date.now() + 86_400_000
    ) throw new EmailOsContractError('EMAIL_OS_PROVIDER_EVENT_TIME_INVALID');

    const providerMessageId = readOptionalProviderString(
        data.email_id || data.source_id,
        EMAIL_OS_LIMITS.MAX_PROVIDER_MESSAGE_ID_LENGTH,
    );
    const recipientValue = Array.isArray(data.to) ? data.to[0] : data.email;
    const recipient = readOptionalProviderString(recipientValue, EMAIL_OS_LIMITS.MAX_ADDRESS_LENGTH);
    if (recipient) parseEmailOsMailbox(recipient);
    const tags = readRecord(data.tags);
    const localDeliveryIdValue = tags?.[EMAIL_OS_DELIVERY_TAG_NAME];
    const localDeliveryId = localDeliveryIdValue === undefined || localDeliveryIdValue === null
        ? null
        : typeof localDeliveryIdValue === 'string' && /^[a-f0-9]{64}$/.test(localDeliveryIdValue)
            ? localDeliveryIdValue
            : (() => { throw new EmailOsContractError('EMAIL_OS_PROVIDER_DELIVERY_TAG_INVALID'); })();
    const productCodeValue = tags?.[EMAIL_OS_PRODUCT_TAG_NAME];
    const productCode = productCodeValue === undefined || productCodeValue === null
        ? null
        : typeof productCodeValue === 'string' && productCodeValue in EMAIL_OS_PRODUCT_POLICIES
            ? productCodeValue as EmailOsProductCode
            : (() => { throw new EmailOsContractError('EMAIL_OS_PROVIDER_PRODUCT_TAG_INVALID'); })();

    const statusByType: Partial<Record<EmailOsProviderEventType, EmailOsDeliveryStatus>> = {
        'email.sent': 'sent',
        'email.delivered': 'delivered',
        'email.delivery_delayed': 'delivery_delayed',
        'email.failed': 'failed',
        'email.bounced': 'bounced',
        'email.complained': 'complained',
        'email.suppressed': 'suppressed',
    };
    const deliveryStatus = statusByType[eventType] || null;
    const suppressionAction = eventType === 'suppression.removed'
        ? 'deactivate'
        : ['email.bounced', 'email.complained', 'email.suppressed', 'suppression.added'].includes(eventType)
            ? 'activate'
            : null;
    const suppressionReason = eventType === 'email.bounced'
        ? 'bounce'
        : eventType === 'email.complained'
            ? 'complaint'
            : suppressionAction === 'activate'
                ? 'provider'
                : null;

    return {
        provider: EMAIL_OS_PROVIDER,
        eventType,
        providerEventId: requireBoundedString(
            providerEventId,
            EMAIL_OS_LIMITS.MAX_PROVIDER_EVENT_ID_LENGTH,
            'EMAIL_OS_PROVIDER_EVENT_ID_INVALID',
        ),
        providerMessageId,
        localDeliveryId,
        productCode,
        recipient,
        occurredAt,
        deliveryStatus,
        suppressionAction,
        suppressionReason,
    };
}
