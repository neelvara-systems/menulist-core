/**
 * Save Files to Project
 * 
 * Spec Reference: menu-image-processing-job-queue-spec.md Section 5
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
import type { ExtractedBusinessProfile } from '../sharedData/extractedBusinessProfile';
import { getSuggestionValue } from '../sharedData/extractedBusinessProfile';
import { selectNewMenuExtractionProjectFiles } from '../sharedData/menuExtractionIntegrity';
import { MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS } from '../sharedData/menuExtractionProjectSize';
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

const CANONICAL_SOURCE_LANGUAGE = 'en';
const SAVE_FILES_TO_PROJECT_FAILED = 'SAVE_FILES_TO_PROJECT_FAILED';

function getBoundedSaveFilesStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getSaveFilesErrorContext(error: unknown): Record<string, string | number | undefined> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    const statusValue = sourceError?.status ?? sourceError?.statusCode;
    const status = Number(statusValue);
    return {
        sourceErrorName: error instanceof Error ? error.name || 'Error' : typeof error,
        sourceErrorCode: sourceError?.code === undefined || sourceError?.code === null ? undefined : String(sourceError.code).slice(0, 64),
        sourceStatusCode: Number.isFinite(status) ? status : undefined,
    };
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
    if (!/^[A-Za-z0-9_-]{3,160}$/.test(projectId)) {
        throw new Error('Invalid projectId format.');
    }
    const parts = projectId.split('-');

    if (parts.length < 3) {
        throw new Error(`Invalid projectId format: ${projectId}. Expected format: {tId}-{timestamp}-{sId}`);
    }

    // First part is tId, last part is sId
    const tId = parts[0];
    const sId = parts[parts.length - 1];
    if (!tId || !sId) {
        throw new Error('Invalid projectId scope.');
    }

    return { tId, sId };
}

/**
 * Get project document reference
 */
function getProjectRef(projectId: string) {
    const { tId, sId } = parseProjectId(projectId);
    return firestoreAdmin.collection(PROJECTS_COLLECTION).doc(tId).collection(sId).doc(projectId);
}

function matchesOptionalProjectScopeValue(value: unknown, expected: string): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    return String(value) === expected;
}

function normalizeProjectLanguageCode(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(normalized) ? normalized : null;
}

function normalizeProjectLanguages(
    existingLanguages: unknown[] = [],
    detectedLanguages: LanguageInput[] = [],
): string[] {
    const normalizedExistingLanguages = existingLanguages
        .map(normalizeProjectLanguageCode)
        .filter((code): code is string => code !== null);
    const normalizedDetectedLanguages = detectedLanguages
        .map((language) => normalizeProjectLanguageCode(language?.code))
        .filter((code): code is string => code !== null);
    const collected = [
        ...normalizedExistingLanguages,
        ...normalizedDetectedLanguages,
    ];

    const deduped = Array.from(new Set(collected));

    return [
        CANONICAL_SOURCE_LANGUAGE,
        ...deduped.filter((languageCode) => languageCode !== CANONICAL_SOURCE_LANGUAGE),
    ];
}

function getDetectedDefaultLanguage(detectedLanguages: LanguageInput[] = []): string {
    const primaryLanguage = normalizeProjectLanguageCode(
        detectedLanguages.find((language) => language.isPrimary)?.code,
    );
    if (primaryLanguage) return primaryLanguage;

    return detectedLanguages
        .map((language) => normalizeProjectLanguageCode(language?.code))
        .find((code): code is string => code !== null) || CANONICAL_SOURCE_LANGUAGE;
}

function resolvePlainText(value: unknown): string {
    if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const textMap = value as Record<string, unknown>;
        const preferred = textMap.en || textMap[Object.keys(textMap)[0]];
        return resolvePlainText(preferred);
    }
    return '';
}

function isGenericProjectName(value: unknown): boolean {
    const normalized = resolvePlainText(value).toLowerCase();
    if (!normalized) return true;
    return [
        'menu',
        'digital menu',
        'default menu',
        'main menu',
        'my menu',
        'untitled',
        'untitled menu',
        'project',
    ].includes(normalized);
}

