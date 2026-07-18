import { DB_COLLECTIONS } from '@constant/database';
import { ANSWERLATTICE_FAQ_STATUS, type AnswerlatticeFaq, type AnswerlatticeRelatedFaqRef, type AnswerlatticeSurfaceContentItem } from '@type/answerlattice';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { ANSWERLATTICE_FAQ_PUBLIC_LIMIT, normalizeAnswerlatticeRetrievalFaq } from './faqContent';
import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId } from './sessionScope';
import { normalizeContextKeys, normalizeSurfaceList } from './productSurfaceContent';
import { answerlatticeTokenize } from './tokenizer';

const FAQ_CACHE_TTL_MS = 60_000;
const MAX_FAQ_CACHE_ENTRIES = 300;
const EXACT_MATCH_SCORE = 150;
const MIN_ACCEPT_SCORE = 72;
const MIN_QUERY_COVERAGE = 0.55;

type FaqCacheEntry = {
    faqs: AnswerlatticeFaq[];
    expiresAt: number;
};

type FaqCandidate = AnswerlatticeFaq & {
    _summaryOnly?: boolean;
};

export type FaqRetrievalResult = {
    found: boolean;
    faq?: AnswerlatticeFaq;
    score?: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
    references: any[];
    matchReason?: string;
};

type FaqRetrievalContext = {
    tId: number;
    sId: number;
    context?: any;
    relatedContent?: AnswerlatticeSurfaceContentItem;
    sourceVersion?: number;
    includeFullArticleReference?: boolean;
};

const faqCache = new Map<string, FaqCacheEntry>();

const rememberFaqs = (cacheKey: string, faqs: AnswerlatticeFaq[]) => {
    if (faqCache.size >= MAX_FAQ_CACHE_ENTRIES) {
        const oldestKey = faqCache.keys().next().value;
        if (oldestKey) faqCache.delete(oldestKey);
    }
    faqCache.set(cacheKey, { faqs, expiresAt: Date.now() + FAQ_CACHE_TTL_MS });
};

const readFaqsFromCache = (cacheKey: string): AnswerlatticeFaq[] | undefined => {
    const cached = faqCache.get(cacheKey);
    if (!cached) return undefined;
    if (cached.expiresAt <= Date.now()) {
        faqCache.delete(cacheKey);
        return undefined;
    }
    return cached.faqs;
};

const normalizeText = (value: unknown): string => (
    typeof value === 'string'
        ? value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : ''
);

const cleanReferenceText = (value: unknown, maxLength: number): string => (
    typeof value === 'string'
        ? value
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLength)
        : ''
);

const STOP_WORDS = new Set([
    'a',
    'about',
    'an',
    'and',
    'are',
    'can',
    'do',
    'does',
    'for',
    'from',
    'get',
    'how',
    'i',
    'in',
    'is',
    'it',
    'me',
    'my',
    'of',
    'on',
    'or',
    'the',
    'this',
    'to',
    'what',
    'when',
    'where',
    'why',
    'with',
]);

const tokenizeMeaningful = (value: unknown): string[] => Array.from(new Set(
    answerlatticeTokenize(String(value || ''), 2)
        .map(token => token.trim().toLowerCase())
        .filter(token => token && !STOP_WORDS.has(token))
));

const countOverlap = (left: string[], right: string[]): number => {
    if (!left.length || !right.length) return 0;
    const rightSet = new Set(right);
    return left.filter(token => rightSet.has(token)).length;
};

const listContextTokens = (context?: any): string[] => normalizeSurfaceList([
    context?.contextKey,
    context?.page,
    context?.feature,
    context?.workflow,
    context?.plan,
    context?.userRole,
    ...(Array.isArray(context?.entityHints) ? context.entityHints : []),
], 80, 160);

const listContextEntityIds = (context?: any): string[] => Array.from(new Set(
    [
        ...(Array.isArray(context?.surfaceEntityIds) ? context.surfaceEntityIds : []),
        ...(Array.isArray(context?.entityIds) ? context.entityIds : []),
    ]
        .map(value => String(value || '').trim())
        .filter(Boolean)
));

const listFaqContextTokens = (faq: FaqCandidate): string[] => normalizeSurfaceList([
    ...(faq.contextKeys || []),
    ...(faq.tags || []),
    faq.articleTitle,
], 80, 160);

const buildFaqFromRelatedRef = (faq: AnswerlatticeRelatedFaqRef, scope: { tId: number; sId: number }): FaqCandidate => ({
    id: faq.id,
    pId: 'AL',
    tId: scope.tId,
    sId: scope.sId,
    question: faq.question,
    answer: faq.answer || '',
    status: ANSWERLATTICE_FAQ_STATUS.PUBLISHED,
    source: 'manual',
    active: true,
    articleId: faq.articleId || null,
    articleTitle: faq.articleTitle || null,
    entityIds: [],
    contextKeys: [],
    tags: faq.tags || [],
    _summaryOnly: true,
});

