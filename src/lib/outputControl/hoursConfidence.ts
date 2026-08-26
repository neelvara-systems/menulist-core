/**
 * Output Control — Hours Confidence Resolver
 *
 * Determines how hours should be displayed based on data freshness
 * and structural validity. This is the first confidence-gated
 * rendering system in MenuList.
 *
 * Rules (from Silent Correction Doctrine §18):
 * - TRUSTED: Full display with "Open Now" / "Closed" badges
 * - RISKY (stale >30 days): Remove badge, show "Hours may vary"
 * - BROKEN (no hours or invalid): Show "Check with store"
 *
 * @see __docs__/silent-correction-systems/README.md
 * @see __docs__/constitution/18-silent-correction-doctrine.md
 */

import {
    getStoreLocalDateKey,
    getStoreStatus,
    normalizeWorkingHoursValue,
    WORKING_HOURS_DAY_KEYS,
} from "@lib/hours/hoursEngine";
import { getSpecialHoursEntry } from "@lib/hours/specialHours";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import type { StoreSpecialHours } from "@type/platform/store";
import type {
    ConfidenceState,
    HoursConfidenceInput,
    HoursOutputControl,
} from "./types";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Days before hours data is considered stale (RISKY) */
const STALE_THRESHOLD_DAYS = 30;

/** Days before hours data is considered very stale (BROKEN) */
const VERY_STALE_THRESHOLD_DAYS = 180;

/** Maximum distinct timestamp parse diagnostics per runtime session. */
const MAX_HOURS_TIMESTAMP_PARSE_DIAGNOSTICS = 25;

const reportedHoursTimestampParseFailures = new Set<string>();

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Extract a Date from various Firestore timestamp formats.
 * Returns null if unparseable.
 */
function toValidDate(value: Date): Date | null {
    return Number.isFinite(value.getTime()) ? value : null;
}

function safeHasTimestampProperty(value: unknown, property: string, expectedType: "function" | "number"): boolean {
    if (!value || typeof value !== "object") return false;

    try {
        return typeof (value as Record<string, unknown>)[property] === expectedType;
    } catch {
        return false;
    }
}

function getTimestampValueKind(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (value instanceof Date) return "date";
    if (safeHasTimestampProperty(value, "toDate", "function")) return "toDate";
    if (safeHasTimestampProperty(value, "seconds", "number")) return "seconds";
    if (Array.isArray(value)) return "array";
    return typeof value;
}

function logHoursTimestampParseFailure(error: unknown, value: unknown): void {
    const valueKind = getTimestampValueKind(value);
    const failureKey = [
        valueKind,
        typeof value === "string" ? value.length : "non-string",
        typeof value === "number" && Number.isFinite(value) ? "finite-number" : "non-finite-number",
        safeHasTimestampProperty(value, "toDate", "function") ? "toDate" : "no-toDate",
        safeHasTimestampProperty(value, "seconds", "number") ? "seconds" : "no-seconds",
    ].join(":");

    if (reportedHoursTimestampParseFailures.has(failureKey)) return;
    if (reportedHoursTimestampParseFailures.size >= MAX_HOURS_TIMESTAMP_PARSE_DIAGNOSTICS) return;
    reportedHoursTimestampParseFailures.add(failureKey);

    logRuntimeFailure("hours_confidence_timestamp_parse_failed", error, {
        ...getBoundedRuntimeStringContext("timestampValueKind", valueKind),
        stringLength: typeof value === "string" ? value.length : 0,
        isDateValue: value instanceof Date,
        isNumberValue: typeof value === "number",
        isFiniteNumber: typeof value === "number" ? Number.isFinite(value) : undefined,
        hasToDate: safeHasTimestampProperty(value, "toDate", "function"),
        hasSeconds: safeHasTimestampProperty(value, "seconds", "number"),
    });
}

function parseTimestamp(value: unknown): Date | null {
    if (!value) return null;

    try {
        // Firestore Timestamp with toDate()
        if (safeHasTimestampProperty(value, "toDate", "function")) {
            const date = (value as { toDate: () => unknown }).toDate();
            return date instanceof Date ? toValidDate(date) : null;
        }
        // Serialized Firestore Timestamp {seconds, nanoseconds}
        if (safeHasTimestampProperty(value, "seconds", "number")) {
            const seconds = (value as { seconds: number }).seconds;
            return Number.isFinite(seconds) ? toValidDate(new Date(seconds * 1000)) : null;
        }
        // ISO string
        if (typeof value === "string") {
            return toValidDate(new Date(value));
        }
        // Already a Date
        if (value instanceof Date) {
            return toValidDate(value);
        }
        // Epoch number
        if (typeof value === "number") {
            return Number.isFinite(value) ? toValidDate(new Date(value)) : null;
        }
    } catch (error) {
        logHoursTimestampParseFailure(error, value);
    }
    return null;
}

