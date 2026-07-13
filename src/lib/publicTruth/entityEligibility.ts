import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';

export type MenuListPublicEntityIdentity = {
    documentId: string;
    numericId: number;
};

export function normalizeMenuListPublicEntityIdentityAliases(
    values: readonly unknown[],
): MenuListPublicEntityIdentity | null {
    const presentValues = values.filter((value) => value !== undefined && value !== null);
    if (presentValues.length === 0) return null;
    const scopes = presentValues.map((value) => {
        const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
        const documentId = raw.trim();
        if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;
        const numericId = Number(documentId);
        return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
            ? { documentId, numericId }
            : null;
    });
    const firstScope = scopes[0];
    return firstScope && scopes.every((scope) => scope?.documentId === firstScope.documentId)
        ? firstScope
        : null;
}

/**
 * Shared lifecycle admission for MenuList tenant/store records that may back
 * public truth. Legacy records without lifecycle flags remain compatible;
 * explicit inactive, deleted, or platform-blocked state fails closed.
 */
export function isMenuListPublicEntityEligible(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const entity = value as Record<string, unknown>;
    return entity.active !== false
        && entity.deleted !== true
        && !isPlatformEntityBlocked(entity);
}
