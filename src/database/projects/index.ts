import { FEATURE_FLAGS } from "@config/features";
import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import {
    addMenuDriftSummaryContribution,
    readMenuDriftContributions,
    type MenuDriftSummaryContribution,
} from "@data/shared/menuDriftContribution";
import { DB_COLLECTIONS } from "@constant/database";
import { isReservedProjectSlug } from "@constant/reservedSlugs";
import {
    createActiveChangeEntry,
    createAvailabilityChangeEntry,
    createExtractionCorrectionEntry,
    createItemAddedEntry,
    createItemRemovedEntry,
    createMenuRevisionSummaryEntry,
    createPriceChangeEntry,
    logMenuChangeForScope,
    logMenuChangesForScope,
} from "@database/menuChangeLog";
import {
    normalizeMenuChangeLogIdentifier,
    normalizeMenuChangeLogScope,
} from "@database/menuChangeLog/menuChangeLogBoundary";
import {
    getBoundedProjectPersistenceStringContext,
    getProjectPersistenceProjectLogContext,
    logProjectPersistenceFailure,
    logProjectPersistenceInfo,
    type ProjectPersistenceLogContext,
} from "@database/projects/diagnostics";
import {
    normalizeSpecialMenuMetadata,
    transitionSpecialMenuLifecycle,
} from "@database/projects/specialMenuLifecycle";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { uploadPreparedMediaImage } from "@database/storage/uploadPreparedMediaImage";
import {
    collection,
    deleteField,
    doc,
    documentId,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    startAfter,
    Timestamp,
    where,
    type CollectionReference,
    type DocumentData,
} from "@firebase/firestore";
import {
    composeRequestBody,
    requestBodyComposer,
    type RequestBodyPersistenceMetadata,
} from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { apiCallComposerClientWithoutLoader } from "@lib/apiHelper/apiCallComposerClientWithoutLoader";
import { mapWithConcurrency } from "@lib/async/boundedConcurrency";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import { logMCEValidationFailure, logMCEValidationResult } from "@lib/mce/diagnostics";
import {
    getLocalizedText,
    getPrimaryLocalizedLanguage,
    isLocalizedText,
    toLocalizedText,
    updateLocalizedText,
} from "@lib/localization/text";
import {
    CANONICAL_SOURCE_LANGUAGE,
    getCanonicalProjectSourceLanguage,
    normalizeProjectLanguagePolicy,
    normalizeProjectLanguages,
} from "@lib/localization/languagePolicy";
import { logger } from "@lib/monitoring/logger";
import {
    appendImageBatchSelectionsToProject,
    normalizeImageBatchProjectSelections,
    type ImageBatchProjectSelection,
} from "@lib/ai/imageBatchProjectSelection";
import { normalizeImageBatchProjectId } from "@lib/ai/imageBatchIdBoundary";
import {
    buildSummaryProjectDeletePayload,
    buildSummaryProjectFieldPayload,
    buildSummaryProjectPayload,
} from "@lib/firestore/summaryProjectsWriter";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { revalidatePublicClientCacheForProject } from "@lib/cache/publicClientCache";
import { getMenuDesignPresetPatch, getRecommendedMenuDesignPresets } from "@lib/menu/menuDesignPresets";
import {
    buildProjectAfterPartialUpdate,
    sanitizeProjectPartialUpdate,
} from "@lib/menu/projectUpdateProjection";
import {
    isProjectSlugClaimed,
    resolveAvailableProjectSlug,
} from "@lib/menu/projectSlugOwnership";
import { createSpecialMenuOverlayFiles } from "@lib/menu/specialMenuOverlay";
import {
    normalizeProjectDocumentScope,
    projectDocumentMatchesScope,
} from "@lib/menu/projectDocumentScope";
import {
    normalizeTimeSlotPreset,
    normalizeTimeSlotPresetId,
    projectReferencesTimeSlotPreset,
    projectTimeSlotPresetReferences,
    type ProjectPresetReferenceMutation,
} from "@lib/menu/timeSlotPresetBoundary";
import {
    LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES,
    LINKED_OUTLET_SAVE_REQUEST_POLICY,
    isLinkedOutletSaveResponse,
    readLinkedOutletSaveResponseJson,
} from "@lib/multiOutlet/linkedOutletSaveResponse";
import {
    normalizeMultiOutletProjectId,
} from "@lib/multiOutlet/projectIdBoundary";
import type { MediaImageType, MediaImageVariantId } from "@lib/media/imageProfiles";
import { isDataUrl } from "@lib/media/mediaStorage";
import { prepareMediaImage } from "@lib/media/prepareMediaImage";
import { generateStoragePath } from "@lib/storage/pathGenerator";
import { slugify } from "@lib/utils/slugify";
import { DEFAULTS } from "@template/main-app/projects/b2cView/designSystem";
import {
    ExtractedDataCategory,
    ExtractedDataItem,
    Project,
    ProjectMetadata,
    ProjectSummaryData,
    SpecialMenuMetadata,
    SpecialMenuMode,
    SpecialMenuStatus,
} from "@template/main-app/projects/types";
import { UserUploadedFileType } from "@type/common";
import type { MenuChangeLogInput } from "@type/menuObservation";
import { TimeSlotPreset } from "@type/platform/store";

const DATA_COLLECTION = DB_COLLECTIONS.PROJECTS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

type ProjectDefaultHandoffOptions = {
    unsetProjectId?: string | number | null;
    setProjectId?: string | number | null;
};

type ProjectSummaryWriteOptions = {
    defaultHandoff?: ProjectDefaultHandoffOptions | null;
    defaultHandoffSummaryMap?: Record<string, ProjectSummaryData>;
    cacheContext?: string;
};

type PersistedProject = Project & Partial<Pick<RequestBodyPersistenceMetadata, "sId" | "tId">>;

const createProjectPersistenceStatusError = (
    failureCode: string,
    status?: number,
    message = failureCode,
): Error & { code: string; status?: number } => Object.assign(new Error(message), {
    code: failureCode,
    status,
});

const readLinkedOutletSaveResponse = async (
    response: Response,
    context: ProjectPersistenceLogContext,
    failureCode: string,
    failureMessage: string,
): Promise<unknown> => {
    try {
        return await readLinkedOutletSaveResponseJson(response);
    } catch (error) {
        logProjectPersistenceFailure('project_linked_outlet_response_parse_failed', error, {
            ...context,
            maxBytes: LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        throw createProjectPersistenceStatusError(failureCode, response.status, failureMessage);
    }
};

// ═══════════════════════════════════════════════════════════════
// MENU OBSERVATION LAYER (MOL v0) - Change Detection
// Silent infrastructure - NO UI, NO owner visibility
// @see __docs__/internal-tracking/mol-v0-implementation-plan.md
// ═══════════════════════════════════════════════════════════════

/**
 * Extract all items from a project into a flat map for comparison
 * Returns: { [itemId]: ExtractedDataItem }
 */
function extractItemsMap(project: Partial<Project>): Record<string, ExtractedDataItem> {
    const items: Record<string, ExtractedDataItem> = {};

    if (!project?.files?.length) return items;

    for (const file of project.files) {
        const fileItems = file.extractedData?.data?.items || [];
        for (const item of fileItems) {
            if (item.id) {
                items[item.id] = item;
            }
        }
    }

    return items;
}

/**
 * Extract all categories from a project into a flat map
 * Returns: { [categoryId]: ExtractedDataCategory }
 */
function extractCategoriesMap(
    project: Partial<Project>,
): Record<string, ExtractedDataCategory> {
    const categories: Record<string, ExtractedDataCategory> = {};

    if (!project?.files?.length) return categories;

    for (const file of project.files) {
        const fileCats = file.extractedData?.data?.categories || [];
        for (const cat of fileCats) {
            if (cat.id) {
                categories[cat.id] = cat;
            }
        }
    }

    return categories;
}

type MenuRevisionSummary = {
    addedItems: number;
    removedItems: number;
    priceChanges: number;
    availabilityChanges: number;
    activeChanges: number;
    nameCorrections: number;
    extractionCorrections: number;
    affectedItemCount: number;
    affectedItemIds: string[];
    itemCountBefore: number;
    itemCountAfter: number;
    changesByType: Record<string, number>;
    itemDriftChanges: MenuDriftSummaryContribution[];
    itemDriftChangesOverflowCount: number;
    extractionCorrectionsByField: Record<ExtractionCorrectionField, number>;
    extractionCorrectionsByConfidence: Record<ExtractionConfidence, number>;
};

type ExtractionCorrectionField = 'name' | 'price' | 'description' | 'categoryId' | 'tags';
type ExtractionConfidence = 'high' | 'medium' | 'low';
type ExtractionTrackedItem = ExtractedDataItem & {
    _extractedAt?: unknown;
    confidence?: Partial<Record<'name' | 'price', unknown>>;
};

const createEmptyMenuRevisionSummary = (
    oldItems: Record<string, ExtractedDataItem>,
    newItems: Record<string, ExtractedDataItem>,
): MenuRevisionSummary => ({
    addedItems: 0,
    removedItems: 0,
    priceChanges: 0,
    availabilityChanges: 0,
    activeChanges: 0,
    nameCorrections: 0,
    extractionCorrections: 0,
    affectedItemCount: 0,
    affectedItemIds: [],
    itemCountBefore: Object.keys(oldItems).length,
    itemCountAfter: Object.keys(newItems).length,
    changesByType: {},
    itemDriftChanges: [],
    itemDriftChangesOverflowCount: 0,
    extractionCorrectionsByField: {
        name: 0,
        price: 0,
        description: 0,
        categoryId: 0,
        tags: 0,
    },
    extractionCorrectionsByConfidence: {
        high: 0,
        medium: 0,
        low: 0,
    },
});

const getExtractionConfidence = (
    item: ExtractedDataItem,
    field: 'name' | 'price',
): ExtractionConfidence | undefined => {
    const value = (item as ExtractionTrackedItem).confidence?.[field];
    return value === 'high' || value === 'medium' || value === 'low' ? value : undefined;
};

const addExtractionCorrectionSummary = (
    summary: MenuRevisionSummary,
    field: ExtractionCorrectionField,
    confidence?: ExtractionConfidence,
): void => {
    summary.extractionCorrectionsByField[field] += 1;
    if (confidence) summary.extractionCorrectionsByConfidence[confidence] += 1;
};

const addMenuRevisionSummaryChange = (
    summary: MenuRevisionSummary,
    affectedItems: Set<string>,
    type: keyof Pick<MenuRevisionSummary,
        'addedItems' |
        'removedItems' |
        'priceChanges' |
        'availabilityChanges' |
        'activeChanges' |
        'nameCorrections' |
        'extractionCorrections'>,
    changeType: string,
    itemId: string,
) => {
    summary[type] += 1;
    summary.changesByType[changeType] = (summary.changesByType[changeType] || 0) + 1;
    affectedItems.add(itemId);
    if (!summary.affectedItemIds.includes(itemId) && summary.affectedItemIds.length < 25) {
        summary.affectedItemIds.push(itemId);
    }
    summary.affectedItemCount = affectedItems.size;
};

/**
 * Detect and log menu changes between old and new project state
 * Fire-and-forget - non-blocking, silent failures
 *
 * COST OPTIMIZED:
 * - Feature flag gated
 * - Debounced writes (in menuChangeLog DAL)
 * - Only logs actual changes
 */
async function detectAndLogChanges(
    projectId: string,
    oldProject: Project,
    newProject: Project,
    scope: Readonly<{ tId: number; sId: number }>,
): Promise<void> {
    // COST GATE: Check feature flag first
    if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION) {
        return;
    }

    try {
        const oldItems = extractItemsMap(oldProject);
        const newItems = extractItemsMap(newProject);
        const summary = createEmptyMenuRevisionSummary(oldItems, newItems);
        const affectedItems = new Set<string>();
        const detailedEntries: MenuChangeLogInput[] = [];
        const overflowDriftEntries: MenuChangeLogInput[] = [];
        const shouldWriteDetailed = FEATURE_FLAGS.MENU_OBSERVATION_MODE === "detailed";

        const recordChange = (
            entry: MenuChangeLogInput,
            summaryKey: Parameters<typeof addMenuRevisionSummaryChange>[2],
            itemId: string,
        ) => {
            addMenuRevisionSummaryChange(summary, affectedItems, summaryKey, entry.changeType, itemId);
            if (shouldWriteDetailed) {
                detailedEntries.push(entry);
                return;
            }

            const driftContribution = readMenuDriftContributions(entry)[0];
            if (!driftContribution) return;

            const kind = driftContribution.priceChanges === 1 ? 'price' : 'availability';
            if (!addMenuDriftSummaryContribution(summary.itemDriftChanges, itemId, kind)) {
                // The compact payload is bounded. Preserve correctness for a
                // pathological oversized revision by falling back to the
                // existing detailed event for only the overflow contribution.
                overflowDriftEntries.push(entry);
                summary.itemDriftChangesOverflowCount += 1;
            }
        };

        // Infrastructure Compounding 10.2: Check if item was recently extracted
        // Items with _extractedAt within 24h get EXTRACTION_CORRECTION events
        const EXTRACTION_CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
        const isRecentlyExtracted = (item: ExtractedDataItem): boolean => {
            if (!FEATURE_FLAGS.ENABLE_EXTRACTION_LEARNING) return false;
            const extractedAtValue = (item as ExtractionTrackedItem)._extractedAt;
            if (!extractedAtValue) return false;
            try {
                let extractedAt: Date;
                if (typeof extractedAtValue === 'object'
                    && extractedAtValue !== null
                    && 'toDate' in extractedAtValue
                    && typeof extractedAtValue.toDate === 'function') {
                    const converted = extractedAtValue.toDate();
                    if (!(converted instanceof Date)) return false;
                    extractedAt = converted;
                } else {
                    extractedAt = new Date(String(extractedAtValue));
                }
                const ageMs = Date.now() - extractedAt.getTime();
                return Number.isFinite(ageMs)
                    && ageMs >= 0
                    && ageMs < EXTRACTION_CORRECTION_WINDOW_MS;
            } catch {
                return false;
            }
        };

        // Detect item changes
        for (const [itemId, newItem] of Object.entries(newItems)) {
            const oldItem = oldItems[itemId];

            if (!oldItem) {
                // New item added
                recordChange(createItemAddedEntry(projectId, itemId, newItem), 'addedItems', itemId);
                continue;
            }

            const wasExtracted = isRecentlyExtracted(oldItem);

            // Check price change
            if (oldItem.price !== newItem.price) {
                if (wasExtracted) {
                    // 10.2: Log as extraction correction instead of regular price change
                    const confidence = getExtractionConfidence(oldItem, 'price');
                    recordChange(
                        createExtractionCorrectionEntry(
                            projectId, itemId, 'price',
                            oldItem.price, newItem.price,
                            confidence,
                        ),
                        'extractionCorrections',
                        itemId,
                    );
                    addExtractionCorrectionSummary(summary, 'price', confidence);
                } else {
                    recordChange(
                        createPriceChangeEntry(
                            projectId,
                            itemId,
                            oldItem.price,
                            newItem.price,
                        ),
                        'priceChanges',
                        itemId,
                    );
                }
            }

            // Check name change (10.2: also track for extraction corrections)
            const oldName = oldItem.name ? Object.values(oldItem.name)[0] : '';
            const newName = newItem.name ? Object.values(newItem.name)[0] : '';
            if (wasExtracted && oldName !== newName && oldName && newName) {
                const confidence = getExtractionConfidence(oldItem, 'name');
                recordChange(
                    createExtractionCorrectionEntry(
                        projectId, itemId, 'name',
                        oldName, newName,
                        confidence,
                    ),
                    'extractionCorrections',
                    itemId,
                );
                summary.nameCorrections += 1;
                addExtractionCorrectionSummary(summary, 'name', confidence);
            }

            // Check availability change
            if (oldItem.available !== newItem.available) {
                recordChange(
                    createAvailabilityChangeEntry(
                        projectId,
                        itemId,
                        oldItem.available,
                        newItem.available,
                    ),
                    'availabilityChanges',
                    itemId,
                );
            }

            // Check active status change
            if (oldItem.active !== newItem.active) {
                recordChange(
                    createActiveChangeEntry(
                        projectId,
                        itemId,
                        oldItem.active,
                        newItem.active,
                    ),
                    'activeChanges',
                    itemId,
                );
            }
        }

        // Detect removed items
        for (const [itemId, oldItem] of Object.entries(oldItems)) {
            if (!newItems[itemId]) {
                recordChange(createItemRemovedEntry(projectId, itemId, oldItem), 'removedItems', itemId);
            }
        }

        if (summary.affectedItemCount === 0) {
            return;
        }

        if (shouldWriteDetailed) {
            await logMenuChangesForScope(detailedEntries, scope);
            return;
        }

        if (overflowDriftEntries.length > 0) {
            await logMenuChangesForScope(overflowDriftEntries, scope);
        }

        await logMenuChangeForScope(
            createMenuRevisionSummaryEntry(projectId, summary, "OWNER", undefined, {
                source: "project_update",
            }),
            scope,
        );
    } catch (error) {
        // Fire-and-forget - silent fail, don't block project update
        logProjectPersistenceFailure('project_change_detection_failed', error, {
            ...getProjectPersistenceProjectLogContext(projectId),
            oldProjectPresent: true,
            newProjectPresent: Boolean(newProject),
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL TRUTH: Menu Snapshot on Publish
// Creates immutable point-in-time snapshot of menu state.
// Fire-and-forget — never blocks publish.
// Path: menuSnapshots/{tId}/{sId}/{snapshotId}
// @see __docs__/canonical-truth-infrastructure/
// ═══════════════════════════════════════════════════════════════

async function createMenuSnapshot(
    projectId: string,
    projectData: Partial<Project>,
    scope: Readonly<{ tId: number; sId: number }>,
): Promise<void> {
    try {
        const items = extractItemsMap(projectData);
        const categories = extractCategoriesMap(projectData);
        const retentionDays = Number(FEATURE_FLAGS.MENU_SNAPSHOT_RETENTION_DAYS || 90);
        const createdAt = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(
            createdAt.toMillis() + retentionDays * 24 * 60 * 60 * 1000,
        );

        const snapshotRef = collection(
            firebaseClient,
            `${DB_COLLECTIONS.MENU_SNAPSHOTS}/${scope.tId}/${scope.sId}`,
        );

        const { addDoc: addDocFn } = await import("@firebase/firestore");
        const snapshotPayload = sanitizeForFirestore({
            projectId,
            tId: scope.tId,
            sId: scope.sId,
            itemCount: Object.keys(items).length,
            categoryCount: Object.keys(categories).length,
            languages: projectData.languages || [],
            menuData: {
                items: Object.values(items).map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    category: item.category,
                    active: item.active,
                    available: item.available ?? true,
                    tags: item.tags || [],
                })),
                categories: Object.values(categories).map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    active: cat.active,
                })),
            },
            createdAt,
            expiresAt,
            retentionDays,
            snapshotMode: "full_menu_short_term",
        }, {
            undefinedObjectValue: 'omit',
        });
        await addDocFn(snapshotRef, snapshotPayload);

        logProjectPersistenceInfo('project_snapshot_created', {
            ...getProjectPersistenceProjectLogContext(projectId),
            itemCount: Object.keys(items).length,
            categoryCount: Object.keys(categories).length,
            retentionDays,
        });
    } catch (error) {
        // Fire-and-forget — snapshot failure never blocks publish
        logProjectPersistenceFailure('project_snapshot_create_failed', error, {
            ...getProjectPersistenceProjectLogContext(projectId),
        });
    }
}