/**
 * Compute days since a given date. Returns Infinity if date is null.
 */
function daysSince(date: Date | null): number {
    if (!date) return Infinity;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function hasNonEmptyHoursRecord(value: unknown): boolean {
    return Boolean(value)
        && typeof value === "object"
        && !Array.isArray(value)
        && Object.keys(value as Record<string, unknown>).length > 0;
}

/**
 * Public surfaces may use the legacy Open/Closed resolver while the broader
 * confidence feature remains disabled. They must still distinguish missing
 * truth from an explicit closed schedule.
 */
export function hasPublicHoursTruth(
    workingHours: unknown,
    specialHours: unknown,
    timeZone?: string,
    now = new Date(),
): boolean {
    if (hasNonEmptyHoursRecord(workingHours)) return true;
    if (!hasNonEmptyHoursRecord(specialHours)) return false;

    return Boolean(getSpecialHoursEntry(
        specialHours as StoreSpecialHours,
        getStoreLocalDateKey(timeZone, now),
    ));
}

/**
 * Validate hours structure (basic checks).
 * Returns true if hours data is structurally valid.
 */
function isHoursStructurallyValid(
    workingHours?: Record<string, string>,
): boolean {
    if (!workingHours || typeof workingHours !== "object") return false;
    if (Object.keys(workingHours).length === 0) return false;

    let recognizedDayCount = 0;

    for (const [day, hours] of Object.entries(workingHours)) {
        if (!WORKING_HOURS_DAY_KEYS.includes(day as (typeof WORKING_HOURS_DAY_KEYS)[number])) continue;
        recognizedDayCount += 1;
        if (normalizeWorkingHoursValue(hours) === null) return false;
    }

    return recognizedDayCount > 0;
}

// ─────────────────────────────────────────────────────────────
// MAIN RESOLVER
// ─────────────────────────────────────────────────────────────

/**
 * Compute hours confidence state and output control.
 *
 * Decision tree:
 * 1. No hours data → BROKEN → "Check with store"
 * 2. Invalid structure → BROKEN → "Check with store"
 * 3. Very stale (>180 days) → BROKEN → "Check with store"
 * 4. Stale (>30 days) → RISKY → "Hours may vary"
 * 5. Fresh + valid → TRUSTED → Full "Open Now" / "Closed"
 *
 * @param input - Hours data with recency metadata
 * @returns HoursOutputControl for rendering
 */
export function resolveHoursOutput(
    input: HoursConfidenceInput,
): HoursOutputControl {
    const { workingHours, specialHours, hoursLastUpdatedAt, timeZone } = input;

    // ── Step 1: No hours data ──
    if (!workingHours || Object.keys(workingHours).length === 0) {
        return {
            confidenceState: "BROKEN",
            showStatusBadge: false,
            statusText: "Check with store",
            styleHint: "muted",
        };
    }

    // ── Step 2: Structural validity ──
    if (!isHoursStructurallyValid(workingHours)) {
        return {
            confidenceState: "BROKEN",
            showStatusBadge: false,
            statusText: "Check with store",
            styleHint: "muted",
        };
    }

    // ── Step 3: Staleness check ──
    const lastUpdated = parseTimestamp(hoursLastUpdatedAt);
    const staleDays = daysSince(lastUpdated);

    // Very stale → BROKEN
    if (staleDays > VERY_STALE_THRESHOLD_DAYS) {
        return {
            confidenceState: "BROKEN",
            showStatusBadge: false,
            statusText: "Check with store",
            styleHint: "muted",
        };
    }

    // Stale → RISKY
    if (staleDays > STALE_THRESHOLD_DAYS) {
        return {
            confidenceState: "RISKY",
            showStatusBadge: false,
            statusText: "Hours may vary",
            styleHint: "cautious",
        };
    }

    // ── Step 4: Fresh + valid → TRUSTED ──
    // Delegate to existing hours engine for Open/Closed computation
    const status = getStoreStatus(workingHours, timeZone, undefined, new Date(), specialHours);

    return {
        confidenceState: "TRUSTED",
        showStatusBadge: true,
        statusText: status.statusText, // "Open" or "Closed"
        secondaryText: status.nextChange, // "Closes at 11:00 PM"
        styleHint: status.isOpen ? "open" : "closed",
    };
}

/**
 * Get confidence state only (for internal use / logging).
 */
export function getHoursConfidenceState(
    input: HoursConfidenceInput,
): ConfidenceState {
    return resolveHoursOutput(input).confidenceState;
}
