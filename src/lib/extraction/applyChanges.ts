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
import { revalidatePublicClientCache, revalidatePublicClientCacheForProject } from '@lib/cache/publicClientCache';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import {
    getBoundedMenuProcessingStringContext,
    getMenuProcessingJobLogContext,
    getMenuProcessingProjectLogContext,
    logMenuProcessingFailure,
} from '@lib/firebase/menuProcessingDiagnostics';
import {
    LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES,
    LINKED_OUTLET_SAVE_REQUEST_POLICY,
    isLinkedOutletSaveResponse,
    readLinkedOutletSaveResponseJson,
} from '@lib/multiOutlet/linkedOutletSaveResponse';
import { getBusinessAttributesWithMenuDefaults } from '@lib/obp/inferBusinessAttributesFromMenu';
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
    /** Number of owner-approved visible changes the caller expects to apply. */
    expectedChangeCount?: number;
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
    projectId: string;
    jobId: string;
    mode: ApplyPlan['mode'];
    completed: boolean;
    appliedChangeCount: number;
    error?: string;
    stats: {
        categoriesAdded: number;
        categoriesUpdated: number;
        itemsAdded: number;
        itemsUpdated: number;
        overridesApplied: number;
        categoryOverridesApplied: number;
    };
}

const APPLY_CHANGES_GENERIC_ERROR = 'Could not apply changes. Please try again.';

type LinkedOutletProjectSaveError = Error & { code?: string; status?: number };

export function getAppliedExtractionChangeCount(stats: ApplyChangesResult['stats']): number {
    return (
        stats.categoriesAdded
        + stats.categoriesUpdated
        + stats.itemsAdded
        + stats.itemsUpdated
        + stats.overridesApplied
        + stats.categoryOverridesApplied
    );
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

function sanitizeFirestoreValue<T>(value: T): T {
    if (value === undefined) return null as T;
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Timestamp || value instanceof Date) return value;

    if (Array.isArray(value)) {
        return value.map(item => sanitizeFirestoreValue(item)) as T;
    }

    return Object.entries(value as Record<string, any>).reduce<Record<string, any>>((result, [key, nestedValue]) => {
        if (nestedValue === undefined) return result;
        result[key] = sanitizeFirestoreValue(nestedValue);
        return result;
    }, {}) as T;
}

