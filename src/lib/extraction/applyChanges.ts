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
import { applyStoreBusinessAttributeDefaults, assertStoreUpdateSucceeded } from '@database/stores';
import getActiveSession from '@lib/auth/getActiveSession';
import { revalidatePublicClientCacheForProject } from '@lib/cache/publicClientCache';
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
import { normalizeMenuExtractionJobId } from '@lib/menu-extraction/jobIdBoundary';
import { normalizeMenuExtractionProjectId } from '@lib/menu-extraction/projectIdBoundary';
import { getBusinessAttributesWithMenuDefaults } from '@lib/obp/inferBusinessAttributesFromMenu';
import { logMOLEvent } from '@lib/pricing/molLogger';
import { doc, getDoc, runTransaction, Timestamp, updateDoc } from 'firebase/firestore';
import type { ApplyPlan } from './comparisonEngine.types';
import { cloneFirestoreData } from './cloneFirestoreData';

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
const MENU_REVIEW_APPLY_MOL_EVENT_LOG_FAILED = 'menu_review_apply_mol_event_log_failed';

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

function createApplyStats(): ApplyChangesResult['stats'] {
    return {
        categoriesAdded: 0,
        categoriesUpdated: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        overridesApplied: 0,
        categoryOverridesApplied: 0,
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
    return cloneFirestoreData(files);
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
        targetFile.extractedData.data.categories.push(cloneFirestoreData(sourceCategory));
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

function applyProjectMutationsToCurrentFiles(params: {
    jobData: any;
    languages: any[];
    mutations: NonNullable<ApplyPlan['projectMutations']>;
    projectFiles: any[];
}): { changed: boolean; files: any[]; stats: ApplyChangesResult['stats'] } {
    const { jobData, languages, mutations, projectFiles } = params;
    const files = cloneFiles(projectFiles);
    const stats = createApplyStats();

    ensureReviewSourceFiles(files, jobData, languages);

    for (const categoryMutation of mutations.upsertCategories) {
        if (!categoryMutation.newCategory) continue;
        const fileIndex = findMutationFileIndex(files, jobData, categoryMutation.targetFileUid);
        if (fileIndex === -1) throwMissingReviewSourceFile(categoryMutation.targetFileUid, 'new_category');
        ensureCategoryArray(files[fileIndex], languages);
        upsertById(files[fileIndex].extractedData.data.categories, [categoryMutation.newCategory]);
        stats.categoriesAdded++;
    }

    for (const itemMutation of mutations.upsertItems) {
        if (!itemMutation.newItem) continue;
        const fileIndex = findMutationFileIndex(files, jobData, itemMutation.targetFileUid);
        if (fileIndex === -1) throwMissingReviewSourceFile(itemMutation.targetFileUid, 'new_item');
        ensureCategoryArray(files[fileIndex], languages);
        if (!Array.isArray(files[fileIndex].extractedData.data.items)) {
            files[fileIndex].extractedData.data.items = [];
        }
        ensureItemCategoryInFile(files, fileIndex, itemMutation.newItem.category, languages);
        upsertById(files[fileIndex].extractedData.data.items, [itemMutation.newItem]);
        stats.itemsAdded++;
    }

    for (const categoryMutation of mutations.upsertCategories) {
        if (!categoryMutation.categoryId || !categoryMutation.patch) continue;
        const fileIndex = findMutationFileIndex(files, jobData, categoryMutation.targetFileUid);
        if (fileIndex === -1) throwMissingReviewSourceFile(categoryMutation.targetFileUid, 'category_patch');
        const categories = files[fileIndex]?.extractedData?.data?.categories || [];
        const categoryIndex = categories.findIndex((category: any) => category.id === categoryMutation.categoryId);
        if (categoryIndex === -1) continue;
        categories[categoryIndex] = { ...categories[categoryIndex], ...categoryMutation.patch };
        stats.categoriesUpdated++;
    }

    for (const itemMutation of mutations.upsertItems) {
        if (!itemMutation.itemId || !itemMutation.patch) continue;
        const fileIndex = findMutationFileIndex(files, jobData, itemMutation.targetFileUid);
        if (fileIndex === -1) throwMissingReviewSourceFile(itemMutation.targetFileUid, 'item_patch');
        const items = files[fileIndex]?.extractedData?.data?.items || [];
        const itemIndex = items.findIndex((item: any) => item.id === itemMutation.itemId);
        if (itemIndex === -1) continue;
        items[itemIndex] = { ...items[itemIndex], ...itemMutation.patch };
        stats.itemsUpdated++;
    }

    const aliasApplied = applyStableIdAliases(files, mutations.stableIdAliases);
    return {
        changed: Boolean(
            aliasApplied
            || stats.categoriesAdded
            || stats.categoriesUpdated
            || stats.itemsAdded
            || stats.itemsUpdated
        ),
        files,
        stats,
    };
}

function assertExpectedAppliedChangeCount(params: {
    expectedChangeCount?: number;
    jobId: string;
    mode: ApplyPlan['mode'];
    projectId: string;
    stats: ApplyChangesResult['stats'];
}): number {
    const { expectedChangeCount, jobId, mode, projectId, stats } = params;
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
            mode,
            appliedChangeCount,
            expectedChangeCount: hasExpectedChangeCount ? expectedChangeCount : null,
        });
        throw new Error(APPLY_CHANGES_GENERIC_ERROR);
    }
    return appliedChangeCount;
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

