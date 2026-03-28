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

import { getStoreStatus } from "@lib/hours/hoursEngine";
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

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Extract a Date from various Firestore timestamp formats.
 * Returns null if unparseable.
 */
function parseTimestamp(value: any): Date | null {
    if (!value) return null;

    try {
        // Firestore Timestamp with toDate()
        if (typeof value?.toDate === "function") {
            return value.toDate();
        }
        // Serialized Firestore Timestamp {seconds, nanoseconds}
        if (typeof value?.seconds === "number") {
            return new Date(value.seconds * 1000);
        }
        // ISO string
        if (typeof value === "string") {
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        }
        // Already a Date
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }
        // Epoch number
        if (typeof value === "number") {
            return new Date(value);
        }
    } catch {
        // Silent fail
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

/**
 * Validate hours structure (basic checks).
 * Returns true if hours data is structurally valid.
 */
function isHoursStructurallyValid(
    workingHours?: Record<string, string>,
): boolean {
    if (!workingHours || typeof workingHours !== "object") return false;
    if (Object.keys(workingHours).length === 0) return false;

    const validDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

    for (const [day, hours] of Object.entries(workingHours)) {
        // Key must be a valid day
        if (!validDays.includes(day)) continue; // Ignore unknown keys

        // Value must be a non-empty string
        if (typeof hours !== "string" || hours.trim() === "") continue;

        // If it contains a dash, validate time format loosely
        if (hours.includes("-")) {
            const parts = hours.split("-").map((t) => t.trim());
            if (parts.length !== 2) return false;

            // Each part should be HH:mm format
            for (const part of parts) {
                if (!/^\d{1,2}:\d{2}$/.test(part)) return false;
            }
        }
    }

    return true;
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
    const { workingHours, hoursLastUpdatedAt, timeZone } = input;

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
    const status = getStoreStatus(workingHours, timeZone);

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
