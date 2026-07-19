import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { isAnswerlatticeStoreInScope } from '@lib/answerlattice/sessionScope';
import { normalizeAnswerlatticePublicCitations } from '@lib/answerlattice/publicAnswerContracts';
import { normalizeWidgetConfig } from '@lib/answerlattice/widgetConfig';
import { answerlatticeFirestoreAdmin, answerlatticeStorageAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import type {
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeContextBundleManifest,
    AnswerlatticeContextBundleStats,
    AnswerlatticeEntity,
    AnswerlatticeEntityRelation,
    AnswerlatticeFaq,
    AnswerlatticeProductSurface,
    AnswerlatticeSurfaceContentSummary,
} from '@type/answerlattice';
import type { ChangelogEntry, ChangelogPage } from '@type/changelog';
import { isAnswerlatticeChangelogEntryPublished } from './changelogContracts';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { createHash, randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
    ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
    ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
    EMPTY_BUNDLE_STATS,
    buildAnswerlatticeRouteKey,
    compiledSourceVersionsEqual,
    getAnswerlatticeContextBundleObjectMaxBytes,
    getAnswerlatticeBundleBuildClaimDecision,
    getAnswerlatticeBundleLockDocId,
    getAnswerlatticeBundleManifestDocId,
    hasExactAnswerlatticeReadyBundleVersions,
    getPrivateBundlePath,
    getPublicBundlePath,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeAnswerlatticeStoredBundleVersion,
    normalizeCompiledSourceVersions,
    resolveAnswerlatticeExistingBundleVersion,
} from './compiledContext';
import { getAnswerlatticeCompiledSourceVersionsAdmin } from './compiledSourceVersionsAdmin';
import { normalizeAnswerlatticeResolvedEntityId } from './governanceIdBoundary';
import {
    getContextContentSummaryDocId,
    normalizeAnswerlatticeSurfaceContentSummary,
} from './productSurfaceContent';
import { rebuildProductSurfaceContentSummaryServer } from './productSurfaceContentServer';

const MAX_ENTITIES_FOR_BUNDLE = 1_000;
const MAX_RELATIONS_FOR_BUNDLE = 2_000;
const MAX_CANONICAL_FOR_BUNDLE = 1_000;
const MAX_SURFACES_FOR_BUNDLE = 300;
const MAX_ARTICLES_FOR_BUNDLE = 500;
const MAX_FAQS_FOR_BUNDLE = 500;
const MAX_RELEASES_FOR_BUNDLE = 100;
const MAX_CHANGELOG_PAGES_FOR_BUNDLE = 5;
const MAX_BUNDLE_CACHE_ENTRIES = 200;
const BUNDLE_CACHE_TTL_MS = 10 * 60 * 1000;
const MANIFEST_CACHE_TTL_MS = 60 * 1000;
const PUBLIC_BUNDLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PRIVATE_BUNDLE_CACHE_CONTROL = 'private, max-age=300';
const ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED = 'answerlattice_context_bundle_manifest_upload_failed';
const ANSWERLATTICE_CONTEXT_BUNDLE_OBJECT_OVERSIZED = 'answerlattice_context_bundle_object_oversized';
const ANSWERLATTICE_CONTEXT_BUNDLE_SOURCE_LIMIT_EXCEEDED = 'answerlattice_context_bundle_source_limit_exceeded';
const CONTEXT_BUNDLE_OBJECT_DOWNLOAD_MAX_BYTES = ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS.maxPrivateObjectBytes;
const ANSWERLATTICE_CONTEXT_BUNDLE_BUILD_REASONS = ['manual', 'activation_manual_rebuild', 'onboarding', 'nightly_repair', 'source_change'] as const;
const ANSWERLATTICE_CONTEXT_BUNDLE_REQUESTERS = ['owner', 'system'] as const;

type BuildReason = typeof ANSWERLATTICE_CONTEXT_BUNDLE_BUILD_REASONS[number];
type BuildRequester = typeof ANSWERLATTICE_CONTEXT_BUNDLE_REQUESTERS[number];

type BundleCacheEntry = {
    expiresAt: number;
    value: any;
};

const bundleObjectCache = new Map<string, BundleCacheEntry>();
const bundleManifestCache = new Map<string, BundleCacheEntry>();

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
};