const recordPublishedMenuTruth = async (
    projectId: string,
    projectData: Partial<Project>,
    scope: Readonly<{ tId: number; sId: number }>,
): Promise<void> => {
    if (FEATURE_FLAGS.ENABLE_MENU_OBSERVATION) {
        try {
            const items = extractItemsMap(projectData);
            const categories = extractCategoriesMap(projectData);
            await logMenuChangeForScope({
                projectId,
                changeType: "PUBLISH",
                oldValue: null,
                newValue: {
                    itemCount: Object.keys(items).length,
                    categoryCount: Object.keys(categories).length,
                },
                changedBy: "OWNER",
            }, scope);
        } catch (error) {
            logProjectPersistenceFailure('menu_observation_publish_event_failed', error, {
                ...getProjectPersistenceProjectLogContext(projectId, projectData.masterProjectId),
            });
        }
    }

    if (FEATURE_FLAGS.ENABLE_MENU_SNAPSHOTS) {
        void createMenuSnapshot(projectId, projectData, scope);
    }
};

// ═══════════════════════════════════════════════════════════════
// DOCUMENT REFERENCES
// ═══════════════════════════════════════════════════════════════

const extractProjectsSummaryMap = (
    summaryDocData?: unknown,
): Record<string, ProjectSummaryData> => {
    const parsed = parseSummaryProjects(summaryDocData);
    const result = Object.create(null) as Record<string, ProjectSummaryData>;
    for (const [projectId, projectData] of Object.entries(parsed)) {
        result[projectId] = normalizeParsedProjectSummaryData(projectData);
    }
    return result;
};

const filterProjectsSummaryMapForScope = (
    projects: Record<string, ProjectSummaryData>,
    scope: Readonly<{ tId: string | number; sId: string | number }>,
): Record<string, ProjectSummaryData> => {
    const filtered = Object.create(null) as Record<string, ProjectSummaryData>;
    for (const [projectId, summary] of Object.entries(projects)) {
        if (normalizeProjectDocumentScope({ ...scope, projectId })) {
            filtered[projectId] = summary;
        }
    }
    return filtered;
};

const isSafeProjectSummaryTextLanguage = (value: string): boolean => (
    Boolean(value.trim()) && !['__proto__', 'constructor', 'prototype'].includes(value)
);

const normalizeProjectSummaryLocalizedText = (
    value: unknown,
): string | Record<string, string> | undefined => {
    if (typeof value === 'string') return value;
    if (!isLocalizedText(value)) return undefined;

    const normalized = Object.create(null) as Record<string, string>;
    for (const [language, text] of Object.entries(value)) {
        if (isSafeProjectSummaryTextLanguage(language) && typeof text === 'string' && text.trim()) {
            normalized[language] = text;
        }
    }

    return Object.keys(normalized).length ? { ...normalized } : undefined;
};

const normalizeProjectSummaryStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const normalized = value
        .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
        .map((entry) => entry.trim());
    return normalized.length ? normalized : undefined;
};

const normalizeProjectSummaryStatus = (value: unknown): SpecialMenuStatus | undefined => (
    value === 'scheduled' || value === 'active' || value === 'expired' || value === 'cancelled'
        ? value
        : undefined
);

const normalizeProjectSummaryMode = (value: unknown): SpecialMenuMode | undefined => (
    value === 'replace' || value === 'overlay'
        ? value
        : undefined
);

const normalizeParsedProjectSummaryData = (
    projectData: Record<string, unknown>,
): ProjectSummaryData => {
    const name = normalizeProjectSummaryLocalizedText(projectData.name)
        || { [CANONICAL_SOURCE_LANGUAGE]: 'Untitled' };
    const description = normalizeProjectSummaryLocalizedText(projectData.description);
    const previousSlugs = normalizeProjectSummaryStringArray(projectData.previousSlugs);
    const specialMenuDisplayName = normalizeProjectSummaryLocalizedText(projectData.specialMenuDisplayName);
    const specialMenuStatus = normalizeProjectSummaryStatus(projectData.specialMenuStatus);
    const specialMenuMode = normalizeProjectSummaryMode(projectData.specialMenuMode);
    const rawProjectImage = projectData.projectImage;
    const projectImage: string | null | undefined = typeof rawProjectImage === 'string'
        ? rawProjectImage
        : rawProjectImage === null
            ? null
            : undefined;

    const normalized: ProjectSummaryData = {
        name,
        active: projectData.active === false ? false : true,
    };
    if (description !== undefined) normalized.description = description;
    if (projectImage !== undefined) normalized.projectImage = projectImage;
    if (typeof projectData.businessCategory === 'string') normalized.businessCategory = projectData.businessCategory;
    if (typeof projectData.businessType === 'string') normalized.businessType = projectData.businessType;
    if (typeof projectData.isDefault === 'boolean') normalized.isDefault = projectData.isDefault;
    if (projectData.createdOn instanceof Timestamp) normalized.createdOn = projectData.createdOn;
    if (projectData.modifiedOn instanceof Timestamp) normalized.modifiedOn = projectData.modifiedOn;
    if (typeof projectData.slug === 'string') normalized.slug = projectData.slug;
    if (previousSlugs) normalized.previousSlugs = previousSlugs;
    if (typeof projectData.isSpecialMenu === 'boolean') normalized.isSpecialMenu = projectData.isSpecialMenu;
    if (specialMenuDisplayName !== undefined) normalized.specialMenuDisplayName = specialMenuDisplayName;
    if (specialMenuStatus) normalized.specialMenuStatus = specialMenuStatus;
    if (typeof projectData.specialMenuStartsAt === 'string') normalized.specialMenuStartsAt = projectData.specialMenuStartsAt;
    if (typeof projectData.specialMenuEndsAt === 'string') normalized.specialMenuEndsAt = projectData.specialMenuEndsAt;
    if (specialMenuMode) normalized.specialMenuMode = specialMenuMode;
    if (typeof projectData.specialMenuBaseProjectId === 'string') normalized.specialMenuBaseProjectId = projectData.specialMenuBaseProjectId;

    return normalized;
};

const resolveProjectTextLanguage = (
    value: unknown,
    fallbackLanguage: string = CANONICAL_SOURCE_LANGUAGE,
): string => getPrimaryLocalizedLanguage(value as any, fallbackLanguage);

const resolveProjectSummaryName = (
    value: ProjectSummaryData["name"] | undefined,
    fallback: string = "Untitled",
): string => getLocalizedText(value, undefined, resolveProjectTextLanguage(value), fallback);

const resolveProjectSummaryDescription = (
    value: ProjectSummaryData["description"] | undefined,
): string => getLocalizedText(value, undefined, resolveProjectTextLanguage(value), '');

const normalizeProjectReadState = <T extends Partial<Project>>(projectData: T): T => ({
    ...(() => {
        const policy = normalizeProjectLanguagePolicy({
            languages: projectData.languages || [],
            defaultLanguage: projectData.defaultLanguage,
        });
        return {
            ...projectData,
            languages: policy.languages as any,
            defaultLanguage: policy.defaultLanguage as any,
        };
    })(),
    ...(projectData.name !== undefined
        ? { name: toLocalizedText(projectData.name as any, resolveProjectTextLanguage(projectData.name, CANONICAL_SOURCE_LANGUAGE)) as any }
        : {}),
    ...(projectData.description !== undefined
        ? { description: toLocalizedText(projectData.description as any, resolveProjectTextLanguage(projectData.description, CANONICAL_SOURCE_LANGUAGE)) as any }
        : {}),
    ...(projectData._specialMenu?.displayName
        ? {
            _specialMenu: {
                ...projectData._specialMenu,
                displayName: toLocalizedText(
                    projectData._specialMenu.displayName as any,
                    resolveProjectTextLanguage(projectData._specialMenu.displayName, CANONICAL_SOURCE_LANGUAGE),
                ) as any,
            },
        }
        : {}),
});

const stripUndefinedProjectSummaryFields = (
    summary: Partial<ProjectSummaryData>,
): Partial<ProjectSummaryData> => (
    Object.fromEntries(
        Object.entries(summary).filter(([, value]) => value !== undefined),
    ) as Partial<ProjectSummaryData>
);

const normalizeProjectDefaultHandoffId = (
    value?: string | number | null,
): string | undefined => {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
};

const buildProjectDefaultHandoffSummaryPayload = (
    projectId: string,
    options?: ProjectSummaryWriteOptions,
): { payload: Record<string, any>; projectIds: string[] } => {
    const unsetProjectId = normalizeProjectDefaultHandoffId(options?.defaultHandoff?.unsetProjectId);
    const setProjectId = normalizeProjectDefaultHandoffId(options?.defaultHandoff?.setProjectId);
    const payload: Record<string, any> = {};
    const projectIds: string[] = [];

    if (unsetProjectId && unsetProjectId !== projectId) {
        Object.assign(payload, buildSummaryProjectFieldPayload(unsetProjectId, 'isDefault', false));
        projectIds.push(unsetProjectId);
    }

    if (setProjectId && setProjectId !== projectId) {
        const setProjectSummary = options?.defaultHandoffSummaryMap?.[setProjectId];
        if (options?.defaultHandoffSummaryMap && !setProjectSummary) {
            throw new Error('Replacement default project was not found.');
        }
        if (setProjectSummary?.isSpecialMenu) {
            throw new Error('A special menu cannot be set as the default project.');
        }
        Object.assign(payload, buildSummaryProjectFieldPayload(setProjectId, 'isDefault', true));
        projectIds.push(setProjectId);
    }

    return { payload, projectIds };
};

const buildProjectSummaryMutation = (
    projectId: string,
    data: ProjectSummaryData,
    options: ProjectSummaryWriteOptions = {},
) => {
    const cleanData = stripUndefinedProjectSummaryFields(data) as ProjectSummaryData;
    const handoff = buildProjectDefaultHandoffSummaryPayload(projectId, options);
    return {
        cleanData,
        handoff,
        payload: {
            lastUpdated: serverTimestamp(),
            ...buildSummaryProjectPayload(projectId, cleanData),
            ...handoff.payload,
        },
    };
};

const revalidateProjectSummaryMutation = async (
    projectId: string,
    handoffProjectIds: string[],
    options: ProjectSummaryWriteOptions = {},
) => {
    const cacheContext = options.cacheContext || 'syncProjectToSummary';
    await Promise.all(
        Array.from(new Set([projectId, ...handoffProjectIds]))
            .map((cacheProjectId) => revalidatePublicClientCacheForProject(cacheProjectId, cacheContext)),
    );
};

// ═══════════════════════════════════════════════════════════════
// SLUG RESERVATION (T1-N-04 / A-12 PUBLIC-ROUTING-DOCTRINE)
// ═══════════════════════════════════════════════════════════════

/**
 * 90 days, expressed in ms. Matches the A-12 post-deletion window during
 * which a deleted project's slug and its previousSlugs[] entries remain
 * reserved so a same-slug replacement can't hijack incoming QR scans.
 */
const SLUG_RESERVATION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Check whether a proposed slug is currently reserved by a project that
 * was soft-deleted within the last 90 days.
 *
 * Queries the projects subcollection directly (NOT the summary, which
 * has deleted projects removed) and walks any project with
 * `deleted === true` AND `deletedAt > now - 90d`. A match on either the
 * deleted project's current slug OR any of its previousSlugs[] blocks
 * re-use of the slug.
 *
 * Firebase cost: 1 query per create/rename; bounded (typical store has
 * very few deleted projects in any 90-day window). Skipped entirely
 * when the proposed slug is empty.
 *
 * @see __docs__/client-menu/public-routing-doctrine.md §A-12, T1-N-04
 */
