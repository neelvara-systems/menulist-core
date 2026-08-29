import { isPublishedMenuProject } from '@lib/menuPresence/presenceReadiness';

type EditorSaveVisibilityProject = {
    active?: unknown;
    deleted?: unknown;
    lastPublishedAt?: unknown;
    projectId?: unknown;
};

export function getEditorSaveVisibilityState(
    project: EditorSaveVisibilityProject | null | undefined,
): 'draft' | 'live' {
    return isPublishedMenuProject(project) ? 'live' : 'draft';
}

export function hasProjectPublishChanges(
    currentProject: { lastPublishedAt?: unknown } | null | undefined,
    lastPublishedProject: unknown,
): boolean {
    if (!currentProject) return false;
    if (!currentProject.lastPublishedAt) return true;
    if (!lastPublishedProject) return false;
    return JSON.stringify(currentProject) !== JSON.stringify(lastPublishedProject);
}
