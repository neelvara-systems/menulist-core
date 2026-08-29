import { FEATURE_FLAGS } from "@config/features";
import { getSpecialMenuCapabilities } from "@config/specialMenuConfig";
import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import {
    normalizeSpecialMenuScheduleRange,
    resolveNextSpecialMenuTransitionAt,
} from "@data/shared/specialMenuSchedule";
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
import { deleteFileByUrl } from "@database/storage/deleteFromStorage";
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
import getOptionalActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import { logMCEValidationFailure, logMCEValidationResult } from "@lib/mce/diagnostics";
import { resolveLiveSpecialMenuProject } from "@lib/menu/specialMenuRuntime";
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
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { emitProjectPublicationEvent } from "@lib/projects/projectPublicationEvents";
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
import {
    isCompleteSummaryProject,
    parseSummaryProjects,
} from "@lib/firestore/parseSummaryProjects";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { revalidatePublicClientCacheForProject } from "@lib/cache/publicClientCache";
import { shouldPropagateProjectAfterSourceSave } from "@lib/multiOutlet/projectPropagationBoundary";
import { getMenuDesignPresetPatch, getRecommendedMenuDesignPresets } from "@lib/menu/menuDesignPresets";
import {
    getMenuSnapshotPayloadSizeBytes,
    MENU_SNAPSHOT_MAX_ESTIMATED_BYTES,
} from "@lib/menu/menuSnapshotBoundary";
import {
    buildProjectAfterPartialUpdate,
    preserveExistingProjectImageMetadata,
    sanitizeProjectPartialUpdate,
} from "@lib/menu/projectUpdateProjection";
import {
    projectDocumentMutationVersionMillis,
    projectMutationVersionMillis,
} from "@lib/menu/projectMutationVersion";
import { preserveExistingProjectVisualDefaults } from "@lib/extraction/projectVisualDefaults";
import {
    isProjectSlugClaimed,
    isRecentlyDeletedProjectSlugReservation,
    resolveAvailableProjectSlug,
} from "@lib/menu/projectSlugOwnership";
import { createSpecialMenuOverlayFiles } from "@lib/menu/specialMenuOverlay";
import {
    normalizeProjectDocumentScope,
    projectDocumentMatchesScope,
} from "@lib/menu/projectDocumentScope";
import {
    nextProjectMenuVersion,
    resolveStoredProjectMasterId,
} from "@lib/menu/projectMutationAuthority";
import { buildProjectUploadObjectId } from "@lib/menu/projectUploadIdentity";
import { validateProjectUploadDataUrl } from "@lib/menu/projectUploadPayload";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import {
    PROJECT_DELETE_REJECTION_CODES,
    isProjectDeleteRejectionResponse,
} from "@lib/errors/projectDeleteErrors";
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
import { triggerPosSyncForAcknowledgedProjectSave } from "@lib/posSync/eventBuilder";
import type { MediaImageType, MediaImageVariantId } from "@lib/media/imageProfiles";
import { isDataUrl } from "@lib/media/mediaStorage";
import { prepareMediaImage } from "@lib/media/prepareMediaImage";
import { normalizeProjectPriceTruth } from "@lib/pricing/projectPriceTruth";
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
import type LoginUserType from "@type/loginUser";
import type { MenuChangeLogInput } from "@type/menuObservation";
import { TimeSlotPreset } from "@type/platform/store";

const DATA_COLLECTION = DB_COLLECTIONS.PROJECTS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

type ProjectSession = LoginUserType & {
    sId: number;
    tId: number;
    uId: string;
};

const isProjectSession = (session: LoginUserType | null): session is ProjectSession => (
    Boolean(session)
    && typeof session?.tId === "number"
    && Number.isSafeInteger(session.tId)
    && session.tId > 0
    && typeof session.sId === "number"
    && Number.isSafeInteger(session.sId)
    && session.sId > 0
    && typeof session.uId === "string"
    && session.uId.trim().length > 0
);

const getActiveSession = async (): Promise<ProjectSession> => {
    const session = await getOptionalActiveSession();
    if (!isProjectSession(session)) {
        throw new Error("Project session scope is not available");
    }
    return session;
};

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
        const createdAtMillis = Date.now();
        const expiresAt = Timestamp.fromMillis(
            createdAtMillis + retentionDays * 24 * 60 * 60 * 1000,
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
            // Security rules bind this transform to request.time. Snapshot
            // retention must not inherit authority from the browser clock.
            createdAt: serverTimestamp(),
            expiresAt,
            retentionDays,
            snapshotMode: "full_menu_short_term",
        }, {
            undefinedObjectValue: 'omit',
        });
        const estimatedPayloadBytes = getMenuSnapshotPayloadSizeBytes(snapshotPayload);
        if (estimatedPayloadBytes > MENU_SNAPSHOT_MAX_ESTIMATED_BYTES) {
            logProjectPersistenceInfo('project_snapshot_skipped_oversize', {
                ...getProjectPersistenceProjectLogContext(projectId),
                categoryCount: Object.keys(categories).length,
                estimatedPayloadBytes,
                itemCount: Object.keys(items).length,
                retentionDays,
            });
            return;
        }
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
        // A complete summary row always carries the required name and active
        // fields. Ignore field-only remnants from historical mixed-shape
        // deletes instead of presenting them as selectable "Untitled" menus.
        if (!isCompleteSummaryProject(projectData)) continue;
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
    if (projectData.lastPublishedAt instanceof Timestamp) normalized.lastPublishedAt = projectData.lastPublishedAt;
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
const SLUG_RESERVATION_QUERY_LIMIT = 25;