const isSlugReservedByRecentlyDeleted = async (
    proposedSlug: string,
    excludeProjectId: string | undefined,
    scopedCollectionRef: CollectionReference<DocumentData>,
): Promise<boolean> => {
    if (!proposedSlug) return false;
    const normalized = proposedSlug.toLowerCase();

    try {
        const deletedQuery = query(
            scopedCollectionRef,
            where('deleted', '==', true),
            limit(50),
        );
        const snapshot = await getDocs(deletedQuery);
        const cutoffMs = Date.now() - SLUG_RESERVATION_WINDOW_MS;

        for (const docSnap of snapshot.docs) {
            if (excludeProjectId && docSnap.id === excludeProjectId) continue;
            const data = docSnap.data() as Record<string, any>;

            // Reservation only applies while inside the 90-day window.
            const deletedAt = data?.deletedAt;
            const deletedAtMs =
                deletedAt?.toMillis?.() ??
                (deletedAt instanceof Date ? deletedAt.getTime() : null);
            if (deletedAtMs == null || deletedAtMs < cutoffMs) continue;

            const currentSlug = typeof data?.slug === 'string' ? data.slug.toLowerCase() : '';
            if (currentSlug && currentSlug === normalized) return true;

            const previousSlugs: string[] = Array.isArray(data?.previousSlugs)
                ? data.previousSlugs.filter((s: unknown) => typeof s === 'string')
                : [];
            if (previousSlugs.some((s) => s.toLowerCase() === normalized)) return true;
        }
    } catch (error) {
        // Treat unknown reservation state as reserved so QR/public URL permanence
        // does not depend on a best-effort lookup succeeding.
        logProjectPersistenceFailure('deleted_project_slug_reservation_check_failed', error, {
            ...getBoundedProjectPersistenceStringContext('slug', normalized),
            slugReservationWindowDays: SLUG_RESERVATION_WINDOW_MS / (24 * 60 * 60 * 1000),
        });
        return true;
    }

    return false;
};

// ═══════════════════════════════════════════════════════════════
// PROJECTS SUMMARY FUNCTIONS (Summary Document Pattern)
// ═══════════════════════════════════════════════════════════════

/**
 * Get all projects summary for current store (1 read)
 */
export const getProjectsSummary = async (): Promise<
    Record<string, ProjectSummaryData>
> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${session.sId}`);
            const docSnap = await getDoc(docRef);
            return docSnap.exists()
                ? filterProjectsSummaryMapForScope(
                    extractProjectsSummaryMap(docSnap.data() as Record<string, any>),
                    session,
                )
                : {};
        },
        null,
        "getProjectsSummary",
    );
};

/**
 * Sync a project to the summary document (1 write)
 */
export const syncProjectToSummary = async (
    projectId: string,
    data: ProjectSummaryData,
    options?: ProjectSummaryWriteOptions,
) => {
    return await apiCallComposer(
        async () => {
            return await updateProjectMetadata(projectId, data, {
                defaultHandoff: options?.defaultHandoff,
            });
        },
        { projectId, data, options },
        "syncProjectToSummary",
    );
};

/**
 * Remove a project from the summary document (1 write)
 */
export const removeProjectFromSummary = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeProjectDocumentScope({ tId: session.tId, sId: session.sId, projectId });
            if (!scope) throw new Error('Invalid project summary removal scope');
            const projectDocRef = doc(
                firebaseClient,
                DATA_COLLECTION,
                scope.tId,
                scope.sId,
                scope.projectId,
            );
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
            await runTransaction(firebaseClient, async (transaction) => {
                const projectDoc = await transaction.get(projectDocRef);
                if (
                    !projectDoc.exists()
                    || projectDoc.data().deleted !== true
                    || !projectDocumentMatchesScope(projectDoc.data(), scope)
                ) {
                    throw new Error('Project summary removal requires a deleted project');
                }
                transaction.set(summaryDocRef, {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectDeletePayload(projectId, deleteField()),
                }, { merge: true });
            });
            await revalidatePublicClientCacheForProject(projectId, "removeProjectFromSummary");
            return { projectId, removed: true };
        },
        { projectId },
        "removeProjectFromSummary",
    );
};

const getTenantScopedProjectUploadFileId = (projectId: string, fileId: string): string => {
    const stableId = `${projectId || 'project'}-${fileId || Date.now()}`;
    const normalizedId = stableId
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);

    return normalizedId || `${Date.now()}`;
};

export const uploadProjectFile = async (
    data: any,
    type = "",
    projectId: string,
    fileId: string,
) => {
    let newUrl: any = "";
    let fileType: any = data.fileType;
    let fileToUpdate: any = data.fileToUpdate;
    const storageFileId = getTenantScopedProjectUploadFileId(projectId, fileId);
    const storageFileType = type || "files";

    if (fileToUpdate) {
        if (fileToUpdate?.includes("base64")) {
            const session = await getActiveSession();
            newUrl = await uploadBase64ToStorage({
                fileId: storageFileId,
                url: fileToUpdate,
                path: generateStoragePath({
                    collection: DATA_COLLECTION,
                    fileType: storageFileType,
                    session,
                    fileId: storageFileId,
                }),
                type: fileType,
            });
        }
        return newUrl;
    }
    return "";
};

// ═══════════════════════════════════════════════════════════════
// PROJECT CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

export const addProject = async (data: Partial<ProjectMetadata> & {
    businessCategory?: string;
    businessType?: string;
}, options: { defaultHandoff?: ProjectDefaultHandoffOptions | null } = {}) => {
    return await apiCallComposer(
        async () => {
            const operationSession = await getActiveSession();
            const operationScope = normalizeMenuChangeLogScope(operationSession);
            if (!operationScope) throw new Error('Invalid project creation scope');
            const projectCollectionRef = collection(
                firebaseClient,
                DATA_COLLECTION,
                String(operationScope.tId),
                String(operationScope.sId),
            );
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${operationScope.sId}`);
            const isActive = data.active !== false;
            const projectLanguage = resolveProjectTextLanguage(data.name, 'en');
            const localizedName = typeof data.name === 'string'
                ? updateLocalizedText(undefined, data.name, projectLanguage, 'en')
                : toLocalizedText(data.name as any, projectLanguage);
            const localizedDescription = typeof data.description === 'string'
                ? updateLocalizedText(undefined, data.description, projectLanguage, 'en')
                : toLocalizedText(data.description as any, projectLanguage);
            const resolvedName = resolveProjectSummaryName(localizedName, "Untitled");
            const businessCategory = (data.businessType || data.businessCategory)
                ? resolveStoreBusinessCategory(data.businessType, data.businessCategory)
                : undefined;
            const recommendedDesignPreset = getRecommendedMenuDesignPresets({
                businessCategory,
                businessType: data.businessType,
            })[0];
            const designPresetPatch = recommendedDesignPreset
                ? getMenuDesignPresetPatch(recommendedDesignPreset)
                : null;

            // Generate project ID
            const suppliedProjectId = Boolean(data.projectId);
            let projectId = data.projectId;
            if (!projectId) {
                const timestamp = Date.now().toString(36);
                const entropy = doc(projectCollectionRef).id;
                projectId = `${operationScope.tId}-${timestamp}-${entropy}-${operationScope.sId}`;
            } else {
                const projectScope = normalizeMultiOutletProjectId(projectId);
                if (
                    !projectScope
                    || projectScope.tId !== operationScope.tId
                    || projectScope.sId !== operationScope.sId
                ) {
                    throw new Error('Invalid project creation identity');
                }
            }

            // Generate permanent URL slug (URL Routing Architecture — ADR-3)
            // Auto-generated from name on creation. Stored permanently.
            let projectSlug = typeof data.slug === 'string' && data.slug.trim()
                ? data.slug.trim().toLowerCase()
                : slugify(resolvedName || "untitled");
            if (data.slug !== undefined && slugify(projectSlug) !== projectSlug) {
                throw new Error('Invalid project slug');
            }
            // Validate: block reserved slugs
            if (isReservedProjectSlug(projectSlug)) {
                projectSlug = `${projectSlug}-menu`;
            }
            // T1-N-04 / A-12: block reuse of any slug held by a project that
            // was soft-deleted within the last 90 days (including its
            // previousSlugs[] chain). Suffix with a timestamp to stay unique.
            if (await isSlugReservedByRecentlyDeleted(projectSlug, undefined, projectCollectionRef)) {
                projectSlug = `${projectSlug}-${String(projectId).slice(-12).toLowerCase()}`;
            }

            // Create project data only after every pre-write validation succeeds.
            const projectData = composeRequestBody({
                projectId,
                files: [],
                ...normalizeProjectLanguagePolicy({
                    languages: (data as any).languages || [],
                    defaultLanguage: (data as any).defaultLanguage || projectLanguage,
                }),
                active: isActive,
                deleted: false,
                config: {
                    design: {
                        menu: {
                            ...(designPresetPatch?.menu || {
                                mood: DEFAULTS.menu.mood,
                                layout: DEFAULTS.menu.layout,
                                showItemPrices: DEFAULTS.menu.showItemPrices,
                                showImages: DEFAULTS.menu.showImages,
                                showCategoryIcons: DEFAULTS.menu.showCategoryIcons,
                                showCategoryTabs: DEFAULTS.menu.showCategoryTabs,
                            }),
                        },
                        ...(designPresetPatch?.brand ? { brand: designPresetPatch.brand } : {}),
                    },
                },
            }, operationSession, { isNew: true });

            const summaryOptions = {
                defaultHandoff: options.defaultHandoff,
                cacheContext: "addProject",
            };
            const projectDocRef = doc(projectCollectionRef, projectId);
            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const existingProjectDoc = suppliedProjectId
                    ? await transaction.get(projectDocRef)
                    : null;
                const summaryDoc = await transaction.get(summaryDocRef);
                const summaryMap = summaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
                        operationScope,
                    )
                    : {};
                const existingSummary = summaryMap[projectId];
                const availableSlug = resolveAvailableProjectSlug(
                    summaryMap,
                    projectSlug,
                    String(projectId),
                    projectId,
                );

                if (existingProjectDoc?.exists()) {
                    const existingProject = existingProjectDoc.data() as PersistedProject;
                    if (
                        existingProject.deleted === true
                        || (existingProject.projectId !== undefined && existingProject.projectId !== projectId)
                        || (existingProject.tId !== undefined && String(existingProject.tId) !== String(operationScope.tId))
                        || (existingProject.sId !== undefined && String(existingProject.sId) !== String(operationScope.sId))
                    ) {
                        throw new Error('Existing project creation identity mismatch');
                    }
                }

                // Firestore rejects undefined values, so optional summary fields are omitted.
                // Existing summary truth wins for idempotent deterministic-ID recovery.
                const summaryData: ProjectSummaryData = {
                    name: localizedName || { [CANONICAL_SOURCE_LANGUAGE]: "Untitled" },
                    ...(localizedDescription != null ? { description: localizedDescription } : {}),
                    ...(data.projectImage !== undefined ? { projectImage: data.projectImage } : {}),
                    ...(businessCategory ? { businessCategory } : {}),
                    ...(data.businessType ? { businessType: data.businessType } : {}),
                    active: isActive,
                    isDefault: data.isDefault ?? false,
                    slug: availableSlug,
                    ...(existingSummary || {}),
                };
                const summaryMutation = buildProjectSummaryMutation(projectId, summaryData, summaryOptions);
                if (!existingProjectDoc?.exists()) {
                    transaction.set(projectDocRef, projectData, { merge: false });
                }
                transaction.set(summaryDocRef, summaryMutation.payload, { merge: true });
                return {
                    created: !existingProjectDoc?.exists(),
                    projectData: existingProjectDoc?.exists() ? existingProjectDoc.data() : projectData,
                    summaryData,
                    summaryMutation,
                };
            });
            const { created, summaryData, summaryMutation } = transactionResult;
            await revalidateProjectSummaryMutation(projectId, summaryMutation.handoff.projectIds, summaryOptions);

            // Propagation hook (Feature #4C): Auto-create outlet projects
            if (created && FEATURE_FLAGS.ENABLE_PROJECT_PROPAGATION) {
                try {
                    const { propagateNewProjectToOutlets } = await import(
                        "@database/multiOutlet/propagation"
                    );
                    await propagateNewProjectToOutlets(
                        operationScope.tId,
                        operationScope.sId,
                        projectId,
                        resolvedName,
                    );
                } catch (e) {
                    // Non-blocking: log but don't fail project creation
                    logProjectPersistenceFailure('project_outlet_propagation_create_failed', e, {
                        ...getProjectPersistenceProjectLogContext(projectId),
                        ...getBoundedProjectPersistenceStringContext('projectName', resolvedName),
                    });
                }
            }

            return { projectId, projectData: transactionResult.projectData, summaryData };
        },
        { data, options },
        "addProject",
    );
};

/**
 * Update project metadata (name, description, isDefault)
 * Syncs to projectsSummary for listing efficiency
 * 
 * URL Routing Architecture — ADR-3:
 * When name changes and no explicit slug provided, auto-generate new slug
 * and preserve old slug in previousSlugs[] for 301 redirect support.
 */
