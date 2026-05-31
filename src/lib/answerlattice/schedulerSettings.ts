export const ANSWERLATTICE_DEFAULT_TIME_ZONE = 'UTC';
export const ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME = '00:00';
export const ANSWERLATTICE_SETTLEMENT_BUFFER_MINUTES = 150;

export function isValidAnswerlatticeTimeZone(timeZone?: string): timeZone is string {
    if (!timeZone) return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

export function normalizeAnswerlatticeTimeZone(timeZone?: string): string {
    return isValidAnswerlatticeTimeZone(timeZone) ? timeZone : ANSWERLATTICE_DEFAULT_TIME_ZONE;
}

export function normalizeAnswerlatticeBusinessDayEndTime(value?: string): string {
    const input = String(value || '').trim();
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(input)
        ? input
        : ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME;
}

export function getAnswerlatticeSettlementLocalTime(businessDayEndTime?: string): string {
    const [hour, minute] = normalizeAnswerlatticeBusinessDayEndTime(businessDayEndTime)
        .split(':')
        .map(Number);
    const totalMinutes = ((hour || 0) * 60 + (minute || 0) + ANSWERLATTICE_SETTLEMENT_BUFFER_MINUTES) % (24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
