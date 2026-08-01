import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export type OwnerComplianceTab = 'privacy' | 'terms' | 'refund';
export type OwnerCompliancePageData = {
    content: string;
    customContent?: string;
    source: 'custom' | 'system';
    systemContent?: string;
} | null;
export type OwnerCompliancePagesState = Record<OwnerComplianceTab, OwnerCompliancePageData>;
export type OwnerComplianceScope = {
    key: string;
    storeId: string;
    tenantId: string;
};

const COMPLIANCE_PAGE_RESPONSE_TEXT_MAX_LENGTH = 30_000;

function normalizeExactDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    return raw === raw.trim() && isValidFirestoreDocumentId(raw) ? raw : null;
}

export function getOwnerComplianceScope(
    tenantId: unknown,
    storeId: unknown,
): OwnerComplianceScope | null {
    const normalizedTenantId = normalizeExactDocumentId(tenantId);
    const normalizedStoreId = normalizeExactDocumentId(storeId);
    if (!normalizedTenantId || !normalizedStoreId) return null;

    return {
        key: JSON.stringify([normalizedTenantId, normalizedStoreId]),
        storeId: normalizedStoreId,
        tenantId: normalizedTenantId,
    };
}

function readBoundedString(
    record: Record<string, unknown>,
    field: string,
    required: boolean,
): string | undefined | null {
    const value = record[field];
    if (value === undefined && !required) return undefined;
    if (typeof value !== 'string' || value.length > COMPLIANCE_PAGE_RESPONSE_TEXT_MAX_LENGTH) {
        return null;
    }
    return value;
}

function normalizePage(value: unknown): OwnerCompliancePageData | undefined {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object' || Array.isArray(value)) return undefined;

    const record = value as Record<string, unknown>;
    const content = readBoundedString(record, 'content', true);
    const customContent = readBoundedString(record, 'customContent', false);
    const systemContent = readBoundedString(record, 'systemContent', false);
    const source = record.source;
    if (
        typeof content !== 'string'
        || customContent === null
        || systemContent === null
        || (source !== 'custom' && source !== 'system')
    ) {
        return undefined;
    }

    return {
        content,
        ...(customContent === undefined ? {} : { customContent }),
        source,
        ...(systemContent === undefined ? {} : { systemContent }),
    };
}

export function normalizeOwnerComplianceLoadResponse(
    value: unknown,
    expectedScope: OwnerComplianceScope,
): OwnerCompliancePagesState | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (
        normalizeExactDocumentId(record.tenantId) !== expectedScope.tenantId
        || normalizeExactDocumentId(record.storeId) !== expectedScope.storeId
    ) {
        return null;
    }

    const privacy = normalizePage(record.privacy);
    const refund = normalizePage(record.refund);
    const terms = normalizePage(record.terms);
    if (privacy === undefined || refund === undefined || terms === undefined) return null;

    return { privacy, refund, terms };
}

export function isOwnerComplianceMutationScopeAcknowledged(
    value: { storeId?: unknown; tenantId?: unknown } | null,
    expectedScope: OwnerComplianceScope,
): boolean {
    return Boolean(
        value
        && normalizeExactDocumentId(value.tenantId) === expectedScope.tenantId
        && normalizeExactDocumentId(value.storeId) === expectedScope.storeId,
    );
}
