import { normalizeSurfaceKey, normalizeSurfaceRoutePattern, normalizeSurfaceToken } from './productSurfaceContent';
import type { AnswerlatticeWidgetRuntimeStatus } from '@type/answerlattice';
import * as admin from 'firebase-admin';
import type { NextRequest } from 'next/server';

const TELEMETRY_WRITE_INTERVAL_MS = 15 * 60 * 1000;
const TELEMETRY_CHANGE_WRITE_MIN_INTERVAL_MS = 60 * 1000;
const MAX_TELEMETRY_FIELD_LENGTH = 120;

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePath = (value: string | null): string | null => {
    const normalized = normalizeSurfaceRoutePattern(value || '');
    if (!normalized || normalized === '*') return null;
    return normalized.slice(0, 180);
};

const normalizeOrigin = (value: string | null): string | null => {
    if (!value) return null;
    try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return parsed.origin.slice(0, 180);
    } catch {
        return null;
    }
};

const detectUserAgentFamily = (userAgent: string | null): string | null => {
    const value = String(userAgent || '').toLowerCase();
    if (!value) return null;
    if (value.includes('edg/')) return 'edge';
    if (value.includes('chrome/') || value.includes('crios/')) return 'chrome';
    if (value.includes('firefox/') || value.includes('fxios/')) return 'firefox';
    if (value.includes('safari/')) return 'safari';
    return 'other';
};

export function sanitizeWidgetRuntimeTelemetry(request: NextRequest): Omit<AnswerlatticeWidgetRuntimeStatus, 'lastSeenAt' | 'seenCount'> {
    const params = request.nextUrl.searchParams;
    const requestOrigin = request.headers.get('origin') || request.nextUrl.origin;

    return {
        lastOrigin: normalizeOrigin(requestOrigin),
        lastPath: normalizePath(params.get('path')),
        lastContextKey: normalizeSurfaceKey(params.get('contextKey')).slice(0, MAX_TELEMETRY_FIELD_LENGTH) || null,
        lastFeature: normalizeSurfaceToken(params.get('feature'), MAX_TELEMETRY_FIELD_LENGTH) || null,
        lastPage: normalizeSurfaceToken(params.get('page'), MAX_TELEMETRY_FIELD_LENGTH) || null,
        userAgentFamily: detectUserAgentFamily(request.headers.get('user-agent')),
    };
}

export function getWidgetRuntimeStatusFromStoreData(storeData: Record<string, any>): AnswerlatticeWidgetRuntimeStatus | null {
    const value = storeData?.widgetRuntimeStatus;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    return {
        lastSeenAt: value.lastSeenAt || null,
        lastOrigin: typeof value.lastOrigin === 'string' ? value.lastOrigin : null,
        lastPath: typeof value.lastPath === 'string' ? value.lastPath : null,
        lastContextKey: typeof value.lastContextKey === 'string' ? value.lastContextKey : null,
        lastFeature: typeof value.lastFeature === 'string' ? value.lastFeature : null,
        lastPage: typeof value.lastPage === 'string' ? value.lastPage : null,
        userAgentFamily: typeof value.userAgentFamily === 'string' ? value.userAgentFamily : null,
        seenCount: typeof value.seenCount === 'number'
            && Number.isSafeInteger(value.seenCount)
            && value.seenCount >= 0
            && value.seenCount <= 1_000_000_000
            ? value.seenCount
            : 0,
    };
}

export function shouldUpdateWidgetRuntimeStatus(
    existing: AnswerlatticeWidgetRuntimeStatus | null,
    next: Omit<AnswerlatticeWidgetRuntimeStatus, 'lastSeenAt' | 'seenCount'>,
): boolean {
    if (!existing?.lastSeenAt) return true;

    const lastSeen = getTimestampMillis(existing.lastSeenAt);
    if (!lastSeen) return true;

    const ageMs = Date.now() - lastSeen;
    const telemetryChanged = (
        existing.lastOrigin !== next.lastOrigin
        || existing.lastPath !== next.lastPath
        || existing.lastContextKey !== next.lastContextKey
        || existing.lastFeature !== next.lastFeature
        || existing.lastPage !== next.lastPage
        || existing.userAgentFamily !== next.userAgentFamily
    );

    if (telemetryChanged && ageMs >= TELEMETRY_CHANGE_WRITE_MIN_INTERVAL_MS) return true;
    return ageMs >= TELEMETRY_WRITE_INTERVAL_MS;
}

export function buildWidgetRuntimeStatusWrite(
    next: Omit<AnswerlatticeWidgetRuntimeStatus, 'lastSeenAt' | 'seenCount'>,
) {
    return {
        widgetRuntimeStatus: {
            ...next,
            lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
            seenCount: admin.firestore.FieldValue.increment(1),
        },
    };
}
