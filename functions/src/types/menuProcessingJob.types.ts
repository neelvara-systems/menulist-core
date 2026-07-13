/**
 * Menu Image Processing Job Types
 * 
 * Job queue types for menu image processing.
 * Spec: menu-image-processing-job-queue-spec.md Section 4
 */

import { Timestamp } from "firebase-admin/firestore";
import type {
    MenuExtractionDestinationType,
    MenuExtractionJobDestination,
} from "../sharedData/menuExtractionJob";
import type { ExtractedBusinessProfile } from "../sharedData/extractedBusinessProfile";
import { FileMessage } from "./fileMessages.types";

// ═══════════════════════════════════════════════════════════════════════════
// JOB STATUS
// ═══════════════════════════════════════════════════════════════════════════

export const MENU_PROCESSING_STATUS = {
    PENDING: "pending",             // Job created, waiting to start
    PROCESSING: "processing",       // AI processing in progress
    PREVIEW_READY: "preview_ready", // Re-extraction: raw data ready for client-side comparison
    CANCELLING: "cancelling",       // User requested cancellation
    CANCELLED: "cancelled",         // Job was cancelled
    COMPLETED: "completed",         // Successfully completed
    FAILED: "failed",               // Error occurred
} as const;

export type MenuProcessingStatusType =
    (typeof MENU_PROCESSING_STATUS)[keyof typeof MENU_PROCESSING_STATUS];

export type { MenuExtractionJobDestination };

// ═══════════════════════════════════════════════════════════════════════════
// JOB DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Menu Image Processing Job Document
 * 
 * Spec Reference: menu-image-processing-job-queue-spec.md Section 4
 * Collection: menuImageProcessingJobs/{jobId}
 */
export interface MenuImageProcessingJob {
    // ─────────────────────────────────────────────────────────────
    // IDENTITY
    // ─────────────────────────────────────────────────────────────
    id: string;        // Auto-generated job ID
    projectId: string; // Target project (format: "tId-default-sId")

    // ─────────────────────────────────────────────────────────────
    // STATUS & PROGRESS
    // ─────────────────────────────────────────────────────────────
    status: MenuProcessingStatusType;
    progress?: number;      // 0-100 percentage
    currentStep?: string;   // Human-readable step

    // ─────────────────────────────────────────────────────────────
    // INPUT (What to process)
    // ─────────────────────────────────────────────────────────────
    files: {
        uid: string;   // REQUIRED: Used to prefix IDs
        name: string;
        size: number;
        type: string;
        url: string;   // Validated Firebase Storage HTTPS URL
    }[];
    targetLanguages: {
        code: string;
        name: string;
    }[];
    action?: string;
    businessCategory?: string;
    businessType?: string;
    /** Server-only extraction path. Used by messaging onboarding to reuse AI extraction without writing a temp project. */
    skipProjectSave?: boolean;
    /** Force preview/review even when the target project has no existing items. */
    forceReview?: boolean;
    /** Optional source marker for cross-flow diagnostics. */
    source?: string;
    /** Server-computed trusted fingerprint for safe completed-job reuse. */
    sourceFingerprint?: string;
    sourceFingerprintVersion?: number;
    /** Server-owned destination for the extracted output. */
    destination?: MenuExtractionJobDestination;
    /** Denormalized destination label for ops dashboards and cheap filtering. */
    destinationType?: MenuExtractionDestinationType;
    /** Optional source metadata for importer/audit flows. */
    sourceMetadata?: {
        acquisitionProvider?: string;
        artifactId?: string;
        finalUrl?: string;
        sourceKind?: string;
        sourceUrl?: string;
        storagePath?: string;
        [key: string]: unknown;
    };

