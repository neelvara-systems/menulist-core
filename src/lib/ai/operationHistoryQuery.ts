import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

const AI_OPERATION_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const AI_OPERATION_ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const AI_OPERATION_DATE_FILTER_MAX_LENGTH = 32;
export const AI_OPERATION_HISTORY_MAX_DATE_RANGE_DAYS = 366;
export const AI_OPERATION_CURSOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

export type AiOperationHistoryDateRange = {
    end?: Date;
    start?: Date;
};

export type AiOperationActionScanBoundary = {
    cursorSource: 'last_match' | 'scan_cursor' | 'none';
    hasMore: boolean;
    requiresManualContinuation: boolean;
    scanLimitReached: boolean;
};

type AiOperationHistoryCursorAdmissionInput = {
    cursorCreatedOn: unknown;
    cursorExists: boolean;
    cursorRequested: boolean;
    dateRange: AiOperationHistoryDateRange;
};

function normalizeAiOperationHistoryCursorDate(value: unknown): Date | null {
    let candidate = value;

    if (
        candidate
        && typeof candidate === 'object'
        && 'toDate' in candidate
        && typeof candidate.toDate === 'function'
    ) {
        try {
            candidate = candidate.toDate();
        } catch {
            return null;
        }
    }

    if (!(candidate instanceof Date) || !Number.isFinite(candidate.getTime())) {
        return null;
    }

    return candidate;
}

export function isAiOperationHistoryCursorAdmissible({
    cursorCreatedOn,
    cursorExists,
    cursorRequested,
    dateRange,
}: AiOperationHistoryCursorAdmissionInput): boolean {
    if (!cursorRequested) return true;
    if (!cursorExists) return false;

    const cursorDate = normalizeAiOperationHistoryCursorDate(cursorCreatedOn);
    if (!cursorDate) return false;

    const cursorTime = cursorDate.getTime();
    if (dateRange.start && cursorTime < dateRange.start.getTime()) return false;
    if (dateRange.end && cursorTime > dateRange.end.getTime()) return false;

    return true;
}

export function resolveAiOperationActionScanBoundary(input: {
    hasScanCursor: boolean;
    matchedCount: number;
    maxScanDocs: number;
    pageSize: number;
    reachedEnd: boolean;
    scannedDocs: number;
}): AiOperationActionScanBoundary {
    const hasBufferedMatch = input.matchedCount > input.pageSize;
    const scanLimitReached = !input.reachedEnd
        && input.scannedDocs >= input.maxScanDocs
        && input.hasScanCursor;
    const hasReturnedMatch = input.matchedCount > 0;

    return {
        cursorSource: hasBufferedMatch
            ? 'last_match'
            : scanLimitReached
                ? 'scan_cursor'
                : hasReturnedMatch
                    ? 'last_match'
                    : input.hasScanCursor
                        ? 'scan_cursor'
                        : 'none',
        hasMore: hasBufferedMatch || scanLimitReached,
        requiresManualContinuation: input.matchedCount === 0 && scanLimitReached,
        scanLimitReached,
    };
}

function buildUtcDate(year: number, month: number, day: number, endOfDay = false): Date | null {
    const parsed = new Date(Date.UTC(
        year,
        month - 1,
        day,
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0,
    ));

    if (
        parsed.getUTCFullYear() !== year
        || parsed.getUTCMonth() !== month - 1
        || parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return parsed;
}

function parseDateOnly(value: string, boundary: 'start' | 'end'): Date | null {
    const match = value.match(AI_OPERATION_DATE_PATTERN);
    if (!match) return null;

    return buildUtcDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        boundary === 'end',
    );
}

function parseStrictIsoDate(value: string): Date | null {
    const match = value.match(AI_OPERATION_ISO_DATE_PATTERN);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    const millisecond = Number((match[7] || '0').padEnd(3, '0'));

    const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    if (
        parsed.getUTCFullYear() !== year
        || parsed.getUTCMonth() !== month - 1
        || parsed.getUTCDate() !== day
        || parsed.getUTCHours() !== hour
        || parsed.getUTCMinutes() !== minute
        || parsed.getUTCSeconds() !== second
        || parsed.getUTCMilliseconds() !== millisecond
    ) {
        return null;
    }

    return parsed;
}

function parseAiOperationDateFilter(rawValue: string | null | undefined, boundary: 'start' | 'end'): Date | null | undefined {
    const value = String(rawValue || '').trim();
    if (!value) return undefined;
    if (value.length > AI_OPERATION_DATE_FILTER_MAX_LENGTH) return null;

    return parseDateOnly(value, boundary) || parseStrictIsoDate(value);
}

export function isValidAiOperationCursorId(rawCursorId: string | null | undefined): boolean {
    const cursorId = String(rawCursorId || '').trim();
    return AI_OPERATION_CURSOR_ID_PATTERN.test(cursorId) && isValidFirestoreDocumentId(cursorId);
}

export function normalizeAiOperationHistoryDateRange(
    rawStartDate: string | null | undefined,
    rawEndDate: string | null | undefined,
): AiOperationHistoryDateRange | null {
    const start = parseAiOperationDateFilter(rawStartDate, 'start');
    const end = parseAiOperationDateFilter(rawEndDate, 'end');
    if (start === null || end === null) return null;

    if (start && end) {
        if (start.getTime() > end.getTime()) return null;

        const rangeDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
        if (rangeDays > AI_OPERATION_HISTORY_MAX_DATE_RANGE_DAYS) return null;
    }

    return {
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
    };
}
