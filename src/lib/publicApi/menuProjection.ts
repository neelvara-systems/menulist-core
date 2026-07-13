import type { Project } from '@template/main-app/projects/types';
import type { ResolvedProject } from '@lib/multiOutlet/resolveProject';

/**
 * Linked outlet documents may omit master-owned metadata until the outlet has
 * its own publish. Preserve outlet values when present and otherwise inherit
 * the master metadata needed by the external snapshot contract.
 */
export function inheritLinkedPublicPullMetadata(
    resolvedProject: ResolvedProject,
    masterProject: Project,
): ResolvedProject {
    return {
        ...resolvedProject,
        languages: resolvedProject.languages?.length
            ? resolvedProject.languages
            : masterProject.languages,
        menuVersion: resolvedProject.menuVersion ?? masterProject.menuVersion,
    };
}
