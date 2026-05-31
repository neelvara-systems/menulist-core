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

export function parseAnswerlatticeBusinessDayEndMinutes(value?: string): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

export function normalizeAnswerlatticeBusinessDayEndTime(value?: string): string {
    return parseAnswerlatticeBusinessDayEndMinutes(value) === null
        ? ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME
        : String(value).trim();
}

function formatLocalParts(date: Date, timeZone?: string): {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
} {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: isValidAnswerlatticeTimeZone(timeZone) ? timeZone : ANSWERLATTICE_DEFAULT_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    return {
        year: parts.find(part => part.type === 'year')?.value || '1970',
        month: parts.find(part => part.type === 'month')?.value || '01',
        day: parts.find(part => part.type === 'day')?.value || '01',
        hour: parts.find(part => part.type === 'hour')?.value || '00',
        minute: parts.find(part => part.type === 'minute')?.value || '00',
    };
}

export function shiftAnswerlatticeDateKey(dateKey: string, days: number): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

export function getAnswerlatticeSettlementLocalMinutes(businessDayEndTime?: string): number {
    const endMinutes = parseAnswerlatticeBusinessDayEndMinutes(businessDayEndTime)
        ?? parseAnswerlatticeBusinessDayEndMinutes(ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME)!;
    return (endMinutes + ANSWERLATTICE_SETTLEMENT_BUFFER_MINUTES) % (24 * 60);
}

export function isAnswerlatticeSettlementDue(
    date: Date,
    timeZone?: string,
    businessDayEndTime?: string,
): boolean {
    const dueMinutes = getAnswerlatticeSettlementLocalMinutes(businessDayEndTime);
    const parts = formatLocalParts(date, timeZone);
    const localMinutes = Number(parts.hour) * 60 + Number(parts.minute);

    for (let offset = 0; offset < 60; offset++) {
        if ((dueMinutes + offset) % (24 * 60) === localMinutes) return true;
    }

    return false;
}

export function getAnswerlatticeLatestSettledLocalDateKey(
    date: Date,
    timeZone?: string,
    businessDayEndTime?: string,
): string {
    const parts = formatLocalParts(date, timeZone);
    const localDateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const settlementMinutes = getAnswerlatticeSettlementLocalMinutes(businessDayEndTime);
    const localMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    const settlementCycleDate = localMinutes >= settlementMinutes
        ? localDateKey
        : shiftAnswerlatticeDateKey(localDateKey, -1);
    const endMinutes = parseAnswerlatticeBusinessDayEndMinutes(businessDayEndTime)
        ?? parseAnswerlatticeBusinessDayEndMinutes(ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME)!;
    return shiftAnswerlatticeDateKey(settlementCycleDate, endMinutes + ANSWERLATTICE_SETTLEMENT_BUFFER_MINUTES >= 24 * 60 ? -2 : -1);
}