export const updateProjectMetadata = async (
    projectId: string,
    data: Partial<ProjectSummaryData>,
    options: { defaultHandoff?: ProjectDefaultHandoffOptions | null } = {},
) => {
    return await apiCallComposer(
        async () => {
            const operationSession = await getActiveSession();
            const operationScope = normalizeMenuChangeLogScope(operationSession);
            const projectScope = normalizeMultiOutletProjectId(projectId);
            if (
                !operationScope
                || !projectScope
                || projectScope.tId !== operationScope.tId
                || projectScope.sId !== operationScope.sId
            ) {
                throw new Error('Invalid project metadata scope');
            }
            const projectCollectionRef = collection(
                firebaseClient,
                DATA_COLLECTION,
                String(operationScope.tId),
                String(operationScope.sId),
            );
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${operationScope.sId}`);
            let requestedSlug: string | undefined;
            let shouldChangeSlug = false;
            const explicitSlugProvided = data.slug !== undefined;
            const explicitSlug = explicitSlugProvided && typeof data.slug === 'string'
                ? data.slug.trim().toLowerCase()
                : undefined;
            if (explicitSlugProvided && (!explicitSlug || slugify(explicitSlug) !== explicitSlug)) {
                throw new Error('Invalid project slug');
            }
            if (data.name !== undefined || explicitSlugProvided) {
                const summaryDoc = await getDoc(summaryDocRef);
                const summaryMap = summaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
                        operationScope,
                    )
                    : {};
                const currentSummary = summaryMap[projectId];
                if (!currentSummary) throw new Error('Project summary not found');
                const textLanguage = resolveProjectTextLanguage(currentSummary.name, 'en');
                const nextName = data.name === undefined
                    ? undefined
                    : typeof data.name === 'string'
                        ? updateLocalizedText(currentSummary.name, data.name, textLanguage, 'en')
                        : toLocalizedText(data.name as any, textLanguage);
                const currentName = resolveProjectSummaryName(currentSummary.name, "Untitled");
                const resolvedNextName = resolveProjectSummaryName(nextName, currentName);
                requestedSlug = explicitSlugProvided
                    ? explicitSlug
                    : data.name !== undefined && resolvedNextName !== currentName
                        ? slugify(resolvedNextName)
                        : undefined;
                shouldChangeSlug = Boolean(
                    requestedSlug
                    && requestedSlug !== currentSummary.slug
                    && !isReservedProjectSlug(requestedSlug),
                );
                if (explicitSlugProvided && requestedSlug && isReservedProjectSlug(requestedSlug)) {
                    throw new Error('This menu URL is reserved. Please choose a different URL.');
                }
                if (shouldChangeSlug && requestedSlug) {
                    if (isProjectSlugClaimed(summaryMap, requestedSlug, projectId)) {
                        throw new Error('This menu URL is already in use. Please choose a different name.');
                    }
                    if (await isSlugReservedByRecentlyDeleted(requestedSlug, projectId, projectCollectionRef)) {
                        throw new Error(
                            'This name is temporarily unavailable because a recently deleted menu used it. Please choose a different name or wait until the previous URL is released.',
                        );
                    }
                }
            }

            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const freshSummaryDoc = await transaction.get(summaryDocRef);
                const freshSummaryMap = freshSummaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(freshSummaryDoc.data() as Record<string, any>),
                        operationScope,
                    )
                    : {};
                const freshCurrentSummary = freshSummaryMap[projectId];
                if (!freshCurrentSummary) throw new Error('Project summary not found');
                if (
                    data.isDefault === true
                    && FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING
                    && freshCurrentSummary.isSpecialMenu
                ) {
                    throw new Error("A special menu cannot be set as the default project.");
                }
                if (shouldChangeSlug && requestedSlug && isProjectSlugClaimed(freshSummaryMap, requestedSlug, projectId)) {
                    throw new Error('This menu URL is already in use. Please choose a different name.');
                }

                const freshTextLanguage = resolveProjectTextLanguage(freshCurrentSummary.name, 'en');
                const freshNextName = data.name === undefined
                    ? undefined
                    : typeof data.name === 'string'
                        ? updateLocalizedText(freshCurrentSummary.name, data.name, freshTextLanguage, 'en')
                        : toLocalizedText(data.name as any, freshTextLanguage);
                const freshNextDescription = data.description === undefined
                    ? undefined
                    : typeof data.description === 'string'
                        ? updateLocalizedText(freshCurrentSummary.description, data.description, freshTextLanguage, 'en')
                        : toLocalizedText(data.description as any, freshTextLanguage);
                const { slug: _ignoredSlug, previousSlugs: _ignoredPreviousSlugs, ...safeData } = data;
                const applySlugChange = Boolean(
                    shouldChangeSlug
                    && requestedSlug
                    && requestedSlug !== freshCurrentSummary.slug,
                );
                const slugUpdate: Partial<ProjectSummaryData> = applySlugChange && requestedSlug
                    ? {
                        slug: requestedSlug,
                        ...(freshCurrentSummary.slug
                            ? { previousSlugs: [...(freshCurrentSummary.previousSlugs || []), freshCurrentSummary.slug].slice(-5) }
                            : {}),
                    }
                    : {};
                const updatedSummary: ProjectSummaryData = {
                    ...freshCurrentSummary,
                    ...safeData,
                    ...slugUpdate,
                    ...(freshNextName !== undefined ? { name: freshNextName } : {}),
                    ...(freshNextDescription !== undefined ? { description: freshNextDescription } : {}),
                    name: freshNextName ?? freshCurrentSummary.name ?? { [CANONICAL_SOURCE_LANGUAGE]: "Untitled" },
                    active: data.active ?? freshCurrentSummary.active ?? true,
                };
                const summaryOptions = {
                    defaultHandoff: options.defaultHandoff,
                    defaultHandoffSummaryMap: freshSummaryMap,
                    cacheContext: "updateProjectMetadata",
                };
                const summaryMutation = buildProjectSummaryMutation(projectId, updatedSummary, summaryOptions);
                transaction.set(summaryDocRef, summaryMutation.payload, { merge: true });
                return { updatedSummary, summaryMutation, summaryOptions };
            });
            await revalidateProjectSummaryMutation(
                projectId,
                transactionResult.summaryMutation.handoff.projectIds,
                transactionResult.summaryOptions,
            );
            return { projectId, ...transactionResult.updatedSummary };
        },
        { projectId, data, options },
        "updateProjectMetadata",
    );
};

const stripGeneratedProjectReadModels = <T extends Partial<Project>>(data: T): T => {
    const cleanData = { ...data } as T & Record<string, unknown>;
    delete cleanData.publicDecisionBlocks;
    return cleanData as T;
};

export function assertProjectUpdateSucceeded(
    result: unknown,
    expectedProjectId?: string | number,
    rejectionCode = 'project_update_rejected',
): asserts result is Record<string, any> {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    if (expectedProjectId === undefined || expectedProjectId === null) return;

    const savedProjectId = (result as { projectId?: unknown; id?: unknown }).projectId
        ?? (result as { projectId?: unknown; id?: unknown }).id;
    if (String(savedProjectId) !== String(expectedProjectId)) {
        throw new Error(rejectionCode);
    }
}

export async function appendImageBatchProjectSelections({
    masterProjectId,
    projectId,
    selections: rawSelections,
}: {
    masterProjectId?: string;
    projectId: string;
    selections: ImageBatchProjectSelection[];
}): Promise<Project> {
    const operationSession = await getActiveSession();
    const operationScope = normalizeMenuChangeLogScope(operationSession);
    const projectScope = normalizeImageBatchProjectId(projectId);
    const expectedBucket = firebaseStorage?.app?.options?.storageBucket;
    const selections = typeof expectedBucket === 'string' && expectedBucket.trim()
        ? normalizeImageBatchProjectSelections(rawSelections, projectId, expectedBucket)
        : null;
    if (
        !operationScope
        || !projectScope
        || projectScope.tId !== String(operationScope.tId)
        || projectScope.sId !== String(operationScope.sId)
        || !selections
    ) {
        throw new Error('image_batch_project_selection_scope_invalid');
    }

    if (masterProjectId) {
        const linkedOutletLogContext = getProjectPersistenceProjectLogContext(projectId, masterProjectId);
        const response = await fetch('/api/projects/outlet-save', {
            ...LINKED_OUTLET_SAVE_REQUEST_POLICY,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation: 'append_image_batch_selection',
                project: { masterProjectId, projectId },
                selections,
            }),
        });
        if (!response.ok) {
            const error = createProjectPersistenceStatusError(
                'linked_outlet_image_batch_selection_rejected',
                response.status,
                'Generated images could not be saved. Please try again.',
            );
            logProjectPersistenceFailure('project_linked_outlet_image_batch_selection_rejected', error, linkedOutletLogContext);
            throw error;
        }
        const result = await readLinkedOutletSaveResponse(
            response,
            linkedOutletLogContext,
            'linked_outlet_image_batch_selection_response_parse_failed',
            'Generated images could not be saved. Please try again.',
        );
        if (!isLinkedOutletSaveResponse(result, projectId, masterProjectId)) {
            throw createProjectPersistenceStatusError(
                'linked_outlet_image_batch_selection_response_invalid',
                response.status,
                'Generated images could not be saved. Please try again.',
            );
        }
        return result.project as Project;
    }

    const projectRef = doc(
        firebaseClient,
        `${DATA_COLLECTION}/${operationScope.tId}/${operationScope.sId}`,
        projectId,
    );
    const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
        const currentSnap = await transaction.get(projectRef);
        if (!currentSnap.exists()) throw new Error('image_batch_project_missing');
        const current = currentSnap.data() as Project;
        if (
            (current.projectId !== undefined && String(current.projectId) !== projectId)
            || current.masterProjectId
        ) {
            throw new Error('image_batch_project_selection_contract_mismatch');
        }
        const nextProject = appendImageBatchSelectionsToProject(current, selections);
        const updateData = composeRequestBody({
            files: nextProject.files,
            projectId,
        }, operationSession, { isNew: false });
        transaction.set(projectRef, updateData, { merge: true });
        return {
            current,
            next: { ...current, ...updateData } as Project,
        };
    });

    await revalidatePublicClientCacheForProject(projectId, 'appendImageBatchProjectSelections');
    if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        try {
            const { invalidateMasterCache } = await import('@lib/multiOutlet');
            invalidateMasterCache(projectId);
        } catch (error) {
            logProjectPersistenceFailure('image_batch_project_master_cache_invalidation_failed', error, {
                ...getProjectPersistenceProjectLogContext(projectId),
            });
        }
    }
    void detectAndLogChanges(projectId, transactionResult.current, transactionResult.next, operationScope);
    return transactionResult.next;
}

export type ProjectDeleteResult = {
    projectId: string;
    deleted: true;
};

export function isProjectDeleteResult(
    result: unknown,
    expectedProjectId?: string | number,
): result is ProjectDeleteResult {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return false;
    }

    const candidate = result as { projectId?: unknown; deleted?: unknown };
    if (candidate.deleted !== true || typeof candidate.projectId !== 'string') {
        return false;
    }

    if (expectedProjectId === undefined || expectedProjectId === null) {
        return true;
    }

    return String(candidate.projectId) === String(expectedProjectId);
}

export function assertProjectDeleteSucceeded(
    result: unknown,
    expectedProjectId?: string | number,
    rejectionCode = 'project_delete_rejected',
): asserts result is ProjectDeleteResult {
    if (isProjectDeleteResult(result, expectedProjectId)) return;
    throw new Error(rejectionCode);
}

const runUpdateProject = async (data: Partial<Project>) => {
    data = sanitizeProjectPartialUpdate(stripGeneratedProjectReadModels(data));
    const operationSession = await getActiveSession();
    const operationScope = normalizeMenuChangeLogScope(operationSession);
    if (!operationScope) {
        throw new Error('Invalid active project operation scope');
    }
    const operationProjectId = normalizeMenuChangeLogIdentifier(data.projectId, 'projectId');
    data.projectId = operationProjectId;
    const operationProjectRef = doc(
        firebaseClient,
        `${DATA_COLLECTION}/${operationScope.tId}/${operationScope.sId}`,
        operationProjectId,
    );

    if (Array.isArray(data.languages)) {
        const normalizedPolicy = normalizeProjectLanguagePolicy({
            languages: data.languages || [],
            defaultLanguage: data.defaultLanguage,
        });
        data.languages = normalizedPolicy.languages;
        data.defaultLanguage = normalizedPolicy.defaultLanguage;
    } else if ('defaultLanguage' in data) {
        data.defaultLanguage = String(data.defaultLanguage || '').trim().toLowerCase() || CANONICAL_SOURCE_LANGUAGE;
    }

    if ('name' in data) {
        data.name = toLocalizedText(data.name as any, resolveProjectTextLanguage(data.name, CANONICAL_SOURCE_LANGUAGE));
    }

    if ('description' in data) {
        data.description = toLocalizedText(data.description as any, resolveProjectTextLanguage(data.description, CANONICAL_SOURCE_LANGUAGE));
    }

    if (data.menuSettings && 'specialNote' in data.menuSettings) {
        data.menuSettings.specialNote = toLocalizedText(
            data.menuSettings.specialNote as any,
            resolveProjectTextLanguage(data.menuSettings.specialNote, CANONICAL_SOURCE_LANGUAGE),
        ) as any;
    }

    if (data._specialMenu?.displayName) {
        data._specialMenu.displayName = toLocalizedText(
            data._specialMenu.displayName as any,
            resolveProjectTextLanguage(data._specialMenu.displayName, CANONICAL_SOURCE_LANGUAGE),
        ) as any;
    }

    // MOL v0 + Awareness: Fetch current state for change detection (if enabled)
    let oldProject: Project | null = null;
    if ((FEATURE_FLAGS.ENABLE_MENU_OBSERVATION || FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS || FEATURE_FLAGS.ENABLE_MCE) && data.projectId) {
        try {
            const docSnap = await getDoc(operationProjectRef);
            if (docSnap.exists()) {
                oldProject = docSnap.data() as Project;
            }
        } catch (e) {
            logProjectPersistenceFailure('project_current_state_load_failed', e, {
                ...getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId),
            });
        }
    }

    // INVARIANT: All customer-facing truth must pass through updateProject().
    // MCE validation assumes no direct Firestore writes bypass this path.
    // Direct writes bypassing the DAL are treated as a security breach.
    // @see __docs__/menu-correctness-engine/menu-correctness-engine_spec.md §19

    // MCE: Validate project data BEFORE write (client-side, < 100ms)
    // Stamps _mce verification metadata as part of the same setDoc call.
    // Zero extra Firebase operations. Silent fail — never blocks save.
    // @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md §5.1
    if (FEATURE_FLAGS.ENABLE_MCE && data.projectId) {
        try {
            const { mceValidate, toMCEMetadata } = await import("@lib/mce");
            const projectForValidation = oldProject
                ? buildProjectAfterPartialUpdate(oldProject, data)
                : (Array.isArray(data.files) ? data as Project : null);
            if (projectForValidation) {
                const result = mceValidate({
                    projectData: projectForValidation as Record<string, any>,
                    isOutlet: !!projectForValidation.masterProjectId,
                    masterProjectId: projectForValidation.masterProjectId,
                    oldProjectData: oldProject as Record<string, any> | undefined,
                });
                // Merge verification metadata into save data
                (data as any)._mce = toMCEMetadata(result);
                logMCEValidationResult(result);
            }
        } catch (e) {
            // Silent fail — MCE failure never blocks owner
            logMCEValidationFailure(e, {
                isOutlet: Boolean(oldProject?.masterProjectId),
                oldProjectPresent: Boolean(oldProject),
            });
        }
    }

    if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && data.projectId && data.masterProjectId) {
        const linkedOutletLogContext = getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId);
        const response = await fetch('/api/projects/outlet-save', {
            ...LINKED_OUTLET_SAVE_REQUEST_POLICY,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: data }),
        });
        if (!response.ok) {
            const error = createProjectPersistenceStatusError(
                "linked_outlet_save_rejected",
                response.status,
                "Linked outlet save failed. Please try again.",
            );
            logProjectPersistenceFailure("project_linked_outlet_save_rejected", error, {
                ...linkedOutletLogContext,
            });
            throw error;
        }

        const result = await readLinkedOutletSaveResponse(
            response,
            linkedOutletLogContext,
            "linked_outlet_save_response_parse_failed",
            "Linked outlet save failed. Please try again.",
        );
        if (!isLinkedOutletSaveResponse(result, data.projectId, data.masterProjectId)) {
            const error = createProjectPersistenceStatusError(
                "linked_outlet_save_response_invalid",
                response.status,
                "Linked outlet save failed. Please try again.",
            );
            logProjectPersistenceFailure("project_linked_outlet_save_response_invalid", error, {
                ...linkedOutletLogContext,
                responseOk: response.ok,
                responseStatus: response.status,
            });
            throw error;
        }

        const updateData = result.project;
        await revalidatePublicClientCacheForProject(data.projectId as string, "updateProject");
        if (data.projectId && oldProject) {
            void detectAndLogChanges(
                data.projectId,
                oldProject,
                buildProjectAfterPartialUpdate(oldProject, updateData),
                operationScope,
            );
        }

        return updateData;
    }

    const updateData = composeRequestBody(data, operationSession, { isNew: false });
    await setDoc(operationProjectRef, updateData, {
        merge: true,
    });

    // Public menu and OBP pages share Vercel Data Cache tags. Invalidate after
    // every owner-side project save, including local/dev, so refreshes do not
    // keep showing stale public content.
    if (data.projectId) {
        await revalidatePublicClientCacheForProject(data.projectId as string, "updateProject");
    }

    // Multi-Outlet: Invalidate master project cache on master save
    // This clears the client-side in-memory cache so editor previews
    // for outlet projects immediately reflect master changes.
    // Note: Server-side cache (SSR) has its own 30s TTL and cannot be
    // cleared from client — this only affects client-side resolution.
    if (
        FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
        data.projectId &&
        !oldProject?.masterProjectId // No masterProjectId = this is a master project
    ) {
        try {
            const { invalidateMasterCache } = await import("@lib/multiOutlet");
            invalidateMasterCache(data.projectId as string);
        } catch (e) {
            logProjectPersistenceFailure('project_master_cache_invalidation_failed', e, {
                ...getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId),
            });
        }
    }

    // Master Updates Awareness: Increment operationalVersion on operational changes
    // This fires ONLY when items/categories/prices change — NOT on UI config saves.
    // Outlets listen to this signal doc via onSnapshot for instant awareness.
    // @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md §8
    if (
        FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
        FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS &&
        data.projectId &&
        oldProject &&
        !oldProject.masterProjectId // This IS a master project
    ) {
        try {
            const { detectOperationalChange } = await import("@lib/multiOutlet/masterUpdateDiff");

            const hasOperationalChange = detectOperationalChange(oldProject, data);

            if (hasOperationalChange) {
                const signalDocRef = doc(
                    firebaseClient,
                    DB_COLLECTIONS.MASTER_OPERATIONAL_STATE,
                    data.projectId as string,
                );

                // Atomic increment — no read needed, handles concurrent saves safely.
                // setDoc with merge: creates doc if absent (version starts at 1).
                // increment() is a Firestore field transform — server-side atomic operation.
                const { increment } = await import("@firebase/firestore");
                await setDoc(
                    signalDocRef,
                    {
                        operationalVersion: increment(1),
                        lastUpdatedAt: Timestamp.now(),
                    },
                    { merge: true },
                );
            }
        } catch (e) {
            // Silent fail — don't block master save
            logProjectPersistenceFailure('master_update_awareness_signal_update_failed', e, {
                ...getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId),
            });
        }
    }

    // MOL v0: Detect and log changes (fire-and-forget, non-blocking)
    if (data.projectId && oldProject) {
        void detectAndLogChanges(
            data.projectId,
            oldProject,
            buildProjectAfterPartialUpdate(oldProject, updateData),
            operationScope,
        );
    }

    // T10: Log MOL event with dynamic type based on project mode
    // Determine mode from existing data (no extra Firestore reads):
    // - masterProjectId present → OUTLET (linked to master)
    // - masterProjectId absent + multi-outlet enabled → MASTER (or standalone, can't distinguish without store lookup)
    // - multi-outlet disabled → STANDALONE
    if (oldProject) {
        try {
            const { logMultiOutletEvent } =
                await import("@lib/multiOutlet/molEvents");
            // Determine event type from existing data
            let eventType: "MASTER_MENU_UPDATED" | "OUTLET_MENU_UPDATED" | "STANDALONE_MENU_UPDATED";
            let actionDescription: string;

            if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
                // Multi-outlet disabled = standalone store
                eventType = "STANDALONE_MENU_UPDATED";
                actionDescription = "standalone_content_edited";
            } else if (oldProject.masterProjectId) {
                // Has masterProjectId = this is an outlet project
                eventType = "OUTLET_MENU_UPDATED";
                actionDescription = "outlet_content_edited";
            } else {
                // No masterProjectId + multi-outlet enabled = master (or standalone in multi-tenant)
                eventType = "MASTER_MENU_UPDATED";
                actionDescription = "master_content_edited";
            }

            await logMultiOutletEvent({
                type: eventType,
                tId: operationScope.tId,
                sId: operationScope.sId,
                projectId: data.projectId as string,
                actorUserId: operationSession.uId,
                metadata: {
                    action: actionDescription,
                    mode: eventType.replace("_MENU_UPDATED", "").toLowerCase(),
                    changedFields: Object.keys(data).filter((k) => k !== "projectId"),
                },
            });
        } catch (e) {
            // Non-blocking; the persistence diagnostic keeps the optional edit log observable.
            logProjectPersistenceFailure('menu_observation_edit_log_failed', e, {
                ...getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId),
                oldProjectPresent: Boolean(oldProject),
                changedFieldCount: Object.keys(data).filter((k) => k !== "projectId").length,
            });
        }
    }

    return updateData;
};

export const updateProject = async (data: Partial<Project>) => {
    return await apiCallComposer(
        () => runUpdateProject(data),
        data,
        "updateProject",
    );
};

export const updateProjectWithoutLoader = async (data: Partial<Project>) => {
    return await apiCallComposerClientWithoutLoader(
        () => runUpdateProject(data),
        data,
        "updateProjectWithoutLoader",
    );
};

/**
 * Toggle project active status
 * Updates both projects collection and projectsSummary
 */
export const setProjectActive = async (projectId: string, active: boolean) => {
    return await apiCallComposer(
        async () => {
            if (typeof active !== 'boolean') throw new Error('Invalid project active state');
            const session = await getActiveSession();
            const scope = normalizeProjectDocumentScope({ tId: session.tId, sId: session.sId, projectId });
            if (!scope) throw new Error('Invalid project active scope');
            const projectDocRef = doc(
                firebaseClient,
                DATA_COLLECTION,
                scope.tId,
                scope.sId,
                scope.projectId,
            );
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);

            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const projectSnap = await transaction.get(projectDocRef);
                const projectData = projectSnap.exists() ? projectSnap.data() as Project : null;
                if (
                    !projectData
                    || projectData.deleted === true
                    || !projectDocumentMatchesScope(projectData, scope)
                ) {
                    throw new Error('Project active identity mismatch');
                }

                if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && active === false && projectData.masterProjectId) {
                    const { parseProjectId } = await import("@lib/multiOutlet/resolveProject");
                    const { DEFAULT_OUTLET_POLICY } = await import("@type/multiOutlet.types");
                    const { sId: masterStoreId } = parseProjectId(projectData.masterProjectId);
                    const hasMasterStoreAuthority = Number(session?.sId) === Number(masterStoreId)
                        || (Array.isArray(session?.user?.stores)
                            && session.user.stores.some((store: any) => Number(store?.storeId) === Number(masterStoreId)));
                    if (!hasMasterStoreAuthority) {
                        const masterStoreSnap = await transaction.get(
                            doc(firebaseClient, DB_COLLECTIONS.STORES, String(masterStoreId)),
                        );
                        const outletPolicy = {
                            ...DEFAULT_OUTLET_POLICY,
                            ...(masterStoreSnap.data()?.outletPolicy || {}),
                        };
                        if (outletPolicy.allowProjectDeactivate === false) {
                            throw new Error("Deactivating inherited outlet projects is not enabled for this store.");
                        }
                    }
                }

                transaction.set(projectDocRef, { active }, { merge: true });
                transaction.set(summaryDocRef, {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectFieldPayload(projectId, "active", active),
                }, { merge: true });
                return { projectId, active };
            });
            await revalidatePublicClientCacheForProject(projectId, "setProjectActive");

            return transactionResult;
        },
        { projectId, active },
        "setProjectActive",
    );
};

/**
 * Remove a time slot preset reference from all categories in all projects
 * Called when a preset is deleted from Business Settings
 */
const PROJECT_PRESET_CASCADE_PAGE_SIZE = 100;
const PROJECT_PRESET_CASCADE_CONCURRENCY = 4;

const applyPresetMutationToAllProjects = async (
    mutation: ProjectPresetReferenceMutation,
    cacheContext: string,
): Promise<ProjectPresetCascadeUpdateResult> => {
    const session = await getActiveSession();
    const scope = normalizeMenuChangeLogScope(session);
    if (!scope) throw new Error("project_preset_cascade_scope_invalid");
    const dataRef = collection(
        firebaseClient,
        DATA_COLLECTION,
        String(scope.tId),
        String(scope.sId),
    );
    const presetId = mutation.type === "remove" ? mutation.presetId : mutation.preset.id;
    let cursorId: string | undefined;
    let updatedCount = 0;

    while (true) {
        const snapshot = await getDocs(query(
            dataRef,
            orderBy(documentId()),
            ...(cursorId ? [startAfter(cursorId)] : []),
            limit(PROJECT_PRESET_CASCADE_PAGE_SIZE),
        ));
        const candidates = snapshot.docs.filter((projectDoc) => {
            const project = projectDoc.data() as Project;
            return project.deleted !== true
                && projectDocumentMatchesScope(project, { ...scope, projectId: projectDoc.id })
                && projectReferencesTimeSlotPreset(project, presetId);
        });

        const results = await mapWithConcurrency(
            candidates,
            PROJECT_PRESET_CASCADE_CONCURRENCY,
            async (projectDoc) => {
                try {
                    const changed = await runTransaction(firebaseClient, async (transaction) => {
                        const currentDoc = await transaction.get(projectDoc.ref);
                        if (!currentDoc.exists()) return false;
                        const currentProject = currentDoc.data() as Project;
                        if (
                            currentProject.deleted === true
                            || !projectDocumentMatchesScope(currentProject, { ...scope, projectId: projectDoc.id })
                        ) {
                            return false;
                        }
                        const projection = projectTimeSlotPresetReferences(currentProject, mutation);
                        if (!projection.changed) return false;
                        transaction.set(projectDoc.ref, {
                            files: projection.files,
                            modifiedOn: serverTimestamp(),
                        }, { merge: true });
                        return true;
                    });
                    if (changed) {
                        await revalidatePublicClientCacheForProject(projectDoc.id, cacheContext);
                    }
                    return { changed } as const;
                } catch (error) {
                    return { changed: false, error } as const;
                }
            },
        );
        const failedResult = results.find((result) => "error" in result);
        if (failedResult && "error" in failedResult) throw failedResult.error;
        updatedCount += results.filter((result) => result.changed).length;

        const lastDocument = snapshot.docs[snapshot.docs.length - 1];
        if (!lastDocument || snapshot.docs.length < PROJECT_PRESET_CASCADE_PAGE_SIZE) break;
        cursorId = lastDocument.id;
    }

    return { success: true, updatedProjects: updatedCount };
};

export const removePresetFromAllCategories = async (presetId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedPresetId = normalizeTimeSlotPresetId(presetId);
            if (!normalizedPresetId) throw new Error("project_preset_cascade_preset_invalid");
            return await applyPresetMutationToAllProjects(
                { type: "remove", presetId: normalizedPresetId },
                "removePresetFromAllCategories",
            );
        },
        { presetId },
        "removePresetFromAllCategories",
    );
};

export type ProjectPresetCascadeUpdateResult = {
    success: true;
    updatedProjects: number;
};

export const isProjectPresetCascadeUpdateResult = (result: unknown): result is ProjectPresetCascadeUpdateResult => (
    Boolean(result && typeof result === 'object')
    && !Array.isArray(result)
    && (result as ProjectPresetCascadeUpdateResult).success === true
    && typeof (result as ProjectPresetCascadeUpdateResult).updatedProjects === 'number'
);

export function assertProjectPresetCascadeSucceeded(
    result: unknown,
    rejectionCode = 'project_preset_cascade_update_rejected',
): asserts result is ProjectPresetCascadeUpdateResult {
    if (isProjectPresetCascadeUpdateResult(result)) return;
    throw new Error(rejectionCode);
}

/**
 * Update copied category time windows for every category referencing a preset.
 * Categories store `presetId` plus a time snapshot so public rendering stays
 * independent of an extra store read. When the owner edits the preset, this
 * bounded cascade keeps public category visibility aligned with the preset.
 */
export const updatePresetInAllCategories = async (preset: TimeSlotPreset) => {
    return await apiCallComposer(
        async () => {
            const normalizedPreset = normalizeTimeSlotPreset(preset);
            if (!normalizedPreset) throw new Error("project_preset_cascade_preset_invalid");
            return await applyPresetMutationToAllProjects(
                { type: "update", preset: normalizedPreset },
                "updatePresetInAllCategories",
            );
        },
        { presetId: preset?.id },
        "updatePresetInAllCategories",
    );
};

export const publishProject = async (data: Partial<Project>) => {
    return await apiCallComposer(
        async () => {
            const operationSession = await getActiveSession();
            const operationScope = normalizeMenuChangeLogScope(operationSession);
            if (!operationScope) {
                throw new Error('Invalid active project publish scope');
            }
            const operationProjectId = normalizeMenuChangeLogIdentifier(data.projectId, 'projectId');
            data.projectId = operationProjectId;
            const operationProjectRef = doc(
                firebaseClient,
                `${DATA_COLLECTION}/${operationScope.tId}/${operationScope.sId}`,
                operationProjectId,
            );

            // T14: Multi-outlet chain validation - ensure master exists before publish
            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && data.masterProjectId) {
                // Parse master project ID to get correct tId/sId for the master
                const { parseProjectId } =
                    await import("@lib/multiOutlet/resolveProject");
                const { tId: masterTId, sId: masterSId } = parseProjectId(
                    data.masterProjectId,
                );

                // Security: Validate master is within same tenant
                if (Number(masterTId) !== operationScope.tId) {
                    throw new Error(
                        "Publish blocked: Cross-tenant master reference is not allowed.",
                    );
                }

                // Validate master project actually exists
                const masterRef = doc(
                    firebaseClient,
                    `${DATA_COLLECTION}/${masterTId}/${masterSId}`,
                    data.masterProjectId,
                );
                const masterSnap = await getDoc(masterRef);
                if (!masterSnap.exists() || masterSnap.data()?.deleted) {
                    throw new Error(
                        "Publish blocked: Linked master project no longer exists. Please unlink or reassign master.",
                    );
                }
            }

            const updatedData = composeRequestBody(data, operationSession, { isNew: false });

            if (data.files?.length) {
                for (let i = 0; i < data.files.length; i++) {
                    if (updatedData.files[i].url.includes("base64")) {
                        updatedData.files[i].url = await uploadProjectFile(
                            { fileType: data.files[i].type, fileToUpdate: data.files[i].url },
                            "files",
                            data.projectId,
                            data.files[i].name,
                        );
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // CANONICAL TRUTH: Version increment on publish
            // Monotonic — versions only move forward, never mutated
            // Uses Firestore increment() for atomic, conflict-safe versioning
            // @see __docs__/canonical-truth-infrastructure/
            // ═══════════════════════════════════════════════════════════════
            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && data.masterProjectId) {
                const linkedOutletPublishLogContext = getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId);
                const response = await fetch('/api/projects/outlet-save', {
                    ...LINKED_OUTLET_SAVE_REQUEST_POLICY,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project: {
                            ...updatedData,
                            projectId: data.projectId,
                            masterProjectId: data.masterProjectId,
                        },
                        publish: true,
                    }),
                });
                if (!response.ok) {
                    const error = createProjectPersistenceStatusError(
                        "linked_outlet_publish_rejected",
                        response.status,
                        "Linked outlet publish failed. Please try again.",
                    );
                    logProjectPersistenceFailure("project_linked_outlet_publish_rejected", error, {
                        ...linkedOutletPublishLogContext,
                    });
                    throw error;
                }

                const result = await readLinkedOutletSaveResponse(
                    response,
                    linkedOutletPublishLogContext,
                    "linked_outlet_publish_response_parse_failed",
                    "Linked outlet publish failed. Please try again.",
                );
                if (!isLinkedOutletSaveResponse(result, data.projectId, data.masterProjectId)) {
                    const error = createProjectPersistenceStatusError(
                        "linked_outlet_publish_response_invalid",
                        response.status,
                        "Linked outlet publish failed. Please try again.",
                    );
                    logProjectPersistenceFailure("project_linked_outlet_publish_response_invalid", error, {
                        ...linkedOutletPublishLogContext,
                        responseOk: response.ok,
                        responseStatus: response.status,
                    });
                    throw error;
                }

                await revalidatePublicClientCacheForProject(data.projectId, "publishProject");
                await recordPublishedMenuTruth(
                    operationProjectId,
                    result.project,
                    operationScope,
                );
                return result.project;
            }

            const { increment } = await import("@firebase/firestore");
            const publishedAt = Timestamp.now();
            const persistedPublishData = {
                ...updatedData,
                menuVersion: increment(1),
                lastPublishedAt: publishedAt,
            };

            await setDoc(operationProjectRef, persistedPublishData, {
                merge: true,
            });
            await revalidatePublicClientCacheForProject(data.projectId, "publishProject");

            await recordPublishedMenuTruth(
                operationProjectId,
                updatedData,
                operationScope,
            );

            return {
                ...updatedData,
                lastPublishedAt: publishedAt,
                ...(typeof data.menuVersion === "number" && Number.isSafeInteger(data.menuVersion)
                    ? { menuVersion: data.menuVersion + 1 }
                    : {}),
            };
        },
        data,
        "publishProject",
    );
};

/**
 * Get projects list using Summary Document Pattern (1 read)
 * Returns projects from platformSummary/projects_{sId}
 */
const getProjectsListCore = async (includeInactive = false) => {
    const session = await getActiveSession();
    const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${session.sId}`);
    const summaryDoc = await getDoc(summaryDocRef);
    const projectsMap = summaryDoc.exists()
        ? filterProjectsSummaryMapForScope(
            extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
            session,
        )
        : {};

    const projects = Object.entries(projectsMap)
        .map(([projectId, data]) => normalizeProjectReadState({
            projectId,
            ...(data as ProjectSummaryData),
        }))
        .filter((p) => includeInactive || p.active !== false);

    if (projects.length === 0) {
        const projectId = `${session.tId}-default-${session.sId}`;
        const defaultProject: ProjectMetadata = {
            projectId,
            name: "Menu",
            description: "Your digital menu",
            isDefault: true,
        };
        const defaultProjectResult = await addProject(defaultProject);
        assertProjectUpdateSucceeded(
            defaultProjectResult,
            projectId,
            'projects_list_default_project_create_rejected',
        );
        return {
            projects: [
                {
                    projectId,
                    name: defaultProject.name,
                    description: defaultProject.description,
                    active: true,
                    isDefault: true,
                },
            ],
        };
    }

    return { projects };
};

/**
 * Read existing projects from the summary document without creating a default menu.
 *
 * Export/print/share surfaces should use this helper when an empty state is valid.
 * The legacy project-list helper creates a default project when none exist, which is
 * correct for editor/onboarding flows but would add write cost to read-only routes.
 */
const getExistingProjectsListCore = async (includeInactive = false) => {
    const session = await getActiveSession();
    const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${session.sId}`);
    const summaryDoc = await getDoc(summaryDocRef);
    const projectsMap = summaryDoc.exists()
        ? filterProjectsSummaryMapForScope(
            extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
            session,
        )
        : {};

    const projects = Object.entries(projectsMap)
        .map(([projectId, data]) => normalizeProjectReadState({
            projectId,
            ...(data as ProjectSummaryData),
        }))
        .filter((p) => includeInactive || p.active !== false);

    return { projects };
};

export const getProjectsList = async (includeInactive = false) => {
    return await apiCallComposer(
        async () => {
            return await getProjectsListCore(includeInactive);
        },
        { includeInactive },
        "getProjectsList",
    );
};

export const getProjectsListWithoutLoader = async (includeInactive = false) => {
    return await apiCallComposerClientWithoutLoader(
        async () => await getProjectsListCore(includeInactive),
        { includeInactive },
        "getProjectsListWithoutLoader",
    );
};

export const getExistingProjectsListWithoutLoader = async (includeInactive = false) => {
    return await apiCallComposerClientWithoutLoader(
        async () => await getExistingProjectsListCore(includeInactive),
        { includeInactive },
        "getExistingProjectsListWithoutLoader",
    );
};

// Legacy alias for backward compatibility
export const getMetadataProjectsList = getProjectsList;

/**
 * Get deleted projects from projects collection
 * Note: Deleted projects are soft-deleted in the projects collection
 */
export const getDeletedProjectsList = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error('Invalid deleted project list scope');
            const dataRef = collection(
                firebaseClient,
                DATA_COLLECTION,
                String(scope.tId),
                String(scope.sId),
            );
            const projectsQuery = query(
                dataRef,
                where("deleted", "==", true),
                limit(50),
            );
            const snapshot = await getDocs(projectsQuery);

            const projects = snapshot.docs.flatMap((projectDoc) => {
                const data = projectDoc.data();
                const projectScope = { ...scope, projectId: projectDoc.id };
                if (!projectDocumentMatchesScope(data, projectScope)) return [];
                return [{
                    projectId: projectDoc.id,
                    name: getLocalizedText(data.name, undefined, getPrimaryLocalizedLanguage(data.name), "Untitled"),
                    deleted: true,
                    deletedAt: data.deletedAt,
                }];
            });

            return { projects };
        },
        null,
        "getDeletedProjectsList",
    );
};

const getProjectDataCore = async (projectId: string): Promise<Project> => {
    const session = await getActiveSession();
    const scope = normalizeProjectDocumentScope({
        tId: session.tId,
        sId: session.sId,
        projectId,
    });
    if (!scope) throw new Error('Invalid project read scope');
    const docRef = doc(
        firebaseClient,
        DATA_COLLECTION,
        scope.tId,
        scope.sId,
        scope.projectId,
    );
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const projectData = docSnap.data();
        if (!projectDocumentMatchesScope(projectData, scope)) {
            throw new Error('Project read identity mismatch');
        }
        return normalizeProjectReadState({ ...projectData, projectId: scope.projectId } as Project) as Project;
    }

    const legacyDocRef = doc(firebaseClient, DATA_COLLECTION, scope.projectId);
    const legacyDocSnap = await getDoc(legacyDocRef);
    if (legacyDocSnap.exists()) {
        const legacyProjectData = legacyDocSnap.data();
        if (!projectDocumentMatchesScope(legacyProjectData, scope)) {
            throw new Error('Legacy project read identity mismatch');
        }
        return normalizeProjectReadState({ ...legacyProjectData, projectId: scope.projectId } as Project) as Project;
    }

    throw new Error("Project not found");
};

export const getProjectData = async (projectId: string): Promise<Project> => {
    return await apiCallComposer(
        async () => {
            return await getProjectDataCore(projectId);
        },
        { projectId },
        "getProjectData",
    );
};

export const getProjectDataWithoutLoader = async (projectId: string): Promise<Project> => {
    return await apiCallComposerClientWithoutLoader(
        async () => await getProjectDataCore(projectId),
        { projectId },
        "getProjectDataWithoutLoader",
    );
};

/**
 * Get project data from a specific store (not current session's store)
 *
 * MULTI-STORE FEATURE: Used by resolveProjectForRender to fetch master project
 * from the master store when rendering a linked store's menu.
 *
 * This is the "2-read architecture" - store project + master project = 2 reads
 *
 * @param tId - Tenant ID (extracted from masterProjectId)
 * @param sId - Store ID (extracted from masterProjectId)
 * @param projectId - Full project ID
 */
export const getProjectDataByStore = async (
    tId: number,
    sId: number,
    projectId: string,
): Promise<Project> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeProjectDocumentScope({ tId, sId, projectId });
            if (!scope || String(session.tId) !== scope.tId) {
                throw new Error('Invalid cross-store project read scope');
            }
            const docRef = doc(
                firebaseClient,
                `${DATA_COLLECTION}/${scope.tId}/${scope.sId}`,
                scope.projectId,
            );
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const projectData = docSnap.data();
                if (!projectDocumentMatchesScope(projectData, scope)) {
                    throw new Error('Cross-store project read identity mismatch');
                }
                return normalizeProjectReadState({ ...projectData, projectId: scope.projectId } as Project) as Project;
            }

            const legacyDocRef = doc(firebaseClient, DATA_COLLECTION, scope.projectId);
            const legacyDocSnap = await getDoc(legacyDocRef);
            if (legacyDocSnap.exists()) {
                const legacyProjectData = legacyDocSnap.data();
                if (!projectDocumentMatchesScope(legacyProjectData, scope)) {
                    throw new Error('Legacy cross-store project read identity mismatch');
                }
                return normalizeProjectReadState({ ...legacyProjectData, projectId: scope.projectId } as Project) as Project;
            }

            throw new Error(`Project not found: ${scope.projectId} in store ${scope.sId}`);
        },
        { tId, sId, projectId },
        "getProjectDataByStore",
    );
};

/**
 * Get full project with summary data
 * Combines projectsSummary (metadata) with projects collection (full data)
 */
export const getProject = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeProjectDocumentScope({ tId: session.tId, sId: session.sId, projectId });
            if (!scope) throw new Error('Invalid combined project read scope');
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
            const projectDocRef = doc(
                firebaseClient,
                DATA_COLLECTION,
                scope.tId,
                scope.sId,
                scope.projectId,
            );
            const [summaryDoc, projectDoc] = await Promise.all([
                getDoc(summaryDocRef),
                getDoc(projectDocRef),
            ]);

            if (!projectDoc.exists()) {
                return null;
            }

            const projectData = projectDoc.data();
            if (!projectDocumentMatchesScope(projectData, scope)) {
                throw new Error('Combined project read identity mismatch');
            }
            const summaryData: Partial<ProjectSummaryData> = summaryDoc.exists()
                ? filterProjectsSummaryMapForScope(
                    extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
                    scope,
                )[projectId] || {}
                : {};

            return {
                projectId,
                ...normalizeProjectReadState(summaryData as any),
                projectData: normalizeProjectReadState({ ...projectData, projectId } as any),
            };
        },
        projectId,
        "getProject",
    );
};

export const uploadFile = async (
    data: UserUploadedFileType,
    from: string = "files",
) => {
    let fileUrl: any = "";
    const docId = `${new Date().getTime()}-${data.uid}`;
    const mediaProfileByFolder: Partial<Record<string, MediaImageType>> = {
        assets: 'menuBackground',
        itemImages: 'menuItem',
        'project-images': 'projectImage',
    };
    const mediaProfile = (data.mediaProfile as MediaImageType | undefined) || mediaProfileByFolder[from];

    if (data.blob || (mediaProfile && isDataUrl(data.url))) {
        const session = await getActiveSession();
        const preparedMedia = data.preparedMedia || (mediaProfile && isDataUrl(data.url)
            ? await prepareMediaImage(data.url, mediaProfile, { fileName: data.name || data.uid })
            : undefined);

        return uploadPreparedMediaImage({
            blob: data.blob || preparedMedia?.blob,
            contentType: preparedMedia?.mimeType || data.type,
            dataUrl: data.url,
            entityId: data.mediaEntityId || data.uid || docId,
            mediaChecksum: preparedMedia?.checksum || data.mediaChecksum,
            mediaId: preparedMedia?.mediaId || data.mediaId,
            prepared: preparedMedia,
            profile: mediaProfile || 'menuItem',
            storeId: session.sId,
            tenantId: session.tId,
            variant: data.mediaVariant as MediaImageVariantId | undefined,
        });
    }

    if (data.url) {
        if (data.url.includes("base64")) {
            const session = await getActiveSession();
            //upload logo image to firebase storage
            fileUrl = await uploadBase64ToStorage({
                fileId: docId,
                url: data.url,
                path: generateStoragePath({
                    collection: DATA_COLLECTION,
                    fileType: from,
                    session,
                    fileId: docId,
                }),
                type: data.type,
            });
        }
        return fileUrl;
    } else return "";
};

/**
 * Delete a project (soft delete)
 * 
 * @param projectId - Project ID to delete
 * @param options - Optional configuration
 * @param options.skipLinkedOutletCheck - Set to true if caller already verified
 *        no linked outlets using canHaveLinkedOutlets(tenantDetails).
 *        This avoids expensive Firestore query when tenant context is available.
 * 
 * @example
 * ```typescript
 * // UI component with tenant context
 * const { tenantDetails } = useContext(PlatformGlobalDataContext);
 * 
 * // Early-exit optimization: skip expensive query if no multi-chain setup
 * const skipCheck = !canHaveLinkedOutlets(tenantDetails);
 * await deleteProject(projectId, { skipLinkedOutletCheck: skipCheck });
 * ```
 */
export const deleteProject = async (
    projectId: string,
    options?: { skipLinkedOutletCheck?: boolean }
) => {
    const result = await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeProjectDocumentScope({ tId: session.tId, sId: session.sId, projectId });
            if (!scope) throw new Error('Invalid project deletion scope');
            const dataDocRef = doc(
                firebaseClient,
                DATA_COLLECTION,
                scope.tId,
                scope.sId,
                scope.projectId,
            );
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);

            // Multi-Outlet Protection: Block deletion of inherited projects (Feature #4C)
            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
                const projSnap = await getDoc(dataDocRef);
                if (!projSnap.exists() || !projectDocumentMatchesScope(projSnap.data(), scope)) {
                    throw new Error('Project deletion identity mismatch');
                }
                if (projSnap.data()?.masterProjectId) {
                    throw new Error(
                        "Cannot delete an inherited outlet project. " +
                        "Use 'Deactivate' to hide it, or contact HQ to remove the master project.",
                    );
                }

                // Block deletion of master projects with linked outlets
                if (!options?.skipLinkedOutletCheck) {
                    const { hasLinkedOutlets } = await import("@database/multiOutlet");
                    const hasOutlets = await hasLinkedOutlets(projectId);
                    if (hasOutlets) {
                        throw new Error(
                            "Cannot delete this project: It is linked as a master to one or more outlet menus. " +
                            "Please unlink or reassign all outlets before deleting.",
                        );
                    }
                }
            }

            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const projectDoc = await transaction.get(dataDocRef);
                const summaryDoc = await transaction.get(summaryDocRef);
                if (!projectDoc.exists() || !projectDocumentMatchesScope(projectDoc.data(), scope)) {
                    throw new Error('Project deletion identity mismatch');
                }
                if (projectDoc.data().deleted === true) throw new Error('Project is already deleted');

                const summaryProjects = summaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
                        scope,
                    )
                    : {};
                if (FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING) {
                    for (const [smId, smData] of Object.entries(summaryProjects) as [string, any][]) {
                        if (
                            smData.isSpecialMenu
                            && smData.specialMenuBaseProjectId === projectId
                            && smData.specialMenuStatus !== "expired"
                            && smData.specialMenuStatus !== "cancelled"
                        ) {
                            throw new Error(
                                `Cannot delete this project: It is referenced by special menu "${getLocalizedText(
                                    smData.specialMenuDisplayName,
                                    undefined,
                                    resolveProjectTextLanguage(smData.specialMenuDisplayName, 'en'),
                                    smId,
                                )}". Cancel or wait for the special menu to expire first.`,
                            );
                        }
                    }
                }

                const currentSummary = summaryProjects[projectId];
                const fallbackDefaultEntry = currentSummary?.isDefault === true
                    ? Object.entries(summaryProjects).find(([candidateProjectId, candidateSummary]) => (
                        candidateProjectId !== projectId
                        && candidateSummary?.isSpecialMenu !== true
                        && candidateSummary?.active !== false
                    )) || Object.entries(summaryProjects).find(([candidateProjectId, candidateSummary]) => (
                        candidateProjectId !== projectId
                        && candidateSummary?.isSpecialMenu !== true
                    )) || null
                    : null;
                const deletedSummary = currentSummary
                    ? stripUndefinedProjectSummaryFields(currentSummary)
                    : {};
                const updateData = {
                    deleted: true,
                    deletedAt: Timestamp.now(),
                    active: false,
                    ...(Object.keys(deletedSummary).length ? { deletedSummary } : {}),
                };
                const summaryUpdate: Record<string, any> = {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectDeletePayload(projectId, deleteField()),
                };
                if (fallbackDefaultEntry) {
                    const [fallbackProjectId, fallbackSummary] = fallbackDefaultEntry;
                    const fallbackDefaultSummary = stripUndefinedProjectSummaryFields({
                        ...fallbackSummary,
                        isDefault: true,
                        active: fallbackSummary.active ?? true,
                        name: fallbackSummary.name || 'Untitled',
                    }) as ProjectSummaryData;
                    Object.assign(summaryUpdate, buildSummaryProjectPayload(fallbackProjectId, fallbackDefaultSummary));
                }

                transaction.set(dataDocRef, updateData, { merge: true });
                transaction.set(summaryDocRef, summaryUpdate, { merge: true });
                return {
                    fallbackProjectId: fallbackDefaultEntry?.[0],
                    updateData,
                };
            });

            await revalidateProjectSummaryMutation(
                projectId,
                transactionResult.fallbackProjectId ? [transactionResult.fallbackProjectId] : [],
                { cacheContext: 'deleteProject' },
            );
            const { updateData } = transactionResult;

            // Security Audit: Log project deletion
            logger.security('Project Deleted', {
                projectId,
                action: 'DELETE_PROJECT',
                deletedAt: updateData.deletedAt.toDate().toISOString(),
            }, 'medium');

            return { projectId, ...updateData };
        },
        projectId,
        "deleteProject",
    );

    assertProjectDeleteSucceeded(result, projectId);
    return result;
};

