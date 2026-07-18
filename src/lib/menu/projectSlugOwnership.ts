export type ProjectSlugSummary = {
    slug?: unknown;
    previousSlugs?: unknown;
};

export type DeletedProjectSlugCandidate = ProjectSlugSummary & {
    deleted?: unknown;
    deletedAt?: unknown;
};

const normalizeProjectSlug = (value: unknown): string => (
    typeof value === "string" ? value.trim().toLowerCase() : ""
);

const projectDeletionTimeMillis = (value: unknown): number | null => {
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) ? millis : null;
    }

    if (!value || typeof value !== "object") return null;
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis !== "function") return null;

    try {
        const millis = toMillis.call(value);
        return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
    } catch {
        return null;
    }
};

export const isRecentlyDeletedProjectSlugReservation = (
    candidate: DeletedProjectSlugCandidate,
    proposedSlug: string,
    cutoffMillis: number,
): boolean => {
    if (!candidate || typeof candidate !== "object" || candidate.deleted !== true) return false;

    const deletedAtMillis = projectDeletionTimeMillis(candidate.deletedAt);
    if (deletedAtMillis === null || deletedAtMillis < cutoffMillis) return false;

    const normalized = normalizeProjectSlug(proposedSlug);
    if (!normalized) return false;
    if (normalizeProjectSlug(candidate.slug) === normalized) return true;

    return Array.isArray(candidate.previousSlugs)
        && candidate.previousSlugs.some((slug) => normalizeProjectSlug(slug) === normalized);
};

/**
 * Summary entries own both their current slug and redirect history. Inactive
 * projects keep ownership because they can be reactivated without changing URLs.
 */
export const isProjectSlugClaimed = (
    projects: Record<string, ProjectSlugSummary>,
    proposedSlug: string,
    excludeProjectId?: string,
): boolean => {
    const normalized = normalizeProjectSlug(proposedSlug);
    if (!normalized) return false;

    return Object.entries(projects).some(([projectId, summary]) => {
        if (projectId === excludeProjectId || !summary || typeof summary !== "object") return false;
        if (normalizeProjectSlug(summary.slug) === normalized) return true;
        return Array.isArray(summary.previousSlugs)
            && summary.previousSlugs.some((slug) => normalizeProjectSlug(slug) === normalized);
    });
};

export const resolveAvailableProjectSlug = (
    projects: Record<string, ProjectSlugSummary>,
    proposedSlug: string,
    stableSuffix: string,
    excludeProjectId?: string,
): string => {
    if (!isProjectSlugClaimed(projects, proposedSlug, excludeProjectId)) return proposedSlug;

    const normalizedSuffix = normalizeProjectSlug(stableSuffix)
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(-24);
    const base = proposedSlug.replace(/-+$/g, "") || "menu";
    const firstCandidate = `${base}-${normalizedSuffix || "copy"}`;
    if (!isProjectSlugClaimed(projects, firstCandidate, excludeProjectId)) return firstCandidate;

    for (let attempt = 2; attempt <= 100; attempt += 1) {
        const candidate = `${firstCandidate}-${attempt}`;
        if (!isProjectSlugClaimed(projects, candidate, excludeProjectId)) return candidate;
    }

    throw new Error("Unable to allocate a unique project slug.");
};
