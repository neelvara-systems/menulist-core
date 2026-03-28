/**
 * Save Files to Project
 * 
 * Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 5
 * 
 * This function appends new file entries to an existing project and updates
 * the project's languages array. It handles the server-side persistence
 * after AI processing is complete.
 * 
 * Path pattern: projects/{tId}/{sId}/{projectId}
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from "../firebaseAdmin";
import { ExtractedData, ExtractedDataItem, autoMergeItems } from "./redistributeUtils";

const PROJECTS_COLLECTION = DB_COLLECTIONS.PROJECTS;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ProjectFileEntry {
    uid: string;
    name: string;
    size: number;
    type: string;
    url: string;
    active: boolean;
    deleted: boolean;
    index?: number;
    extractedData?: ExtractedData | null;
    processingTime?: number;
    qualityScore?: number;
}

export interface JobFileInput {
    uid: string;
    name: string;
    size: number;
    type: string;
    url: string;
}

export interface LanguageInput {
    code: string;
    name: string;
    isPrimary?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse projectId to extract tenant and store IDs
 * 
 * ProjectId format: {tId}-{timestamp}-{sId}
 * Example: "14-abc123-15" → { tId: "14", sId: "15" }
 * 
 * Also handles default project format: {tId}-default-{sId}
 */
function parseProjectId(projectId: string): { tId: string; sId: string } {
    const parts = projectId.split('-');

    if (parts.length < 3) {
        throw new Error(`Invalid projectId format: ${projectId}. Expected format: {tId}-{timestamp}-{sId}`);
    }

    // First part is tId, last part is sId
    const tId = parts[0];
    const sId = parts[parts.length - 1];

    return { tId, sId };
}

/**
 * Get project document reference
 */