export const restoreProject = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            const operationSession = await getActiveSession();
            const operationScope = normalizeMenuChangeLogScope(operationSession);
            const projectScope = normalizeMultiOutletProjectId(projectId);
            if (
                !operationScope
                || !projectScope
                || projectScope.tId !== operationScope.tId
                || projectScope.sId !== operationScope.sId
            ) {
                throw new Error('Invalid project restoration scope');
            }
            const projectDocRef = doc(
                firebaseClient,
                DATA_COLLECTION,
                String(operationScope.tId),
                String(operationScope.sId),
                projectId,
            );
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${operationScope.sId}`);
            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const projectDoc = await transaction.get(projectDocRef);
                const summaryDoc = await transaction.get(summaryDocRef);
                if (!projectDoc.exists()) throw new Error("Project not found");

                const projectData = projectDoc.data();
                if (
                    (projectData.projectId !== undefined && projectData.projectId !== projectId)
                    || (projectData.tId !== undefined && String(projectData.tId) !== String(operationScope.tId))
                    || (projectData.sId !== undefined && String(projectData.sId) !== String(operationScope.sId))
                ) {
                    throw new Error('Project restoration identity mismatch');
                }
                const summaryProjects = summaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
                        operationScope,
                    )
                    : {};
                const deletedSummary = (
                    projectData.deletedSummary
                    && typeof projectData.deletedSummary === 'object'
                    && !Array.isArray(projectData.deletedSummary)
                ) ? projectData.deletedSummary as Partial<ProjectSummaryData> : {};
                const restoreSource: Partial<ProjectSummaryData> = Object.keys(deletedSummary).length
                    ? deletedSummary
                    : projectData as Partial<ProjectSummaryData>;
                const hasCurrentDefaultProject = Object.entries(summaryProjects).some(
                    ([candidateProjectId, candidateSummary]) => (
                        candidateProjectId !== projectId
                        && candidateSummary?.isDefault === true
                        && candidateSummary?.active !== false
                        && candidateSummary?.isSpecialMenu !== true
                    ),
                );
                const restoredSummary = stripUndefinedProjectSummaryFields({
                    ...restoreSource,
                    name: restoreSource.name || projectData.name || "Restored Project",
                    active: true,
                    isDefault: restoreSource.isDefault === true && !hasCurrentDefaultProject,
                }) as ProjectSummaryData;
                const summaryMutation = buildProjectSummaryMutation(projectId, restoredSummary, {
                    cacheContext: 'restoreProject',
                });

                transaction.set(projectDocRef, {
                    deleted: false,
                    deletedAt: null,
                    active: true,
                    deletedSummary: deleteField(),
                }, { merge: true });
                transaction.set(summaryDocRef, summaryMutation.payload, { merge: true });
                return { restoredSummary };
            });
            const { restoredSummary } = transactionResult;
            await revalidateProjectSummaryMutation(projectId, [], { cacheContext: 'restoreProject' });

            // Security Audit: Log project restoration
            logger.security('Project Restored', {
                projectId,
                action: 'RESTORE_PROJECT',
            }, 'low');

            return {
                projectId,
                active: true,
                deleted: false,
                deletedAt: null,
                summaryData: restoredSummary,
            };
        },
        projectId,
        "restoreProject",
    );
};

export const duplicateProject = async (
    projectId: string,
    newName: string,
    newDescription?: string,
    localizedNameInput?: Record<string, string>,
    localizedDescriptionInput?: Record<string, string>,
) => {
    return await apiCallComposer(
        async () => {
            const sess = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(sess);
            const sourceProjectScope = normalizeMultiOutletProjectId(projectId);
            if (
                !scope
                || !sourceProjectScope
                || sourceProjectScope.tId !== scope.tId
                || sourceProjectScope.sId !== scope.sId
            ) {
                throw new Error('Invalid project duplication scope');
            }
            const projectCollectionRef = collection(
                firebaseClient,
                DATA_COLLECTION,
                String(scope.tId),
                String(scope.sId),
            );
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
            const timestamp = Date.now().toString(36);
            const entropy = doc(projectCollectionRef).id;
            const newProjectId = `${scope.tId}-${timestamp}-${entropy}-${scope.sId}`;
            const requestedLocalizedName = localizedNameInput
                || updateLocalizedText(undefined, newName, 'en', 'en');
            let projectSlug = slugify(resolveProjectSummaryName(requestedLocalizedName, newName || 'untitled'));
            if (isReservedProjectSlug(projectSlug)) {
                projectSlug = `${projectSlug}-menu`;
            }
            if (await isSlugReservedByRecentlyDeleted(projectSlug, undefined, projectCollectionRef)) {
                projectSlug = `${projectSlug}-${newProjectId.slice(-12).toLowerCase()}`;
            }
            const sourceProjectDocRef = doc(projectCollectionRef, projectId);
            const newProjectDocRef = doc(projectCollectionRef, newProjectId);
            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const sourceProjectDoc = await transaction.get(sourceProjectDocRef);
                const summaryDoc = await transaction.get(summaryDocRef);
                if (!sourceProjectDoc.exists()) throw new Error("Project not found");

                const originalData = sourceProjectDoc.data() as Project;
                if (
                    (originalData.projectId !== undefined && originalData.projectId !== projectId)
                    || ((originalData as PersistedProject).tId !== undefined
                        && String((originalData as PersistedProject).tId) !== String(scope.tId))
                    || ((originalData as PersistedProject).sId !== undefined
                        && String((originalData as PersistedProject).sId) !== String(scope.sId))
                    || originalData.deleted === true
                ) {
                    throw new Error('Project duplication identity mismatch');
                }
                if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && originalData.masterProjectId) {
                    throw new Error("Inherited outlet projects cannot be duplicated. Create a local menu instead.");
                }

                const summaryMap = summaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
                        scope,
                    )
                    : {};
                const originalSummary: Partial<ProjectSummaryData> = summaryMap[projectId] || {};
                const textLanguage = resolveProjectTextLanguage(originalSummary.name, 'en');
                const localizedName = localizedNameInput
                    || updateLocalizedText(undefined, newName, textLanguage, 'en');
                const localizedDescription = localizedDescriptionInput || (newDescription
                    ? updateLocalizedText(undefined, newDescription, textLanguage, 'en')
                    : updateLocalizedText(
                        undefined,
                        `Copy of ${resolveProjectSummaryName(originalSummary?.name, "project")}`,
                        textLanguage,
                        'en',
                    ));
                const availableSlug = resolveAvailableProjectSlug(
                    summaryMap,
                    projectSlug,
                    newProjectId,
                );
                const duplicateSource = { ...originalData };
                delete duplicateSource._specialMenu;
                delete duplicateSource.deletedSummary;
                delete duplicateSource.deletedAt;
                const newProjectData = composeRequestBody({
                    ...duplicateSource,
                    projectId: newProjectId,
                    name: localizedName,
                    description: localizedDescription,
                    active: true,
                    deleted: false,
                    isDefault: false,
                    previousSlugs: [],
                    slug: availableSlug,
                    ...normalizeProjectLanguagePolicy({
                        languages: originalData.languages || [],
                        defaultLanguage: originalData.defaultLanguage,
                    }),
                }, sess, { isNew: true });
                const summaryData: ProjectSummaryData = {
                    name: localizedName || { [CANONICAL_SOURCE_LANGUAGE]: newName.trim() || 'Untitled' },
                    description: localizedDescription,
                    projectImage: originalSummary.projectImage ?? null,
                    active: true,
                    isDefault: false,
                    slug: availableSlug,
                };
                const summaryMutation = buildProjectSummaryMutation(newProjectId, summaryData, {
                    cacheContext: 'duplicateProject',
                });
                transaction.set(newProjectDocRef, newProjectData, { merge: false });
                transaction.set(summaryDocRef, summaryMutation.payload, { merge: true });
                return { newProjectData, summaryData };
            });
            const { newProjectData, summaryData } = transactionResult;
            await revalidateProjectSummaryMutation(newProjectId, [], { cacheContext: 'duplicateProject' });

            // Propagation hook (Feature #4C): Auto-create outlet projects for duplicated master project
            if (FEATURE_FLAGS.ENABLE_PROJECT_PROPAGATION) {
                try {
                    const { propagateNewProjectToOutlets } = await import(
                        "@database/multiOutlet/propagation"
                    );
                    await propagateNewProjectToOutlets(
                        sess.tId,
                        sess.sId,
                        newProjectId,
                        resolveProjectSummaryName(summaryData.name, 'Untitled'),
                    );
                } catch (e) {
                    logProjectPersistenceFailure('project_outlet_propagation_duplicate_failed', e, {
                        ...getProjectPersistenceProjectLogContext(newProjectId),
                    });
                }
            }

            return {
                projectId: newProjectId,
                projectData: newProjectData,
                summaryData,
            };
        },
        { localizedDescriptionInput, localizedNameInput, newDescription, newName, projectId },
        "duplicateProject",
    );
};

// ═══════════════════════════════════════════════════════════════
// SPECIAL MENU SWITCHING — Client-Side DAL Functions
// Uses same patterns as duplicateProject, updateProjectMetadata, etc.
// @see __docs__/special-menu-switching/special-menu-switching_impl.md
// ═══════════════════════════════════════════════════════════════

const parseSpecialMenuDateRange = (startsAt: string, endsAt: string) => {
    if (
        typeof startsAt !== "string"
        || typeof endsAt !== "string"
        || startsAt.length > 64
        || endsAt.length > 64
    ) {
        throw new Error("Special menu dates are invalid");
    }
    const startTime = Date.parse(startsAt);
    const endTime = Date.parse(endsAt);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
        throw new Error("Special menu dates are invalid");
    }
    if (endTime <= startTime) {
        throw new Error("End date must be after start date");
    }
    return { startTime, endTime };
};

const normalizeSpecialMenuLocalizedInput = (
    value: unknown,
    maxLength: number,
): string | Record<string, string> | undefined => {
    const normalized = normalizeProjectSummaryLocalizedText(value);
    if (normalized === undefined) return undefined;
    const values = typeof normalized === "string" ? [normalized] : Object.values(normalized);
    if (values.some((entry) => !entry.trim() || entry.length > maxLength)) {
        throw new Error("Special menu text is invalid");
    }
    return normalized;
};

const assertNoSpecialMenuScheduleConflict = (
    summaryProjects: Record<string, ProjectSummaryData>,
    startsAt: number,
    endsAt: number,
    excludedProjectId?: string,
) => {
    for (const [otherProjectId, project] of Object.entries(summaryProjects)) {
        if (otherProjectId === excludedProjectId || project.isSpecialMenu !== true) continue;
        if (project.specialMenuStatus === "expired" || project.specialMenuStatus === "cancelled") continue;

        const existingStart = Date.parse(project.specialMenuStartsAt || "");
        const existingEnd = Date.parse(project.specialMenuEndsAt || "");
        if (!Number.isFinite(existingStart) || !Number.isFinite(existingEnd) || existingEnd <= existingStart) {
            throw new Error("An existing special menu has an invalid schedule. Review it before adding another.");
        }
        if (startsAt < existingEnd && endsAt > existingStart) {
            throw new Error(
                `Schedule conflicts with "${getLocalizedText(
                    project.specialMenuDisplayName || project.name,
                    undefined,
                    resolveProjectTextLanguage(project.specialMenuDisplayName || project.name),
                    "Untitled",
                )}" (${project.specialMenuStartsAt} — ${project.specialMenuEndsAt})`,
            );
        }
    }
};

