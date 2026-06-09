export type SelectableProject = {
    active?: boolean;
    deleted?: boolean;
    isDefault?: boolean;
    projectId?: string | null;
};

const OWNER_SELECTED_PROJECT_KEY = 'mobileSelectedProjectId';
const LEGACY_DASHBOARD_PROJECT_KEY = 'menulist_dashboard_project_id';

function getOwnerProjectStoreScope(storeId?: string | number | null) {
    if (storeId === null || storeId === undefined || storeId === '') return null;
    const normalized = String(storeId);
    return normalized && normalized !== '0' ? normalized : null;
}

function getOwnerProjectStorageKey(storeId?: string | number | null) {
    const storeScope = getOwnerProjectStoreScope(storeId);
    return storeScope ? `${OWNER_SELECTED_PROJECT_KEY}:${storeScope}` : OWNER_SELECTED_PROJECT_KEY;
}

export function getStoredOwnerProjectId(storeId?: string | number | null) {
    if (typeof window === 'undefined') return null;
    const hasStoreScope = Boolean(getOwnerProjectStoreScope(storeId));

    try {
        const scopedProjectId = window.localStorage.getItem(getOwnerProjectStorageKey(storeId));
        if (scopedProjectId) return scopedProjectId;
    } catch {
        // Ignore storage access failures; session storage fallback is only safe without a store scope.
    }

    if (hasStoreScope) return null;

    try {
        return window.sessionStorage.getItem(LEGACY_DASHBOARD_PROJECT_KEY);
    } catch {
        return null;
    }
}

export function setStoredOwnerProjectId(projectId?: string | null, storeId?: string | number | null) {
    if (typeof window === 'undefined') return;

    try {
        const key = getOwnerProjectStorageKey(storeId);
        if (projectId) {
            window.localStorage.setItem(key, projectId);
        } else {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Storage can be unavailable in restricted browser contexts.
    }

    try {
        if (projectId) {
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
    const activeProjects = availableProjects.filter((project) => project.active !== false);
    const selectionPool = activeProjects.length ? activeProjects : availableProjects.length ? availableProjects : projects;

    if (!selectionPool.length) return null;

    if (preferredProjectId) {
        const preferredProject = availableProjects.find((project) => project.projectId === preferredProjectId)
            || projects.find((project) => project.projectId === preferredProjectId);
        if (preferredProject) return preferredProject;
    }

    return selectionPool.find((project) => project.isDefault) || selectionPool[0] || null;
}