function buildExtractedProfileProjectDefaults(
    existingProject: any,
    profile?: ExtractedBusinessProfile,
): Record<string, any> {
    if (!profile) return {};

    const updateData: Record<string, any> = {};
    const accentColor = getSuggestionValue(profile.visualBrand?.brandAccentColor, 'medium');
    const imageBackgroundColor = getSuggestionValue(profile.visualBrand?.imageBackgroundColor, 'medium');
    const projectName = getSuggestionValue(profile.project?.projectName, 'high');

    if (accentColor && !existingProject?.config?.design?.brand?.accentColor) {
        updateData.config = {
            ...(existingProject?.config || {}),
            ...(updateData.config || {}),
            design: {
                ...(existingProject?.config?.design || {}),
                ...(updateData.config?.design || {}),
                brand: {
                    ...(existingProject?.config?.design?.brand || {}),
                    ...(updateData.config?.design?.brand || {}),
                    accentColor,
                },
            },
        };
    }

    if (imageBackgroundColor && !existingProject?.aiPreferences?.image?.backgroundColor) {
        updateData.aiPreferences = {
            ...(existingProject?.aiPreferences || {}),
            ...(updateData.aiPreferences || {}),
            image: {
                ...(existingProject?.aiPreferences?.image || {}),
                ...(updateData.aiPreferences?.image || {}),
                backgroundColor: imageBackgroundColor,
            },
        };
    }

    if (projectName && isGenericProjectName(existingProject?.name)) {
        updateData.name = projectName;
        if (isGenericProjectName(existingProject?.description)) {
            updateData.description = projectName;
        }
    }

    return updateData;
}

function getExistingProjectSummary(
    summaryDocData: Record<string, any> | undefined,
    projectId: string,
): Record<string, any> | null {
    if (!summaryDocData || typeof summaryDocData !== 'object') return null;

    const flatSummary = summaryDocData[`projects.${projectId}`];
    if (flatSummary && typeof flatSummary === 'object' && !Array.isArray(flatSummary)) {
        return flatSummary;
    }

    const nestedSummary = summaryDocData.projects?.[projectId];
    if (nestedSummary && typeof nestedSummary === 'object' && !Array.isArray(nestedSummary)) {
        return nestedSummary;
    }

    return null;
}

