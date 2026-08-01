type UnknownRecord = Record<string, unknown>;

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function getOwnDataEntries(value: unknown): Array<[string, unknown]> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

    try {
        return Object.entries(Object.getOwnPropertyDescriptors(value))
            .filter(([key, descriptor]) => (
                !UNSAFE_OBJECT_KEYS.has(key)
                && Object.prototype.hasOwnProperty.call(descriptor, 'value')
                && descriptor.enumerable
            ))
            .map(([key, descriptor]) => [key, descriptor.value]);
    } catch {
        return [];
    }
}

function defineOwnValue(target: object, key: string, value: unknown): void {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}

function isMergeableRecord(value: unknown): value is UnknownRecord {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merges enumerable own data properties without invoking accessors or admitting
 * prototype-mutating keys. Arrays are replaced unless `considerArray` is true.
 */
const deepMerge = (
    source: unknown,
    object: unknown = {},
    considerArray: boolean = false,
): UnknownRecord => {
    const mergedObject: UnknownRecord = {};

    for (const [key, value] of getOwnDataEntries(source)) {
        defineOwnValue(mergedObject, key, value);
    }

    for (const [key, value] of getOwnDataEntries(object)) {
        if (value === undefined) continue;

        const sourceValue = mergedObject[key];
        if (considerArray && Array.isArray(sourceValue) && Array.isArray(value)) {
            defineOwnValue(mergedObject, key, [...sourceValue, ...value]);
            continue;
        }

        if (isMergeableRecord(value) && isMergeableRecord(sourceValue)) {
            defineOwnValue(
                mergedObject,
                key,
                deepMerge(sourceValue, value, considerArray),
            );
            continue;
        }

        defineOwnValue(mergedObject, key, value);
    }

    return mergedObject;
};

export default deepMerge;

/**
 * Returns changed enumerable own data fields from `updated`.
 *
 * The historical export name is retained for compatibility with existing
 * owner and platform mutation callers.
 */
export function getObjectDifferance<TUpdated extends object>(
    updated: TUpdated,
    original: unknown,
): Partial<TUpdated> {
    const difference: Partial<TUpdated> = {};
    const originalEntries = new Map(getOwnDataEntries(original));

    for (const [key, value] of getOwnDataEntries(updated)) {
        if (value !== originalEntries.get(key)) {
            defineOwnValue(difference, key, value);
        }
    }

    return difference;
}
