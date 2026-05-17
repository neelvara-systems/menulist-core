/**
 * Menu Image Processing Job Logic
 * 
 * Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 5
 * 
 * This module handles job-based menu image processing:
 * 1. Updates job status to "processing"
 * 2. Calls existing processMenuImagesLogic for AI processing
 * 3. Redistributes combined data to individual files by sourceFileIndex
 * 4. Saves files to project
 * 5. Updates job as completed/failed
 * 
 * Triggered by:
 * - PRODUCTION: Firestore onCreate trigger on menuImageProcessingJobs/{jobId}
 * - DEVELOPMENT: dev_triggerProcessMenuImages callable function
 */

import { Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { firestoreAdmin } from "../firebaseAdmin";
import { normalizeBusinessCategory, resolveBusinessCategory } from "../sharedData/businessTypes";
import { applyCategoryIconDefaults } from "../sharedData/categoryIconSuggestions";
import { ConfidenceSummary, MENU_IMAGE_PROCESSING_JOBS_COLLECTION, MENU_PROCESSING_STATUS, MenuImageProcessingJob, MenuItem, ProcessMenuImagesRequest } from "../types";
import { hardenExtractedData } from "./extractionHardening";
import { processMenuImagesLogic } from "./processMenuImages";
import { buildExistingCategoriesMap, processParallelResponse } from "./redistributeUtils";
import { getProject, saveFilesToProject } from "./saveFilesToProject";
import { applyMenuDerivedBusinessAttributeDefaultsForStore } from "./businessAttributeDefaults";
import { revalidatePublicClientCacheForStore } from "./publicCacheRevalidation";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE SUMMARY (Infrastructure Compounding 10.1)
// Computes aggregate confidence stats from per-item confidence data
// ═══════════════════════════════════════════════════════════════════════════

const CONFIDENCE_SCORE_MAP: Record<string, number> = { high: 1, medium: 0.6, low: 0.2 };

function resolveJobBusinessCategory(businessType?: string, businessCategory?: string): string | undefined {
    return resolveBusinessCategory(businessType, businessCategory) || normalizeBusinessCategory(businessType);
}

function computeConfidenceSummary(items: MenuItem[]): ConfidenceSummary | undefined {
    if (!items || items.length === 0) return undefined;

    let high = 0, medium = 0, low = 0;
    let totalScore = 0;

    for (const item of items) {
        const conf = item.confidence;
        if (!conf) {
            // No confidence = assume high (AI omits when confident)
            high++;
            totalScore += 1;
            continue;
        }

        const nameScore = CONFIDENCE_SCORE_MAP[conf.name] ?? 0.6;
        const priceScore = CONFIDENCE_SCORE_MAP[conf.price] ?? 0.6;
        const avgItemScore = (nameScore + priceScore) / 2;

        if (avgItemScore >= 0.8) high++;
        else if (avgItemScore >= 0.4) medium++;
        else low++;

        totalScore += avgItemScore;
    }

    const total = items.length || 1;

    return {
        highConfidenceCount: high,
        mediumConfidenceCount: medium,
        lowConfidenceCount: low,
        averageConfidenceScore: Math.round((totalScore / total) * 100) / 100,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED JOB PROCESSING LOGIC
// Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 5
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a menu image processing job
 * 
 * Called by both:
 * - Production: Firestore onCreate trigger
 * - Development: dev_triggerProcessMenuImages callable
 * 
 * @param jobId - The job document ID
 * @param job - The job data (from Firestore document)
 */
export async function processMenuImagesJobLogic(
    jobId: string,
    job: MenuImageProcessingJob
): Promise<void> {
    const logger = functions.logger;
    const jobRef = firestoreAdmin
        .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
        .doc(jobId);
    const skipProjectSave = job.skipProjectSave === true || job.projectId?.startsWith("msg-onboarding-");

    logger.info(`[processMenuProcessingJob] === JOB PROCESSING START ===`, {
        jobId,
        step: 'START',
        timestamp: Date.now(),
    });

    try {
        // ─────────────────────────────────────────────────────────────
        // Step 0: Validate tenant isolation (server-side defense-in-depth)
        // Ensures projectId is consistent with job's tId/sId
        // Prevents cross-tenant data injection even if Firestore rules are bypassed
        // ─────────────────────────────────────────────────────────────
        if (job.tId && job.projectId) {
            const projectIdParts = job.projectId.split('-');
            if (projectIdParts.length >= 3) {
                const projectTId = projectIdParts[0];
                const projectSId = projectIdParts[projectIdParts.length - 1];
                if (projectTId !== String(job.tId) || projectSId !== String(job.sId)) {
                    logger.error(`[processMenuImagesJob] SECURITY: projectId tenant mismatch`, {
                        jobId,
                        jobTId: job.tId,
                        jobSId: job.sId,
                        projectTId,
                        projectSId,
                        projectId: job.projectId,
                    });
                    await jobRef.update({
                        status: MENU_PROCESSING_STATUS.FAILED,
                        completedAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                        error: {
                            code: 'TENANT_MISMATCH',
                            message: 'Project does not belong to the job tenant',
                            retryable: false,
                        },
                    });
                    return;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // Step 1: Update status to processing (with idempotency check)
        // Spec Reference: Section 8.6 (Idempotency)
        // ─────────────────────────────────────────────────────────────
        logger.info(`[processMenuImagesJob] Starting transaction for job ${jobId}`);

        const updated = await firestoreAdmin.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            const jobData = jobDoc.data();

            logger.info(`[processMenuImagesJob] Transaction - Job status check:`, {
                jobId,
                status: jobData?.status,
                startedAt: jobData?.startedAt?.toMillis?.(),
                now: Date.now()
            });

            if (jobData?.status !== MENU_PROCESSING_STATUS.PENDING) {
                // Job already picked up by another instance - skip immediately
                // Strict idempotency: only PENDING jobs can be processed
                logger.info(`[processMenuImagesJob] Transaction - Job ${jobId} already being processed (status: ${jobData?.status}), skipping`);
                return false;
            }

            // Set timeoutAt to 10 minutes from now (spec Section 8.2)
            const timeoutMs = 10 * 60 * 1000; // 10 minutes
            transaction.update(jobRef, {
                status: MENU_PROCESSING_STATUS.PROCESSING,
                startedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                timeoutAt: Timestamp.fromMillis(Date.now() + timeoutMs),
                currentStep: "Starting...",
                progress: 0,
            });
            return true;
        });

        if (!updated) {
            return; // Job already being processed
        }

        logger.info(`[processMenuImagesJob] === STEP 1 COMPLETE - Transaction updated ===`, {
            jobId,
            step: 'TRANSACTION_COMPLETE',
            status: MENU_PROCESSING_STATUS.PROCESSING,
            timestamp: Date.now()
        });

        // ─────────────────────────────────────────────────────────────
        // Step 2: Process images using existing AI logic
        // Spec Reference: Section 5 (Function Design)
        // Note: Removed pre-AI cancellation check to save 1 read
        //       (AI is the expensive part, so we check AFTER)
        // ─────────────────────────────────────────────────────────────

        // Build request for existing processMenuImagesLogic
        logger.info(`[processMenuImagesJob] === STEP 2 START - Building AI request ===`, {
            jobId,
            step: 'AI_REQUEST_BUILD',
            filesCount: job.files.length,
            targetLanguages: job.targetLanguages,
            timestamp: Date.now()
        });
        const request: ProcessMenuImagesRequest = {
            files: job.files.map(f => ({
                uid: f.uid,
                name: f.name,
                size: f.size,
                type: f.type,
                url: f.url,
            })),
            targetLanguages: job.targetLanguages,
            projectId: job.projectId,
            action: job.action || "IMAGE_PROCESSING",
            businessCategory: job.businessCategory,
            businessType: job.businessType,
        };

        // Call existing AI processing logic
        // Returns combined data with sourceFileIndex on each category/item
        logger.info(`[processMenuImagesJob] === STEP 2 AI PROCESSING START ===`, {
            jobId,
            step: 'AI_PROCESSING_START',
            timestamp: Date.now()
        });

        const result = await processMenuImagesLogic(request);

        logger.info(`[processMenuImagesJob] === STEP 2 AI PROCESSING COMPLETE ===`, {
            jobId,
            step: 'AI_PROCESSING_COMPLETE',
            hasResult: !!result,
            hasData: !!result?.data,
            hasDataData: !!result?.data?.data,
            qualityScore: result?.data?.qualityScore,
            categoriesCount: result?.data?.data?.categories?.length,
            itemsCount: result?.data?.data?.items?.length,
            timestamp: Date.now()
        });

        // ─────────────────────────────────────────────────────────────
        // Step 2b: Extraction Hardening (P1 — Mar 2026)
        // Category normalization + integrity validation + anomaly detection
        // Non-blocking: logs issues but never fails the job
        // ─────────────────────────────────────────────────────────────
        try {
            const hardening = hardenExtractedData(result.data.data);
            // Apply normalized data back (categories merged, items remapped)
            result.data.data = hardening.data;

            logger.info(`[processMenuImagesJob] Hardening complete`, {
                jobId,
                categoriesMerged: hardening.normalization.mergedCategories,
                categoriesRenamed: hardening.normalization.renamedCategories,
                integrityValid: hardening.integrity.valid,
                integrityIssues: hardening.integrity.issueCount,
                anomalyFlags: hardening.anomalies.length,
            });
        } catch (hardeningError: any) {
            // Hardening failure must NEVER block extraction
            logger.warn(`[processMenuImagesJob] Hardening failed (non-blocking)`, {
                jobId,
                error: hardeningError.message,
            });
        }

        // ─────────────────────────────────────────────────────────────
        // Step 3: Check for cancellation after AI processing
        // Note: Single check after AI (AI is the expensive part)
        // ─────────────────────────────────────────────────────────────
        const postProcessJob = await jobRef.get();
        if (postProcessJob.data()?.status === MENU_PROCESSING_STATUS.CANCELLING) {
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.CANCELLED,
                completedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                currentStep: "Cancelled after AI processing",
                // Save partial results
                result: {
                    combinedData: result.data.data,
                    qualityScore: result.data.qualityScore,
                    qualityDetails: result.data.qualityDetails,
                    processingTime: result.transaction.processingTime,
                },
            });
            logger.info(`[processMenuImagesJob] Job ${jobId} cancelled after AI processing`);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // Step 4: Update progress - AI complete, now processing
        // OPTIMIZATION: Single update instead of 3 separate ones (70%, 80%, 90%)
        // ─────────────────────────────────────────────────────────────
        await jobRef.update({
            currentStep: "Processing complete, saving to project...",
            progress: 50,
            updatedAt: Timestamp.now(),
        });

        // ─────────────────────────────────────────────────────────────
        // Step 5: Fetch existing project and detect first extraction
        // Spec Reference: ai-extraction-integration.md Section 5.2
        // ─────────────────────────────────────────────────────────────

        logger.info(`[processMenuImagesJob] === STEP 5 START - Resolving project context ===`, {
            jobId,
            projectId: job.projectId,
            step: 'FETCH_PROJECT',
            skipProjectSave,
            timestamp: Date.now()
        });

        // Fetch existing project to get existing categories (Section 8.12).
        // Messaging onboarding only needs extraction output for its session,
        // so it skips the temp project read/write/delete cycle.
        const existingProject = skipProjectSave ? null : await getProject(job.projectId);

        logger.info(`[processMenuImagesJob] === STEP 5 PROJECT CONTEXT RESOLVED ===`, {
            jobId,
            projectId: job.projectId,
            step: 'PROJECT_FETCHED',
            hasExistingProject: !!existingProject,
            existingFilesCount: existingProject?.files?.length || 0,
            skipProjectSave,
            timestamp: Date.now()
        });
        const primaryLang = job.targetLanguages[0]?.code || 'en';
        const existingCategories = existingProject?.files
            ? buildExistingCategoriesMap(existingProject.files, primaryLang)
            : undefined;
        const businessCategory = resolveJobBusinessCategory(
            job.businessType || existingProject?.businessType,
            job.businessCategory || existingProject?.businessCategory,
        );
        const categoriesBeforeIconDefaults = result.data.data?.categories?.length || 0;
        result.data.data = {
            ...result.data.data,
            categories: applyCategoryIconDefaults(
                result.data.data?.categories || [],
                result.data.data?.items || [],
                businessCategory,
            ),
        };
        const categoriesWithIconDefaults = (result.data.data?.categories || []).filter((category: any) => typeof category?.icon === 'string' && category.icon.length > 0).length;

        logger.info(`[processMenuImagesJob] Category icon defaults applied`, {
            jobId,
            businessCategory: businessCategory || null,
            categoriesCount: categoriesBeforeIconDefaults,
            categoriesWithIcons: categoriesWithIconDefaults,
        });

        // Detect first extraction vs re-extraction
        // First extraction = no existing menu items
        // Re-extraction = has existing menu items → needs preview/review
        // EXCEPTION: Linked outlets always require review (even first extraction)
        //            because they have master items, local items, and overrides
        const hasExistingItems = existingProject?.files?.some((f: any) => f.extractedData?.data?.items?.length > 0);
        const isLinkedOutlet = !!existingProject?.masterProjectId;

        // Linked outlets always require review for safety
        const requiresReview = skipProjectSave ? false : (hasExistingItems || isLinkedOutlet);
        const isFirstExtraction = !requiresReview;

        logger.info(`[processMenuImagesJob] Extraction type detected`, {
            jobId,
            isFirstExtraction,
            hasExistingItems,
            isLinkedOutlet,
            existingFilesCount: existingProject?.files?.length || 0,
            masterProjectId: existingProject?.masterProjectId || null,
        });

        // Wrap result.data in the format expected by processParallelResponse
        // Cast to any to handle flexible AI output format
        const combinedResponse = {
            data: result.data.data as any,
            qualityScore: result.data.qualityScore,
            qualityDetails: result.data.qualityDetails,
        };

        // Calculate per-file results (including processingMessages - Section 8.14)
        const fileResults: { [uid: string]: { categoriesCount: number; itemsCount: number; processingMessages?: any[] } } = {};

        // ─────────────────────────────────────────────────────────────
        // Step 6: Branch based on first extraction vs re-extraction
        // Spec Reference: ai-extraction-integration.md Section 6.2
        // ─────────────────────────────────────────────────────────────

        if (isFirstExtraction) {
            // ═══════════════════════════════════════════════════════════
            // FIRST EXTRACTION: Auto-save directly (existing behavior)
            // Fast onboarding - no review needed
            // ═══════════════════════════════════════════════════════════

            logger.info(`[processMenuImagesJob] === STEP 6 FIRST EXTRACTION - Processing ===`, {
                jobId,
                step: 'FIRST_EXTRACTION_START',
                isFirstExtraction,
                timestamp: Date.now()
            });

            // Redistribute and transform IDs (passing existing categories for cross-file refs)
            logger.info(`[processMenuImagesJob] === STEP 6 REDISTRIBUTING DATA ===`, {
                jobId,
                step: 'REDISTRIBUTE_START',
                filesCount: job.files.length,
                timestamp: Date.now()
            });

            const redistributedData = processParallelResponse(combinedResponse, job.files, existingCategories);

            logger.info(`[processMenuImagesJob] === STEP 6 REDISTRIBUTION COMPLETE ===`, {
                jobId,
                step: 'REDISTRIBUTE_COMPLETE',
                redistributedDataSize: redistributedData?.size,
                timestamp: Date.now()
            });

            redistributedData.forEach((extractedData, fileUid) => {
                fileResults[fileUid] = {
                    categoriesCount: extractedData?.data?.categories?.length || 0,
                    itemsCount: extractedData?.data?.items?.length || 0,
                    ...(extractedData?.processingMessages?.length ? {
                        processingMessages: extractedData.processingMessages
                    } : {})
                };
            });
            const redistributedFiles = Object.fromEntries([...redistributedData.entries()]);

            if (!skipProjectSave) {
                // Save files to project directly
                logger.info(`[processMenuImagesJob] === STEP 6 SAVING TO PROJECT ===`, {
                    jobId,
                    projectId: job.projectId,
                    step: 'SAVE_TO_PROJECT_START',
                    filesCount: job.files.length,
                    redistributedDataSize: redistributedData?.size,
                    timestamp: Date.now(),
                    fullRedistributedData: JSON.stringify([...redistributedData.entries()])
                });

                await saveFilesToProject(
                    job.projectId,
                    redistributedData,
                    job.files,
                    result.data.data.languages || [],
                    true, // enableAutoMerge
                    existingProject
                );

                let businessAttributeDefaultsApplied = false;
                try {
                    businessAttributeDefaultsApplied = await applyMenuDerivedBusinessAttributeDefaultsForStore({
                        storeId: job.sId,
                        menuData: result.data.data,
                        context: 'processMenuImagesJob:firstExtraction',
                    });
                } catch (attributeError: any) {
                    logger.warn(`[processMenuImagesJob] Business attribute defaults failed (non-blocking)`, {
                        jobId,
                        storeId: job.sId,
                        error: attributeError?.message || String(attributeError),
                    });
                }
                if (!businessAttributeDefaultsApplied) {
                    await revalidatePublicClientCacheForStore(job.sId, 'processMenuImagesJob:firstExtractionProjectSave');
                }

                logger.info(`[processMenuImagesJob] === STEP 6 SAVE TO PROJECT COMPLETE ===`, {
                    jobId,
                    projectId: job.projectId,
                    step: 'SAVE_TO_PROJECT_COMPLETE',
                    timestamp: Date.now()
                });

                // Verify the project was actually updated
                const projectVerifyRef = firestoreAdmin.collection('projects').doc(String(job.tId)).collection(String(job.sId)).doc(job.projectId);
                const verifyDoc = await projectVerifyRef.get();
                logger.info(`[processMenuImagesJob] === VERIFY PROJECT UPDATE ===`, {
                    jobId,
                    projectId: job.projectId,
                    projectExists: verifyDoc.exists,
                    projectFilesCount: verifyDoc.data()?.files?.length || 0,
                    projectLanguages: verifyDoc.data()?.languages || [],
                    projectPath: projectVerifyRef.path,
                });
            } else {
                logger.info(`[processMenuImagesJob] Project save skipped for extraction-only job`, {
                    jobId,
                    projectId: job.projectId,
                    source: job.source || null,
                });
            }

            // Compute confidence summary (Infrastructure Compounding 10.1)
            const confidenceSummary = computeConfidenceSummary(
                (result.data.data?.items as MenuItem[]) || []
            );

            // Update job as completed
            logger.info(`[processMenuImagesJob] Updating job status to COMPLETED`, { jobId });
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.COMPLETED,
                completedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                progress: 100,
                currentStep: "Completed",
                isFirstExtraction: true,
                result: {
                    combinedData: result.data.data,
                    qualityScore: result.data.qualityScore,
                    qualityDetails: result.data.qualityDetails,
                    processingTime: result.transaction.processingTime,
                    batchResults: (result as any).batchResults,
                    // Infrastructure Compounding 10.1 — piggybacked on existing write
                    ...(confidenceSummary ? { confidenceSummary } : {}),
                    ...(skipProjectSave ? { redistributedFiles } : {}),
                    // Extraction provenance (P0 hardening — Mar 2026)
                    ...(result.provenance ? {
                        rawBatchResponses: result.provenance.rawBatchResponses,
                        promptVersion: result.provenance.promptVersion,
                        model: result.provenance.model,
                    } : {}),
                },
                fileResults,
                transaction: {
                    transactionId: result.transaction.transactionId,
                    totalCredits: result.transaction.totalCredits,
                    totalCharge: result.transaction.totalCharge,
                    tokenUsage: {
                        promptTokenCount: (result.transaction as any).promptTokenCount || 0,
                        candidatesTokenCount: (result.transaction as any).candidatesTokenCount || 0,
                        totalTokenCount: (result.transaction as any).totalTokenCount || 0,
                    },
                },
            });

            logger.info(`[processMenuImagesJob] Job status updated to COMPLETED successfully`, { jobId });

            logger.info(`[processMenuImagesJob] First extraction completed - auto-saved`, {
                jobId,
                projectId: job.projectId,
                qualityScore: result.data.qualityScore,
                categoriesCount: result.data.data.categories?.length || 0,
                itemsCount: result.data.data.items?.length || 0,
                processingTime: result.transaction.processingTime,
            });

        } else {
            // ═══════════════════════════════════════════════════════════
            // RE-EXTRACTION: Write raw data, set preview_ready
            // Client will handle comparison, review, and save
            // ═══════════════════════════════════════════════════════════

            // Set TTL to 24 hours for unapproved jobs
            const ttlMs = 24 * 60 * 60 * 1000; // 24 hours

            // Compute confidence summary (Infrastructure Compounding 10.1)
            const reExtractConfidence = computeConfidenceSummary(
                (result.data.data?.items as MenuItem[]) || []
            );

            await jobRef.update({
                status: MENU_PROCESSING_STATUS.PREVIEW_READY,
                updatedAt: Timestamp.now(),
                progress: 100,
                currentStep: "Preview ready - awaiting review",
                isFirstExtraction: false,
                expiresAt: Timestamp.fromMillis(Date.now() + ttlMs),
                result: {
                    combinedData: result.data.data, // Raw combined data with sourceFileIndex
                    qualityScore: result.data.qualityScore,
                    qualityDetails: result.data.qualityDetails,
                    processingTime: result.transaction.processingTime,
                    batchResults: (result as any).batchResults,
                    // Infrastructure Compounding 10.1 — piggybacked on existing write
                    ...(reExtractConfidence ? { confidenceSummary: reExtractConfidence } : {}),
                    // Extraction provenance (P0 hardening — Mar 2026)
                    ...(result.provenance ? {
                        rawBatchResponses: result.provenance.rawBatchResponses,
                        promptVersion: result.provenance.promptVersion,
                        model: result.provenance.model,
                    } : {}),
                },
                transaction: {
                    transactionId: result.transaction.transactionId,
                    totalCredits: result.transaction.totalCredits,
                    totalCharge: result.transaction.totalCharge,
                    tokenUsage: {
                        promptTokenCount: (result.transaction as any).promptTokenCount || 0,
                        candidatesTokenCount: (result.transaction as any).candidatesTokenCount || 0,
                        totalTokenCount: (result.transaction as any).totalTokenCount || 0,
                    },
                },
            });

            logger.info(`[processMenuImagesJob] Re-extraction ready for preview`, {
                jobId,
                projectId: job.projectId,
                qualityScore: result.data.qualityScore,
                categoriesCount: result.data.data.categories?.length || 0,
                itemsCount: result.data.data.items?.length || 0,
                processingTime: result.transaction.processingTime,
                expiresIn: '24 hours',
            });
        }

    } catch (error: any) {
        // ─────────────────────────────────────────────────────────────
        // Step 7: Update job as failed
        // Spec Reference: Section 4 (Data Models - error field)
        // Safety: If this update itself fails, the 15-min cleanup
        // scheduler will catch the job via timeoutAt and mark it failed.
        // ─────────────────────────────────────────────────────────────
        logger.error(`[processMenuImagesJob] Job ${jobId} failed`, {
            jobId,
            projectId: job.projectId,
            error: error.message,
        });

        try {
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.FAILED,
                completedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                progress: 0,
                currentStep: "Failed",
                error: {
                    code: getErrorCode(error),
                    message: error.message || "Unknown error",
                    retryable: isRetryable(error),
                },
            });
        } catch (updateError: any) {
            // Critical: job stuck in 'processing' — cleanup scheduler handles via timeoutAt
            logger.error(`[processMenuImagesJob] CRITICAL: Failed to update job ${jobId} status to failed`, {
                jobId,
                originalError: error.message,
                updateError: updateError.message,
            });
        }

    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map error to error code
 */
function getErrorCode(error: any): string {
    const message = error.message?.toLowerCase() || "";

    if (message.includes("rate limit") || message.includes("quota")) {
        return "RATE_LIMIT";
    }
    if (message.includes("timeout")) {
        return "TIMEOUT";
    }
    if (message.includes("circuit") || message.includes("breaker")) {
        return "CIRCUIT_BREAKER";
    }
    if (message.includes("gemini") || message.includes("ai")) {
        return "AI_ERROR";
    }
    if (message.includes("upload") || message.includes("file")) {
        return "FILE_ERROR";
    }

    return "INTERNAL_ERROR";
}

/**
 * Determine if error is retryable
 */
function isRetryable(error: any): boolean {
    const code = getErrorCode(error);

    // Rate limits, timeouts, circuit breaker trips, and transient AI errors are retryable
    // FILE_ERROR and INTERNAL_ERROR are NOT retryable (likely persistent issues)
    return code === "RATE_LIMIT" || code === "TIMEOUT" || code === "CIRCUIT_BREAKER" || code === "AI_ERROR";
}
