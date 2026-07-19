import { PRODUCT_IDS } from '@constant/product';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type {
    AnswerlatticeContextPayload,
    AnswerlatticeProductSurface,
    AnswerlatticeProductSurfaceVisibility,
    AnswerlatticeRelatedArticleRef,
    AnswerlatticeRelatedChangelogRef,
    AnswerlatticeRelatedFaqRef,
    AnswerlatticeSurfaceContentItem,
    AnswerlatticeSurfaceContentSummary,
    AnswerlatticeSurfaceTicketStats,
} from '@type/answerlattice';
import { normalizeAnswerlatticeResolvedEntityIds } from './governanceIdBoundary';
import {
    normalizeAnswerlatticeKnowledgeIntakeJobId,
    normalizeAnswerlatticeKnowledgeIntakeReviewItemId,
    normalizeAnswerlatticeKnowledgeIntakeSourceId,
} from './knowledgeIntakeIdBoundary';
import { normalizeAnswerlatticeProductSurfaceId } from './productSurfaceIdBoundary';
import { z } from 'zod';

export const ANSWERLATTICE_CONTEXT_CONTENT_SUMMARY_PREFIX = 'contextContent';
export const ANSWERLATTICE_PRODUCT_SURFACE_LIMIT = 300;
export const ANSWERLATTICE_PRODUCT_SURFACE_DEFAULT_VISIBILITY: AnswerlatticeProductSurfaceVisibility = {
    helpWidget: true,
    helpCenter: true,
    changelog: true,
};

const MAX_SURFACE_KEY_LENGTH = 80;
const MAX_SURFACE_LABEL_LENGTH = 120;
const MAX_ROUTE_PATTERNS = 25;
const MAX_ROUTE_PATTERN_LENGTH = 180;
const MAX_ENTITY_HINTS = 12;
const MAX_ENTITY_IDS = 25;
const MAX_TAGS = 25;
const MAX_FIELD_LENGTH = 100;
const MAX_INTAKE_SOURCE_IDS = 5;
const MAX_SUMMARY_SURFACES = ANSWERLATTICE_PRODUCT_SURFACE_LIMIT;
const MAX_RELATED_ARTICLES = 25;
const MAX_RELATED_CHANGELOGS = 25;
const MAX_RELATED_FAQS = 25;
const MAX_RECENT_TICKET_IDS = 10;
const MAX_SUMMARY_COUNT = 1_000_000;
const MAX_FAQ_ANSWER_LENGTH = 12_000;

const CONTROL_TEXT_PATTERN = /[\u0000-\u001f\u007f]/g;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeBoundedText = (value: unknown, maxLength: number, allowEmpty = false): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(CONTROL_TEXT_PATTERN, ' ').replace(/\s+/g, ' ').trim();
    return (allowEmpty || normalized.length > 0) && normalized.length <= maxLength ? normalized : null;
};

const normalizeRelatedDocumentId = (value: unknown): string | null => {
    const documentId = normalizeBoundedText(value, 180);
    return documentId && isValidFirestoreDocumentId(documentId) ? documentId : null;
};

const normalizeNonNegativeInteger = (value: unknown, max = MAX_SUMMARY_COUNT): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max ? value : null
);

const normalizeTimestampLikeForSurface = (value: unknown): string | number | null => {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') return normalizeBoundedText(value, 120, true);
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
    if (isRecord(value)) {
        if (typeof value.toDate === 'function') {
            const date = (value.toDate as () => Date)();
            return Number.isFinite(date.getTime()) ? date.toISOString() : null;
        }
        const seconds = typeof value.seconds === 'number' ? value.seconds : value._seconds;
        const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : value._nanoseconds;
        if (typeof seconds === 'number' && Number.isSafeInteger(seconds)) {
            const date = new Date((seconds * 1000) + (typeof nanoseconds === 'number' ? Math.floor(nanoseconds / 1_000_000) : 0));
            return Number.isFinite(date.getTime()) ? date.toISOString() : null;
        }
    }
    return null;
};

