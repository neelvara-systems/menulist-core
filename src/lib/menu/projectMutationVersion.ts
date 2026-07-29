type TimestampLike = {
    seconds?: unknown;
    _seconds?: unknown;
    nanoseconds?: unknown;
    _nanoseconds?: unknown;
    toDate?: () => Date;
    toMillis?: () => number;
};

function readOwnValue(record: object, key: PropertyKey): unknown {
    try {
        return Object.prototype.hasOwnProperty.call(record, key)
            ? Reflect.get(record, key)
            : undefined;
    } catch {
        return undefined;
    }
}

function readValue(record: object, key: PropertyKey): unknown {
    try {
        return Reflect.get(record, key);
    } catch {
        return undefined;
    }
}

export function projectMutationVersionMillis(value: unknown): number | null {
    try {
        if (value instanceof Date) {
            const millis = Date.prototype.getTime.call(value);
            return Number.isFinite(millis) && millis >= 0 ? millis : null;
        }
    } catch {
        return null;
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
    const toMillis = readValue(timestamp, 'toMillis');
    if (typeof toMillis === 'function') {
        try {
            const millis = Reflect.apply(toMillis, timestamp, []);
            return typeof millis === 'number' && Number.isFinite(millis) && millis >= 0
                ? Math.trunc(millis)
                : null;
        } catch {
            return null;
        }
    }
    const toDate = readValue(timestamp, 'toDate');
    if (typeof toDate === 'function') {
        try {
            const date = Reflect.apply(toDate, timestamp, []);
            if (!(date instanceof Date)) return null;
            const millis = Date.prototype.getTime.call(date);
            return Number.isFinite(millis) && millis >= 0 ? millis : null;
        } catch {
            return null;
        }
    }

    const secondsValue = readValue(timestamp, 'seconds') ?? readValue(timestamp, '_seconds');
    const nanosecondsValue = readValue(timestamp, 'nanoseconds')
        ?? readValue(timestamp, '_nanoseconds')
        ?? 0;
    if (
        typeof secondsValue !== 'number'
        || !Number.isFinite(secondsValue)
        || typeof nanosecondsValue !== 'number'
        || !Number.isFinite(nanosecondsValue)
        || nanosecondsValue < 0
        || nanosecondsValue >= 1_000_000_000
    ) {
        return null;
    }
    const millis = Math.trunc(secondsValue * 1000 + nanosecondsValue / 1_000_000);
    return Number.isFinite(millis) && millis >= 0 ? millis : null;
}

export function projectMutationVersionIso(value: unknown): string {
    const millis = projectMutationVersionMillis(value);
    return millis === null ? '' : new Date(millis).toISOString();
}

export function projectDocumentMutationVersionMillis(project: Record<string, unknown>): number | null {
    const modifiedOn = readOwnValue(project, 'modifiedOn');
    return projectMutationVersionMillis(modifiedOn ?? readOwnValue(project, 'updatedAt'));
}