const assertSpecialMenuProjectScope = (
    projectId: string,
    tId: number,
    sId: number,
) => {
    const projectScope = normalizeMultiOutletProjectId(projectId);
    if (!projectScope || projectScope.tId !== tId || projectScope.sId !== sId) {
        throw new Error("special_menu_scope_invalid");
    }
    return projectScope;
};

/**
 * Get all special menus for current store from projectsSummary.
 * Zero extra reads — reads from the same summary doc used by project listing.
 */
export const getSpecialMenus = async (): Promise<{
    specialMenus: Array<{
        projectId: string;
        displayName: string;
        description?: string;
        status: 'scheduled' | 'active' | 'expired' | 'cancelled';
        mode: 'replace' | 'overlay';
        startsAt: string;
        endsAt: string;
        baseProjectId?: string;
    }>;
    activeMenuId: string | null;
}> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error("special_menu_scope_invalid");
            const summaryRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
            const storeRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(scope.sId));
            const [summaryDoc, storeDoc] = await Promise.all([
                getDoc(summaryRef),
                getDoc(storeRef),
            ]);
            const projects = summaryDoc.exists()
                ? filterProjectsSummaryMapForScope(
                    extractProjectsSummaryMap(summaryDoc.data()),
                    scope,
                )
                : {};

            const specialMenus = Object.entries(projects)
                .flatMap(([projectId, data]) => {
                    if (data.isSpecialMenu !== true) return [];
                    const projectScope = normalizeMultiOutletProjectId(projectId);
                    const startTime = Date.parse(data.specialMenuStartsAt || "");
                    const endTime = Date.parse(data.specialMenuEndsAt || "");
                    if (
                        !projectScope
                        || projectScope.tId !== scope.tId
                        || projectScope.sId !== scope.sId
                        || !data.specialMenuStatus
                        || !data.specialMenuMode
                        || !Number.isFinite(startTime)
                        || !Number.isFinite(endTime)
                        || endTime <= startTime
                    ) {
                        logProjectPersistenceFailure(
                            "special_menu_summary_contract_invalid",
                            new Error("Special menu summary entry is malformed"),
                            getProjectPersistenceProjectLogContext(projectId),
                        );
                        return [];
                    }
                    return [{
                        projectId,
                        displayName: getLocalizedText(
                            data.specialMenuDisplayName || data.name,
                            undefined,
                            resolveProjectTextLanguage(data.specialMenuDisplayName || data.name),
                            "Untitled",
                        ),
                        description: getLocalizedText(
                            data.description,
                            undefined,
                            resolveProjectTextLanguage(data.description),
                            "",
                        ) || undefined,
                        status: data.specialMenuStatus,
                        mode: data.specialMenuMode,
                        startsAt: data.specialMenuStartsAt!,
                        endsAt: data.specialMenuEndsAt!,
                        baseProjectId: data.specialMenuBaseProjectId,
                    }];
                })
                .sort((a, b) => {
                    const order: Record<string, number> = { active: 0, scheduled: 1, expired: 2, cancelled: 3 };
                    const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
                    if (diff !== 0) return diff;
                    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
                });

            const rawActiveMenuId = storeDoc.exists() ? storeDoc.data()?.activeSpecialMenuId : null;
            const activeMenuScope = normalizeMultiOutletProjectId(rawActiveMenuId);
            const activeMenuId = activeMenuScope
                && activeMenuScope.tId === scope.tId
                && activeMenuScope.sId === scope.sId
                ? activeMenuScope.projectId
                : null;

            return { specialMenus, activeMenuId };
        },
        null,
        "getSpecialMenus",
    );
};