/**
 * Check whether a proposed slug is currently reserved by a project that
 * was soft-deleted within the last 90 days.
 *
 * Queries the projects subcollection directly (NOT the summary, which
 * has deleted projects removed) by exact current slug and exact
 * `previousSlugs` membership. Matching rows are then checked for
 * `deleted === true` and `deletedAt > now - 90d`.
 *
 * Firebase cost: 2 targeted queries per create/rename, capped at 25
 * matching rows each. This replaces the old arbitrary 50-row deleted
 * scan, so unrelated tombstones are never read. A full page fails closed
 * because an unexamined matching tombstone may still own the URL.
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
        const [currentSlugSnapshot, previousSlugSnapshot] = await Promise.all([
            getDocs(query(
                scopedCollectionRef,
                where('slug', '==', normalized),
                limit(SLUG_RESERVATION_QUERY_LIMIT),
            )),
            getDocs(query(
                scopedCollectionRef,
                where('previousSlugs', 'array-contains', normalized),
                limit(SLUG_RESERVATION_QUERY_LIMIT),
            )),
        ]);
        const cutoffMs = Date.now() - SLUG_RESERVATION_WINDOW_MS;
        const matchingDocuments = new Map(
            [...currentSlugSnapshot.docs, ...previousSlugSnapshot.docs]
                .map((docSnap) => [docSnap.id, docSnap] as const),
        );

        for (const docSnap of Array.from(matchingDocuments.values())) {
            if (excludeProjectId && docSnap.id === excludeProjectId) continue;
            if (isRecentlyDeletedProjectSlugReservation(docSnap.data(), normalized, cutoffMs)) {
                return true;
            }
        }

        if (
            currentSlugSnapshot.size === SLUG_RESERVATION_QUERY_LIMIT
            || previousSlugSnapshot.size === SLUG_RESERVATION_QUERY_LIMIT
        ) return true;
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
                const [projectDoc, summaryDoc] = await Promise.all([
                    transaction.get(projectDocRef),
                    transaction.get(summaryDocRef),
                ]);
                if (
                    !projectDoc.exists()
                    || projectDoc.data().deleted !== true
                    || !projectDocumentMatchesScope(projectDoc.data(), scope)
                ) {
                    throw new Error('Project summary removal requires a deleted project');
                }
                transaction.set(summaryDocRef, {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectDeletePayload(projectId, deleteField(), summaryDoc.data()),
                }, { merge: true });
            });
            await revalidatePublicClientCacheForProject(projectId, "removeProjectFromSummary");
            return { projectId, removed: true };
        },
        { projectId },
        "removeProjectFromSummary",
    );
};

export const uploadProjectFile = async (
    data: {
        fileToUpdate?: unknown;
        fileType?: unknown;
    },
    type = "",
    projectId: string,
    fileId: unknown,
    operationSession?: Awaited<ReturnType<typeof getActiveSession>>,
) => {
    const fileType = data?.fileType;
    const fileToUpdate: unknown = data?.fileToUpdate;
    const session = operationSession || await getActiveSession();
    const scope = normalizeProjectDocumentScope({ tId: session.tId, sId: session.sId, projectId });
    if (!scope) throw new Error('project_file_upload_scope_invalid');
    if (typeof fileToUpdate !== 'string' || !isDataUrl(fileToUpdate)) return "";
    const validatedPayload = validateProjectUploadDataUrl({
        claimedType: fileType,
        dataUrl: fileToUpdate,
    });
    const storageFileId = buildProjectUploadObjectId({
        attemptId: doc(collection(firebaseClient, DATA_COLLECTION)).id,
        fileId,
        projectId,
    });
    const storageFileType = type || "files";

    return await uploadBase64ToStorage({
        fileId: storageFileId,
        url: fileToUpdate,
        path: generateStoragePath({
            collection: DATA_COLLECTION,
            fileType: storageFileType,
            session,
            fileId: storageFileId,
        }),
        type: validatedPayload.mimeType,
    });
};

// ═══════════════════════════════════════════════════════════════
// PROJECT CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

export const addProject = async (data: Partial<ProjectMetadata> & {
    businessCategory?: string;
    businessType?: string;
}, options: {
    defaultHandoff?: ProjectDefaultHandoffOptions | null;
    expectedScope?: ProjectExpectedScope;
} = {}) => {
    return await apiCallComposer(
        async () => {
            const operationSession = await getActiveSession();
            const operationScope = normalizeMenuChangeLogScope(operationSession);
            if (!operationScope) throw new Error('Invalid project creation scope');
            if (
                options.expectedScope
                && (
                    operationScope.tId !== options.expectedScope.tId
                    || operationScope.sId !== options.expectedScope.sId
                )
            ) {
                throw new Error('Project creation scope changed');
            }
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
                const requestedSummaryData: ProjectSummaryData = {
                    name: localizedName || { [CANONICAL_SOURCE_LANGUAGE]: "Untitled" },
                    ...(localizedDescription != null ? { description: localizedDescription } : {}),
                    ...(data.projectImage !== undefined ? { projectImage: data.projectImage } : {}),
                    ...(businessCategory ? { businessCategory } : {}),
                    ...(data.businessType ? { businessType: data.businessType } : {}),
                    active: isActive,
                    isDefault: data.isDefault ?? false,
                    slug: availableSlug,
                };
                const summaryData: ProjectSummaryData = existingSummary
                    ? { ...requestedSummaryData, ...existingSummary }
                    : requestedSummaryData;
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
            const { summaryData, summaryMutation } = transactionResult;
            await revalidateProjectSummaryMutation(projectId, summaryMutation.handoff.projectIds, summaryOptions);

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
    options: {
        defaultHandoff?: ProjectDefaultHandoffOptions | null;
        expectedScope?: ProjectExpectedScope;
        preserveExistingProjectImage?: boolean;
    } = {},
) => {
    return await apiCallComposer(
        async () => {
            const operationSession = await getActiveSession();
            const operationScope = normalizeMenuChangeLogScope(operationSession);
            const projectScope = normalizeMultiOutletProjectId(projectId);
            if (
                !operationScope
                || (
                    options.expectedScope
                    && (
                        operationScope.tId !== options.expectedScope.tId
                        || operationScope.sId !== options.expectedScope.sId
                    )
                )
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
                const currentAwareData = options.preserveExistingProjectImage
                    ? preserveExistingProjectImageMetadata(data, freshCurrentSummary)
                    : data;
                const { slug: _ignoredSlug, previousSlugs: _ignoredPreviousSlugs, ...safeData } = currentAwareData;
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
            current.deleted === true
            || !projectDocumentMatchesScope(current, {
                projectId,
                sId: String(operationScope.sId),
                tId: String(operationScope.tId),
            })
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

const PROJECT_DELETE_RESPONSE_MAX_BYTES = 16 * 1024;

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

export type ProjectExpectedScope = {
    sId: number;
    tId: number;
};

interface ProjectUpdateOptions {
    expectedScope?: ProjectExpectedScope;
    preserveExistingVisualDefaults?: boolean;
    expectedModifiedOn?: number | string | Date | Timestamp;
    syncPublicSummary?: boolean;
}

type ProjectPublishOptions = {
    expectedModifiedOn?: unknown;
};

function assertGenericSpecialMenuUpdateBoundary(
    currentProject: Project,
    requestedUpdate: Partial<Project>,
): void {
    const currentMetadata = currentProject._specialMenu
        ? normalizeSpecialMenuMetadata(currentProject._specialMenu)
        : null;
    if (!currentMetadata) {
        if (requestedUpdate._specialMenu !== undefined) {
            throw new Error('Use the special-menu creation flow to add lifecycle metadata.');
        }
        return;
    }

    if (requestedUpdate.active === false || requestedUpdate.deleted === true) {
        throw new Error('Use the special-menu lifecycle controls to end, cancel, or delete this menu.');
    }
    if (requestedUpdate._specialMenu === undefined) return;

    const requestedMetadata = normalizeSpecialMenuMetadata(requestedUpdate._specialMenu);
    if (
        !requestedMetadata
        || requestedMetadata.baseProjectId !== currentMetadata.baseProjectId
        || requestedMetadata.behaviorTemplate !== currentMetadata.behaviorTemplate
        || requestedMetadata.mode !== currentMetadata.mode
        || requestedMetadata.startsAt !== currentMetadata.startsAt
        || requestedMetadata.endsAt !== currentMetadata.endsAt
        || requestedMetadata.status !== currentMetadata.status
        || requestedMetadata.activatedAt !== currentMetadata.activatedAt
        || requestedMetadata.deactivatedAt !== currentMetadata.deactivatedAt
    ) {
        throw new Error('Use the special-menu schedule controls to change lifecycle metadata.');
    }
}

const runUpdateProject = async (data: Partial<Project>, options: ProjectUpdateOptions = {}) => {
    data = sanitizeProjectPartialUpdate(stripGeneratedProjectReadModels(data));
    normalizeProjectPriceTruth(data);
    const operationSession = await getActiveSession();
    const operationScope = normalizeMenuChangeLogScope(operationSession);
    if (!operationScope) {
        throw new Error('Invalid active project operation scope');
    }
    if (
        options.expectedScope
        && (
            operationScope.tId !== options.expectedScope.tId
            || operationScope.sId !== options.expectedScope.sId
        )
    ) {
        throw new Error('Project update scope changed');
    }
    const operationProjectId = normalizeMenuChangeLogIdentifier(data.projectId, 'projectId');
    const projectScope = normalizeProjectDocumentScope({
        tId: operationScope.tId,
        sId: operationScope.sId,
        projectId: operationProjectId,
    });
    if (!projectScope) throw new Error('Invalid project update identity');
    data.projectId = operationProjectId;
    const operationProjectRef = doc(
        firebaseClient,
        `${DATA_COLLECTION}/${projectScope.tId}/${projectScope.sId}`,
        projectScope.projectId,
    );
    const operationSummaryRef = doc(
        firebaseClient,
        PLATFORM_SUMMARY,
        `projects_${operationScope.sId}`,
    );

    const currentProjectDoc = await getDoc(operationProjectRef);
    if (
        !currentProjectDoc.exists()
        || currentProjectDoc.data().deleted === true
        || !projectDocumentMatchesScope(currentProjectDoc.data(), projectScope)
    ) {
        throw new Error('Project update identity mismatch');
    }
    const oldProject = currentProjectDoc.data() as Project;
    assertGenericSpecialMenuUpdateBoundary(oldProject, data);
    const expectedModifiedOnMillis = options.expectedModifiedOn === undefined
        ? null
        : projectMutationVersionMillis(options.expectedModifiedOn);
    if (options.expectedModifiedOn !== undefined && expectedModifiedOnMillis === null) {
        throw new Error('Invalid project update precondition');
    }
    const storedMasterProjectId = resolveStoredProjectMasterId(oldProject, data) || '';
    if (storedMasterProjectId) data.masterProjectId = storedMasterProjectId;

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

    // INVARIANT: All customer-facing truth must pass through updateProject().
    // MCE validation assumes no direct Firestore writes bypass this path.
    // Direct writes bypassing the DAL are treated as a security breach.
    // @see __docs__/menu-correctness-engine/menu-correctness-engine_spec.md §19

    if (data.projectId && storedMasterProjectId) {
        const linkedOutletLogContext = getProjectPersistenceProjectLogContext(data.projectId, storedMasterProjectId);
        const extractedVisualDefaults = options.preserveExistingVisualDefaults ? {
            brandAccentColor: data.config?.design?.brand?.accentColor,
            imageBackgroundColor: data.aiPreferences?.image?.backgroundColor,
        } : null;
        const response = await fetch('/api/projects/outlet-save', {
            ...LINKED_OUTLET_SAVE_REQUEST_POLICY,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project: { ...data, masterProjectId: storedMasterProjectId },
                ...(expectedModifiedOnMillis !== null ? { expectedModifiedOnMillis } : {}),
                ...(extractedVisualDefaults ? { extractedVisualDefaults } : {}),
            }),
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
        if (!isLinkedOutletSaveResponse(result, data.projectId, storedMasterProjectId)) {
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

        triggerPosSyncForAcknowledgedProjectSave(
            operationScope.sId,
            operationScope.tId,
            data.projectId as string,
        );

        return updateData;
    }

    const updateData = composeRequestBody(data, operationSession, { isNew: false });
    let mceRuntime: null | typeof import("@lib/mce") = null;
    if (FEATURE_FLAGS.ENABLE_MCE) {
        try {
            mceRuntime = await import("@lib/mce");
        } catch (error) {
            logMCEValidationFailure(error, {
                isOutlet: false,
                oldProjectPresent: true,
            });
        }
    }

    const transactionResult = await runTransaction(firebaseClient, async (transaction) => {
        const freshProjectDoc = await transaction.get(operationProjectRef);
        if (
            !freshProjectDoc.exists()
            || freshProjectDoc.data().deleted === true
            || !projectDocumentMatchesScope(freshProjectDoc.data(), projectScope)
        ) {
            throw new Error('Project update state changed');
        }
        const freshProject = freshProjectDoc.data() as Project;
        assertGenericSpecialMenuUpdateBoundary(freshProject, data);
        if (
            expectedModifiedOnMillis !== null
            && projectDocumentMutationVersionMillis(freshProject as unknown as Record<string, unknown>) !== expectedModifiedOnMillis
        ) {
            throw new Error('Project update state changed');
        }
        if (resolveStoredProjectMasterId(freshProject, data)) {
            throw new Error('Project update state changed');
        }

        const persistedUpdateData = options.preserveExistingVisualDefaults
            ? preserveExistingProjectVisualDefaults(
                { ...updateData },
                freshProject,
            )
            : { ...updateData };
        let mceResult: ReturnType<NonNullable<typeof mceRuntime>["mceValidate"]> | null = null;
        let mceError: unknown = null;
        if (mceRuntime) {
            try {
                const projectForValidation = buildProjectAfterPartialUpdate(freshProject, persistedUpdateData);
                mceResult = mceRuntime.mceValidate({
                    projectData: projectForValidation,
                    isOutlet: false,
                    oldProjectData: freshProject,
                });
                persistedUpdateData._mce = mceRuntime.toMCEMetadata(mceResult);
            } catch (error) {
                mceError = error;
            }
        }

        transaction.set(operationProjectRef, persistedUpdateData, { merge: true });
        const savedProject = buildProjectAfterPartialUpdate(freshProject, persistedUpdateData);
        if (options.syncPublicSummary) {
            transaction.set(operationSummaryRef, {
                lastUpdated: serverTimestamp(),
                ...('name' in data
                    ? buildSummaryProjectFieldPayload(projectScope.projectId, 'name', savedProject.name)
                    : {}),
                ...('description' in data
                    ? buildSummaryProjectFieldPayload(projectScope.projectId, 'description', savedProject.description || '')
                    : {}),
                ...(data._specialMenu?.displayName
                    ? buildSummaryProjectFieldPayload(
                        projectScope.projectId,
                        'specialMenuDisplayName',
                        savedProject._specialMenu?.displayName,
                    )
                    : {}),
            }, { merge: true });
        }
        return {
            mceError,
            mceResult,
            previousProject: freshProject,
            savedProject,
        };
    });
    const previousProject = transactionResult.previousProject;
    const savedProject = transactionResult.savedProject;
    if (transactionResult.mceResult) logMCEValidationResult(transactionResult.mceResult);
    if (transactionResult.mceError) {
        logMCEValidationFailure(transactionResult.mceError, {
            isOutlet: false,
            oldProjectPresent: true,
        });
    }

    // Firestore admits a linked outlet only after the master has exactly one
    // canonical source file. New menus start empty, so propagating from
    // addProject() is guaranteed to be denied. Reconcile once at the first
    // empty -> single-source transition instead.
    if (
        FEATURE_FLAGS.ENABLE_PROJECT_PROPAGATION
        && data.projectId
        && shouldPropagateProjectAfterSourceSave({
            currentFiles: savedProject.files,
            masterProjectId: savedProject.masterProjectId,
            previousFiles: previousProject.files,
        })
    ) {
        try {
            const { propagateNewProjectToOutlets } = await import(
                "@database/multiOutlet/propagation"
            );
            await propagateNewProjectToOutlets(
                operationScope.tId,
                operationScope.sId,
                data.projectId,
                resolveProjectSummaryName(savedProject.name, 'Untitled'),
            );
        } catch (e) {
            logProjectPersistenceFailure('project_outlet_propagation_source_ready_failed', e, {
                ...getProjectPersistenceProjectLogContext(data.projectId),
            });
        }
    }

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
        !previousProject.masterProjectId // No masterProjectId = this is a master project
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

    let hasOperationalChange = false;
    if (
        FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
        data.projectId &&
        !previousProject.masterProjectId &&
        (FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS || FEATURE_FLAGS.ENABLE_MENU_OBSERVATION)
    ) {
        try {
            const { detectOperationalChange } = await import("@lib/multiOutlet/masterUpdateDiff");
            hasOperationalChange = detectOperationalChange(previousProject, data);
        } catch (e) {
            logProjectPersistenceFailure('project_operational_change_detection_failed', e, {
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
        !previousProject.masterProjectId && // This IS a master project
        hasOperationalChange
    ) {
        try {
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
                    lastUpdatedAt: serverTimestamp(),
                },
                { merge: true },
            );
        } catch (e) {
            // Silent fail — don't block master save
            logProjectPersistenceFailure('master_update_awareness_signal_update_failed', e, {
                ...getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId),
            });
        }
    }

    // MOL v0: Detect and log changes (fire-and-forget, non-blocking)
    if (data.projectId) {
        void detectAndLogChanges(
            data.projectId,
            previousProject,
            savedProject,
            operationScope,
        );
    }

    // T10: Log MOL event with dynamic type based on project mode
    // Determine mode from existing data (no extra Firestore reads):
    // - masterProjectId present → OUTLET (linked to master)
    // - masterProjectId absent + multi-outlet enabled → MASTER (or standalone, can't distinguish without store lookup)
    // - multi-outlet disabled → STANDALONE
    if (
        previousProject
        && FEATURE_FLAGS.ENABLE_MULTI_OUTLET
        && FEATURE_FLAGS.ENABLE_MENU_OBSERVATION
        && hasOperationalChange
    ) {
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
            } else if (previousProject.masterProjectId) {
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

    if (data.projectId) {
        triggerPosSyncForAcknowledgedProjectSave(
            operationScope.sId,
            operationScope.tId,
            data.projectId as string,
        );
    }

    return savedProject;
};

export const updateProject = async (data: Partial<Project>) => {
    return await apiCallComposer(
        () => runUpdateProject(data),
        data,
        "updateProject",
    );
};

export const updateProjectWithoutLoader = async (
    data: Partial<Project>,
    options: ProjectUpdateOptions = {},
) => {
    return await apiCallComposerClientWithoutLoader(
        () => runUpdateProject(data, options),
        data,
        "updateProjectWithoutLoader",
    );
};

/**
 * Toggle project active status
 * Updates both projects collection and projectsSummary
 */
