/**
 * Menu Correctness Engine (MCE) — Utilities
 *
 * Centralized sanitization utility extracted from
 * src/app/client/[[...slug]]/page.tsx for all surface data paths.
 *
 * INVARIANT: Any customer-facing render MUST pass through sanitizeForClient().
 * No surface may read project data and expose it to customers without calling
 * this function. This is a permanent rule.
 *
 * @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md §2.3
 */

/**
 * Strip internal editor metadata before sending to customer browser.
 * Prevents leaking AI processing costs, internal IDs, MCE metadata,
 * and inactive items to end users.
 *
 * Same logic as the original function in client/[[...slug]]/page.tsx,
 * extracted to shared location for all surface data paths.
 *
 * @param projectData - Raw project data from Firestore
 * @returns Sanitized project data safe for customer exposure
 */
export function sanitizeForClient(projectData: any): any {
    if (!projectData) return projectData;

    const sanitized = { ...projectData };

    // Strip project-level internal fields
    delete sanitized.masterProjectId;
    delete sanitized.overrides;
    delete sanitized.masterSnapshot;
    delete sanitized.deleted;
    delete sanitized.deletedAt;
    delete sanitized._mce; // MCE verification metadata — internal only
    delete sanitized.publicDecisionBlocks; // Passed separately as precomputedBlocks when needed

    // Sanitize files array
    if (sanitized.files && Array.isArray(sanitized.files)) {
        sanitized.files = sanitized.files
            // Remove deleted/inactive files entirely
            .filter((file: any) => file.active !== false && !file.deleted)
            .map((file: any) => {
                const cleanFile = { ...file };

                // Strip file-level AI processing metadata
                delete cleanFile.processingTime;
                delete cleanFile.inputToken;
                delete cleanFile.ouputToken;
                delete cleanFile.charges;
                delete cleanFile.chargePerToken;
                delete cleanFile.combinedWithFileId;
                delete cleanFile.deleted;
                delete cleanFile.deletedAt;

                // Sanitize extracted data
                if (cleanFile.extractedData?.data) {
                    const data = { ...cleanFile.extractedData.data };

                    // Filter out inactive items
                    if (data.items && Array.isArray(data.items)) {
                        data.items = data.items
                            .filter((item: any) => item.active !== false)
                            .map((item: any) => {
                                const cleanItem = { ...item };
                                delete cleanItem.sourceFileIndex;
                                delete cleanItem.descriptionSource; // Internal editor metadata — not for customers
                                delete cleanItem.ownerBoost; // Owner ranking control — internal editor state
                                delete cleanItem.qualityReview; // Price-review workflow metadata — internal only

                                if (cleanItem.decisionFacts && typeof cleanItem.decisionFacts === 'object') {
                                    cleanItem.decisionFacts = Object.fromEntries(
                                        Object.entries(cleanItem.decisionFacts)
                                            .flatMap(([key, fact]: [string, any]) => (
                                                fact && typeof fact === 'object' && fact.value !== undefined
                                                    ? [[key, { value: fact.value }]]
                                                    : []
                                            )),
                                    );
                                }

                                if (Array.isArray(cleanItem.attributes)) {
                                    cleanItem.attributes = cleanItem.attributes.filter(
                                        (attribute: any) => attribute?.active !== false,
                                    );
                                }

                                if (cleanItem.images !== undefined) {
                                    cleanItem.images = sanitizePublicImages(cleanItem.images);
                                }
                                return cleanItem;
                            });
                    }

                    // Filter out inactive categories
                    if (data.categories && Array.isArray(data.categories)) {
                        data.categories = data.categories
                            .filter((cat: any) => cat.active !== false)
                            .map((category: any) => ({
                                ...category,
                                ...(category?.images !== undefined
                                    ? { images: sanitizePublicImages(category.images) }
                                    : {}),
                            }));
                    }

                    cleanFile.extractedData = {
                        data: {
                            categories: Array.isArray(data.categories) ? data.categories : [],
                            items: Array.isArray(data.items) ? data.items : [],
                            languages: Array.isArray(data.languages) ? data.languages : [],
                        },
                    };
                }

                // Source upload identifiers, URLs, names, sizes, and extraction
                // diagnostics are not required by the customer renderer.
                return {
                    ...(cleanFile.extractedData !== undefined ? { extractedData: cleanFile.extractedData } : {}),
                };
            });
    }

    // Explicit top-level projection prevents newly-added editor, AI, billing,
    // linked-outlet, or workflow fields from silently reaching the browser.
    const publicProjectFields = [
        'projectId',
        'id',
        'name',
        'description',
        'defaultLanguage',
        'files',
        'languages',
        'config',
        'menuSettings',
        'menuVersion',
        'lastPublishedAt',
        'modifiedOn',
        'slug',
        'isDefault',
        'projectImage',
    ] as const;
    const publicProject = Object.fromEntries(
        publicProjectFields.flatMap((field) => (
            sanitized[field] !== undefined ? [[field, sanitized[field]]] : []
        )),
    );

    if (sanitized.metadata && typeof sanitized.metadata === 'object') {
        const metadataName = sanitized.metadata.name;
        if (metadataName !== undefined) publicProject.metadata = { name: metadataName };
    }

    return publicProject;
}

function sanitizePublicImages(value: unknown): Array<Record<string, unknown>> {
    const entries = Array.isArray(value) ? value : value ? [value] : [];

    return entries.flatMap((entry) => {
        if (typeof entry === 'string') {
            const url = entry.trim();
            return url ? [{ url }] : [];
        }
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];

        const image = entry as Record<string, unknown>;
        const url = ['url', 'src', 'imageUrl', 'downloadURL', 'uploadedUrl']
            .map((key) => image[key])
            .find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
            ?.trim();
        if (!url) return [];

        const variants = image.variants && typeof image.variants === 'object' && !Array.isArray(image.variants)
            ? Object.fromEntries(
                Object.entries(image.variants as Record<string, unknown>)
                    .filter((entry): entry is [string, string] => (
                        ['thumb', 'small', 'medium', 'large', 'original'].includes(entry[0])
                        && typeof entry[1] === 'string'
                        && entry[1].trim().length > 0
                    ))
                    .map(([key, variantUrl]) => [key, variantUrl.trim()]),
            )
            : undefined;

        return [{
            url,
            ...(variants && Object.keys(variants).length > 0 ? { variants } : {}),
        }];
    });
}