const loadPublishedFaqs = async (tId: number, sId: number, sourceVersion?: number): Promise<AnswerlatticeFaq[]> => {
    const cacheKey = `${tId}:${sId}:${sourceVersion ?? 'unversioned'}`;
    const cached = readFaqsFromCache(cacheKey);
    if (cached) return cached;

    const snapshot = await answerlatticeFirestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', ANSWERLATTICE_FAQ_STATUS.PUBLISHED)
        .where('active', '==', true)
        .orderBy('sortOrder', 'asc')
        .orderBy('modifiedOn', 'desc')
        .limit(ANSWERLATTICE_FAQ_PUBLIC_LIMIT)
        .get();

    const faqs = snapshot.docs
        .map(doc => normalizeAnswerlatticeRetrievalFaq(doc.data(), doc.id, { tId, sId }))
        .filter((faq): faq is AnswerlatticeFaq => faq !== null);
    rememberFaqs(cacheKey, faqs);
    return faqs;
};

const scoreFaqCandidate = (
    query: string,
    faq: FaqCandidate,
    context?: any,
): { score: number; queryCoverage: number; reason: string } => {
    const normalizedQuery = normalizeText(query);
    const normalizedQuestion = normalizeText(faq.question);
    if (!normalizedQuery || !normalizedQuestion || !faq.answer?.trim()) {
        return { score: 0, queryCoverage: 0, reason: 'empty' };
    }

    if (normalizedQuery === normalizedQuestion) {
        return { score: EXACT_MATCH_SCORE, queryCoverage: 1, reason: 'exact_question' };
    }

    const queryTokens = tokenizeMeaningful(query);
    const questionTokens = tokenizeMeaningful(faq.question);
    if (!queryTokens.length || !questionTokens.length) {
        return { score: 0, queryCoverage: 0, reason: 'no_tokens' };
    }

    const questionOverlap = countOverlap(queryTokens, questionTokens);
    const queryCoverage = questionOverlap / queryTokens.length;
    const questionCoverage = questionOverlap / questionTokens.length;
    let score = (queryCoverage * 64) + (questionCoverage * 28);
    let reason = 'token_overlap';

    const queryIsLongEnough = normalizedQuery.length >= 12;
    const questionIsLongEnough = normalizedQuestion.length >= 12;
    if (queryIsLongEnough && questionIsLongEnough) {
        if (normalizedQuestion.includes(normalizedQuery)) {
            score += 42;
            reason = 'question_contains_query';
        } else if (normalizedQuery.includes(normalizedQuestion)) {
            score += 36;
            reason = 'query_contains_question';
        }
    }

    const faqContextTokens = listFaqContextTokens(faq);
    const contextTokens = listContextTokens(context);
    const contextOverlap = countOverlap(contextTokens, faqContextTokens);
    if (contextOverlap > 0) {
        score += Math.min(32, contextOverlap * 14);
        reason = `${reason}_context`;
    }

    const normalizedContextKeys = normalizeContextKeys(context?.contextKey ? [context.contextKey] : []);
    const faqContextKeys = normalizeContextKeys(faq.contextKeys || []);
    if (normalizedContextKeys.some(key => faqContextKeys.includes(key))) {
        score += 36;
        reason = `${reason}_surface`;
    }

    const contextEntityIds = listContextEntityIds(context);
    const faqEntityIds = Array.isArray(faq.entityIds) ? faq.entityIds.map(String) : [];
    const entityOverlap = countOverlap(contextEntityIds, faqEntityIds);
    if (entityOverlap > 0) {
        score += Math.min(40, entityOverlap * 22);
        reason = `${reason}_entity`;
    }

    const articleTitleTokens = tokenizeMeaningful(faq.articleTitle || '');
    const articleOverlap = countOverlap(queryTokens, articleTitleTokens);
    if (articleOverlap > 0) {
        score += Math.min(18, articleOverlap * 8);
        reason = `${reason}_article`;
    }

    return { score, queryCoverage, reason };
};

const chooseBestFaq = (
    query: string,
    candidates: FaqCandidate[],
    context?: any,
): { faq: FaqCandidate; score: number; queryCoverage: number; reason: string } | null => {
    const meaningfulQueryTokenCount = tokenizeMeaningful(query).length;
    const scored = candidates
        .map(faq => ({ faq, ...scoreFaqCandidate(query, faq, context) }))
        .filter(item => item.score > 0)
        .sort((left, right) => right.score - left.score);

    const best = scored[0];
    if (!best) return null;
    if (best.score >= EXACT_MATCH_SCORE) return best;
    if (meaningfulQueryTokenCount < 2 && best.score < 110) return null;
    if (best.score >= MIN_ACCEPT_SCORE && best.queryCoverage >= MIN_QUERY_COVERAGE) return best;
    return null;
};

