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
                                return cleanItem;
                            });
                    }

                    // Filter out inactive categories
                    if (data.categories && Array.isArray(data.categories)) {
                        data.categories = data.categories.filter(
                            (cat: any) => cat.active !== false,
                        );
                    }

                    cleanFile.extractedData = {
                        ...cleanFile.extractedData,
                        data,
                    };
                }

                return cleanFile;
            });
    }

    return sanitized;
}
