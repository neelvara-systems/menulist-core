import { PRODUCT_IDS } from '@constant/product';
import {
    CANONICA_FAQ_SOURCE,
    CANONICA_FAQ_STATUS,
    type CanonicaFaq,
    type CanonicaFaqSource,
    type CanonicaFaqStatus,
    type CanonicaGeneratedFaq,
} from '@type/canonica';
import { z } from 'zod';
import { normalizeContextKeys, normalizeSurfaceList } from './productSurfaceContent';

export const CANONICA_FAQ_PUBLIC_LIMIT = 80;
export const CANONICA_FAQ_MANAGEMENT_LIMIT = 150;
export const CANONICA_FAQ_ARTICLE_LINK_LIMIT = 25;
export const CANONICA_FAQ_GENERATED_PER_ARTICLE_LIMIT = 5;

const MAX_QUESTION_LENGTH = 240;
const MAX_ANSWER_LENGTH = 2000;
const MAX_TAGS = 20;
const MAX_ENTITY_IDS = 25;

const CONTROL_TEXT_PATTERN = /[\u0000-\u001f\u007f]/g;

export const normalizeFaqText = (value: unknown, maxLength: number): string => {
    if (typeof value !== 'string') return '';
    return value
        .replace(CONTROL_TEXT_PATTERN, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
};

export const normalizeFaqStatus = (value: unknown): CanonicaFaqStatus => {
    return Object.values(CANONICA_FAQ_STATUS).includes(value as CanonicaFaqStatus)
        ? value as CanonicaFaqStatus
        : CANONICA_FAQ_STATUS.DRAFT;
};

export const normalizeFaqSource = (value: unknown): CanonicaFaqSource => {
    return Object.values(CANONICA_FAQ_SOURCE).includes(value as CanonicaFaqSource)
        ? value as CanonicaFaqSource
        : CANONICA_FAQ_SOURCE.MANUAL;
};

const FaqSaveSchema = z.object({
    id: z.string().trim().min(1).max(180).optional(),
    question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
    answer: z.string().trim().min(1).max(MAX_ANSWER_LENGTH),
    status: z.enum([
        CANONICA_FAQ_STATUS.DRAFT,
        CANONICA_FAQ_STATUS.NEEDS_REVIEW,
        CANONICA_FAQ_STATUS.PUBLISHED,
        CANONICA_FAQ_STATUS.ARCHIVED,
    ]).optional().default(CANONICA_FAQ_STATUS.DRAFT),
    source: z.enum([
        CANONICA_FAQ_SOURCE.IMPORT,
        CANONICA_FAQ_SOURCE.MANUAL,
        CANONICA_FAQ_SOURCE.TICKET_SIGNAL,
        CANONICA_FAQ_SOURCE.ARTICLE,
    ]).optional().default(CANONICA_FAQ_SOURCE.MANUAL),
    active: z.boolean().optional(),
    articleId: z.string().trim().max(180).nullable().optional(),
    articleTitle: z.string().trim().max(240).nullable().optional(),
    canonicalAnswerId: z.string().trim().max(180).nullable().optional(),
    entityIds: z.array(z.string().trim().min(1).max(180)).max(MAX_ENTITY_IDS).optional().default([]),
    contextKeys: z.union([z.array(z.string()), z.string()]).optional().default([]),
    tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(100),
    jobId: z.string().trim().max(180).nullable().optional(),
    generatedFromArticleId: z.string().trim().max(180).nullable().optional(),
});

export type CanonicaFaqSaveInput = z.infer<typeof FaqSaveSchema>;

export function parseCanonicaFaqSaveInput(
    value: unknown,
    scope: { tId: number; sId: number },
): Omit<CanonicaFaq, 'id'> & { id?: string } {
    const parsed = FaqSaveSchema.parse(value);
    const status = normalizeFaqStatus(parsed.status);

    return {
        ...(parsed.id ? { id: parsed.id } : {}),
        pId: PRODUCT_IDS.CANONICA,
        tId: Number(scope.tId),
        sId: Number(scope.sId),
        question: normalizeFaqText(parsed.question, MAX_QUESTION_LENGTH),
        answer: normalizeFaqText(parsed.answer, MAX_ANSWER_LENGTH),
        status,
        source: normalizeFaqSource(parsed.source),
        active: parsed.active ?? status !== CANONICA_FAQ_STATUS.ARCHIVED,
        articleId: parsed.articleId ? normalizeFaqText(parsed.articleId, 180) : null,
        articleTitle: parsed.articleTitle ? normalizeFaqText(parsed.articleTitle, 240) : null,
        canonicalAnswerId: parsed.canonicalAnswerId ? normalizeFaqText(parsed.canonicalAnswerId, 180) : null,
        entityIds: Array.from(new Set(parsed.entityIds.map(value => value.trim()).filter(Boolean))).slice(0, MAX_ENTITY_IDS),
        contextKeys: normalizeContextKeys(parsed.contextKeys),
        tags: normalizeSurfaceList(parsed.tags, MAX_TAGS, 64),
        sortOrder: parsed.sortOrder ?? 100,
        jobId: parsed.jobId ? normalizeFaqText(parsed.jobId, 180) : null,
        generatedFromArticleId: parsed.generatedFromArticleId ? normalizeFaqText(parsed.generatedFromArticleId, 180) : null,
    };
}

export function normalizeGeneratedFaqs(values: unknown): CanonicaGeneratedFaq[] {
    const raw = Array.isArray(values) ? values : [];

    return raw
        .map((item, index) => {
            if (!item || typeof item !== 'object') return null;
            const record = item as Record<string, unknown>;
            const question = normalizeFaqText(record.question, MAX_QUESTION_LENGTH);
            const answer = normalizeFaqText(record.answer, MAX_ANSWER_LENGTH);
            if (!question || !answer) return null;

            return {
                ...(typeof record.id === 'string' && record.id.trim() ? { id: normalizeFaqText(record.id, 180) } : {}),
                question,
                answer,
                tags: normalizeSurfaceList(record.tags, MAX_TAGS, 64),
                contextKeys: normalizeContextKeys(record.contextKeys),
                entityIds: Array.isArray(record.entityIds)
                    ? Array.from(new Set(record.entityIds.map(String).map(value => value.trim()).filter(Boolean))).slice(0, MAX_ENTITY_IDS)
                    : [],
                sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : index,
            };
        })
        .filter(Boolean)
        .slice(0, CANONICA_FAQ_GENERATED_PER_ARTICLE_LIMIT) as CanonicaGeneratedFaq[];
}