/**
 * Create a special menu project by duplicating a base project
 * and attaching _specialMenu scheduling metadata.
 *
 * Follows same pattern as duplicateProject():
 * 1. Read base project
 * 2. Check schedule conflicts
 * 3. Clone with metadata
 * 4. Sync to summary
 * 5. If startsAt is now or past, activate immediately
 */
export const createSpecialMenuProject = async (params: {
    allowOverlap?: boolean;
    baseProjectId: string;
    displayName: string;
    localizedDisplayName?: Record<string, string>;
    mode: SpecialMenuMode;
    startsAt: string;
    endsAt: string;
}) => {
    return await apiCallComposer(
        async () => {
            const { allowOverlap, baseProjectId, displayName, localizedDisplayName, mode, startsAt, endsAt } = params;
            const trimmedName = typeof displayName === "string" ? displayName.trim() : "";
            if (!trimmedName || trimmedName.length > 100) throw new Error("Special menu name is required");
            if (mode !== "replace" && mode !== "overlay") throw new Error("Special menu mode is invalid");
            const normalizedLocalizedDisplayName = normalizeSpecialMenuLocalizedInput(localizedDisplayName, 100);
            const { startTime, endTime } = parseSpecialMenuDateRange(startsAt, endsAt);
            const now = new Date();
            if (endTime <= now.getTime()) {
                throw new Error("End date must be in the future");
            }
            const sess = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(sess);
            if (!scope) throw new Error("special_menu_scope_invalid");
            assertSpecialMenuProjectScope(baseProjectId, scope.tId, scope.sId);

            const timestamp = Date.now().toString(36);
            const entropy = doc(collection(
                firebaseClient,
                DATA_COLLECTION,
                String(scope.tId),
                String(scope.sId),
            )).id;
            const newProjectId = `${scope.tId}-${timestamp}-${entropy}-${scope.sId}`;
            assertSpecialMenuProjectScope(newProjectId, scope.tId, scope.sId);

            const baseRef = doc(firebaseClient, DATA_COLLECTION, String(scope.tId), String(scope.sId), baseProjectId);
            const projectRef = doc(firebaseClient, DATA_COLLECTION, String(scope.tId), String(scope.sId), newProjectId);
            const summaryRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
            const storeRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(scope.sId));
            const activateImmediately = startTime <= now.getTime();

            const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
                const baseDoc = await transaction.get(baseRef);
                const summaryDoc = await transaction.get(summaryRef);
                const storeDoc = activateImmediately ? await transaction.get(storeRef) : null;
                if (!baseDoc.exists()) throw new Error("Base project not found");

                const baseData = baseDoc.data() as PersistedProject;
                if (
                    (baseData.projectId !== undefined && baseData.projectId !== baseProjectId)
                    || (baseData.tId !== undefined && String(baseData.tId) !== String(scope.tId))
                    || (baseData.sId !== undefined && String(baseData.sId) !== String(scope.sId))
                    || baseData.deleted === true
                    || baseData.active === false
                    || baseData._specialMenu !== undefined
                ) {
                    throw new Error("Base project cannot be used for a special menu");
                }

                const summaryProjects = summaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(summaryDoc.data()),
                        scope,
                    )
                    : {};
                if (!allowOverlap) {
                    assertNoSpecialMenuScheduleConflict(summaryProjects, startTime, endTime);
                }

                const activeMenuId = storeDoc?.exists() && typeof storeDoc.data().activeSpecialMenuId === "string"
                    ? storeDoc.data().activeSpecialMenuId
                    : null;
                if (activateImmediately && activeMenuId) {
                    throw new Error("Another special menu is currently active. Deactivate it first.");
                }

                const baseLanguages = normalizeProjectLanguages(baseData.languages || []);
                const baseDefaultLanguage = normalizeProjectLanguagePolicy({
                    languages: baseLanguages,
                    defaultLanguage: baseData.defaultLanguage,
                }).defaultLanguage;
                const textLanguage = baseLanguages[0] || CANONICAL_SOURCE_LANGUAGE;
                const resolvedLocalizedDisplayName = normalizedLocalizedDisplayName || updateLocalizedText(
                    undefined,
                    trimmedName,
                    textLanguage,
                    "en",
                ) || { [textLanguage]: trimmedName };
                const status: SpecialMenuStatus = activateImmediately ? "active" : "scheduled";
                const specialMenuMetadata: SpecialMenuMetadata = {
                    baseProjectId,
                    mode,
                    startsAt,
                    endsAt,
                    status,
                    displayName: resolvedLocalizedDisplayName,
                    ...(activateImmediately ? { activatedAt: now.toISOString() } : {}),
                };
                const newProjectData = composeRequestBody({
                    projectId: newProjectId,
                    files: mode === "overlay"
                        ? createSpecialMenuOverlayFiles(baseData.files)
                        : baseData.files || [],
                    languages: baseLanguages,
                    defaultLanguage: baseDefaultLanguage,
                    config: baseData.config || {},
                    menuSettings: baseData.menuSettings || {},
                    active: true,
                    deleted: false,
                    _specialMenu: specialMenuMetadata,
                }, sess, { isNew: true }, Timestamp.fromDate(now));
                const summaryData: ProjectSummaryData = {
                    name: resolvedLocalizedDisplayName,
                    description: updateLocalizedText(undefined, `Special menu: ${trimmedName}`, textLanguage, "en"),
                    projectImage: summaryProjects[baseProjectId]?.projectImage ?? null,
                    active: true,
                    isDefault: false,
                    isSpecialMenu: true,
                    specialMenuDisplayName: resolvedLocalizedDisplayName,
                    specialMenuStatus: status,
                    specialMenuStartsAt: startsAt,
                    specialMenuEndsAt: endsAt,
                    specialMenuMode: mode,
                    specialMenuBaseProjectId: baseProjectId,
                };

                transaction.set(projectRef, newProjectData);
                transaction.set(summaryRef, {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectPayload(newProjectId, summaryData),
                }, { merge: true });
                if (activateImmediately) {
                    const storeUpdate: Record<string, unknown> = { activeSpecialMenuId: newProjectId };
                    if (FEATURE_FLAGS.ENABLE_TEMP_STATUS) {
                        storeUpdate.tempStatus = {
                            type: "special_menu",
                            message: trimmedName,
                            expiresAt: endsAt,
                            createdAt: now.toISOString(),
                            sourceProjectId: newProjectId,
                        };
                    }
                    transaction.set(storeRef, storeUpdate, { merge: true });
                }

                return { projectId: newProjectId, summaryData };
            });

            await revalidatePublicClientCacheForProject(newProjectId, "createSpecialMenuProject");
            return transactionResult;
        },
        params,
        "createSpecialMenuProject",
    );
};

