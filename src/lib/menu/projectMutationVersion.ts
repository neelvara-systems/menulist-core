type TimestampLike = {
    seconds?: unknown;
    _seconds?: unknown;
    nanoseconds?: unknown;
    _nanoseconds?: unknown;
    toDate?: () => Date;
    toMillis?: () => number;
};

export function projectMutationVersionMillis(value: unknown): number | null {
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) ? millis : null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
    }
    if (typeof value === 'string') {
        const legacyFirebaseTimestamp = value.match(
            /^Timestamp\(seconds=(-?\d+),\s*nanoseconds=(\d+)\)$/,
        );
        if (legacyFirebaseTimestamp) {
            const seconds = Number(legacyFirebaseTimestamp[1]);
            const nanoseconds = Number(legacyFirebaseTimestamp[2]);
            if (
                Number.isFinite(seconds)
                && Number.isFinite(nanoseconds)
                && nanoseconds >= 0
                && nanoseconds < 1_000_000_000
            ) {
                const millis = Math.trunc(seconds * 1000 + nanoseconds / 1_000_000);
                return Number.isFinite(millis) && millis >= 0 ? millis : null;
            }
        }
        const millis = Date.parse(value);
        return Number.isFinite(millis) ? millis : null;
    }
    if (!value || typeof value !== 'object') return null;

    const timestamp = value as TimestampLike;
    if (typeof timestamp.toMillis === 'function') {
        const millis = Number(timestamp.toMillis());
        return Number.isFinite(millis) && millis >= 0 ? Math.trunc(millis) : null;
    }
    if (typeof timestamp.toDate === 'function') {
        const millis = timestamp.toDate().getTime();
        return Number.isFinite(millis) && millis >= 0 ? millis : null;
    }

    const seconds = Number(timestamp.seconds ?? timestamp._seconds);
    const nanoseconds = Number(timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0);
    if (
        !Number.isFinite(seconds)
        || !Number.isFinite(nanoseconds)
        || nanoseconds < 0
        || nanoseconds >= 1_000_000_000
    ) {
        return null;
    }
    const millis = Math.trunc(seconds * 1000 + nanoseconds / 1_000_000);
    return Number.isFinite(millis) && millis >= 0 ? millis : null;
}

export function projectMutationVersionIso(value: unknown): string {
    const millis = projectMutationVersionMillis(value);
    return millis === null ? '' : new Date(millis).toISOString();
}

export function projectDocumentMutationVersionMillis(project: Record<string, unknown>): number | null {
    return projectMutationVersionMillis(project.modifiedOn ?? project.updatedAt);
}
