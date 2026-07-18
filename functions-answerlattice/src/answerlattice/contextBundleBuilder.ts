import { createHash, randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db, storageAdmin } from '../firebaseAdmin';
import {
    compiledSourceVersionsEqual,
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleBuildClaimDecision,
    getAnswerlatticeBundleLockDocId,
    getAnswerlatticeBundleManifestDocId,
    hasExactAnswerlatticeReadyBundleVersions,
    getAnswerlatticeSourceVersionsDocId,
    normalizeAnswerlatticeStoredBundleVersion,
    normalizeCompiledSourceVersions,
    resolveAnswerlatticeExistingBundleVersion,
} from './compiledContextVersions';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { parseExactAnswerlatticeScope } from './scopeBoundary';

const SCHEMA_VERSION = 1;
const BUNDLE_ROOT = 'answerlattice-context';
const MAX_ENTITIES = 1000;
const MAX_RELATIONS = 2000;
const MAX_CANONICAL = 1000;
const MAX_SURFACES = 300;
const MAX_ARTICLES = 500;
const MAX_FAQS = 500;
const MAX_RELEASES = 100;
const MAX_CHANGELOG_PAGES = 5;
const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PRIVATE_CACHE_CONTROL = 'private, max-age=300';
const ANSWERLATTICE_CONTEXT_BUNDLE_CHANGELOG_LOAD_FAILED = 'ANSWERLATTICE_CONTEXT_BUNDLE_CHANGELOG_LOAD_FAILED';
const ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED = 'ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED';
const ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED = 'ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED';

type BuildStatus = 'ready' | 'skipped' | 'superseded' | 'failed';

export interface ContextBundleRepairResult {
    status: BuildStatus;
    rebuilt: boolean;
    skippedReason?: string;
    bundleVersion: number;
    bytesTotal: number;
    routes: number;
    error?: string;
}

function getContextBundleSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const sourceStatusCode = typeof source.status === 'number'
        ? source.status
        : (typeof source.statusCode === 'number' ? source.statusCode : null);

    return {
        sourceErrorName: typeof source.name === 'string' ? source.name : null,
        sourceErrorCode: typeof source.code === 'string' || typeof source.code === 'number' ? source.code : null,
        sourceStatusCode,
    };
}

function getContextBundleScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: Number.isFinite(tId),
        hasStoreScope: Number.isFinite(sId),
    };
}

const stableStringify = (value: any): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const sha256 = (value: string) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

const toIso = (value: any): string | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeContextBundleEntityIds = (values: unknown, limit?: number): string[] => {
    const source = Array.isArray(values) ? values : [];
    const normalizedIds: string[] = [];
    const seen = new Set<string>();
    for (const value of source) {
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(value);
        if (!entityId || seen.has(entityId)) continue;
        seen.add(entityId);
        normalizedIds.push(entityId);
        if (typeof limit === 'number' && normalizedIds.length >= limit) break;
    }
    return normalizedIds;
};

const sanitizeSegment = (value: unknown, fallback: string): string => {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 96);
    return normalized || fallback;
};