function buildProjectSummaryDefaultsUpdate(updateData: Record<string, any>): Record<string, any> {
    const summaryUpdate: Record<string, any> = {};
    const name = typeof updateData.name === 'string' ? updateData.name.trim() : '';
    const description = typeof updateData.description === 'string' ? updateData.description.trim() : '';

    if (name) summaryUpdate.name = name;
    if (description) summaryUpdate.description = description;

    return summaryUpdate;
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
    _existingProjectData?: any, // Ignored — transaction always reads fresh data for safety
    extractedBusinessProfile?: ExtractedBusinessProfile,
): Promise<MergeStats> {
    const logger = functions.logger;

    logger.info('[saveFilesToProject] Starting save', {
        ...getBoundedSaveFilesStringContext('projectId', projectId),
        filesCount: jobFiles.length,
        languagesCount: languages.length,
    });

    const projectScope = parseProjectId(projectId);
    const projectRef = getProjectRef(projectId);

    try {
        // Use a Firestore transaction to prevent race conditions.
        // Without this, concurrent writes (e.g., user adding files while extraction
        // is running) could be lost because the read-then-write is not atomic.
        const mergeStats = await firestoreAdmin.runTransaction(async (transaction) => {
            // 1. Read project inside transaction (always fresh, ignores _existingProjectData)
            const projectDoc = await transaction.get(projectRef);
            const existingProject = projectDoc.exists ? projectDoc.data() : null;
            if (!existingProject) {
                throw new Error('Project not found.');
            }
            if (existingProject.deleted === true) {
                throw new Error('Project is not available for extraction.');
            }
            if (
                !matchesOptionalProjectScopeValue(existingProject.projectId, projectId)
                || !matchesOptionalProjectScopeValue(existingProject.tId, projectScope.tId)
                || !matchesOptionalProjectScopeValue(existingProject.tenantId, projectScope.tId)
                || !matchesOptionalProjectScopeValue(existingProject.sId, projectScope.sId)
                || !matchesOptionalProjectScopeValue(existingProject.storeId, projectScope.sId)
            ) {
                throw new Error('Project identity does not match extraction scope.');
            }
            if (existingProject.files !== undefined && !Array.isArray(existingProject.files)) {
                throw new Error('Invalid project files data.');
            }
            if (existingProject.languages !== undefined && !Array.isArray(existingProject.languages)) {
                throw new Error('Invalid project languages data.');
            }
            const existingFiles: ProjectFileEntry[] = existingProject.files || [];
            const existingLanguages: unknown[] = existingProject.languages || [];
            const existingDefaultLanguage = normalizeProjectLanguageCode(existingProject?.defaultLanguage);
            const jobFilesToAppend = selectNewMenuExtractionProjectFiles(existingFiles, jobFiles);
            const jobFileUidsToAppend = new Set(jobFilesToAppend.map((file) => file.uid));

            logger.info('[saveFilesToProject] Existing project state', {
                exists: !!existingProject,
                existingFilesCount: existingFiles.length,
                existingLanguagesCount: existingLanguages.length,
            });

            // 2. Get primary language for auto-merge
            const normalizedProjectLanguages = normalizeProjectLanguages(existingLanguages, languages);
            const primaryLang = normalizedProjectLanguages[0] || CANONICAL_SOURCE_LANGUAGE;

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
                redistributedData.forEach((data, fileUid) => {
                    if (!jobFileUidsToAppend.has(fileUid)) return;
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
            const newFiles: ProjectFileEntry[] = jobFilesToAppend.map((file, idx) => {
                const extractedData = redistributedData.get(file.uid) || null;
                const stampedData = extractedData?.data ? {
                    ...extractedData.data,
                    items: (extractedData.data.items || []).map((item) => ({
                        ...item,
                        _extractedAt: extractedAtTimestamp,
                    })),
                } : extractedData?.data;

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
                        data: stampedData,
                    } : null,
                    qualityScore: extractedData?.qualityScore,
                };
            });

            // 5. Merge languages (unique by code, preserve primary flag)
            const mergedLanguages = normalizedProjectLanguages;
            const normalizedExistingLanguageCodes = new Set(
                existingLanguages
                    .map(normalizeProjectLanguageCode)
                    .filter((code): code is string => code !== null),
            );
            const newLanguageCodes = mergedLanguages.filter((languageCode) => !normalizedExistingLanguageCodes.has(languageCode));
            const detectedDefaultLanguage = getDetectedDefaultLanguage(languages);
            const resolvedDefaultLanguage = existingDefaultLanguage && mergedLanguages.includes(existingDefaultLanguage)
                ? existingDefaultLanguage
                : (mergedLanguages.includes(detectedDefaultLanguage) ? detectedDefaultLanguage : CANONICAL_SOURCE_LANGUAGE);

            // 6. Prepare update data
            const updateData = {
                projectId,
                files: [...existingFiles, ...newFiles],
                languages: mergedLanguages,
                defaultLanguage: resolvedDefaultLanguage,
                ...buildExtractedProfileProjectDefaults(existingProject, extractedBusinessProfile),
            };
            const summaryDefaultsUpdate = buildProjectSummaryDefaultsUpdate(updateData);
            const hasSummaryDefaultsUpdate = Object.keys(summaryDefaultsUpdate).length > 0;
            let existingProjectSummary: Record<string, any> | null = null;

            if (hasSummaryDefaultsUpdate) {
                const { sId } = parseProjectId(projectId);
                const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${sId}`);
                const summaryDoc = await transaction.get(summaryRef);
                existingProjectSummary = summaryDoc.exists
                    ? getExistingProjectSummary(summaryDoc.data() as Record<string, any>, projectId)
                    : null;

                if (existingProjectSummary) {
                    transaction.set(summaryRef, {
                        lastUpdated: Timestamp.now(),
                        [`projects.${projectId}`]: {
                            ...existingProjectSummary,
                            ...summaryDefaultsUpdate,
                        },
                    }, { merge: true });
                }
            }

            // 6b. Document size safety guard (Firestore 1MB limit)
            // Estimate size using JSON.stringify — actual Firestore encoding is slightly larger
            // but this gives a reliable lower bound for the safety check
            const estimatedBytes = Buffer.byteLength(JSON.stringify(updateData), 'utf8');
            const FIRESTORE_SAFE_LIMIT = MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.SAVE_SAFE_BYTES;

            logger.info('[saveFilesToProject] Preparing update data', {
                ...getBoundedSaveFilesStringContext('projectId', projectId),
                totalFiles: updateData.files.length,
                newFilesAdded: newFiles.length,
                replayedFilesSkipped: jobFiles.length - newFiles.length,
                existingFilesCount: existingFiles.length,
                totalLanguages: mergedLanguages.length,
                newLanguagesAdded: newLanguageCodes.length,
                estimatedBytes,
            });

            if (estimatedBytes > FIRESTORE_SAFE_LIMIT) {
                logger.error('[saveFilesToProject] DOCUMENT SIZE EXCEEDED SAFE LIMIT', {
                    ...getBoundedSaveFilesStringContext('projectId', projectId),
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

            if (estimatedBytes > MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.WARNING_BYTES) {
                logger.warn('[saveFilesToProject] Document approaching size limit', {
                    ...getBoundedSaveFilesStringContext('projectId', projectId),
                    estimatedBytes,
                    percentOfLimit: Math.round((estimatedBytes / FIRESTORE_SAFE_LIMIT) * 100),
                });
            }

            // 7. Save to Firestore (inside transaction — atomic with the read)
            transaction.set(projectRef, updateData, { merge: true });

            logger.info('[saveFilesToProject] Save complete', {
                ...getBoundedSaveFilesStringContext('projectId', projectId),
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
            failureCode: SAVE_FILES_TO_PROJECT_FAILED,
            ...getBoundedSaveFilesStringContext('projectId', projectId),
            ...getSaveFilesErrorContext(error),
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
