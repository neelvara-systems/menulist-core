import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_PRODUCT_SURFACE_ID_MAX_LENGTH = 180;

export function normalizeAnswerlatticeProductSurfaceId(value: unknown): string | null {
    const surfaceId = typeof value === 'string' ? value.trim() : '';
    if (!surfaceId || surfaceId.length > ANSWERLATTICE_PRODUCT_SURFACE_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(surfaceId) ? surfaceId : null;
}
