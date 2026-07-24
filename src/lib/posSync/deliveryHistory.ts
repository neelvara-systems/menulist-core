import type { DeliveryLogStatus } from './types';

const DELIVERY_ID_PATTERN = /^del_[a-z0-9]+_[a-f0-9]{12}$/;
const DELIVERY_STATUSES = new Set<DeliveryLogStatus>(['success', 'failed', 'timeout']);

export interface PosDeliveryHistoryEntry {
    deliveryId: string;
    menuVersion: number;
    status: DeliveryLogStatus;
    responseCode: number | null;
    attempt: number;
    sentAt: string;
    duration: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value) && typeof value === 'number' && value > 0;
}

function parseTimestamp(value: unknown): string | null {
    if (!isRecord(value) || typeof value.toDate !== 'function') return null;
    try {
        const date = value.toDate();
        if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
        return date.toISOString();
    } catch {
        return null;
    }
}

/**
 * Projects the server-owned delivery-log document into the owner-visible shape.
 * Internal error text, payload hashes, payload sizes, and unknown fields are
 * deliberately excluded from the result.
 */
export function parsePosDeliveryHistoryEntry(
    documentId: string,
    value: unknown,
): PosDeliveryHistoryEntry | null {
    if (!DELIVERY_ID_PATTERN.test(documentId) || !isRecord(value)) return null;

    const storedDeliveryId = value.deliveryId;
    if (storedDeliveryId !== undefined && storedDeliveryId !== documentId) return null;
    if (!isNonNegativeSafeInteger(value.menuVersion)) return null;
    if (typeof value.status !== 'string' || !DELIVERY_STATUSES.has(value.status as DeliveryLogStatus)) {
        return null;
    }
    const responseCode = value.responseCode;
    let normalizedResponseCode: number | null;
    if (responseCode === null) normalizedResponseCode = null;
    else if (isPositiveSafeInteger(responseCode) && responseCode >= 100 && responseCode <= 599) {
        normalizedResponseCode = responseCode;
    } else return null;
    if (!isPositiveSafeInteger(value.attempt)) return null;
    if (!isNonNegativeSafeInteger(value.duration)) return null;

    const sentAt = parseTimestamp(value.sentAt);
    if (!sentAt) return null;

    return {
        deliveryId: documentId,
        menuVersion: value.menuVersion,
        status: value.status as DeliveryLogStatus,
        responseCode: normalizedResponseCode,
        attempt: value.attempt,
        sentAt,
        duration: value.duration,
    };
}
