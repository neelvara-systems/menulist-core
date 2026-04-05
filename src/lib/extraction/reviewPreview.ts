import type { ComparisonEngineOutput } from './comparisonEngine.types';

export type ReviewPreviewState = ComparisonEngineOutput['preview'];

function isRowSafe(row: { warnings?: string[]; matchType?: string }) {
    return !(row.warnings?.length) && row.matchType !== 'weak';
}

export function countApprovedChanges(preview: ReviewPreviewState): number {
    return (
        preview.newCategories.filter((item) => item.approved).length
        + preview.updatedCategories.filter((item) => item.approved).length
        + preview.newItems.filter((item) => item.approved).length
        + preview.updatedItems.filter((item) => item.approved).length
        + preview.overrideSuggestions.filter((item) => item.approved).length
    );
}

export function hasAnyPreviewChanges(preview: ReviewPreviewState): boolean {
    return Boolean(
        preview.newCategories.length
        || preview.updatedCategories.length
        || preview.newItems.length
        || preview.updatedItems.length
        || preview.overrideSuggestions.length
    );
}

export function setAllPreviewApprovals(preview: ReviewPreviewState, approved: boolean): ReviewPreviewState {
    return {
        ...preview,
        newCategories: preview.newCategories.map((item) => ({ ...item, approved })),
        updatedCategories: preview.updatedCategories.map((item) => ({ ...item, approved })),
        newItems: preview.newItems.map((item) => ({ ...item, approved })),
        updatedItems: preview.updatedItems.map((item) => ({ ...item, approved })),
        overrideSuggestions: preview.overrideSuggestions.map((item) => ({ ...item, approved })),
    };
}

export function setSafePreviewApprovals(preview: ReviewPreviewState): ReviewPreviewState {
    return {
        ...preview,
        newCategories: preview.newCategories.map((item) => ({ ...item, approved: isRowSafe(item) })),
        updatedCategories: preview.updatedCategories.map((item) => ({ ...item, approved: isRowSafe(item) })),
        newItems: preview.newItems.map((item) => ({ ...item, approved: isRowSafe(item) })),
        updatedItems: preview.updatedItems.map((item) => ({ ...item, approved: isRowSafe(item) })),
        overrideSuggestions: preview.overrideSuggestions.map((item) => ({ ...item, approved: isRowSafe(item) })),
    };
}
