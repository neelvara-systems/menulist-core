import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';

export function sanitizeAiMenuManagerFirestoreValue(value: undefined): undefined;
export function sanitizeAiMenuManagerFirestoreValue<T>(value: T): T;
export function sanitizeAiMenuManagerFirestoreValue(value: unknown): unknown {
    if (value === undefined) return undefined;
    return sanitizeForFirestore(value, { undefinedObjectValue: 'omit' });
}
