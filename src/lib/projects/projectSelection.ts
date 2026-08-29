import { normalizeMultiOutletNumericDocumentId } from '@lib/multiOutlet/projectIdBoundary';

export type SelectableProject = {
    active?: boolean;
    deleted?: boolean;
    isDefault?: boolean;
    projectId?: string | null;
};

const OWNER_SELECTED_PROJECT_KEY = 'mobileSelectedProjectId';
const LEGACY_DASHBOARD_PROJECT_KEY = 'menulist_dashboard_project_id';

function getOwnerProjectStoreScope(storeId?: string | number | null) {
    return normalizeMultiOutletNumericDocumentId(storeId)?.documentId ?? null;
}

function getOwnerProjectTenantScope(tenantId?: string | number | null) {
    return normalizeMultiOutletNumericDocumentId(tenantId)?.documentId ?? null;
}

function getOwnerProjectStorageKey(
    storeId?: string | number | null,
    tenantId?: string | number | null,
): string | null {
    const storeScope = getOwnerProjectStoreScope(storeId);
    const tenantScope = getOwnerProjectTenantScope(tenantId);
    return storeScope && tenantScope
        ? `${OWNER_SELECTED_PROJECT_KEY}:${tenantScope}:${storeScope}`
        : null;
}

export function getOwnerProjectSelectionScopeKey(
    storeId?: string | number | null,
    tenantId?: string | number | null,
): string | null {
    return getOwnerProjectStorageKey(storeId, tenantId);
}

export function getStoredOwnerProjectId(
    storeId?: string | number | null,
    tenantId?: string | number | null,
) {
    if (typeof window === 'undefined') return null;
    const scopedKey = getOwnerProjectStorageKey(storeId, tenantId);

    try {
        const scopedProjectId = scopedKey
            ? window.localStorage.getItem(scopedKey)
            : null;
        if (scopedProjectId) return scopedProjectId;
    } catch {
        // Ignore storage access failures; session storage fallback is only safe without a store scope.
    }

    if (getOwnerProjectStoreScope(storeId) || getOwnerProjectTenantScope(tenantId)) return null;

    try {
        return window.sessionStorage.getItem(LEGACY_DASHBOARD_PROJECT_KEY);
    } catch {
        return null;
    }
}

export function setStoredOwnerProjectId(
    projectId?: string | null,
    storeId?: string | number | null,
    tenantId?: string | number | null,
) {
    if (typeof window === 'undefined') return;

    try {
        const key = getOwnerProjectStorageKey(storeId, tenantId);
        if (projectId && key) {
            window.localStorage.setItem(key, projectId);
        } else if (key) {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Storage can be unavailable in restricted browser contexts.
    }

    try {
        const hasScope = Boolean(getOwnerProjectStoreScope(storeId) || getOwnerProjectTenantScope(tenantId));
        if (hasScope) {
            window.sessionStorage.removeItem(LEGACY_DASHBOARD_PROJECT_KEY);
        } else if (projectId) {
            window.sessionStorage.setItem(LEGACY_DASHBOARD_PROJECT_KEY, projectId);
        } else {
            window.sessionStorage.removeItem(LEGACY_DASHBOARD_PROJECT_KEY);
        }
    } catch {
        // Keep selection best-effort.
    }
}

export function resolveSelectableProject<T extends SelectableProject>(
    projects: T[],
    preferredProjectId?: string | null,
) {
    const availableProjects = projects.filter((project) => project.deleted !== true);
    if (!availableProjects.length) return null;

    const activeProjects = availableProjects.filter((project) => project.active !== false);
    const selectionPool = activeProjects.length ? activeProjects : availableProjects;

    if (preferredProjectId) {
        const preferredProject = availableProjects.find((project) => project.projectId === preferredProjectId);
        if (preferredProject) return preferredProject;
    }

    return selectionPool.find((project) => project.isDefault) || selectionPool[0] || null;
}
