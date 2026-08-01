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

const readOwnDataField = (
    value: unknown,
    key: string,
): { ok: true; value: unknown } | { ok: false } => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ok: false };
    }
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor) return { ok: true, value: undefined };
        return "value" in descriptor
            ? { ok: true, value: descriptor.value }
            : { ok: false };
    } catch {
        return { ok: false };
    }
};

const previousSlugsClaim = (
    value: unknown,
    normalizedSlug: string,
): { ok: boolean; claimed: boolean } => {
    if (value === undefined) return { ok: true, claimed: false };
    if (!Array.isArray(value)) return { ok: true, claimed: false };
    try {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        const length = lengthDescriptor && "value" in lengthDescriptor
            ? lengthDescriptor.value
            : undefined;
        if (!Number.isSafeInteger(length) || length < 0 || length > 1_000) {
            return { ok: false, claimed: true };
        }
        for (let index = 0; index < length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
            if (descriptor && !("value" in descriptor)) return { ok: false, claimed: true };
            if (
                descriptor
                && "value" in descriptor
                && normalizeProjectSlug(descriptor.value) === normalizedSlug
            ) {
                return { ok: true, claimed: true };
            }
        }
        return { ok: true, claimed: false };
    } catch {
        return { ok: false, claimed: true };
    }
};

const projectDeletionTimeMillis = (value: unknown): number | null => {
    try {
        if (value instanceof Date) {
            const millis = Date.prototype.getTime.call(value);
            return Number.isFinite(millis) ? millis : null;
        }
    } catch {
        return null;
    }

    if (!value || typeof value !== "object") return null;
    const toMillisField = readOwnDataField(value, "toMillis");
    if (!toMillisField.ok) return null;
    const toMillis = toMillisField.value;
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
    const normalized = normalizeProjectSlug(proposedSlug);
    if (!normalized || !Number.isFinite(cutoffMillis)) return false;

    const deleted = readOwnDataField(candidate, "deleted");
    if (!deleted.ok) return true;
    if (deleted.value !== true) return false;

    const deletedAt = readOwnDataField(candidate, "deletedAt");
    if (!deletedAt.ok) return true;
    const deletedAtMillis = projectDeletionTimeMillis(deletedAt.value);
    if (deletedAtMillis === null || deletedAtMillis < cutoffMillis) return false;

    const slug = readOwnDataField(candidate, "slug");
    const previousSlugs = readOwnDataField(candidate, "previousSlugs");
    if (!slug.ok || !previousSlugs.ok) return true;
    if (normalizeProjectSlug(slug.value) === normalized) return true;

    return previousSlugsClaim(previousSlugs.value, normalized).claimed;
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

    try {
        const entries = Object.entries(projects);
        if (entries.length > 10_000) return true;
        return entries.some(([projectId, summary]) => {
            if (projectId === excludeProjectId || !summary || typeof summary !== "object") return false;
            const slug = readOwnDataField(summary, "slug");
            const previousSlugs = readOwnDataField(summary, "previousSlugs");
            if (!slug.ok || !previousSlugs.ok) return true;
            if (normalizeProjectSlug(slug.value) === normalized) return true;
            const previousClaim = previousSlugsClaim(previousSlugs.value, normalized);
            return !previousClaim.ok || previousClaim.claimed;
        });
    } catch {
        return true;
    }
};

export const resolveAvailableProjectSlug = (
    projects: Record<string, ProjectSlugSummary>,
    proposedSlug: string,
    stableSuffix: string,
    excludeProjectId?: string,
): string => {
    const canonicalProposedSlug = normalizeProjectSlug(proposedSlug)
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120)
        .replace(/-+$/g, "")
        || "menu";
    if (!isProjectSlugClaimed(projects, canonicalProposedSlug, excludeProjectId)) {
        return canonicalProposedSlug;
    }

    const normalizedSuffix = normalizeProjectSlug(stableSuffix)
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(-24);
    const base = canonicalProposedSlug.replace(/-+$/g, "") || "menu";
    const firstCandidate = `${base}-${normalizedSuffix || "copy"}`;
    if (!isProjectSlugClaimed(projects, firstCandidate, excludeProjectId)) return firstCandidate;

    for (let attempt = 2; attempt <= 100; attempt += 1) {
        const candidate = `${firstCandidate}-${attempt}`;
        if (!isProjectSlugClaimed(projects, candidate, excludeProjectId)) return candidate;
    }

    throw new Error("Unable to allocate a unique project slug.");
};
