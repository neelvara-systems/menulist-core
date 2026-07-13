import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';

export function sanitizeAiMenuManagerFirestoreValue<T>(value: T): T {
    if (value === undefined) return undefined as T;
    return sanitizeForFirestore(value, { undefinedObjectValue: 'omit' });
}