const getBucket = () => {
    if (!answerlatticeStorageAdmin || typeof answerlatticeStorageAdmin.bucket !== 'function') {
        throw new Error('Answerlattice Storage Admin is not configured');
    }
    return answerlatticeStorageAdmin.bucket();
};

const assertScope = (tId: number, sId: number) => {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error('Invalid Answerlattice tenant scope.');
    }
    return { tenantId: tId, storeId: sId };
};

const normalizeAnswerlatticeContextBundleBuildReason = (reason: unknown): BuildReason => {
    const normalized = typeof reason === 'string' ? reason.trim() : '';
    return ANSWERLATTICE_CONTEXT_BUNDLE_BUILD_REASONS.includes(normalized as BuildReason)
        ? normalized as BuildReason
        : 'manual';
};

const normalizeAnswerlatticeContextBundleRequester = (requestedBy: unknown): BuildRequester => {
    const normalized = typeof requestedBy === 'string' ? requestedBy.trim() : '';
    return ANSWERLATTICE_CONTEXT_BUNDLE_REQUESTERS.includes(normalized as BuildRequester)
        ? normalized as BuildRequester
        : 'system';
};

const stableStringify = (value: any): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const sha256 = (value: string) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

const getBundleObjectSize = (metadata: any): number => {
    const size = Number(metadata?.size);
    return Number.isFinite(size) ? size : NaN;
};

const logOversizedBundleObject = (filePath: string, sizeBytes: number, maxBytes = CONTEXT_BUNDLE_OBJECT_DOWNLOAD_MAX_BYTES) => {
    logRuntimeFailure(ANSWERLATTICE_CONTEXT_BUNDLE_OBJECT_OVERSIZED, undefined, {
        ...getBoundedRuntimeStringContext('bundlePath', filePath),
        sizeBytes,
        maxBytes,
    });
};

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
        const entityId = normalizeAnswerlatticeResolvedEntityId(value);
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

