import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_FAQ_SOURCE,
    ANSWERLATTICE_FAQ_STATUS,
    type AnswerlatticeFaq,
    type AnswerlatticeFaqSource,
    type AnswerlatticeFaqStatus,
    type AnswerlatticeGeneratedFaq,
    type AnswerlatticePublicFaq,
} from '@type/answerlattice';
import { z } from 'zod';
import { normalizeAnswerlatticeFaqId } from './faqIdBoundary';
import { normalizeAnswerlatticeResolvedEntityIds } from './governanceIdBoundary';
import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';
import { normalizeContextKeys, normalizeSurfaceList } from './productSurfaceContent';

export const ANSWERLATTICE_FAQ_PUBLIC_LIMIT = 80;
export const ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT = 150;
export const ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT = 25;
export const ANSWERLATTICE_FAQ_GENERATED_PER_ARTICLE_LIMIT = 5;

const MAX_QUESTION_LENGTH = 240;
const MAX_ANSWER_LENGTH = 2000;
const MAX_TAGS = 20;
const MAX_ENTITY_IDS = 25;
const MAX_PUBLIC_FEEDBACK_COUNT = 1_000_000_000;

const PUBLIC_FAQ_KEYS = ['id', 'question', 'answer', 'articleId', 'tags', 'likes', 'dislikes'] as const;

const CONTROL_TEXT_PATTERN = /[\u0000-\u001f\u007f]/g;

