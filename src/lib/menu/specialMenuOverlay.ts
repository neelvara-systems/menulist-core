import type {
    ExtractedDataAttribute,
    ExtractedDataCategory,
    ExtractedDataItem,
    Project,
    ProjectFileType,
} from "@template/main-app/projects/types";

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeIdentity = (value: unknown): string => (
    typeof value === "string" ? value.trim() : ""
);

// FNV-1a gives stable, compact runtime IDs without persisting another mapping.
const stableHash = (value: string): string => {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
};

const createRuntimeId = (
    namespace: string,
    kind: "attribute" | "category" | "item",
    sourceIdentity: string,
    index: number,
): string => `sm_${namespace}_${kind[0]}_${stableHash(`${sourceIdentity}:${index}`)}`;

const getProjectDataRows = (project: Project): {
    categories: ExtractedDataCategory[];
    items: ExtractedDataItem[];
} => {
    const categories: ExtractedDataCategory[] = [];
    const items: ExtractedDataItem[] = [];

    for (const file of project.files || []) {
        const data = file.extractedData?.data;
        if (!data) continue;
        if (Array.isArray(data.categories)) categories.push(...data.categories);
        if (Array.isArray(data.items)) items.push(...data.items);
    }

    return { categories, items };
};

/**
 * Overlay projects store only owner-added rows. The file shell, language data,
 * and extraction context stay available to the existing editor.
 */
export const createSpecialMenuOverlayFiles = (
    files: ProjectFileType[] | undefined,
): ProjectFileType[] => {
    const overlayFiles = deepClone(files || []);
    for (const file of overlayFiles) {
        const data = file.extractedData?.data;
        if (!data) continue;
        data.categories = [];
        data.items = [];
    }
    return overlayFiles;
};

/**
 * Produces a public-only overlay projection. Persisted base and special-menu
 * documents remain unchanged. Legacy overlays that cloned the base menu are
 * deduplicated, while genuinely new rows receive deterministic runtime IDs so
 * they cannot collide with the base menu or another overlay.
 */
export const mergeSpecialMenuOverlayProjects = (
    baseProject: Project,
    specialProject: Project,
): Project => {
    const merged = deepClone(baseProject);
    const baseTarget = merged.files?.[0]?.extractedData?.data;
    const specialClone = deepClone(specialProject);
    const specialRows = getProjectDataRows(specialClone);
    if (!baseTarget || (specialRows.categories.length === 0 && specialRows.items.length === 0)) {
        return merged;
    }

    const baseRows = getProjectDataRows(baseProject);
    const baseCategoryIds = new Set(
        baseRows.categories.map((category) => normalizeIdentity(category.id)).filter(Boolean),
    );
    const baseItemIds = new Set(
        baseRows.items.map((item) => normalizeIdentity(item.id)).filter(Boolean),
    );
    const specialIdentity = normalizeIdentity(specialProject.projectId)
        || [
            normalizeIdentity(specialProject._specialMenu?.baseProjectId),
            normalizeIdentity(specialProject._specialMenu?.startsAt),
            normalizeIdentity(specialProject._specialMenu?.endsAt),
        ].join(":");
    const namespace = stableHash(specialIdentity || "special-menu-overlay");

    const categoryIdMap = new Map<string, string>();
    const acceptedCategoryIds = new Set<string>();
    const overlayCategories: ExtractedDataCategory[] = [];
    for (let index = 0; index < specialRows.categories.length; index += 1) {
        const category = specialRows.categories[index];
        const sourceId = normalizeIdentity(category.id);
        if (!sourceId || baseCategoryIds.has(sourceId) || acceptedCategoryIds.has(sourceId)) continue;

        const runtimeId = createRuntimeId(namespace, "category", sourceId, index);
        acceptedCategoryIds.add(sourceId);
        categoryIdMap.set(sourceId, runtimeId);
        overlayCategories.push({
            ...category,
            id: runtimeId,
            extractionIdAliases: undefined,
            _isSpecialSection: true,
        });
    }

    const acceptedItemIds = new Set<string>();
    const overlayItems: ExtractedDataItem[] = [];
    for (let index = 0; index < specialRows.items.length; index += 1) {
        const item = specialRows.items[index];
        const sourceId = normalizeIdentity(item.id);
        const sourceCategoryId = normalizeIdentity(item.category);
        if (!sourceId || baseItemIds.has(sourceId) || acceptedItemIds.has(sourceId)) continue;

        const runtimeCategoryId = categoryIdMap.get(sourceCategoryId)
            || (baseCategoryIds.has(sourceCategoryId) ? sourceCategoryId : null);
        if (!runtimeCategoryId) continue;

        const runtimeItemId = createRuntimeId(namespace, "item", sourceId, index);
        let attributes: ExtractedDataAttribute[] | undefined;
        if (Array.isArray(item.attributes)) {
            attributes = [];
            for (let attributeIndex = 0; attributeIndex < item.attributes.length; attributeIndex += 1) {
                const attribute = item.attributes[attributeIndex];
                const sourceAttributeId = normalizeIdentity(attribute.id);
                if (!sourceAttributeId) continue;
                attributes.push({
                    ...attribute,
                    id: createRuntimeId(
                        namespace,
                        "attribute",
                        `${sourceId}:${sourceAttributeId}`,
                        attributeIndex,
                    ),
                });
            }
        }

        acceptedItemIds.add(sourceId);
        overlayItems.push({
            ...item,
            id: runtimeItemId,
            category: runtimeCategoryId,
            extractionIdAliases: undefined,
            ...(attributes ? { attributes } : {}),
            _isSpecialSection: true,
        });
    }

    baseTarget.categories = [...(baseTarget.categories || []), ...overlayCategories];
    baseTarget.items = [...(baseTarget.items || []), ...overlayItems];
    return merged;
};
