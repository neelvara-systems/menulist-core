import { PRODUCT_IDS } from '@constant/product';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

type PublicApiScopeEntity = Record<string, unknown>;

const asScopeEntity = (value: unknown): PublicApiScopeEntity | null => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as PublicApiScopeEntity
        : null
);

const normalizeNumericDocumentId = (value: unknown): string | null => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !/^[1-9]\d*$/.test(documentId) || !isValidFirestoreDocumentId(documentId)) {
        return null;
    }

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && String(numericId) === documentId
        ? documentId
        : null;
};

const resolveConsistentIdentityAliases = (
    entity: PublicApiScopeEntity,
    aliases: string[],
): string | null | undefined => {
    const rawValues = aliases
        .map((alias) => entity[alias])
        .filter((value) => value !== undefined && value !== null && value !== '');
    if (rawValues.length === 0) return undefined;

    const documentIds = rawValues.map(normalizeNumericDocumentId);
    if (documentIds.some((documentId) => documentId === null)) return null;
    const uniqueDocumentIds = new Set(documentIds);
    return uniqueDocumentIds.size === 1 ? documentIds[0] : null;
};

/**
 * MenuList documents predate product codes, so missing product fields remain
 * compatible. Any explicit product identity must be the exact MenuList code,
 * and conflicting aliases fail closed.
 */
export function isMenuListPublicApiProductEntity(value: unknown): boolean {
    const entity = asScopeEntity(value);
    if (!entity) return false;

    const explicitProductIds = [entity.pId, entity.productId]
        .filter((productId) => productId !== undefined && productId !== null && productId !== '');
    return explicitProductIds.every((productId) => productId === PRODUCT_IDS.MENULIST);
}

export function isMenuListPublicApiCredentialInScope(value: unknown): boolean {
    const credential = asScopeEntity(value);
    if (!credential || !isMenuListPublicApiProductEntity(credential)) return false;

    return credential.purpose === undefined
        || credential.purpose === null
        || credential.purpose === ''
        || credential.purpose === 'menulist_public_api';
}

export function resolveMenuListPublicApiTenantDocumentId(value: unknown): string | null {
    const entity = asScopeEntity(value);
    if (!entity) return null;
    return resolveConsistentIdentityAliases(entity, ['tenantId', 'tId']) ?? null;
}

export function isMenuListPublicApiStoreIdentityConsistent(
    value: unknown,
    storeDocumentId: string,
): boolean {
    const entity = asScopeEntity(value);
    const normalizedStoreDocumentId = normalizeNumericDocumentId(storeDocumentId);
    if (!entity || !normalizedStoreDocumentId) return false;

    const storedStoreDocumentId = resolveConsistentIdentityAliases(entity, ['storeId', 'sId']);
    return storedStoreDocumentId === undefined || storedStoreDocumentId === normalizedStoreDocumentId;
}

export function isMenuListPublicApiTenantIdentityConsistent(
    value: unknown,
    tenantDocumentId: string,
): boolean {
    const entity = asScopeEntity(value);
    const normalizedTenantDocumentId = normalizeNumericDocumentId(tenantDocumentId);
    if (!entity || !normalizedTenantDocumentId) return false;

    const storedTenantDocumentId = resolveConsistentIdentityAliases(entity, ['tenantId', 'tId']);
    return storedTenantDocumentId === undefined || storedTenantDocumentId === normalizedTenantDocumentId;
}
