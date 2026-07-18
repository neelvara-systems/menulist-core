import { normalizeStarterActivationTimestamp } from '@lib/onboarding/starterActivation';

type PublishedMenuProjectLike = {
    active?: unknown;
    deleted?: unknown;
    lastPublishedAt?: unknown;
    projectId?: unknown;
};

/**
 * A project is ready for owner-facing distribution only after an explicit,
 * valid publish acknowledgement. Merely creating an active project is not
 * enough: new projects are active before their first publish.
 */
export const isPublishedMenuProject = (project: PublishedMenuProjectLike | null | undefined): boolean => (
    Boolean(project)
    && project?.active !== false
    && project?.deleted !== true
    && typeof project?.projectId === 'string'
    && Boolean(project.projectId.trim())
    && Boolean(normalizeStarterActivationTimestamp(project.lastPublishedAt))
);

export const hasPublishedMenuProject = (
    projects: readonly PublishedMenuProjectLike[] | null | undefined,
): boolean => Array.isArray(projects) && projects.some(isPublishedMenuProject);

export const hasPublishedStoreMenu = (
    store: { lastPublishedAt?: unknown } | null | undefined,
): boolean => Boolean(normalizeStarterActivationTimestamp(store?.lastPublishedAt));

export const isMenuPresenceConfirmed = (value: unknown): boolean => (
    Boolean(normalizeStarterActivationTimestamp(value))
);

export const hasFeedbackPresenceReadiness = ({
    feedbackEnabled,
    hasPublishedMenu,
}: {
    feedbackEnabled: unknown;
    hasPublishedMenu: boolean;
}): boolean => hasPublishedMenu && feedbackEnabled !== false;