function throwMissingReviewSourceFile(targetFileUid: unknown, mutationType: string): never {
    logMenuProcessingFailure('menu_review_apply_source_file_missing', undefined, {
        mutationType,
        ...getBoundedMenuProcessingStringContext('targetFileUid', targetFileUid),
    });

    throw new Error(APPLY_CHANGES_GENERIC_ERROR);
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

function resolveReviewSourceFileUid(jobData: any, targetFileUid?: string): string {
    const files = Array.isArray(jobData?.files) ? jobData.files : [];
    if (files.length === 0) return targetFileUid || '';

    if (targetFileUid?.startsWith('file_')) {
        const index = Number(targetFileUid.replace('file_', ''));
        return files[index]?.uid || targetFileUid;
    }

    if (!targetFileUid && files.length === 1) {
        return files[0].uid || '';
    }

    return targetFileUid || '';
}

function ensureReviewSourceFiles(files: any[], jobData: any, languages: any[] = []) {
    const jobFiles = Array.isArray(jobData?.files) ? jobData.files : [];
    const source = typeof jobData?.source === 'string' && jobData.source.trim()
        ? jobData.source.trim()
        : null;
    const sourceMetadata = jobData?.sourceMetadata && typeof jobData.sourceMetadata === 'object'
        ? jobData.sourceMetadata
        : null;
    let nextIndex = files.length;

    for (const sourceFile of jobFiles) {
        if (!sourceFile?.uid || files.some(file => file?.uid === sourceFile.uid)) continue;
        files.push({
            uid: sourceFile.uid,
            name: sourceFile.name || 'Imported menu link',
            size: sourceFile.size || 0,
            type: sourceFile.type || 'text/plain',
            url: sourceFile.url || '',
            active: true,
            deleted: false,
            index: nextIndex++,
            processingTime: jobData?.result?.processingTime || 0,
            ...(source ? { source } : {}),
            ...(sourceMetadata ? { sourceMetadata } : {}),
            extractedData: {
                message: '',
                data: {
                    categories: [],
                    items: [],
                    languages,
                },
            },
        });
    }
}

function findMutationFileIndex(files: any[], jobData: any, targetFileUid?: string): number {
    const resolvedUid = resolveReviewSourceFileUid(jobData, targetFileUid);
    return findFileIndexByUid(files, resolvedUid);
}

function ensureCategoryArray(file: any, languages: any[] = []) {
    if (!file.extractedData) {
        file.extractedData = { data: { categories: [], items: [], languages } };
    }
    if (!file.extractedData.data) {
        file.extractedData.data = { categories: [], items: [], languages };
    }
    if (!Array.isArray(file.extractedData.data.categories)) {
        file.extractedData.data.categories = [];
    }
    if (!Array.isArray(file.extractedData.data.languages)) {
        file.extractedData.data.languages = languages;
    }
}

function ensureItemCategoryInFile(files: any[], fileIndex: number, categoryId?: string, languages: any[] = []) {
    if (!categoryId || fileIndex < 0 || !files[fileIndex]) return;

    const targetFile = files[fileIndex];
    ensureCategoryArray(targetFile, languages);

    if (targetFile.extractedData.data.categories.some((category: any) => category?.id === categoryId)) {
        return;
    }

    const sourceCategory = files
        .flatMap((file) => file?.extractedData?.data?.categories || [])
        .find((category: any) => category?.id === categoryId);

    if (sourceCategory) {
        targetFile.extractedData.data.categories.push(structuredClone(sourceCategory));
    }
}

function getMenuDataFromFiles(files: any[]) {
    return files.reduce<{ businessAttributeSuggestions: any[]; categories: any[]; items: any[] }>((menuData, file) => {
        const data = file?.extractedData?.data || {};
        if (Array.isArray(data.businessAttributeSuggestions)) menuData.businessAttributeSuggestions.push(...data.businessAttributeSuggestions);
        if (Array.isArray(data.categories)) menuData.categories.push(...data.categories);
        if (Array.isArray(data.items)) menuData.items.push(...data.items);
        return menuData;
    }, { businessAttributeSuggestions: [], categories: [], items: [] });
}

function ensureOutletLocalFile(files: any[], projectId: string, languages: any[] = []) {
    if (files.length === 0) {
        files.push({
            uid: `local-${projectId}`,
            extractedData: {
                data: {
                    categories: [],
                    items: [],
                    languages,
                },
            },
        });
    }

    if (!files[0].extractedData) {
        files[0].extractedData = { data: { categories: [], items: [], languages } };
    }
    if (!files[0].extractedData.data) {
        files[0].extractedData.data = { categories: [], items: [], languages };
    }
    if (!Array.isArray(files[0].extractedData.data.categories)) {
        files[0].extractedData.data.categories = [];
    }
    if (!Array.isArray(files[0].extractedData.data.items)) {
        files[0].extractedData.data.items = [];
    }
    if (!Array.isArray(files[0].extractedData.data.languages)) {
        files[0].extractedData.data.languages = languages;
    }

    return files[0];
}

function upsertById(target: any[], entries: any[]) {
    for (const entry of entries) {
        if (!entry?.id) continue;
        const existingIndex = target.findIndex(candidate => candidate?.id === entry.id);
        if (existingIndex >= 0) {
            target[existingIndex] = {
                ...target[existingIndex],
                ...entry,
            };
        } else {
            target.push(entry);
        }
    }
}

function appendExtractionIdAlias(entry: any, extractedId: string) {
    if (!entry?.id || !extractedId || entry.id === extractedId) return;
    const aliases = Array.isArray(entry.extractionIdAliases)
        ? entry.extractionIdAliases.filter((alias: unknown): alias is string => typeof alias === 'string' && alias.length > 0)
        : [];
    if (!aliases.includes(extractedId)) {
        entry.extractionIdAliases = Array.from(new Set([...aliases, extractedId])).slice(-25);
    }
}

function applyStableIdAliases(files: any[], aliases?: {
    categoryAliases?: Array<{ categoryId: string; extractedCategoryId: string; targetFileUid?: string }>;
    itemAliases?: Array<{ itemId: string; extractedItemId: string; targetFileUid?: string }>;
}) {
    let applied = false;

    for (const alias of aliases?.categoryAliases || []) {
        if (!alias.categoryId || !alias.extractedCategoryId) continue;
        const candidateFiles = alias.targetFileUid
            ? files.filter((file) => file?.uid === alias.targetFileUid)
            : files;
        for (const file of candidateFiles) {
            const category = file?.extractedData?.data?.categories?.find((entry: any) => entry?.id === alias.categoryId);
            if (!category) continue;
            appendExtractionIdAlias(category, alias.extractedCategoryId);
            applied = true;
            break;
        }
    }

    for (const alias of aliases?.itemAliases || []) {
        if (!alias.itemId || !alias.extractedItemId) continue;
        const candidateFiles = alias.targetFileUid
            ? files.filter((file) => file?.uid === alias.targetFileUid)
            : files;
        for (const file of candidateFiles) {
            const item = file?.extractedData?.data?.items?.find((entry: any) => entry?.id === alias.itemId);
            if (!item) continue;
            appendExtractionIdAlias(item, alias.extractedItemId);
            applied = true;
            break;
        }
    }

    return applied;
}

function pickRecordFields(record: unknown, allowedFields: Set<string>): Record<string, any> {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return {};

    return Object.entries(record as Record<string, any>).reduce<Record<string, any>>((result, [key, value]) => {
        if (allowedFields.has(key) && value !== undefined) {
            result[key] = value;
        }
        return result;
    }, {});
}

function normalizeOutletOverrides(overrides: any = {}) {
    const itemFields = new Set([
        'active',
        'available',
        'description',
        'duration',
        'images',
        'isBestSeller',
        'orderIndex',
        'ownerBoost',
        'price',
    ]);
    const categoryFields = new Set(['active', 'orderIndex', 'timeSlots']);
    const attributeFields = new Set(['active', 'orderIndex', 'price']);

    const normalizeBucket = (bucket: unknown, fields: Set<string>) => {
        const source = bucket && typeof bucket === 'object' && !Array.isArray(bucket)
            ? bucket as Record<string, any>
            : {};

        return Object.entries(source).reduce<Record<string, any>>((result, [id, value]) => {
            const sanitizedValue = pickRecordFields(value, fields);
            if (Object.keys(sanitizedValue).length > 0) {
                result[id] = sanitizedValue;
            }
            return result;
        }, {});
    };

    return {
        attributes: normalizeBucket(overrides.attributes, attributeFields),
        categories: normalizeBucket(overrides.categories, categoryFields),
        items: normalizeBucket(overrides.items, itemFields),
    };
}

function buildLinkedOutletProjectSavePayload(params: {
    files: any[];
    overrides: any;
    projectData: Record<string, any>;
    projectId: string;
}) {
    const { files, overrides, projectData, projectId } = params;

    return sanitizeFirestoreValue({
        active: projectData.active,
        config: projectData.config,
        defaultLanguage: projectData.defaultLanguage,
        files,
        languages: projectData.languages,
        masterProjectId: projectData.masterProjectId,
        menuSettings: projectData.menuSettings,
        outletStatus: projectData.outletStatus,
        overrides,
        projectId,
    });
}

const createLinkedOutletProjectSaveError = (
    code: string,
    status?: number,
): LinkedOutletProjectSaveError => {
    const error = new Error('Linked outlet save failed') as LinkedOutletProjectSaveError;
    error.code = code.slice(0, 64);
    error.status = status;
    return error;
};

const getLinkedOutletApplyLogContext = (
    project: Record<string, any>,
    jobId: string,
) => ({
    ...getMenuProcessingProjectLogContext(project.projectId),
    ...getMenuProcessingJobLogContext(jobId),
    ...getBoundedMenuProcessingStringContext('masterProjectId', project.masterProjectId),
});

async function saveLinkedOutletProject(project: Record<string, any>, jobId: string): Promise<void> {
    const logContext = getLinkedOutletApplyLogContext(project, jobId);
    const response = await fetch('/api/projects/outlet-save', {
        ...LINKED_OUTLET_SAVE_REQUEST_POLICY,
        body: JSON.stringify({ project }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });

    if (!response.ok) {
        const error = createLinkedOutletProjectSaveError(
            'linked_outlet_project_save_rejected',
            response.status,
        );
        logMenuProcessingFailure(
            'menu_review_linked_outlet_save_rejected',
            error,
            logContext,
        );
        throw error;
    }

    let payload: unknown = null;
    try {
        payload = await readLinkedOutletSaveResponseJson(response);
    } catch (error) {
        logMenuProcessingFailure(
            'menu_review_linked_outlet_save_response_parse_failed',
            error,
            {
                ...logContext,
                maxBytes: LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES,
                responseOk: response.ok,
                responseStatus: response.status,
            },
        );
        throw createLinkedOutletProjectSaveError(
            'linked_outlet_project_save_response_parse_failed',
            response.status,
        );
    }

    if (!isLinkedOutletSaveResponse(payload, project.projectId, project.masterProjectId)) {
        const error = createLinkedOutletProjectSaveError(
            'linked_outlet_project_save_response_invalid',
            response.status,
        );
        logMenuProcessingFailure(
            'menu_review_linked_outlet_save_response_invalid',
            error,
            {
                ...logContext,
                responseOk: response.ok,
                responseStatus: response.status,
            },
        );
        throw error;
    }
}

function idsMatch(left: unknown, right: unknown): boolean {
    return String(left ?? '').trim() === String(right ?? '').trim();
}

export function isAcknowledgedApplyChangesResult(
    result: ApplyChangesResult,
    expected: {
        appliedChangeCount: number;
        jobId: string;
        mode: ApplyPlan['mode'];
        projectId: string;
    },
): result is ApplyChangesResult & { success: true; completed: true } {
    return Boolean(
        result.success === true
        && result.completed === true
        && idsMatch(result.projectId, expected.projectId)
        && idsMatch(result.jobId, expected.jobId)
        && result.mode === expected.mode
        && Number.isInteger(result.appliedChangeCount)
        && result.appliedChangeCount === expected.appliedChangeCount
        && getAppliedExtractionChangeCount(result.stats) === result.appliedChangeCount,
    );
}

function assertOwnedPreviewJob(jobData: any, session: Awaited<ReturnType<typeof getActiveSession>>, projectId?: string): void {
    if (!session) {
        throw new Error('User not authenticated');
    }

    if (!jobData) {
        throw new Error('Extraction review job not found');
    }

    if (jobData.status !== 'preview_ready') {
        throw new Error('This extraction review is no longer available');
    }

    if (projectId && !idsMatch(jobData.projectId, projectId)) {
        throw new Error('Extraction review does not belong to this menu');
    }

    if (!idsMatch(jobData.tId, session.tId) || !idsMatch(jobData.sId, session.sId)) {
        throw new Error('Extraction review does not belong to this business');
    }

    const sessionUserIds = [session.uId, session.user?.id].filter(Boolean);
    if (jobData.uId && !sessionUserIds.some((userId) => idsMatch(jobData.uId, userId))) {
        throw new Error('Extraction review does not belong to this user');
    }
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
    const { projectId, applyPlan, jobId, expectedChangeCount, primaryLang = 'en', molContext } = params;

    const stats = {
        categoriesAdded: 0,
        categoriesUpdated: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        overridesApplied: 0,
        categoryOverridesApplied: 0,
    };

    try {
        const session = await getActiveSession();
        const projectRef = doc(firebaseClient, `${DB_COLLECTIONS.PROJECTS}/${session.tId}/${session.sId}`, projectId);
        const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, jobId);

        // ═══════════════════════════════════════════════════════════
        // STEP 1: Read current project state ONCE
        // ═══════════════════════════════════════════════════════════
        const [projectSnap, jobSnap] = await Promise.all([
            getDoc(projectRef),
            getDoc(jobRef),
        ]);
        if (!projectSnap.exists()) {
            throw new Error('Project not found');
        }
        const projectData = projectSnap.data();
        const files = cloneFiles(projectData.files || []);
        const jobData = jobSnap.exists() ? jobSnap.data() : null;
        assertOwnedPreviewJob(jobData, session, projectId);

        // Single update payload — all mutations collected here, written once
        const updatePayload: Record<string, any> = {};
        let linkedOutletProjectPayload: Record<string, any> | null = null;

        if (applyPlan.mode === 'SINGLE_STORE' || applyPlan.mode === 'MASTER_PROJECT') {
            // ═══════════════════════════════════════════════════════════
            // SINGLE_STORE / MASTER_PROJECT: Direct project mutations
            // All mutations applied in-memory to `files` clone
            // ═══════════════════════════════════════════════════════════

            const mutations = applyPlan.projectMutations;
            if (!mutations) {
                throw new Error('No project mutations in apply plan');
            }

            ensureReviewSourceFiles(files, jobData, projectData.languages || []);

            // Process new categories — add to files in-memory
            for (const cat of mutations.upsertCategories) {
                if (cat.newCategory) {
                    const fileIndex = findMutationFileIndex(files, jobData, cat.targetFileUid);
                    if (fileIndex === -1) {
                        throwMissingReviewSourceFile(cat.targetFileUid, 'new_category');
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
                    const fileIndex = findMutationFileIndex(files, jobData, item.targetFileUid);
                    if (fileIndex === -1) {
                        throwMissingReviewSourceFile(item.targetFileUid, 'new_item');
                    }
                    if (!files[fileIndex].extractedData?.data?.items) {
                        files[fileIndex].extractedData = files[fileIndex].extractedData || {};
                        files[fileIndex].extractedData.data = files[fileIndex].extractedData.data || {};
                        files[fileIndex].extractedData.data.items = [];
                    }
                    ensureItemCategoryInFile(
                        files,
                        fileIndex,
                        item.newItem.category,
                        projectData.languages || [],
                    );
                    files[fileIndex].extractedData.data.items.push(item.newItem);
                    stats.itemsAdded++;
                }
            }

            // Process category patches — merge in-memory
            for (const catPatch of mutations.upsertCategories) {
                if (catPatch.categoryId && catPatch.patch) {
                    const fileIndex = findMutationFileIndex(files, jobData, catPatch.targetFileUid);
                    if (fileIndex === -1) {
                        throwMissingReviewSourceFile(catPatch.targetFileUid, 'category_patch');
                    }

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
                    const fileIndex = findMutationFileIndex(files, jobData, itemPatch.targetFileUid);
                    if (fileIndex === -1) {
                        throwMissingReviewSourceFile(itemPatch.targetFileUid, 'item_patch');
                    }

                    const items = files[fileIndex]?.extractedData?.data?.items || [];
                    const itemIndex = items.findIndex((i: any) => i.id === itemPatch.itemId);
                    if (itemIndex === -1) continue;

                    items[itemIndex] = { ...items[itemIndex], ...itemPatch.patch };
                    stats.itemsUpdated++;
                }
            }

            const aliasApplied = applyStableIdAliases(files, mutations.stableIdAliases);

            // Collect modified files into payload
            if (aliasApplied || stats.categoriesAdded || stats.categoriesUpdated || stats.itemsAdded || stats.itemsUpdated) {
                updatePayload.files = files;
            }

        } else if (applyPlan.mode === 'OUTLET_LINKED') {
            // ═══════════════════════════════════════════════════════════
            // OUTLET_LINKED: Local items + price overrides
            // Local files and overrides must pass through /api/projects/outlet-save
            // so linked-outlet policy and local-only ID validation stay server-side.
            // ═══════════════════════════════════════════════════════════

            const mutations = applyPlan.outletMutations;
            if (!mutations) {
                throw new Error('No outlet mutations in apply plan');
            }
            if (!projectData.masterProjectId) {
                throw new Error('Outlet extraction review requires a linked master menu');
            }

            // Add local-only categories and items to files[0].extractedData.data.
            // Linked outlet projects created by propagation can start with files: [].
            // Create one stable local file on first local mutation instead of failing.
            const localFile = ensureOutletLocalFile(
                files,
                projectId,
                projectData.languages || [],
            );

            // Add local-only categories in-memory
            if (mutations.upsertLocalCategories.length > 0) {
                upsertById(localFile.extractedData.data.categories, mutations.upsertLocalCategories);
                stats.categoriesAdded = mutations.upsertLocalCategories.length;
            }

            // Add local-only items in-memory
            if (mutations.upsertLocalItems.length > 0) {
                upsertById(localFile.extractedData.data.items, mutations.upsertLocalItems);
                stats.itemsAdded = mutations.upsertLocalItems.length;
            }

            const aliasApplied = applyStableIdAliases(files, mutations.stableIdAliases);
            const nextOverrides = normalizeOutletOverrides(projectData.overrides);

            for (const override of mutations.applyOverrides) {
                if (!override.masterItemId) {
                    continue;
                }
                nextOverrides.items[override.masterItemId] = {
                    ...(nextOverrides.items[override.masterItemId] || {}),
                    ...sanitizeFirestoreValue(override.patch || {}),
                };
                stats.overridesApplied++;
            }

            // Collect category overrides if any
            if (mutations.applyCategoryOverrides) {
                for (const override of mutations.applyCategoryOverrides) {
                    nextOverrides.categories[override.masterCategoryId] = {
                        ...(nextOverrides.categories[override.masterCategoryId] || {}),
                        ...sanitizeFirestoreValue(override.patch || {}),
                    };
                    stats.categoryOverridesApplied++;
                }
            }

            if (
                aliasApplied
                || stats.categoriesAdded > 0
                || stats.itemsAdded > 0
                || stats.overridesApplied > 0
                || (mutations.applyCategoryOverrides?.length || 0) > 0
                || (mutations.stableIdAliases?.categoryAliases?.length || 0) > 0
                || (mutations.stableIdAliases?.itemAliases?.length || 0) > 0
            ) {
                linkedOutletProjectPayload = buildLinkedOutletProjectSavePayload({
                    files,
                    overrides: nextOverrides,
                    projectData,
                    projectId,
                });
            }
        }

        const appliedChangeCount = getAppliedExtractionChangeCount(stats);
        const hasExpectedChangeCount = Number.isInteger(expectedChangeCount);
        if (
            appliedChangeCount <= 0
            || (hasExpectedChangeCount && appliedChangeCount !== expectedChangeCount)
        ) {
            const error = new Error('menu_review_apply_acknowledgement_mismatch');
            logMenuProcessingFailure('menu_review_apply_acknowledgement_mismatch', error, {
                ...getMenuProcessingProjectLogContext(projectId),
                ...getMenuProcessingJobLogContext(jobId),
                mode: applyPlan.mode,
                appliedChangeCount,
                expectedChangeCount: hasExpectedChangeCount ? expectedChangeCount : null,
            });
            throw new Error(APPLY_CHANGES_GENERIC_ERROR);
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 2: SINGLE ATOMIC WRITE — all project mutations
        // ═══════════════════════════════════════════════════════════
        if (linkedOutletProjectPayload) {
            await saveLinkedOutletProject(linkedOutletProjectPayload, jobId);
            await revalidatePublicClientCacheForProject(projectId, 'applyExtractionChanges');
        } else if (Object.keys(updatePayload).length > 0) {
            await updateDoc(projectRef, sanitizeFirestoreValue(updatePayload));
            await revalidatePublicClientCacheForProject(projectId, 'applyExtractionChanges');

            try {
                const storeRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(session.sId));
                const storeSnap = await getDoc(storeRef);
                const storeData = storeSnap.exists() ? storeSnap.data() : null;
                const nextBusinessAttributes = getBusinessAttributesWithMenuDefaults(
                    getMenuDataFromFiles(files),
                    storeData,
                );

                if (nextBusinessAttributes) {
                    await updateDoc(storeRef, { businessAttributes: nextBusinessAttributes });
                    await revalidatePublicClientCache(session.sId, 'applyExtractionBusinessAttributes');
                }
            } catch (error) {
                logMenuProcessingFailure('menu_review_apply_business_attributes_failed', error, {
                    ...getMenuProcessingProjectLogContext(projectId),
                    ...getMenuProcessingJobLogContext(jobId),
                });
            }
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

        return {
            appliedChangeCount,
            completed: true,
            jobId,
            mode: applyPlan.mode,
            projectId,
            success: true,
            stats,
        };

    } catch (error: any) {
        logMenuProcessingFailure('menu_review_apply_failed', error, {
            ...getMenuProcessingProjectLogContext(projectId),
            ...getMenuProcessingJobLogContext(jobId),
            mode: applyPlan.mode,
        });

        return {
            appliedChangeCount: getAppliedExtractionChangeCount(stats),
            completed: false,
            success: false,
            jobId,
            mode: applyPlan.mode,
            projectId,
            error: APPLY_CHANGES_GENERIC_ERROR,
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
    const session = await getActiveSession();
    const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, jobId);
    const jobSnap = await getDoc(jobRef);
    const jobData = jobSnap.exists() ? jobSnap.data() : null;
    assertOwnedPreviewJob(jobData, session);

    await updateDoc(jobRef, {
        status: 'cancelled',
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        currentStep: 'Changes discarded by user',
    });
}

export default applyExtractionChanges;
