import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type { UserStoreMappingType } from '@type/platform/user';

export type StaffStoreScopeDocumentId = {
    numericId: number;
    documentId: string;
};

export const isStaffUnknownRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export function normalizeStaffStoreScopeDocumentId(value: unknown): StaffStoreScopeDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

export const normalizeStaffScopeNumericId = (value: unknown): number | null => (
    normalizeStaffStoreScopeDocumentId(value)?.numericId ?? null
);

export const normalizePersistedStaffStoreMappings = (value: unknown): UserStoreMappingType[] => (
    Array.isArray(value)
        ? value.flatMap((rawStore) => {
            if (!isStaffUnknownRecord(rawStore)) return [];
            const storeId = normalizeStaffScopeNumericId(rawStore.storeId);
            if (storeId === null) return [];
            return [{
                storeId,
                name: typeof rawStore.name === 'string' ? rawStore.name : '',
                role: typeof rawStore.role === 'string' ? rawStore.role : '',
            }];
        })
        : []
);
