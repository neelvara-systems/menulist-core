export const CANONICA_DEFAULT_TIME_ZONE = 'UTC';
export const CANONICA_DEFAULT_BUSINESS_DAY_END_TIME = '00:00';

export function isValidCanonicaTimeZone(timeZone?: string): timeZone is string {
    if (!timeZone) return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

export function normalizeCanonicaTimeZone(timeZone?: string): string {
    return isValidCanonicaTimeZone(timeZone) ? timeZone : CANONICA_DEFAULT_TIME_ZONE;
}

export function normalizeCanonicaBusinessDayEndTime(value?: string): string {
    const input = String(value || '').trim();
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(input)
        ? input
        : CANONICA_DEFAULT_BUSINESS_DAY_END_TIME;
}
