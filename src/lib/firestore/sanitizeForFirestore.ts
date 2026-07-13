export type FirestoreSanitizeOptions = Readonly<{
    atomicTransform?: (value: object, path: string) => Readonly<
        | { handled: true; value: unknown }
        | { handled: false }
    >;
    dateTransform?: (value: Date) => unknown;
    undefinedObjectValue?: "null" | "omit";
    unsafeObjectKey?: "reject" | "omit";
}>;

const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const OMIT_VALUE = Symbol("omit-firestore-value");

const isPlainRecord = (value: object): value is Record<string, unknown> => {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const childPath = (path: string, key: string | number) => (
    typeof key === "number" ? `${path}[${key}]` : `${path}.${key}`
);

const sanitizeValue = (
    value: unknown,
    path: string,
    options: FirestoreSanitizeOptions,
    activeAncestors: WeakSet<object>,
    insideArray: boolean,
): unknown | typeof OMIT_VALUE => {
    if (value === undefined) {
        return !insideArray && options.undefinedObjectValue === "omit" ? OMIT_VALUE : null;
    }
    if (value === null) return null;

    const valueType = typeof value;
    if (valueType === "bigint" || valueType === "function" || valueType === "symbol") {
        throw new TypeError(`Unsupported Firestore value at ${path}`);
    }
    if (valueType !== "object") return value;

    if (value instanceof Date && options.dateTransform) {
        return options.dateTransform(value);
    }

    const objectValue = value as object;
    const atomicResult = options.atomicTransform?.(objectValue, path);
    if (atomicResult?.handled) return atomicResult.value;
    if (!Array.isArray(value) && !isPlainRecord(objectValue)) {
        // Preserve SDK value objects such as Timestamp, FieldValue,
        // DocumentReference, GeoPoint, Bytes, and custom atomic values.
        return value;
    }

    if (activeAncestors.has(objectValue)) {
        throw new TypeError(`Circular Firestore value at ${path}`);
    }
    activeAncestors.add(objectValue);

    try {
        if (Array.isArray(value)) {
            const symbols = Object.getOwnPropertySymbols(value);
            if (symbols.some((symbol) => Object.prototype.propertyIsEnumerable.call(value, symbol))) {
                throw new TypeError(`Enumerable symbol key is not supported at ${path}`);
            }
            for (const key of Object.keys(value)) {
                const index = Number(key);
                if (!Number.isSafeInteger(index) || index < 0 || index >= value.length || String(index) !== key) {
                    throw new TypeError(`Custom array property is not supported at ${childPath(path, key)}`);
                }
            }

            return Array.from({ length: value.length }, (_, index) => {
                const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
                if (!descriptor) return null;
                if (!("value" in descriptor)) {
                    throw new TypeError(`Accessor property is not supported at ${childPath(path, index)}`);
                }
                const sanitized = sanitizeValue(
                    descriptor.value,
                    childPath(path, index),
                    options,
                    activeAncestors,
                    true,
                );
                return sanitized === OMIT_VALUE ? null : sanitized;
            });
        }

        const symbols = Object.getOwnPropertySymbols(value);
        if (symbols.some((symbol) => Object.prototype.propertyIsEnumerable.call(value, symbol))) {
            throw new TypeError(`Enumerable symbol key is not supported at ${path}`);
        }

        const result: Record<string, unknown> = {};
        const descriptors = Object.getOwnPropertyDescriptors(value);
        for (const key of Object.keys(descriptors)) {
            const descriptor = descriptors[key];
            if (!descriptor.enumerable) continue;
            if (UNSAFE_OBJECT_KEYS.has(key)) {
                if (options.unsafeObjectKey === "omit") continue;
                throw new TypeError(`Unsafe object key at ${childPath(path, key)}`);
            }
            if (!("value" in descriptor)) {
                throw new TypeError(`Accessor property is not supported at ${childPath(path, key)}`);
            }
            const sanitized = sanitizeValue(
                descriptor.value,
                childPath(path, key),
                options,
                activeAncestors,
                false,
            );
            if (sanitized !== OMIT_VALUE) result[key] = sanitized;
        }
        return result;
    } finally {
        activeAncestors.delete(objectValue);
    }
};

/**
 * Sanitizes a Firestore value without traversing or cloning SDK value objects.
 * Undefined array positions always become null because array entries cannot be
 * omitted without changing their indexes.
 */
export function sanitizeForFirestore<T>(
    value: T,
    options: FirestoreSanitizeOptions = {},
): T extends undefined ? null : T {
    const sanitized = sanitizeValue(value, "$", options, new WeakSet(), false);
    return (sanitized === OMIT_VALUE ? null : sanitized) as T extends undefined ? null : T;
}
