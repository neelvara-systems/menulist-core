import { FEATURE_FLAGS } from "@config/features";
import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
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
    logMenuChange,
    logMenuChanges,
} from "@database/menuChangeLog";
import {
    getBoundedProjectPersistenceStringContext,
    getProjectPersistenceProjectLogContext,
    logProjectPersistenceFailure,
    logProjectPersistenceInfo,
    type ProjectPersistenceLogContext,
} from "@database/projects/diagnostics";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
import { uploadPreparedMediaImage } from "@database/storage/uploadPreparedMediaImage";
import {
    collection,
    deleteField,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    where,
    writeBatch,
} from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { apiCallComposerClientWithoutLoader } from "@lib/apiHelper/apiCallComposerClientWithoutLoader";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { logMCEValidationFailure, logMCEValidationResult } from "@lib/mce/diagnostics";
import {
    getLocalizedText,
    getPrimaryLocalizedLanguage,
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
    buildSummaryProjectFieldPayload,
    buildSummaryProjectPayload,
} from "@lib/firestore/summaryProjectsWriter";
import { revalidatePublicClientCacheForProject } from "@lib/cache/publicClientCache";
import { getMenuDesignPresetPatch, getRecommendedMenuDesignPresets } from "@lib/menu/menuDesignPresets";
import {
    LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES,
    LINKED_OUTLET_SAVE_REQUEST_POLICY,
    isLinkedOutletSaveResponse,
    readLinkedOutletSaveResponseJson,
} from "@lib/multiOutlet/linkedOutletSaveResponse";
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
function extractItemsMap(project: Project): Record<string, ExtractedDataItem> {
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
    project: Project,
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
});

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
    oldProject: Project | null,
    newProject: Partial<Project>,
): Promise<void> {
    // COST GATE: Check feature flag first
    if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION) {
        return;
    }

    try {
        const oldItems = oldProject ? extractItemsMap(oldProject) : {};
        const newItems = extractItemsMap(newProject as Project);
        const summary = createEmptyMenuRevisionSummary(oldItems, newItems);
        const affectedItems = new Set<string>();
        const detailedEntries: MenuChangeLogInput[] = [];
        const shouldWriteDetailed = FEATURE_FLAGS.MENU_OBSERVATION_MODE === "detailed";

        const recordChange = (
            entry: MenuChangeLogInput,
            summaryKey: Parameters<typeof addMenuRevisionSummaryChange>[2],
            itemId: string,
        ) => {
            addMenuRevisionSummaryChange(summary, affectedItems, summaryKey, entry.changeType, itemId);
            if (shouldWriteDetailed) {
                detailedEntries.push(entry);
            }
        };

        // Infrastructure Compounding 10.2: Check if item was recently extracted
        // Items with _extractedAt within 24h get EXTRACTION_CORRECTION events
        const EXTRACTION_CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
        const isRecentlyExtracted = (item: any): boolean => {
            if (!FEATURE_FLAGS.ENABLE_EXTRACTION_LEARNING) return false;
            if (!item?._extractedAt) return false;
            const extractedAt = item._extractedAt?.toDate?.() ?? new Date(item._extractedAt);
            return (Date.now() - extractedAt.getTime()) < EXTRACTION_CORRECTION_WINDOW_MS;
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
                    recordChange(
                        createExtractionCorrectionEntry(
                            projectId, itemId, 'price',
                            oldItem.price, newItem.price,
                            (oldItem as any).confidence?.price,
                        ),
                        'extractionCorrections',
                        itemId,
                    );
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
                recordChange(
                    createExtractionCorrectionEntry(
                        projectId, itemId, 'name',
                        oldName, newName,
                        (oldItem as any).confidence?.name,
                    ),
                    'extractionCorrections',
                    itemId,
                );
                summary.nameCorrections += 1;
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
            await logMenuChanges(detailedEntries);
            return;
        }

        await logMenuChange(createMenuRevisionSummaryEntry(projectId, summary, "OWNER", undefined, {
            source: "project_update",
        }));
    } catch (error) {
        // Fire-and-forget - silent fail, don't block project update
        logProjectPersistenceFailure('project_change_detection_failed', error, {
            ...getProjectPersistenceProjectLogContext(projectId),
            oldProjectPresent: Boolean(oldProject),
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
    projectData: Project,
): Promise<void> {
    try {
        const sess = await getActiveSession();
        if (!sess?.tId || !sess?.sId) return;

        const items = extractItemsMap(projectData);
        const categories = extractCategoriesMap(projectData);
        const retentionDays = Number(FEATURE_FLAGS.MENU_SNAPSHOT_RETENTION_DAYS || 90);
        const createdAt = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(
            createdAt.toMillis() + retentionDays * 24 * 60 * 60 * 1000,
        );

        const snapshotRef = collection(
            firebaseClient,
            `${DB_COLLECTIONS.MENU_SNAPSHOTS}/${sess.tId}/${sess.sId}`,
        );

        const { addDoc: addDocFn } = await import("@firebase/firestore");
        await addDocFn(snapshotRef, {
            projectId,
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
        });

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

// ═══════════════════════════════════════════════════════════════
// DOCUMENT REFERENCES
// ═══════════════════════════════════════════════════════════════

const getDataCollectionRef = async () => {
    const session = await getActiveSession();
    return collection(
        firebaseClient,
        `${DATA_COLLECTION}/${session.tId}/${session.sId}`,
    );
};

const getDataDocRef = async (projectId: string) => {
    const session = await getActiveSession();
    return doc(
        firebaseClient,
        `${DATA_COLLECTION}/${session.tId}/${session.sId}`,
        projectId,
    );
};

/**
 * Get reference to projectsSummary document for current store
 * Document path: platformSummary/projects_{sId}
 */
const getProjectsSummaryDocRef = async () => {
    const session = await getActiveSession();
    return doc(firebaseClient, PLATFORM_SUMMARY, `projects_${session.sId}`);
};

const extractProjectsSummaryMap = (
    summaryDocData?: Record<string, any> | null,
): Record<string, ProjectSummaryData> => {
    if (!summaryDocData) return {};

    const nestedProjects = summaryDocData.projects;
    if (nestedProjects && typeof nestedProjects === "object" && !Array.isArray(nestedProjects)) {
        return nestedProjects as Record<string, ProjectSummaryData>;
    }

    return Object.fromEntries(
        Object.entries(summaryDocData)
            .filter(([key]) => key.startsWith("projects."))
            .map(([key, value]) => [key.replace("projects.", ""), value as ProjectSummaryData]),
    );
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

const writeProjectSummary = async (
    projectId: string,
    data: ProjectSummaryData,
    options: ProjectSummaryWriteOptions = {},
) => {
    const docRef = await getProjectsSummaryDocRef();
    const cleanData = stripUndefinedProjectSummaryFields(data) as ProjectSummaryData;
    const handoff = buildProjectDefaultHandoffSummaryPayload(projectId, options);

    await setDoc(
        docRef,
        {
            lastUpdated: serverTimestamp(),
            ...buildSummaryProjectPayload(projectId, cleanData),
            ...handoff.payload,
        },
        { merge: true },
    );

    const cacheContext = options.cacheContext || 'syncProjectToSummary';
    await Promise.all(
        Array.from(new Set([projectId, ...handoff.projectIds]))
            .map((cacheProjectId) => revalidatePublicClientCacheForProject(cacheProjectId, cacheContext)),
    );

    return { projectId, ...cleanData };
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
    excludeProjectId?: string,
): Promise<boolean> => {
    if (!proposedSlug) return false;
    const normalized = proposedSlug.toLowerCase();

    try {
        const dataRef = await getDataCollectionRef();
        const deletedQuery = query(
            dataRef,
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
        // Fail-open on infrastructure errors — create/rename validation is
        // a best-effort guard, not a security boundary. Log for visibility.
        logProjectPersistenceFailure('deleted_project_slug_reservation_check_failed', error, {
            ...getBoundedProjectPersistenceStringContext('slug', normalized),
            slugReservationWindowDays: SLUG_RESERVATION_WINDOW_MS / (24 * 60 * 60 * 1000),
        });
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
            const docRef = await getProjectsSummaryDocRef();
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? extractProjectsSummaryMap(docSnap.data() as Record<string, any>) : {};
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
            return await writeProjectSummary(projectId, data, {
                ...options,
                cacheContext: options?.cacheContext || "syncProjectToSummary",
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
            const docRef = await getProjectsSummaryDocRef();
            await setDoc(
                docRef,
                {
                    lastUpdated: serverTimestamp(),
                    [`projects.${projectId}`]: deleteField(),
                },
                { merge: true },
            );
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
            let projectId = data.projectId;
            if (!projectId) {
                const sess = await getActiveSession();
                const timestamp = Date.now().toString(36);
                projectId = `${sess.tId}-${timestamp}-${sess.sId}`;
            }

            // Create project data (main document)
            const projectData = await requestBodyComposer({
                projectId,
                files: [],
                ...normalizeProjectLanguagePolicy({
                    languages: (data as any).languages || [],
                    defaultLanguage: (data as any).defaultLanguage || projectLanguage,
                }),
                // Lifecycle flags (for Cloud Function query efficiency)
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
            });

            // Save to projects collection (merge to avoid overwriting backend-saved data)
            const dataRef = doc(await getDataCollectionRef(), projectId);
            await setDoc(dataRef, projectData, { merge: true });

            // Generate permanent URL slug (URL Routing Architecture — ADR-3)
            // Auto-generated from name on creation. Stored permanently.
            let projectSlug = data.slug || slugify(resolvedName || "untitled");
            // Validate: block reserved slugs
            if (isReservedProjectSlug(projectSlug)) {
                projectSlug = `${projectSlug}-menu`;
            }
            // T1-N-04 / A-12: block reuse of any slug held by a project that
            // was soft-deleted within the last 90 days (including its
            // previousSlugs[] chain). Suffix with a timestamp to stay unique.
            if (await isSlugReservedByRecentlyDeleted(projectSlug)) {
                projectSlug = `${projectSlug}-${Date.now().toString(36)}`;
            }

            // Sync to projectsSummary (1 write for efficient listing)
            // Note: Firestore rejects undefined values — omit fields that may be undefined
            const summaryData: ProjectSummaryData = {
                name: localizedName || { [CANONICAL_SOURCE_LANGUAGE]: "Untitled" },
                ...(localizedDescription != null ? { description: localizedDescription } : {}),
                ...(data.projectImage !== undefined ? { projectImage: data.projectImage } : {}),
                ...(businessCategory ? { businessCategory } : {}),
                ...(data.businessType ? { businessType: data.businessType } : {}),
                active: isActive,
                isDefault: data.isDefault ?? false,
                slug: projectSlug,
            };
            await writeProjectSummary(projectId, summaryData, {
                defaultHandoff: options.defaultHandoff,
                cacheContext: "addProject",
            });

            // Propagation hook (Feature #4C): Auto-create outlet projects
            if (FEATURE_FLAGS.ENABLE_PROJECT_PROPAGATION) {
                try {
                    const { propagateNewProjectToOutlets } = await import(
                        "@database/multiOutlet/propagation"
                    );
                    const sess = await getActiveSession();
                    await propagateNewProjectToOutlets(sess.tId, sess.sId, projectId, resolvedName);
                } catch (e) {
                    // Non-blocking: log but don't fail project creation
                    logProjectPersistenceFailure('project_outlet_propagation_create_failed', e, {
                        ...getProjectPersistenceProjectLogContext(projectId),
                        ...getBoundedProjectPersistenceStringContext('projectName', resolvedName),
                    });
                }
            }

            return { projectId, projectData, summaryData };
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
            // Get current summary to merge updates
            const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
            const summaryMap = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
                : {};
            const currentSummary: Partial<ProjectSummaryData> = summaryMap[projectId] || {};
            const textLanguage = resolveProjectTextLanguage(currentSummary.name, 'en');
            const nextName = typeof data.name === 'string'
                ? updateLocalizedText(currentSummary.name, data.name, textLanguage, 'en')
                : toLocalizedText(data.name as any, textLanguage);
            const nextDescription = typeof data.description === 'string'
                ? updateLocalizedText(currentSummary.description, data.description, textLanguage, 'en')
                : toLocalizedText(data.description as any, textLanguage);
            const currentName = resolveProjectSummaryName(currentSummary.name, "Untitled");
            const resolvedNextName = resolveProjectSummaryName(nextName, currentName);

            // URL Routing: Handle slug changes when name changes
            let slugUpdate: Partial<ProjectSummaryData> = {};
            if (data.name && resolvedNextName !== currentName) {
                const newSlug = slugify(resolvedNextName);
                const oldSlug = currentSummary?.slug;

                // Only update slug if it actually changed and new slug is valid
                if (oldSlug && newSlug !== oldSlug && newSlug && !isReservedProjectSlug(newSlug)) {
                    // T1-N-04 / A-12: if the newly derived slug is reserved
                    // by a project soft-deleted in the last 90 days, refuse
                    // the rename rather than silently mutate the slug. The
                    // owner explicitly typed a new project name; silently
                    // appending a suffix would produce a URL they never saw.
                    if (await isSlugReservedByRecentlyDeleted(newSlug, projectId)) {
                        throw new Error(
                            'This name is temporarily unavailable because a recently deleted menu used it. Please choose a different name or wait until the previous URL is released.',
                        );
                    }
                    const existingPrevious = currentSummary?.previousSlugs || [];
                    // Cap at 5 entries — oldest drops off (URL Routing Architecture spec)
                    const updatedPrevious = [...existingPrevious, oldSlug].slice(-5);
                    slugUpdate = {
                        slug: newSlug,
                        previousSlugs: updatedPrevious,
                    };
                } else if (!oldSlug && newSlug && !isReservedProjectSlug(newSlug)) {
                    // Backfill: project had no slug, assign one now.
                    // Same 90-day reservation check applies so backfill
                    // cannot resurrect a just-deleted sibling's URL.
                    if (await isSlugReservedByRecentlyDeleted(newSlug, projectId)) {
                        throw new Error(
                            'This name is temporarily unavailable because a recently deleted menu used it. Please choose a different name or wait until the previous URL is released.',
                        );
                    }
                    slugUpdate = { slug: newSlug };
                }
            }

            // Special Menu Guard: Prevent special menu from becoming default project
            if (data.isDefault === true && FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING) {
                if (currentSummary?.isSpecialMenu) {
                    throw new Error("A special menu cannot be set as the default project.");
                }
            }

            const updatedSummary: ProjectSummaryData = {
                ...currentSummary,
                ...data,
                ...slugUpdate,
                ...(nextName !== undefined ? { name: nextName } : {}),
                ...(nextDescription !== undefined ? { description: nextDescription } : {}),
                name: nextName ?? currentSummary.name ?? { [CANONICAL_SOURCE_LANGUAGE]: "Untitled" },
                active: data.active ?? currentSummary.active ?? true,
            };

            await writeProjectSummary(projectId, updatedSummary, {
                defaultHandoff: options.defaultHandoff,
                defaultHandoffSummaryMap: summaryMap,
                cacheContext: "updateProjectMetadata",
            });
            return { projectId, ...updatedSummary };
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
    data = stripGeneratedProjectReadModels(data);

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
            const docRef = await getDataDocRef(data.projectId);
            const docSnap = await getDoc(docRef);
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
            const result = mceValidate({
                projectData: data as Record<string, any>,
                isOutlet: !!oldProject?.masterProjectId,
                masterProjectId: oldProject?.masterProjectId,
                oldProjectData: oldProject as Record<string, any> | undefined,
            });
            // Merge verification metadata into save data
            (data as any)._mce = toMCEMetadata(result);
            logMCEValidationResult(result);
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
        if (data.projectId) {
            detectAndLogChanges(data.projectId, oldProject, data);
        }

        return updateData;
    }

    const updateData = await requestBodyComposer(data);
    await setDoc(await getDataDocRef(data.projectId), updateData, {
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
    if (data.projectId) {
        detectAndLogChanges(data.projectId, oldProject, data);
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
            const session = await getActiveSession();

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
                tId: session.tId,
                sId: session.sId,
                projectId: data.projectId as string,
                actorUserId: session.uId,
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
        runUpdateProject,
        data,
        "updateProject",
    );
};

export const updateProjectWithoutLoader = async (data: Partial<Project>) => {
    return await apiCallComposerClientWithoutLoader(
        runUpdateProject,
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
            const projectDocRef = await getDataDocRef(projectId);

            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && active === false) {
                const projectSnap = await getDoc(projectDocRef);
                const projectData = projectSnap.exists() ? projectSnap.data() as Project : null;

                if (projectData?.masterProjectId) {
                    const { parseProjectId } = await import("@lib/multiOutlet/resolveProject");
                    const { DEFAULT_OUTLET_POLICY } = await import("@type/multiOutlet.types");
                    const { sId: masterStoreId } = parseProjectId(projectData.masterProjectId);
                    const session = await getActiveSession();
                    const hasMasterStoreAuthority = Number(session?.sId) === Number(masterStoreId)
                        || (Array.isArray(session?.user?.stores)
                            && session.user.stores.some((store: any) => Number(store?.storeId) === Number(masterStoreId)));

                    if (!hasMasterStoreAuthority) {
                        const masterStoreSnap = await getDoc(doc(firebaseClient, DB_COLLECTIONS.STORES, String(masterStoreId)));
                        const outletPolicy = {
                            ...DEFAULT_OUTLET_POLICY,
                            ...(masterStoreSnap.data()?.outletPolicy || {}),
                        };

                        if (outletPolicy.allowProjectDeactivate === false) {
                            throw new Error("Deactivating inherited outlet projects is not enabled for this store.");
                        }
                    }
                }
            }

            // Update project document
            await setDoc(projectDocRef, { active }, { merge: true });

            // Keep projects summary in sync without reading the full summary doc.
            await setDoc(
                await getProjectsSummaryDocRef(),
                {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectFieldPayload(projectId, "active", active),
                },
                { merge: true },
            );
            await revalidatePublicClientCacheForProject(projectId, "setProjectActive");

            return { projectId, active };
        },
        { projectId, active },
        "setProjectActive",
    );
};

/**
 * Remove a time slot preset reference from all categories in all projects
 * Called when a preset is deleted from Business Settings
 */
export const removePresetFromAllCategories = async (presetId: string) => {
    return await apiCallComposer(
        async () => {
            // Get all projects for current store
            const dataRef = await getDataCollectionRef();
            const snapshot = await getDocs(dataRef);

            let updatedCount = 0;
            let pendingBatchWrites = 0;
            let batch = writeBatch(firebaseClient);
            const modifiedProjectIds: string[] = [];
            const PROJECT_PRESET_CASCADE_BATCH_LIMIT = 450;

            const commitPendingProjectPresetWrites = async () => {
                if (!pendingBatchWrites) return;
                await batch.commit();
                batch = writeBatch(firebaseClient);
                pendingBatchWrites = 0;
            };

            for (const docSnap of snapshot.docs) {
                const project = docSnap.data() as Project;
                let projectModified = false;

                // Check each file's categories
                if (project.files?.length) {
                    for (const file of project.files) {
                        if (file.extractedData?.data?.categories?.length) {
                            for (const category of file.extractedData.data.categories) {
                                if (category.timeSlots?.some((s) => s.presetId === presetId)) {
                                    // Remove time slots that reference this preset
                                    category.timeSlots = category.timeSlots.filter(
                                        (s) => s.presetId !== presetId,
                                    );
                                    projectModified = true;
                                }
                            }
                        }
                    }
                }

                // Save if modified
                if (projectModified) {
                    batch.set(docSnap.ref, project, { merge: true });
                    modifiedProjectIds.push(project.projectId);
                    updatedCount++;
                    pendingBatchWrites++;

                    if (pendingBatchWrites >= PROJECT_PRESET_CASCADE_BATCH_LIMIT) {
                        await commitPendingProjectPresetWrites();
                    }
                }
            }

            await commitPendingProjectPresetWrites();
            await Promise.all(
                modifiedProjectIds
                    .filter(Boolean)
                    .map((projectId) => revalidatePublicClientCacheForProject(projectId, "removePresetFromAllCategories")),
            );

            return { success: true, updatedProjects: updatedCount } satisfies ProjectPresetCascadeUpdateResult;
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
            const presetId = String(preset?.id || '').trim();
            if (!presetId) return { success: false, updatedProjects: 0 };

            const dataRef = await getDataCollectionRef();
            const snapshot = await getDocs(dataRef);
            let updatedCount = 0;

            for (const docSnap of snapshot.docs) {
                const project = docSnap.data() as Project;
                let projectModified = false;

                if (project.files?.length) {
                    for (const file of project.files) {
                        const categories = file.extractedData?.data?.categories;
                        if (!categories?.length) continue;

                        for (const category of categories) {
                            if (!Array.isArray(category.timeSlots)) continue;

                            let categoryModified = false;
                            const nextTimeSlots = category.timeSlots.map((slot) => {
                                if (slot?.presetId !== presetId) return slot;
                                const nextSlot = {
                                    ...slot,
                                    endTime: preset.endTime,
                                    startTime: preset.startTime,
                                };
                                if (slot.endTime !== nextSlot.endTime || slot.startTime !== nextSlot.startTime) {
                                    categoryModified = true;
                                }
                                return nextSlot;
                            });

                            if (categoryModified) {
                                category.timeSlots = nextTimeSlots;
                                projectModified = true;
                            }
                        }
                    }
                }

                if (projectModified) {
                    await setDoc(await getDataDocRef(project.projectId), project, {
                        merge: true,
                    });
                    await revalidatePublicClientCacheForProject(project.projectId, "updatePresetInAllCategories");
                    updatedCount++;
                }
            }

            return { success: true, updatedProjects: updatedCount } satisfies ProjectPresetCascadeUpdateResult;
        },
        { presetId: preset?.id },
        "updatePresetInAllCategories",
    );
};

export const publishProject = async (data: Partial<Project>) => {
    return await apiCallComposer(
        async () => {
            // T14: Multi-outlet chain validation - ensure master exists before publish
            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && data.masterProjectId) {
                // Parse master project ID to get correct tId/sId for the master
                const { parseProjectId } =
                    await import("@lib/multiOutlet/resolveProject");
                const { tId: masterTId, sId: masterSId } = parseProjectId(
                    data.masterProjectId,
                );

                const session = await getActiveSession();

                // Security: Validate master is within same tenant
                if (masterTId !== session.tId) {
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

            const updatedData = await requestBodyComposer(data);

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
                return result.project;
            }

            const { increment } = await import("@firebase/firestore");
            updatedData.menuVersion = increment(1);
            updatedData.lastPublishedAt = Timestamp.now();

            await setDoc(await getDataDocRef(data.projectId), updatedData, {
                merge: true,
            });
            await revalidatePublicClientCacheForProject(data.projectId, "publishProject");

            // ═══════════════════════════════════════════════════════════════
            // CANONICAL TRUTH: Post-publish events (all fire-and-forget)
            // ═══════════════════════════════════════════════════════════════

            // 1. Log PUBLISH event to MOL (append-only change log)
            if (FEATURE_FLAGS.ENABLE_MENU_OBSERVATION && data.projectId) {
                try {
                    const items = extractItemsMap(data as Project);
                    const categories = extractCategoriesMap(data as Project);
                    await logMenuChange({
                        projectId: data.projectId,
                        changeType: "PUBLISH",
                        oldValue: null,
                        newValue: {
                            itemCount: Object.keys(items).length,
                            categoryCount: Object.keys(categories).length,
                        },
                        changedBy: "OWNER",
                    });
                } catch (e) {
                    logProjectPersistenceFailure('menu_observation_publish_event_failed', e, {
                        ...getProjectPersistenceProjectLogContext(data.projectId, data.masterProjectId),
                    });
                }
            }

            // 2. Create immutable menu snapshot
            if (FEATURE_FLAGS.ENABLE_MENU_SNAPSHOTS && data.projectId) {
                createMenuSnapshot(data.projectId, data as Project);
            }

            return updatedData;
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
    // Get all projects from summary (1 read)
    const summaryDocRef = await getProjectsSummaryDocRef();
    const summaryDoc = await getDoc(summaryDocRef);
    const projectsMap = summaryDoc.exists()
        ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
        : {};

    const projects = Object.entries(projectsMap)
        .map(([projectId, data]) => normalizeProjectReadState({
            projectId,
            ...(data as ProjectSummaryData),
        }))
        .filter((p) => includeInactive || p.active !== false);

    if (projects.length === 0) {
        const sess = await getActiveSession();
        const projectId = `${sess.tId}-default-${sess.sId}`;
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
    const summaryDocRef = await getProjectsSummaryDocRef();
    const summaryDoc = await getDoc(summaryDocRef);
    const projectsMap = summaryDoc.exists()
        ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
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
            // Query projects collection for deleted projects
            const dataRef = await getDataCollectionRef();
            const projectsQuery = query(
                dataRef,
                where("deleted", "==", true),
                limit(50),
            );
            const snapshot = await getDocs(projectsQuery);

            const projects = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    projectId: doc.id,
                    name: getLocalizedText(data.name, undefined, getPrimaryLocalizedLanguage(data.name), "Untitled"),
                    deleted: true,
                    deletedAt: data.deletedAt,
                };
            });

            return { projects };
        },
        null,
        "getDeletedProjectsList",
    );
};

const getProjectDataCore = async (projectId: string): Promise<Project> => {
    const docRef = await getDataDocRef(projectId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return normalizeProjectReadState(docSnap.data() as Project) as Project;
    }

    const legacyDocRef = doc(firebaseClient, DATA_COLLECTION, projectId);
    const legacyDocSnap = await getDoc(legacyDocRef);
    if (legacyDocSnap.exists()) {
        return normalizeProjectReadState(legacyDocSnap.data() as Project) as Project;
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
            const docRef = doc(
                firebaseClient,
                `${DATA_COLLECTION}/${tId}/${sId}`,
                projectId,
            );
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return normalizeProjectReadState(docSnap.data() as Project) as Project;
            }

            const legacyDocRef = doc(firebaseClient, DATA_COLLECTION, projectId);
            const legacyDocSnap = await getDoc(legacyDocRef);
            if (legacyDocSnap.exists()) {
                return normalizeProjectReadState(legacyDocSnap.data() as Project) as Project;
            }

            throw new Error(`Project not found: ${projectId} in store ${sId}`);
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
            const [summaryDoc, projectDoc] = await Promise.all([
                getDoc(await getProjectsSummaryDocRef()),
                getDoc(await getDataDocRef(projectId)),
            ]);

            if (!projectDoc.exists()) {
                return null;
            }

            const summaryData: Partial<ProjectSummaryData> = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)[projectId] || {}
                : {};
            const projectData = projectDoc.data();

            return {
                projectId,
                ...normalizeProjectReadState(summaryData as any),
                projectData: normalizeProjectReadState(projectData as any),
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
            const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
            const summaryProjects = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
                : {};
            const currentSummary = summaryProjects[projectId];
            const wasDefaultProject = currentSummary?.isDefault === true;
            const fallbackDefaultEntry = wasDefaultProject
                ? Object.entries(summaryProjects).find(([candidateProjectId, candidateSummary]) => (
                    candidateProjectId !== projectId &&
                    candidateSummary?.isSpecialMenu !== true &&
                    candidateSummary?.active !== false
                )) || Object.entries(summaryProjects).find(([candidateProjectId, candidateSummary]) => (
                    candidateProjectId !== projectId &&
                    candidateSummary?.isSpecialMenu !== true
                )) || null
                : null;

            // Multi-Outlet Protection: Block deletion of inherited projects (Feature #4C)
            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
                const projSnap = await getDoc(await getDataDocRef(projectId));
                if (projSnap.exists() && projSnap.data()?.masterProjectId) {
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

            // Special Menu Guard: Block deletion if non-expired special menus reference this as base
            if (FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING) {
                for (const [smId, smData] of Object.entries(summaryProjects) as [string, any][]) {
                    if (
                        smData.isSpecialMenu &&
                        smData.specialMenuBaseProjectId === projectId &&
                        smData.specialMenuStatus !== "expired" &&
                        smData.specialMenuStatus !== "cancelled"
                    ) {
                        throw new Error(
                            `Cannot delete this project: It is referenced by special menu "${getLocalizedText(
                                smData.specialMenuDisplayName,
                                undefined,
                                resolveProjectTextLanguage(smData.specialMenuDisplayName, 'en'),
                                smId,
                            )}". ` +
                            "Cancel or wait for the special menu to expire first.",
                        );
                    }
                }
            }

            const deletedSummary = currentSummary
                ? stripUndefinedProjectSummaryFields(currentSummary)
                : {};
            const updateData = {
                deleted: true,
                deletedAt: Timestamp.now(),
                active: false,
                ...(Object.keys(deletedSummary).length ? { deletedSummary } : {}),
            };
            const dataDocRef = await getDataDocRef(projectId);
            const summaryDocRef = await getProjectsSummaryDocRef();
            const summaryUpdate: Record<string, any> = {
                lastUpdated: serverTimestamp(),
                [`projects.${projectId}`]: deleteField(),
            };

            if (wasDefaultProject && fallbackDefaultEntry) {
                const [fallbackProjectId, fallbackSummary] = fallbackDefaultEntry;
                const fallbackDefaultSummary = Object.fromEntries(
                    Object.entries({
                        ...fallbackSummary,
                        isDefault: true,
                        active: fallbackSummary.active ?? true,
                        name: fallbackSummary.name || 'Untitled',
                    }).filter(([, value]) => value !== undefined),
                ) as unknown as ProjectSummaryData;

                Object.assign(summaryUpdate, buildSummaryProjectPayload(fallbackProjectId, fallbackDefaultSummary));
            }

            const batch = writeBatch(firebaseClient);
            batch.set(dataDocRef, updateData, { merge: true });
            batch.set(summaryDocRef, summaryUpdate, { merge: true });
            await batch.commit();

            await revalidatePublicClientCacheForProject(projectId, "deleteProject");

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
            // Get project data to restore summary info
            const [projectDoc, summaryDoc] = await Promise.all([
                getDoc(await getDataDocRef(projectId)),
                getDoc(await getProjectsSummaryDocRef()),
            ]);
            if (!projectDoc.exists()) {
                throw new Error("Project not found");
            }

            const summaryProjects = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
                : {};

            // Restore project flags
            const updateData = {
                deleted: false,
                deletedAt: null,
                active: true,
                deletedSummary: deleteField(),
            };
            await setDoc(await getDataDocRef(projectId), updateData, { merge: true });

            const projectData = projectDoc.data();
            const deletedSummary = (
                projectData.deletedSummary &&
                typeof projectData.deletedSummary === 'object' &&
                !Array.isArray(projectData.deletedSummary)
            )
                ? projectData.deletedSummary as Partial<ProjectSummaryData>
                : {};
            const restoreSource: Partial<ProjectSummaryData> = Object.keys(deletedSummary).length
                ? deletedSummary
                : projectData as Partial<ProjectSummaryData>;
            const hasCurrentDefaultProject = Object.entries(summaryProjects).some(
                ([candidateProjectId, candidateSummary]) => (
                    candidateProjectId !== projectId &&
                    candidateSummary?.isDefault === true &&
                    candidateSummary?.active !== false &&
                    candidateSummary?.isSpecialMenu !== true
                ),
            );
            const shouldRestoreAsDefault = restoreSource.isDefault === true && !hasCurrentDefaultProject;

            // Re-add to projectsSummary from the delete tombstone. Older deleted
            // docs may not have it, so fall back to fields present on project data.
            const restoredSummary = stripUndefinedProjectSummaryFields({
                ...restoreSource,
                name: restoreSource.name || projectData.name || "Restored Project",
                active: true,
                isDefault: shouldRestoreAsDefault,
            });
            await syncProjectToSummary(projectId, restoredSummary as ProjectSummaryData);

            // Security Audit: Log project restoration
            logger.security('Project Restored', {
                projectId,
                action: 'RESTORE_PROJECT',
                projectName: restoreSource.name || projectData.name || 'unknown',
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
            // 1. Get original project data and summary
            const [projectDoc, summaryDoc] = await Promise.all([
                getDoc(await getDataDocRef(projectId)),
                getDoc(await getProjectsSummaryDocRef()),
            ]);

            if (!projectDoc.exists()) {
                throw new Error("Project not found");
            }

            const originalData = projectDoc.data() as Project;
            if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && originalData.masterProjectId) {
                throw new Error("Inherited outlet projects cannot be duplicated. Create a local menu instead.");
            }

            const originalSummary: Partial<ProjectSummaryData> = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)[projectId] || {}
                : {};
            const textLanguage = resolveProjectTextLanguage(originalSummary.name, 'en');
            const localizedName = localizedNameInput || updateLocalizedText(undefined, newName, textLanguage, 'en');
            const localizedDescription = localizedDescriptionInput || (newDescription
                ? updateLocalizedText(undefined, newDescription, textLanguage, 'en')
                : updateLocalizedText(
                    undefined,
                    `Copy of ${resolveProjectSummaryName(originalSummary?.name, "project")}`,
                    textLanguage,
                    'en',
                ));

            // 2. Generate new project ID
            const sess = await getActiveSession();
            const timestamp = Date.now().toString(36);
            const newProjectId = `${sess.tId}-${timestamp}-${sess.sId}`;
            let projectSlug = slugify(resolveProjectSummaryName(localizedName, newName || 'untitled'));
            if (isReservedProjectSlug(projectSlug)) {
                projectSlug = `${projectSlug}-menu`;
            }
            if (await isSlugReservedByRecentlyDeleted(projectSlug)) {
                projectSlug = `${projectSlug}-${timestamp}`;
            }

            // 3. Deep clone project data
            const newProjectData = await requestBodyComposer({
                ...originalData,
                projectId: newProjectId,
                active: true,
                deleted: false,
                isDefault: false,
                previousSlugs: [],
                slug: projectSlug,
                ...normalizeProjectLanguagePolicy({
                    languages: originalData.languages || [],
                    defaultLanguage: originalData.defaultLanguage,
                }),
            });

            // 4. Save to projects collection
            await setDoc(await getDataDocRef(newProjectId), newProjectData);

            // 5. Add to projectsSummary
            const summaryData: ProjectSummaryData = {
                name: localizedName || { [CANONICAL_SOURCE_LANGUAGE]: newName.trim() || 'Untitled' },
                description: localizedDescription,
                projectImage: originalSummary.projectImage ?? null,
                active: true,
                isDefault: false,
                slug: projectSlug,
            };
            await syncProjectToSummary(newProjectId, summaryData);

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

/**
 * Get the Firestore reference for a store document (for store-level field updates)
 */
const getStoreDocRef = async () => {
    const session = await getActiveSession();
    return doc(firebaseClient, DB_COLLECTIONS.STORES, `${session.sId}`);
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
            const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
            const projects = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
                : {};

            const specialMenus = Object.entries(projects)
                .filter(([, data]: [string, any]) => data.isSpecialMenu === true)
                .map(([projectId, data]: [string, any]) => ({
                    projectId,
                    displayName: getLocalizedText(
                        data.specialMenuDisplayName || data.name,
                        undefined,
                        resolveProjectTextLanguage(data.specialMenuDisplayName || data.name),
                        'Untitled',
                    ),
                    description: getLocalizedText(
                        data.description,
                        undefined,
                        resolveProjectTextLanguage(data.description),
                        '',
                    ) || undefined,
                    status: (data.specialMenuStatus || "scheduled") as 'scheduled' | 'active' | 'expired' | 'cancelled',
                    mode: (data.specialMenuMode || "overlay") as 'replace' | 'overlay',
                    startsAt: data.specialMenuStartsAt as string,
                    endsAt: data.specialMenuEndsAt as string,
                    baseProjectId: data.specialMenuBaseProjectId as string | undefined,
                }))
                .sort((a, b) => {
                    const order: Record<string, number> = { active: 0, scheduled: 1, expired: 2, cancelled: 3 };
                    const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
                    if (diff !== 0) return diff;
                    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
                });

            // Get active menu ID from store doc
            const storeDoc = await getDoc(await getStoreDocRef());
            const activeMenuId = storeDoc.exists()
                ? storeDoc.data()?.activeSpecialMenuId || null
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

            const startDate = new Date(startsAt);
            const endDate = new Date(endsAt);
            const now = new Date();

            if (endDate.getTime() <= startDate.getTime()) {
                throw new Error("End date must be after start date");
            }
            if (endDate.getTime() <= now.getTime()) {
                throw new Error("End date must be in the future");
            }

            // 1. Get base project
            const baseDoc = await getDoc(await getDataDocRef(baseProjectId));
            if (!baseDoc.exists()) {
                throw new Error("Base project not found");
            }
            const baseData = baseDoc.data() as Project;

            // 2. Check schedule conflicts (one-active constraint)
            const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
            const summaryProjects = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
                : {};

            if (!allowOverlap) {
                for (const [, projData] of Object.entries(summaryProjects) as [string, any][]) {
                    if (
                        projData.isSpecialMenu &&
                        projData.specialMenuStatus !== "expired" &&
                        projData.specialMenuStatus !== "cancelled"
                    ) {
                        const existingStart = new Date(projData.specialMenuStartsAt).getTime();
                        const existingEnd = new Date(projData.specialMenuEndsAt).getTime();
                        if (startDate.getTime() < existingEnd && endDate.getTime() > existingStart) {
                            throw new Error(
                                `Schedule conflicts with "${getLocalizedText(
                                    projData.specialMenuDisplayName || projData.name,
                                    undefined,
                                    resolveProjectTextLanguage(projData.specialMenuDisplayName || projData.name),
                                    'Untitled',
                                )}" (${projData.specialMenuStartsAt} — ${projData.specialMenuEndsAt})`,
                            );
                        }
                    }
                }
            }

            // 3. Generate new project ID + clone
            const sess = await getActiveSession();
            const timestamp = Date.now().toString(36);
            const newProjectId = `${sess.tId}-${timestamp}-${sess.sId}`;
            const baseLanguages = normalizeProjectLanguages(baseData.languages || []);
            const baseDefaultLanguage = normalizeProjectLanguagePolicy({
                languages: baseLanguages,
                defaultLanguage: baseData.defaultLanguage,
            }).defaultLanguage;
            const textLanguage = baseLanguages[0] || CANONICAL_SOURCE_LANGUAGE;
            const resolvedLocalizedDisplayName = localizedDisplayName || updateLocalizedText(undefined, displayName, textLanguage, 'en')
                || { [textLanguage]: displayName.trim() };

            const specialMenuMetadata: SpecialMenuMetadata = {
                baseProjectId,
                mode,
                startsAt,
                endsAt,
                status: "scheduled",
                displayName: resolvedLocalizedDisplayName,
            };

            const newProjectData = await requestBodyComposer({
                projectId: newProjectId,
                files: baseData.files || [],
                languages: baseLanguages,
                defaultLanguage: baseDefaultLanguage,
                config: baseData.config || {},
                menuSettings: baseData.menuSettings || {},
                active: true,
                deleted: false,
                _specialMenu: specialMenuMetadata,
            });

            // 4. Write project doc
            await setDoc(await getDataDocRef(newProjectId), newProjectData);

            // 5. Sync to projectsSummary
            const summaryData: ProjectSummaryData = {
                name: resolvedLocalizedDisplayName,
                description: updateLocalizedText(undefined, `Special menu: ${displayName}`, textLanguage, 'en'),
                projectImage: summaryProjects[baseProjectId]?.projectImage ?? null,
                active: true,
                isDefault: false,
                isSpecialMenu: true,
                specialMenuDisplayName: resolvedLocalizedDisplayName,
                specialMenuStatus: "scheduled",
                specialMenuStartsAt: startsAt,
                specialMenuEndsAt: endsAt,
                specialMenuMode: mode,
                specialMenuBaseProjectId: baseProjectId,
            };
            await syncProjectToSummary(newProjectId, summaryData);

            // 6. If startsAt is now or past, activate immediately
            if (startDate.getTime() <= now.getTime()) {
                await activateSpecialMenuInternal(newProjectId, mode, endsAt, displayName);
                summaryData.specialMenuStatus = "active";
                await syncProjectToSummary(newProjectId, summaryData);
            }

            return { projectId: newProjectId, summaryData };
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
            const trimmedName = displayName.trim();
            const trimmedDescription = description?.trim();
            const startDate = new Date(startsAt);
            const endDate = new Date(endsAt);
            const now = new Date();

            if (!trimmedName) {
                throw new Error("Special menu name is required");
            }
            if (endDate.getTime() <= startDate.getTime()) {
                throw new Error("End date must be after start date");
            }
            if (endDate.getTime() <= now.getTime()) {
                throw new Error("End date must be in the future");
            }

            const projectRef = await getDataDocRef(projectId);
            const projectDoc = await getDoc(projectRef);
            if (!projectDoc.exists()) throw new Error("Project not found");

            const projectData = projectDoc.data() as Project;
            if (!projectData._specialMenu) throw new Error("Not a special menu project");
            const textLanguage = getCanonicalProjectSourceLanguage(projectData.languages)
                || resolveProjectTextLanguage(projectData._specialMenu.displayName, 'en');
            const resolvedLocalizedDisplayName = localizedDisplayName || updateLocalizedText(
                projectData._specialMenu.displayName,
                trimmedName,
                textLanguage,
                'en',
            ) || { [textLanguage]: trimmedName };
            const resolvedLocalizedDescription = localizedDescription || (trimmedDescription
                ? updateLocalizedText(projectData.description, trimmedDescription, textLanguage, 'en')
                : undefined);

            const currentStatus = projectData._specialMenu.status;
            if (currentStatus === "expired" || currentStatus === "cancelled") {
                throw new Error(`Cannot edit a ${currentStatus} special menu`);
            }

            const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
            const summaryProjects = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
                : {};

            if (!allowOverlap) {
                for (const [otherProjectId, projData] of Object.entries(summaryProjects) as [string, any][]) {
                    if (otherProjectId === projectId) continue;
                    if (
                        projData.isSpecialMenu &&
                        projData.specialMenuStatus !== "expired" &&
                        projData.specialMenuStatus !== "cancelled"
                    ) {
                        const existingStart = new Date(projData.specialMenuStartsAt).getTime();
                        const existingEnd = new Date(projData.specialMenuEndsAt).getTime();
                        if (startDate.getTime() < existingEnd && endDate.getTime() > existingStart) {
                            throw new Error(
                                `Schedule conflicts with "${getLocalizedText(
                                    projData.specialMenuDisplayName || projData.name,
                                    undefined,
                                    resolveProjectTextLanguage(projData.specialMenuDisplayName || projData.name),
                                    'Untitled',
                                )}" (${projData.specialMenuStartsAt} — ${projData.specialMenuEndsAt})`,
                            );
                        }
                    }
                }
            }

            const nextStatus: SpecialMenuStatus = startDate.getTime() <= now.getTime() ? "active" : "scheduled";
            const storeRef = await getStoreDocRef();

            if (nextStatus === "active") {
                const storeDoc = await getDoc(storeRef);
                const activeMenuId = storeDoc.data()?.activeSpecialMenuId;
                if (activeMenuId && activeMenuId !== projectId) {
                    throw new Error("Another special menu is currently active. Deactivate it first.");
                }
            }

            await setDoc(projectRef, {
                name: resolvedLocalizedDisplayName,
                ...(trimmedDescription ? { description: resolvedLocalizedDescription } : { description: deleteField() }),
                _specialMenu: {
                    ...projectData._specialMenu,
                    displayName: resolvedLocalizedDisplayName,
                    endsAt,
                    startsAt,
                    status: nextStatus,
                },
            }, { merge: true });

            const summaryDocRef = await getProjectsSummaryDocRef();
            await setDoc(summaryDocRef, {
                ...buildSummaryProjectFieldPayload(projectId, 'name', resolvedLocalizedDisplayName),
                ...buildSummaryProjectFieldPayload(projectId, 'description', trimmedDescription ? resolvedLocalizedDescription : ''),
                ...buildSummaryProjectFieldPayload(projectId, 'specialMenuDisplayName', resolvedLocalizedDisplayName),
                ...buildSummaryProjectFieldPayload(projectId, 'specialMenuStartsAt', startsAt),
                ...buildSummaryProjectFieldPayload(projectId, 'specialMenuEndsAt', endsAt),
                ...buildSummaryProjectFieldPayload(projectId, 'specialMenuStatus', nextStatus),
            }, { merge: true });

            if (nextStatus === "active") {
                await activateSpecialMenuInternal(
                    projectId,
                    projectData._specialMenu.mode,
                    endsAt,
                    trimmedName,
                );
                await setDoc(summaryDocRef, {
                    ...buildSummaryProjectFieldPayload(projectId, 'specialMenuStatus', "active"),
                }, { merge: true });
            } else if (currentStatus === "active") {
                await setDoc(storeRef, {
                    activeSpecialMenuId: deleteField(),
                }, { merge: true });

                const storeDoc = await getDoc(storeRef);
                if (storeDoc.data()?.tempStatus?.type === "special_menu") {
                    await setDoc(storeRef, { tempStatus: deleteField() }, { merge: true });
                }
            }
            await revalidatePublicClientCacheForProject(projectId, "updateSpecialMenuProject");

            return { projectId, status: nextStatus };
        },
        params,
        "updateSpecialMenuProject",
    );
};

/**
 * Internal: activate a special menu (update project + store + temp status)
 */
async function activateSpecialMenuInternal(
    projectId: string,
    _mode: string,
    endsAt: string,
    displayName: string,
) {
    const now = new Date().toISOString();

    // Update project status
    const projectRef = await getDataDocRef(projectId);
    await setDoc(projectRef, {
        "_specialMenu.status": "active",
        "_specialMenu.activatedAt": now,
    }, { merge: true });

    // Update store with active special menu reference
    const storeRef = await getStoreDocRef();
    const storeUpdate: Record<string, any> = {
        activeSpecialMenuId: projectId,
    };

    // Auto-set temp status banner
    if (FEATURE_FLAGS.ENABLE_TEMP_STATUS) {
        storeUpdate.tempStatus = {
            type: "special_menu",
            message: displayName,
            expiresAt: endsAt,
            createdAt: now,
        };
    }

    await setDoc(storeRef, storeUpdate, { merge: true });
    await revalidatePublicClientCacheForProject(projectId, "activateSpecialMenuInternal");
}

/**
 * Activate a scheduled special menu.
 * Sets project status to 'active' and updates store with active menu reference.
 */
export const activateSpecialMenu = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            const projectDoc = await getDoc(await getDataDocRef(projectId));
            if (!projectDoc.exists()) throw new Error("Project not found");

            const data = projectDoc.data() as Project;
            if (!data._specialMenu) throw new Error("Not a special menu project");
            if (data._specialMenu.status === "active") {
                return { success: true, projectId, status: "active", message: "Already active" };
            }
            if (data._specialMenu.status !== "scheduled") {
                throw new Error(`Cannot activate a ${data._specialMenu.status} special menu`);
            }

            // Check no other active special menu
            const storeDoc = await getDoc(await getStoreDocRef());
            if (storeDoc.data()?.activeSpecialMenuId && storeDoc.data()?.activeSpecialMenuId !== projectId) {
                throw new Error("Another special menu is currently active. Deactivate it first.");
            }

            await activateSpecialMenuInternal(
                projectId,
                data._specialMenu.mode,
                data._specialMenu.endsAt,
                getLocalizedText(
                    data._specialMenu.displayName,
                    data.languages?.[0] || 'en',
                    getPrimaryLocalizedLanguage(data._specialMenu.displayName, data.languages?.[0] || 'en'),
                    'Special Menu',
                ),
            );

            // Update summary
            const summaryDocRef = await getProjectsSummaryDocRef();
            await setDoc(summaryDocRef, {
                [`projects.${projectId}.specialMenuStatus`]: "active",
            }, { merge: true });
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
            const projectDoc = await getDoc(await getDataDocRef(projectId));
            if (!projectDoc.exists()) throw new Error("Project not found");

            const data = projectDoc.data() as Project;
            if (!data._specialMenu) throw new Error("Not a special menu project");
            if (data._specialMenu.status !== "active") {
                throw new Error(`Cannot deactivate a ${data._specialMenu.status} special menu`);
            }

            const now = new Date().toISOString();

            // Update project status
            const projectRef = await getDataDocRef(projectId);
            await setDoc(projectRef, {
                "_specialMenu.status": "expired",
                "_specialMenu.deactivatedAt": now,
            }, { merge: true });

            // Clear store active special menu fields
            const storeRef = await getStoreDocRef();
            await setDoc(storeRef, {
                activeSpecialMenuId: deleteField(),
            }, { merge: true });

            // Clear temp status banner if it was special_menu type
            const storeDoc = await getDoc(storeRef);
            if (storeDoc.data()?.tempStatus?.type === "special_menu") {
                await setDoc(storeRef, { tempStatus: deleteField() }, { merge: true });
            }

            // Update summary
            const summaryDocRef = await getProjectsSummaryDocRef();
            await setDoc(summaryDocRef, {
                [`projects.${projectId}.specialMenuStatus`]: "expired",
            }, { merge: true });
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
            const projectDoc = await getDoc(await getDataDocRef(projectId));
            if (!projectDoc.exists()) throw new Error("Project not found");

            const data = projectDoc.data() as Project;
            if (!data._specialMenu) throw new Error("Not a special menu project");
            if (data._specialMenu.status !== "scheduled") {
                throw new Error(`Cannot cancel a ${data._specialMenu.status} special menu. Only scheduled menus can be cancelled.`);
            }

            const projectRef = await getDataDocRef(projectId);
            await setDoc(projectRef, {
                "_specialMenu.status": "cancelled",
                "_specialMenu.deactivatedAt": new Date().toISOString(),
            }, { merge: true });

            // Update summary
            const summaryDocRef = await getProjectsSummaryDocRef();
            await setDoc(summaryDocRef, {
                [`projects.${projectId}.specialMenuStatus`]: "cancelled",
            }, { merge: true });
            await revalidatePublicClientCacheForProject(projectId, "cancelSpecialMenu");

            return { success: true, projectId, status: "cancelled" };
        },
        projectId,
        "cancelSpecialMenu",
    );
};
