import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_STAFF_USER_ID_MAX_LENGTH = 160;

export function normalizeAnswerlatticeStaffUserId(value: unknown): string | null {
    const userId = typeof value === 'string' ? value.trim() : '';
    if (!userId || userId.length > ANSWERLATTICE_STAFF_USER_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(userId) ? userId : null;
}

export function requireAnswerlatticeStaffUserId(value: unknown): string {
    const userId = normalizeAnswerlatticeStaffUserId(value);
    if (!userId) {
        throw new Error('Invalid Answerlattice staff user ID');
    }
    return userId;
}
