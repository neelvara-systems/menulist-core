import { DEFAULT_FOOD_BUSINESS_DAY_END_TIME, getAnalyticsSettlementCycleDateKey } from './businessDay';
import { isValidAnalyticsTimeZone } from './timeZoneDiagnostics';

const ANALYTICS_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const ANALYTICS_DATE_RANGE_MAX_DAYS = 3_660;

function formatParts(date: Date, timeZone?: string): { year: string; month: string; day: string; hour?: string; minute?: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: isValidAnalyticsTimeZone(timeZone, 'analytics_date_key') ? timeZone : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';
  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';

  return { year, month, day, hour, minute };
}

export function getAnalyticsDateKey(date: Date = new Date(), timeZone?: string): string {
  const { year, month, day } = formatParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function getAnalyticsHourKey(date: Date = new Date(), timeZone?: string): string {
  return formatParts(date, timeZone).hour || '00';
}

export function parseAnalyticsDateKey(dateKey: string): Date {
  const match = ANALYTICS_DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new RangeError('Invalid analytics date key.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new RangeError('Invalid analytics date key.');
  }
  return date;
}

export function formatAnalyticsDateKey(date: Date): string {
  let year: number;
  let month: string;
  let day: string;
  try {
    year = Date.prototype.getUTCFullYear.call(date);
    month = String(Date.prototype.getUTCMonth.call(date) + 1).padStart(2, '0');
    day = String(Date.prototype.getUTCDate.call(date)).padStart(2, '0');
  } catch {
    throw new RangeError('Invalid analytics date.');
  }
  if (!Number.isFinite(year)) throw new RangeError('Invalid analytics date.');
  return `${String(year).padStart(4, '0')}-${month}-${day}`;
}

export function addDaysToAnalyticsDateKey(dateKey: string, days: number): string {
  if (!Number.isSafeInteger(days) || Math.abs(days) > ANALYTICS_DATE_RANGE_MAX_DAYS) {
    throw new RangeError('Invalid analytics date offset.');
  }
  const date = parseAnalyticsDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatAnalyticsDateKey(date);
}

export function getAnalyticsDateRange(startDateKey: string, endDateKey: string): string[] {
  const start = parseAnalyticsDateKey(startDateKey);
  const end = parseAnalyticsDateKey(endDateKey);
  const dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (dayCount <= 0) return [];
  if (dayCount > ANALYTICS_DATE_RANGE_MAX_DAYS) {
    throw new RangeError('Analytics date range is too large.');
  }
  return Array.from({ length: dayCount }, (_, index) => (
    formatAnalyticsDateKey(new Date(start.getTime() + index * 86_400_000))
  ));
}

export function getAnalyticsWeekday(dateKey: string): number {
  return parseAnalyticsDateKey(dateKey).getUTCDay();
}

export function getAnalyticsISOWeek(dateKey: string): number {
  const date = parseAnalyticsDateKey(dateKey);
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Cache key for settled nightly analytics.
 *
 * Analytics settlement runs after the store's configured business day end. The
 * owner-facing settled dashboard should not invalidate at midnight because the
 * previous business day's rollup is not ready yet.
 */
export function getAnalyticsSchedulerCacheKey(
  date: Date = new Date(),
  timeZone?: string,
  cutoffHourOrBusinessDayEndTime: number | string = DEFAULT_FOOD_BUSINESS_DAY_END_TIME,
  cutoffMinute: number = 30,
): string {
  const { hour, minute } = formatParts(date, timeZone);
  const isBusinessDayCutoff = typeof cutoffHourOrBusinessDayEndTime === 'string';
  if (isBusinessDayCutoff) {
    return getAnalyticsSettlementCycleDateKey(date, timeZone, cutoffHourOrBusinessDayEndTime);
  }

  const localDateKey = getAnalyticsDateKey(date, timeZone);
  const localHour = Number(hour || '0');
  const localMinute = Number(minute || '0');

  const cutoffMinutes = Number(cutoffHourOrBusinessDayEndTime) * 60 + cutoffMinute;
  const localMinutes = localHour * 60 + localMinute;
  const isAfterSchedulerWindow = localMinutes >= cutoffMinutes;

  return isAfterSchedulerWindow
    ? localDateKey
    : addDaysToAnalyticsDateKey(localDateKey, -1);
}
