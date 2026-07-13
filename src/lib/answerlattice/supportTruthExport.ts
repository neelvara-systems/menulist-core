import { DB_COLLECTIONS } from '@constant/database';

export const ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_SCHEMA_VERSION = 1;
export const ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_MAX_BYTES = 8 * 1024 * 1024;

export const ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS = {
    entities: 500,
    canonicalAnswers: 1000,
    productSurfaces: 500,
    articles: 1000,
    faqs: 1000,
    changelogPages: 10,
    changelogEntries: 1000,
    releases: 500,
} as const;

type AnswerlatticeSupportTruthExportScope = {
    tId: number;
    sId: number;
};

type AnswerlatticeSupportTruthExportParams = AnswerlatticeSupportTruthExportScope & {
    db: FirebaseFirestore.Firestore;
    productName: string;
};

export class AnswerlatticeSupportTruthExportTooLargeError extends Error {
    readonly section: keyof typeof ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS | 'response';

    constructor(section: keyof typeof ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS | 'response') {
        super('answerlattice_support_truth_export_too_large');
        this.name = 'AnswerlatticeSupportTruthExportTooLargeError';
        this.section = section;
    }
}

const toIsoString = (value: unknown): string | null => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof (value as { toDate?: unknown })?.toDate === 'function') {
        const date = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    return null;
};

const compactStrings = (value: unknown, maxItems: number, maxLength = 200): string[] => {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim().slice(0, maxLength))
            .filter(Boolean),
    )).slice(0, maxItems);
};

const compactString = (value: unknown, maxLength: number): string => (
    typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const compactNullableString = (value: unknown, maxLength: number): string | null => {
    const normalized = compactString(value, maxLength);
    return normalized || null;
};

const compactNumber = (value: unknown, fallback = 0): number => {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
};

const compactBoolean = (value: unknown, fallback = false): boolean => (
    typeof value === 'boolean' ? value : fallback
);

const sanitizePortableContent = (value: unknown, depth = 0): unknown => {
    if (depth > 20 || value === null || value === undefined) return null;
    if (typeof value === 'string') return value.slice(0, 200_000);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) {
        return value.slice(0, 5000).map(item => sanitizePortableContent(item, depth + 1));
    }
    if (typeof value !== 'object') return null;

    const timestamp = toIsoString(value);
    if (timestamp) return timestamp;

    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).slice(0, 1000).forEach(([key, nested]) => {
        if (
            key === 'embedding'
            || key === 'sources'
            || key === 'createdBy'
            || key === 'modifiedBy'
            || key === 'validatedBy'
            || key === 'traceId'
            || key === 'requestId'
            || key === 'tId'
            || key === 'sId'
            || key === 'uId'
            || key === 'pId'
            || key === 'sourceContext'
        ) return;
        result[key.slice(0, 120)] = sanitizePortableContent(nested, depth + 1);
    });
    return result;
};

const documentData = (document: FirebaseFirestore.QueryDocumentSnapshot): Record<string, any> => ({
    ...document.data(),
    id: document.id,
});

const ensureWithinLimit = <T>(
    values: T[],
    section: keyof typeof ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS,
    limit: number,
): T[] => {
    if (values.length > limit) {
        throw new AnswerlatticeSupportTruthExportTooLargeError(section);
    }
    return values;
};

const projectEntity = (entity: Record<string, any>) => ({
    id: compactString(entity.id, 160),
    type: compactString(entity.type, 40),
    name: compactString(entity.name, 200),
    slug: compactString(entity.slug, 200),
    description: compactString(entity.description, 5000),
    status: compactString(entity.status, 40),
    aliases: compactStrings(entity.aliases, 20, 200),
    currentVersion: compactNumber(entity.currentVersion),
});

