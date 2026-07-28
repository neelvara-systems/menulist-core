import { Timestamp } from 'firebase-admin/firestore';

export const MAX_OWNER_NOTIFICATION_REFERENCE_ID_LENGTH = 240;
export const MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS = 2;
export const MAX_OWNER_NOTIFICATION_EVENT_JSON_BYTES = 128 * 1024;
export const MAX_OWNER_NOTIFICATION_TRIGGER_TYPE_LENGTH = 120;
export const MAX_OWNER_NOTIFICATION_SOURCE_PATH_LENGTH = 320;
export const MAX_OWNER_NOTIFICATION_HINT_LENGTH = 320;

export type OwnerNotificationPersistedEventProjection = {
    productId: 'ML' | 'AL';
    triggerType: string;
    tenantId: string;
    storeId?: string;
    workspaceId?: string;
    referenceId: string;
    dedupeKey: string;
    recipientRole: 'primary_owner' | 'billing_owner' | 'support_owner' | 'whatsapp_owner';
    requestedChannels?: Array<'email' | 'whatsapp'>;
    recipientHints?: {
        email?: string;
        name?: string;
        whatsappNumber?: string;
    };
    metadata: Record<string, unknown>;
    priority: 'critical' | 'required' | 'advisory' | 'conversational';
    status: 'pending' | 'processing' | 'delivered' | 'partial' | 'failed' | 'skipped';
    source: {
        runtime: 'next' | 'functions' | 'functions-answerlattice';
        path: string;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
    expiresAt?: Timestamp;
    processingStartedAt?: Timestamp;
    processingAttempt?: number;
    processedAt?: Timestamp;
    retryCount?: 0 | 1;
    retriedAt?: Timestamp;
    error?: string | null;
};

export type OwnerNotificationRateLimitExpectation = {
    productId: 'ML' | 'AL';
    dateKey: string;
    kind: 'recipient' | 'store';
    channel?: 'email' | 'whatsapp';
    recipientHash?: string;
    tenantId?: string;
    storeId?: string;
};

export type OwnerNotificationDeliveryClaimDecision =
    | 'claim'
    | 'terminal'
    | 'ambiguous'
    | 'invalid';

export type OwnerNotificationNumericScopeDocumentId = {
    numericId: number;
    documentId: string;
};

const RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN = /^__.*__$/;
const OWNER_NOTIFICATION_WHATSAPP_CONSENT_GRANTED_STATUSES = new Set([
    'active',
    'granted',
    'verified',
]);
const OWNER_NOTIFICATION_WHATSAPP_CONSENT_REVOKED_STATUSES = new Set([
    'denied',
    'disabled',
    'inactive',
    'revoked',
    'withdrawn',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBoundedExactString(value: unknown, maxLength: number): value is string {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= maxLength
        && value === value.trim()
        && !/[\u0000-\u001f\u007f]/.test(value);
}

function projectTimestamp(value: unknown): Timestamp | null {
    if (!isRecord(value) || typeof value.toMillis !== 'function') return null;
    try {
        const millis = value.toMillis();
        return typeof millis === 'number' && Number.isSafeInteger(millis) && millis >= 0
            ? Timestamp.fromMillis(millis)
            : null;
    } catch {
        return null;
    }
}

function projectOptionalTimestamp(value: unknown): Timestamp | null | undefined {
    return value === undefined ? undefined : projectTimestamp(value);
}

function projectRecipientHints(value: unknown): OwnerNotificationPersistedEventProjection['recipientHints'] | null | undefined {
    if (value === undefined) return undefined;
    if (!isRecord(value)) return null;
    const allowedKeys = ['email', 'name', 'whatsappNumber'] as const;
    const allowedKeySet = new Set<string>(allowedKeys);
    if (Object.keys(value).some((key) => !allowedKeySet.has(key))) return null;
    const projected: NonNullable<OwnerNotificationPersistedEventProjection['recipientHints']> = {};
    for (const key of allowedKeys) {
        const candidate = value[key];
        if (candidate === undefined) continue;
        if (!isBoundedExactString(candidate, MAX_OWNER_NOTIFICATION_HINT_LENGTH)) return null;
        projected[key as keyof typeof projected] = candidate;
    }
    return Object.keys(projected).length > 0 ? projected : undefined;
}

function projectRequestedChannels(value: unknown): OwnerNotificationPersistedEventProjection['requestedChannels'] | null | undefined {
    if (value === undefined) return undefined;
    if (
        !Array.isArray(value)
        || value.length === 0
        || value.length > 2
        || value.some((channel) => channel !== 'email' && channel !== 'whatsapp')
        || new Set(value).size !== value.length
    ) return null;
    return value as Array<'email' | 'whatsapp'>;
}

export function hasOwnerNotificationWhatsAppConsent(settings: unknown): boolean {
    if (!isRecord(settings)) return false;
    const status = typeof settings.whatsappConsentStatus === 'string'
        ? settings.whatsappConsentStatus.trim().toLowerCase()
        : '';
    if (OWNER_NOTIFICATION_WHATSAPP_CONSENT_REVOKED_STATUSES.has(status)) return false;
    return OWNER_NOTIFICATION_WHATSAPP_CONSENT_GRANTED_STATUSES.has(status)
        || settings.whatsappConsent === true
        || settings.whatsappConsented === true;
}

export function isOwnerNotificationEventWithinByteLimit(value: unknown): boolean {
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === 'string'
            && new TextEncoder().encode(serialized).byteLength <= MAX_OWNER_NOTIFICATION_EVENT_JSON_BYTES;
    } catch {
        return false;
    }
}

export function normalizeOwnerNotificationDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    if (
        !raw
        || raw !== raw.trim()
        || raw === '.'
        || raw === '..'
        || raw.includes('/')
        || raw.includes('\0')
        || RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN.test(raw)
    ) return null;
    return raw;
}

export function normalizeOwnerNotificationDocumentIdAliases(
    values: readonly unknown[],
): string | null {
    const presentValues = values.filter((value) => value !== undefined && value !== null);
    if (presentValues.length === 0) return null;
    const normalized = presentValues.map(normalizeOwnerNotificationDocumentId);
    const expected = normalized[0];
    return expected && normalized.every((value) => value === expected)
        ? expected
        : null;
}

export function normalizeOwnerNotificationNumericScopeDocumentId(
    value: unknown,
): OwnerNotificationNumericScopeDocumentId | null {
    const documentId = normalizeOwnerNotificationDocumentId(value);
    if (!documentId || !/^[1-9]\d*$/.test(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

export function normalizeOwnerNotificationNumericScopeAliases(
    values: readonly unknown[],
): OwnerNotificationNumericScopeDocumentId | null {
    const documentId = normalizeOwnerNotificationDocumentIdAliases(values);
    return documentId ? normalizeOwnerNotificationNumericScopeDocumentId(documentId) : null;
}

export function normalizeOwnerNotificationReferenceId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    if (
        !value
        || value !== value.trim()
        || value.length > MAX_OWNER_NOTIFICATION_REFERENCE_ID_LENGTH
        || /[\u0000-\u001f\u007f]/.test(value)
    ) return null;
    return value;
}

export function projectOwnerNotificationPersistedEvent(
    value: unknown,
    expectedProductId: 'ML' | 'AL',
): OwnerNotificationPersistedEventProjection | null {
    if (!isRecord(value) || value.productId !== expectedProductId) return null;
    if (!isBoundedExactString(value.triggerType, MAX_OWNER_NOTIFICATION_TRIGGER_TYPE_LENGTH)) return null;

    const tenantId = expectedProductId === 'ML'
        ? normalizeOwnerNotificationNumericScopeDocumentId(value.tenantId)?.documentId
        : normalizeOwnerNotificationDocumentId(value.tenantId);
    const storeId = value.storeId === undefined
        ? undefined
        : expectedProductId === 'ML'
            ? normalizeOwnerNotificationNumericScopeDocumentId(value.storeId)?.documentId
            : normalizeOwnerNotificationDocumentId(value.storeId);
    const workspaceId = value.workspaceId === undefined
        ? undefined
        : normalizeOwnerNotificationDocumentId(value.workspaceId);
    if (
        !tenantId
        || (value.storeId !== undefined && !storeId)
        || (value.workspaceId !== undefined && !workspaceId)
        || (expectedProductId === 'ML' && (!storeId || workspaceId !== undefined))
        || (expectedProductId === 'AL' && !workspaceId && !storeId)
        || (workspaceId && storeId && workspaceId !== storeId)
    ) return null;

    const referenceId = normalizeOwnerNotificationReferenceId(value.referenceId);
    const scopeId = workspaceId || storeId || 'account';
    const expectedDedupeKey = [
        expectedProductId,
        value.triggerType,
        tenantId,
        scopeId,
        referenceId,
    ].join('|');
    if (!referenceId || value.dedupeKey !== expectedDedupeKey) return null;

    const recipientRoles = new Set([
        'primary_owner',
        'billing_owner',
        'support_owner',
        'whatsapp_owner',
    ]);
    const priorities = new Set(['critical', 'required', 'advisory', 'conversational']);
    const statuses = new Set(['pending', 'processing', 'delivered', 'partial', 'failed', 'skipped']);
    if (
        !recipientRoles.has(String(value.recipientRole))
        || !priorities.has(String(value.priority))
        || !statuses.has(String(value.status))
        || !isRecord(value.metadata)
        || !isRecord(value.source)
        || !['next', 'functions', 'functions-answerlattice'].includes(String(value.source.runtime))
        || !isBoundedExactString(value.source.path, MAX_OWNER_NOTIFICATION_SOURCE_PATH_LENGTH)
    ) return null;

    const requestedChannels = projectRequestedChannels(value.requestedChannels);
    const recipientHints = projectRecipientHints(value.recipientHints);
    if (requestedChannels === null || recipientHints === null) return null;

    const createdAt = projectTimestamp(value.createdAt);
    const updatedAt = projectTimestamp(value.updatedAt);
    const expiresAt = projectOptionalTimestamp(value.expiresAt);
    const processingStartedAt = projectOptionalTimestamp(value.processingStartedAt);
    const processedAt = projectOptionalTimestamp(value.processedAt);
    const retriedAt = projectOptionalTimestamp(value.retriedAt);
    if (
        !createdAt
        || !updatedAt
        || expiresAt === null
        || processingStartedAt === null
        || processedAt === null
        || retriedAt === null
    ) return null;

    const processingAttempt = value.processingAttempt === undefined
        ? undefined
        : typeof value.processingAttempt === 'number'
            && Number.isSafeInteger(value.processingAttempt)
            && value.processingAttempt >= 0
            && value.processingAttempt <= MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS
            ? value.processingAttempt
            : null;
    if (processingAttempt === null) return null;
    const retryCount = value.retryCount === undefined
        ? undefined
        : value.retryCount === 0 || value.retryCount === 1
            ? value.retryCount
            : null;
    if (retryCount === null || (retriedAt && retryCount !== 1)) return null;
    if (
        value.error !== undefined
        && value.error !== null
        && !isBoundedExactString(value.error, MAX_OWNER_NOTIFICATION_HINT_LENGTH)
    ) return null;

    const projection: OwnerNotificationPersistedEventProjection = {
        productId: expectedProductId,
        triggerType: value.triggerType,
        tenantId,
        ...(storeId ? { storeId } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        referenceId,
        dedupeKey: expectedDedupeKey,
        recipientRole: value.recipientRole as OwnerNotificationPersistedEventProjection['recipientRole'],
        ...(requestedChannels ? { requestedChannels } : {}),
        ...(recipientHints ? { recipientHints } : {}),
        metadata: value.metadata,
        priority: value.priority as OwnerNotificationPersistedEventProjection['priority'],
        status: value.status as OwnerNotificationPersistedEventProjection['status'],
        source: {
            runtime: value.source.runtime as OwnerNotificationPersistedEventProjection['source']['runtime'],
            path: value.source.path,
        },
        createdAt,
        updatedAt,
        ...(expiresAt ? { expiresAt } : {}),
        ...(processingStartedAt ? { processingStartedAt } : {}),
        ...(processingAttempt === undefined ? {} : { processingAttempt }),
        ...(processedAt ? { processedAt } : {}),
        ...(retryCount === undefined ? {} : { retryCount }),
        ...(retriedAt ? { retriedAt } : {}),
        ...(value.error === undefined ? {} : { error: value.error as string | null }),
    };
    return isOwnerNotificationEventWithinByteLimit(projection) ? projection : null;
}

export function projectOwnerNotificationRateLimitCount(
    value: unknown,
    expected: OwnerNotificationRateLimitExpectation,
): number | null {
    if (!isRecord(value) || value.productId !== expected.productId || value.dateKey !== expected.dateKey) {
        return null;
    }
    if (
        typeof value.count !== 'number'
        || !Number.isSafeInteger(value.count)
        || value.count < 0
        || !projectTimestamp(value.updatedAt)
    ) return null;

    if (expected.kind === 'store') {
        if (
            value.scope !== 'store'
            || value.tenantId !== expected.tenantId
            || value.storeId !== expected.storeId
        ) return null;
    } else if (
        value.channel !== expected.channel
        || value.recipientHash !== expected.recipientHash
    ) return null;
    return value.count;
}

export function getOwnerNotificationDeliveryClaimDecision(
    existingStatus: unknown,
    existingAttempt: unknown,
    requestedAttempt: number,
): OwnerNotificationDeliveryClaimDecision {
    if (
        !Number.isSafeInteger(requestedAttempt)
        || requestedAttempt < 1
        || requestedAttempt > MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS
    ) return 'invalid';
    if (existingStatus === undefined) return 'claim';
    if (
        typeof existingAttempt !== 'number'
        || !Number.isSafeInteger(existingAttempt)
        || existingAttempt < 1
        || existingAttempt > MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS
    ) return 'invalid';
    if (existingAttempt > requestedAttempt) return 'invalid';
    if (existingStatus === 'sent' || existingStatus === 'skipped' || existingStatus === 'rate_limited') {
        return 'terminal';
    }
    if (existingStatus === 'sending') return 'ambiguous';
    if (existingStatus === 'failed') {
        return requestedAttempt > existingAttempt ? 'claim' : 'terminal';
    }
    return 'invalid';
}

export function getNextOwnerNotificationProcessingAttempt(
    status: unknown,
    currentAttempt: unknown,
): number | null {
    if (status !== 'pending' && status !== 'failed') return null;
    const normalizedAttempt = currentAttempt === undefined
        ? 0
        : typeof currentAttempt === 'number'
            && Number.isSafeInteger(currentAttempt)
            && currentAttempt >= 0
            ? currentAttempt
            : null;
    if (
        normalizedAttempt === null
        || normalizedAttempt >= MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS
    ) return null;
    return normalizedAttempt + 1;
}
