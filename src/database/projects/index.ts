import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { isReservedProjectSlug } from "@constant/reservedSlugs";
import {
    createActiveChangeEntry,
    createAvailabilityChangeEntry,
    createExtractionCorrectionEntry,
    createItemAddedEntry,
    createItemRemovedEntry,
    createPriceChangeEntry,
    logMenuChange,
} from "@database/menuChangeLog";
import uploadBase64ToStorage from "@database/storage/uploadBase64ToStorage";
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
} from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { apiCallComposerClientWithoutLoader } from "@lib/apiHelper/apiCallComposerClientWithoutLoader";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
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

const DATA_COLLECTION = DB_COLLECTIONS.PROJECTS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

// ═══════════════════════════════════════════════════════════════
// MENU OBSERVATION LAYER (MOL v0) - Change Detection
// Silent infrastructure - NO UI, NO owner visibility
// @see __docs__/internal-tracking/MOL-V0-IMPLEMENTATION-PLAN.md
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
                await logMenuChange(createItemAddedEntry(projectId, itemId, newItem));
                continue;
            }

            const wasExtracted = isRecentlyExtracted(oldItem);

            // Check price change
            if (oldItem.price !== newItem.price) {
                if (wasExtracted) {
                    // 10.2: Log as extraction correction instead of regular price change
                    await logMenuChange(
                        createExtractionCorrectionEntry(
                            projectId, itemId, 'price',
                            oldItem.price, newItem.price,
                            (oldItem as any).confidence?.price,
                        ),
                    );
                } else {
                    await logMenuChange(
                        createPriceChangeEntry(
                            projectId,
                            itemId,
                            oldItem.price,
                            newItem.price,
                        ),
                    );
                }
            }

            // Check name change (10.2: also track for extraction corrections)
            const oldName = oldItem.name ? Object.values(oldItem.name)[0] : '';
            const newName = newItem.name ? Object.values(newItem.name)[0] : '';
            if (wasExtracted && oldName !== newName && oldName && newName) {
                await logMenuChange(
                    createExtractionCorrectionEntry(
                        projectId, itemId, 'name',
                        oldName, newName,
                        (oldItem as any).confidence?.name,
                    ),
                );
            }

            // Check availability change
            if (oldItem.available !== newItem.available) {
                await logMenuChange(
                    createAvailabilityChangeEntry(
                        projectId,
                        itemId,
                        oldItem.available,
                        newItem.available,
                    ),
                );
            }

            // Check active status change
            if (oldItem.active !== newItem.active) {
                await logMenuChange(
                    createActiveChangeEntry(
                        projectId,
                        itemId,
                        oldItem.active,
                        newItem.active,
                    ),
                );
            }
        }

        // Detect removed items
        for (const [itemId, oldItem] of Object.entries(oldItems)) {
            if (!newItems[itemId]) {
                await logMenuChange(createItemRemovedEntry(projectId, itemId, oldItem));
            }
        }
    } catch (error) {
        // Fire-and-forget - silent fail, don't block project update
        console.warn("[MOL] Change detection error (non-blocking):", error);
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
            createdAt: Timestamp.now(),
        });

        console.debug("[Snapshot] Menu snapshot created for", projectId);
    } catch (error) {
        // Fire-and-forget — snapshot failure never blocks publish
        console.warn("[Snapshot] Failed to create menu snapshot (non-blocking):", error);
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
 * @see __docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md §A-12, T1-N-04
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
        console.warn('[SlugReservation] Check failed (fail-open):', error);
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
) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getProjectsSummaryDocRef();
            // Firestore rejects undefined values — strip them before writing
            const cleanData = Object.fromEntries(
                Object.entries(data).filter(([, v]) => v !== undefined)
            ) as ProjectSummaryData;
            await setDoc(
                docRef,
                {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectPayload(projectId, cleanData),
                },
                { merge: true },
            );
            await revalidatePublicClientCacheForProject(projectId, "syncProjectToSummary");
            return { projectId, ...cleanData };
        },
        { projectId, data },
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

