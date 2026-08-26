/**
 * Output Control Layer — Entry Point
 *
 * Confidence-gated rendering for customer-facing surfaces.
 * Determines how fields are displayed based on data freshness,
 * structural validity, and consistency.
 *
 * Part of Silent Correction Systems architecture.
 * Feature flag: ENABLE_OUTPUT_CONTROL
 *
 * @see __docs__/silent-correction-systems/README.md
 * @see __docs__/constitution/18-silent-correction-doctrine.md
 */

export { getHoursConfidenceState, hasPublicHoursTruth, resolveHoursOutput } from "./hoursConfidence";
export { standardizeName, standardizeNames, isBrandSafe } from "./namingStandardization";
export type {
    ConfidenceState,
    HoursConfidenceInput,
    HoursOutputControl,
    NamingResult,
} from "./types";
