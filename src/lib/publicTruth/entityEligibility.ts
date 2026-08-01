import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';

export type MenuListPublicEntityIdentity = {
    documentId: string;
    numericId: number;
};

type SafeLifecycleRead = Readonly<{ ok: boolean; value?: unknown }>;

const readLifecycleValue = (value: unknown, key: string): SafeLifecycleRead => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
    try {
        return { ok: true, value: Reflect.get(value, key) };
    } catch {
        return { ok: false };
    }
};

const isOptionalBoolean = (value: unknown): boolean => (
    value === undefined || typeof value === 'boolean'
);

const hasValidLifecycleShape = (entity: object): boolean => {
    const active = readLifecycleValue(entity, 'active');
    const deleted = readLifecycleValue(entity, 'deleted');
    const blocked = readLifecycleValue(entity, 'blocked');
    const tenantBlocked = readLifecycleValue(entity, 'tenantBlocked');
    const blockDetails = readLifecycleValue(entity, 'blockDetails');
    if (
        !active.ok
        || !deleted.ok
        || !blocked.ok
        || !tenantBlocked.ok
        || !blockDetails.ok
        || !isOptionalBoolean(active.value)
        || !isOptionalBoolean(deleted.value)
        || !isOptionalBoolean(blocked.value)
        || !isOptionalBoolean(tenantBlocked.value)
    ) {
        return false;
    }
    if (blockDetails.value === undefined) return true;
    const nestedBlocked = readLifecycleValue(blockDetails.value, 'blocked');
    return nestedBlocked.ok && isOptionalBoolean(nestedBlocked.value);
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
    return hasValidLifecycleShape(entity)
        && entity.active !== false
        && entity.deleted !== true
        && !isPlatformEntityBlocked(entity);
}
