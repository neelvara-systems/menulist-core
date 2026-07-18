/**
 * Menu Correctness Engine (MCE) — Entry Point
 *
 * MCE is a pure validation layer used by supported project mutations and the
 * editor Publish-Gate.
 * It validates project data against deterministic correctness rules
 * and stamps verification metadata (_mce) on the existing project document.
 *
 * Zero new Firestore collections. Zero additional Firebase cost.
 *
 * Usage:
 *   import { mceValidate } from "@lib/mce";
 *   const result = mceValidate({ projectData, isOutlet, masterProjectId });
 *
 * @see __docs__/menu-correctness-engine/menu-correctness-engine_spec.md
 * @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md
 */

import { evaluateCorrectness } from "./correctnessResolver";
import type { CSRInput, CSRResult, MCEMetadata } from "./types";

/**
 * Run MCE validation on project data.
 *
 * This is the main entry point called from updateProject() in the DAL.
 * Runs locally in < 100ms. Zero Firebase calls.
 *
 * @param input - CSR input containing project data and context
 * @returns CSRResult with verification status, errors, and warnings
 */
export function mceValidate(input: CSRInput): CSRResult {
    return evaluateCorrectness(input);
}

/**
 * Convert CSRResult to MCEMetadata for stamping on the project document.
 *
 * This creates the minimal _mce field that gets merged into the setDoc call.
 * Zero extra Firebase writes — it's part of the same write operation.
 *
 * @param result - CSR validation result
 * @returns MCEMetadata to be added as _mce field on project document
 */
export function toMCEMetadata(result: CSRResult): MCEMetadata {
    return {
        verified: result.verified,
        verifiedAt: result.validatedAt,
        warnings: result.warnings.map((w) => w.ruleId),
    };
}

// Re-export types for consumers
export type { CSRInput, CSRResult, CSRError, CSRWarning, MCEMetadata } from "./types";

// Re-export sanitizeForClient for surface data paths
export { sanitizeForClient } from "./utils";