export const normalizeFaqText = (value: unknown, maxLength: number): string => {
    if (typeof value !== 'string') return '';
    return value
        .replace(CONTROL_TEXT_PATTERN, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
};

export const normalizeFaqStatus = (value: unknown): AnswerlatticeFaqStatus => {
    return Object.values(ANSWERLATTICE_FAQ_STATUS).includes(value as AnswerlatticeFaqStatus)
        ? value as AnswerlatticeFaqStatus
        : ANSWERLATTICE_FAQ_STATUS.DRAFT;
};

export const normalizeFaqSource = (value: unknown): AnswerlatticeFaqSource => {
    return Object.values(ANSWERLATTICE_FAQ_SOURCE).includes(value as AnswerlatticeFaqSource)
        ? value as AnswerlatticeFaqSource
        : ANSWERLATTICE_FAQ_SOURCE.MANUAL;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizePublicFeedbackCount = (value: unknown): number | null => {
    return typeof value === 'number'
        && Number.isSafeInteger(value)
        && value >= 0
        && value <= MAX_PUBLIC_FEEDBACK_COUNT
        ? value
        : null;
};

export const normalizeAnswerlatticePublicFaq = (value: unknown): AnswerlatticePublicFaq | null => {
    if (!isRecord(value)
        || !(PUBLIC_FAQ_KEYS as readonly string[]).every(key => Object.prototype.hasOwnProperty.call(value, key))
        || Object.keys(value).some(key => !(PUBLIC_FAQ_KEYS as readonly string[]).includes(key))) {
        return null;
    }

    const id = normalizeAnswerlatticeFaqId(value.id);
    const question = normalizeFaqText(value.question, MAX_QUESTION_LENGTH);
    const answer = normalizeFaqText(value.answer, MAX_ANSWER_LENGTH);
    const articleId = value.articleId === null
        ? null
        : normalizeAnswerlatticeKbArticleId(value.articleId);
    const likes = normalizePublicFeedbackCount(value.likes);
    const dislikes = normalizePublicFeedbackCount(value.dislikes);
    if (!id || !question || !answer || (value.articleId !== null && !articleId) || likes === null || dislikes === null) {
        return null;
    }

    if (!Array.isArray(value.tags)) return null;
    const tags = normalizeSurfaceList(value.tags, MAX_TAGS, 64);
    if (tags.length !== value.tags.length) return null;

    return { id, question, answer, articleId, tags, likes, dislikes };
};

export const normalizeAnswerlatticePublicFaqList = (value: unknown): AnswerlatticePublicFaq[] | null => {
    if (!Array.isArray(value) || value.length > ANSWERLATTICE_FAQ_PUBLIC_LIMIT) return null;
    const faqs = value.map(normalizeAnswerlatticePublicFaq);
    return faqs.every((faq): faq is AnswerlatticePublicFaq => faq !== null) ? faqs : null;
};

export const projectAnswerlatticePublicFaq = (
    value: unknown,
    documentId: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticePublicFaq | null => {
    if (!isRecord(value)
        || value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || value.tId !== scope.tId
        || value.sId !== scope.sId
        || value.status !== ANSWERLATTICE_FAQ_STATUS.PUBLISHED
        || value.active !== true) {
        return null;
    }

    return normalizeAnswerlatticePublicFaq({
        id: documentId,
        question: value.question,
        answer: value.answer,
        articleId: value.articleId ?? null,
        tags: value.tags ?? [],
        likes: value.likes ?? 0,
        dislikes: value.dislikes ?? 0,
    });
};

export const normalizeAnswerlatticeRetrievalFaq = (
    value: unknown,
    documentId: unknown,
    scope: { tId: number; sId: number },
): AnswerlatticeFaq | null => {
    if (!isRecord(value)
        || value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || value.tId !== scope.tId
        || value.sId !== scope.sId
        || value.status !== ANSWERLATTICE_FAQ_STATUS.PUBLISHED
        || value.active !== true
        || !Object.values(ANSWERLATTICE_FAQ_SOURCE).includes(value.source as AnswerlatticeFaqSource)) {
        return null;
    }

    const id = normalizeAnswerlatticeFaqId(documentId);
    const question = normalizeFaqText(value.question, MAX_QUESTION_LENGTH);
    const answer = normalizeFaqText(value.answer, MAX_ANSWER_LENGTH);
    const articleId = value.articleId === null || value.articleId === undefined
        ? null
        : normalizeAnswerlatticeKbArticleId(value.articleId);
    if (!id || !question || !answer || (value.articleId !== null && value.articleId !== undefined && !articleId)) {
        return null;
    }

    if (!Array.isArray(value.tags) || !Array.isArray(value.contextKeys) || !Array.isArray(value.entityIds)) return null;
    const tags = normalizeSurfaceList(value.tags, MAX_TAGS, 64);
    const contextKeys = normalizeContextKeys(value.contextKeys);
    const entityIds = normalizeAnswerlatticeResolvedEntityIds(value.entityIds, MAX_ENTITY_IDS);
    if (tags.length !== value.tags.length
        || contextKeys.length !== value.contextKeys.length
        || entityIds.length !== value.entityIds.length) return null;

    const articleTitle = value.articleTitle === null || value.articleTitle === undefined
        ? null
        : normalizeFaqText(value.articleTitle, 240);
    if (value.articleTitle !== null && value.articleTitle !== undefined && !articleTitle) return null;

    return {
        id,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        question,
        answer,
        status: ANSWERLATTICE_FAQ_STATUS.PUBLISHED,
        source: value.source as AnswerlatticeFaqSource,
        active: true,
        articleId,
        articleTitle,
        entityIds,
        contextKeys,
        tags,
        ...(typeof value.sortOrder === 'number' && Number.isSafeInteger(value.sortOrder) && value.sortOrder >= 0
            ? { sortOrder: value.sortOrder }
            : {}),
    };
};

const FaqSaveSchema = z.object({
    id: z.string().trim().min(1).max(180).optional(),
    question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
    answer: z.string().trim().min(1).max(MAX_ANSWER_LENGTH),
    status: z.enum([
        ANSWERLATTICE_FAQ_STATUS.DRAFT,
        ANSWERLATTICE_FAQ_STATUS.NEEDS_REVIEW,
        ANSWERLATTICE_FAQ_STATUS.PUBLISHED,
        ANSWERLATTICE_FAQ_STATUS.ARCHIVED,
    ]).optional().default(ANSWERLATTICE_FAQ_STATUS.DRAFT),
    articleId: z.string().trim().max(180).nullable().optional(),
    entityIds: z.array(z.string().trim().min(1).max(180)).max(MAX_ENTITY_IDS).optional().default([]),
    contextKeys: z.union([z.array(z.string()), z.string()]).optional().default([]),
    tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(100),
}).strict();

export type AnswerlatticeFaqSaveInput = z.infer<typeof FaqSaveSchema>;

export type ParsedAnswerlatticeFaqSaveInput = Pick<
    AnswerlatticeFaq,
    'pId' | 'tId' | 'sId' | 'question' | 'answer' | 'status' | 'articleId' | 'entityIds' | 'contextKeys' | 'tags' | 'sortOrder'
> & { id?: string };

export function parseAnswerlatticeFaqSaveInput(
    value: unknown,
    scope: { tId: number; sId: number },
): ParsedAnswerlatticeFaqSaveInput {
    const parsed = FaqSaveSchema.parse(value);
    const status = normalizeFaqStatus(parsed.status);
    const faqId = parsed.id ? normalizeAnswerlatticeFaqId(parsed.id) : null;
    const articleId = parsed.articleId ? normalizeAnswerlatticeKbArticleId(parsed.articleId) : null;

    if (parsed.id && !faqId) throw new Error('Invalid FAQ id');
    if (parsed.articleId && !articleId) throw new Error('Invalid linked article id');

    return {
        ...(faqId ? { id: faqId } : {}),
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: Number(scope.tId),
        sId: Number(scope.sId),
        question: normalizeFaqText(parsed.question, MAX_QUESTION_LENGTH),
        answer: normalizeFaqText(parsed.answer, MAX_ANSWER_LENGTH),
        status,
        articleId,
        entityIds: normalizeAnswerlatticeResolvedEntityIds(parsed.entityIds, MAX_ENTITY_IDS),
        contextKeys: normalizeContextKeys(parsed.contextKeys),
        tags: normalizeSurfaceList(parsed.tags, MAX_TAGS, 64),
        sortOrder: parsed.sortOrder ?? 100,
    };
}

export function normalizeGeneratedFaqs(values: unknown): AnswerlatticeGeneratedFaq[] {
    const raw = Array.isArray(values) ? values : [];

    return raw
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;
            const record = item as Record<string, unknown>;
            const question = normalizeFaqText(record.question, MAX_QUESTION_LENGTH);
            const answer = normalizeFaqText(record.answer, MAX_ANSWER_LENGTH);
            const faqId = normalizeAnswerlatticeFaqId(record.id);
            if (!question || !answer) return null;

            return {
                ...(faqId ? { id: faqId } : {}),
                question,
                answer,
                tags: normalizeSurfaceList(record.tags, MAX_TAGS, 64),
                contextKeys: normalizeContextKeys(record.contextKeys),
                entityIds: normalizeAnswerlatticeResolvedEntityIds(record.entityIds, MAX_ENTITY_IDS),
                sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : index,
            };
        })
        .filter(Boolean)
        .slice(0, ANSWERLATTICE_FAQ_GENERATED_PER_ARTICLE_LIMIT) as AnswerlatticeGeneratedFaq[];
}