async function saveLinkedOutletProject(params: {
    appliedChangeCount: number;
    expectedLocalVersion: number;
    jobId: string;
    project: Record<string, any>;
}): Promise<void> {
    const { appliedChangeCount, expectedLocalVersion, jobId, project } = params;
    const logContext = getLinkedOutletApplyLogContext(project, jobId);
    const response = await fetch('/api/projects/outlet-save', {
        ...LINKED_OUTLET_SAVE_REQUEST_POLICY,
        body: JSON.stringify({
            extractionReview: {
                expectedChangeCount: appliedChangeCount,
                expectedLocalVersion,
                jobId,
            },
            project,
        }),
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

    if (
        !isLinkedOutletSaveResponse(payload, project.projectId, project.masterProjectId)
        || (payload as { extractionReviewCompleted?: unknown }).extractionReviewCompleted !== true
        || (payload as { appliedChangeCount?: unknown }).appliedChangeCount !== appliedChangeCount
    ) {
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

function buildCompletedReviewJobPayload() {
    const completedAt = Timestamp.now();
    return {
        status: 'completed',
        completedAt,
        updatedAt: completedAt,
        currentStep: 'Changes applied',
    };
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
    if (!jobData.uId || !sessionUserIds.some((userId) => idsMatch(jobData.uId, userId))) {
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
    const {
        projectId: rawProjectId,
        applyPlan,
        jobId: rawJobId,
        expectedChangeCount,
        primaryLang = 'en',
        molContext,
    } = params;
    const projectId = normalizeMenuExtractionProjectId(rawProjectId) || '';
    const jobId = normalizeMenuExtractionJobId(rawJobId) || '';

    const stats = createApplyStats();

    try {
        if (!projectId || !jobId) {
            throw new Error(APPLY_CHANGES_GENERIC_ERROR);
        }

        const session = await getActiveSession();
        if (!session) throw new Error(APPLY_CHANGES_GENERIC_ERROR);
        const projectRef = doc(firebaseClient, `${DB_COLLECTIONS.PROJECTS}/${session.tId}/${session.sId}`, projectId);
        const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, jobId);
        let projectData: Record<string, any> = {};
        let files: any[] = [];
        let standaloneCommitted = false;
        let linkedOutletProjectPayload: Record<string, any> | null = null;

        if (applyPlan.mode === 'SINGLE_STORE' || applyPlan.mode === 'MASTER_PROJECT') {
            const mutations = applyPlan.projectMutations;
            if (!mutations) throw new Error('No project mutations in apply plan');

            const committed = await runTransaction(firebaseClient, async (transaction) => {
                const [projectSnap, jobSnap] = await Promise.all([
                    transaction.get(projectRef),
                    transaction.get(jobRef),
                ]);
                if (!projectSnap.exists()) throw new Error('Project not found');
                const currentProject = projectSnap.data();
                const currentJob = jobSnap.exists() ? jobSnap.data() : null;
                assertOwnedPreviewJob(currentJob, session, projectId);
                const projection = applyProjectMutationsToCurrentFiles({
                    jobData: currentJob,
                    languages: currentProject.languages || [],
                    mutations,
                    projectFiles: currentProject.files || [],
                });
                assertExpectedAppliedChangeCount({
                    expectedChangeCount,
                    jobId,
                    mode: applyPlan.mode,
                    projectId,
                    stats: projection.stats,
                });
                if (!projection.changed) throw new Error(APPLY_CHANGES_GENERIC_ERROR);
                transaction.update(projectRef, sanitizeFirestoreValue({ files: projection.files }));
                transaction.update(jobRef, buildCompletedReviewJobPayload());
                return { files: projection.files, projectData: currentProject, stats: projection.stats };
            });
            files = committed.files;
            projectData = committed.projectData;
            Object.assign(stats, committed.stats);
            standaloneCommitted = true;

        } else if (applyPlan.mode === 'OUTLET_LINKED') {
            const projectSnap = await getDoc(projectRef);
            if (!projectSnap.exists()) throw new Error('Project not found');
            projectData = projectSnap.data();
            files = cloneFiles(projectData.files || []);
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
                const existingCategoryIds = new Set(
                    localFile.extractedData.data.categories
                        .map((category: any) => category?.id)
                        .filter(Boolean),
                );
                upsertById(localFile.extractedData.data.categories, mutations.upsertLocalCategories);
                for (const category of mutations.upsertLocalCategories) {
                    if (existingCategoryIds.has(category.id)) stats.categoriesUpdated++;
                    else stats.categoriesAdded++;
                }
            }

            // Add local-only items in-memory
            if (mutations.upsertLocalItems.length > 0) {
                const existingItemIds = new Set(
                    localFile.extractedData.data.items
                        .map((item: any) => item?.id)
                        .filter(Boolean),
                );
                upsertById(localFile.extractedData.data.items, mutations.upsertLocalItems);
                for (const item of mutations.upsertLocalItems) {
                    if (existingItemIds.has(item.id)) stats.itemsUpdated++;
                    else stats.itemsAdded++;
                }
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
                || stats.categoriesUpdated > 0
                || stats.itemsAdded > 0
                || stats.itemsUpdated > 0
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

        const appliedChangeCount = assertExpectedAppliedChangeCount({
            expectedChangeCount,
            jobId,
            mode: applyPlan.mode,
            projectId,
            stats,
        });

        // ═══════════════════════════════════════════════════════════
        // STEP 2: SINGLE ATOMIC WRITE — all project mutations
        // ═══════════════════════════════════════════════════════════
        if (linkedOutletProjectPayload) {
            await saveLinkedOutletProject({
                appliedChangeCount,
                expectedLocalVersion: Number(projectData.outletLocalState?.localVersion) || 0,
                jobId,
                project: linkedOutletProjectPayload,
            });
            await revalidatePublicClientCacheForProject(projectId, 'applyExtractionChanges');
        } else if (standaloneCommitted) {
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
                    const storeResult = await applyStoreBusinessAttributeDefaults({
                        businessAttributes: nextBusinessAttributes,
                        storeId: session.sId,
                        tenantId: session.tId,
                    });
                    assertStoreUpdateSucceeded(
                        storeResult,
                        session.sId,
                        'menu_review_apply_business_attributes_store_update_rejected',
                    );
                }
            } catch (error) {
                logMenuProcessingFailure('menu_review_apply_business_attributes_failed', error, {
                    ...getMenuProcessingProjectLogContext(projectId),
                    ...getMenuProcessingJobLogContext(jobId),
                });
            }
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 3: MOL audit logging (fire-and-forget, non-blocking)
        // ═══════════════════════════════════════════════════════════
        if (molContext) {
            void logMOLEvent({
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
            }).catch((error) => {
                logMenuProcessingFailure(MENU_REVIEW_APPLY_MOL_EVENT_LOG_FAILED, error, {
                    ...getMenuProcessingProjectLogContext(projectId),
                    ...getMenuProcessingJobLogContext(jobId),
                    ...getBoundedMenuProcessingStringContext('actorUserId', molContext.actorUserId),
                    ...getBoundedMenuProcessingStringContext('tenantId', molContext.tId),
                    ...getBoundedMenuProcessingStringContext('storeId', molContext.sId),
                    appliedChangeCount: getAppliedExtractionChangeCount(stats),
                    mode: applyPlan.mode,
                    version: molContext.version,
                });
            });
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
    const normalizedJobId = normalizeMenuExtractionJobId(jobId);
    if (!normalizedJobId) {
        throw new Error(APPLY_CHANGES_GENERIC_ERROR);
    }

    const session = await getActiveSession();
    const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, normalizedJobId);
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
