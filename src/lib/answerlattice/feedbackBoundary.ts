import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import type { Feedback } from '@type/feedback';
import type { SourceContext } from '@type/multiProduct';
import { Timestamp } from 'firebase/firestore';

export const ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH = 1_000;
export const ANSWERLATTICE_FEEDBACK_DOCUMENT_ID_MAX_LENGTH = 180;

export const ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES = [
    'Account access',
    'Billing and invoices',
    'Onboarding and setup',
    'Team roles and permissions',
    'Settings and configuration',
    'Integrations',
    'Data import or export',
    'Notifications and email',
    'Reports and analytics',
    'Performance or reliability',
] as const;

export const ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS = [
    'Clearer setup guides',
    'More integration options',
    'Better billing controls',
    'Easier data export and reports',
    'Faster issue status updates',
] as const;

type FeedbackType = 'general' | 'feature_usage' | 'feature_requests';

export type AnswerlatticeFeedbackSubmission = {
    type: FeedbackType;
    rating?: number;
    comment?: string;
    featureComment?: string;
    featureIssues?: string[];
    featureRequest?: string;
    votedPopularRequests?: Array<{ feature: string; interested: boolean }>;
};

export const normalizeAnswerlatticeFeedbackDocumentId = (value: unknown): string | null => {
    const documentId = typeof value === 'string' ? value.trim() : '';
    if (!documentId || documentId.length > ANSWERLATTICE_FEEDBACK_DOCUMENT_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(documentId) ? documentId : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeOptionalText = (value: unknown): string | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized && normalized.length <= ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH
        ? normalized
        : null;
};

const normalizeBoundedOptionalText = (
    value: unknown,
    maxLength: number,
): string | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
};

const normalizeFeedbackScopeValue = (value: unknown): string | number | null => {
    if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized.length <= ANSWERLATTICE_FEEDBACK_DOCUMENT_ID_MAX_LENGTH
        ? normalized
        : null;
};

const normalizeFeedbackSourceProductId = (value: unknown): ProductId | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return Object.values(PRODUCT_IDS).some(productId => productId === normalized)
        ? normalized as ProductId
        : null;
};

const normalizeFeedbackSourceContext = (value: unknown): SourceContext | null | undefined => {
    if (value === undefined || value === null) return null;
    if (!isRecord(value)) return undefined;
    const allowedKeys = new Set(['uId', 'name', 'email', 'phone', 'pId', 'tId', 'sId']);
    if (Object.keys(value).some(key => !allowedKeys.has(key))) return undefined;
    const uId = normalizeFeedbackScopeValue(value.uId);
    const name = normalizeBoundedOptionalText(value.name, 1_000);
    const email = normalizeBoundedOptionalText(value.email, 1_000);
    const phone = normalizeBoundedOptionalText(value.phone, 1_000);
    const tId = value.tId === undefined ? undefined : normalizeFeedbackScopeValue(value.tId);
    const sId = value.sId === undefined ? undefined : normalizeFeedbackScopeValue(value.sId);
    const pId = normalizeFeedbackSourceProductId(value.pId);
    if (uId === null || !name || !email || phone === null || tId === null || sId === null || pId === null) return undefined;
    return {
        uId,
        name,
        email,
        ...(phone ? { phone } : {}),
        ...(pId ? { pId } : {}),
        ...(typeof tId === 'number' ? { tId } : {}),
        ...(typeof sId === 'number' ? { sId } : {}),
    };
};

const normalizeFeatureIssues = (value: unknown): string[] | null | undefined => {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value) || value.length > ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES.length) return null;
    const allowed = new Set<string>(ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES);
    if (value.some(item => typeof item !== 'string' || !allowed.has(item))) return null;
    const unique = Array.from(new Set(value));
    return unique.length === value.length ? unique : null;
};

const normalizePopularRequests = (
    value: unknown,
): AnswerlatticeFeedbackSubmission['votedPopularRequests'] | null | undefined => {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value) || value.length > ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS.length) return null;
    const allowed = new Set<string>(ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS);
    const seen = new Set<string>();
    const normalized: NonNullable<AnswerlatticeFeedbackSubmission['votedPopularRequests']> = [];
    for (const item of value) {
        if (!isRecord(item)
            || Object.keys(item).some(key => key !== 'feature' && key !== 'interested')
            || typeof item.feature !== 'string'
            || !allowed.has(item.feature)
            || typeof item.interested !== 'boolean'
            || seen.has(item.feature)) {
            return null;
        }
        seen.add(item.feature);
        normalized.push({ feature: item.feature, interested: item.interested });
    }
    return normalized;
};

