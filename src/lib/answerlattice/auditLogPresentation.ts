import { PRODUCT_IDS } from '@constant/product';
import { Timestamp } from '@firebase/firestore';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type { AnswerlatticeAuditLog } from '@type/answerlattice';

const AUDIT_TEXT_MAX_LENGTH = 180;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const normalizeAuditText = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized.length <= AUDIT_TEXT_MAX_LENGTH ? normalized : null;
};

/**
 * Project persisted audit truth into the exact owner-facing contract.
 * Malformed or cross-scope legacy rows are omitted instead of being asserted
 * into React-facing types.
 */
export function parseAnswerlatticeAuditLog(
    documentId: unknown,
    value: unknown,
    expectedScope: Readonly<{ tId: number; sId: number }>,
): AnswerlatticeAuditLog | null {
    try {
        if (!isPlainRecord(value)) return null;
        const id = normalizeAuditText(documentId);
        const action = normalizeAuditText(value.action);
        const entityType = normalizeAuditText(value.entityType);
        const entityId = normalizeAuditText(value.entityId);
        const performedBy = normalizeAuditText(value.performedBy);
        if (
            !id
            || !isValidFirestoreDocumentId(id)
            || value.pId !== PRODUCT_IDS.ANSWERLATTICE
            || value.tId !== expectedScope.tId
            || value.sId !== expectedScope.sId
            || !action
            || !entityType
            || !entityId
            || !performedBy
            || !(value.timestamp instanceof Timestamp)
        ) {
            return null;
        }

        const previousState = value.previousState;
        const newState = value.newState;
        if (previousState !== undefined && previousState !== null && !isPlainRecord(previousState)) return null;
        if (newState !== undefined && newState !== null && !isPlainRecord(newState)) return null;
        const traceId = normalizeAuditText(value.traceId);
        const requestId = normalizeAuditText(value.requestId);

        return {
            id,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: expectedScope.tId,
            sId: expectedScope.sId,
            action,
            entityType,
            entityId,
            performedBy,
            timestamp: value.timestamp,
            ...(isPlainRecord(previousState) ? { previousState } : {}),
            ...(isPlainRecord(newState) ? { newState } : {}),
            ...(value.createdOn instanceof Timestamp ? { createdOn: value.createdOn } : {}),
            ...(traceId ? { traceId } : {}),
            ...(requestId ? { requestId } : {}),
        };
    } catch {
        return null;
    }
}

const toValidDate = (value: unknown): Date | null => {
    try {
        if (value instanceof Date) {
            return Number.isFinite(value.getTime()) ? value : null;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            const date = new Date(value);
            return Number.isFinite(date.getTime()) ? date : null;
        }
        if (typeof value === 'string' && value.trim()) {
            const date = new Date(value);
            return Number.isFinite(date.getTime()) ? date : null;
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const toDate = (value as { toDate?: unknown }).toDate;
        if (typeof toDate !== 'function') return null;
        const converted = toDate.call(value) as unknown;
        return converted instanceof Date && Number.isFinite(converted.getTime())
            ? converted
            : null;
    } catch {
        return null;
    }
};

export function formatAnswerlatticeAuditTimestamp(value: unknown): string {
    const date = toValidDate(value);
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const getBoundedText = (value: unknown): string | null => (
    typeof value === 'string' && value.trim()
        ? value.trim().slice(0, 500)
        : null
);

export function getAnswerlatticeAuditStateSummary(value: unknown): string {
    try {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
        const state = value as Record<string, unknown>;
        const reason = getBoundedText(state.reason);
        if (reason) return reason;
        const driftReason = getBoundedText(state.driftReason);
        if (driftReason) return driftReason;
        if (Array.isArray(state.driftClasses)) {
            const classes = state.driftClasses
                .map(getBoundedText)
                .filter((entry): entry is string => Boolean(entry))
                .slice(0, 10);
            if (classes.length > 0) return `Classes: ${classes.join(', ')}`;
        }
        const mutationType = getBoundedText(state.mutationType);
        return mutationType ? `Type: ${mutationType}` : '';
    } catch {
        return '';
    }
}