export function normalizeAnswerlatticeProductSurfaceScopeId(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function requireAnswerlatticeProductSurfaceScope(scope: { tId: unknown; sId: unknown }): { tId: number; sId: number } {
    const tId = normalizeAnswerlatticeProductSurfaceScopeId(scope.tId);
    const sId = normalizeAnswerlatticeProductSurfaceScopeId(scope.sId);
    if (!tId || !sId) throw new Error('Invalid Answerlattice tenant scope.');
    return { tId, sId };
}

export const getContextContentSummaryDocId = (tId: number, sId: number) => {
    const scope = requireAnswerlatticeProductSurfaceScope({ tId, sId });
    return `${ANSWERLATTICE_CONTEXT_CONTENT_SUMMARY_PREFIX}_${scope.tId}_${scope.sId}`;
};

export function normalizeSurfaceToken(value: unknown, maxLength = MAX_FIELD_LENGTH): string {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .toLowerCase()
        .replace(CONTROL_TEXT_PATTERN, '')
        .replace(/[^a-z0-9_\-\s/]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, maxLength);
}

export function normalizeSurfaceKey(value: unknown): string {
    return normalizeSurfaceToken(value, MAX_SURFACE_KEY_LENGTH)
        .replace(/\/+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

export function buildSurfaceKeyFromLabel(label: string): string {
    return normalizeSurfaceKey(label) || `surface_${Date.now()}`;
}

export function normalizeSurfaceRoutePattern(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    let route = trimmed;
    try {
        if (/^https?:\/\//i.test(trimmed)) {
            route = new URL(trimmed).pathname || '/';
        }
    } catch {
        return null;
    }

    route = route.split(/[?#]/)[0]?.trim() || '';
    if (!route) return null;
    if (route === '*' || route === '/*') return '*';
    if (!route.startsWith('/')) route = `/${route}`;
    route = route.replace(/\/{2,}/g, '/');
    if (route.length > 1 && route.endsWith('/') && !route.endsWith('/*')) {
        route = route.slice(0, -1);
    }
    if (route.length > MAX_ROUTE_PATTERN_LENGTH) return null;
    if (route.includes('*') && !route.endsWith('*')) return null;
    return route;
}

export function normalizeSurfaceRoutePatterns(values: unknown): string[] {
    const raw = typeof values === 'string'
        ? values.split(/[\n,]/)
        : Array.isArray(values) ? values : [];

    return Array.from(new Set(
        raw
            .map(normalizeSurfaceRoutePattern)
            .filter((value): value is string => Boolean(value))
    )).slice(0, MAX_ROUTE_PATTERNS);
}

export function normalizeSurfaceContextPath(value: unknown): string | null {
    const normalized = normalizeSurfaceRoutePattern(value);
    return normalized && !normalized.includes('*') ? normalized : null;
}

export function scoreSurfaceRouteForContextPath(routePatterns: unknown, contextPath: unknown): number {
    const path = normalizeSurfaceContextPath(contextPath);
    if (!path) return 0;

    let bestScore = 0;
    for (const pattern of normalizeSurfaceRoutePatterns(routePatterns)) {
        if (pattern === path) {
            bestScore = Math.max(bestScore, 900 + Math.min(path.length, 99));
            continue;
        }
        if (pattern === '*') {
            bestScore = Math.max(bestScore, 700);
            continue;
        }
        if (!pattern.endsWith('*')) continue;

        const prefix = pattern.slice(0, -1);
        const basePath = prefix.endsWith('/') && prefix.length > 1 ? prefix.slice(0, -1) : prefix;
        if (path === basePath || path.startsWith(prefix)) {
            bestScore = Math.max(bestScore, 800 + Math.min(prefix.length, 99));
        }
    }
    return bestScore;
}

export function normalizeSurfaceList(values: unknown, maxItems: number, maxLength = MAX_FIELD_LENGTH): string[] {
    const raw = typeof values === 'string'
        ? values.split(/[\n,]/)
        : Array.isArray(values) ? values : [];

    return Array.from(new Set(
        raw
            .map(value => normalizeSurfaceToken(value, maxLength))
            .filter(Boolean)
    )).slice(0, maxItems);
}

export function normalizeSurfaceVisibility(value: unknown): AnswerlatticeProductSurfaceVisibility {
    const input = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Partial<AnswerlatticeProductSurfaceVisibility>
        : {};

    return {
        helpWidget: input.helpWidget !== false,
        helpCenter: input.helpCenter !== false,
        changelog: input.changelog !== false,
    };
}

export const ProductSurfaceSaveSchema = z.object({
    id: z.string().trim().min(1).max(160).optional(),
    key: z.string().trim().max(MAX_SURFACE_KEY_LENGTH).optional(),
    label: z.string().trim().min(1).max(MAX_SURFACE_LABEL_LENGTH),
    description: z.string().trim().max(500).optional().default(''),
    routePatterns: z.union([z.array(z.string()), z.string()]).optional().default([]),
    feature: z.string().trim().max(MAX_FIELD_LENGTH).optional().default(''),
    page: z.string().trim().max(MAX_FIELD_LENGTH).optional().default(''),
    workflow: z.string().trim().max(MAX_FIELD_LENGTH).optional().default(''),
    entityHints: z.union([z.array(z.string()), z.string()]).optional().default([]),
    entityIds: z.array(z.string().trim().min(1).max(160)).max(MAX_ENTITY_IDS).optional().default([]),
    tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
    visibility: z.object({
        helpWidget: z.boolean().optional(),
        helpCenter: z.boolean().optional(),
        changelog: z.boolean().optional(),
    }).optional().default(ANSWERLATTICE_PRODUCT_SURFACE_DEFAULT_VISIBILITY),
    active: z.boolean().optional().default(true),
    priority: z.coerce.number().int().min(0).max(999).optional().default(100),
});

export type ProductSurfaceSaveInput = z.infer<typeof ProductSurfaceSaveSchema>;

export function parseProductSurfaceSaveInput(value: unknown, scope: { tId: number; sId: number }): Omit<AnswerlatticeProductSurface, 'id'> & { id?: string } {
    const exactScope = requireAnswerlatticeProductSurfaceScope(scope);
    const parsed = ProductSurfaceSaveSchema.parse(value);
    const surfaceId = parsed.id ? normalizeAnswerlatticeProductSurfaceId(parsed.id) : null;
    if (parsed.id && !surfaceId) throw new Error('Invalid product surface id.');
    const label = parsed.label.replace(CONTROL_TEXT_PATTERN, '').trim();
    const key = normalizeSurfaceKey(parsed.key) || buildSurfaceKeyFromLabel(label);

    return {
        ...(surfaceId ? { id: surfaceId } : {}),
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: exactScope.tId,
        sId: exactScope.sId,
        key,
        label,
        description: parsed.description?.replace(CONTROL_TEXT_PATTERN, '').trim() || '',
        routePatterns: normalizeSurfaceRoutePatterns(parsed.routePatterns),
        feature: normalizeSurfaceToken(parsed.feature),
        page: normalizeSurfaceToken(parsed.page),
        workflow: normalizeSurfaceToken(parsed.workflow),
        entityHints: normalizeSurfaceList(parsed.entityHints, MAX_ENTITY_HINTS, 64),
        entityIds: normalizeAnswerlatticeResolvedEntityIds(parsed.entityIds, MAX_ENTITY_IDS),
        tags: normalizeSurfaceList(parsed.tags, MAX_TAGS, 64),
        visibility: normalizeSurfaceVisibility(parsed.visibility),
        active: parsed.active !== false,
        priority: parsed.priority ?? 100,
    };
}

export function normalizeStoredAnswerlatticeProductSurface(
    value: unknown,
    scope: { tId: number; sId: number },
    documentId?: string,
): AnswerlatticeProductSurface | null {
    if (!isRecord(value)) return null;
    const exactScope = requireAnswerlatticeProductSurfaceScope(scope);
    if (
        value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || value.tId !== exactScope.tId
        || value.sId !== exactScope.sId
    ) {
        return null;
    }

    const id = normalizeAnswerlatticeProductSurfaceId(documentId || value.id);
    const key = normalizeSurfaceKey(value.key);
    const label = normalizeBoundedText(value.label, MAX_SURFACE_LABEL_LENGTH);
    if (!id || !key || !label) return null;

    const description = normalizeBoundedText(value.description, 500, true);
    const feature = normalizeSurfaceToken(value.feature);
    const page = normalizeSurfaceToken(value.page);
    const workflow = normalizeSurfaceToken(value.workflow);
    const priority = normalizeNonNegativeInteger(value.priority, 999) ?? 100;
    const intakeJobId = normalizeAnswerlatticeKnowledgeIntakeJobId(value.intakeJobId);
    const intakeReviewItemId = normalizeAnswerlatticeKnowledgeIntakeReviewItemId(value.intakeReviewItemId);
    const intakeSourceIds = Array.isArray(value.intakeSourceIds)
        ? Array.from(new Set(value.intakeSourceIds
            .map(normalizeAnswerlatticeKnowledgeIntakeSourceId)
            .filter((item): item is string => Boolean(item))))
            .slice(0, MAX_INTAKE_SOURCE_IDS)
        : [];

    return {
        id,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: exactScope.tId,
        sId: exactScope.sId,
        key,
        label,
        ...(description !== null ? { description } : {}),
        routePatterns: normalizeSurfaceRoutePatterns(value.routePatterns),
        ...(feature ? { feature } : {}),
        ...(page ? { page } : {}),
        ...(workflow ? { workflow } : {}),
        entityHints: normalizeSurfaceList(value.entityHints, MAX_ENTITY_HINTS, 64),
        entityIds: normalizeAnswerlatticeResolvedEntityIds(value.entityIds, MAX_ENTITY_IDS),
        tags: normalizeSurfaceList(value.tags, MAX_TAGS, 64),
        visibility: normalizeSurfaceVisibility(value.visibility),
        active: value.active !== false,
        priority,
        ...(intakeJobId ? { intakeJobId } : {}),
        ...(intakeReviewItemId ? { intakeReviewItemId } : {}),
        ...(intakeSourceIds.length > 0 ? { intakeSourceIds } : {}),
        ...(value.createdOn !== undefined ? { createdOn: value.createdOn as AnswerlatticeProductSurface['createdOn'] } : {}),
        ...(value.modifiedOn !== undefined ? { modifiedOn: value.modifiedOn as AnswerlatticeProductSurface['modifiedOn'] } : {}),
        ...(typeof value.createdBy === 'string' ? { createdBy: value.createdBy.slice(0, 180) } : {}),
        ...(typeof value.modifiedBy === 'string' ? { modifiedBy: value.modifiedBy.slice(0, 180) } : {}),
        ...(normalizeNonNegativeInteger(value.uId) !== null ? { uId: normalizeNonNegativeInteger(value.uId) as number } : {}),
    };
}

const normalizeRelatedArticleRef = (value: unknown): AnswerlatticeRelatedArticleRef | null => {
    if (!isRecord(value)) return null;
    const id = normalizeRelatedDocumentId(value.id);
    const title = normalizeBoundedText(value.title, 300);
    if (!id || !title) return null;
    const categoryTitle = normalizeBoundedText(value.categoryTitle, 240, true);
    const sectionTitle = normalizeBoundedText(value.sectionTitle, 240, true);
    const url = normalizeBoundedText(value.url, 500, true);
    return {
        id,
        title,
        ...(categoryTitle !== null ? { categoryTitle } : {}),
        ...(sectionTitle !== null ? { sectionTitle } : {}),
        ...(url !== null ? { url } : {}),
        tags: normalizeSurfaceList(value.tags, 8, 80),
    };
};

const normalizeRelatedChangelogRef = (value: unknown): AnswerlatticeRelatedChangelogRef | null => {
    if (!isRecord(value)) return null;
    const id = normalizeRelatedDocumentId(value.id);
    const pageId = normalizeRelatedDocumentId(value.pageId);
    const title = normalizeBoundedText(value.title, 300);
    if (!id || !pageId || !title) return null;
    const version = value.version == null ? null : normalizeBoundedText(value.version, 120);
    const releasedOn = normalizeTimestampLikeForSurface(value.releasedOn);
    return {
        id,
        pageId,
        title,
        ...(version !== null ? { version } : {}),
        ...(releasedOn !== null ? { releasedOn } : {}),
        tags: normalizeSurfaceList(value.tags, 8, 80),
    };
};

const normalizeRelatedFaqRef = (value: unknown): AnswerlatticeRelatedFaqRef | null => {
    if (!isRecord(value)) return null;
    const id = normalizeRelatedDocumentId(value.id);
    const question = normalizeBoundedText(value.question, 500);
    if (!id || !question) return null;
    const answer = normalizeBoundedText(value.answer, MAX_FAQ_ANSWER_LENGTH, true);
    const articleId = value.articleId == null ? null : normalizeRelatedDocumentId(value.articleId);
    const articleTitle = value.articleTitle == null ? null : normalizeBoundedText(value.articleTitle, 300);
    return {
        id,
        question,
        ...(answer !== null ? { answer } : {}),
        articleId,
        articleTitle,
        tags: normalizeSurfaceList(value.tags, 8, 80),
    };
};

const normalizeSurfaceTicketStats = (value: unknown): AnswerlatticeSurfaceTicketStats => {
    if (!isRecord(value)) return { total: 0, open: 0, recentDisplayIds: [] };
    const total = normalizeNonNegativeInteger(value.total) ?? 0;
    const open = normalizeNonNegativeInteger(value.open) ?? 0;
    const recentDisplayIds = Array.isArray(value.recentDisplayIds)
        ? Array.from(new Set(
            value.recentDisplayIds
                .map(item => normalizeBoundedText(item, 40))
                .filter((item): item is string => Boolean(item)),
        )).slice(0, MAX_RECENT_TICKET_IDS)
        : [];
    return {
        total,
        open: Math.min(open, total),
        recentDisplayIds,
    };
};

const normalizeSurfaceContentItem = (mapKey: string, value: unknown): AnswerlatticeSurfaceContentItem | null => {
    if (!isRecord(value)) return null;
    const key = normalizeSurfaceKey(value.key);
    if (!key || key !== mapKey) return null;
    const label = normalizeBoundedText(value.label, MAX_SURFACE_LABEL_LENGTH);
    if (!label) return null;

    const articles = Array.isArray(value.articles)
        ? value.articles.map(normalizeRelatedArticleRef).filter((item): item is AnswerlatticeRelatedArticleRef => Boolean(item)).slice(0, MAX_RELATED_ARTICLES)
        : [];
    const changelogs = Array.isArray(value.changelogs)
        ? value.changelogs.map(normalizeRelatedChangelogRef).filter((item): item is AnswerlatticeRelatedChangelogRef => Boolean(item)).slice(0, MAX_RELATED_CHANGELOGS)
        : [];
    const faqs = Array.isArray(value.faqs)
        ? value.faqs.map(normalizeRelatedFaqRef).filter((item): item is AnswerlatticeRelatedFaqRef => Boolean(item)).slice(0, MAX_RELATED_FAQS)
        : [];
    const feature = normalizeSurfaceToken(value.feature);
    const page = normalizeSurfaceToken(value.page);
    const workflow = normalizeSurfaceToken(value.workflow);

    return {
        key,
        label,
        routePatterns: normalizeSurfaceRoutePatterns(value.routePatterns),
        ...(feature ? { feature } : {}),
        ...(page ? { page } : {}),
        ...(workflow ? { workflow } : {}),
        entityHints: normalizeSurfaceList(value.entityHints, MAX_ENTITY_HINTS, 64),
        entityIds: normalizeAnswerlatticeResolvedEntityIds(value.entityIds, MAX_ENTITY_IDS),
        tags: normalizeSurfaceList(value.tags, MAX_TAGS, 64),
        visibility: normalizeSurfaceVisibility(value.visibility),
        articles,
        changelogs,
        faqs,
        tickets: normalizeSurfaceTicketStats(value.tickets),
    };
};

export function normalizeAnswerlatticeSurfaceContentSummary(
    value: unknown,
    scope: { tId: number; sId: number },
    documentId?: string,
): AnswerlatticeSurfaceContentSummary | null {
    if (!isRecord(value)) return null;
    const exactScope = requireAnswerlatticeProductSurfaceScope(scope);
    if (
        value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || value.tId !== exactScope.tId
        || value.sId !== exactScope.sId
        || !isRecord(value.surfaces)
    ) {
        return null;
    }

    const surfaceEntries = Object.entries(value.surfaces);
    if (surfaceEntries.length > MAX_SUMMARY_SURFACES) return null;

    const surfaces: Record<string, AnswerlatticeSurfaceContentItem> = Object.create(null);
    for (const [rawKey, rawSurface] of surfaceEntries) {
        const key = normalizeSurfaceKey(rawKey);
        if (!key || key !== rawKey) continue;
        const surface = normalizeSurfaceContentItem(key, rawSurface);
        if (surface) surfaces[key] = surface;
    }

    const articleCount = normalizeNonNegativeInteger(value.articleCount);
    const faqCount = value.faqCount == null ? 0 : normalizeNonNegativeInteger(value.faqCount);
    const changelogCount = normalizeNonNegativeInteger(value.changelogCount);
    const ticketCount = normalizeNonNegativeInteger(value.ticketCount);
    if (articleCount === null || faqCount === null || changelogCount === null || ticketCount === null) {
        return null;
    }

    return {
        ...(documentId ? { id: documentId } : {}),
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: exactScope.tId,
        sId: exactScope.sId,
        ...(value.generatedAt !== undefined ? { generatedAt: value.generatedAt } : {}),
        surfaceCount: Object.keys(surfaces).length,
        articleCount,
        faqCount,
        changelogCount,
        ticketCount,
        surfaces,
    };
}

export function normalizeContextKeys(values: unknown): string[] {
    return normalizeSurfaceList(values, 20, MAX_SURFACE_KEY_LENGTH)
        .map(normalizeSurfaceKey)
        .filter(Boolean);
}

const listOverlapCount = (left: unknown, right: unknown): number => {
    const leftSet = new Set(normalizeSurfaceList(left, 100, 160));
    if (!leftSet.size) return 0;
    return normalizeSurfaceList(right, 100, 160).filter(value => leftSet.has(value)).length;
};

const textIncludesAny = (text: unknown, terms: string[]): boolean => {
    if (typeof text !== 'string' || terms.length === 0) return false;
    const normalized = normalizeSurfaceToken(text, 500);
    return terms.some(term => term && normalized.includes(term));
};

export function scoreContentForSurface(content: Record<string, any>, surface: AnswerlatticeProductSurface): number {
    let score = 0;
    const surfaceTerms = normalizeSurfaceList([
        surface.key,
        surface.feature,
        surface.page,
        surface.workflow,
        ...(surface.entityHints || []),
        ...(surface.tags || []),
    ], 80, 160);

    if (normalizeContextKeys(content.contextKeys).includes(surface.key)) score += 100;
    score += listOverlapCount(content.entityIds, surface.entityIds) * 40;
    score += listOverlapCount(content.tags || content.platformTags, surface.tags) * 18;
    score += listOverlapCount(content.platformTags, surface.entityHints) * 12;

    if (textIncludesAny(content.category, surfaceTerms)) score += 14;
    if (textIncludesAny(content.categoryTitle, surfaceTerms)) score += 14;
    if (textIncludesAny(content.sectionTitle, surfaceTerms)) score += 10;
    if (textIncludesAny(content.title || content.subject, surfaceTerms)) score += 10;

    const escalationContext = content.escalationContext?.productContext;
    if (escalationContext) {
        if (normalizeSurfaceToken(escalationContext.feature) === surface.feature) score += 30;
        if (normalizeSurfaceToken(escalationContext.page) === surface.page) score += 40;
        if (normalizeSurfaceToken(escalationContext.workflow) === surface.workflow) score += 25;
    }

    return score;
}

export function scoreSurfaceForContext(
    surface: AnswerlatticeSurfaceContentItem,
    context?: AnswerlatticeContextPayload | null,
    target: keyof AnswerlatticeProductSurfaceVisibility = 'helpWidget',
): number {
    if (!context) return 0;
    if (surface.visibility && surface.visibility[target] === false) return 0;

    const contextKey = normalizeSurfaceKey(context.contextKey);
    if (contextKey && contextKey === surface.key) return 1000;

    let score = scoreSurfaceRouteForContextPath(surface.routePatterns, context.path);
    if (context.feature && normalizeSurfaceToken(context.feature) === surface.feature) score += 40;
    if (context.page && normalizeSurfaceToken(context.page) === surface.page) score += 50;
    if (context.workflow && normalizeSurfaceToken(context.workflow) === surface.workflow) score += 35;
    score += listOverlapCount(context.entityHints, surface.entityHints) * 20;
    score += listOverlapCount(context.entityHints, surface.tags) * 10;
    return score;
}

export function resolveSurfaceContentForContext(
    summary: AnswerlatticeSurfaceContentSummary | null | undefined,
    context?: AnswerlatticeContextPayload | null,
    target: keyof AnswerlatticeProductSurfaceVisibility = 'helpWidget',
): AnswerlatticeSurfaceContentItem | null {
    if (!summary?.surfaces || !context) return null;

    const ranked = Object.values(summary.surfaces)
        .map(surface => ({ surface, score: scoreSurfaceForContext(surface, context, target) }))
        .filter(item => item.score >= 50)
        .sort((a, b) => b.score - a.score);

    return ranked[0]?.surface || null;
}

export function mergeSurfaceContext(
    context: AnswerlatticeContextPayload | undefined,
    surface: AnswerlatticeSurfaceContentItem | null,
): AnswerlatticeContextPayload | undefined {
    if (!surface) return context;
    const entityHints = Array.from(new Set([
        ...(context?.entityHints || []),
        ...(surface.entityHints || []),
        ...(surface.tags || []),
    ])).slice(0, 12);

    return {
        ...(context || {}),
        contextKey: context?.contextKey || surface.key,
        feature: context?.feature || surface.feature,
        page: context?.page || surface.page,
        workflow: context?.workflow || surface.workflow,
        entityHints,
        surfaceEntityIds: surface.entityIds || [],
    };
}

export function buildPublicRelatedContent(surface: AnswerlatticeSurfaceContentItem | null): AnswerlatticeSurfaceContentItem | undefined {
    if (!surface) return undefined;
    return {
        ...surface,
        articles: (surface.articles || []).slice(0, 5).map(({ url: _url, ...article }) => article),
        faqs: (surface.faqs || []).slice(0, 5),
        changelogs: (surface.changelogs || []).slice(0, 3),
        tickets: { total: 0, open: 0, recentDisplayIds: [] },
    };
}

export function normalizeAnswerlatticePublicRelatedContent(
    value: unknown,
): AnswerlatticeSurfaceContentItem | null {
    if (!isRecord(value)) return null;
    if (
        !Array.isArray(value.articles)
        || !Array.isArray(value.changelogs)
        || (value.faqs !== undefined && !Array.isArray(value.faqs))
        || !isRecord(value.tickets)
    ) {
        return null;
    }
    const key = normalizeSurfaceKey(value.key);
    if (!key || value.key !== key) return null;
    const normalized = normalizeSurfaceContentItem(key, value);
    return normalized ? buildPublicRelatedContent(normalized) || null : null;
}
