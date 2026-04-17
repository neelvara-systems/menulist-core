/**
 * Parse projects from a platformSummary/projects_{storeId} document.
 *
 * Handles both storage formats:
 * 1. Nested (modern): { projects: { projectId: {...} } }
 * 2. Flat dot-notation (legacy/Admin SDK set): { "projects.projectId": {...} }
 *    — Sometimes also sub-fields: { "projects.projectId.specialMenuStatus": "active" }
 *
 * Why both exist:
 * Admin SDK `.set()` and some client SDK writes stored dotted keys literally
 * instead of as nested paths. This parser normalizes both into a single
 * { projectId: projectData } map so callers don't care about storage format.
 *
 * @see __docs__/url-routing-architecture/README.md — projectsSummary contract
 */
export function parseSummaryProjects(data: any): Record<string, any> {
    if (!data || typeof data !== "object") return {};

    const result: Record<string, any> = {};

    // 1. Nested format first (authoritative when present)
    if (data.projects && typeof data.projects === "object") {
        for (const [projectId, projectData] of Object.entries(data.projects)) {
            if (projectData && typeof projectData === "object") {
                result[projectId] = { ...(projectData as Record<string, any>) };
            }
        }
    }

    // 2. Flat dot-notation format (legacy)
    for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith("projects.")) continue;

        const rest = key.slice("projects.".length);
        if (!rest) continue;

        // Split further dots to handle nested field updates like
        // "projects.{id}.specialMenuStatus"
        const [projectId, ...fieldPath] = rest.split(".");
        if (!projectId) continue;

        if (!result[projectId]) result[projectId] = {};

        if (fieldPath.length === 0) {
            // Whole-project replacement
            if (value && typeof value === "object") {
                result[projectId] = { ...result[projectId], ...(value as Record<string, any>) };
            }
        } else {
            // Nested field update
            let target: Record<string, any> = result[projectId];
            for (let i = 0; i < fieldPath.length - 1; i++) {
                const segment = fieldPath[i];
                if (!target[segment] || typeof target[segment] !== "object") {
                    target[segment] = {};
                }
                target = target[segment];
            }
            target[fieldPath[fieldPath.length - 1]] = value;
        }
    }

    return result;
}