const projectCanonicalAnswer = (answer: Record<string, any>) => ({
    id: compactString(answer.id, 160),
    title: compactString(answer.title, 300),
    slug: compactString(answer.slug, 200),
    status: compactString(answer.status, 40),
    answerType: compactNullableString(answer.answerType, 40),
    scope: {
        entityIds: compactStrings(answer.scope?.entityIds, 100, 160),
        planIds: compactStrings(answer.scope?.planIds, 50, 160),
        roleIds: compactStrings(answer.scope?.roleIds, 50, 160),
        stateIds: compactStrings(answer.scope?.stateIds, 50, 160),
    },
    productBinding: {
        introducedInVersion: compactNumber(answer.productBinding?.introducedInVersion),
        lastValidatedInVersion: compactNumber(answer.productBinding?.lastValidatedInVersion),
        applicableVersions: {
            from: compactNumber(answer.productBinding?.applicableVersions?.from),
            to: answer.productBinding?.applicableVersions?.to === null
                ? null
                : compactNumber(answer.productBinding?.applicableVersions?.to),
        },
    },
    content: sanitizePortableContent(answer.content),
    validation: {
        confidenceScore: compactNumber(answer.validation?.confidenceScore),
        validationSource: compactString(answer.validation?.validationSource, 80),
        lastValidatedOn: toIsoString(answer.validation?.lastValidatedOn),
    },
});

const projectProductSurface = (surface: Record<string, any>) => ({
    id: compactString(surface.id, 160),
    key: compactString(surface.key, 160),
    label: compactString(surface.label, 240),
    description: compactNullableString(surface.description, 5000),
    routePatterns: compactStrings(surface.routePatterns, 100, 300),
    feature: compactNullableString(surface.feature, 160),
    page: compactNullableString(surface.page, 160),
    workflow: compactNullableString(surface.workflow, 160),
    entityHints: compactStrings(surface.entityHints, 50, 200),
    entityIds: compactStrings(surface.entityIds, 100, 160),
    tags: compactStrings(surface.tags, 100, 160),
    visibility: {
        helpWidget: compactBoolean(surface.visibility?.helpWidget),
        helpCenter: compactBoolean(surface.visibility?.helpCenter),
        changelog: compactBoolean(surface.visibility?.changelog),
    },
    priority: compactNumber(surface.priority),
});

const projectArticle = (article: Record<string, any>) => ({
    id: compactString(article.id, 160),
    categoryId: compactString(article.categoryId, 160),
    sectionId: compactString(article.sectionId, 160),
    categoryTitle: compactString(article.categoryTitle, 240),
    sectionTitle: compactNullableString(article.sectionTitle, 240),
    title: compactString(article.title, 300),
    index: compactNumber(article.index),
    url: compactString(article.url, 500),
    content: sanitizePortableContent(article.content),
    tags: compactStrings(article.tags, 100, 160),
    status: compactString(article.status, 40),
    lastReviewedOn: toIsoString(article.lastReviewedOn),
    entityIds: compactStrings(article.entityIds, 100, 160),
    contextKeys: compactStrings(article.contextKeys, 100, 160),
    faqIds: compactStrings(article.faqIds, 100, 160),
    translations: sanitizePortableContent(article.translations),
});

const projectFaq = (faq: Record<string, any>) => ({
    id: compactString(faq.id, 160),
    question: compactString(faq.question, 2000),
    answer: compactString(faq.answer, 20_000),
    status: compactString(faq.status, 40),
    source: compactString(faq.source, 80),
    articleId: compactNullableString(faq.articleId, 160),
    articleTitle: compactNullableString(faq.articleTitle, 300),
    canonicalAnswerId: compactNullableString(faq.canonicalAnswerId, 160),
    entityIds: compactStrings(faq.entityIds, 100, 160),
    contextKeys: compactStrings(faq.contextKeys, 100, 160),
    tags: compactStrings(faq.tags, 100, 160),
    sortOrder: compactNumber(faq.sortOrder),
    publishedOn: toIsoString(faq.publishedOn),
    lastReviewedOn: toIsoString(faq.lastReviewedOn),
});

