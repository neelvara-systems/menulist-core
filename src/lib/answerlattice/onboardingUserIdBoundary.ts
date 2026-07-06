import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export function normalizeAnswerlatticeOnboardingUserId(value: unknown): string | null {
    const userId = typeof value === 'string' ? value.trim() : '';
    return isValidFirestoreDocumentId(userId) ? userId : null;
}

export function requireAnswerlatticeOnboardingUserId(value: unknown): string {
    const userId = normalizeAnswerlatticeOnboardingUserId(value);
    if (!userId) {
        throw new Error('Invalid Answerlattice onboarding user ID');
    }
    return userId;
}
