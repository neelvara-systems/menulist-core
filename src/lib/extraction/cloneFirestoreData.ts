import { Timestamp } from 'firebase/firestore';

/** Clone mutable Firestore data without flattening immutable SDK value objects. */
export function cloneFirestoreData<T>(value: T): T {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Timestamp || value instanceof Date) return value;

    if (Array.isArray(value)) {
        return value.map((entry) => cloneFirestoreData(entry)) as T;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
        (result, [key, entry]) => {
            result[key] = cloneFirestoreData(entry);
            return result;
        },
        {},
    ) as T;
}

export default cloneFirestoreData;
