import { BUSINESS_ATTRIBUTE_CONFIG } from '@lib/obp/businessAttributes';

const PUBLIC_TEMP_STATUS_TYPES = new Set([
    'closed_today',
    'opening_late',
    'closing_early',
    'kitchen_closed',
    'special_menu',
    'custom',
] as const);

export type PublicTempStatus = {
    type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
    message?: string;
    expiresAt: string;
};

export function normalizePublicBusinessAttributes(value: unknown): Record<string, boolean> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const attributes = value as Record<string, unknown>;
    const normalized = Object.create(null) as Record<string, boolean>;

    BUSINESS_ATTRIBUTE_CONFIG.forEach(({ key }) => {
        if (typeof attributes[key] === 'boolean') normalized[key] = attributes[key];
    });

    return Object.keys(normalized).length > 0 ? { ...normalized } : null;
}

export function getActivePublicTempStatus(
    value: unknown,
    nowMs: number = Date.now(),
): PublicTempStatus | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const status = value as Record<string, unknown>;
    if (typeof status.type !== 'string' || !PUBLIC_TEMP_STATUS_TYPES.has(status.type as PublicTempStatus['type'])) {
        return null;
    }
    if (typeof status.expiresAt !== 'string') return null;

    const expiresAtMs = Date.parse(status.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;

    const message = typeof status.message === 'string'
        ? status.message.trim().slice(0, 100)
        : '';
    return {
        type: status.type as PublicTempStatus['type'],
        ...(message ? { message } : {}),
        expiresAt: status.expiresAt,
    };
}
