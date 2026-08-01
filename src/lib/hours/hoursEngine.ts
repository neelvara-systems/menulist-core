import { defaultTimezone } from '@lib/localization/config';
import { parseClockMinutes } from '@lib/menu/timeSlotPresetBoundary';
import { formatClockTime } from '@util/dateTime';
import {
    logHoursStatusInvalidTimeRange,
    logHoursStatusTimeZoneFallback,
} from './hoursDiagnostics';
import type { StoreSpecialHours, StoreSpecialHoursEntry } from '@type/platform/store';
import {
    addDaysToSpecialHoursDateKey,
    getSpecialHoursEntry,
    getStoreLocalDateKey,
    normalizeWorkingHoursValue,
    parseWorkingHoursRanges,
    type WorkingHoursRange,
} from './hoursBoundary';

export {
    getStoreLocalDateKey,
    normalizeWorkingHoursValue,
    parseWorkingHoursRanges,
} from './hoursBoundary';
export type { WorkingHoursRange } from './hoursBoundary';

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
    isSpecialHours?: boolean;
    localDate?: string;
    specialHoursLabel?: string;
};

export const WORKING_HOURS_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WorkingHoursDayKey = (typeof WORKING_HOURS_DAY_KEYS)[number];

const MINUTES_PER_DAY = 24 * 60;

function isWorkingHoursDayKey(value: string): value is WorkingHoursDayKey {
    return WORKING_HOURS_DAY_KEYS.includes(value as WorkingHoursDayKey);
}

function getDayKeyForDate(date: Date, timeZone?: string): WorkingHoursDayKey {
    try {
        const day = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone || defaultTimezone,
            weekday: 'short',
        }).format(date).toLowerCase();
        if (isWorkingHoursDayKey(day)) return day;
        throw new Error('working_hours_day_key_invalid');
    } catch (error) {
        logHoursStatusTimeZoneFallback(error, timeZone, 'hours_engine_day_key', 'default_time_zone');
        const fallbackDay = new Intl.DateTimeFormat('en-US', {
            timeZone: defaultTimezone,
            weekday: 'short',
        }).format(date).toLowerCase();
        return isWorkingHoursDayKey(fallbackDay)
            ? fallbackDay
            : WORKING_HOURS_DAY_KEYS[date.getUTCDay()];
    }
}

function getTimeForDate(date: Date, timeZone?: string): string {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            hour12: false,
            hourCycle: 'h23',
            minute: '2-digit',
            timeZone: timeZone || defaultTimezone,
        }).format(date);
    } catch (error) {
        logHoursStatusTimeZoneFallback(error, timeZone, 'hours_engine_time', 'default_time_zone');
        return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            hour12: false,
            hourCycle: 'h23',
            minute: '2-digit',
            timeZone: defaultTimezone,
        }).format(date);
    }
}

