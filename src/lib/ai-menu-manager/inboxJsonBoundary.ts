export type AiMenuManagerJsonValue =
    | boolean
    | null
    | number
    | string
    | AiMenuManagerJsonValue[]
    | { [key: string]: AiMenuManagerJsonValue };

const MAX_JSON_DEPTH = 12;
const MAX_JSON_ARRAY_ITEMS = 100;
const MAX_JSON_OBJECT_KEYS = 100;
const UNSAFE_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function serializeTimestampLike(value: object): {
    recognized: boolean;
    value?: string;
} {
    if (value instanceof Date) {
        return {
            recognized: true,
            ...(Number.isFinite(value.getTime()) ? { value: value.toISOString() } : {}),
        };
    }

    try {
        const timestamp = value as {
            nanoseconds?: unknown;
            seconds?: unknown;
            toDate?: unknown;
        };
        if (typeof timestamp.toDate === 'function') {
            const date = timestamp.toDate.call(value);
            return {
                recognized: true,
                ...(date instanceof Date && Number.isFinite(date.getTime())
                    ? { value: date.toISOString() }
                    : {}),
            };
        }
        if (typeof timestamp.seconds === 'number' && Number.isSafeInteger(timestamp.seconds)) {
            const nanoseconds = typeof timestamp.nanoseconds === 'number'
                && Number.isSafeInteger(timestamp.nanoseconds)
                && timestamp.nanoseconds >= 0
                && timestamp.nanoseconds < 1_000_000_000
                ? timestamp.nanoseconds
                : 0;
            const date = new Date(timestamp.seconds * 1_000 + Math.floor(nanoseconds / 1_000_000));
            return {
                recognized: true,
                ...(Number.isFinite(date.getTime()) ? { value: date.toISOString() } : {}),
            };
        }
    } catch {
        return { recognized: true };
    }

    return { recognized: false };
}

function serializeValue(
    value: unknown,
    seen: WeakSet<object>,
    depth: number,
): AiMenuManagerJsonValue | undefined {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'object' || depth >= MAX_JSON_DEPTH || seen.has(value)) return undefined;

    const timestamp = serializeTimestampLike(value);
    if (timestamp.recognized) return timestamp.value;

    seen.add(value);
    try {
        if (Array.isArray(value)) {
            if (value.length > MAX_JSON_ARRAY_ITEMS) return undefined;
            return value.map((entry) => serializeValue(entry, seen, depth + 1) ?? null);
        }

        const entries = Object.entries(value);
        if (entries.length > MAX_JSON_OBJECT_KEYS) return undefined;
        const result: { [key: string]: AiMenuManagerJsonValue } = {};
        for (const [key, entry] of entries) {
            if (!key || key.length > 100 || UNSAFE_JSON_KEYS.has(key)) continue;
            const serialized = serializeValue(entry, seen, depth + 1);
            if (serialized !== undefined) result[key] = serialized;
        }
        return result;
    } finally {
        seen.delete(value);
    }
}

export function serializeAiMenuManagerInboxForJson(value: unknown): AiMenuManagerJsonValue {
    return serializeValue(value, new WeakSet(), 0) ?? null;
}