export const normalizeAnswerlatticeFeedbackSubmission = (
    value: unknown,
): AnswerlatticeFeedbackSubmission | null => {
    if (!isRecord(value)) return null;
    const rawType = value.type === 'feature_request' ? 'feature_requests' : value.type;
    if (rawType !== 'general' && rawType !== 'feature_usage' && rawType !== 'feature_requests') return null;

    const comment = normalizeOptionalText(value.comment);
    const featureComment = normalizeOptionalText(value.featureComment);
    const featureRequest = normalizeOptionalText(value.featureRequest);
    const featureIssues = normalizeFeatureIssues(value.featureIssues);
    const votedPopularRequests = normalizePopularRequests(value.votedPopularRequests);
    if (comment === null
        || featureComment === null
        || featureRequest === null
        || featureIssues === null
        || votedPopularRequests === null) {
        return null;
    }

    if (rawType === 'general') {
        if (!Number.isInteger(value.rating) || Number(value.rating) < 1 || Number(value.rating) > 5 || !comment) return null;
        return { type: rawType, rating: Number(value.rating), comment };
    }
    if (rawType === 'feature_usage') {
        if (!featureComment && !featureIssues?.length) return null;
        return {
            type: rawType,
            ...(featureComment ? { featureComment } : {}),
            ...(featureIssues?.length ? { featureIssues } : {}),
        };
    }
    if (!featureRequest && !votedPopularRequests?.length) return null;
    return {
        type: rawType,
        ...(featureRequest ? { featureRequest } : {}),
        ...(votedPopularRequests?.length ? { votedPopularRequests } : {}),
    };
};

export const normalizeAnswerlatticeFeedbackRecord = (
    value: unknown,
    documentId: unknown,
): Feedback | null => {
    if (!isRecord(value)) return null;
    const id = normalizeAnswerlatticeFeedbackDocumentId(documentId);
    const tId = normalizeFeedbackScopeValue(value.tId);
    const sId = normalizeFeedbackScopeValue(value.sId);
    const uId = normalizeFeedbackScopeValue(value.uId);
    const sourceContext = normalizeFeedbackSourceContext(value.sourceContext);
    const submission = normalizeAnswerlatticeFeedbackSubmission(value);
    if (!id
        || (value.pId !== undefined && value.pId !== 'AL')
        || tId === null
        || sId === null
        || uId === null
        || sourceContext === undefined
        || !submission
        || !(value.createdOn instanceof Timestamp)) {
        return null;
    }

    const contextKey = normalizeBoundedOptionalText(value.contextKey, 180);
    const surfaceId = normalizeBoundedOptionalText(value.surfaceId, 180);
    const surfaceLabel = normalizeBoundedOptionalText(value.surfaceLabel, 180);
    const surfaceAssignedBy = normalizeBoundedOptionalText(value.surfaceAssignedBy, 180);
    const traceId = normalizeBoundedOptionalText(value.traceId, 180);
    const requestId = normalizeBoundedOptionalText(value.requestId, 180);
    const role = normalizeBoundedOptionalText(value.role, 80);
    const modifiedBy = normalizeBoundedOptionalText(value.modifiedBy, 200);
    const createdBy = normalizeBoundedOptionalText(value.createdBy, 200);
    if ([contextKey, surfaceId, surfaceLabel, surfaceAssignedBy, traceId, requestId, role, modifiedBy, createdBy].includes(null)) {
        return null;
    }
    if (value.surfaceAssignedAt !== undefined
        && value.surfaceAssignedAt !== null
        && !(value.surfaceAssignedAt instanceof Timestamp)) {
        return null;
    }
    if (value.modifiedOn !== undefined && !(value.modifiedOn instanceof Timestamp)) return null;

    return {
        id,
        pId: 'AL',
        sourceContext: sourceContext ?? null,
        tId,
        sId,
        uId,
        ...submission,
        ...(contextKey !== undefined ? { contextKey } : {}),
        ...(surfaceId !== undefined ? { surfaceId } : {}),
        ...(surfaceLabel !== undefined ? { surfaceLabel } : {}),
        ...(surfaceAssignedBy !== undefined ? { surfaceAssignedBy } : {}),
        ...(value.surfaceAssignedAt !== undefined ? { surfaceAssignedAt: value.surfaceAssignedAt as Timestamp | null } : {}),
        ...(traceId !== undefined ? { traceId } : {}),
        ...(requestId !== undefined ? { requestId } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(modifiedBy !== undefined ? { modifiedBy } : {}),
        ...(value.modifiedOn !== undefined ? { modifiedOn: value.modifiedOn as Timestamp } : {}),
        ...(createdBy !== undefined ? { createdBy } : {}),
        createdOn: value.createdOn,
    };
};
