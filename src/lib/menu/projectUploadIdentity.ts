const normalizeUploadSegment = (value: unknown): string => (
    String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
);

export const buildProjectUploadObjectId = ({
    attemptId,
    fileId,
    projectId,
    stableParts,
}: {
    attemptId: unknown;
    fileId?: unknown;
    projectId?: unknown;
    stableParts?: readonly unknown[];
}): string => {
    const cleanAttemptId = normalizeUploadSegment(attemptId).slice(0, 32);
    if (!cleanAttemptId) throw new Error("project_upload_attempt_id_invalid");
    if (stableParts !== undefined && (!Array.isArray(stableParts) || stableParts.length > 8)) {
        throw new Error("project_upload_stable_parts_invalid");
    }

    const stableSource = stableParts
        ? stableParts.map(normalizeUploadSegment).filter(Boolean).join("-")
        : `${projectId || "project"}-${fileId || "file"}`;
    const stablePrefix = normalizeUploadSegment(stableSource)
        .slice(0, 86) || "project-file";
    return `${stablePrefix}-${cleanAttemptId}`.slice(0, 120);
};
