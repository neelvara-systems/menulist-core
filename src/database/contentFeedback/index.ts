import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    AnswerlatticeContentFeedbackResultSchema,
    parseAnswerlatticeContentFeedbackRequest,
} from '@lib/answerlattice/contentFeedbackContracts';
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import { normalizeAnswerlatticeFaqId } from '@lib/answerlattice/faqIdBoundary';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import { apiCallComposerClientWithoutLoader } from '@lib/apiHelper/apiCallComposerClientWithoutLoader';
import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type { SourceContext } from '@type/multiProduct';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

const db = answerlatticeFirebaseClient;

type ContentType = 'changelog' | 'article' | 'faq' | 'workflow';
type ContentFeedbackAction = 'added' | 'removed';
const CONTENT_FEEDBACK_RESPONSE_MAX_BYTES = 64 * 1024;
const MAX_PENDING_CONTENT_FEEDBACK_REQUESTS = 200;
const pendingContentFeedbackRequests = new Map<string, { fingerprint: string; requestId: string }>();

export type ContentFeedbackItem = {
    requestId?: string;
    comment: string;
    sentiment: 'like' | 'dislike';
    action?: ContentFeedbackAction;
    createdOn: Timestamp;
    uId: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    sourceContext?: SourceContext;
};

export type ContentFeedbackMutationInput = {
    type: 'changelog' | 'article' | 'faq';
    contentId: string;
    pageId?: string;
    sentiment: 'like' | 'dislike';
    increment?: boolean;
    comment?: string;
    action?: ContentFeedbackAction;
};

const normalizeContentFeedbackDocumentId = (value: unknown): string | null => {
    const documentId = typeof value === 'string' ? value.trim() : '';
    return documentId && documentId.length <= 180 && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
};

const getContentFeedbackRequestId = (key: string, fingerprint: string) => {
    const pending = pendingContentFeedbackRequests.get(key);
    if (pending?.fingerprint === fingerprint) return pending.requestId;
    if (pendingContentFeedbackRequests.size >= MAX_PENDING_CONTENT_FEEDBACK_REQUESTS) {
        const oldest = pendingContentFeedbackRequests.keys().next().value;
        if (oldest) pendingContentFeedbackRequests.delete(oldest);
    }
    const requestId = createRuntimeId('content_feedback');
    pendingContentFeedbackRequests.set(key, { fingerprint, requestId });
    return requestId;
};

const normalizePositiveContentFeedbackScopeId = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeOptionalContentFeedbackText = (
    value: unknown,
    maxLength: number,
): string | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
};

const normalizeContentFeedbackSourceContext = (value: unknown): SourceContext | null | undefined => {
    if (value === undefined || value === null) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const allowedKeys = new Set(['uId', 'name', 'email', 'phone', 'pId', 'tId', 'sId']);
    if (Object.keys(record).some(key => !allowedKeys.has(key))) return null;
    const uId = typeof record.uId === 'string' || typeof record.uId === 'number' ? record.uId : null;
    const name = normalizeOptionalContentFeedbackText(record.name, 160);
    const email = record.email === '' ? '' : normalizeOptionalContentFeedbackText(record.email, 180);
    const phone = normalizeOptionalContentFeedbackText(record.phone, 80);
    const pId = typeof record.pId === 'string'
        && Object.values(PRODUCT_IDS).some(productId => productId === record.pId)
        ? record.pId as ProductId
        : record.pId === undefined ? undefined : null;
    const tId = record.tId === undefined ? undefined : normalizePositiveContentFeedbackScopeId(record.tId);
    const sId = record.sId === undefined ? undefined : normalizePositiveContentFeedbackScopeId(record.sId);
    if (uId === null
        || !name
        || email === null
        || email === undefined
        || phone === null
        || pId === null
        || tId === null
        || sId === null) return null;
    return {
        uId,
        name,
        email,
        ...(phone ? { phone } : {}),
        ...(pId ? { pId } : {}),
        ...(tId ? { tId } : {}),
        ...(sId ? { sId } : {}),
    };
};

export const normalizeContentFeedbackItem = (value: unknown): ContentFeedbackItem | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const requestId = record.requestId === undefined
        ? undefined
        : typeof record.requestId === 'string' && /^[a-f0-9]{24}$/.test(record.requestId)
            ? record.requestId
            : null;
    const comment = typeof record.comment === 'string'
        ? sanitizeFeedbackComment(record.comment, 500)
        : null;
    const action = record.action === undefined
        ? undefined
        : record.action === 'added' || record.action === 'removed' ? record.action : null;
    const uId = normalizeOptionalContentFeedbackText(record.uId, 180);
    const userName = normalizeOptionalContentFeedbackText(record.userName, 160);
    const userEmail = normalizeOptionalContentFeedbackText(record.userEmail, 180);
    const userPhone = normalizeOptionalContentFeedbackText(record.userPhone, 80);
    const sourceContext = normalizeContentFeedbackSourceContext(record.sourceContext);
    if (requestId === null
        || comment === null
        || (record.sentiment !== 'like' && record.sentiment !== 'dislike')
        || action === null
        || !uId
        || userName === null
        || userEmail === null
        || userPhone === null
        || sourceContext === null
        || !(record.createdOn instanceof Timestamp)) {
        return null;
    }
    return {
        ...(requestId ? { requestId } : {}),
        comment,
        sentiment: record.sentiment,
        ...(action ? { action } : {}),
        createdOn: record.createdOn,
        uId,
        ...(userName ? { userName } : {}),
        ...(userEmail ? { userEmail } : {}),
        ...(userPhone ? { userPhone } : {}),
        ...(sourceContext ? { sourceContext } : {}),
    };
};

