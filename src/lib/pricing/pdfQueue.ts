/**
 * PDF Queue - Debounced Background Regeneration
 * ═══════════════════════════════════════════════════════════════
 *
 * Retains the disabled background-regeneration boundary without exposing a
 * writer until a real worker, collection contract, and security rules exist.
 *
 * Part of Pricing Integrity System (Feature #1).
 *
 * Background regeneration is intentionally unavailable. Do not flip this
 * constant without first adding and reviewing an owned worker, a valid
 * collection schema/path, security rules, retry semantics, and cost evidence.
 */

import type { EnqueuePDFRegenParams } from "@type/jobs.types";
import {
    getBoundedPricingStringContext,
    logPricingDiagnostic,
} from "./pricingDiagnostics";

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG - Background PDF regeneration
// ═══════════════════════════════════════════════════════════════
// Set to true ONLY if users report slowness with on-demand generation
const ENABLE_BACKGROUND_PDF_REGEN = false;

const DEBOUNCE_MS = 60_000; // 60 seconds

/**
 * Enqueue a PDF regeneration job (debounced)
 *
 * NOTE: This is currently disabled via feature flag.
 * The function logs the disabled boundary and never creates a persistence
 * effect. A complete worker-backed implementation is required before this
 * contract may become enabled.
 *
 * @param params - Job parameters
 */
export async function enqueuePDFRegen(
    params: EnqueuePDFRegenParams,
): Promise<void> {
    logPricingDiagnostic("pricing_pdf_regen_disabled", {
        ...getBoundedPricingStringContext("projectId", params.projectId),
        targetVersion: params.targetVersion,
    });
}

/**
 * Check if background PDF regeneration is enabled
 */
export function isBackgroundPDFRegenEnabled(): boolean {
    return ENABLE_BACKGROUND_PDF_REGEN;
}

/**
 * Get the debounce duration in milliseconds
 */
export function getDebounceMs(): number {
    return DEBOUNCE_MS;
}
