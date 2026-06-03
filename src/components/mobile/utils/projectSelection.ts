'use client'

import {
    getStoredOwnerProjectId,
    resolveSelectableProject,
    setStoredOwnerProjectId,
    type SelectableProject,
} from '@lib/projects/projectSelection';

type ProjectLike = {
    active?: boolean;
    deleted?: boolean;
    isDefault?: boolean;
    name?: string | null;
    projectId?: string | null;
} & SelectableProject;

export function getStoredMobileProjectId(storeId?: string | number | null) {
    return getStoredOwnerProjectId(storeId);
}

export function setStoredMobileProjectId(projectId?: string | null, storeId?: string | number | null) {
    setStoredOwnerProjectId(projectId, storeId);
}

export function resolveMobileSelectedProject<T extends ProjectLike>(
    projects: T[],
    preferredProjectId?: string | null,
) {
    return resolveSelectableProject(projects, preferredProjectId);
}