const getCollectionName = (type: ContentType) => {
    if (type === 'changelog') return DB_COLLECTIONS.CHANGELOG_FEEDBACK;
    if (type === 'article') return DB_COLLECTIONS.ARTICLE_FEEDBACK;
    if (type === 'faq') return DB_COLLECTIONS.FAQ_FEEDBACK;
    throw new Error('Content feedback comments are not supported for this content type.');
};

/** Updates an article/changelog/FAQ counter and bounded audit history atomically on the server. */
export const updateContentFeedbackWithAudit = async (
    input: ContentFeedbackMutationInput,
) => {
    if ((input.type !== 'article' && input.type !== 'changelog' && input.type !== 'faq')
        || (input.sentiment !== 'like' && input.sentiment !== 'dislike')
        || (input.increment !== undefined && typeof input.increment !== 'boolean')
        || (input.comment !== undefined && typeof input.comment !== 'string')
        || (input.action !== undefined && input.action !== 'added' && input.action !== 'removed')) {
        throw new Error('Invalid content feedback input');
    }
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    const contentId = input.type === 'article'
        ? normalizeAnswerlatticeKbArticleId(input.contentId)
        : input.type === 'faq'
            ? normalizeAnswerlatticeFaqId(input.contentId)
            : normalizeContentFeedbackDocumentId(input.contentId);
    const pageId = input.type === 'changelog'
        ? normalizeContentFeedbackDocumentId(input.pageId)
        : null;
    if (!scope || !session?.uId || !contentId || (input.type === 'changelog' && !pageId)) {
        throw new Error('Invalid content feedback context');
    }
    const action = input.action || (input.increment === false ? 'removed' : 'added');
    const requestKey = [
        scope.tenantId,
        scope.storeId,
        session.uId,
        input.type,
        contentId,
        pageId || '',
        input.sentiment,
        input.increment === false ? 'remove' : 'add',
    ].join(':');
    const requestFingerprint = JSON.stringify({ action, comment: input.comment || '' });
    const requestId = getContentFeedbackRequestId(requestKey, requestFingerprint);
    const request = parseAnswerlatticeContentFeedbackRequest({
        requestId,
        type: input.type,
        contentId,
        ...(pageId ? { pageId } : {}),
        sentiment: input.sentiment,
        increment: input.increment !== false,
        comment: input.comment || '',
        action,
    });
    if (!request) throw new Error('Invalid content feedback input');

    const response = await fetch('/api/answerlattice/content-feedback', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });
    const payload = await readJsonResponseWithLimit<unknown>(response, CONTENT_FEEDBACK_RESPONSE_MAX_BYTES)
        .catch(() => null);
    if (!response.ok) throw new Error('Content feedback could not be saved');
    const parsed = AnswerlatticeContentFeedbackResultSchema.safeParse(payload);
    if (!parsed.success) throw new Error('Content feedback returned an invalid response');
    pendingContentFeedbackRequests.delete(requestKey);
    return parsed.data;
};

export const getContentFeedbackForEntry = async (
    type: ContentType,
    entryId: string,
): Promise<ContentFeedbackItem[]> => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const session = await getActiveSession();
            const scope = resolveAnswerlatticeSessionScope(session);
            const normalizedEntryId = type === 'article'
                ? normalizeAnswerlatticeKbArticleId(entryId)
                : type === 'faq'
                    ? normalizeAnswerlatticeFaqId(entryId)
                    : normalizeContentFeedbackDocumentId(entryId);
            if (!scope || !normalizedEntryId || (type !== 'article' && type !== 'changelog' && type !== 'faq')) return [];

            const feedbackDocRef = doc(
                db,
                getCollectionName(type),
                String(scope.tenantId),
                String(scope.storeId),
                `doc1_${normalizedEntryId}`,
            );
            const feedbackDoc = await getDoc(feedbackDocRef);
            if (!feedbackDoc.exists()) return [];

            const list = feedbackDoc.data()?.list;
            if (!Array.isArray(list)) return [];
            return list
                .map(normalizeContentFeedbackItem)
                .filter((item): item is ContentFeedbackItem => Boolean(item))
                .slice(-100)
                .reverse();
        },
        { type, entryId },
        'getContentFeedbackForEntry',
    );
};
