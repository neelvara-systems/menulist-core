/**
 * GUEST FEEDBACK RETENTION
 * ═══════════════════════════════════════════════════════════════
 * 
 * Nightly cleanup of expired guest feedback documents.
 * 
 * Per the spec (internal-feedback-system_spec.md "Retention Policy"):
 * - Guest feedback expires 90 days after creation
 * - Document is deleted, only anonymized MOL event retained
 * - Reasons: Privacy (GDPR-like), legal, cost savings
 * 
 * This function:
 * 1. Queries guestFeedback where expiresOn < now
 * 2. Deletes expired documents in batches
 * 3. Logs summary for monitoring
 * 
 * Called from: decisionBlocksScoring.ts (nightly scheduler)
 * Feature flag: ENABLE_GUEST_FEEDBACK_RETENTION
 * 
 * @see __docs__/projects/internal-feedback-system/internal-feedback-system_spec.md
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';

// ================================================================
// TYPES
// ================================================================

export interface RetentionResult {
    processed: number;
    deleted: number;
    errors: number;
    errorDetails: Array<{ docId: string; error: string }>;
}

// ================================================================
// CONSTANTS
// ================================================================

/** Batch size for Firestore operations (max 500) */
const BATCH_SIZE = 100;

/** Max documents to process per run (prevent timeout) */
const MAX_DOCS_PER_RUN = 1000;

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Process expired guest feedback documents
 * 
 * Queries for documents where expiresOn < now and deletes them.
 * Called from nightly scheduler.
 * 
 * @returns Summary of processed documents
 */
export async function processGuestFeedbackRetention(): Promise<RetentionResult> {
    const db = admin.firestore();
    const now = Timestamp.now();

    const result: RetentionResult = {
        processed: 0,
        deleted: 0,
        errors: 0,
        errorDetails: [],
    };

    try {
        // Query expired documents
        const expiredQuery = db.collection(DB_COLLECTIONS.GUEST_FEEDBACK)
            .where('expiresOn', '<', now)
            .limit(MAX_DOCS_PER_RUN);

        const snapshot = await expiredQuery.get();

        if (snapshot.empty) {
            console.log('[GuestFeedbackRetention] No expired documents found.');
            return result;
        }

        console.log(`[GuestFeedbackRetention] Found ${snapshot.size} expired documents to delete.`);
        result.processed = snapshot.size;

        // Delete in batches
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            batchCount++;

            // Commit when batch is full
            if (batchCount >= BATCH_SIZE) {
                try {
                    await batch.commit();
                    result.deleted += batchCount;
                    console.log(`[GuestFeedbackRetention] Deleted batch of ${batchCount} documents.`);
                } catch (error: any) {
                    result.errors += batchCount;
                    result.errorDetails.push({
                        docId: `batch_${result.deleted}`,
                        error: error.message,
                    });
                    console.error(`[GuestFeedbackRetention] Batch delete failed:`, error.message);
                }

                // Start new batch
                batch = db.batch();
                batchCount = 0;
            }
        }

        // Commit remaining documents
        if (batchCount > 0) {
            try {
                await batch.commit();
                result.deleted += batchCount;
                console.log(`[GuestFeedbackRetention] Deleted final batch of ${batchCount} documents.`);
            } catch (error: any) {
                result.errors += batchCount;
                result.errorDetails.push({
                    docId: `batch_final`,
                    error: error.message,
                });
                console.error(`[GuestFeedbackRetention] Final batch delete failed:`, error.message);
            }
        }

        // Log summary
        console.log(`[GuestFeedbackRetention] Retention complete:`);
        console.log(`  - Processed: ${result.processed}`);
        console.log(`  - Deleted: ${result.deleted}`);
        console.log(`  - Errors: ${result.errors}`);

        return result;
    } catch (error: any) {
        console.error('[GuestFeedbackRetention] Retention failed:', error);
        throw error;
    }
}
