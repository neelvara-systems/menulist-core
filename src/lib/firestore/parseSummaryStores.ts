/**
 * Parse stores from platformSummary/storesSummary.
 *
 * Handles both the nested shape:
 *   { stores: { "1": { ... } } }
 * and flat dot-notation writes:
 *   { "stores.1.name": "Main Store" }
 */
export function parseSummaryStores(data: any): Record<string, any> {
    if (!data || typeof data !== "object") return {};

    const result: Record<string, any> = {};

    if (data.stores && typeof data.stores === "object") {
        for (const [storeId, storeData] of Object.entries(data.stores)) {
            if (storeData && typeof storeData === "object") {
                result[storeId] = { ...(storeData as Record<string, any>) };
            }
        }
    }

    for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith("stores.")) continue;

        const rest = key.slice("stores.".length);
        if (!rest) continue;

        const [storeId, ...fieldPath] = rest.split(".");
        if (!storeId) continue;

        if (!result[storeId]) result[storeId] = {};

        if (fieldPath.length === 0) {
            if (value && typeof value === "object") {
                result[storeId] = { ...result[storeId], ...(value as Record<string, any>) };
            }
            continue;
        }

        let target: Record<string, any> = result[storeId];
        for (let i = 0; i < fieldPath.length - 1; i++) {
            const segment = fieldPath[i];
            if (!target[segment] || typeof target[segment] !== "object") {
                target[segment] = {};
            }
            target = target[segment];
        }
        target[fieldPath[fieldPath.length - 1]] = value;
    }

    return result;
}