const normalizeRoutePath = (value: unknown): string => {
    if (typeof value !== 'string') return '/';
    let path = value.trim();
    if (!path) return '/';
    try {
        if (/^https?:\/\//i.test(path)) path = new URL(path).pathname || '/';
    } catch {
        return '/';
    }
    path = path
        .split(/[?#]/)[0]
        .toLowerCase()
        .replace(/\/[0-9a-f-]{16,}/g, '/:id')
        .replace(/\/\d+/g, '/:id')
        .replace(/\/{2,}/g, '/');
    if (!path.startsWith('/')) path = `/${path}`;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
};

const buildRouteKey = (value: unknown): string => {
    const normalized = normalizeRoutePath(value);
    const key = normalized
        .replace(/[^a-z0-9:/_-]/g, '_')
        .replace(/[:/]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    return `r_${key || 'root'}`.slice(0, 96);
};

const getPublicBundlePath = (publicBundleId: string, version: number, filePath: string) =>
    `${BUNDLE_ROOT}/public/${publicBundleId}/v${Number(version)}/${filePath.replace(/^\/+/, '')}`;

const getPrivateBundlePath = (tId: number, sId: number, version: number, filePath: string) =>
    `${BUNDLE_ROOT}/private/${Number(tId)}/${Number(sId)}/v${Number(version)}/${filePath.replace(/^\/+/, '')}`;

const getPublicBundleId = (existing: any, tId: number, sId: number): string => {
    if (typeof existing?.publicBundleId === 'string' && existing.publicBundleId.startsWith('pb_')) {
        return existing.publicBundleId;
    }
    const salt = process.env.ANSWERLATTICE_PUBLIC_BUNDLE_SALT || process.env.ANSWERLATTICE_MCP_SESSION_SECRET;
    if (!salt) return `pb_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    return `pb_${createHash('sha256').update(`${tId}:${sId}:${salt}`).digest('base64url').slice(0, 24)}`;
};

const loadDocs = async <T = any>(query: FirebaseFirestore.Query): Promise<T[]> => {
    const snap = await query.get();
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
};

const compactEntity = (entity: any) => ({
    id: entity.id,
    type: entity.type,
    name: entity.name,
    slug: entity.slug,
    description: entity.description || '',
    status: entity.status,
    aliases: Array.isArray(entity.aliases) ? entity.aliases.slice(0, 20) : [],
    currentVersion: entity.currentVersion ?? null,
    modifiedOn: toIso(entity.modifiedOn),
});

const compactRelation = (relation: any) => {
    const fromEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(relation.fromEntityId);
    const toEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(relation.toEntityId);
    if (!fromEntityId || !toEntityId) return null;
    return {
        id: relation.id,
        fromEntityId,
        toEntityId,
        relationType: relation.relationType,
    };
};

const compactAnswerLite = (answer: any) => ({
    id: answer.id,
    title: answer.title,
    slug: answer.slug,
    answerType: answer.answerType || 'explanation',
    entityIds: normalizeContextBundleEntityIds(answer.scope?.entityIds),
    planIds: answer.scope?.planIds || [],
    roleIds: answer.scope?.roleIds || [],
    shortAnswer: answer.content?.structuredSummary || '',
    verified: answer.status === 'active' && !answer.governance?.reviewRequired,
    confidenceScore: answer.validation?.confidenceScore ?? null,
    lastValidatedOn: toIso(answer.validation?.lastValidatedOn),
});

const compactAnswerPrivate = (answer: any) => ({
    ...compactAnswerLite(answer),
    content: {
        structuredSummary: answer.content?.structuredSummary || '',
        detailedExplanation: answer.content?.detailedExplanation || '',
        edgeCases: answer.content?.edgeCases || null,
        constraints: answer.content?.constraints || null,
        procedure: answer.content?.procedure || null,
    },
    productBinding: answer.productBinding || null,
    governance: {
        driftFlag: Boolean(answer.governance?.driftFlag),
        reviewRequired: Boolean(answer.governance?.reviewRequired),
        driftReason: answer.governance?.driftReason || null,
    },
});

const compactArticle = (article: any) => ({
    id: article.id,
    title: article.title,
    url: article.url,
    categoryId: article.categoryId || null,
    categoryTitle: article.categoryTitle || null,
    sectionId: article.sectionId || null,
    sectionTitle: article.sectionTitle || null,
    tags: Array.isArray(article.tags) ? article.tags.slice(0, 12) : [],
    entityIds: normalizeContextBundleEntityIds(article.entityIds, 20),
    contextKeys: Array.isArray(article.contextKeys) ? article.contextKeys.slice(0, 20) : [],
    modifiedOn: toIso(article.modifiedOn),
});

const compactFaq = (faq: any) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    articleId: faq.articleId || null,
    articleTitle: faq.articleTitle || null,
    entityIds: normalizeContextBundleEntityIds(faq.entityIds, 20),
    contextKeys: Array.isArray(faq.contextKeys) ? faq.contextKeys.slice(0, 20) : [],
    tags: Array.isArray(faq.tags) ? faq.tags.slice(0, 12) : [],
    sortOrder: Number(faq.sortOrder || 0),
    modifiedOn: toIso(faq.modifiedOn),
});

const compactRelease = (release: any) => ({
    id: release.id,
    versionLabel: release.versionLabel || release.title || '',
    versionNormalized: release.versionNormalized ?? null,
    releasedAt: toIso(release.releasedAt || release.createdOn),
    entityChanges: normalizeContextBundleEntityIds(release.entityChanges, 50),
    status: release.status,
});

const compactChangelogEntry = (entry: any, pageId: string) => ({
    id: entry.id,
    pageId,
    title: entry.title,
    version: entry.version || null,
    tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 12) : [],
    releasedOn: toIso(entry.releasedOn),
    contextKeys: Array.isArray(entry.contextKeys) ? entry.contextKeys.slice(0, 20) : [],
    kbSources: Array.isArray(entry.kbSources) ? entry.kbSources.slice(0, 12) : [],
});

const safeSurface = (surface: any) => ({
    key: surface.key || surface.id,
    label: surface.label || surface.name || surface.key || surface.id,
    routePatterns: Array.isArray(surface.routePatterns) ? surface.routePatterns.slice(0, 25) : [],
    feature: surface.feature || '',
    page: surface.page || '',
    workflow: surface.workflow || '',
    entityIds: normalizeContextBundleEntityIds(surface.entityIds, 25),
    entityHints: Array.isArray(surface.entityHints) ? surface.entityHints.slice(0, 12) : [],
    tags: Array.isArray(surface.tags) ? surface.tags.slice(0, 25) : [],
    articles: Array.isArray(surface.articles) ? surface.articles.slice(0, 8) : [],
    faqs: Array.isArray(surface.faqs) ? surface.faqs.slice(0, 6) : [],
    changelogs: Array.isArray(surface.changelogs) ? surface.changelogs.slice(0, 5) : [],
});

const normalizeWidgetConfig = (value: any) => {
    const config = value && typeof value === 'object' ? value : {};
    return {
        position: config.position || 'bottom-right',
        accentColor: /^#[0-9a-fA-F]{6}$/.test(config.accentColor || '') ? config.accentColor : '#6366f1',
        shape: ['rounded', 'pill'].includes(config.shape) ? config.shape : 'rounded',
        display: ['icon', 'text', 'icon-text'].includes(config.display) ? config.display : 'icon',
        label: typeof config.label === 'string' ? config.label.slice(0, 24) : '?',
        headerTitle: typeof config.headerTitle === 'string' ? config.headerTitle.slice(0, 40) : 'Help',
        greeting: typeof config.greeting === 'string' ? config.greeting.slice(0, 120) : 'How can we help?',
        size: ['small', 'medium', 'large'].includes(config.size) ? config.size : 'medium',
        launcherVisibility: ['visible', 'manual'].includes(config.launcherVisibility) ? config.launcherVisibility : 'visible',
        mobileVisibility: ['show', 'hide'].includes(config.mobileVisibility) ? config.mobileVisibility : 'show',
        poweredByVisible: config.poweredByVisible !== false,
        blockedRoutes: Array.isArray(config.blockedRoutes) ? config.blockedRoutes.slice(0, 50) : [],
    };
};

const loadChangelogEntries = async (tId: number, sId: number) => {
    try {
        const pages = await loadDocs(
            db.collection(`${DB_COLLECTIONS.CHANGELOG}/${tId}/${sId}`)
                .orderBy('pageNumber', 'desc')
                .limit(MAX_CHANGELOG_PAGES)
        );
        return pages
            .flatMap((page: any) => (page.entries || [])
                .filter((entry: any) => entry.published !== false)
                .map((entry: any) => compactChangelogEntry(entry, page.id)))
            .slice(0, 100);
    } catch (error) {
        logger.warn('[Answerlattice Context Bundle] Changelog load skipped', {
            failureCode: ANSWERLATTICE_CONTEXT_BUNDLE_CHANGELOG_LOAD_FAILED,
            ...getContextBundleScopeContext(tId, sId),
            ...getContextBundleSourceErrorContext(error),
        });
        return [];
    }
};

const uploadObject = async (path: string, value: any, cacheControl: string) => {
    const json = stableStringify(value);
    const bytes = Buffer.byteLength(json, 'utf8');
    const hash = sha256(json);
    await storageAdmin.bucket().file(path).save(json, {
        resumable: false,
        metadata: {
            contentType: 'application/json; charset=utf-8',
            cacheControl,
            metadata: { hash },
        },
    });
    return { path, bytes, hash, contentType: 'application/json; charset=utf-8', cacheControl };
};

const uploadManifestObjectBestEffort = async (
    path: string,
    value: any,
    cacheControl: string,
    context: {
        tId: number;
        sId: number;
        bundleVersion: number;
        visibility: 'public' | 'private';
    },
) => {
    try {
        await uploadObject(path, value, cacheControl);
    } catch (error) {
        logger.error('[Answerlattice Context Bundle] Manifest upload failed', {
            failureCode: ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED,
            ...getContextBundleScopeContext(context.tId, context.sId),
            bundleVersion: context.bundleVersion,
            visibility: context.visibility,
            ...getContextBundleSourceErrorContext(error),
        });
    }
};

const loadSourceData = async (tId: number, sId: number) => {
    const [
        storeSnap,
        contextSummarySnap,
        entitiesRaw,
        relations,
        answersRaw,
        surfacesRaw,
        articlesRaw,
        faqsRaw,
        releasesRaw,
        predictiveSnap,
        changelogEntries,
    ] = await Promise.all([
        db.collection(DB_COLLECTIONS.STORES).doc(String(sId)).get(),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`contextContent_${tId}_${sId}`).get(),
        loadDocs(db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).where('tId', '==', tId).where('sId', '==', sId).limit(MAX_ENTITIES)),
        loadDocs(db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS).where('tId', '==', tId).where('sId', '==', sId).limit(MAX_RELATIONS)),
        loadDocs(db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).where('tId', '==', tId).where('sId', '==', sId).where('status', '==', 'active').limit(MAX_CANONICAL)),
        loadDocs(db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES).where('tId', '==', tId).where('sId', '==', sId).limit(MAX_SURFACES)),
        loadDocs(db.collection(DB_COLLECTIONS.KB_ARTICLES).where('tId', '==', tId).where('sId', '==', sId).where('status', '==', 'published').limit(MAX_ARTICLES)),
        loadDocs(db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).where('tId', '==', tId).where('sId', '==', sId).where('status', '==', 'published').where('active', '==', true).limit(MAX_FAQS)),
        loadDocs(db.collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES).where('tId', '==', tId).where('sId', '==', sId).limit(MAX_RELEASES)),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`predictiveTriggers_${tId}_${sId}`).get(),
        loadChangelogEntries(tId, sId),
    ]);

    const contextSummary = contextSummarySnap.exists ? contextSummarySnap.data() || {} : {};
    const surfacesFromSummary = Object.values((contextSummary as any).surfaces || {}).map(safeSurface);

    return {
        store: storeSnap.exists ? { ...storeSnap.data(), id: storeSnap.id } : {},
        entities: entitiesRaw.filter((entity: any) => ['active', 'beta'].includes(String(entity.status || '').toLowerCase())),
        relations,
        answers: answersRaw.filter((answer: any) => !answer.governance?.reviewRequired),
        surfaces: surfacesFromSummary.length ? surfacesFromSummary : surfacesRaw.filter((surface: any) => surface.active !== false).map(safeSurface),
        articles: articlesRaw.filter((article: any) => article.active !== false),
        faqs: faqsRaw,
        releases: releasesRaw.filter((release: any) => String(release.status || '').toLowerCase() === 'active'),
        predictive: predictiveSnap.exists ? predictiveSnap.data() || null : null,
        changelogEntries,
    };
};

const buildObjects = (params: {
    tId: number;
    sId: number;
    publicBundleId: string;
    bundleVersion: number;
    sourceVersions: any;
    generatedAt: string;
    source: Awaited<ReturnType<typeof loadSourceData>>;
}) => {
    const { tId, sId, publicBundleId, bundleVersion, sourceVersions, generatedAt, source } = params;
    const product = {
        name: (source.store as any).productName || (source.store as any).name || (source.store as any).companyName || 'Product',
        url: (source.store as any).productUrl || null,
        supportEmail: (source.store as any).supportEmail || null,
        billingModel: (source.store as any).billingModel || null,
        timeZone: (source.store as any).timeZone || 'UTC',
        businessDayEndTime: (source.store as any).businessDayEndTime || '00:00',
    };
    const entities = source.entities.map(compactEntity);
    const relations = source.relations
        .map(compactRelation)
        .filter((relation): relation is NonNullable<ReturnType<typeof compactRelation>> => Boolean(relation));
    const canonicalPrivate = source.answers.map(compactAnswerPrivate);
    const canonicalLite = source.answers.map(compactAnswerLite);
    const articles = source.articles.map(compactArticle);
    const faqs = source.faqs.map(compactFaq);
    const releases = source.releases.map(compactRelease);
    const routeBundles: Record<string, any> = {};

    source.surfaces.forEach((surface: any) => {
        const patterns = surface.routePatterns?.length ? surface.routePatterns : [`/${surface.key || 'support'}`];
        patterns.forEach((routePattern: string) => {
            const routeKey = buildRouteKey(routePattern);
            const answerRefs = canonicalLite
                .filter(answer => (answer.entityIds || []).some((entityId: string) => (surface.entityIds || []).includes(entityId)))
                .slice(0, 20)
                .map(answer => answer.id);
            routeBundles[routeKey] = {
                schemaVersion: SCHEMA_VERSION,
                generatedAt,
                routeKey,
                routePattern,
                surface,
                entities: entities.filter(entity => (surface.entityIds || []).includes(entity.id)),
                articles: surface.articles || [],
                faqs: surface.faqs || [],
                releases: releases.filter(release => (release.entityChanges || []).some((entityId: string) => (surface.entityIds || []).includes(entityId))).slice(0, 10),
                answerRefs,
            };
        });
    });

    const releaseContext = {
        schemaVersion: SCHEMA_VERSION,
        generatedAt,
        releases,
        changelog: source.changelogEntries,
    };

    const publicObjects: Record<string, any> = {
        'manifest.json': { schemaVersion: SCHEMA_VERSION, pId: 'AL', publicBundleId, bundleVersion, generatedAt, sourceVersions },
        'widget-bootstrap.json': {
            schemaVersion: SCHEMA_VERSION,
            bundleVersion,
            generatedAt,
            product,
            widget: {
                configVersion: Number((source.store as any).widgetConfigVersion || 0),
                config: normalizeWidgetConfig((source.store as any).widgetConfig),
            },
            capabilities: {
                contextBundles: true,
                predictiveSupport: Number((source.predictive as any)?.activeTriggerCount || 0) > 0,
            },
            paths: {
                contextIndex: 'context-index.json',
                docsNav: 'docs-nav.json',
                canonicalLite: 'canonical-lite.json',
            },
        },
        'context-index.json': {
            schemaVersion: SCHEMA_VERSION,
            bundleVersion,
            generatedAt,
            routes: Object.entries(routeBundles).map(([routeKey, bundle]) => ({
                routeKey,
                routePattern: bundle.routePattern,
                surfaceKey: bundle.surface?.key,
                label: bundle.surface?.label,
                path: `routes/${routeKey}.json`,
            })),
            surfaces: source.surfaces.map((surface: any) => ({
                key: surface.key,
                label: surface.label,
                routePatterns: surface.routePatterns || [],
                entityIds: surface.entityIds || [],
                tags: surface.tags || [],
            })),
            entities: entities.map(entity => ({
                id: entity.id,
                type: entity.type,
                name: entity.name,
                slug: entity.slug,
                description: entity.description,
            })),
        },
        'docs-nav.json': { schemaVersion: SCHEMA_VERSION, bundleVersion, generatedAt, articles, faqs },
        'canonical-lite.json': { schemaVersion: SCHEMA_VERSION, bundleVersion, generatedAt, answers: canonicalLite },
        ...Object.fromEntries(Object.entries(routeBundles).map(([routeKey, bundle]) => [`routes/${routeKey}.json`, bundle])),
    };

    const entityBundles = Object.fromEntries(entities.map(entity => [sanitizeSegment(entity.id, 'entity'), {
        schemaVersion: SCHEMA_VERSION,
        generatedAt,
        entity,
        relations: relations.filter(relation => relation.fromEntityId === entity.id || relation.toEntityId === entity.id),
        surfaces: source.surfaces.filter((surface: any) => (surface.entityIds || []).includes(entity.id)),
        answers: canonicalPrivate.filter(answer => (answer.entityIds || []).includes(entity.id)),
        articles: articles.filter(article => (article.entityIds || []).includes(entity.id)),
        releases: releases.filter(release => (release.entityChanges || []).includes(entity.id)),
    }]));

    const privateObjects: Record<string, any> = {
        'manifest.json': { schemaVersion: SCHEMA_VERSION, pId: 'AL', tId, sId, publicBundleId, bundleVersion, generatedAt, sourceVersions },
        'mcp/product-summary.json': {
            schemaVersion: SCHEMA_VERSION,
            pId: 'AL',
            tId,
            sId,
            bundleVersion,
            generatedAt,
            sourceVersions,
            product,
            stats: {
                entities: entities.length,
                relations: relations.length,
                canonicalAnswers: canonicalPrivate.length,
                surfaces: source.surfaces.length,
                articles: articles.length,
                faqs: faqs.length,
                releases: releases.length,
                routes: Object.keys(routeBundles).length,
            },
            capabilities: {
                predictiveSupport: Number((source.predictive as any)?.activeTriggerCount || 0) > 0,
            },
        },
        'mcp/entity-index.json': { schemaVersion: SCHEMA_VERSION, bundleVersion, generatedAt, entities, relations },
        'mcp/surface-index.json': {
            schemaVersion: SCHEMA_VERSION,
            bundleVersion,
            generatedAt,
            surfaces: source.surfaces,
            routes: Object.entries(routeBundles).map(([routeKey, bundle]) => ({
                routeKey,
                routePattern: bundle.routePattern,
                surfaceKey: bundle.surface?.key,
                path: `mcp/routes/${routeKey}.json`,
            })),
        },
        'mcp/canonical-index.json': { schemaVersion: SCHEMA_VERSION, bundleVersion, generatedAt, answers: canonicalPrivate },
        'mcp/release-context.json': releaseContext,
        ...Object.fromEntries(Object.entries(routeBundles).map(([routeKey, bundle]) => [`mcp/routes/${routeKey}.json`, bundle])),
        ...Object.fromEntries(Object.entries(entityBundles).map(([entityId, bundle]) => [`mcp/entities/${entityId}.json`, bundle])),
    };

    return { publicObjects, privateObjects, routeCount: Object.keys(routeBundles).length };
};

export const repairCompiledContextBundle = async (tId: number, sId: number): Promise<ContextBundleRepairResult> => {
    const scope = parseExactAnswerlatticeScope(tId, sId);
    if (!scope) {
        return { status: 'failed', rebuilt: false, bundleVersion: 0, bytesTotal: 0, routes: 0, error: 'invalid_scope' };
    }
    const { tId: tenantId, sId: storeId } = scope;

    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId));
    const lockRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleLockDocId(tenantId, storeId));
    const sourceVersionsSnap = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId))
        .get();
    const manifestSnap = await manifestRef.get();
    const rawSourceVersions = sourceVersionsSnap.exists ? sourceVersionsSnap.data() : null;
    if (rawSourceVersions && (
        rawSourceVersions.pId !== 'AL'
        || rawSourceVersions.tId !== tenantId
        || rawSourceVersions.sId !== storeId
        || !areAnswerlatticeCompiledSourceVersionsValid(rawSourceVersions)
    )) {
        return { status: 'failed', rebuilt: false, bundleVersion: 0, bytesTotal: 0, routes: 0, error: 'invalid_source_versions' };
    }
    const sourceVersions = normalizeCompiledSourceVersions(rawSourceVersions);
    const existingManifest = manifestSnap.exists ? manifestSnap.data() || null : null;
    const existingBundleVersion = resolveAnswerlatticeExistingBundleVersion(existingManifest);
    if (existingBundleVersion === null) {
        return { status: 'failed', rebuilt: false, bundleVersion: 0, bytesTotal: 0, routes: 0, error: 'invalid_manifest_version' };
    }
    if (existingManifest?.status === 'ready'
        && hasExactAnswerlatticeReadyBundleVersions(existingManifest)
        && compiledSourceVersionsEqual(existingManifest.sourceVersions, sourceVersions)) {
        return {
            status: 'skipped',
            rebuilt: false,
            skippedReason: 'already_current',
            bundleVersion: existingBundleVersion,
            bytesTotal: Number(existingManifest.stats?.bytesTotal || 0),
            routes: Number(existingManifest.stats?.routes || 0),
        };
    }

    const startedAt = Timestamp.now();
    const lockId = `bundle_${tenantId}_${storeId}_${randomUUID()}`;
    const claim = await db.runTransaction(async (transaction) => {
        const [currentManifestSnap, currentLockSnap] = await Promise.all([
            transaction.get(manifestRef),
            transaction.get(lockRef),
        ]);
        const currentManifest = currentManifestSnap.exists ? currentManifestSnap.data() || null : null;
        const currentLock = currentLockSnap.exists ? currentLockSnap.data() || null : null;
        const decision = getAnswerlatticeBundleBuildClaimDecision(currentManifest, currentLock, startedAt.toMillis());
        if (decision.status !== 'claimable') {
            return { status: decision.status, existingManifest: currentManifest, bundleVersion: decision.bundleVersion };
        }
        const bundleVersion = decision.bundleVersion;

        transaction.set(lockRef, {
            schemaVersion: SCHEMA_VERSION,
            pId: 'AL',
            tId: tenantId,
            sId: storeId,
            status: 'building',
            lockId,
            bundleVersion,
            startedAt,
            expiresAt: Timestamp.fromMillis(startedAt.toMillis() + 10 * 60 * 1000),
            reason: 'nightly_repair',
            requestedBy: 'system:answerlattice_nightly',
            sourceVersionsAtStart: sourceVersions,
        }, { merge: true });
        transaction.set(manifestRef, {
            schemaVersion: SCHEMA_VERSION,
            pId: 'AL',
            tId: tenantId,
            sId: storeId,
            status: 'building',
            lastBuildStartedAt: FieldValue.serverTimestamp(),
            lastBuildError: null,
        }, { merge: true });
        return { status: 'claimed' as const, existingManifest: currentManifest, bundleVersion };
    });

    if (claim.status === 'active') {
        return {
            status: 'skipped',
            rebuilt: false,
            skippedReason: 'build_lock_active',
            bundleVersion: claim.bundleVersion,
            bytesTotal: Number(claim.existingManifest?.stats?.bytesTotal || 0),
            routes: Number(claim.existingManifest?.stats?.routes || 0),
        };
    }
    if (claim.status === 'invalid') {
        return { status: 'failed', rebuilt: false, bundleVersion: existingBundleVersion, bytesTotal: 0, routes: 0, error: 'invalid_manifest_version' };
    }
    const bundleVersion = claim.bundleVersion;
    const claimedManifest = claim.existingManifest;
    const existingActiveVersion = normalizeAnswerlatticeStoredBundleVersion(claimedManifest?.activeVersion) ?? 0;
    const existingLastReadyVersion = normalizeAnswerlatticeStoredBundleVersion(claimedManifest?.lastReadyVersion) ?? 0;
    const publicBundleId = getPublicBundleId(claimedManifest, tenantId, storeId);

    try {
        const generatedAt = new Date().toISOString();
        const source = await loadSourceData(tenantId, storeId);
        const objects = buildObjects({ tId: tenantId, sId: storeId, publicBundleId, bundleVersion, sourceVersions, generatedAt, source });
        const bundles: Record<string, any> = {};
        let publicBytesTotal = 0;
        let privateBytesTotal = 0;

        for (const [filePath, value] of Object.entries(objects.publicObjects)) {
            const ref = await uploadObject(getPublicBundlePath(publicBundleId, bundleVersion, filePath), value, PUBLIC_CACHE_CONTROL);
            bundles[`public:${filePath}`] = ref;
            publicBytesTotal += ref.bytes;
        }
        for (const [filePath, value] of Object.entries(objects.privateObjects)) {
            const ref = await uploadObject(getPrivateBundlePath(tenantId, storeId, bundleVersion, filePath), value, PRIVATE_CACHE_CONTROL);
            bundles[`private:${filePath}`] = ref;
            privateBytesTotal += ref.bytes;
        }

        const sourceVersionsAtEndSnap = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId))
            .get();
        const rawSourceVersionsAtEnd = sourceVersionsAtEndSnap.exists ? sourceVersionsAtEndSnap.data() : null;
        if (rawSourceVersionsAtEnd && (
            rawSourceVersionsAtEnd.pId !== 'AL'
            || rawSourceVersionsAtEnd.tId !== tenantId
            || rawSourceVersionsAtEnd.sId !== storeId
            || !areAnswerlatticeCompiledSourceVersionsValid(rawSourceVersionsAtEnd)
        )) throw new Error('invalid_source_versions');
        const sourceVersionsAtEnd = normalizeCompiledSourceVersions(rawSourceVersionsAtEnd);
        const superseded = !compiledSourceVersionsEqual(sourceVersions, sourceVersionsAtEnd);
        const stats = {
            entities: source.entities.length,
            entityRelations: source.relations.length,
            canonicalAnswers: source.answers.length,
            surfaces: source.surfaces.length,
            routes: objects.routeCount,
            articles: source.articles.length,
            faqs: source.faqs.length,
            releases: source.releases.length,
            publicBytesTotal,
            privateBytesTotal,
            bytesTotal: publicBytesTotal + privateBytesTotal,
        };
        const manifest = {
            schemaVersion: SCHEMA_VERSION,
            pId: 'AL',
            tId: tenantId,
            sId: storeId,
            publicBundleId,
            bundleVersion,
            activeVersion: superseded ? existingActiveVersion : bundleVersion,
            lastReadyVersion: superseded ? existingLastReadyVersion : bundleVersion,
            status: superseded ? 'superseded' : 'ready',
            generatedAt: Timestamp.fromDate(new Date(generatedAt)),
            lastBuildStartedAt: startedAt,
            lastBuildCompletedAt: Timestamp.now(),
            lastBuildError: null,
            staleReason: superseded ? 'source_versions_changed_during_build' : null,
            hash: sha256(stableStringify({ bundles, sourceVersions, stats })),
            sourceVersions: superseded ? sourceVersionsAtEnd : sourceVersions,
            stats,
            bundles,
            limits: {
                maxPublicBootstrapBytes: 50000,
                maxPublicRouteBytes: 50000,
                maxMcpResponseBytes: 24000,
                maxMcpToolCallsPerMinute: 60,
            },
            updatedAt: FieldValue.serverTimestamp(),
            reason: 'nightly_repair',
            requestedBy: 'system:answerlattice_nightly',
        };

        await uploadManifestObjectBestEffort(
            getPublicBundlePath(publicBundleId, bundleVersion, 'manifest.json'),
            manifest,
            PUBLIC_CACHE_CONTROL,
            { tId: tenantId, sId: storeId, bundleVersion, visibility: 'public' },
        );
        await uploadManifestObjectBestEffort(
            getPrivateBundlePath(tenantId, storeId, bundleVersion, 'manifest.json'),
            manifest,
            PRIVATE_CACHE_CONTROL,
            { tId: tenantId, sId: storeId, bundleVersion, visibility: 'private' },
        );
        await db.runTransaction(async (transaction) => {
            const currentLockSnap = await transaction.get(lockRef);
            if (!currentLockSnap.exists || currentLockSnap.data()?.lockId !== lockId) {
                throw new Error('context_bundle_build_lease_lost');
            }
            transaction.set(manifestRef, manifest, { merge: true });
            transaction.set(lockRef, { status: 'released', completedAt: FieldValue.serverTimestamp() }, { merge: true });
        });

        return {
            status: superseded ? 'superseded' : 'ready',
            rebuilt: !superseded,
            bundleVersion,
            bytesTotal: stats.bytesTotal,
            routes: stats.routes,
        };
    } catch (error) {
        await db.runTransaction(async (transaction) => {
            const currentLockSnap = await transaction.get(lockRef);
            if (!currentLockSnap.exists || currentLockSnap.data()?.lockId !== lockId) return;
            transaction.set(manifestRef, {
                schemaVersion: SCHEMA_VERSION,
                pId: 'AL',
                tId: tenantId,
                sId: storeId,
                status: existingLastReadyVersion ? 'stale' : 'failed',
                lastBuildError: 'build_failed',
                lastBuildCompletedAt: FieldValue.serverTimestamp(),
                staleReason: 'build_failed',
                activeVersion: existingActiveVersion,
                lastReadyVersion: existingLastReadyVersion,
            }, { merge: true });
            transaction.set(lockRef, {
                status: 'failed',
                completedAt: FieldValue.serverTimestamp(),
                error: ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED,
                ...getContextBundleSourceErrorContext(error),
            }, { merge: true });
        });
        return {
            status: 'failed',
            rebuilt: false,
            bundleVersion: existingBundleVersion,
            bytesTotal: Number(existingManifest?.stats?.bytesTotal || 0),
            routes: Number(existingManifest?.stats?.routes || 0),
            error: ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED,
        };
    }
};
