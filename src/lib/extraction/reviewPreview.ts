import type { ComparisonEngineOutput } from './comparisonEngine.types';

export type ReviewPreviewState = ComparisonEngineOutput['preview'];

export interface ReviewPreviewSession {
    identity: string;
    preview: ReviewPreviewState;
}

export const MAX_IMPLICIT_REVIEW_APPROVALS = 200;

export function countReviewCandidates(preview: ReviewPreviewState): number {
    return (
        preview.newCategories.length
        + preview.updatedCategories.length
        + preview.newItems.length
        + preview.updatedItems.length
        + preview.overrideSuggestions.length
    );
}

export function prepareInitialReviewPreview(preview: ReviewPreviewState): ReviewPreviewState {
    return countReviewCandidates(preview) > MAX_IMPLICIT_REVIEW_APPROVALS
        ? setAllPreviewApprovals(preview, false)
        : preview;
}

export function getReviewPreviewIdentity(projectId: string, jobId: string): string {
    return `${projectId.length}:${projectId}${jobId.length}:${jobId}`;
}

export function createReviewPreviewSession(
    projectId: string,
    jobId: string,
    preview: ReviewPreviewState,
): ReviewPreviewSession {
    return {
        identity: getReviewPreviewIdentity(projectId, jobId),
        preview: prepareInitialReviewPreview(preview),
    };
}

export function resolveReviewPreviewSession(
    session: ReviewPreviewSession,
    projectId: string,
    jobId: string,
    preview: ReviewPreviewState,
): ReviewPreviewSession {
    const identity = getReviewPreviewIdentity(projectId, jobId);
    return session.identity === identity
        ? session
        : createReviewPreviewSession(projectId, jobId, preview);
}

export function updateReviewPreviewSession(
    session: ReviewPreviewSession,
    projectId: string,
    jobId: string,
    initialPreview: ReviewPreviewState,
    update: (preview: ReviewPreviewState) => ReviewPreviewState,
): ReviewPreviewSession {
    const activeSession = resolveReviewPreviewSession(session, projectId, jobId, initialPreview);
    return {
        ...activeSession,
        preview: update(activeSession.preview),
    };
}

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

function getNewCategoryId(category: ReviewPreviewState['newCategories'][number]): string {
    return category.generatedId || category.extractedCategory.id;
}

function enforceNewItemCategoryApprovals(preview: ReviewPreviewState): ReviewPreviewState {
    const newCategoryIds = new Set(preview.newCategories.map(getNewCategoryId));
    const approvedNewCategoryIds = new Set(
        preview.newCategories.filter((category) => category.approved).map(getNewCategoryId),
    );

    return {
        ...preview,
        newItems: preview.newItems.map((item) => {
            const categoryId = item.targetCategoryId || item.extractedItem.categoryId;
            return newCategoryIds.has(categoryId) && !approvedNewCategoryIds.has(categoryId)
                ? { ...item, approved: false }
                : item;
        }),
    };
}

export function setPreviewCategoryApproval(
    preview: ReviewPreviewState,
    index: number,
    group: 'new' | 'updated',
    approved: boolean,
): ReviewPreviewState {
    const key = group === 'new' ? 'newCategories' : 'updatedCategories';
    const categories = [...preview[key]];
    if (!categories[index]) return preview;
    categories[index] = { ...categories[index], approved };
    const next = { ...preview, [key]: categories };
    return group === 'new' && !approved ? enforceNewItemCategoryApprovals(next) : next;
}

export function setPreviewItemApproval(
    preview: ReviewPreviewState,
    index: number,
    group: 'new' | 'updated' | 'override',
    approved: boolean,
): ReviewPreviewState {
    const key = group === 'new'
        ? 'newItems'
        : group === 'updated'
            ? 'updatedItems'
            : 'overrideSuggestions';
    const items = [...preview[key]];
    const item = items[index];
    if (!item) return preview;
    items[index] = { ...item, approved };
    let next = { ...preview, [key]: items };

    if (group === 'new' && approved) {
        const categoryId = item.targetCategoryId || item.extractedItem.categoryId;
        next = {
            ...next,
            newCategories: next.newCategories.map((category) => (
                getNewCategoryId(category) === categoryId
                    ? { ...category, approved: true }
                    : category
            )),
        };
    }

    return next;
}

export function setSafePreviewApprovals(preview: ReviewPreviewState): ReviewPreviewState {
    return enforceNewItemCategoryApprovals({
        ...preview,
        newCategories: preview.newCategories.map((item) => ({ ...item, approved: isRowSafe(item) })),
        updatedCategories: preview.updatedCategories.map((item) => ({ ...item, approved: isRowSafe(item) })),
        newItems: preview.newItems.map((item) => ({ ...item, approved: isRowSafe(item) })),
        updatedItems: preview.updatedItems.map((item) => ({ ...item, approved: isRowSafe(item) })),
        overrideSuggestions: preview.overrideSuggestions.map((item) => ({ ...item, approved: isRowSafe(item) })),
    });
}
