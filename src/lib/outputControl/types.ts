/**
 * Output Control Layer — Type Definitions
 *
 * Confidence-gated rendering system that determines how fields
 * are displayed across all customer-facing surfaces.
 *
 * Part of Silent Correction Systems architecture.
 * @see __docs__/silent-correction-systems/README.md
 * @see __docs__/constitution/18-silent-correction-doctrine.md
 */

// ─────────────────────────────────────────────────────────────
// CONFIDENCE STATES
// ─────────────────────────────────────────────────────────────

/**
 * Field-level confidence state.
 * Determined by recency, structural validity, and consistency.
 *
 * - TRUSTED: Full display with all signals (badges, status text)
 * - RISKY: Degraded display (remove strong signals, show cautious messaging)
 * - BROKEN: Minimal display (hide status, show safe fallback)
 */
export type ConfidenceState = "TRUSTED" | "RISKY" | "BROKEN";

// ─────────────────────────────────────────────────────────────
// HOURS OUTPUT CONTROL
// ─────────────────────────────────────────────────────────────

/**
 * Hours confidence assessment input.
 */
export interface HoursConfidenceInput {
    /** Store's working hours (day → time range) */
    workingHours?: Record<string, string>;
    /** When workingHours was last updated (Firestore Timestamp or Date-like) */
    hoursLastUpdatedAt?: any;
    /** Store timezone (IANA) */
    timeZone?: string;
}

/**
 * Hours output control result.
 * Consumed by all customer-facing surfaces (OBP, menu, screens).
 */
export interface HoursOutputControl {
    /** Confidence state for hours data */
    confidenceState: ConfidenceState;
    /** Whether to show the Open/Closed badge */
    showStatusBadge: boolean;
    /** Status text to display */
    statusText: string;
    /** Secondary text (e.g., "Closes at 11 PM" or "Hours may vary") */
    secondaryText?: string;
    /** CSS class hint for styling (green/neutral/muted) */
    styleHint: "open" | "closed" | "cautious" | "muted";
}

// ─────────────────────────────────────────────────────────────
// NAMING STANDARDIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Result of naming standardization.
 */
export interface NamingResult {
    /** The standardized value */
    value: string;
    /** Whether the value was modified */
    wasModified: boolean;
    /** What type of normalization was applied */
    normalizationType?: "capitalize" | "trim" | "format" | "none";
}