export function getStoreDayKey(timeZone?: string, now = new Date()): WorkingHoursDayKey {
    return getDayKeyForDate(now, timeZone);
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

function getRangesForValue(
    value: unknown,
    diagnosticKey: string,
    surface: Parameters<typeof logHoursStatusInvalidTimeRange>[2],
): { configuredInvalid: boolean; ranges: WorkingHoursRange[] } {
    if (value !== undefined && typeof value !== 'string') {
        logHoursStatusInvalidTimeRange(diagnosticKey, undefined, surface);
        return { configuredInvalid: true, ranges: [] };
    }
    const normalized = normalizeWorkingHoursValue(value);
    if (
        typeof value === 'string'
        && value.trim()
        && value.trim().toLowerCase() !== 'closed'
        && normalized === null
    ) {
        logHoursStatusInvalidTimeRange(diagnosticKey, value, surface);
        return { configuredInvalid: true, ranges: [] };
    }
    return { configuredInvalid: false, ranges: parseWorkingHoursRanges(value) };
}

type EffectiveDateHours = Readonly<{
    entry?: StoreSpecialHoursEntry;
    isSpecial: boolean;
    source: unknown;
}>;

function getEffectiveDateHours(
    workingHours: Record<string, string> | undefined,
    specialHours: StoreSpecialHours | undefined,
    dateKey: string,
    day: WorkingHoursDayKey,
): EffectiveDateHours {
    const entry = getSpecialHoursEntry(specialHours, dateKey);
    return entry
        ? { entry, isSpecial: true, source: entry.hours }
        : { isSpecial: false, source: workingHours?.[day] };
}

function hasPreviousDateOvernightSpecialHours(
    specialHours: StoreSpecialHours | undefined,
    currentDateKey: string,
): boolean {
    const previousDateKey = addDaysToSpecialHoursDateKey(currentDateKey, -1);
    const previousSpecialEntry = previousDateKey
        ? getSpecialHoursEntry(specialHours, previousDateKey)
        : undefined;
    return parseWorkingHoursRanges(previousSpecialEntry?.hours)
        .some((range) => range.endMinutes < range.startMinutes);
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
    workingHours: Record<string, string> | undefined,
    specialHours: StoreSpecialHours | undefined,
    currentDateKey: string,
    currentDay: WorkingHoursDayKey,
    currentMinutes: number,
    timeFormat?: string,
): string | undefined {
    const today = getEffectiveDateHours(workingHours, specialHours, currentDateKey, currentDay);
    const laterToday = getRangesForValue(today.source, currentDateKey, 'hours_engine_next_open')
        .ranges
        .filter((range) => range.startMinutes > currentMinutes)
        .sort((left, right) => left.startMinutes - right.startMinutes)[0];
    if (laterToday) return `Opens at ${formatClockTime(laterToday.startTime, timeFormat)}`;

    for (let offset = 1; offset <= 370; offset += 1) {
        const day = getDayOffset(currentDay, offset);
        const dateKey = addDaysToSpecialHoursDateKey(currentDateKey, offset);
        if (!dateKey) return undefined;
        const effective = getEffectiveDateHours(workingHours, specialHours, dateKey, day);
        const firstRange = getRangesForValue(effective.source, dateKey, 'hours_engine_next_open')
            .ranges
            .sort((left, right) => left.startMinutes - right.startMinutes)[0];
        if (!firstRange) continue;
        const opensAt = formatClockTime(firstRange.startTime, timeFormat);
        return offset === 1
            ? `Opens tomorrow at ${opensAt}`
            : offset === 7
                ? `Opens next ${getDayDisplayName(day)} at ${opensAt}`
                : offset < 7
                    ? `Opens ${getDayDisplayName(day)} at ${opensAt}`
                    : `Opens ${dateKey} at ${opensAt}`;
    }

    return undefined;
}

type ActiveRange = Readonly<{
    closeDelta: number;
    entry?: StoreSpecialHoursEntry;
    isSpecial: boolean;
    range: WorkingHoursRange;
}>;

type ScheduleInterval = Readonly<{
    end: number;
    entry?: StoreSpecialHoursEntry;
    isSpecial: boolean;
    range: WorkingHoursRange;
    start: number;
}>;

function getActiveRanges(
    workingHours: Record<string, string> | undefined,
    specialHours: StoreSpecialHours | undefined,
    currentDateKey: string,
    currentDay: WorkingHoursDayKey,
    currentMinutes: number,
): ActiveRange[] {
    const previousDay = getDayOffset(currentDay, -1);
    const previousDateKey = addDaysToSpecialHoursDateKey(currentDateKey, -1);
    const currentSpecialEntry = getSpecialHoursEntry(specialHours, currentDateKey);
    const previousEffective = previousDateKey
        ? getEffectiveDateHours(workingHours, specialHours, previousDateKey, previousDay)
        : undefined;
    const previousIntervals = currentSpecialEntry || !previousEffective
        ? []
        : getRangesForValue(previousEffective.source, previousDateKey || previousDay, 'hours_engine_current_status')
        .ranges
        .filter((range) => range.endMinutes < range.startMinutes)
        .map((range): ScheduleInterval => ({
            end: range.endMinutes,
            entry: previousEffective.entry,
            isSpecial: previousEffective.isSpecial,
            range,
            start: range.startMinutes - MINUTES_PER_DAY,
        }));

    const todayEffective = getEffectiveDateHours(workingHours, specialHours, currentDateKey, currentDay);
    const todayIntervals = getRangesForValue(todayEffective.source, currentDateKey, 'hours_engine_current_status')
        .ranges
        .map((range): ScheduleInterval => ({
            end: range.endMinutes < range.startMinutes
                ? range.endMinutes + MINUTES_PER_DAY
                : range.endMinutes,
            entry: todayEffective.entry,
            isSpecial: todayEffective.isSpecial,
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
    let closingInterval = intervals[activeIndex];
    for (let index = activeIndex + 1; index < intervals.length; index += 1) {
        const interval = intervals[index];
        if (interval.start > closeAt) break;
        if (interval.end > closeAt) {
            closeAt = interval.end;
            closingInterval = interval;
        }
    }

    return [{
        closeDelta: closeAt - currentMinutes,
        entry: closingInterval.entry,
        isSpecial: closingInterval.isSpecial,
        range: closingInterval.range,
    }];
}

export function getStoreStatus(
    workingHours?: Record<string, string>,
    timeZone?: string,
    timeFormat?: string,
    now = new Date(),
    specialHours?: StoreSpecialHours,
): StoreStatus {
    const hasWeeklyHours = Boolean(
        workingHours
        && !Array.isArray(workingHours)
        && Object.keys(workingHours).length > 0,
    );
    const currentDateKey = getStoreLocalDateKey(timeZone, now);
    const currentSpecialEntry = getSpecialHoursEntry(specialHours, currentDateKey);
    if (
        !hasWeeklyHours
        && !currentSpecialEntry
        && !hasPreviousDateOvernightSpecialHours(specialHours, currentDateKey)
    ) {
        return { isOpen: false, statusText: 'Hours not available' };
    }

    const currentDay = getDayKeyForDate(now, timeZone);
    const currentMinutes = parseClockMinutes(getTimeForDate(now, timeZone));
    if (currentMinutes === null) {
        return { isOpen: false, statusText: 'Hours not available' };
    }

    const effectiveToday = getEffectiveDateHours(workingHours, specialHours, currentDateKey, currentDay);
    const today = getRangesForValue(effectiveToday.source, currentDateKey, 'hours_engine_current_status');
    const currentDayHours = today.ranges.length
        ? today.ranges.map((range) => formatRange(range, timeFormat)).join(', ')
        : undefined;
    const active = getActiveRanges(workingHours, specialHours, currentDateKey, currentDay, currentMinutes)[0];
    if (active) {
        return {
            currentDayHours: formatRange(active.range, timeFormat),
            isSpecialHours: active.isSpecial,
            isOpen: true,
            localDate: currentDateKey,
            nextChange: `Closes at ${formatClockTime(active.range.endTime, timeFormat)}`,
            specialHoursLabel: active.entry?.label,
            statusText: 'Open',
        };
    }

    if (today.configuredInvalid) {
        return { isOpen: false, localDate: currentDateKey, statusText: 'Hours not available' };
    }

    return {
        currentDayHours,
        isSpecialHours: effectiveToday.isSpecial,
        isOpen: false,
        localDate: currentDateKey,
        nextChange: findNextOpenTime(
            workingHours,
            specialHours,
            currentDateKey,
            currentDay,
            currentMinutes,
            timeFormat,
        ),
        specialHoursLabel: effectiveToday.entry?.label,
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
    specialHours?: StoreSpecialHours,
): number | null {
    const currentDateKey = getStoreLocalDateKey(timeZone, now);
    if (
        (!workingHours || Array.isArray(workingHours) || Object.keys(workingHours).length === 0)
        && !getSpecialHoursEntry(specialHours, currentDateKey)
        && !hasPreviousDateOvernightSpecialHours(specialHours, currentDateKey)
    ) return null;

    const currentDay = getDayKeyForDate(now, timeZone);
    const currentMinutes = parseClockMinutes(getTimeForDate(now, timeZone));
    if (currentMinutes === null) return null;

    const active = getActiveRanges(workingHours, specialHours, currentDateKey, currentDay, currentMinutes)[0];
    if (active) return active.closeDelta;

    const effectiveToday = getEffectiveDateHours(workingHours, specialHours, currentDateKey, currentDay);
    const nextToday = getRangesForValue(effectiveToday.source, currentDateKey, 'hours_engine_next_change')
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
    specialHours?: StoreSpecialHours,
): StoreStatus {
    return getStoreStatus(workingHours, timeZone, timeFormat, new Date(), specialHours);
}
