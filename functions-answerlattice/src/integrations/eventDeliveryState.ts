import { Timestamp } from 'firebase-admin/firestore';
import {
    ADAPTER_TYPES,
    AdapterType,
    EVENT_SEVERITY,
    EVENT_STATUS,
    INTEGRATION_EVENT_TYPES,
    IntegrationEvent,
    IntegrationEventType,
} from './types';
import { buildIntegrationEventFingerprint } from './eventIdentity';

const EVENT_TYPES = new Set<string>(Object.values(INTEGRATION_EVENT_TYPES));
const SEVERITIES = new Set<string>(Object.values(EVENT_SEVERITY));

function isFirestoreTimestamp(value: unknown): boolean {
    if (value instanceof Timestamp) return true;
    if (!value || typeof value !== 'object') return false;
    const candidate = value as { seconds?: unknown; nanoseconds?: unknown; toMillis?: unknown };
    return Number.isSafeInteger(candidate.seconds)
        && Number.isSafeInteger(candidate.nanoseconds)
        && Number(candidate.nanoseconds) >= 0
        && Number(candidate.nanoseconds) <= 999_999_999
        && typeof candidate.toMillis === 'function';
}

function timestampsMatch(left: unknown, right: unknown): boolean {
    if (!isFirestoreTimestamp(left) || !isFirestoreTimestamp(right)) return false;
    const leftTimestamp = left as { seconds: number; nanoseconds: number };
    const rightTimestamp = right as { seconds: number; nanoseconds: number };
    return leftTimestamp.seconds === rightTimestamp.seconds
        && leftTimestamp.nanoseconds === rightTimestamp.nanoseconds;
}

type ExpectedIntegrationEventContract = Pick<
    IntegrationEvent,
    'pId' | 'tId' | 'sId' | 'eventType' | 'severity' | 'payload' | 'createdAt'
>;

function hasValidOwnedIntegrationEventContract(
    data: Record<string, unknown>,
    expected: ExpectedIntegrationEventContract,
): boolean {
    if (
        expected.pId !== 'AL'
        || data.pId !== expected.pId
        || !Number.isSafeInteger(data.tId) || Number(data.tId) <= 0
        || !Number.isSafeInteger(data.sId) || Number(data.sId) <= 0
        || data.tId !== expected.tId
        || data.sId !== expected.sId
        || data.eventType !== expected.eventType
        || data.severity !== expected.severity
        || !EVENT_TYPES.has(String(data.eventType || ''))
        || !SEVERITIES.has(String(data.severity || ''))
        || !data.payload || typeof data.payload !== 'object' || Array.isArray(data.payload)
        || !timestampsMatch(data.createdAt, expected.createdAt)
        || (data.expiresAt !== undefined && !isFirestoreTimestamp(data.expiresAt))
    ) return false;

    const currentFingerprint = buildIntegrationEventFingerprint({
        tId: expected.tId,
        sId: expected.sId,
        eventType: expected.eventType,
        severity: expected.severity,
        payload: data.payload as Record<string, unknown>,
    });
    const expectedFingerprint = buildIntegrationEventFingerprint({
        tId: expected.tId,
        sId: expected.sId,
        eventType: expected.eventType,
        severity: expected.severity,
        payload: expected.payload,
    });
    if (!currentFingerprint || currentFingerprint !== expectedFingerprint) return false;

    return data.idempotencyFingerprint === undefined
        || data.idempotencyFingerprint === currentFingerprint;
}

export function isClaimableIntegrationEventDocument(
    value: unknown,
    expected: ExpectedIntegrationEventContract,
): boolean {
    if (!value || typeof value !== 'object') return false;
    const data = value as Record<string, unknown>;
    return hasValidOwnedIntegrationEventContract(data, expected)
        && data.status === EVENT_STATUS.PENDING;
}

export function isOwnedProcessingIntegrationEventDocument(
    value: unknown,
    expected: ExpectedIntegrationEventContract,
): boolean {
    if (!value || typeof value !== 'object') return false;
    const data = value as Record<string, unknown>;
    return hasValidOwnedIntegrationEventContract(data, expected)
        && data.status === EVENT_STATUS.PROCESSING;
}

export function resolveIntegrationEventCompletionStatus(
    result: { delivered: number; failed: number },
    anyAttempted: boolean,
): typeof EVENT_STATUS.DELIVERED | typeof EVENT_STATUS.FAILED {
    if (!anyAttempted) return EVENT_STATUS.DELIVERED;
    return result.delivered > 0 && result.failed === 0
        ? EVENT_STATUS.DELIVERED
        : EVENT_STATUS.FAILED;
}

export function shouldIntegrationAdapterReceiveEvent(params: {
    adapterType: AdapterType;
    eventType: IntegrationEventType;
    eventFilters: IntegrationEventType[];
    isOwnerConnectionTest: boolean;
}): boolean {
    if (
        params.isOwnerConnectionTest
        && (params.adapterType === ADAPTER_TYPES.SLACK || params.adapterType === ADAPTER_TYPES.EMAIL)
    ) return true;
    return params.eventFilters.length === 0 || params.eventFilters.includes(params.eventType);
}
