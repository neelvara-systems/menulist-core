import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeWidgetConfig } from '@lib/canonica/widgetConfig';
import { canonicaFirestoreAdmin, canonicaStorageAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import type {
    CanonicaCanonicalAnswer,
    CanonicaContextBundleManifest,
    CanonicaContextBundleStats,
    CanonicaEntity,
    CanonicaEntityRelation,
    CanonicaFaq,
    CanonicaProductSurface,
    CanonicaSurfaceContentSummary,
} from '@type/canonica';
import type { ChangelogEntry, ChangelogPage } from '@type/changelog';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { createHash, randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
    CANONICA_CONTEXT_BUNDLE_LIMITS,
    CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
    EMPTY_BUNDLE_STATS,
    buildCanonicaRouteKey,
    compiledSourceVersionsEqual,
    getCanonicaBundleLockDocId,
    getCanonicaBundleManifestDocId,
    getPrivateBundlePath,
    getPublicBundlePath,
    normalizeCompiledSourceVersions,
} from './compiledContext';
import { getCanonicaCompiledSourceVersionsAdmin } from './compiledSourceVersionsAdmin';
import { getContextContentSummaryDocId } from './productSurfaceContent';
import { rebuildProductSurfaceContentSummaryServer } from './productSurfaceContentServer';

const MAX_ENTITIES_FOR_BUNDLE = 1_000;
const MAX_RELATIONS_FOR_BUNDLE = 2_000;
const MAX_CANONICAL_FOR_BUNDLE = 1_000;
const MAX_SURFACES_FOR_BUNDLE = 300;
const MAX_ARTICLES_FOR_BUNDLE = 500;
const MAX_FAQS_FOR_BUNDLE = 500;
const MAX_CHANGELOG_PAGES_FOR_BUNDLE = 5;
const MAX_BUNDLE_CACHE_ENTRIES = 200;
const BUNDLE_CACHE_TTL_MS = 10 * 60 * 1000;
const MANIFEST_CACHE_TTL_MS = 60 * 1000;
const PUBLIC_BUNDLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PRIVATE_BUNDLE_CACHE_CONTROL = 'private, max-age=300';

type BuildReason = 'manual' | 'onboarding' | 'nightly_repair' | 'source_change' | string;

type BundleCacheEntry = {
    expiresAt: number;
    value: any;
};

const bundleObjectCache = new Map<string, BundleCacheEntry>();
const bundleManifestCache = new Map<string, BundleCacheEntry>();

const getDb = () => {
    if (!canonicaFirestoreAdmin || typeof canonicaFirestoreAdmin.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    return canonicaFirestoreAdmin;
};

const getBucket = () => {
    if (!canonicaStorageAdmin || typeof canonicaStorageAdmin.bucket !== 'function') {
        throw new Error('Canonica Storage Admin is not configured');
    }
    return canonicaStorageAdmin.bucket();
};

const assertScope = (tId: number, sId: number) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error('Invalid Canonica tenant scope.');
    }
    return { tenantId, storeId };
};

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

