import { isReservedProjectSlug } from '@constant/reservedSlugs';
import {
    resolveAvailableProjectSlug,
    type ProjectSlugSummary,
} from '@lib/menu/projectSlugOwnership';
import { slugify } from '@lib/utils/slugify';

/** Resolve one stable, non-reserved project URL inside the current store. */
export function resolvePublicMenuEntryProjectSlug(
    projects: Record<string, ProjectSlugSummary>,
    projectName: string,
    projectId: string,
): string {
    let proposedSlug = slugify(projectName) || 'menu';
    if (isReservedProjectSlug(proposedSlug)) proposedSlug = `${proposedSlug}-menu`;
    return resolveAvailableProjectSlug(projects, proposedSlug, projectId);
}
