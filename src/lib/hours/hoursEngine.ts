import { parseClockMinutes } from '@lib/menu/timeSlotPresetBoundary';
import { formatClockTime } from '@util/dateTime';
import {
    logHoursStatusInvalidTimeRange,
    logHoursStatusTimeZoneFallback,
} from './hoursDiagnostics';

/**
 * Canonical weekly-hours evaluator used by owner and public surfaces.
 *
 * A range belongs to the weekday on which it starts. For example, Friday
 * 22:00-02:00 remains open during the early hours of Saturday; Saturday's own
 * 22:00-02:00 range does not make the store open on Saturday morning.
 */

export type StoreStatus = {
    isOpen: boolean;
    statusText: string;
    nextChange?: string;
    currentDayHours?: string;
};

export const WORKING_HOURS_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WorkingHoursDayKey = (typeof WORKING_HOURS_DAY_KEYS)[number];

export type WorkingHoursRange = Readonly<{
    endMinutes: number;
    endTime: string;
    startMinutes: number;
    startTime: string;
}>;

const MINUTES_PER_DAY = 24 * 60;

function isWorkingHoursDayKey(value: string): value is WorkingHoursDayKey {
    return WORKING_HOURS_DAY_KEYS.includes(value as WorkingHoursDayKey);
}

function getDayKeyForDate(date: Date, timeZone?: string): WorkingHoursDayKey {
    try {
        const day = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone || 'UTC',
            weekday: 'short',
        }).format(date).toLowerCase();
        if (isWorkingHoursDayKey(day)) return day;
        throw new Error('working_hours_day_key_invalid');
    } catch (error) {
        logHoursStatusTimeZoneFallback(error, timeZone, 'hours_engine_day_key', 'local_day_key');
        return WORKING_HOURS_DAY_KEYS[date.getDay()];
    }
}

function getTimeForDate(date: Date, timeZone?: string): string {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            hour12: false,
            hourCycle: 'h23',
            minute: '2-digit',
            timeZone: timeZone || 'UTC',
        }).format(date);
    } catch (error) {
        logHoursStatusTimeZoneFallback(error, timeZone, 'hours_engine_time', 'local_time');
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
}

export function getStoreDayKey(timeZone?: string, now = new Date()): WorkingHoursDayKey {
    return getDayKeyForDate(now, timeZone);
}

export function normalizeWorkingHoursValue(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.toLowerCase() === 'closed') return '';

    const ranges = normalized.split(',').map((range) => range.trim());
    if (!ranges.length || ranges.some((range) => !range)) return null;

    const normalizedRanges: string[] = [];
    for (const range of ranges) {
        const match = /^((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)$/.exec(range);
        if (!match) return null;
        const startMinutes = parseClockMinutes(match[1]);
        const endMinutes = parseClockMinutes(match[2]);
        if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return null;
        normalizedRanges.push(`${match[1]}-${match[2]}`);
    }

    return normalizedRanges.join(', ');
}

export function parseWorkingHoursRanges(value: unknown): WorkingHoursRange[] {
    const normalized = normalizeWorkingHoursValue(value);
    if (!normalized) return [];

    return normalized.split(',').map((range) => {
        const [startTime, endTime] = range.trim().split('-');
        return {
            endMinutes: parseClockMinutes(endTime) as number,
            endTime,
            startMinutes: parseClockMinutes(startTime) as number,
            startTime,
        };
    });
}

function getDayOffset(day: WorkingHoursDayKey, offset: number): WorkingHoursDayKey {
    const index = WORKING_HOURS_DAY_KEYS.indexOf(day);
    return WORKING_HOURS_DAY_KEYS[(index + offset + WORKING_HOURS_DAY_KEYS.length) % WORKING_HOURS_DAY_KEYS.length];
}

function getRangesForDay(
    workingHours: Record<string, string>,
    day: WorkingHoursDayKey,
    surface: Parameters<typeof logHoursStatusInvalidTimeRange>[2],
): { configuredInvalid: boolean; ranges: WorkingHoursRange[] } {
    const source = workingHours[day];
    if (source !== undefined && typeof source !== 'string') {
        logHoursStatusInvalidTimeRange(day, undefined, surface);
        return { configuredInvalid: true, ranges: [] };
    }
    const normalized = normalizeWorkingHoursValue(source);
    if (source && source.trim() && source.trim().toLowerCase() !== 'closed' && normalized === null) {
        logHoursStatusInvalidTimeRange(day, source, surface);
        return { configuredInvalid: true, ranges: [] };
    }
    return { configuredInvalid: false, ranges: parseWorkingHoursRanges(source) };
}

function formatRange(range: WorkingHoursRange, timeFormat?: string): string {
    return `${formatClockTime(range.startTime, timeFormat)} - ${formatClockTime(range.endTime, timeFormat)}`;
}

function getDayDisplayName(day: WorkingHoursDayKey): string {
    const names: Record<WorkingHoursDayKey, string> = {
        fri: 'Friday',
        mon: 'Monday',
        sat: 'Saturday',
        sun: 'Sunday',
        thu: 'Thursday',
        tue: 'Tuesday',
        wed: 'Wednesday',
    };
    return names[day];
}