const getPublicBundleId = (existing: any, tId: number, sId: number): string => {
    if (typeof existing?.publicBundleId === 'string' && existing.publicBundleId.startsWith('pb_')) {
        return existing.publicBundleId;
    }
    const salt = process.env.CANONICA_PUBLIC_BUNDLE_SALT
        || process.env.NEXTAUTH_SECRET
        || process.env.CANONICA_MCP_SESSION_SECRET;
    if (!salt) return `pb_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    return `pb_${createHash('sha256').update(`${tId}:${sId}:${salt}`).digest('base64url').slice(0, 24)}`;
};

const compactEntity = (entity: CanonicaEntity) => ({
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

const compactRelation = (relation: CanonicaEntityRelation) => ({
    id: relation.id,
    fromEntityId: relation.fromEntityId,
    toEntityId: relation.toEntityId,
    relationType: relation.relationType,
});

const compactAnswerLite = (answer: CanonicaCanonicalAnswer) => ({
    id: answer.id,
    title: answer.title,
    slug: answer.slug,
    answerType: answer.answerType || 'explanation',
    entityIds: answer.scope?.entityIds || [],
    planIds: answer.scope?.planIds || [],
    roleIds: answer.scope?.roleIds || [],
    shortAnswer: answer.content?.structuredSummary || '',
    verified: answer.status === 'active' && !answer.governance?.reviewRequired,
    confidenceScore: answer.validation?.confidenceScore ?? null,
    lastValidatedOn: toIso(answer.validation?.lastValidatedOn),
});

const compactAnswerPrivate = (answer: CanonicaCanonicalAnswer) => ({
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

const compactArticle = (article: KnowledgeBaseArticleType) => ({
    id: article.id,
    title: article.title,
    url: article.url,
    categoryId: article.categoryId || null,
    categoryTitle: article.categoryTitle || null,
    sectionId: article.sectionId || null,
    sectionTitle: article.sectionTitle || null,
    tags: Array.isArray(article.tags) ? article.tags.slice(0, 12) : [],
    entityIds: Array.isArray(article.entityIds) ? article.entityIds.slice(0, 20) : [],
    contextKeys: Array.isArray(article.contextKeys) ? article.contextKeys.slice(0, 20) : [],
    modifiedOn: toIso(article.modifiedOn),
});

const compactFaq = (faq: CanonicaFaq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    articleId: faq.articleId || null,
    articleTitle: faq.articleTitle || null,
    entityIds: Array.isArray(faq.entityIds) ? faq.entityIds.slice(0, 20) : [],
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
    entityChanges: Array.isArray(release.entityChanges) ? release.entityChanges.slice(0, 50) : [],
    status: release.status,
});

const compactChangelogEntry = (entry: ChangelogEntry, pageId: string) => ({
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
    key: surface.key,
    label: surface.label,
    routePatterns: Array.isArray(surface.routePatterns) ? surface.routePatterns.slice(0, 25) : [],
    feature: surface.feature || '',
    page: surface.page || '',
    workflow: surface.workflow || '',
    entityHints: Array.isArray(surface.entityHints) ? surface.entityHints.slice(0, 12) : [],
    entityIds: Array.isArray(surface.entityIds) ? surface.entityIds.slice(0, 25) : [],
    tags: Array.isArray(surface.tags) ? surface.tags.slice(0, 25) : [],
    visibility: surface.visibility || {},
    articles: Array.isArray(surface.articles) ? surface.articles.slice(0, 8) : [],
    faqs: Array.isArray(surface.faqs) ? surface.faqs.slice(0, 6) : [],
    changelogs: Array.isArray(surface.changelogs) ? surface.changelogs.slice(0, 5) : [],
    tickets: surface.tickets ? {
        total: Number(surface.tickets.total || 0),
        open: Number(surface.tickets.open || 0),
    } : { total: 0, open: 0 },
});

const loadDocs = async <T = any>(query: FirebaseFirestore.Query): Promise<T[]> => {
    const snap = await query.get();
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
};

const loadChangelogEntries = async (tId: number, sId: number): Promise<Array<ReturnType<typeof compactChangelogEntry>>> => {
    const pages = await loadDocs<ChangelogPage>(
        getDb()
            .collection(`${DB_COLLECTIONS.CHANGELOG}/${tId}/${sId}`)
            .orderBy('pageNumber', 'desc')
            .limit(MAX_CHANGELOG_PAGES_FOR_BUNDLE)
    );
    return pages
        .flatMap(page => (page.entries || [])
            .filter(entry => entry.published !== false)
            .map(entry => compactChangelogEntry(entry, page.id)))
        .slice(0, 100);
};

const loadSourceData = async (tId: number, sId: number) => {
    const db = getDb();
    const [
        storeSnap,
        contextSummary,
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
        rebuildProductSurfaceContentSummaryServer({ tId, sId, reason: 'context_bundle_build' })
            .catch(async () => {
                const snap = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                    .doc(getContextContentSummaryDocId(tId, sId))
                    .get();
                return snap.exists ? ({ ...snap.data(), id: snap.id } as CanonicaSurfaceContentSummary) : null;
            }),
        loadDocs<CanonicaEntity>(
            db.collection(DB_COLLECTIONS.CANONICA_ENTITIES)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .limit(MAX_ENTITIES_FOR_BUNDLE)
        ),
        loadDocs<CanonicaEntityRelation>(
            db.collection(DB_COLLECTIONS.CANONICA_ENTITY_RELATIONS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .limit(MAX_RELATIONS_FOR_BUNDLE)
        ),
        loadDocs<CanonicaCanonicalAnswer>(
            db.collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'active')
                .limit(MAX_CANONICAL_FOR_BUNDLE)
        ),
        loadDocs<CanonicaProductSurface>(
            db.collection(DB_COLLECTIONS.CANONICA_PRODUCT_SURFACES)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .limit(MAX_SURFACES_FOR_BUNDLE)
        ),
        loadDocs<KnowledgeBaseArticleType>(
            db.collection(DB_COLLECTIONS.KB_ARTICLES)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'published')
                .limit(MAX_ARTICLES_FOR_BUNDLE)
        ),
        loadDocs<CanonicaFaq>(
            db.collection(DB_COLLECTIONS.CANONICA_FAQS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'published')
                .where('active', '==', true)
                .limit(MAX_FAQS_FOR_BUNDLE)
        ),
        loadDocs(
            db.collection(DB_COLLECTIONS.CANONICA_RELEASES)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .limit(100)
        ),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`predictiveTriggers_${tId}_${sId}`).get(),
        loadChangelogEntries(tId, sId),
    ]);

    const entities = entitiesRaw.filter(entity => ['active', 'beta'].includes(String(entity.status || '').toLowerCase()));
    const answers = answersRaw.filter(answer => !answer.governance?.reviewRequired);
    const surfaces = surfacesRaw.filter(surface => surface.active !== false);
    const releases = releasesRaw.filter((release: any) => String(release.status || '').toLowerCase() === 'active');

    return {
        store: storeSnap.exists ? { ...storeSnap.data(), id: storeSnap.id } : {},
        contextSummary,
        entities,
        relations,
        answers,
        surfaces,
        articles: articlesRaw.filter(article => article.active !== false),
        faqs: faqsRaw,
        releases,
        predictive: predictiveSnap.exists ? predictiveSnap.data() || null : null,
        changelogEntries,
    };
};

const buildBundleObjects = (params: {
    tId: number;
    sId: number;
    bundleVersion: number;
    publicBundleId: string;
    sourceVersions: any;
    generatedAt: string;
    source: Awaited<ReturnType<typeof loadSourceData>>;
}) => {
    const { tId, sId, bundleVersion, publicBundleId, sourceVersions, generatedAt, source } = params;
    const store = source.store as Record<string, any>;
    const product = {
        name: store.productName || store.name || store.companyName || 'Product',
        url: store.productUrl || null,
        supportEmail: store.supportEmail || null,
        billingModel: store.billingModel || null,
        timeZone: store.timeZone || 'UTC',
        businessDayEndTime: store.businessDayEndTime || '00:00',
    };
    const entityIndex = source.entities.map(compactEntity);
    const relationIndex = source.relations.map(compactRelation);
    const canonicalIndex = source.answers.map(compactAnswerPrivate);
    const canonicalLite = source.answers.map(compactAnswerLite);
    const articleIndex = source.articles.map(compactArticle);
    const faqIndex = source.faqs.map(compactFaq);
    const releaseContext = {
        schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
        generatedAt,
        releases: source.releases.map(compactRelease),
        changelog: source.changelogEntries,
    };
    const surfacesFromSummary = Object.values(source.contextSummary?.surfaces || {}).map(safeSurface);
    const surfaceIndex = (surfacesFromSummary.length ? surfacesFromSummary : source.surfaces.map(safeSurface));
    const routeBundles: Record<string, any> = {};

    surfaceIndex.forEach((surface: any) => {
        const routePatterns = surface.routePatterns?.length ? surface.routePatterns : [`/${surface.key}`];
        routePatterns.forEach((routePattern: string) => {
            const routeKey = buildCanonicaRouteKey(routePattern || surface.key);
            const answerRefs = canonicalLite
                .filter(answer => (answer.entityIds || []).some((entityId: string) => (surface.entityIds || []).includes(entityId)))
                .slice(0, 20)
                .map(answer => answer.id);
            routeBundles[routeKey] = {
                schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
                generatedAt,
                routeKey,
                routePattern,
                surface,
                entities: entityIndex.filter(entity => (surface.entityIds || []).includes(entity.id)),
                articles: surface.articles || [],
                faqs: surface.faqs || [],
                releases: releaseContext.releases.filter(release => (release.entityChanges || []).some((entityId: string) => (surface.entityIds || []).includes(entityId))).slice(0, 10),
                answerRefs,
            };
        });
    });

    const productSummary = {
        schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
        pId: PRODUCT_IDS.CANONICA,
        tId,
        sId,
        bundleVersion,
        generatedAt,
        sourceVersions,
        product,
        stats: {
            entities: entityIndex.length,
            relations: relationIndex.length,
            canonicalAnswers: canonicalIndex.length,
            surfaces: surfaceIndex.length,
            articles: articleIndex.length,
            faqs: faqIndex.length,
            releases: releaseContext.releases.length,
            routes: Object.keys(routeBundles).length,
        },
        capabilities: {
            predictiveSupport: Number(source.predictive?.activeTriggerCount || 0) > 0,
        },
    };

    const widgetBootstrap = {
        schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
        bundleVersion,
        generatedAt,
        product,
        widget: {
            configVersion: Number(store.widgetConfigVersion || 0),
            config: normalizeWidgetConfig(store.widgetConfig),
        },
        capabilities: {
            contextBundles: true,
            predictiveSupport: Number(source.predictive?.activeTriggerCount || 0) > 0,
        },
        paths: {
            contextIndex: `context-index.json`,
            docsNav: `docs-nav.json`,
            canonicalLite: `canonical-lite.json`,
        },
    };

    const contextIndex = {
        schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
        bundleVersion,
        generatedAt,
        routes: Object.entries(routeBundles).map(([routeKey, bundle]) => ({
            routeKey,
            routePattern: bundle.routePattern,
            surfaceKey: bundle.surface?.key,
            label: bundle.surface?.label,
            path: `routes/${routeKey}.json`,
        })),
        surfaces: surfaceIndex.map((surface: any) => ({
            key: surface.key,
            label: surface.label,
            routePatterns: surface.routePatterns || [],
            entityIds: surface.entityIds || [],
            tags: surface.tags || [],
        })),
        entities: entityIndex.map(entity => ({
            id: entity.id,
            type: entity.type,
            name: entity.name,
            slug: entity.slug,
            description: entity.description,
        })),
    };

    const docsNav = {
        schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
        bundleVersion,
        generatedAt,
        articles: articleIndex,
        faqs: faqIndex,
    };

    const entityBundles = Object.fromEntries(entityIndex.map(entity => {
        const entityAnswers = canonicalIndex.filter(answer => (answer.entityIds || []).includes(entity.id));
        return [sanitizeSegment(entity.id, 'entity'), {
            schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
            generatedAt,
            entity,
            relations: relationIndex.filter(relation => relation.fromEntityId === entity.id || relation.toEntityId === entity.id),
            surfaces: surfaceIndex.filter((surface: any) => (surface.entityIds || []).includes(entity.id)),
            answers: entityAnswers,
            articles: articleIndex.filter(article => (article.entityIds || []).includes(entity.id)),
            releases: releaseContext.releases.filter(release => (release.entityChanges || []).includes(entity.id)),
        }];
    }));

    return {
        public: {
            'manifest.json': {
                schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
                pId: PRODUCT_IDS.CANONICA,
                publicBundleId,
                bundleVersion,
                generatedAt,
                sourceVersions,
            },
            'widget-bootstrap.json': widgetBootstrap,
            'context-index.json': contextIndex,
            'docs-nav.json': docsNav,
            'canonical-lite.json': {
                schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
                bundleVersion,
                generatedAt,
                answers: canonicalLite,
            },
            ...Object.fromEntries(Object.entries(routeBundles).map(([routeKey, bundle]) => [`routes/${routeKey}.json`, bundle])),
        },
        private: {
            'manifest.json': {
                schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
                pId: PRODUCT_IDS.CANONICA,
                tId,
                sId,
                publicBundleId,
                bundleVersion,
                generatedAt,
                sourceVersions,
            },
            'mcp/product-summary.json': productSummary,
            'mcp/entity-index.json': {
                schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
                bundleVersion,
                generatedAt,
                entities: entityIndex,
                relations: relationIndex,
            },
            'mcp/surface-index.json': {
                schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
                bundleVersion,
                generatedAt,
                surfaces: surfaceIndex,
                routes: Object.entries(routeBundles).map(([routeKey, bundle]) => ({
                    routeKey,
                    routePattern: bundle.routePattern,
                    surfaceKey: bundle.surface?.key,
                    path: `mcp/routes/${routeKey}.json`,
                })),
            },
            'mcp/canonical-index.json': {
                schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
                bundleVersion,
                generatedAt,
                answers: canonicalIndex,
            },
            'mcp/release-context.json': releaseContext,
            ...Object.fromEntries(Object.entries(routeBundles).map(([routeKey, bundle]) => [`mcp/routes/${routeKey}.json`, bundle])),
            ...Object.fromEntries(Object.entries(entityBundles).map(([entityId, bundle]) => [`mcp/entities/${entityId}.json`, bundle])),
        },
        routeCount: Object.keys(routeBundles).length,
    };
};

const uploadBundleObject = async (path: string, value: any, cacheControl: string) => {
    const json = stableStringify(value);
    const bytes = Buffer.byteLength(json, 'utf8');
    const hash = sha256(json);
    await getBucket().file(path).save(json, {
        resumable: false,
        metadata: {
            contentType: 'application/json; charset=utf-8',
            cacheControl,
            metadata: { hash },
        },
    });
    return {
        path,
        bytes,
        hash,
        contentType: 'application/json; charset=utf-8',
        cacheControl,
    };
};

export const getCanonicaContextBundleManifestServer = async (
    tId: number,
    sId: number,
    cacheTtlMs = MANIFEST_CACHE_TTL_MS,
): Promise<CanonicaContextBundleManifest | null> => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const cacheKey = `${tenantId}_${storeId}`;
    const cached = bundleManifestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as CanonicaContextBundleManifest | null;
    if (cached) bundleManifestCache.delete(cacheKey);

    const snap = await getDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getCanonicaBundleManifestDocId(tenantId, storeId))
        .get();
    const manifest = snap.exists ? ({ ...snap.data(), id: snap.id } as CanonicaContextBundleManifest) : null;
    if (bundleManifestCache.size >= MAX_BUNDLE_CACHE_ENTRIES) {
        const oldestKey = bundleManifestCache.keys().next().value;
        if (oldestKey) bundleManifestCache.delete(oldestKey);
    }
    bundleManifestCache.set(cacheKey, { value: manifest, expiresAt: Date.now() + cacheTtlMs });
    return manifest;
};

export const loadCanonicaBundleObjectServer = async <T = any>(
    filePath: string,
    cacheTtlMs = BUNDLE_CACHE_TTL_MS,
): Promise<T | null> => {
    const cached = bundleObjectCache.get(filePath);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached) bundleObjectCache.delete(filePath);

    const [exists] = await getBucket().file(filePath).exists();
    if (!exists) return null;
    const [buffer] = await getBucket().file(filePath).download();
    const value = JSON.parse(buffer.toString('utf8')) as T;
    if (bundleObjectCache.size >= MAX_BUNDLE_CACHE_ENTRIES) {
        const oldestKey = bundleObjectCache.keys().next().value;
        if (oldestKey) bundleObjectCache.delete(oldestKey);
    }
    bundleObjectCache.set(filePath, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
};

export const buildCanonicaContextBundleServer = async (params: {
    tId: number;
    sId: number;
    reason?: BuildReason;
    requestedBy?: string;
    force?: boolean;
}): Promise<CanonicaContextBundleManifest> => {
    const { tenantId, storeId } = assertScope(params.tId, params.sId);
    const db = getDb();
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getCanonicaBundleManifestDocId(tenantId, storeId));
    const lockRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getCanonicaBundleLockDocId(tenantId, storeId));
    const startedAt = Timestamp.now();
    const lockId = `bundle_${tenantId}_${storeId}_${Date.now()}`;

    const existingManifestSnap = await manifestRef.get();
    const existingManifest = existingManifestSnap.exists ? existingManifestSnap.data() : null;
    const sourceVersionsAtStart = await getCanonicaCompiledSourceVersionsAdmin(tenantId, storeId);
    const normalizedStartVersions = normalizeCompiledSourceVersions(sourceVersionsAtStart);

    if (
        !params.force
        && existingManifest?.status === 'ready'
        && compiledSourceVersionsEqual(existingManifest.sourceVersions, normalizedStartVersions)
    ) {
        return { ...existingManifest, id: manifestRef.id } as CanonicaContextBundleManifest;
    }

    await lockRef.set({
        schemaVersion: 1,
        pId: PRODUCT_IDS.CANONICA,
        tId: tenantId,
        sId: storeId,
        lockId,
        status: 'building',
        startedAt,
        expiresAt: Timestamp.fromMillis(startedAt.toMillis() + 10 * 60 * 1000),
        sourceVersionsAtStart: normalizedStartVersions,
        requestedBy: params.requestedBy || 'system',
        reason: params.reason || 'manual',
    }, { merge: true });

    await manifestRef.set({
        schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
        pId: PRODUCT_IDS.CANONICA,
        tId: tenantId,
        sId: storeId,
        status: 'building',
        lastBuildStartedAt: FieldValue.serverTimestamp(),
        lastBuildError: null,
        staleReason: null,
    }, { merge: true });

    try {
        const bundleVersion = Number(existingManifest?.bundleVersion || existingManifest?.activeVersion || 0) + 1;
        const publicBundleId = getPublicBundleId(existingManifest, tenantId, storeId);
        const generatedAt = new Date().toISOString();
        const source = await loadSourceData(tenantId, storeId);
        const objects = buildBundleObjects({
            tId: tenantId,
            sId: storeId,
            bundleVersion,
            publicBundleId,
            sourceVersions: normalizedStartVersions,
            generatedAt,
            source,
        });

        const bundles: CanonicaContextBundleManifest['bundles'] = {};
        let publicBytesTotal = 0;
        let privateBytesTotal = 0;

        for (const [filePath, objectValue] of Object.entries(objects.public)) {
            const ref = await uploadBundleObject(
                getPublicBundlePath(publicBundleId, bundleVersion, filePath),
                objectValue,
                PUBLIC_BUNDLE_CACHE_CONTROL,
            );
            bundles[`public:${filePath}`] = ref;
            publicBytesTotal += ref.bytes;
        }

        for (const [filePath, objectValue] of Object.entries(objects.private)) {
            const ref = await uploadBundleObject(
                getPrivateBundlePath(tenantId, storeId, bundleVersion, filePath),
                objectValue,
                PRIVATE_BUNDLE_CACHE_CONTROL,
            );
            bundles[`private:${filePath}`] = ref;
            privateBytesTotal += ref.bytes;
        }

        const sourceVersionsAtEnd = normalizeCompiledSourceVersions(await getCanonicaCompiledSourceVersionsAdmin(tenantId, storeId));
        const superseded = !compiledSourceVersionsEqual(normalizedStartVersions, sourceVersionsAtEnd);
        const stats: CanonicaContextBundleStats = {
            ...EMPTY_BUNDLE_STATS,
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
        const manifestHash = sha256(stableStringify({ bundles, sourceVersions: normalizedStartVersions, stats }));
        const manifest: CanonicaContextBundleManifest = {
            schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
            pId: PRODUCT_IDS.CANONICA,
            tId: tenantId,
            sId: storeId,
            publicBundleId,
            bundleVersion,
            activeVersion: superseded ? Number(existingManifest?.activeVersion || 0) : bundleVersion,
            lastReadyVersion: superseded ? Number(existingManifest?.lastReadyVersion || 0) : bundleVersion,
            status: superseded ? 'superseded' : 'ready',
            generatedAt: Timestamp.fromDate(new Date(generatedAt)) as any,
            lastBuildStartedAt: startedAt as any,
            lastBuildCompletedAt: Timestamp.now() as any,
            lastBuildError: null,
            staleReason: superseded ? 'source_versions_changed_during_build' : null,
            hash: manifestHash,
            sourceVersions: superseded ? sourceVersionsAtEnd : normalizedStartVersions,
            stats,
            bundles,
            limits: CANONICA_CONTEXT_BUNDLE_LIMITS,
        };

        await uploadBundleObject(
            getPublicBundlePath(publicBundleId, bundleVersion, 'manifest.json'),
            manifest,
            PUBLIC_BUNDLE_CACHE_CONTROL,
        ).catch(() => undefined);
        await uploadBundleObject(
            getPrivateBundlePath(tenantId, storeId, bundleVersion, 'manifest.json'),
            manifest,
            PRIVATE_BUNDLE_CACHE_CONTROL,
        ).catch(() => undefined);

        await manifestRef.set({
            ...manifest,
            updatedAt: FieldValue.serverTimestamp(),
            reason: params.reason || 'manual',
            requestedBy: params.requestedBy || 'system',
        }, { merge: true });
        bundleManifestCache.set(`${tenantId}_${storeId}`, {
            value: { ...manifest, id: manifestRef.id },
            expiresAt: Date.now() + MANIFEST_CACHE_TTL_MS,
        });
        await lockRef.set({
            status: 'released',
            completedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return { ...manifest, id: manifestRef.id };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await manifestRef.set({
            schemaVersion: CANONICA_CONTEXT_BUNDLE_SCHEMA_VERSION,
            pId: PRODUCT_IDS.CANONICA,
            tId: tenantId,
            sId: storeId,
            status: existingManifest?.lastReadyVersion ? 'stale' : 'failed',
            lastBuildError: 'build_failed',
            lastBuildCompletedAt: FieldValue.serverTimestamp(),
            staleReason: 'build_failed',
            activeVersion: Number(existingManifest?.activeVersion || 0),
            lastReadyVersion: Number(existingManifest?.lastReadyVersion || 0),
        }, { merge: true });
        await lockRef.set({
            status: 'failed',
            completedAt: FieldValue.serverTimestamp(),
            error: message.slice(0, 500),
        }, { merge: true });
        throw error;
    }
};
