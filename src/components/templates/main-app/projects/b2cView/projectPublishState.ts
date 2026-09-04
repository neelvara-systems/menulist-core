import { isPublishedMenuProject } from '@lib/menuPresence/presenceReadiness';

type EditorSaveVisibilityProject = {
    active?: unknown;
    deleted?: unknown;
    lastPublishedAt?: unknown;
    modifiedOn?: unknown;
    projectId?: unknown;
};

function getProjectTimestampMillis(value: unknown): number | null {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (typeof value === 'string' || typeof value === 'number') {
        const millis = typeof value === 'number' ? value : Date.parse(value);
        return Number.isFinite(millis) && millis > 0 ? millis : null;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    const timestamp = value as {
        seconds?: unknown;
        toDate?: unknown;
        toMillis?: unknown;
    };
    try {
        if (typeof timestamp.toMillis === 'function') {
            const millis = timestamp.toMillis();
            return typeof millis === 'number' && Number.isFinite(millis) && millis > 0 ? millis : null;
        }
        if (typeof timestamp.toDate === 'function') {
            const date = timestamp.toDate();
            return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
        }
        if (typeof timestamp.seconds === 'number' && Number.isFinite(timestamp.seconds)) {
            const millis = timestamp.seconds * 1_000;
            return millis > 0 ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
}

export function getEditorSaveVisibilityState(
    project: EditorSaveVisibilityProject | null | undefined,
): 'draft' | 'live' {
    return isPublishedMenuProject(project) ? 'live' : 'draft';
}

export function hasProjectPublishChanges(
    currentProject: { lastPublishedAt?: unknown; modifiedOn?: unknown } | null | undefined,
    lastPublishedProject: unknown,
): boolean {
    if (!currentProject) return false;
    if (!currentProject.lastPublishedAt) return true;
    const modifiedAtMillis = getProjectTimestampMillis(currentProject.modifiedOn);
    const publishedAtMillis = getProjectTimestampMillis(currentProject.lastPublishedAt);
    if (
        modifiedAtMillis !== null
        && publishedAtMillis !== null
        && modifiedAtMillis > publishedAtMillis
    ) return true;
    if (!lastPublishedProject) return false;
    return JSON.stringify(currentProject) !== JSON.stringify(lastPublishedProject);
}
