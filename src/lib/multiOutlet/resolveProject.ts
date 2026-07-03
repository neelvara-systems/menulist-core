/**
 * Multi-Store Project Resolver
 *
 * Core engine for resolving store menus at render time.
 * Merges master project data with store overrides and local-only items.
 *
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md Section 6
 */

import { FEATURE_FLAGS } from "@config/features";
import GlobalLanguagesList from "@data/languages";
import { getProjectDataByStore } from "@database/projects";
import { getMultiOutletProjectLogContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import {
    ExtractedDataCategory,
    ExtractedDataItem,
} from "@template/main-app/projects/types/extractedData.types";
import {
    Project,
    ProjectFileType,
    ProjectOverrides,
} from "@template/main-app/projects/types/project.types";
import { InheritanceState, ResolvedProjectMeta } from "@type/multiOutlet.types";

// ══════════════════════════════════════════════════════════════════════════
// MASTER PROJECT CACHE
// Short-lived in-memory cache to reduce Firestore reads when multiple
// outlets render in quick succession (e.g., admin viewing all outlets)
// ══════════════════════════════════════════════════════════════════════════

interface CacheEntry {
    project: Project;
    timestamp: number;
}

/** Cache TTL in milliseconds (30 seconds) */
const MASTER_CACHE_TTL_MS = 30 * 1000;

/** In-memory cache: masterProjectId -> CacheEntry */
const masterProjectCache = new Map<string, CacheEntry>();

function toExtractedDataLanguages(languages?: string[]) {
    return (languages || []).map((code, index) => {
        const language = GlobalLanguagesList.find(candidate => candidate.code === code);
        return {
            code,
            name: language?.name || code,
            isPrimary: index === 0,
        };
    });
}

/**
 * Get master project with caching
 * 
 * Reduces Firestore reads when multiple outlets resolve against same master.
 * Cache is short-lived (30s) to ensure near-instant propagation of master changes.
 * 
 * @returns Master project (from cache or fresh fetch)
 */
async function getCachedMasterProject(
    tId: number,
    masterStoreId: number,
    masterProjectId: string,
): Promise<Project> {
    const cached = masterProjectCache.get(masterProjectId);
    const now = Date.now();

    // Check if cache entry exists and is still valid
    if (cached && (now - cached.timestamp) < MASTER_CACHE_TTL_MS) {
        return cached.project;
    }

    // Fetch fresh and cache
    const masterProject = await getProjectDataByStore(tId, masterStoreId, masterProjectId);

    masterProjectCache.set(masterProjectId, {
        project: masterProject,
        timestamp: now,
    });

    // Cleanup: Remove stale entries (simple housekeeping)
    if (masterProjectCache.size > 100) {
        const keysToDelete: string[] = [];
        masterProjectCache.forEach((entry, key) => {
            if (now - entry.timestamp > MASTER_CACHE_TTL_MS) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => masterProjectCache.delete(key));
    }

    return masterProject;
}

/**
 * Populate master project cache with externally-fetched data.
 * Used by useMasterUpdateAwareness hook to share its fetched master
 * with the resolver — avoids duplicate Firestore reads.
 */
export function populateMasterCache(masterProjectId: string, project: Project): void {
    masterProjectCache.set(masterProjectId, {
        project,
        timestamp: Date.now(),
    });
}

/**
 * Invalidate master project cache
 * Call this when master project is updated to ensure outlets get fresh data
 */
export function invalidateMasterCache(masterProjectId: string): void {
    masterProjectCache.delete(masterProjectId);
}

/**
 * Clear entire master cache (for testing or admin operations)
 */
export function clearMasterCache(): void {
    masterProjectCache.clear();
}

// ══════════════════════════════════════════════════════════════════════════
// PROJECT ID PARSING
// Extract tId and sId from projectId format: {tId}-{timestamp}-{sId}
// ══════════════════════════════════════════════════════════════════════════

/**
 * Extract tId and sId from projectId format: {tId}-{timestamp}-{sId}
 * This eliminates the need for passing these values separately.
 */
export function parseProjectId(projectId: string): {
    tId: number;
    sId: number;
} {
    const parts = projectId.split("-");
    return {
        tId: parseInt(parts[0], 10),
        sId: parseInt(parts[parts.length - 1], 10),
    };
}

/**
 * Extract only storeId from projectId
 */
export function extractStoreIdFromProjectId(projectId: string): number {
    const parts = projectId.split("-");
    return parseInt(parts[parts.length - 1], 10);
}

// ══════════════════════════════════════════════════════════════════════════
// RESOLVED PROJECT TYPE
// Extended Project with ephemeral resolution metadata
// ══════════════════════════════════════════════════════════════════════════

export interface ResolvedProject extends Project {
    _resolved?: ResolvedProjectMeta;
}

interface ResolveParams {
    /** Pass existing project data to avoid redundant Firestore reads */
    storeProject: Project;
}

// ══════════════════════════════════════════════════════════════════════════
// CORE RESOLVER
// Main entry point for resolving a project for rendering
// ══════════════════════════════════════════════════════════════════════════

/**
 * Resolve a project for rendering
 *
 * If store is linked to master:
 * 1. Load master project (only Firebase read - store data is passed in)
 * 2. Merge master items with store overrides
 * 3. Append store local-only items
 * 4. Return resolved project (not persisted)
 *
 * Cost: 0-1 Firestore reads (only master if linked)
 *
 * @param params.storeProject - Pass existing project data from React state
 *                              to avoid redundant Firestore reads
 */
export async function resolveProjectForRender(
    params: ResolveParams,
): Promise<ResolvedProject> {
    const { storeProject } = params;

    // Feature flag check
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return storeProject as ResolvedProject;
    }

    // If no masterProjectId, return as-is (master store or single-store)
    if (!storeProject.masterProjectId) {
        return {
            ...storeProject,
            _resolved: {
                isMasterLinked: false,
                itemStates: {},
                categoryStates: {},
            },
        };
    }

    // 2-READ ARCHITECTURE: Extract tId and sId from masterProjectId format
    const { tId, sId: masterStoreId } = parseProjectId(
        storeProject.masterProjectId,
    );

    // Use cached master to reduce Firestore reads (30s TTL)
    const masterProject = await getCachedMasterProject(
        tId,
        masterStoreId,
        storeProject.masterProjectId,
    );

    // Graceful handling: If master not found, return store as-is with warning
    if (!masterProject || !masterProject.files?.length) {
        logMultiOutletFailure('multi_outlet_master_project_missing', undefined, {
            ...getMultiOutletProjectLogContext(storeProject.projectId, storeProject.masterProjectId),
            masterProjectPresent: Boolean(masterProject),
            masterFileCount: masterProject?.files?.length ?? 0,
        });
        return {
            ...storeProject,
            _resolved: {
                isMasterLinked: false,
                masterProjectId: storeProject.masterProjectId,
                itemStates: {},
                categoryStates: {},
            },
        };
    }

    // Build resolved project
    return mergeProjects(masterProject, storeProject);
}

// ══════════════════════════════════════════════════════════════════════════
// PROJECT MERGER
// Combines master and store data into single resolved view
// ══════════════════════════════════════════════════════════════════════════

/**
 * Merge master + store into resolved view
 *
 * ⚠️ CONSTRAINT: Master-linked projects MUST be single-file menus.
 * Multi-file projects with master inheritance create complex merge scenarios
 * that risk dropping languages, images, or item ordering.
 *
 * Enforcement: linkStoreToMaster() validates both master and store are single-file.
 */
function mergeProjects(master: Project, store: Project): ResolvedProject {
    const overrides: ProjectOverrides = store.overrides || {
        items: {},
        categories: {},
        attributes: {},
    };
    const masterItems = extractItems(master);
    const masterCategories = extractCategories(master);
    const masterItemIds = new Set(masterItems.map((i) => i.id));
    const masterCategoryIds = new Set(masterCategories.map((c) => c.id));

    // Apply item overrides with CORRECT precedence:
    // 1. active=false → item hidden (highest priority)
    // 2. available=false → shown as unavailable
    // 3. else → shown normally
    const resolvedItems = masterItems
        .map((item) => {
            const override = overrides.items[item.id];
            if (!override) return item;

            return {
                ...item,
                price: override.price ?? item.price,
                description: override.description ?? item.description,
                images: override.images ?? item.images,
                available: override.available ?? item.available,
                active: override.active ?? item.active,
                orderIndex: override.orderIndex ?? item.orderIndex,
                isBestSeller: override.isBestSeller ?? item.isBestSeller,
                duration: override.duration ?? item.duration,
                ownerBoost: override.ownerBoost ?? item.ownerBoost,
            };
        })
        // Filter out items where active=false (hidden at this store)
        .filter((item) => item.active !== false);

    // Get local-only items from store (prefixed with L_I_)
    const storeItems = extractItems(store);
    const localOnlyItems = storeItems.filter(
        (item) => !masterItemIds.has(item.id),
    );

    // Apply category overrides
    const resolvedCategories = masterCategories.map((cat) => {
        const override = overrides.categories[cat.id];
        if (!override) return cat;

        return {
            ...cat,
            active: override.active ?? cat.active,
            timeSlots: override.timeSlots ?? cat.timeSlots,
        };
    });

    // Get local-only categories (prefixed with L_C_)
    const storeCategories = extractCategories(store);
    const localOnlyCategories = storeCategories.filter(
        (cat) => !masterCategoryIds.has(cat.id),
    );

    // Sort categories by override orderIndex if present
    const sortedCategories = [...resolvedCategories, ...localOnlyCategories].sort(
        (a, b) => {
            const orderA = overrides.categories[a.id]?.orderIndex ?? Infinity;
            const orderB = overrides.categories[b.id]?.orderIndex ?? Infinity;
            return orderA - orderB;
        },
    );
    const categoryRenderOrder = new Map(
        sortedCategories.map((category, index) => [String(category.id), index]),
    );
    const sortedItems = sortItemsWithinCategoryByOrder(
        [...resolvedItems, ...localOnlyItems],
        categoryRenderOrder,
    );

    // Build item states and track master prices for visual diff (FR-8, US-3)
    const itemStates: Record<string, InheritanceState> = {};
    const masterPrices: Record<string, string> = {};
    masterItems.forEach((item) => {
        const override = overrides.items[item.id];
        const hasOverride = Boolean(override);
        itemStates[item.id] = hasOverride ? "overridden" : "inherited";
        // Track master price if item has price override (for visual diff)
        if (hasOverride && override?.price !== undefined && item.price) {
            masterPrices[item.id] = item.price;
        }
    });
    localOnlyItems.forEach((item) => {
        itemStates[item.id] = "local-only";
    });

    // Build category states
    const categoryStates: Record<string, InheritanceState> = {};
    masterCategories.forEach((cat) => {
        const hasOverride = overrides.categories[cat.id];
        categoryStates[cat.id] = hasOverride ? "overridden" : "inherited";
    });
    localOnlyCategories.forEach((cat) => {
        categoryStates[cat.id] = "local-only";
    });

    // Return resolved project with merged data
    return {
        ...store,
        files: reconstructFiles(
            store,
            sortedItems,
            sortedCategories as ExtractedDataCategory[],
            master,
        ),
        _resolved: {
            isMasterLinked: true,
            masterProjectId: store.masterProjectId,
            itemStates,
            categoryStates,
            // Master's languages - outlets can only activate these (no new language creation)
            masterProjectLanguages: master.languages || [],
            // Master prices for overridden items - for visual diff (FR-8, US-3)
            masterPrices,
        },
    };
}

// ══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// Extract and reconstruct project data
// ══════════════════════════════════════════════════════════════════════════

/**
 * Extract all items from a project (across all files)
 */
function extractItems(project: Project): ExtractedDataItem[] {
    return (
        project.files?.flatMap((f) => f.extractedData?.data?.items || []) || []
    );
}

/**
 * Extract all categories from a project (across all files)
 */
function extractCategories(project: Project): ExtractedDataCategory[] {
    return (
        project.files?.flatMap((f) => f.extractedData?.data?.categories || []) || []
    );
}

function sortItemsWithinCategoryByOrder(
    items: ExtractedDataItem[],
    categoryRenderOrder: Map<string, number>,
): ExtractedDataItem[] {
    return items
        .map((item, originalIndex) => ({ item, originalIndex }))
        .sort((left, right) => {
            const leftCategoryId = String(left.item.category || "");
            const rightCategoryId = String(right.item.category || "");
            const leftCategoryOrder = categoryRenderOrder.get(leftCategoryId) ?? Number.POSITIVE_INFINITY;
            const rightCategoryOrder = categoryRenderOrder.get(rightCategoryId) ?? Number.POSITIVE_INFINITY;

            if (leftCategoryOrder !== rightCategoryOrder) {
                return leftCategoryOrder - rightCategoryOrder;
            }

            if (leftCategoryId === rightCategoryId) {
                const leftOrder = typeof left.item.orderIndex === "number"
                    ? left.item.orderIndex
                    : Number.POSITIVE_INFINITY;
                const rightOrder = typeof right.item.orderIndex === "number"
                    ? right.item.orderIndex
                    : Number.POSITIVE_INFINITY;

                if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            }

            return left.originalIndex - right.originalIndex;
        })
        .map(({ item }) => item);
}

/**
 * Reconstruct files array with merged items/categories
 *
 * CRITICAL: Preserve all file metadata to avoid breaking downstream consumers.
 * This function only replaces extractedData content, keeping all other fields.
 *
 * Implementation Notes:
 * - Uses store's file structure as base (preserves fileId, uploadInfo, etc.)
 * - Merges resolved items/categories into first file only
 * - Preserves languages from store (may differ from master)
 * - Multi-file projects: Only first file gets resolved data
 */
function reconstructFiles(
    store: Project,
    items: ExtractedDataItem[],
    categories: ExtractedDataCategory[],
    master?: Project,
): ProjectFileType[] {
    if (!store.files?.length) {
        const masterFirstFile = master?.files?.[0];

        return [{
            ...(masterFirstFile || {}),
            uid: masterFirstFile?.uid || `resolved-${store.projectId || store.masterProjectId || 'linked-menu'}`,
            extractedData: {
                ...(masterFirstFile?.extractedData || {}),
                data: {
                    ...(masterFirstFile?.extractedData?.data || {}),
                    items,
                    categories,
                    languages: masterFirstFile?.extractedData?.data?.languages
                        || toExtractedDataLanguages(store.languages),
                },
            },
        }];
    }

    // Preserve first file with all its metadata, only replace extractedData.data
    const firstFile = store.files[0];
    const resolvedFirstFile: ProjectFileType = {
        ...firstFile,
        extractedData: {
            ...firstFile.extractedData,
            data: {
                items,
                categories,
                // Preserve store's language configuration
                languages: firstFile.extractedData?.data?.languages || [],
            },
        },
    };

    // If store has multiple files, keep remaining files unchanged
    // (they may contain local-only data or store-specific content)
    if (store.files.length > 1) {
        return [resolvedFirstFile, ...store.files.slice(1)];
    }

    return [resolvedFirstFile];
}

// ══════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// Helper functions for working with resolved projects
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if a project is linked to a master
 */
export function isMasterLinked(project: ResolvedProject): boolean {
    return project._resolved?.isMasterLinked ?? false;
}

/**
 * Get inheritance state for an item
 */
export function getItemInheritanceState(
    project: ResolvedProject,
    itemId: string,
): InheritanceState | undefined {
    return project._resolved?.itemStates[itemId];
}

/**
 * Get inheritance state for a category
 */
export function getCategoryInheritanceState(
    project: ResolvedProject,
    categoryId: string,
): InheritanceState | undefined {
    return project._resolved?.categoryStates[categoryId];
}
