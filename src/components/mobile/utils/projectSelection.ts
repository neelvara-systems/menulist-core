'use client'

type ProjectLike = {
    active?: boolean;
    isDefault?: boolean;
    name?: string | null;
    projectId?: string | null;
};

const MOBILE_SELECTED_PROJECT_KEY = 'mobileSelectedProjectId';

function getStorageKey(storeId?: string | number | null) {
    return storeId ? `${MOBILE_SELECTED_PROJECT_KEY}:${String(storeId)}` : MOBILE_SELECTED_PROJECT_KEY;
}

export function getStoredMobileProjectId(storeId?: string | number | null) {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage.getItem(getStorageKey(storeId));
    } catch {
        return null;
    }
}

export function setStoredMobileProjectId(projectId?: string | null, storeId?: string | number | null) {
    if (typeof window === 'undefined') return;

    try {
        const key = getStorageKey(storeId);
        if (projectId) {
            window.localStorage.setItem(key, projectId);
            return;
        }
        window.localStorage.removeItem(key);
    } catch {
        return;
    }
}

export function resolveMobileSelectedProject<T extends ProjectLike>(
    projects: T[],
    preferredProjectId?: string | null,
) {
    const activeProjects = projects.filter((project) => project.active !== false);
    const selectionPool = activeProjects.length ? activeProjects : projects;

    if (!selectionPool.length) return null;

    if (preferredProjectId) {
        const preferredProject = selectionPool.find((project) => project.projectId === preferredProjectId);
        if (preferredProject) return preferredProject;
    }

    return selectionPool.find((project) => project.isDefault) || selectionPool[0] || null;
}