export const updateSpecialMenuProject = async (params: {
    allowOverlap?: boolean;
    projectId: string;
    description?: string;
    displayName: string;
    localizedDescription?: Record<string, string>;
    localizedDisplayName?: Record<string, string>;
    endsAt: string;
    startsAt: string;
}) => {
    return await apiCallComposer(
        async () => {
            const { allowOverlap, projectId, description, displayName, localizedDescription, localizedDisplayName, startsAt, endsAt } = params;
            const trimmedName = typeof displayName === "string" ? displayName.trim() : "";
            const trimmedDescription = typeof description === "string" ? description.trim() : undefined;
            const normalizedLocalizedDisplayName = normalizeSpecialMenuLocalizedInput(localizedDisplayName, 100);
            const normalizedLocalizedDescription = normalizeSpecialMenuLocalizedInput(localizedDescription, 300);
            const { startTime, endTime } = parseSpecialMenuDateRange(startsAt, endsAt);
            const now = new Date();

            if (!trimmedName || trimmedName.length > 100) {
                throw new Error("Special menu name is required");
            }
            if (trimmedDescription && trimmedDescription.length > 300) {
                throw new Error("Special menu description is too long");
            }
            if (endTime <= now.getTime()) {
                throw new Error("End date must be in the future");
            }
            const sess = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(sess);
            if (!scope) throw new Error("special_menu_scope_invalid");
            assertSpecialMenuProjectScope(projectId, scope.tId, scope.sId);
            const projectRef = doc(firebaseClient, DATA_COLLECTION, String(scope.tId), String(scope.sId), projectId);
            const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
            const storeRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(scope.sId));

            const result = await runTransaction(firebaseClient, async (transaction) => {
                const projectDoc = await transaction.get(projectRef);
                const summaryDoc = await transaction.get(summaryDocRef);
                const storeDoc = await transaction.get(storeRef);
                if (!projectDoc.exists()) throw new Error("Project not found");

                const projectData = projectDoc.data() as PersistedProject;
                if (
                    (projectData.projectId !== undefined && projectData.projectId !== projectId)
                    || (projectData.tId !== undefined && String(projectData.tId) !== String(scope.tId))
                    || (projectData.sId !== undefined && String(projectData.sId) !== String(scope.sId))
                    || projectData.deleted === true
                    || projectData.active === false
                ) {
                    throw new Error("Not an active special menu project");
                }
                const currentMetadata = normalizeSpecialMenuMetadata(projectData._specialMenu);
                if (!currentMetadata) throw new Error("Special menu metadata is invalid");
                assertSpecialMenuProjectScope(currentMetadata.baseProjectId, scope.tId, scope.sId);
                const currentStatus = currentMetadata.status;
                if (currentStatus === "expired" || currentStatus === "cancelled") {
                    throw new Error(`Cannot edit a ${currentStatus} special menu`);
                }

                const summaryProjects = summaryDoc.exists()
                    ? filterProjectsSummaryMapForScope(
                        extractProjectsSummaryMap(summaryDoc.data()),
                        scope,
                    )
                    : {};
                if (!allowOverlap) {
                    assertNoSpecialMenuScheduleConflict(summaryProjects, startTime, endTime, projectId);
                }

                const nextStatus: SpecialMenuStatus = startTime <= now.getTime() ? "active" : "scheduled";
                const storeData = storeDoc.exists() ? storeDoc.data() : {};
                const activeMenuId = typeof storeData.activeSpecialMenuId === "string"
                    ? storeData.activeSpecialMenuId
                    : null;
                if (nextStatus === "active" && activeMenuId && activeMenuId !== projectId) {
                    throw new Error("Another special menu is currently active. Deactivate it first.");
                }
                if (currentStatus === "active" && nextStatus === "scheduled" && activeMenuId && activeMenuId !== projectId) {
                    throw new Error("Special menu state conflicts with the active store menu.");
                }

                const textLanguage = getCanonicalProjectSourceLanguage(projectData.languages)
                    || resolveProjectTextLanguage(currentMetadata.displayName, "en");
                const resolvedLocalizedDisplayName = normalizedLocalizedDisplayName || updateLocalizedText(
                    currentMetadata.displayName,
                    trimmedName,
                    textLanguage,
                    "en",
                ) || { [textLanguage]: trimmedName };
                const resolvedLocalizedDescription = normalizedLocalizedDescription || (trimmedDescription
                    ? updateLocalizedText(projectData.description, trimmedDescription, textLanguage, "en")
                    : undefined);
                const {
                    activatedAt: previousActivatedAt,
                    deactivatedAt: _previousDeactivatedAt,
                    ...stableMetadata
                } = currentMetadata;
                const nextMetadata: SpecialMenuMetadata = {
                    ...stableMetadata,
                    displayName: resolvedLocalizedDisplayName,
                    endsAt,
                    startsAt,
                    status: nextStatus,
                    ...(nextStatus === "active"
                        ? { activatedAt: currentStatus === "active" && previousActivatedAt ? previousActivatedAt : now.toISOString() }
                        : {}),
                };

                transaction.set(projectRef, {
                    name: resolvedLocalizedDisplayName,
                    ...(trimmedDescription
                        ? { description: resolvedLocalizedDescription }
                        : { description: deleteField() }),
                    _specialMenu: nextMetadata,
                }, { merge: true });
                transaction.set(summaryDocRef, {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectFieldPayload(projectId, "name", resolvedLocalizedDisplayName),
                    ...buildSummaryProjectFieldPayload(projectId, "description", trimmedDescription ? resolvedLocalizedDescription : ""),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuDisplayName", resolvedLocalizedDisplayName),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuStartsAt", startsAt),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuEndsAt", endsAt),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuStatus", nextStatus),
                }, { merge: true });

                if (nextStatus === "active") {
                    const storeUpdate: Record<string, unknown> = { activeSpecialMenuId: projectId };
                    if (FEATURE_FLAGS.ENABLE_TEMP_STATUS) {
                        storeUpdate.tempStatus = {
                            type: "special_menu",
                            message: trimmedName,
                            expiresAt: endsAt,
                            createdAt: now.toISOString(),
                            sourceProjectId: projectId,
                        };
                    }
                    transaction.set(storeRef, storeUpdate, { merge: true });
                } else if (currentStatus === "active") {
                    const storeUpdate: Record<string, unknown> = {
                        activeSpecialMenuId: deleteField(),
                    };
                    const tempStatusSourceProjectId = typeof storeData.tempStatus?.sourceProjectId === "string"
                        ? storeData.tempStatus.sourceProjectId
                        : null;
                    if (
                        storeData.tempStatus?.type === "special_menu"
                        && (
                            tempStatusSourceProjectId === projectId
                            || (activeMenuId === projectId && tempStatusSourceProjectId === null)
                        )
                    ) {
                        storeUpdate.tempStatus = deleteField();
                    }
                    transaction.set(storeRef, storeUpdate, { merge: true });
                }

                return { projectId, status: nextStatus };
            });
            await revalidatePublicClientCacheForProject(projectId, "updateSpecialMenuProject");
            return result;
        },
        params,
        "updateSpecialMenuProject",
    );
};

/**
 * Activate a scheduled special menu.
 * Sets project status to 'active' and updates store with active menu reference.
 */
export const activateSpecialMenu = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error("special_menu_scope_invalid");
            const result = await transitionSpecialMenuLifecycle({
                action: "activate",
                db: firebaseClient,
                enableTempStatus: FEATURE_FLAGS.ENABLE_TEMP_STATUS,
                projectId,
                sId: scope.sId,
                tId: scope.tId,
            });
            if (result.status !== "active") throw new Error("special_menu_activation_rejected");
            await revalidatePublicClientCacheForProject(projectId, "activateSpecialMenu");

            return { success: true, projectId, status: "active" };
        },
        projectId,
        "activateSpecialMenu",
    );
};

/**
 * Deactivate an active special menu early.
 * Clears store active menu reference and restores base menu.
 */
export const deactivateSpecialMenu = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error('special_menu_scope_invalid');
            await transitionSpecialMenuLifecycle({
                action: 'deactivate',
                db: firebaseClient,
                enableTempStatus: FEATURE_FLAGS.ENABLE_TEMP_STATUS,
                projectId,
                sId: scope.sId,
                tId: scope.tId,
            });
            await revalidatePublicClientCacheForProject(projectId, "deactivateSpecialMenu");

            return { success: true, projectId, status: "expired" };
        },
        projectId,
        "deactivateSpecialMenu",
    );
};

/**
 * Cancel a scheduled (not yet active) special menu.
 */
export const cancelSpecialMenu = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error('special_menu_scope_invalid');
            await transitionSpecialMenuLifecycle({
                action: 'cancel',
                db: firebaseClient,
                enableTempStatus: FEATURE_FLAGS.ENABLE_TEMP_STATUS,
                projectId,
                sId: scope.sId,
                tId: scope.tId,
            });
            await revalidatePublicClientCacheForProject(projectId, "cancelSpecialMenu");

            return { success: true, projectId, status: "cancelled" };
        },
        projectId,
        "cancelSpecialMenu",
    );
};