const loadLinkedArticleReference = async (
    faq: AnswerlatticeFaq,
    includeFullArticleReference: boolean,
): Promise<any[]> => {
    const articleId = normalizeAnswerlatticeKbArticleId(faq.articleId);
    if (!articleId) return [];

    if (!includeFullArticleReference) {
        return [{
            id: articleId,
            title: faq.articleTitle || 'Related article',
            url: undefined,
            sourceType: 'faq',
            similarityScore: 1,
        }];
    }

    try {
        const snap = await answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.KB_ARTICLES)
            .doc(articleId)
            .get();
        if (!snap.exists) {
            return [{
                id: articleId,
                title: faq.articleTitle || 'Related article',
                sourceType: 'faq',
                similarityScore: 1,
            }];
        }

        const article = { ...snap.data(), id: snap.id } as KnowledgeBaseArticleType;
        const articleRecord = article as any;
        if (
            articleRecord.pId !== 'AL'
            || normalizeAnswerlatticeScopeDocumentId(articleRecord.tId) !== normalizeAnswerlatticeScopeDocumentId(faq.tId)
            || normalizeAnswerlatticeScopeDocumentId(articleRecord.sId) !== normalizeAnswerlatticeScopeDocumentId(faq.sId)
            || article.status !== 'published'
            || article.active === false
        ) {
            return [{
                id: articleId,
                title: faq.articleTitle || 'Related article',
                sourceType: 'faq',
                similarityScore: 1,
            }];
        }

        const reference = {
            id: articleId,
            title: cleanReferenceText(article.title, 240) || 'Related article',
            url: cleanReferenceText(article.url, 500),
            categoryId: cleanReferenceText(article.categoryId, 180),
            sectionId: cleanReferenceText(article.sectionId, 180),
            categoryTitle: cleanReferenceText(article.categoryTitle, 180),
            sectionTitle: cleanReferenceText(article.sectionTitle, 180),
            content: article.content,
            tags: Array.isArray(article.tags)
                ? article.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 20)
                : [],
            similarityScore: 1,
            sourceType: 'faq',
        };
        return [reference];
    } catch {
        return [{
            id: articleId,
            title: faq.articleTitle || 'Related article',
            sourceType: 'faq',
            similarityScore: 1,
        }];
    }
};

export const attemptFaqAnswerRetrieval = async (
    query: string,
    options: FaqRetrievalContext,
): Promise<FaqRetrievalResult> => {
    const tId = typeof options.tId === 'number' ? normalizeAnswerlatticeScopeDocumentId(options.tId) : null;
    const sId = typeof options.sId === 'number' ? normalizeAnswerlatticeScopeDocumentId(options.sId) : null;
    const sourceVersion = options.sourceVersion === undefined
        ? undefined
        : typeof options.sourceVersion === 'number'
            && Number.isSafeInteger(options.sourceVersion)
            && options.sourceVersion >= 0
            ? options.sourceVersion
            : null;
    if (!tId || !sId || sourceVersion === null) {
        return { found: false, confidence: 'none', references: [] };
    }

    const relatedFaqCandidates = (options.relatedContent?.faqs || [])
        .map(faq => buildFaqFromRelatedRef(faq, { tId, sId }))
        .map(faq => normalizeAnswerlatticeRetrievalFaq(faq, faq.id, { tId, sId }))
        .filter((faq): faq is AnswerlatticeFaq => faq !== null);

    const relatedMatch = chooseBestFaq(query, relatedFaqCandidates, options.context);
    if (relatedMatch) {
        const faq = relatedMatch.faq as AnswerlatticeFaq;
        return {
            found: true,
            faq,
            score: relatedMatch.score,
            confidence: relatedMatch.score >= 110 ? 'high' : 'medium',
            references: await loadLinkedArticleReference(faq, options.includeFullArticleReference !== false),
            matchReason: `related_${relatedMatch.reason}`,
        };
    }

    const faqs = await loadPublishedFaqs(tId, sId, sourceVersion);
    const match = chooseBestFaq(query, faqs, options.context);
    if (!match) return { found: false, confidence: 'none', references: [] };

    return {
        found: true,
        faq: match.faq as AnswerlatticeFaq,
        score: match.score,
        confidence: match.score >= 110 ? 'high' : 'medium',
        references: await loadLinkedArticleReference(match.faq as AnswerlatticeFaq, options.includeFullArticleReference !== false),
        matchReason: match.reason,
    };
};