function findNextOpenTime(
    workingHours: Record<string, string>,
    currentDay: WorkingHoursDayKey,
    currentMinutes: number,
    timeFormat?: string,
): string | undefined {
    const laterToday = getRangesForDay(workingHours, currentDay, 'hours_engine_next_open')
        .ranges
        .filter((range) => range.startMinutes > currentMinutes)
        .sort((left, right) => left.startMinutes - right.startMinutes)[0];
    if (laterToday) return `Opens at ${formatClockTime(laterToday.startTime, timeFormat)}`;

    for (let offset = 1; offset <= 7; offset += 1) {
        const day = getDayOffset(currentDay, offset);
        const firstRange = getRangesForDay(workingHours, day, 'hours_engine_next_open')
            .ranges
            .sort((left, right) => left.startMinutes - right.startMinutes)[0];
        if (!firstRange) continue;
        const opensAt = formatClockTime(firstRange.startTime, timeFormat);
        return offset === 1
            ? `Opens tomorrow at ${opensAt}`
            : offset === 7
                ? `Opens next ${getDayDisplayName(day)} at ${opensAt}`
                : `Opens ${getDayDisplayName(day)} at ${opensAt}`;
    }

    return undefined;
}

type ActiveRange = Readonly<{
    closeDelta: number;
    range: WorkingHoursRange;
}>;

type ScheduleInterval = Readonly<{
    end: number;
    range: WorkingHoursRange;
    start: number;
}>;

function getActiveRanges(
    workingHours: Record<string, string>,
    currentDay: WorkingHoursDayKey,
    currentMinutes: number,
): ActiveRange[] {
    const previousDay = getDayOffset(currentDay, -1);
    const previousIntervals = getRangesForDay(workingHours, previousDay, 'hours_engine_current_status')
        .ranges
        .filter((range) => range.endMinutes < range.startMinutes)
        .map((range): ScheduleInterval => ({
            end: range.endMinutes,
            range,
            start: range.startMinutes - MINUTES_PER_DAY,
        }));

    const todayIntervals = getRangesForDay(workingHours, currentDay, 'hours_engine_current_status')
        .ranges
        .map((range): ScheduleInterval => ({
            end: range.endMinutes < range.startMinutes
                ? range.endMinutes + MINUTES_PER_DAY
                : range.endMinutes,
            range,
            start: range.startMinutes,
        }));

    const intervals = [...previousIntervals, ...todayIntervals]
        .sort((left, right) => left.start - right.start || left.end - right.end);
    const activeIndex = intervals.findIndex((interval) => (
        interval.start <= currentMinutes && currentMinutes < interval.end
    ));
    if (activeIndex === -1) return [];

    let closeAt = intervals[activeIndex].end;
    let closingRange = intervals[activeIndex].range;
    for (let index = activeIndex + 1; index < intervals.length; index += 1) {
        const interval = intervals[index];
        if (interval.start > closeAt) break;
        if (interval.end > closeAt) {
            closeAt = interval.end;
            closingRange = interval.range;
        }
    }

    return [{ closeDelta: closeAt - currentMinutes, range: closingRange }];
}

export function getStoreStatus(
    workingHours?: Record<string, string>,
    timeZone?: string,
    timeFormat?: string,
    now = new Date(),
): StoreStatus {
    if (!workingHours || Array.isArray(workingHours) || Object.keys(workingHours).length === 0) {
        return { isOpen: false, statusText: 'Hours not available' };
    }

    const currentDay = getDayKeyForDate(now, timeZone);
    const currentMinutes = parseClockMinutes(getTimeForDate(now, timeZone));
    if (currentMinutes === null) {
        return { isOpen: false, statusText: 'Hours not available' };
    }

    const today = getRangesForDay(workingHours, currentDay, 'hours_engine_current_status');
    const currentDayHours = today.ranges.length
        ? today.ranges.map((range) => formatRange(range, timeFormat)).join(', ')
        : undefined;
    const active = getActiveRanges(workingHours, currentDay, currentMinutes)[0];
    if (active) {
        return {
            currentDayHours: formatRange(active.range, timeFormat),
            isOpen: true,
            nextChange: `Closes at ${formatClockTime(active.range.endTime, timeFormat)}`,
            statusText: 'Open',
        };
    }

    if (today.configuredInvalid) {
        return { isOpen: false, statusText: 'Hours not available' };
    }

    return {
        currentDayHours,
        isOpen: false,
        nextChange: findNextOpenTime(workingHours, currentDay, currentMinutes, timeFormat),
        statusText: 'Closed',
    };
}

/**
 * Minutes until the next boundary that occurs during the current store day.
 * This includes the close of a previous-day overnight range and a later opening
 * today, but deliberately does not announce tomorrow's schedule as urgent.
 */
export function getMinutesUntilStoreStatusChange(
    workingHours?: Record<string, string>,
    timeZone?: string,
    now = new Date(),
): number | null {
    if (!workingHours || Array.isArray(workingHours) || Object.keys(workingHours).length === 0) return null;

    const currentDay = getDayKeyForDate(now, timeZone);
    const currentMinutes = parseClockMinutes(getTimeForDate(now, timeZone));
    if (currentMinutes === null) return null;

    const active = getActiveRanges(workingHours, currentDay, currentMinutes)[0];
    if (active) return active.closeDelta;

    const nextToday = getRangesForDay(workingHours, currentDay, 'hours_engine_next_change')
        .ranges
        .filter((range) => range.startMinutes > currentMinutes)
        .map((range) => range.startMinutes - currentMinutes)
        .sort((left, right) => left - right)[0];
    return nextToday ?? null;
}

export function useStoreStatus(
    workingHours?: Record<string, string>,
    timeZone?: string,
    timeFormat?: string,
): StoreStatus {
    return getStoreStatus(workingHours, timeZone, timeFormat);
}
