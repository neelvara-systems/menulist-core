import { createHash } from 'crypto';
import { EventSeverity, INTEGRATION_EVENT_TYPES, IntegrationEventType } from './types';

const EVENT_TYPES = new Set<string>(Object.values(INTEGRATION_EVENT_TYPES));
const UNSAFE_PAYLOAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_FINGERPRINT_PAYLOAD_KEYS = 40;
const MAX_FINGERPRINT_ARRAY_ITEMS = 5;

function stablePayloadJson(payload: Record<string, unknown>): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

    const keys = Object.keys(payload).sort();
    if (keys.length > MAX_FINGERPRINT_PAYLOAD_KEYS) return null;
    const normalized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
        if (!key || key.length > 80 || UNSAFE_PAYLOAD_KEYS.has(key)) return null;
        const value = payload[key];
        if (
            typeof value === 'string'
            || typeof value === 'boolean'
            || value === null
            || (typeof value === 'number' && Number.isFinite(value))
        ) {
            normalized[key] = value;
            continue;
        }
        if (
            Array.isArray(value)
            && value.length <= MAX_FINGERPRINT_ARRAY_ITEMS
            && value.every((item) => (
            typeof item === 'string'
            || typeof item === 'boolean'
            || item === null
            || (typeof item === 'number' && Number.isFinite(item))
            ))
        ) {
            normalized[key] = value;
            continue;
        }
        return null;
    }

    return JSON.stringify(normalized);
}

export function buildIntegrationEventDocumentId(params: {
    tId: number;
    sId: number;
    eventType: string;
    deduplicationKey: string;
}): string | null {
    if (!Number.isSafeInteger(params.tId) || params.tId <= 0) return null;
    if (!Number.isSafeInteger(params.sId) || params.sId <= 0) return null;
    const eventType = params.eventType.trim();
    const deduplicationKey = params.deduplicationKey.trim();
    if (!EVENT_TYPES.has(eventType) || !deduplicationKey || deduplicationKey.length > 240) return null;
    const digest = createHash('sha256')
        .update(`${params.tId}:${params.sId}:${eventType}:${deduplicationKey}`)
        .digest('hex')
        .slice(0, 32);
    return `integration_${digest}`;
}

export function buildIntegrationEventFingerprint(params: {
    tId: number;
    sId: number;
    eventType: IntegrationEventType;
    severity: EventSeverity;
    payload: Record<string, unknown>;
}): string | null {
    if (!Number.isSafeInteger(params.tId) || params.tId <= 0) return null;
    if (!Number.isSafeInteger(params.sId) || params.sId <= 0) return null;
    if (!EVENT_TYPES.has(params.eventType)) return null;
    const payloadJson = stablePayloadJson(params.payload);
    if (payloadJson === null) return null;

    return createHash('sha256')
        .update(JSON.stringify({
            pId: 'AL',
            tId: params.tId,
            sId: params.sId,
            eventType: params.eventType,
            severity: params.severity,
            payload: payloadJson,
        }))
        .digest('hex');
}
