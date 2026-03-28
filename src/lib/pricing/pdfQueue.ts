/**
 * PDF Queue - Debounced Background Regeneration
 * ═══════════════════════════════════════════════════════════════
 *
 * Handles PDF regeneration queueing with debounce to prevent
 * Firebase cost explosion from rapid edits.
 *
 * Part of Pricing Integrity System (Feature #1).
 *
 * ⚠️ FEATURE FLAG: Background regeneration is currently DISABLED.
 * The infrastructure exists but is flagged OFF.
 * Enable via ENABLE_BACKGROUND_PDF_REGEN flag if users complain
 * about on-demand generation slowness.
 *
 * Collection: jobs/pdfRegen/{tId}/{sId}/{projectId}
 *
 * DEDUPE STRATEGY: Uses projectId as document ID (not random jobId).
 * This ensures only ONE pending job per project exists at any time.
 * Rapid edits overwrite the same document instead of creating duplicates.
 * This handles serverless restart and multi-instance scenarios.
 */

import { replaceUndefined } from "@lib/apiHelper";
import { firebaseClient as db } from "@lib/firebase/firebaseClient";
import { secureLog } from "@lib/security/secureLogger";
import type { EnqueuePDFRegenParams, PDFRegenJob } from "@type/jobs.types";
import { doc, setDoc, Timestamp } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG - Background PDF regeneration
// ═══════════════════════════════════════════════════════════════
// Set to true ONLY if users report slowness with on-demand generation
const ENABLE_BACKGROUND_PDF_REGEN = false;

// In-memory debounce tracking (best-effort, not required for correctness)
// Firestore-level dedupe (projectId as docId) handles serverless restarts
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();
const DEBOUNCE_MS = 60_000; // 60 seconds

/**
 * Enqueue a PDF regeneration job (debounced)
 *
 * NOTE: This is currently disabled via feature flag.
 * The function will log but not create jobs unless flag is enabled.
 *
 * @param params - Job parameters
 */
export async function enqueuePDFRegen(
    params: EnqueuePDFRegenParams,
): Promise<void> {
    const { projectId, tId, sId, requestedBy, targetVersion } = params;
    const key = `${tId}-${sId}-${projectId}`;

    // Feature flag check
    if (!ENABLE_BACKGROUND_PDF_REGEN) {
        secureLog("[PDF Queue] Background regen disabled (feature flag OFF)", {
            projectId,
            targetVersion,
        });
        return;
    }

    // Clear existing timer for this project
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
        clearTimeout(existingTimer);
        secureLog("[PDF Queue] Debounce reset", { projectId });
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
        debounceTimers.delete(key);
        await createRegenJob(params);
    }, DEBOUNCE_MS);

    debounceTimers.set(key, timer);
    secureLog("[PDF Queue] Regeneration scheduled", {
        projectId,
        targetVersion,
        debounceMs: DEBOUNCE_MS,
    });
}

/**
 * Create the actual regeneration job in Firestore
 */
async function createRegenJob(params: EnqueuePDFRegenParams): Promise<void> {
    const { projectId, tId, sId, requestedBy, targetVersion } = params;

    // Use projectId as document ID for Firestore-level deduplication
    // Path: jobs/pdfRegen/{tId}/{sId}/{projectId}
    // This ensures only ONE job per project exists - overwrites on rapid edits
    const jobRef = doc(
        db,
        "jobs",
        "pdfRegen",
        String(tId),
        String(sId),
        projectId,
    );

    const jobData: PDFRegenJob = replaceUndefined({
        id: projectId, // Use projectId as ID for consistency
        projectId,
        tId,
        sId,
        requestedOn: Timestamp.now(),
        requestedBy,
        targetVersion,
        status: "QUEUED",
        attempts: 0,
        lastError: null,
        completedOn: null,
    });

    await setDoc(jobRef, jobData);
    secureLog("[PDF Queue] Job created", {
        jobId: jobRef.id,
        projectId,
        targetVersion,
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