const getPublicBundleId = (existing: any, tId: number, sId: number): string => {
    if (typeof existing?.publicBundleId === 'string' && existing.publicBundleId.startsWith('pb_')) {
        return existing.publicBundleId;
    }
    const salt = process.env.ANSWERLATTICE_PUBLIC_BUNDLE_SALT
        || process.env.NEXTAUTH_SECRET
        || process.env.ANSWERLATTICE_MCP_SESSION_SECRET;
    if (!salt) return `pb_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    return `pb_${createHash('sha256').update(`${tId}:${sId}:${salt}`).digest('base64url').slice(0, 24)}`;
};

const compactEntity = (entity: AnswerlatticeEntity) => ({
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

const compactRelation = (relation: AnswerlatticeEntityRelation) => {
    const fromEntityId = normalizeAnswerlatticeResolvedEntityId(relation.fromEntityId);
    const toEntityId = normalizeAnswerlatticeResolvedEntityId(relation.toEntityId);
    if (!fromEntityId || !toEntityId) return null;
    return {
        id: relation.id,
        fromEntityId,
        toEntityId,
        relationType: relation.relationType,
    };
};

const compactAnswerLite = (answer: AnswerlatticeCanonicalAnswer) => ({
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
    citations: normalizeAnswerlatticePublicCitations(answer.evidence?.citations),
});

const compactAnswerPrivate = (answer: AnswerlatticeCanonicalAnswer) => ({
    ...compactAnswerLite(answer),
    content: {
        structuredSummary: answer.content?.structuredSummary || '',
        detailedExplanation: answer.content?.detailedExplanation || '',
        edgeCases: answer.content?.edgeCases || null,
        constraints: answer.content?.constraints || null,
        procedure: answer.content?.procedure || null,
    },
    productBinding: answer.productBinding || null,
    evidence: {
        sourceIds: answer.evidence?.sourceIds || [],
        citations: answer.evidence?.citations || [],
    },
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
    entityIds: normalizeContextBundleEntityIds(article.entityIds, 20),
    contextKeys: Array.isArray(article.contextKeys) ? article.contextKeys.slice(0, 20) : [],
    modifiedOn: toIso(article.modifiedOn),
});

const compactFaq = (faq: AnswerlatticeFaq) => ({
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
    entityIds: normalizeContextBundleEntityIds(surface.entityIds, 25),
    tags: Array.isArray(surface.tags) ? surface.tags.slice(0, 25) : [],
    articles: Array.isArray(surface.articles) ? surface.articles.slice(0, 8) : [],
    faqs: Array.isArray(surface.faqs) ? surface.faqs.slice(0, 6) : [],
    changelogs: Array.isArray(surface.changelogs) ? surface.changelogs.slice(0, 5) : [],
});

const loadDocs = async <T = any>(query: FirebaseFirestore.Query): Promise<T[]> => {
    const snap = await query.get();
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
};

const loadBoundedDocs = async <T = any>(
    query: FirebaseFirestore.Query,
    maxCount: number,
    sourceName: string,
): Promise<T[]> => {
    const docs = await loadDocs<T>(query.limit(maxCount + 1));
    if (docs.length > maxCount) {
        logRuntimeFailure(ANSWERLATTICE_CONTEXT_BUNDLE_SOURCE_LIMIT_EXCEEDED, undefined, {
            ...getBoundedRuntimeStringContext('sourceName', sourceName),
            maxCount,
        });
        throw new Error(ANSWERLATTICE_CONTEXT_BUNDLE_SOURCE_LIMIT_EXCEEDED);
    }
    return docs;
};

const getScopedPlatformSummaryData = (
    snap: FirebaseFirestore.DocumentSnapshot,
    tId: number,
    sId: number,
): Record<string, any> | null => {
    const data = snap.exists ? snap.data() : null;
    return data
        && data.pId === PRODUCT_IDS.ANSWERLATTICE
        && data.tId === tId
        && data.sId === sId
        ? data as Record<string, any>
        : null;
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
            .filter(isAnswerlatticeChangelogEntryPublished)
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
                return snap.exists
                    ? normalizeAnswerlatticeSurfaceContentSummary({ ...snap.data(), id: snap.id }, { tId, sId }, snap.id)
                    : null;
            }),
        loadBoundedDocs<AnswerlatticeEntity>(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
                .where('tId', '==', tId)
                .where('sId', '==', sId),
            MAX_ENTITIES_FOR_BUNDLE,
            'entities',
        ),
        loadBoundedDocs<AnswerlatticeEntityRelation>(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS)
                .where('tId', '==', tId)
                .where('sId', '==', sId),
            MAX_RELATIONS_FOR_BUNDLE,
            'entity_relations',
        ),
        loadBoundedDocs<AnswerlatticeCanonicalAnswer>(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'active'),
            MAX_CANONICAL_FOR_BUNDLE,
            'canonical_answers',
        ),
        loadBoundedDocs<AnswerlatticeProductSurface>(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES)
                .where('tId', '==', tId)
                .where('sId', '==', sId),
            MAX_SURFACES_FOR_BUNDLE,
            'product_surfaces',
        ),
        loadBoundedDocs<KnowledgeBaseArticleType>(
            db.collection(DB_COLLECTIONS.KB_ARTICLES)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'published'),
            MAX_ARTICLES_FOR_BUNDLE,
            'articles',
        ),
        loadBoundedDocs<AnswerlatticeFaq>(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'published')
                .where('active', '==', true),
            MAX_FAQS_FOR_BUNDLE,
            'faqs',
        ),
        loadBoundedDocs(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES)
                .where('tId', '==', tId)
                .where('sId', '==', sId),
            MAX_RELEASES_FOR_BUNDLE,
            'releases',
        ),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`predictiveTriggers_${tId}_${sId}`).get(),
        loadChangelogEntries(tId, sId),
    ]);

    const entities = entitiesRaw.filter(entity => ['active', 'beta'].includes(String(entity.status || '').toLowerCase()));
    const answers = answersRaw.filter(answer => !answer.governance?.reviewRequired);
    const surfaces = surfacesRaw.filter(surface => surface.active !== false);
    const releases = releasesRaw.filter((release: any) => String(release.status || '').toLowerCase() === 'active');
    const storeData = storeSnap.exists ? (storeSnap.data() || {}) : {};
    const store = storeSnap.exists && isAnswerlatticeStoreInScope(
        storeData,
        { tenantId: tId, storeId: sId },
        storeSnap.id,
    )
        ? { ...storeData, id: storeSnap.id }
        : {};

    return {
        store,
        contextSummary,
        entities,
        relations,
        answers,
        surfaces,
        articles: articlesRaw.filter(article => article.active !== false),
        faqs: faqsRaw,
        releases,
        predictive: getScopedPlatformSummaryData(predictiveSnap, tId, sId),
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
    const publicProduct = {
        name: product.name,
        url: product.url,
        supportEmail: product.supportEmail,
    };
    const entityIndex = source.entities.map(compactEntity);
    const relationIndex = source.relations
        .map(compactRelation)
        .filter((relation): relation is NonNullable<ReturnType<typeof compactRelation>> => Boolean(relation));
    const canonicalIndex = source.answers.map(compactAnswerPrivate);
    const canonicalLite = source.answers.map(compactAnswerLite);
    const articleIndex = source.articles.map(compactArticle);
    const faqIndex = source.faqs.map(compactFaq);
    const releaseContext = {
        schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
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
            const routeKey = buildAnswerlatticeRouteKey(routePattern || surface.key);
            const answerRefs = canonicalLite
                .filter(answer => (answer.entityIds || []).some((entityId: string) => (surface.entityIds || []).includes(entityId)))
                .slice(0, 20)
                .map(answer => answer.id);
            routeBundles[routeKey] = {
                schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
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
        schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
        pId: PRODUCT_IDS.ANSWERLATTICE,
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
        schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
        bundleVersion,
        generatedAt,
        product: publicProduct,
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
        schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
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
        schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
        bundleVersion,
        generatedAt,
        articles: articleIndex,
        faqs: faqIndex,
    };

    const entityBundles = Object.fromEntries(entityIndex.map(entity => {
        const entityAnswers = canonicalIndex.filter(answer => (answer.entityIds || []).includes(entity.id));
        return [sanitizeSegment(entity.id, 'entity'), {
            schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
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
            'widget-bootstrap.json': widgetBootstrap,
            'context-index.json': contextIndex,
            'docs-nav.json': docsNav,
            'canonical-lite.json': {
                schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
                bundleVersion,
                generatedAt,
                answers: canonicalLite,
            },
            ...Object.fromEntries(Object.entries(routeBundles).map(([routeKey, bundle]) => [`routes/${routeKey}.json`, bundle])),
        },
        private: {
            'mcp/product-summary.json': productSummary,
            'mcp/entity-index.json': {
                schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
                bundleVersion,
                generatedAt,
                entities: entityIndex,
                relations: relationIndex,
            },
            'mcp/surface-index.json': {
                schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
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
                schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
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

const uploadBundleObject = async (
    path: string,
    value: any,
    cacheControl: string,
    visibility: 'public' | 'private',
    filePath: string,
) => {
    const json = stableStringify(value);
    const bytes = Buffer.byteLength(json, 'utf8');
    const maxBytes = getAnswerlatticeContextBundleObjectMaxBytes(visibility, filePath);
    if (bytes > maxBytes) {
        logOversizedBundleObject(path, bytes, maxBytes);
        throw new Error(ANSWERLATTICE_CONTEXT_BUNDLE_OBJECT_OVERSIZED);
    }
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

const uploadBundleManifestObjectBestEffort = async (
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
        await uploadBundleObject(path, value, cacheControl, context.visibility, 'manifest.json');
    } catch (error) {
        logRuntimeFailure(ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED, error, {
            ...getBoundedRuntimeStringContext('tenantId', context.tId),
            ...getBoundedRuntimeStringContext('storeId', context.sId),
            bundleVersion: context.bundleVersion,
            visibility: context.visibility,
        });
    }
};

export const getAnswerlatticeContextBundleManifestServer = async (
    tId: number,
    sId: number,
    cacheTtlMs = MANIFEST_CACHE_TTL_MS,
): Promise<AnswerlatticeContextBundleManifest | null> => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const cacheKey = `${tenantId}_${storeId}`;
    const cached = bundleManifestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as AnswerlatticeContextBundleManifest | null;
    if (cached) bundleManifestCache.delete(cacheKey);

    const snap = await getDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId))
        .get();
    const rawManifest = snap.exists ? snap.data() : null;
    const manifest = rawManifest && isAnswerlatticeContextBundleManifestForScope(rawManifest, tenantId, storeId)
        ? ({ ...rawManifest, id: snap.id } as AnswerlatticeContextBundleManifest)
        : null;
    if (rawManifest && !manifest) {
        logRuntimeFailure('answerlattice_context_bundle_manifest_invalid', undefined, {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
        });
    }
    if (bundleManifestCache.size >= MAX_BUNDLE_CACHE_ENTRIES) {
        const oldestKey = bundleManifestCache.keys().next().value;
        if (oldestKey) bundleManifestCache.delete(oldestKey);
    }
    bundleManifestCache.set(cacheKey, { value: manifest, expiresAt: Date.now() + cacheTtlMs });
    return manifest;
};

export const loadAnswerlatticeBundleObjectServer = async <T = any>(
    filePath: string,
    cacheTtlMs = BUNDLE_CACHE_TTL_MS,
): Promise<T | null> => {
    const cached = bundleObjectCache.get(filePath);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached) bundleObjectCache.delete(filePath);

    const file = getBucket().file(filePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [metadata] = await file.getMetadata().catch(() => [null as any]);
    const metadataSize = getBundleObjectSize(metadata);
    if (Number.isFinite(metadataSize) && metadataSize > CONTEXT_BUNDLE_OBJECT_DOWNLOAD_MAX_BYTES) {
        logOversizedBundleObject(filePath, metadataSize);
        return null;
    }

    const [buffer] = await file.download();
    if (buffer.byteLength > CONTEXT_BUNDLE_OBJECT_DOWNLOAD_MAX_BYTES) {
        logOversizedBundleObject(filePath, buffer.byteLength);
        return null;
    }

    const value = JSON.parse(buffer.toString('utf8')) as T;
    if (bundleObjectCache.size >= MAX_BUNDLE_CACHE_ENTRIES) {
        const oldestKey = bundleObjectCache.keys().next().value;
        if (oldestKey) bundleObjectCache.delete(oldestKey);
    }
    bundleObjectCache.set(filePath, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
};

export const buildAnswerlatticeContextBundleServer = async (params: {
    tId: number;
    sId: number;
    reason?: BuildReason;
    requestedBy?: string;
    force?: boolean;
}): Promise<AnswerlatticeContextBundleManifest> => {
    const { tenantId, storeId } = assertScope(params.tId, params.sId);
    const db = getDb();
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId));
    const lockRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleLockDocId(tenantId, storeId));
    const startedAt = Timestamp.now();
    const lockId = `bundle_${tenantId}_${storeId}_${randomUUID()}`;

    const existingManifestSnap = await manifestRef.get();
    const existingManifest = existingManifestSnap.exists ? existingManifestSnap.data() : null;
    if (existingManifest && !isAnswerlatticeContextBundleManifestForScope(existingManifest, tenantId, storeId)) {
        throw new Error('Invalid Answerlattice context bundle manifest.');
    }
    const existingBundleVersion = resolveAnswerlatticeExistingBundleVersion(existingManifest);
    if (existingBundleVersion === null) throw new Error('Invalid Answerlattice context bundle manifest version.');
    const sourceVersionsAtStart = await getAnswerlatticeCompiledSourceVersionsAdmin(tenantId, storeId);
    const normalizedStartVersions = normalizeCompiledSourceVersions(sourceVersionsAtStart);
    const buildReason = normalizeAnswerlatticeContextBundleBuildReason(params.reason);
    const buildRequester = normalizeAnswerlatticeContextBundleRequester(params.requestedBy);

    if (
        !params.force
        && existingManifest?.status === 'ready'
        && hasExactAnswerlatticeReadyBundleVersions(existingManifest)
        && compiledSourceVersionsEqual(existingManifest.sourceVersions, normalizedStartVersions)
    ) {
        return { ...existingManifest, id: manifestRef.id } as AnswerlatticeContextBundleManifest;
    }

    const claim = await db.runTransaction(async (transaction) => {
        const [currentManifestSnap, currentLockSnap] = await Promise.all([
            transaction.get(manifestRef),
            transaction.get(lockRef),
        ]);
        const currentManifest = currentManifestSnap.exists ? currentManifestSnap.data() : null;
        const currentLock = currentLockSnap.exists ? currentLockSnap.data() : null;
        const decision = getAnswerlatticeBundleBuildClaimDecision(currentManifest, currentLock, startedAt.toMillis());
        if (decision.status === 'active') {
            throw new Error('Answerlattice context bundle build is already in progress.');
        }
        if (decision.status === 'invalid') throw new Error('Invalid Answerlattice context bundle manifest version.');
        const bundleVersion = decision.bundleVersion;

        transaction.set(lockRef, {
            schemaVersion: 1,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantId,
            sId: storeId,
            lockId,
            bundleVersion,
            status: 'building',
            startedAt,
            expiresAt: Timestamp.fromMillis(startedAt.toMillis() + 10 * 60 * 1000),
            sourceVersionsAtStart: normalizedStartVersions,
            requestedBy: buildRequester,
            reason: buildReason,
        }, { merge: true });
        transaction.set(manifestRef, {
            schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantId,
            sId: storeId,
            status: 'building',
            lastBuildStartedAt: FieldValue.serverTimestamp(),
            lastBuildError: null,
            staleReason: null,
        }, { merge: true });
        return { bundleVersion, existingManifest: currentManifest };
    });

    const claimedManifest = claim.existingManifest;
    const claimedActiveVersion = normalizeAnswerlatticeStoredBundleVersion(claimedManifest?.activeVersion) ?? 0;
    const claimedLastReadyVersion = normalizeAnswerlatticeStoredBundleVersion(claimedManifest?.lastReadyVersion) ?? 0;
    const publicBundleId = getPublicBundleId(claimedManifest, tenantId, storeId);

    try {
        const bundleVersion = claim.bundleVersion;
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

        const bundles: AnswerlatticeContextBundleManifest['bundles'] = {};
        let publicBytesTotal = 0;
        let privateBytesTotal = 0;

        for (const [filePath, objectValue] of Object.entries(objects.public)) {
            const ref = await uploadBundleObject(
                getPublicBundlePath(publicBundleId, bundleVersion, filePath),
                objectValue,
                PUBLIC_BUNDLE_CACHE_CONTROL,
                'public',
                filePath,
            );
            bundles[`public:${filePath}`] = ref;
            publicBytesTotal += ref.bytes;
        }

        for (const [filePath, objectValue] of Object.entries(objects.private)) {
            const ref = await uploadBundleObject(
                getPrivateBundlePath(tenantId, storeId, bundleVersion, filePath),
                objectValue,
                PRIVATE_BUNDLE_CACHE_CONTROL,
                'private',
                filePath,
            );
            bundles[`private:${filePath}`] = ref;
            privateBytesTotal += ref.bytes;
        }

        const sourceVersionsAtEnd = normalizeCompiledSourceVersions(await getAnswerlatticeCompiledSourceVersionsAdmin(tenantId, storeId));
        const superseded = !compiledSourceVersionsEqual(normalizedStartVersions, sourceVersionsAtEnd);
        const stats: AnswerlatticeContextBundleStats = {
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
        const manifest: AnswerlatticeContextBundleManifest = {
            schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantId,
            sId: storeId,
            publicBundleId,
            bundleVersion,
            activeVersion: superseded ? claimedActiveVersion : bundleVersion,
            lastReadyVersion: superseded ? claimedLastReadyVersion : bundleVersion,
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
            limits: ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
        };

        const publicManifest = {
            schemaVersion: manifest.schemaVersion,
            pId: manifest.pId,
            publicBundleId: manifest.publicBundleId,
            bundleVersion: manifest.bundleVersion,
            status: manifest.status,
            generatedAt,
            hash: manifest.hash,
        };
        const privateManifest = {
            ...manifest,
            generatedAt,
            lastBuildStartedAt: toIso(manifest.lastBuildStartedAt),
            lastBuildCompletedAt: toIso(manifest.lastBuildCompletedAt),
        };

        await uploadBundleManifestObjectBestEffort(
            getPublicBundlePath(publicBundleId, bundleVersion, 'manifest.json'),
            publicManifest,
            PUBLIC_BUNDLE_CACHE_CONTROL,
            { tId: tenantId, sId: storeId, bundleVersion, visibility: 'public' },
        );
        await uploadBundleManifestObjectBestEffort(
            getPrivateBundlePath(tenantId, storeId, bundleVersion, 'manifest.json'),
            privateManifest,
            PRIVATE_BUNDLE_CACHE_CONTROL,
            { tId: tenantId, sId: storeId, bundleVersion, visibility: 'private' },
        );

        await db.runTransaction(async (transaction) => {
            const currentLockSnap = await transaction.get(lockRef);
            if (!currentLockSnap.exists || currentLockSnap.data()?.lockId !== lockId) {
                throw new Error('Answerlattice context bundle build lease was lost.');
            }
            transaction.set(manifestRef, {
                ...manifest,
                updatedAt: FieldValue.serverTimestamp(),
                reason: buildReason,
                requestedBy: buildRequester,
            }, { merge: true });
            transaction.set(lockRef, {
                status: 'released',
                completedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        });
        bundleManifestCache.set(`${tenantId}_${storeId}`, {
            value: { ...manifest, id: manifestRef.id },
            expiresAt: Date.now() + MANIFEST_CACHE_TTL_MS,
        });

        return { ...manifest, id: manifestRef.id };
    } catch (error) {
        logRuntimeFailure('answerlattice_context_bundle_build_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
            bundleVersion: claim.bundleVersion,
        });
        await Promise.allSettled([
            getBucket().deleteFiles({
                prefix: getPublicBundlePath(publicBundleId, claim.bundleVersion, ''),
                force: true,
            }),
            getBucket().deleteFiles({
                prefix: getPrivateBundlePath(tenantId, storeId, claim.bundleVersion, ''),
                force: true,
            }),
        ]).then((results) => {
            if (results.some(result => result.status === 'rejected')) {
                logRuntimeFailure('answerlattice_context_bundle_failed_version_cleanup_failed', undefined, {
                    ...getBoundedRuntimeStringContext('tenantId', tenantId),
                    ...getBoundedRuntimeStringContext('storeId', storeId),
                    bundleVersion: claim.bundleVersion,
                });
            }
        });
        await db.runTransaction(async (transaction) => {
            const currentLockSnap = await transaction.get(lockRef);
            if (!currentLockSnap.exists || currentLockSnap.data()?.lockId !== lockId) return;
            transaction.set(manifestRef, {
                schemaVersion: ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: tenantId,
                sId: storeId,
                status: claimedLastReadyVersion ? 'stale' : 'failed',
                lastBuildError: 'build_failed',
                lastBuildCompletedAt: FieldValue.serverTimestamp(),
                staleReason: 'build_failed',
                activeVersion: claimedActiveVersion,
                lastReadyVersion: claimedLastReadyVersion,
            }, { merge: true });
            transaction.set(lockRef, {
                status: 'failed',
                completedAt: FieldValue.serverTimestamp(),
                error: 'build_failed',
            }, { merge: true });
        });
        throw error;
    }
};
