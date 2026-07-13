/**
 * Parse projects from a platformSummary/projects_{storeId} document.
 *
 * Handles both storage formats:
 * 1. Nested (modern): { projects: { projectId: {...} } }
 * 2. Flat dot-notation (legacy/Admin SDK set): { "projects.projectId": {...} }
 *    — Sometimes also sub-fields: { "projects.projectId.specialMenuStatus": "active" }
 *
 * Why both exist:
 * Admin SDK `.set()` and some client SDK writes stored dotted keys literally
 * instead of as nested paths. This parser normalizes both into a single
 * { projectId: projectData } map so callers don't care about storage format.
 *
 * @see __docs__/url-routing-architecture/README.md — projectsSummary contract
 */
import {
    isSafeSummaryMapSegment,
    isSummaryMapRecord,
    parseSummaryMap,
    type SummaryMapData,
} from './summaryMapParser';

export type SummaryProjectData = SummaryMapData;
export type SummaryProjectWithId = SummaryProjectData & { projectId: string };

export function withAuthoritativeSummaryProjectId(
    projectId: string,
    data: SummaryProjectData,
): SummaryProjectWithId {
    return { ...data, projectId };
}

export function isActiveRegularSummaryProject(project: SummaryProjectData): boolean {
    return project.active !== false
        && project.deleted !== true
        && project.isSpecialMenu !== true;
}

export function isDefaultSummaryProject(project: SummaryProjectData): boolean {
    return project.isDefault === true;
}

export function normalizeSummaryProjectLocalizedText(
    value: unknown,
): string | Record<string, string> | null {
    if (typeof value === 'string') return value.trim() || null;
    if (!isSummaryMapRecord(value)) return null;

    const normalized = Object.create(null) as Record<string, string>;
    for (const [language, text] of Object.entries(value)) {
        if (isSafeSummaryMapSegment(language) && typeof text === 'string' && text.trim()) normalized[language] = text;
    }
    return Object.keys(normalized).length > 0 ? { ...normalized } : null;
}

export function isCurrentActiveSpecialSummaryProject(
    project: SummaryProjectWithId,
    expectedProjectId: string,
    nowMs: number,
): boolean {
    if (
        project.projectId !== expectedProjectId
        || project.active === false
        || project.deleted === true
        || project.isSpecialMenu !== true
        || project.specialMenuStatus !== 'active'
    ) return false;

    if (project.specialMenuEndsAt === undefined || project.specialMenuEndsAt === null || project.specialMenuEndsAt === '') {
        return true;
    }
    if (typeof project.specialMenuEndsAt !== 'string') return false;
    const endsAtMs = Date.parse(project.specialMenuEndsAt);
    return Number.isFinite(endsAtMs) && endsAtMs > nowMs;
}

export function parseSummaryProjects(data: unknown): Record<string, SummaryProjectData> {
    return parseSummaryMap(data, 'projects');
}