export const uploadProjectFile = async (
    data: any,
    type = "",
    projectId: string,
    fileId: string,
) => {
    let newUrl: any = "";
    let fileType: any = data.fileType;
    let fileToUpdate: any = data.fileToUpdate;
    const docId = `${projectId}/${fileId}`;

    if (fileToUpdate) {
        if (fileToUpdate?.includes("base64")) {
            newUrl = await uploadBase64ToStorage({
                fileId: docId,
                url: fileToUpdate,
                path: `${DATA_COLLECTION}/${type}/${docId}`,
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
}) => {
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
            const recommendedDesignPreset = getRecommendedMenuDesignPresets({
                businessCategory: data.businessCategory,
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
                active: isActive,
                isDefault: data.isDefault ?? false,
                slug: projectSlug,
            };
            await syncProjectToSummary(projectId, summaryData);

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
                    console.warn("[Propagation] Auto-create outlet projects failed (non-blocking):", e);
                }
            }

            return { projectId, projectData, summaryData };
        },
        data,
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

            await syncProjectToSummary(projectId, updatedSummary);
            return { projectId, ...updatedSummary };
        },
        { projectId, data },
        "updateProjectMetadata",
    );
};

const runUpdateProject = async (data: Partial<Project>) => {
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
            // Silent fail - don't block update
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
            // Lightweight internal logging (dev console only, no UI)
            console.log(`[MCE] verified=${result.verified} rules=${result.rulesPassed}/${result.rulesEvaluated} warnings=${result.warnings.length} errors=${result.errors.length}`);
        } catch (e) {
            // Silent fail — MCE failure never blocks owner
            console.warn("[MCE] Validation failed (non-blocking):", e);
        }
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
        } catch {
            // Silent fail - don't block update
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
            console.warn(
                "[MasterUpdateAwareness] Signal doc update failed (non-blocking):",
                e,
            );
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
            // Silent fail - don't block update
            console.warn("[MOL] Menu edit logging failed (non-blocking):", e);
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
            // Update project document
            await setDoc(await getDataDocRef(projectId), { active }, { merge: true });

            // Keep projects summary in sync immediately (source for selectors)
            const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
            const summaryMap = summaryDoc.exists()
                ? extractProjectsSummaryMap(summaryDoc.data() as Record<string, any>)
                : {};
            const currentSummary: Partial<ProjectSummaryData> = summaryMap[projectId] || {};

            await syncProjectToSummary(projectId, {
                name: currentSummary.name || "Untitled",
                description: currentSummary.description,
                projectImage: currentSummary.projectImage ?? null,
                active,
                isDefault: currentSummary.isDefault ?? false,
                slug: currentSummary.slug,
                previousSlugs: currentSummary.previousSlugs,
                isSpecialMenu: currentSummary.isSpecialMenu,
                specialMenuDisplayName: currentSummary.specialMenuDisplayName,
                specialMenuStatus: currentSummary.specialMenuStatus,
                specialMenuStartsAt: currentSummary.specialMenuStartsAt,
                specialMenuEndsAt: currentSummary.specialMenuEndsAt,
                specialMenuMode: currentSummary.specialMenuMode,
                specialMenuBaseProjectId: currentSummary.specialMenuBaseProjectId,
            });

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
                    await setDoc(await getDataDocRef(project.projectId), project, {
                        merge: true,
                    });
                    await revalidatePublicClientCacheForProject(project.projectId, "removePresetFromAllCategories");
                    updatedCount++;
                }
            }

            return { success: true, updatedProjects: updatedCount };
        },
        { presetId },
        "removePresetFromAllCategories",
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
                    console.warn("[Publish] MOL event failed (non-blocking):", e);
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
        await addProject(defaultProject);
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
    if (!docSnap.exists()) {
        throw new Error("Project not found");
    }
    return normalizeProjectReadState(docSnap.data() as Project) as Project;
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
            if (!docSnap.exists()) {
                throw new Error(`Project not found: ${projectId} in store ${sId}`);
            }
            return normalizeProjectReadState(docSnap.data() as Project) as Project;
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

    if (data.url) {
        if (data.url.includes("base64")) {
            //upload logo image to firebase storage
            fileUrl = await uploadBase64ToStorage({
                fileId: docId,
                url: data.url,
                path: `MenuListAi/project/${from}/${docId}`,
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
    return await apiCallComposer(
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

            // Mark project as deleted in projects collection
            const updateData = {
                deleted: true,
                deletedAt: Timestamp.now(),
                active: false,
            };
            await setDoc(await getDataDocRef(projectId), updateData, { merge: true });

            // Remove from projectsSummary (deleted projects don't appear in listing)
            await removeProjectFromSummary(projectId);

            if (wasDefaultProject && fallbackDefaultEntry) {
                const [fallbackProjectId, fallbackSummary] = fallbackDefaultEntry;
                await syncProjectToSummary(fallbackProjectId, {
                    ...fallbackSummary,
                    isDefault: true,
                    active: fallbackSummary.active ?? true,
                    name: fallbackSummary.name || 'Untitled',
                });
            }

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
};

export const restoreProject = async (projectId: string) => {
    return await apiCallComposer(
        async () => {
            // Get project data to restore summary info
            const projectDoc = await getDoc(await getDataDocRef(projectId));
            if (!projectDoc.exists()) {
                throw new Error("Project not found");
            }

            // Restore project flags
            const updateData = { deleted: false, deletedAt: null, active: true };
            await setDoc(await getDataDocRef(projectId), updateData, { merge: true });

            // Re-add to projectsSummary
            // Note: Firestore rejects undefined values — omit fields that may be undefined
            const projectData = projectDoc.data();
            await syncProjectToSummary(projectId, {
                name: projectData.name || "Restored Project",
                ...(projectData.description != null ? { description: projectData.description } : {}),
                active: true,
                isDefault: projectData.isDefault ?? false,
            });

            // Security Audit: Log project restoration
            logger.security('Project Restored', {
                projectId,
                action: 'RESTORE_PROJECT',
                projectName: projectData.name || 'unknown',
            }, 'low');

            return { projectId, ...updateData };
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

            // 3. Deep clone project data
            const newProjectData = await requestBodyComposer({
                ...originalData,
                projectId: newProjectId,
                active: true,
                deleted: false,
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
                    console.warn("[Propagation] Auto-create outlet projects for duplicate failed (non-blocking):", e);
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
// ONE-TIME BACKFILL (Delete after use)
// ═══════════════════════════════════════════════════════════════

/**
 * TEMPORARY: Backfill projectsSummary from existing projects
 *
 * This function migrates existing project data to the new projectsSummary pattern.
 * DELETE THIS FUNCTION after backfill is complete.
 *
 * Usage:
 * 1. Call from browser console or a temporary admin page
 * 2. Verify data in Firebase Console
 * 3. Delete this function
 */
export const backfillProjectsSummary = async () => {
    return await apiCallComposer(
        async () => {
            console.log("🔄 [backfillProjectsSummary] Starting migration...");

            // Get all projects from projects collection
            const dataRef = await getDataCollectionRef();
            const snapshot = await getDocs(dataRef);

            if (snapshot.empty) {
                console.log("ℹ️ [backfillProjectsSummary] No projects found");
                return { status: "empty", count: 0 };
            }

            console.log(
                `📦 [backfillProjectsSummary] Found ${snapshot.size} projects`,
            );

            // Build summary from projects data
            const summaryData: Record<string, ProjectSummaryData> = {};
            let activeCount = 0;
            let deletedCount = 0;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const projectId = data.projectId || docSnap.id;

                // Skip deleted projects (they shouldn't be in summary)
                if (data.deleted === true) {
                    deletedCount++;
                    console.log(`  ⏭️ Skipping deleted: ${projectId}`);
                    continue;
                }

                // Try to get name from project data, or use a default
                // Note: In old structure, name was in projectsMetadata
                // We'll need to fetch it or use projectId as fallback
                summaryData[projectId] = {
                    name: data.name || projectId.split("-")[1] || "Untitled",
                    description: data.description || "",
                    active: data.active !== false, // Default to true
                    isDefault: data.isDefault || projectId.includes("-default-"),
                };
                activeCount++;
                console.log(
                    `  ✅ Added: ${projectId} (${summaryData[projectId].name})`,
                );
            }

            // Save to projectsSummary
            const summaryRef = await getProjectsSummaryDocRef();
            await setDoc(summaryRef, {
                lastUpdated: serverTimestamp(),
                projects: summaryData,
            });

            return {
                status: "success",
                activeCount,
                deletedCount,
                projects: Object.keys(summaryData),
            };
        },
        null,
        "backfillProjectsSummary",
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
            if (data._specialMenu.status === "active") return { success: true, message: "Already active" };
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

            return { success: true };
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

            return { success: true };
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

            return { success: true };
        },
        projectId,
        "cancelSpecialMenu",
    );
};

// ═══════════════════════════════════════════════════════════════
// TEMPORARY: Expose backfill to window for browser console access
// DELETE THIS after backfill is complete
// ═══════════════════════════════════════════════════════════════
if (typeof window !== "undefined") {
    (window as any).__backfillProjectsSummary = backfillProjectsSummary;
}