function getProjectRef(projectId: string) {
    const { tId, sId } = parseProjectId(projectId);
    return firestoreAdmin.collection(PROJECTS_COLLECTION).doc(tId).collection(sId).doc(projectId);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge statistics returned from saveFilesToProject
 */
export interface MergeStats {
    replacedCount: number;
    addedCount: number;
    newFilesCount: number;
}

/**
 * Save processed files to a project
 * 
 * This function:
 * 1. Reads existing project inside a Firestore transaction (always fresh)
 * 2. Builds new file entries from job files + redistributed extracted data
 * 3. Auto-merges items (replaces same-name items in same category) - Section 8.13
 * 4. Appends to existing files array (or creates if new)
 * 5. Merges new languages with existing languages
 * 6. Saves to Firestore atomically (inside transaction — prevents race conditions)
 * 
 * @param projectId - The project ID (format: {tId}-{timestamp}-{sId})
 * @param redistributedData - Map of fileUid -> ExtractedData
 * @param jobFiles - Array of files from the job
 * @param languages - Array of languages detected by AI
 * @param enableAutoMerge - Whether to auto-merge same-name items (default: true)
 * @param _existingProjectData - IGNORED — transaction always reads fresh data for safety
 * @returns Merge statistics
 */
export async function saveFilesToProject(
    projectId: string,
    redistributedData: Map<string, ExtractedData>,
    jobFiles: JobFileInput[],
    languages: LanguageInput[],
    enableAutoMerge: boolean = true,
    _existingProjectData?: any // Ignored — transaction always reads fresh data for safety
): Promise<MergeStats> {
    const logger = functions.logger;

    logger.info('[saveFilesToProject] Starting save', {
        projectId,
        filesCount: jobFiles.length,
        languagesCount: languages.length,
    });

    const projectRef = getProjectRef(projectId);

    try {
        // Use a Firestore transaction to prevent race conditions.
        // Without this, concurrent writes (e.g., user adding files while extraction
        // is running) could be lost because the read-then-write is not atomic.
        const mergeStats = await firestoreAdmin.runTransaction(async (transaction) => {
            // 1. Read project inside transaction (always fresh, ignores _existingProjectData)
            const projectDoc = await transaction.get(projectRef);
            const existingProject = projectDoc.exists ? projectDoc.data() : null;
            const existingFiles: ProjectFileEntry[] = existingProject?.files || [];
            const existingLanguages: string[] = existingProject?.languages || [];

            logger.info('[saveFilesToProject] Existing project state', {
                exists: !!existingProject,
                existingFilesCount: existingFiles.length,
                existingLanguagesCount: existingLanguages.length,
            });

            // 2. Get primary language for auto-merge
            const primaryLang = existingLanguages[0] || languages[0]?.code || 'en';

            // 3. Auto-merge items if enabled and there are existing items (Section 8.13)
            let replacedCount = 0;
            let addedCount = 0;

            if (enableAutoMerge && existingFiles.length > 0) {
                // Get all existing items
                const existingItems: ExtractedDataItem[] = existingFiles.flatMap(
                    file => (file.extractedData?.data?.items || []) as ExtractedDataItem[]
                );

                // Get all new items
                const allNewItems: ExtractedDataItem[] = [];
                redistributedData.forEach((data) => {
                    if (data?.data?.items) {
                        allNewItems.push(...(data.data.items as ExtractedDataItem[]));
                    }
                });

                if (existingItems.length > 0 && allNewItems.length > 0) {
                    // Run auto-merge
                    const mergeResult = autoMergeItems(existingItems, allNewItems, primaryLang);
                    replacedCount = mergeResult.replacedCount;
                    addedCount = mergeResult.addedCount;

                    logger.info('[saveFilesToProject] Auto-merge result', {
                        replacedCount,
                        addedCount,
                        totalMergedItems: mergeResult.mergedItems.length,
                    });

                    // Note: For now, we still append new files with their items
                    // The auto-merge stats are for reporting; actual item merging
                    // would require restructuring the data model (future enhancement)
                }
            }

            // 4. Build new file entries
            // Infrastructure Compounding 10.2: Stamp items with _extractedAt
            // so client-side detectAndLogChanges can identify recently-extracted items
            const extractedAtTimestamp = Timestamp.now();

            const startIndex = existingFiles.length;
            const newFiles: ProjectFileEntry[] = jobFiles.map((file, idx) => {
                const extractedData = redistributedData.get(file.uid) || null;

                // Stamp each item with _extractedAt for 10.2 Learning Loop
                if (extractedData?.data?.items) {
                    for (const item of extractedData.data.items as any[]) {
                        item._extractedAt = extractedAtTimestamp;
                    }
                }

                return {
                    uid: file.uid,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: file.url,
                    active: true,
                    deleted: false,
                    index: startIndex + idx,
                    extractedData: extractedData ? {
                        message: extractedData.message || '',
                        // Include processingMessages if any (Section 8.14)
                        ...(extractedData.processingMessages?.length ? {
                            processingMessages: extractedData.processingMessages
                        } : {}),
                        data: extractedData.data,
                    } : null,
                    qualityScore: extractedData?.qualityScore,
                };
            });

            // 5. Merge languages (unique by code, preserve primary flag)
            const languageCodeSet = new Set(existingLanguages);
            const newLanguageCodes: string[] = [];

            languages.forEach(lang => {
                if (!languageCodeSet.has(lang.code)) {
                    languageCodeSet.add(lang.code);
                    newLanguageCodes.push(lang.code);
                }
            });

            // Language priority: if this is first upload, primary first; otherwise append
            const mergedLanguages = existingLanguages.length > 0
                ? [...existingLanguages, ...newLanguageCodes]
                : languages.map(l => l.code); // For first upload, preserve AI-detected order

            // 6. Prepare update data
            const updateData = {
                projectId,
                files: [...existingFiles, ...newFiles],
                languages: mergedLanguages,
            };

            // 6b. Document size safety guard (Firestore 1MB limit)
            // Estimate size using JSON.stringify — actual Firestore encoding is slightly larger
            // but this gives a reliable lower bound for the safety check
            const estimatedBytes = Buffer.byteLength(JSON.stringify(updateData), 'utf8');
            const FIRESTORE_SAFE_LIMIT = 900_000; // 900KB — 90% of 1MB limit (safety margin)

            logger.info('[saveFilesToProject] Preparing update data', {
                projectId,
                totalFiles: updateData.files.length,
                newFilesAdded: newFiles.length,
                existingFilesCount: existingFiles.length,
                totalLanguages: mergedLanguages.length,
                newLanguagesAdded: newLanguageCodes.length,
                estimatedBytes,
                fullUpdateData: JSON.stringify(updateData),
            });

            if (estimatedBytes > FIRESTORE_SAFE_LIMIT) {
                logger.error('[saveFilesToProject] DOCUMENT SIZE EXCEEDED SAFE LIMIT', {
                    projectId,
                    estimatedBytes,
                    limit: FIRESTORE_SAFE_LIMIT,
                    totalFiles: updateData.files.length,
                    totalItems: updateData.files.reduce((sum: number, f: any) =>
                        sum + (f.extractedData?.data?.items?.length || 0), 0),
                });
                throw new Error(
                    `Project document would exceed safe size limit (${Math.round(estimatedBytes / 1024)}KB / ${Math.round(FIRESTORE_SAFE_LIMIT / 1024)}KB). ` +
                    `Menu may be too large. Try processing fewer files at once.`
                );
            }

            if (estimatedBytes > 700_000) {
                logger.warn('[saveFilesToProject] Document approaching size limit', {
                    projectId,
                    estimatedBytes,
                    percentOfLimit: Math.round((estimatedBytes / FIRESTORE_SAFE_LIMIT) * 100),
                });
            }

            // 7. Save to Firestore (inside transaction — atomic with the read)
            transaction.set(projectRef, updateData, { merge: true });

            logger.info('[saveFilesToProject] Save complete', {
                projectId,
                totalFiles: updateData.files.length,
                newFilesAdded: newFiles.length,
                totalLanguages: mergedLanguages.length,
                newLanguagesAdded: newLanguageCodes.length,
                replacedCount,
                addedCount,
            });

            return {
                replacedCount,
                addedCount,
                newFilesCount: newFiles.length,
            };
        });

        return mergeStats;

    } catch (error: any) {
        logger.error('[saveFilesToProject] Failed to save', {
            projectId,
            error: error.message,
        });
        throw error;
    }
}

/**
 * Get project data (for testing/debugging)
 */
export async function getProject(projectId: string): Promise<any | null> {
    const projectRef = getProjectRef(projectId);
    const doc = await projectRef.get();
    return doc.exists ? doc.data() : null;
}
