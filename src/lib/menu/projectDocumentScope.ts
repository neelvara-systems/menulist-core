export type ProjectDocumentScope = {
    tId: string | number;
    sId: string | number;
    projectId: string;
};

const normalizeNumericScopeId = (value: unknown): string | null => {
    const normalized = typeof value === "number"
        ? Number.isSafeInteger(value) && value > 0 ? String(value) : ""
        : typeof value === "string" && value === value.trim() ? value : "";
    if (!/^[1-9]\d*$/.test(normalized)) return null;

    const numericId = Number(normalized);
    return Number.isSafeInteger(numericId) && String(numericId) === normalized
        ? normalized
        : null;
};

const normalizeProjectId = (value: unknown): string | null => (
    typeof value === "string"
    && value.length > 0
    && value === value.trim()
    && !value.includes("/")
        ? value
        : null
);

const embeddedIdentityMatches = (
    data: object,
    keys: readonly string[],
    expected: string,
    normalize: (value: unknown) => string | null,
): boolean => {
    for (const key of keys) {
        try {
            if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
            if (normalize(Reflect.get(data, key)) !== expected) return false;
        } catch {
            return false;
        }
    }

    return true;
};

export const normalizeProjectDocumentScope = (
    scope: ProjectDocumentScope,
): { tId: string; sId: string; projectId: string } | null => {
    const tId = normalizeNumericScopeId(scope.tId);
    const sId = normalizeNumericScopeId(scope.sId);
    const projectId = normalizeProjectId(scope.projectId);
    if (!tId || !sId || !projectId) return null;
    if (!projectId.startsWith(`${tId}-`) || !projectId.endsWith(`-${sId}`)) return null;
    return { tId, sId, projectId };
};

/** Validates both path-derived identity and any legacy embedded identity fields. */
export const projectDocumentMatchesScope = (
    value: unknown,
    scope: ProjectDocumentScope,
): boolean => {
    const normalizedScope = normalizeProjectDocumentScope(scope);
    if (!normalizedScope || !value || typeof value !== "object" || Array.isArray(value)) return false;

    return embeddedIdentityMatches(
        value,
        ["projectId"],
        normalizedScope.projectId,
        normalizeProjectId,
    ) && embeddedIdentityMatches(
        value,
        ["tId", "tenantId", "tenantID"],
        normalizedScope.tId,
        normalizeNumericScopeId,
    ) && embeddedIdentityMatches(
        value,
        ["sId", "storeId", "storeID"],
        normalizedScope.sId,
        normalizeNumericScopeId,
    );
};
