export type ProjectDocumentScope = {
    tId: string | number;
    sId: string | number;
    projectId: string;
};

const normalizeScopeId = (value: unknown): string | null => {
    const normalized = typeof value === "number"
        ? Number.isSafeInteger(value) && value > 0 ? String(value) : ""
        : typeof value === "string" && value === value.trim() ? value : "";
    return normalized && !normalized.includes("/") ? normalized : null;
};

const readIdentityCandidates = (data: Record<string, unknown>, keys: string[]): string[] => (
    keys
        .map((key) => normalizeScopeId(data[key]))
        .filter((value): value is string => value !== null)
);

export const normalizeProjectDocumentScope = (
    scope: ProjectDocumentScope,
): { tId: string; sId: string; projectId: string } | null => {
    const tId = normalizeScopeId(scope.tId);
    const sId = normalizeScopeId(scope.sId);
    const projectId = normalizeScopeId(scope.projectId);
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
    const data = value as Record<string, unknown>;

    const embeddedProjectId = normalizeScopeId(data.projectId);
    if (embeddedProjectId && embeddedProjectId !== normalizedScope.projectId) return false;

    const tenantCandidates = readIdentityCandidates(data, ["tId", "tenantId", "tenantID"]);
    const storeCandidates = readIdentityCandidates(data, ["sId", "storeId", "storeID"]);
    if (tenantCandidates.length > 0 && !tenantCandidates.includes(normalizedScope.tId)) return false;
    if (storeCandidates.length > 0 && !storeCandidates.includes(normalizedScope.sId)) return false;
    return true;
};
