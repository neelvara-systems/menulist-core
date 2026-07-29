import { normalizeStorePermissionScopeDocumentId } from '@lib/permissions/scopeDocumentId';

const LAST_CLAIM_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const PUBLIC_CREATE_MENU_LAST_CLAIM_KEY = 'menulist:create-menu:last-claim';

export type PublicCreateMenuLastClaimHandoff = {
    version: 1;
    tenantId: number;
    storeId: number;
    projectId: number;
    subdomain: string;
    savedAt: number;
};

type PublicCreateMenuLastClaimInput = {
    tenantId: unknown;
    storeId: unknown;
    projectId: unknown;
    subdomain: unknown;
};

export function projectPublicCreateMenuLastClaimHandoff(
    value: unknown,
    now = Date.now(),
): PublicCreateMenuLastClaimHandoff | null {
    if (
        !value
        || typeof value !== 'object'
        || Array.isArray(value)
        || !Number.isSafeInteger(now)
        || now <= 0
    ) {
        return null;
    }
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => ![
        'version',
        'tenantId',
        'storeId',
        'projectId',
        'subdomain',
        'savedAt',
    ].includes(key))) {
        return null;
    }

    const tenant = normalizeStorePermissionScopeDocumentId(record.tenantId);
    const store = normalizeStorePermissionScopeDocumentId(record.storeId);
    const project = normalizeStorePermissionScopeDocumentId(record.projectId);
    const subdomain = typeof record.subdomain === 'string' ? record.subdomain : '';
    const savedAt = record.savedAt;
    if (
        record.version !== 1
        || !tenant
        || !store
        || !project
        || !SUBDOMAIN_PATTERN.test(subdomain)
        || !Number.isSafeInteger(savedAt)
    ) {
        return null;
    }

    const savedAtMs = savedAt as number;
    if (savedAtMs <= 0 || savedAtMs > now || now - savedAtMs > LAST_CLAIM_MAX_AGE_MS) {
        return null;
    }
    return {
        version: 1,
        tenantId: tenant.numericId,
        storeId: store.numericId,
        projectId: project.numericId,
        subdomain,
        savedAt: savedAtMs,
    };
}

export function serializePublicCreateMenuLastClaimHandoff(
    value: PublicCreateMenuLastClaimInput,
    savedAt = Date.now(),
): string | null {
    const projected = projectPublicCreateMenuLastClaimHandoff({
        version: 1,
        ...value,
        savedAt,
    }, savedAt);
    return projected ? JSON.stringify(projected) : null;
}

export function parsePublicCreateMenuLastClaimHandoff(
    value: string | null | undefined,
    now = Date.now(),
): PublicCreateMenuLastClaimHandoff | null {
    if (!value) return null;
    try {
        return projectPublicCreateMenuLastClaimHandoff(JSON.parse(value), now);
    } catch {
        return null;
    }
}
