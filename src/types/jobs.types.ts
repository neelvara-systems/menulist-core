/**
 * Job Queue Types
 * ═══════════════════════════════════════════════════════════════
 *
 * Types for background job processing.
 * Part of Pricing Integrity System (Feature #1).
 *
 * Collection: jobs/pdfRegen/{tId}/{sId}/{projectId}
 *
 * NOTE: Uses projectId as document ID for Firestore-level deduplication.
 * This ensures only ONE pending job per project exists at any time.
 */

import { Timestamp } from "firebase/firestore";

/**
 * Job status states
 */
export type JobStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";

/**
 * PDF Regeneration Job
 *
 * NOTE: Background regeneration is currently FLAGGED OFF.
 * This infrastructure exists for future activation if users
 * report slowness with on-demand generation.
 */
export interface PDFRegenJob {
    /** Unique job ID */
    id: string;

    /** Project to regenerate PDF for */
    projectId: string;

    /** Tenant ID for isolation */
    tId: number;

    /** Store ID for isolation */
    sId: number;

    /** When job was requested */
    requestedOn: Timestamp;

    /** Who requested (userId or 'SYSTEM') */
    requestedBy: string;

    /** Target integrity version */
    targetVersion: number;

    /** Current job status */
    status: JobStatus;

    /** Number of attempts made */
    attempts: number;

    /** Last error message if failed */
    lastError: string | null;

    /** When job completed (success or final failure) */
    completedOn: Timestamp | null;
}

/**
 * Parameters for enqueueing a PDF regeneration job
 */
export interface EnqueuePDFRegenParams {
    projectId: string;
    tId: number;
    sId: number;
    requestedBy: string;
    targetVersion: number;
}
