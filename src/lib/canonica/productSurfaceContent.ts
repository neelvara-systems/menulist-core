import { PRODUCT_IDS } from '@constant/product';
import type {
    CanonicaContextPayload,
    CanonicaProductSurface,
    CanonicaProductSurfaceVisibility,
    CanonicaSurfaceContentItem,
    CanonicaSurfaceContentSummary,
} from '@type/canonica';
import { z } from 'zod';

export const CANONICA_CONTEXT_CONTENT_SUMMARY_PREFIX = 'contextContent';
export const CANONICA_PRODUCT_SURFACE_LIMIT = 300;
export const CANONICA_PRODUCT_SURFACE_DEFAULT_VISIBILITY: CanonicaProductSurfaceVisibility = {
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

const CONTROL_TEXT_PATTERN = /[\u0000-\u001f\u007f]/g;

export const getContextContentSummaryDocId = (tId: number, sId: number) =>
    `${CANONICA_CONTEXT_CONTENT_SUMMARY_PREFIX}_${Number(tId)}_${Number(sId)}`;

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

export function normalizeSurfaceVisibility(value: unknown): CanonicaProductSurfaceVisibility {
    const input = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Partial<CanonicaProductSurfaceVisibility>
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
    }).optional().default(CANONICA_PRODUCT_SURFACE_DEFAULT_VISIBILITY),
    active: z.boolean().optional().default(true),
    priority: z.coerce.number().int().min(0).max(999).optional().default(100),
});

export type ProductSurfaceSaveInput = z.infer<typeof ProductSurfaceSaveSchema>;

export function parseProductSurfaceSaveInput(value: unknown, scope: { tId: number; sId: number }): Omit<CanonicaProductSurface, 'id'> & { id?: string } {
    const parsed = ProductSurfaceSaveSchema.parse(value);
    const label = parsed.label.replace(CONTROL_TEXT_PATTERN, '').trim();
    const key = normalizeSurfaceKey(parsed.key) || buildSurfaceKeyFromLabel(label);

    return {
        ...(parsed.id ? { id: parsed.id } : {}),
        pId: PRODUCT_IDS.CANONICA,
        tId: Number(scope.tId),
        sId: Number(scope.sId),
        key,
        label,
        description: parsed.description?.replace(CONTROL_TEXT_PATTERN, '').trim() || '',
        routePatterns: normalizeSurfaceRoutePatterns(parsed.routePatterns),
        feature: normalizeSurfaceToken(parsed.feature),
        page: normalizeSurfaceToken(parsed.page),
        workflow: normalizeSurfaceToken(parsed.workflow),
        entityHints: normalizeSurfaceList(parsed.entityHints, MAX_ENTITY_HINTS, 64),
        entityIds: Array.from(new Set(parsed.entityIds.map(value => value.trim()).filter(Boolean))).slice(0, MAX_ENTITY_IDS),
        tags: normalizeSurfaceList(parsed.tags, MAX_TAGS, 64),
        visibility: normalizeSurfaceVisibility(parsed.visibility),
        active: parsed.active !== false,
        priority: parsed.priority ?? 100,
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

export function scoreContentForSurface(content: Record<string, any>, surface: CanonicaProductSurface): number {
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
    surface: CanonicaSurfaceContentItem,
    context?: CanonicaContextPayload | null,
    target: keyof CanonicaProductSurfaceVisibility = 'helpWidget',
): number {
    if (!context) return 0;
    if (surface.visibility && surface.visibility[target] === false) return 0;

    const contextKey = normalizeSurfaceKey(context.contextKey);
    if (contextKey && contextKey === surface.key) return 1000;

    let score = 0;
    if (context.feature && normalizeSurfaceToken(context.feature) === surface.feature) score += 40;
    if (context.page && normalizeSurfaceToken(context.page) === surface.page) score += 50;
    if (context.workflow && normalizeSurfaceToken(context.workflow) === surface.workflow) score += 35;
    score += listOverlapCount(context.entityHints, surface.entityHints) * 20;
    score += listOverlapCount(context.entityHints, surface.tags) * 10;
    return score;
}

export function resolveSurfaceContentForContext(
    summary: CanonicaSurfaceContentSummary | null | undefined,
    context?: CanonicaContextPayload | null,
    target: keyof CanonicaProductSurfaceVisibility = 'helpWidget',
): CanonicaSurfaceContentItem | null {
    if (!summary?.surfaces || !context) return null;

    const ranked = Object.values(summary.surfaces)
        .map(surface => ({ surface, score: scoreSurfaceForContext(surface, context, target) }))
        .filter(item => item.score >= 50)
        .sort((a, b) => b.score - a.score);

    return ranked[0]?.surface || null;
}

export function mergeSurfaceContext(
    context: CanonicaContextPayload | undefined,
    surface: CanonicaSurfaceContentItem | null,
): CanonicaContextPayload | undefined {
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

export function buildPublicRelatedContent(surface: CanonicaSurfaceContentItem | null): CanonicaSurfaceContentItem | undefined {
    if (!surface) return undefined;
    return {
        ...surface,
        articles: (surface.articles || []).slice(0, 5),
        changelogs: (surface.changelogs || []).slice(0, 3),
        tickets: { total: 0, open: 0, recentDisplayIds: [] },
    };
}
