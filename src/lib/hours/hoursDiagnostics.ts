import {
    getBoundedRuntimeStringContext,
    logRuntimeDiagnostic,
    logRuntimeFailure,
} from "@lib/runtime/runtimeDiagnostics";

type HoursStatusTimeZoneFallbackSource =
    | "hours_engine_day_key"
    | "hours_engine_time"
    | "obp_hours_status_now";

type HoursStatusInvalidTimeRangeSource =
    | "hours_engine_current_status"
    | "hours_engine_next_change"
    | "hours_engine_next_open"
    | "obp_hours_status_current_status";

const MAX_HOURS_STATUS_TIMEZONE_DIAGNOSTICS = 25;
const MAX_HOURS_STATUS_INVALID_TIME_RANGE_DIAGNOSTICS = 25;

const reportedHoursStatusTimeZoneFailures = new Set<string>();
const reportedHoursStatusInvalidTimeRanges = new Set<string>();

export function logHoursStatusTimeZoneFallback(
    error: unknown,
    timeZone: string | undefined,
    source: HoursStatusTimeZoneFallbackSource,
    fallbackPolicy: "local_day_key" | "local_time" | "browser_local_time",
): void {
    const timeZoneLength = timeZone ? timeZone.length : 0;
    const failureKey = [
        source,
        timeZoneLength,
        timeZone ? "time-zone-present" : "time-zone-missing",
        fallbackPolicy,
    ].join(":");

    if (reportedHoursStatusTimeZoneFailures.has(failureKey)) return;
    if (reportedHoursStatusTimeZoneFailures.size >= MAX_HOURS_STATUS_TIMEZONE_DIAGNOSTICS) return;
    reportedHoursStatusTimeZoneFailures.add(failureKey);

    logRuntimeFailure("hours_status_timezone_fallback_failed", error, {
        ...getBoundedRuntimeStringContext("timeZone", timeZone),
        ...getBoundedRuntimeStringContext("source", source),
        ...getBoundedRuntimeStringContext("fallbackPolicy", fallbackPolicy),
        hasIntl: typeof Intl !== "undefined",
    });
}

export function logHoursStatusInvalidTimeRange(
    dayKey: string,
    hoursValue: string | undefined,
    source: HoursStatusInvalidTimeRangeSource,
): void {
    const failureKey = [
        source,
        dayKey,
        hoursValue ? hoursValue.length : 0,
        hoursValue?.includes("-") ? "range" : "no-range",
    ].join(":");

    if (reportedHoursStatusInvalidTimeRanges.has(failureKey)) return;
    if (reportedHoursStatusInvalidTimeRanges.size >= MAX_HOURS_STATUS_INVALID_TIME_RANGE_DIAGNOSTICS) return;
    reportedHoursStatusInvalidTimeRanges.add(failureKey);

    logRuntimeDiagnostic("hours_status_time_range_invalid", {
        ...getBoundedRuntimeStringContext("source", source),
        ...getBoundedRuntimeStringContext("dayKey", dayKey),
        hoursValuePresent: Boolean(hoursValue),
        hoursValueLength: hoursValue ? hoursValue.length : 0,
        hasRangeSeparator: Boolean(hoursValue?.includes("-")),
    });
}
