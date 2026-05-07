/**
 * Apply Extraction Changes
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 8
 * 
 * Writes approved changes from comparison engine to Firestore.
 * Handles both SINGLE_STORE/MASTER_PROJECT and OUTLET_LINKED modes.
 * 
 * WRITE DISCIPLINE: All mutations are applied in-memory first, then
 * written to Firestore in a SINGLE atomic updateDoc call. This prevents
 * partially-applied menu states if a write fails mid-way.
 */

import { DB_COLLECTIONS } from '@constant/database';
import getActiveSession from '@lib/auth/getActiveSession';
import { revalidatePublicClientCacheForProject } from '@lib/cache/publicClientCache';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { logMOLEvent } from '@lib/pricing/molLogger';
import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import type { ApplyPlan } from './comparisonEngine.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ApplyChangesParams {
    projectId: string;
    applyPlan: ApplyPlan;
    jobId: string;
    /** Primary language code for data operations */
    primaryLang?: string;
    /** Optional: MOL audit logging context. If provided, logs EXTRACTION_APPLIED event. */
    molContext?: {
        actorUserId: string;
        tId: number;
        sId: number;
        version: number;
    };
}

export interface ApplyChangesResult {
    success: boolean;
    error?: string;
    stats: {
        categoriesAdded: number;
        categoriesUpdated: number;
        itemsAdded: number;
        itemsUpdated: number;
        overridesApplied: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deep clone files array for safe in-memory mutation.
 * Uses structuredClone for a true deep copy.
 */
function cloneFiles(files: any[]): any[] {
    return structuredClone(files);
}

/**
 * Find file index by UID in project files array
 */
function findFileIndexByUid(
    files: Array<{ uid?: string }>,
    targetUid: string
): number {
    return files.findIndex(f => f.uid === targetUid);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply extraction changes to project — SINGLE ATOMIC WRITE
 * 
 * This is called when user clicks "Save" on the review screen.
 * 
 * Architecture:
 * 1. Read current project state ONCE
 * 2. Apply ALL mutations in-memory (additions, patches, overrides)
 * 3. Write back with a SINGLE updateDoc call (atomic)
 * 4. Mark job as completed
 * 5. Fire MOL audit event (non-blocking)
 * 
 * @param params - Apply parameters
 * @returns Result with success status and stats
 */
export async function applyExtractionChanges(
    params: ApplyChangesParams
): Promise<ApplyChangesResult> {
    const { projectId, applyPlan, jobId, primaryLang = 'en', molContext } = params;

    const stats = {
        categoriesAdded: 0,
        categoriesUpdated: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        overridesApplied: 0,
    };

    try {
        const session = await getActiveSession();
        const projectRef = doc(firebaseClient, `${DB_COLLECTIONS.PROJECTS}/${session.tId}/${session.sId}`, projectId);
        const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, jobId);

        console.log('[applyExtractionChanges] Starting apply', {
            projectId,
            jobId,
            mode: applyPlan.mode,
        });

        // ═══════════════════════════════════════════════════════════
        // STEP 1: Read current project state ONCE
        // ═══════════════════════════════════════════════════════════
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists()) {
            throw new Error('Project not found');
        }
        const projectData = projectSnap.data();
        const files = cloneFiles(projectData.files || []);

        // Single update payload — all mutations collected here, written once
        const updatePayload: Record<string, any> = {};

        if (applyPlan.mode === 'SINGLE_STORE' || applyPlan.mode === 'MASTER_PROJECT') {
            // ═══════════════════════════════════════════════════════════
            // SINGLE_STORE / MASTER_PROJECT: Direct project mutations
            // All mutations applied in-memory to `files` clone
            // ═══════════════════════════════════════════════════════════

            const mutations = applyPlan.projectMutations;
            if (!mutations) {
                throw new Error('No project mutations in apply plan');
            }

            // Process new categories — add to files in-memory
            for (const cat of mutations.upsertCategories) {
                if (cat.newCategory) {
                    const fileIndex = findFileIndexByUid(files, cat.targetFileUid);
                    if (fileIndex === -1) {
                        console.warn(`[applyExtractionChanges] File not found for UID: ${cat.targetFileUid}`);
                        continue;
                    }
                    if (!files[fileIndex].extractedData) {
                        files[fileIndex].extractedData = { data: { categories: [], items: [] } };
                    }
                    if (!files[fileIndex].extractedData.data) {
                        files[fileIndex].extractedData.data = { categories: [], items: [] };
                    }
                    if (!files[fileIndex].extractedData.data.categories) {
                        files[fileIndex].extractedData.data.categories = [];
                    }
                    files[fileIndex].extractedData.data.categories.push(cat.newCategory);
                    stats.categoriesAdded++;
                }
            }

            // Process new items — add to files in-memory
            for (const item of mutations.upsertItems) {
                if (item.newItem) {
                    const fileIndex = findFileIndexByUid(files, item.targetFileUid);
                    if (fileIndex === -1) {
                        console.warn(`[applyExtractionChanges] File not found for UID: ${item.targetFileUid}`);
                        continue;
                    }
                    if (!files[fileIndex].extractedData?.data?.items) {
                        files[fileIndex].extractedData = files[fileIndex].extractedData || {};
                        files[fileIndex].extractedData.data = files[fileIndex].extractedData.data || {};
                        files[fileIndex].extractedData.data.items = [];
                    }
                    files[fileIndex].extractedData.data.items.push(item.newItem);
                    stats.itemsAdded++;
                }
            }

            // Process category patches — merge in-memory
            for (const catPatch of mutations.upsertCategories) {
                if (catPatch.categoryId && catPatch.patch) {
                    const fileIndex = findFileIndexByUid(files, catPatch.targetFileUid);
                    if (fileIndex === -1) continue;

                    const categories = files[fileIndex]?.extractedData?.data?.categories || [];
                    const catIndex = categories.findIndex((c: any) => c.id === catPatch.categoryId);
                    if (catIndex === -1) continue;

                    categories[catIndex] = { ...categories[catIndex], ...catPatch.patch };
                    stats.categoriesUpdated++;
                }
            }

            // Process item patches — merge in-memory
            for (const itemPatch of mutations.upsertItems) {
                if (itemPatch.itemId && itemPatch.patch) {
                    const fileIndex = findFileIndexByUid(files, itemPatch.targetFileUid);
                    if (fileIndex === -1) continue;

                    const items = files[fileIndex]?.extractedData?.data?.items || [];
                    const itemIndex = items.findIndex((i: any) => i.id === itemPatch.itemId);
                    if (itemIndex === -1) continue;

                    items[itemIndex] = { ...items[itemIndex], ...itemPatch.patch };
                    stats.itemsUpdated++;
                }
            }

            // Collect modified files into payload
            updatePayload.files = files;

        } else if (applyPlan.mode === 'OUTLET_LINKED') {
            // ═══════════════════════════════════════════════════════════
            // OUTLET_LINKED: Local items + price overrides
            // All mutations applied in-memory, written once
            // ═══════════════════════════════════════════════════════════

            const mutations = applyPlan.outletMutations;
            if (!mutations) {
                throw new Error('No outlet mutations in apply plan');
            }

            // Add local-only categories and items to files[0].extractedData.data
            // The resolver reads from files[], not from a separate localData field
            if (files.length === 0) {
                throw new Error('Project has no files - cannot add local items');
            }

            if (!files[0].extractedData) {
                files[0].extractedData = { data: { categories: [], items: [] } };
            }
            if (!files[0].extractedData.data) {
                files[0].extractedData.data = { categories: [], items: [] };
            }

            // Add local-only categories in-memory
            if (mutations.upsertLocalCategories.length > 0) {
                if (!files[0].extractedData.data.categories) {
                    files[0].extractedData.data.categories = [];
                }
                files[0].extractedData.data.categories.push(...mutations.upsertLocalCategories);
                stats.categoriesAdded = mutations.upsertLocalCategories.length;
            }

            // Add local-only items in-memory
            if (mutations.upsertLocalItems.length > 0) {
                if (!files[0].extractedData.data.items) {
                    files[0].extractedData.data.items = [];
                }
                files[0].extractedData.data.items.push(...mutations.upsertLocalItems);
                stats.itemsAdded = mutations.upsertLocalItems.length;
            }

            // Collect modified files into payload
            updatePayload.files = files;

            // Collect overrides into payload (dot-notation for merge, not replace)
            const now = Timestamp.now();

            for (const override of mutations.applyOverrides) {
                if (!override.masterItemId) {
                    console.warn('[applyExtractionChanges] Skipping override with empty masterItemId');
                    continue;
                }
                updatePayload[`overrides.items.${override.masterItemId}`] = {
                    ...override.patch,
                    updatedAt: now,
                };
                stats.overridesApplied++;
            }

            // Collect category overrides if any
            if (mutations.applyCategoryOverrides) {
                for (const override of mutations.applyCategoryOverrides) {
                    updatePayload[`overrides.categories.${override.masterCategoryId}`] = {
                        ...override.patch,
                        updatedAt: now,
                    };
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 2: SINGLE ATOMIC WRITE — all project mutations
        // ═══════════════════════════════════════════════════════════
        if (Object.keys(updatePayload).length > 0) {
            await updateDoc(projectRef, updatePayload);
            await revalidatePublicClientCacheForProject(projectId, 'applyExtractionChanges');
        }

        // Mark job as completed (separate doc, not project)
        await updateDoc(jobRef, {
            status: 'completed',
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            currentStep: 'Changes applied',
        });

        // ═══════════════════════════════════════════════════════════
        // STEP 3: MOL audit logging (fire-and-forget, non-blocking)
        // ═══════════════════════════════════════════════════════════
        if (molContext) {
            logMOLEvent({
                type: 'EXTRACTION_APPLIED',
                projectId,
                actorUserId: molContext.actorUserId,
                entityType: 'EXTRACTION',
                entityId: jobId,
                before: null,
                after: { mode: applyPlan.mode, ...stats },
                version: molContext.version,
                tId: molContext.tId,
                sId: molContext.sId,
            }).catch(() => { /* MOL should never block */ });
        }

        console.log('[applyExtractionChanges] Apply complete (single atomic write)', stats);

        return {
            success: true,
            stats,
        };

    } catch (error: any) {
        console.error('[applyExtractionChanges] Error applying changes', error);

        return {
            success: false,
            error: error.message || 'Unknown error',
            stats,
        };
    }
}

/**
 * Discard extraction changes and mark job as cancelled
 * 
 * @param jobId - The job ID to discard
 */
export async function discardExtractionChanges(jobId: string): Promise<void> {
    const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, jobId);

    await updateDoc(jobRef, {
        status: 'cancelled',
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        currentStep: 'Changes discarded by user',
    });

    console.log('[discardExtractionChanges] Job discarded', { jobId });
}

export default applyExtractionChanges;