const projectRelease = (release: Record<string, any>) => ({
    id: compactString(release.id, 160),
    versionLabel: compactString(release.versionLabel, 120),
    versionNormalized: compactNumber(release.versionNormalized),
    releasedAt: toIsoString(release.releasedAt),
    entityChanges: compactStrings(release.entityChanges, 500, 160),
    status: compactString(release.status, 40),
});

const projectChangelogEntry = (entry: Record<string, any>, pageId: string) => ({
    id: compactString(entry.id, 160),
    pageId: compactString(pageId, 160),
    title: compactString(entry.title, 300),
    description: sanitizePortableContent(entry.description),
    tags: compactStrings(entry.tags, 100, 160),
    releasedOn: toIsoString(entry.releasedOn),
    version: compactNullableString(entry.version, 120),
    kbSources: Array.isArray(entry.kbSources)
        ? entry.kbSources.slice(0, 200).map((source: Record<string, unknown>) => ({
            categoryId: compactString(source?.categoryId, 160),
            sectionId: compactNullableString(source?.sectionId, 160),
            articleId: compactNullableString(source?.articleId, 160),
        }))
        : [],
    contextKeys: compactStrings(entry.contextKeys, 100, 160),
    youtubeLinks: compactStrings(entry.youtubeLinks, 20, 500),
});

const sortByString = <T>(values: T[], selector: (value: T) => string): T[] => (
    [...values].sort((left, right) => selector(left).localeCompare(selector(right)))
);

const queryScoped = (
    db: FirebaseFirestore.Firestore,
    collectionName: string,
    scope: AnswerlatticeSupportTruthExportScope,
) => db.collection(collectionName)
    .where('tId', '==', scope.tId)
    .where('sId', '==', scope.sId);

