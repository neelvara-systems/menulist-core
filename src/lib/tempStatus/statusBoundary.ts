export const TEMP_STATUS_TYPES = [
    'closed_today',
    'opening_late',
    'closing_early',
    'kitchen_closed',
    'special_menu',
    'custom',
] as const;

export type TempStatusType = (typeof TEMP_STATUS_TYPES)[number];

export type ActiveTempStatus = Readonly<{
    expiresAt: string;
    message: string;
    type: TempStatusType;
}>;

export const TEMP_STATUS_MESSAGE_MAX_LENGTH = 100;

const TEMP_STATUS_TYPE_SET = new Set<string>(TEMP_STATUS_TYPES);
const DEFAULT_TEMP_STATUS_MESSAGES: Record<TempStatusType, string> = {
    closed_today: 'Closed today',
    opening_late: 'Opening late today',
    closing_early: 'Closing early today',
    kitchen_closed: 'Kitchen is closed',
    special_menu: 'Special menu available today',
    custom: 'Temporary notice',
};

export function normalizeTempStatusType(value: unknown): TempStatusType | null {
    return typeof value === 'string' && TEMP_STATUS_TYPE_SET.has(value)
        ? value as TempStatusType
        : null;
}

export function normalizeTempStatusMessage(type: TempStatusType, value: unknown): string {
    const normalized = typeof value === 'string'
        ? value
            .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, TEMP_STATUS_MESSAGE_MAX_LENGTH)
        : '';
    return normalized || DEFAULT_TEMP_STATUS_MESSAGES[type];
}

export function getActiveTempStatus(
    value: unknown,
    nowMs: number = Date.now(),
): ActiveTempStatus | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const status = value as Record<string, unknown>;
    const type = normalizeTempStatusType(status.type);
    if (!type || typeof status.expiresAt !== 'string') return null;

    const expiresAtMs = Date.parse(status.expiresAt);
    if (!Number.isFinite(nowMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;

    return {
        expiresAt: status.expiresAt,
        message: normalizeTempStatusMessage(type, status.message),
        type,
    };
}
