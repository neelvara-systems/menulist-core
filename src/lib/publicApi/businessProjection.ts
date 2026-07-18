import { normalizeBusinessAttributes } from '@lib/obp/businessAttributes';
import { getActiveTempStatus, type ActiveTempStatus } from '@lib/tempStatus/statusBoundary';

export type PublicTempStatus = ActiveTempStatus;

export function normalizePublicBusinessAttributes(value: unknown): Record<string, boolean> | null {
    const normalized = normalizeBusinessAttributes(value);
    return Object.keys(normalized).length > 0 ? normalized : null;
}

export function getActivePublicTempStatus(
    value: unknown,
    nowMs: number = Date.now(),
): PublicTempStatus | null {
    return getActiveTempStatus(value, nowMs);
}