export const setProjectActive = async (
    projectId: string,
    active: boolean,
    expectedScope?: ProjectExpectedScope,
) => {
    return await apiCallComposer(
        async () => {
            if (typeof active !== 'boolean') throw new Error('Invalid project active state');
            const session = await getActiveSession();
            resolveExpectedProjectScope(session, expectedScope, "project_active_scope_changed");
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
            const currentProjectSnap = await getDoc(projectDocRef);
            const currentProject = currentProjectSnap.exists()
                ? currentProjectSnap.data() as Project
                : null;
            if (
                !currentProject
                || currentProject.deleted === true
                || !projectDocumentMatchesScope(currentProject, scope)
            ) {
                throw new Error('Project active identity mismatch');
            }

            // Linked outlet documents are server-write-only. Route their
            // active-state mutation through the same protected save path used
            // by all other linked outlet changes so current master policy,
            // tenant/store authority, summary truth, and cache effects are
            // evaluated together.
            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && currentProject.masterProjectId) {
                await runUpdateProject(
                    { projectId, active },
                    {
                        expectedScope: { tId: session.tId, sId: session.sId },
                        syncPublicSummary: true,
                    },
                );
                return { projectId, active };
            }

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
                if (
                    active === false
                    && projectData._specialMenu
                    && (
                        projectData._specialMenu.status === 'active'
                        || projectData._specialMenu.status === 'scheduled'
                    )
                ) {
                    throw new Error('End or cancel this special menu before making it inactive.');
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
    expectedScope: { tenantId: number; storeId: number },
): Promise<ProjectPresetCascadeUpdateResult> => {
    const session = await getActiveSession();
    const scope = normalizeMenuChangeLogScope(session);
    if (
        !scope
        || !Number.isSafeInteger(expectedScope.tenantId)
        || expectedScope.tenantId <= 0
        || !Number.isSafeInteger(expectedScope.storeId)
        || expectedScope.storeId <= 0
        || scope.tId !== expectedScope.tenantId
        || scope.sId !== expectedScope.storeId
    ) {
        throw new Error("project_preset_cascade_scope_invalid");
    }
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
                && (
                    mutation.type === "remove"
                    || projectReferencesTimeSlotPreset(project, presetId)
                );
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
                    // Revalidate every admitted candidate, including an already
                    // projected document on retry. A Firestore commit can
                    // succeed before cache invalidation fails. Remove retries
                    // cannot rediscover the former reference, so they admit the
                    // complete bounded store project set above.
                    await revalidatePublicClientCacheForProject(projectDoc.id, cacheContext);
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

export const removePresetFromAllCategories = async (
    presetId: string,
    expectedScope: { tenantId: number; storeId: number },
) => {
    return await apiCallComposer(
        async () => {
            const normalizedPresetId = normalizeTimeSlotPresetId(presetId);
            if (!normalizedPresetId) throw new Error("project_preset_cascade_preset_invalid");
            return await applyPresetMutationToAllProjects(
                { type: "remove", presetId: normalizedPresetId },
                "removePresetFromAllCategories",
                expectedScope,
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
export const updatePresetInAllCategories = async (
    preset: TimeSlotPreset,
    expectedScope: { tenantId: number; storeId: number },
) => {
    return await apiCallComposer(
        async () => {
            const normalizedPreset = normalizeTimeSlotPreset(preset);
            if (!normalizedPreset) throw new Error("project_preset_cascade_preset_invalid");
            return await applyPresetMutationToAllProjects(
                { type: "update", preset: normalizedPreset },
                "updatePresetInAllCategories",
                expectedScope,
            );
        },
        { presetId: preset?.id },
        "updatePresetInAllCategories",
    );
};

export const publishProject = async (
    data: Partial<Project>,
    options: ProjectPublishOptions = {},
) => {
    const requestedModifiedOn = options.expectedModifiedOn
        ?? (data as Partial<Project> & { modifiedOn?: unknown }).modifiedOn;
    return await apiCallComposer(
        async () => {
            data = sanitizeProjectPartialUpdate(stripGeneratedProjectReadModels(data));
            normalizeProjectPriceTruth(data);
            const operationSession = await getActiveSession();
            const operationScope = normalizeMenuChangeLogScope(operationSession);
            if (!operationScope) {
                throw new Error('Invalid active project publish scope');
            }
            const operationProjectId = normalizeMenuChangeLogIdentifier(data.projectId, 'projectId');
            const projectScope = normalizeProjectDocumentScope({
                tId: operationScope.tId,
                sId: operationScope.sId,
                projectId: operationProjectId,
            });
            if (!projectScope) throw new Error('Invalid project publish identity');
            data.projectId = operationProjectId;
            const operationProjectRef = doc(
                firebaseClient,
                `${DATA_COLLECTION}/${projectScope.tId}/${projectScope.sId}`,
                projectScope.projectId,
            );
            const currentProjectDoc = await getDoc(operationProjectRef);
            if (
                !currentProjectDoc.exists()
                || currentProjectDoc.data().deleted === true
                || !projectDocumentMatchesScope(currentProjectDoc.data(), projectScope)
            ) {
                throw new Error('Project publish identity mismatch');
            }
            const currentProject = currentProjectDoc.data() as Project;
            const currentModifiedOnMillis = projectDocumentMutationVersionMillis(
                currentProject as unknown as Record<string, unknown>,
            );
            const expectedModifiedOnMillis = requestedModifiedOn === undefined
                ? currentModifiedOnMillis
                : projectMutationVersionMillis(requestedModifiedOn);
            if (requestedModifiedOn !== undefined && expectedModifiedOnMillis === null) {
                throw new Error('Invalid project publish precondition');
            }
            if (
                requestedModifiedOn !== undefined
                && currentModifiedOnMillis !== expectedModifiedOnMillis
            ) {
                throw new Error('Project publish state changed');
            }
            const storedMasterProjectId = resolveStoredProjectMasterId(currentProject, data) || '';
            let linkedMasterProject: Project | null = null;
            if (storedMasterProjectId) data.masterProjectId = storedMasterProjectId;

            // T14: Multi-outlet chain validation - ensure master exists before publish
            if (storedMasterProjectId) {
                const masterScope = normalizeMultiOutletProjectId(storedMasterProjectId);
                if (!masterScope || masterScope.tId !== operationScope.tId) {
                    throw new Error(
                        "Publish blocked: Cross-tenant master reference is not allowed.",
                    );
                }

                // Validate master project actually exists
                const masterRef = doc(
                    firebaseClient,
                    `${DATA_COLLECTION}/${masterScope.tId}/${masterScope.sId}`,
                    storedMasterProjectId,
                );
                const masterSnap = await getDoc(masterRef);
                if (
                    !masterSnap.exists()
                    || masterSnap.data()?.deleted === true
                    || !projectDocumentMatchesScope(masterSnap.data(), masterScope)
                ) {
                    throw new Error(
                        "Publish blocked: Linked master project no longer exists. Please unlink or reassign master.",
                    );
                }
                linkedMasterProject = masterSnap.data() as Project;
            }

            const updatedData = composeRequestBody(data, operationSession, { isNew: false });
            const uploadedProjectFileUrls: string[] = [];
            let persistenceCommitted = false;
            let persistenceOutcomeAmbiguous = false;

            try {
                if (Array.isArray(data.files) && Array.isArray(updatedData.files)) {
                    for (let i = 0; i < data.files.length; i += 1) {
                        if (isDataUrl(updatedData.files[i]?.url)) {
                            const uploadedUrl = await uploadProjectFile(
                                { fileType: data.files[i].type, fileToUpdate: data.files[i].url },
                                "files",
                                operationProjectId,
                                data.files[i].name || data.files[i].uid || `file-${i}`,
                                operationSession,
                            );
                            if (!uploadedUrl) throw new Error('project_file_upload_failed');
                            updatedData.files[i].url = uploadedUrl;
                            uploadedProjectFileUrls.push(uploadedUrl);
                        }
                    }
                }

                // ═══════════════════════════════════════════════════════════════
                // CANONICAL TRUTH: Version increment on publish
                // Monotonic — versions only move forward, never mutated
                // @see __docs__/canonical-truth-infrastructure/
                // ═══════════════════════════════════════════════════════════════
                if (storedMasterProjectId) {
                    const linkedOutletPublishLogContext = getProjectPersistenceProjectLogContext(
                        operationProjectId,
                        storedMasterProjectId,
                    );
                    persistenceOutcomeAmbiguous = true;
                    const response = await fetch('/api/projects/outlet-save', {
                        ...LINKED_OUTLET_SAVE_REQUEST_POLICY,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project: {
                                ...updatedData,
                                projectId: operationProjectId,
                                masterProjectId: storedMasterProjectId,
                            },
                            publish: true,
                            ...(expectedModifiedOnMillis !== null ? { expectedModifiedOnMillis } : {}),
                        }),
                    });
                    persistenceOutcomeAmbiguous = false;
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
                    // The route returns 2xx only after its Firestore transaction commits.
                    // Response parsing and post-commit observation failures must not delete
                    // immutable objects already referenced by the committed project.
                    persistenceCommitted = true;

                    const result = await readLinkedOutletSaveResponse(
                        response,
                        linkedOutletPublishLogContext,
                        "linked_outlet_publish_response_parse_failed",
                        "Linked outlet publish failed. Please try again.",
                    );
                    if (!isLinkedOutletSaveResponse(result, operationProjectId, storedMasterProjectId)) {
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

                    await revalidatePublicClientCacheForProject(operationProjectId, "publishProject");
                    try {
                        if (!linkedMasterProject) throw new Error('linked_outlet_publish_master_missing');
                        const { populateMasterCache, resolveProjectForRender } = await import("@lib/multiOutlet");
                        populateMasterCache(storedMasterProjectId, linkedMasterProject);
                        const publishedTruthProject = await resolveProjectForRender({
                            storeProject: result.project as Project,
                        });
                        if (publishedTruthProject._resolved?.isMasterLinked !== true) {
                            throw new Error('linked_outlet_publish_truth_unresolved');
                        }
                        await recordPublishedMenuTruth(
                            operationProjectId,
                            publishedTruthProject,
                            operationScope,
                        );
                    } catch (error) {
                        // The authoritative publish already committed. Do not
                        // write a misleading raw-outlet snapshot or fail the
                        // owner action because optional observation failed.
                        logProjectPersistenceFailure('linked_outlet_publish_truth_observation_failed', error, {
                            ...getProjectPersistenceProjectLogContext(operationProjectId, storedMasterProjectId),
                        });
                    }
                    emitProjectPublicationEvent(projectScope);
                    return result.project;
                }

                const publishedAt = Timestamp.now();
                const publishStoreRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(operationScope.sId));
                const publishSummaryRef = doc(
                    firebaseClient,
                    PLATFORM_SUMMARY,
                    `projects_${operationScope.sId}`,
                );
                let publishMceRuntime: null | typeof import("@lib/mce") = null;
                if (FEATURE_FLAGS.ENABLE_MCE) {
                    try {
                        publishMceRuntime = await import("@lib/mce");
                    } catch (error) {
                        logMCEValidationFailure(error, {
                            isOutlet: false,
                            oldProjectPresent: true,
                        });
                    }
                }
                const publishTransactionResult = await runTransaction(firebaseClient, async (transaction) => {
                    const [freshProjectDoc, freshStoreDoc] = await Promise.all([
                        transaction.get(operationProjectRef),
                        transaction.get(publishStoreRef),
                    ]);
                    if (
                        !freshProjectDoc.exists()
                        || freshProjectDoc.data().deleted === true
                        || !projectDocumentMatchesScope(freshProjectDoc.data(), projectScope)
                        || Boolean(freshProjectDoc.data().masterProjectId)
                    ) {
                        throw new Error('Project publish state changed');
                    }
                    if (
                        !freshStoreDoc.exists()
                        || String(freshStoreDoc.data().storeId) !== String(operationScope.sId)
                        || String(freshStoreDoc.data().tenantId) !== String(operationScope.tId)
                        || freshStoreDoc.data().active === false
                        || freshStoreDoc.data().deleted === true
                        || isPlatformEntityBlocked(freshStoreDoc.data())
                    ) {
                        throw new Error('Project publish store state changed');
                    }
                    const freshProject = freshProjectDoc.data() as Project;
                    if (
                        projectDocumentMutationVersionMillis(
                            freshProject as unknown as Record<string, unknown>,
                        ) !== currentModifiedOnMillis
                    ) {
                        throw new Error('Project publish state changed');
                    }
                    const nextMenuVersion = nextProjectMenuVersion(freshProject.menuVersion);
                    const nextProject = buildProjectAfterPartialUpdate(freshProject, updatedData);
                    const persistedPublishData: Record<string, any> = {
                        ...updatedData,
                        menuVersion: nextMenuVersion,
                        lastPublishedAt: publishedAt,
                    };
                    let mceResult: ReturnType<NonNullable<typeof publishMceRuntime>["mceValidate"]> | null = null;
                    let mceError: unknown = null;
                    if (publishMceRuntime) {
                        try {
                            mceResult = publishMceRuntime.mceValidate({
                                projectData: nextProject,
                                isOutlet: false,
                                oldProjectData: freshProject,
                            });
                            persistedPublishData._mce = publishMceRuntime.toMCEMetadata(mceResult);
                        } catch (error) {
                            mceError = error;
                        }
                    }
                    transaction.set(operationProjectRef, persistedPublishData, { merge: true });
                    transaction.set(publishSummaryRef, {
                        lastUpdated: publishedAt,
                        ...buildSummaryProjectFieldPayload(operationProjectId, 'lastPublishedAt', publishedAt),
                    }, { merge: true });
                    transaction.update(publishStoreRef, {
                        lastPublishedAt: publishedAt,
                        modifiedOn: publishedAt,
                    });
                    return {
                        mceError,
                        mceResult,
                        project: {
                            ...nextProject,
                            ...persistedPublishData,
                        } as Project,
                    };
                });
                const publishedProject = publishTransactionResult.project;
                if (publishTransactionResult.mceResult) {
                    logMCEValidationResult(publishTransactionResult.mceResult);
                }
                if (publishTransactionResult.mceError) {
                    logMCEValidationFailure(publishTransactionResult.mceError, {
                        isOutlet: false,
                        oldProjectPresent: true,
                    });
                }
                persistenceCommitted = true;
                await revalidatePublicClientCacheForProject(operationProjectId, "publishProject");

                await recordPublishedMenuTruth(
                    operationProjectId,
                    publishedProject,
                    operationScope,
                );

                emitProjectPublicationEvent(projectScope);
                return publishedProject;
            } catch (error) {
                if (uploadedProjectFileUrls.length && !persistenceCommitted && !persistenceOutcomeAmbiguous) {
                    const cleanupResults = await Promise.all(
                        uploadedProjectFileUrls.map((url) => deleteFileByUrl(url)),
                    );
                    const failedCleanupCount = cleanupResults.filter((result) => !result.success).length;
                    if (failedCleanupCount) {
                        logProjectPersistenceFailure('project_publish_upload_cleanup_failed', error, {
                            ...getProjectPersistenceProjectLogContext(operationProjectId, storedMasterProjectId),
                            failedCleanupCount,
                            uploadedFileCount: uploadedProjectFileUrls.length,
                        });
                    }
                }
                throw error;
            }
        },
        data,
        "publishProject",
    );
};

/**
 * Get projects list using Summary Document Pattern (1 read)
 * Returns projects from platformSummary/projects_{sId}
 */
const resolveExpectedProjectScope = (
    session: Readonly<{ tId?: unknown; sId?: unknown }> | null | undefined,
    expectedScope: ProjectExpectedScope | undefined,
    rejectionCode: string,
) => {
    const scope = normalizeMenuChangeLogScope(session);
    if (
        !scope
        || (
            expectedScope
            && (
                scope.tId !== expectedScope.tId
                || scope.sId !== expectedScope.sId
            )
        )
    ) {
        throw new Error(rejectionCode);
    }
    return scope;
};

const getProjectsListCore = async (
    includeInactive = false,
    expectedScope?: ProjectExpectedScope,
) => {
    const session = await getActiveSession();
    const scope = resolveExpectedProjectScope(session, expectedScope, "projects_list_scope_changed");
    const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
    const summaryDoc = await getDoc(summaryDocRef);
    const projectsMap = summaryDoc.exists()
        ? filterProjectsSummaryMapForScope(
            extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
            scope,
        )
        : {};

    const projects = Object.entries(projectsMap)
        .map(([projectId, data]) => normalizeProjectReadState({
            projectId,
            ...(data as ProjectSummaryData),
        }))
        .filter((p) => includeInactive || p.active !== false);

    if (projects.length === 0) {
        const projectId = `${scope.tId}-default-${scope.sId}`;
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
const getExistingProjectsListCore = async (
    includeInactive = false,
    expectedScope?: ProjectExpectedScope,
) => {
    const session = await getActiveSession();
    const scope = resolveExpectedProjectScope(session, expectedScope, "existing_projects_list_scope_changed");
    const summaryDocRef = doc(firebaseClient, PLATFORM_SUMMARY, `projects_${scope.sId}`);
    const summaryDoc = await getDoc(summaryDocRef);
    const projectsMap = summaryDoc.exists()
        ? filterProjectsSummaryMapForScope(
            extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>),
            scope,
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

export const getProjectsListWithoutLoader = async (
    includeInactive = false,
    expectedScope?: ProjectExpectedScope,
) => {
    return await apiCallComposerClientWithoutLoader(
        async () => await getProjectsListCore(includeInactive, expectedScope),
        { expectedScope, includeInactive },
        "getProjectsListWithoutLoader",
    );
};

export const getExistingProjectsListWithoutLoader = async (
    includeInactive = false,
    expectedScope?: ProjectExpectedScope,
) => {
    return await apiCallComposerClientWithoutLoader(
        async () => await getExistingProjectsListCore(includeInactive, expectedScope),
        { expectedScope, includeInactive },
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

const getProjectDataCore = async (
    projectId: string,
    expectedScope?: ProjectExpectedScope,
): Promise<Project> => {
    const session = await getActiveSession();
    const sessionScope = resolveExpectedProjectScope(session, expectedScope, "project_read_scope_changed");
    const scope = normalizeProjectDocumentScope({
        tId: sessionScope.tId,
        sId: sessionScope.sId,
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

export const getProjectDataWithoutLoader = async (
    projectId: string,
    expectedScope?: ProjectExpectedScope,
): Promise<Project> => {
    return await apiCallComposerClientWithoutLoader(
        async () => await getProjectDataCore(projectId, expectedScope),
        { expectedScope, projectId },
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
            const canAccessStore = session.platformRole === 'PLATFORM'
                || session.user.storeIds.some((storeId) => String(storeId) === scope.sId);
            if (!canAccessStore) {
                throw new Error('Cross-store project read is not authorized');
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
    expectedScope?: ProjectExpectedScope,
) => {
    let fileUrl: any = "";
    const docId = buildProjectUploadObjectId({
        attemptId: doc(collection(firebaseClient, DATA_COLLECTION)).id,
        stableParts: [data.uid, data.name],
    });
    const mediaProfileByFolder: Partial<Record<string, MediaImageType>> = {
        assets: 'menuBackground',
        itemImages: 'menuItem',
        'project-images': 'projectImage',
    };
    const mediaProfile = (data.mediaProfile as MediaImageType | undefined) || mediaProfileByFolder[from];

    if (data.blob || (mediaProfile && isDataUrl(data.url))) {
        const session = await getActiveSession();
        const operationScope = resolveExpectedProjectScope(
            session,
            expectedScope,
            "project_upload_scope_changed",
        );
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
            storeId: operationScope.sId,
            tenantId: operationScope.tId,
            variant: data.mediaVariant as MediaImageVariantId | undefined,
        });
    }

    if (!data.url || !isDataUrl(data.url)) return "";

    const validatedPayload = validateProjectUploadDataUrl({
        claimedType: data.type,
        dataUrl: data.url,
    });
    const session = await getActiveSession();
    const operationScope = resolveExpectedProjectScope(
        session,
        expectedScope,
        "project_upload_scope_changed",
    );
    fileUrl = await uploadBase64ToStorage({
        fileId: docId,
        url: data.url,
        path: generateStoragePath({
            collection: DATA_COLLECTION,
            fileType: from,
            session: {
                ...session,
                sId: operationScope.sId,
                tId: operationScope.tId,
            },
            fileId: docId,
        }),
        type: validatedPayload.mimeType,
    });
    return fileUrl;
};

/**
 * Delete a project (soft delete)
 * 
 * @param projectId - Project ID to delete
 * Deletion is server-authoritative because the linked-outlet check must run
 * in the same Firestore transaction as the soft-delete write.
 */
export const deleteProject = async (projectId: string) => {
    const result = await apiCallComposer(
        async () => {
            const response = await fetch("/api/projects/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
                cache: "no-store",
                credentials: "same-origin",
            });
            const responseBody = await readJsonResponseWithLimit<unknown>(
                response,
                PROJECT_DELETE_RESPONSE_MAX_BYTES,
            );
            if (!response.ok) {
                const rejectionCode = isProjectDeleteRejectionResponse(responseBody)
                    ? responseBody.code
                    : PROJECT_DELETE_REJECTION_CODES.FAILED;
                throw createProjectPersistenceStatusError(
                    rejectionCode,
                    response.status,
                    rejectionCode,
                );
            }
            if (!isProjectDeleteResult(responseBody, projectId)) {
                throw createProjectPersistenceStatusError(
                    "project_delete_response_invalid",
                    response.status,
                    "Project deletion failed",
                );
            }
            return responseBody;
        },
        projectId,
        "deleteProject",
    );

    assertProjectDeleteSucceeded(result, projectId);
    return result;
};

export type ProjectRestoreResult = {
    active: true;
    deleted: false;
    deletedAt: null;
    projectId: string;
    summaryData: ProjectSummaryData;
};

export const restoreProject = async (projectId: string): Promise<ProjectRestoreResult> => {
    return await apiCallComposer<ProjectRestoreResult>(
        async (): Promise<ProjectRestoreResult> => {
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
    expectedScope?: ProjectExpectedScope,
) => {
    return await apiCallComposer(
        async () => {
            const sess = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(sess);
            const sourceProjectScope = normalizeMultiOutletProjectId(projectId);
            if (
                !scope
                || (
                    expectedScope
                    && (
                        scope.tId !== expectedScope.tId
                        || scope.sId !== expectedScope.sId
                    )
                )
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
    const schedule = normalizeSpecialMenuScheduleRange(startsAt, endsAt);
    if (!schedule) throw new Error("Special menu dates are invalid");
    return schedule;
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

export type SpecialMenuExpectedScope = ProjectExpectedScope;

const assertExpectedSpecialMenuScope = (
    scope: ProjectExpectedScope,
    expectedScope?: SpecialMenuExpectedScope,
) => {
    if (
        expectedScope
        && (
            scope.tId !== expectedScope.tId
            || scope.sId !== expectedScope.sId
        )
    ) {
        throw new Error("special_menu_scope_changed");
    }
};

/**
 * Get all special menus for current store from projectsSummary.
 * Zero extra reads — reads from the same summary doc used by project listing.
 */
export const getSpecialMenus = async (expectedScope?: SpecialMenuExpectedScope): Promise<{
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
            assertExpectedSpecialMenuScope(scope, expectedScope);
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
    baseProjectId: string;
    displayName: string;
    localizedDisplayName?: Record<string, string>;
    mode: SpecialMenuMode;
    startsAt: string;
    endsAt: string;
}, expectedScope?: SpecialMenuExpectedScope) => {
    return await apiCallComposer(
        async () => {
            const { baseProjectId, displayName, localizedDisplayName, mode, startsAt, endsAt } = params;
            const trimmedName = typeof displayName === "string" ? displayName.trim() : "";
            if (!trimmedName || trimmedName.length > 100) throw new Error("Special menu name is required");
            if (mode !== "replace" && mode !== "overlay") throw new Error("Special menu mode is invalid");
            const normalizedLocalizedDisplayName = normalizeSpecialMenuLocalizedInput(localizedDisplayName, 100);
            const {
                endTime,
                endsAt: normalizedEndsAt,
                startTime,
                startsAt: normalizedStartsAt,
            } = parseSpecialMenuDateRange(startsAt, endsAt);
            const now = new Date();
            if (endTime <= now.getTime()) {
                throw new Error("End date must be in the future");
            }
            const sess = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(sess);
            if (!scope) throw new Error("special_menu_scope_invalid");
            assertExpectedSpecialMenuScope(scope, expectedScope);
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
                const storeDoc = await transaction.get(storeRef);
                if (!baseDoc.exists()) throw new Error("Base project not found");
                if (!storeDoc.exists()) throw new Error("Store not found");

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
                assertNoSpecialMenuScheduleConflict(summaryProjects, startTime, endTime);
                const storeData = storeDoc.data();
                const capabilities = getSpecialMenuCapabilities(
                    storeData.businessType,
                    storeData.businessCategory,
                );
                if (!capabilities.availableModes.includes(mode)) {
                    throw new Error("Special menu mode is not available for this business type");
                }

                const activeMenuId = typeof storeData.activeSpecialMenuId === "string"
                    ? storeData.activeSpecialMenuId
                    : null;
                let hasLiveCompetingActiveMenu = false;
                if (activateImmediately && activeMenuId) {
                    const competingScope = normalizeMultiOutletProjectId(activeMenuId);
                    if (
                        competingScope
                        && competingScope.tId === scope.tId
                        && competingScope.sId === scope.sId
                    ) {
                        const competingProjectDoc = await transaction.get(doc(
                            firebaseClient,
                            DATA_COLLECTION,
                            String(scope.tId),
                            String(scope.sId),
                            competingScope.projectId,
                        ));
                        hasLiveCompetingActiveMenu = competingProjectDoc.exists()
                            && Boolean(resolveLiveSpecialMenuProject(competingProjectDoc.data(), {
                                now,
                                projectId: competingScope.projectId,
                                sId: scope.sId,
                                tId: scope.tId,
                            }));
                    }
                }
                if (hasLiveCompetingActiveMenu) {
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
                    startsAt: normalizedStartsAt,
                    endsAt: normalizedEndsAt,
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
                    specialMenuStartsAt: normalizedStartsAt,
                    specialMenuEndsAt: normalizedEndsAt,
                    specialMenuMode: mode,
                    specialMenuBaseProjectId: baseProjectId,
                };
                const specialMenuNextTransitionAt = resolveNextSpecialMenuTransitionAt({
                    ...summaryProjects,
                    [newProjectId]: summaryData,
                });

                transaction.set(projectRef, newProjectData);
                transaction.set(summaryRef, {
                    lastUpdated: serverTimestamp(),
                    specialMenuNextTransitionAt: specialMenuNextTransitionAt || deleteField(),
                    ...buildSummaryProjectPayload(newProjectId, summaryData),
                }, { merge: true });
                if (activateImmediately) {
                    const storeUpdate: Record<string, unknown> = { activeSpecialMenuId: newProjectId };
                    if (FEATURE_FLAGS.ENABLE_TEMP_STATUS) {
                        storeUpdate.tempStatus = {
                            type: "special_menu",
                            message: trimmedName,
                            expiresAt: normalizedEndsAt,
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
    projectId: string;
    description?: string;
    displayName: string;
    localizedDescription?: Record<string, string>;
    localizedDisplayName?: Record<string, string>;
    endsAt: string;
    startsAt: string;
}, expectedScope?: SpecialMenuExpectedScope) => {
    return await apiCallComposer(
        async () => {
            const { projectId, description, displayName, localizedDescription, localizedDisplayName, startsAt, endsAt } = params;
            const trimmedName = typeof displayName === "string" ? displayName.trim() : "";
            const trimmedDescription = typeof description === "string" ? description.trim() : undefined;
            const normalizedLocalizedDisplayName = normalizeSpecialMenuLocalizedInput(localizedDisplayName, 100);
            const normalizedLocalizedDescription = normalizeSpecialMenuLocalizedInput(localizedDescription, 300);
            const {
                endTime,
                endsAt: normalizedEndsAt,
                startTime,
                startsAt: normalizedStartsAt,
            } = parseSpecialMenuDateRange(startsAt, endsAt);
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
            assertExpectedSpecialMenuScope(scope, expectedScope);
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
                assertNoSpecialMenuScheduleConflict(summaryProjects, startTime, endTime, projectId);

                const nextStatus: SpecialMenuStatus = startTime <= now.getTime() ? "active" : "scheduled";
                const storeData = storeDoc.exists() ? storeDoc.data() : {};
                const activeMenuId = typeof storeData.activeSpecialMenuId === "string"
                    ? storeData.activeSpecialMenuId
                    : null;
                let hasLiveCompetingActiveMenu = false;
                if (nextStatus === "active" && activeMenuId && activeMenuId !== projectId) {
                    const competingScope = normalizeMultiOutletProjectId(activeMenuId);
                    if (
                        competingScope
                        && competingScope.tId === scope.tId
                        && competingScope.sId === scope.sId
                    ) {
                        const competingProjectDoc = await transaction.get(doc(
                            firebaseClient,
                            DATA_COLLECTION,
                            String(scope.tId),
                            String(scope.sId),
                            competingScope.projectId,
                        ));
                        hasLiveCompetingActiveMenu = competingProjectDoc.exists()
                            && Boolean(resolveLiveSpecialMenuProject(competingProjectDoc.data(), {
                                now,
                                projectId: competingScope.projectId,
                                sId: scope.sId,
                                tId: scope.tId,
                            }));
                    }
                }
                if (hasLiveCompetingActiveMenu) {
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
                    endsAt: normalizedEndsAt,
                    startsAt: normalizedStartsAt,
                    status: nextStatus,
                    ...(nextStatus === "active"
                        ? { activatedAt: currentStatus === "active" && previousActivatedAt ? previousActivatedAt : now.toISOString() }
                        : {}),
                };
                const specialMenuNextTransitionAt = resolveNextSpecialMenuTransitionAt({
                    ...summaryProjects,
                    [projectId]: {
                        ...summaryProjects[projectId],
                        active: true,
                        deleted: false,
                        isSpecialMenu: true,
                        specialMenuDisplayName: resolvedLocalizedDisplayName,
                        specialMenuEndsAt: normalizedEndsAt,
                        specialMenuStartsAt: normalizedStartsAt,
                        specialMenuStatus: nextStatus,
                    },
                });

                transaction.set(projectRef, {
                    name: resolvedLocalizedDisplayName,
                    ...(trimmedDescription
                        ? { description: resolvedLocalizedDescription }
                        : { description: deleteField() }),
                    _specialMenu: nextMetadata,
                }, { merge: true });
                transaction.set(summaryDocRef, {
                    lastUpdated: serverTimestamp(),
                    specialMenuNextTransitionAt: specialMenuNextTransitionAt || deleteField(),
                    ...buildSummaryProjectFieldPayload(projectId, "name", resolvedLocalizedDisplayName),
                    ...buildSummaryProjectFieldPayload(projectId, "description", trimmedDescription ? resolvedLocalizedDescription : ""),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuDisplayName", resolvedLocalizedDisplayName),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuStartsAt", normalizedStartsAt),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuEndsAt", normalizedEndsAt),
                    ...buildSummaryProjectFieldPayload(projectId, "specialMenuStatus", nextStatus),
                }, { merge: true });

                if (nextStatus === "active") {
                    const storeUpdate: Record<string, unknown> = { activeSpecialMenuId: projectId };
                    if (FEATURE_FLAGS.ENABLE_TEMP_STATUS) {
                        storeUpdate.tempStatus = {
                            type: "special_menu",
                            message: trimmedName,
                            expiresAt: normalizedEndsAt,
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
export const activateSpecialMenu = async (
    projectId: string,
    expectedScope?: SpecialMenuExpectedScope,
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error("special_menu_scope_invalid");
            assertExpectedSpecialMenuScope(scope, expectedScope);
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
export const deactivateSpecialMenu = async (
    projectId: string,
    expectedScope?: SpecialMenuExpectedScope,
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error('special_menu_scope_invalid');
            assertExpectedSpecialMenuScope(scope, expectedScope);
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
export const cancelSpecialMenu = async (
    projectId: string,
    expectedScope?: SpecialMenuExpectedScope,
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = normalizeMenuChangeLogScope(session);
            if (!scope) throw new Error('special_menu_scope_invalid');
            assertExpectedSpecialMenuScope(scope, expectedScope);
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