export async function buildAnswerlatticeSupportTruthExport(
    params: AnswerlatticeSupportTruthExportParams,
) {
    const { db, productName, tId, sId } = params;
    const limits = ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_LIMITS;

    const [
        entitySnapshot,
        answerSnapshot,
        surfaceSnapshot,
        articleSnapshot,
        faqSnapshot,
        releaseSnapshot,
        changelogPageSnapshot,
    ] = await Promise.all([
        queryScoped(db, DB_COLLECTIONS.ANSWERLATTICE_ENTITIES, { tId, sId })
            .select('type', 'name', 'slug', 'description', 'status', 'aliases', 'currentVersion')
            .limit(limits.entities + 1)
            .get(),
        queryScoped(db, DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS, { tId, sId })
            .where('status', '==', 'active')
            .select('title', 'slug', 'status', 'answerType', 'scope', 'productBinding', 'content', 'validation', 'governance.reviewRequired')
            .limit(limits.canonicalAnswers + 1)
            .get(),
        queryScoped(db, DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES, { tId, sId })
            .where('active', '==', true)
            .select('key', 'label', 'description', 'routePatterns', 'feature', 'page', 'workflow', 'entityHints', 'entityIds', 'tags', 'visibility', 'priority')
            .limit(limits.productSurfaces + 1)
            .get(),
        queryScoped(db, DB_COLLECTIONS.KB_ARTICLES, { tId, sId })
            .where('status', '==', 'published')
            .select('active', 'categoryId', 'sectionId', 'categoryTitle', 'sectionTitle', 'title', 'index', 'url', 'content', 'tags', 'status', 'lastReviewedOn', 'entityIds', 'contextKeys', 'faqIds', 'translations')
            .limit(limits.articles + 1)
            .get(),
        queryScoped(db, DB_COLLECTIONS.ANSWERLATTICE_FAQS, { tId, sId })
            .where('status', '==', 'published')
            .where('active', '==', true)
            .select('question', 'answer', 'status', 'source', 'articleId', 'articleTitle', 'canonicalAnswerId', 'entityIds', 'contextKeys', 'tags', 'sortOrder', 'publishedOn', 'lastReviewedOn')
            .limit(limits.faqs + 1)
            .get(),
        queryScoped(db, DB_COLLECTIONS.ANSWERLATTICE_RELEASES, { tId, sId })
            .where('status', '==', 'active')
            .select('versionLabel', 'versionNormalized', 'releasedAt', 'entityChanges', 'status')
            .limit(limits.releases + 1)
            .get(),
        db.collection(`${DB_COLLECTIONS.CHANGELOG}/${tId}/${sId}`)
            .orderBy('pageNumber', 'desc')
            .select('pageNumber', 'entries')
            .limit(limits.changelogPages + 1)
            .get(),
    ]);

    const entities = ensureWithinLimit(
        entitySnapshot.docs.map(documentData),
        'entities',
        limits.entities,
    ).filter(entity => ['active', 'beta'].includes(String(entity.status || '').toLowerCase()));
    const canonicalAnswers = ensureWithinLimit(
        answerSnapshot.docs.map(documentData),
        'canonicalAnswers',
        limits.canonicalAnswers,
    ).filter(answer => answer.governance?.reviewRequired !== true);
    const productSurfaces = ensureWithinLimit(
        surfaceSnapshot.docs.map(documentData),
        'productSurfaces',
        limits.productSurfaces,
    );
    const articles = ensureWithinLimit(
        articleSnapshot.docs.map(documentData),
        'articles',
        limits.articles,
    ).filter(article => article.active !== false);
    const faqs = ensureWithinLimit(
        faqSnapshot.docs.map(documentData),
        'faqs',
        limits.faqs,
    );
    const releases = ensureWithinLimit(
        releaseSnapshot.docs.map(documentData),
        'releases',
        limits.releases,
    );
    const changelogPages = ensureWithinLimit(
        changelogPageSnapshot.docs.map(documentData),
        'changelogPages',
        limits.changelogPages,
    );
    const changelogEntries = ensureWithinLimit(
        changelogPages.flatMap(page => (Array.isArray(page.entries) ? page.entries : [])
            .filter((entry: Record<string, unknown>) => entry?.published !== false)
            .map((entry: Record<string, unknown>) => projectChangelogEntry(entry, page.id))),
        'changelogEntries',
        limits.changelogEntries,
    );

    const payload = {
        schemaVersion: ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        product: {
            name: compactString(productName, 120) || 'Answerlattice workspace',
        },
        counts: {
            entities: entities.length,
            canonicalAnswers: canonicalAnswers.length,
            productSurfaces: productSurfaces.length,
            articles: articles.length,
            faqs: faqs.length,
            changelogEntries: changelogEntries.length,
            releases: releases.length,
        },
        complete: true,
        entities: sortByString(entities.map(projectEntity), value => `${value.type}:${value.slug}:${value.id}`),
        canonicalAnswers: sortByString(canonicalAnswers.map(projectCanonicalAnswer), value => `${value.slug}:${value.id}`),
        productSurfaces: sortByString(productSurfaces.map(projectProductSurface), value => `${String(value.priority).padStart(8, '0')}:${value.key}:${value.id}`),
        articles: sortByString(articles.map(projectArticle), value => `${value.categoryTitle}:${value.sectionTitle || ''}:${String(value.index).padStart(8, '0')}:${value.id}`),
        faqs: sortByString(faqs.map(projectFaq), value => `${String(value.sortOrder).padStart(8, '0')}:${value.question}:${value.id}`),
        changelogEntries: [...changelogEntries].sort((left, right) => (
            String(right.releasedOn || '').localeCompare(String(left.releasedOn || ''))
            || left.id.localeCompare(right.id)
        )),
        releases: [...releases.map(projectRelease)].sort((left, right) => (
            right.versionNormalized - left.versionNormalized || left.id.localeCompare(right.id)
        )),
    };

    const json = JSON.stringify(payload, null, 2);
    if (Buffer.byteLength(json, 'utf8') > ANSWERLATTICE_SUPPORT_TRUTH_EXPORT_MAX_BYTES) {
        throw new AnswerlatticeSupportTruthExportTooLargeError('response');
    }

    return { json, payload };
}
