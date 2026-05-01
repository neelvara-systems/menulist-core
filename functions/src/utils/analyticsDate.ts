function isValidTimeZone(timeZone?: string): timeZone is string {
    if (!timeZone) return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function formatParts(date: Date, timeZone?: string): { year: string; month: string; day: string; hour?: string } {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value || '1970';
    const month = parts.find((part) => part.type === 'month')?.value || '01';
    const day = parts.find((part) => part.type === 'day')?.value || '01';
    const hour = parts.find((part) => part.type === 'hour')?.value || '00';

    return { year, month, day, hour };
}

export function getAnalyticsDateKey(date: Date = new Date(), timeZone?: string): string {
    const { year, month, day } = formatParts(date, timeZone);
    return `${year}-${month}-${day}`;
}

export function getAnalyticsHourKey(date: Date = new Date(), timeZone?: string): string {
    return formatParts(date, timeZone).hour || '00';
}

export function parseAnalyticsDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

export function formatAnalyticsDateKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function addDaysToAnalyticsDateKey(dateKey: string, days: number): string {
    const date = parseAnalyticsDateKey(dateKey);
    date.setUTCDate(date.getUTCDate() + days);
    return formatAnalyticsDateKey(date);
}

export function getAnalyticsDateRange(startDateKey: string, endDateKey: string): string[] {
    const dates: string[] = [];
    let currentKey = startDateKey;

    while (currentKey <= endDateKey) {
        dates.push(currentKey);
        currentKey = addDaysToAnalyticsDateKey(currentKey, 1);
    }

    return dates;
}

export function getAnalyticsWeekday(dateKey: string): number {
    return parseAnalyticsDateKey(dateKey).getUTCDay();
}