    // ─────────────────────────────────────────────────────────────
    // OUTPUT (Populated on completion)
    // ─────────────────────────────────────────────────────────────
    result?: {
        combinedData?: {
            categories: Array<{
                id: string | number;
                sourceFileIndex: number;
                name: Record<string, string>;
                active?: boolean;
                icon?: string;
            }>;
            items: Array<{
                id: string | number;
                sourceFileIndex: number;
                name: Record<string, string>;
                category: string | number;
                description?: Record<string, string>;
                price?: string;
                attributes?: Array<{
                    id: string;
                    name: Record<string, string>;
                    price?: string;
                }>;
                tags?: string[] | Record<string, string>;
                dietaryTags?: string[];
                spiceLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'very-hot';
                duration?: number;
                active?: boolean;
            }>;
            languages: Array<{
                name: string;
                code: string;
                isPrimary?: boolean;
            }>;
            businessAttributeSuggestions?: Array<{
                key: string;
                value: true;
                confidence?: 'high' | 'medium' | 'low';
                evidence?: string;
                sourceFileIndex?: number;
            }>;
            extractedBusinessProfile?: ExtractedBusinessProfile;
            fileMessages?: FileMessage[];
        };
        extractedBusinessProfile?: ExtractedBusinessProfile;
        summary?: Record<string, unknown>;
        dataPrunedAt?: any;
        dataPrunedReason?: string;
        qualityScore: number;
        qualityDetails: {
            categoryQuality: number;
            itemQuality: number;
            priceQuality: number;
            descriptionQuality: number;
        };
        processingTime: number;
        batchResults?: {
            batchIndex: number;
            failedFileIndices?: number[];
            success: boolean;
            filesProcessed: number;
        }[];
        partialResult?: boolean;
        // Extraction provenance (P0 hardening — Mar 2026)
        /** Raw AI response text per batch (truncated to 10KB each for doc size safety) */
        rawBatchResponses?: {
            batchIndex: number;
            rawText: string;
            truncated: boolean;
        }[];
        /** Prompt version that produced this extraction */
        promptVersion?: string;
        /** AI model used */
        model?: string;
        /** Confidence summary (Infrastructure Compounding 10.1) */
        confidenceSummary?: {
            highConfidenceCount: number;
            mediumConfidenceCount: number;
            lowConfidenceCount: number;
            averageConfidenceScore: number;
        };
        /** Per-file extracted data for flows that skip project writes and persist elsewhere. */
        redistributedFiles?: Record<string, unknown>;
    };
    timings?: Record<string, unknown>;

    // Per-file results (after redistribution)
    fileResults?: {
        [fileUid: string]: {
            categoriesCount: number;
            itemsCount: number;
            processingMessages?: FileMessage[];
        };
    };

    // ─────────────────────────────────────────────────────────────
    // ERROR (Populated on failure)
    // ─────────────────────────────────────────────────────────────
    error?: {
        code: string;
        message: string;
        retryable: boolean;
        retryAfterSeconds?: number;
        failedBatches?: number[];
    };

    // ─────────────────────────────────────────────────────────────
    // TRANSACTION (Cost tracking)
    // ─────────────────────────────────────────────────────────────
    transaction?: {
        transactionId: string | null;
        recorded: boolean;
        totalCredits: number;
        totalCharge: number;
        unitsConsumed?: number;
        tokenUsage: {
            promptTokenCount: number;
            candidatesTokenCount: number;
            totalTokenCount: number;
        };
    };

    // ─────────────────────────────────────────────────────────────
    // TIMESTAMPS
    // ─────────────────────────────────────────────────────────────
    createdAt: Timestamp;
    updatedAt: Timestamp;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    timeoutAt?: Timestamp;

    // ─────────────────────────────────────────────────────────────
    // RE-EXTRACTION WORKFLOW
    // Spec Reference: ai-extraction-integration.md Section 2.3
    // ─────────────────────────────────────────────────────────────
    /** true = first extraction (auto-save), false = re-extraction (needs review) */
    isFirstExtraction?: boolean;
    /** TTL for cleanup - 24 hours for unapproved re-extraction jobs */
    expiresAt?: Timestamp;
    /** Job mode: SINGLE_STORE | MASTER_PROJECT | OUTLET_LINKED */
    jobMode?: 'SINGLE_STORE' | 'MASTER_PROJECT' | 'OUTLET_LINKED';

    // ─────────────────────────────────────────────────────────────
    // RETRY TRACKING
    // ─────────────────────────────────────────────────────────────
    retriedFromJobId?: string;
    retryCount?: number;

    // ─────────────────────────────────────────────────────────────
    // TENANT ISOLATION
    // ─────────────────────────────────────────────────────────────
    /** Required for project/public jobs; messaging onboarding is pre-tenant. */
    sId?: string;
    tId?: string;
    uId?: string;
}
