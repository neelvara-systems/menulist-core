import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdminCompat';
import type {
    AnswerlatticeProductSurface,
    AnswerlatticeFaq,
    AnswerlatticeRelatedArticleRef,
    AnswerlatticeRelatedChangelogRef,
    AnswerlatticeRelatedFaqRef,
    AnswerlatticeSurfaceContentItem,
    AnswerlatticeSurfaceContentSummary,
    AnswerlatticeContextPayload,
    AnswerlatticeSurfaceTicketStats,
} from '@type/answerlattice';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { isAnswerlatticeChangelogEntryPublished } from '@lib/answerlattice/changelogContracts';
import type { ChangelogEntry, ChangelogPage } from '@type/changelog';
import type { SupportTicketType } from '@type/supportTicket';
import { getAnswerlatticeSupportTicketDisplayId } from '@lib/answerlattice/supportTicketLifecycle';
import {
    ANSWERLATTICE_PRODUCT_SURFACE_LIMIT,
    buildPublicRelatedContent,
    getAnswerlatticeProductSurfaceTimestampMillis,
    getContextContentSummaryDocId,
    mergeSurfaceContext,
    normalizeAnswerlatticeSurfaceContentSummary,
    normalizeStoredAnswerlatticeProductSurface,
    requireAnswerlatticeProductSurfaceScope,
    resolveSurfaceContentForContext,
    scoreContentForSurface,
} from './productSurfaceContent';

const SUMMARY_CACHE_TTL_MS = 60_000;
const MAX_SUMMARY_CACHE_ENTRIES = 300;
const MAX_ARTICLES_FOR_SUMMARY = 500;
const MAX_FAQS_FOR_SUMMARY = 500;
const MAX_CHANGELOG_PAGES_FOR_SUMMARY = 3;
const MAX_TICKETS_FOR_SUMMARY = 300;

const assertSummarySourceWithinLimit = (
    snapshot: FirebaseFirestore.QuerySnapshot,
    limit: number,
    sourceLabel: string,
) => {
    if (snapshot.size > limit) {
        throw new Error(`Answerlattice product surface summary ${sourceLabel} limit exceeded.`);
    }
};

type SummaryCacheEntry = {
    summary: AnswerlatticeSurfaceContentSummary | null;
    expiresAt: number;
};

const summaryCache = new Map<string, SummaryCacheEntry>();

const getAnswerlatticeDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
};

const rememberSummary = (cacheKey: string, summary: AnswerlatticeSurfaceContentSummary | null) => {
    if (summaryCache.size >= MAX_SUMMARY_CACHE_ENTRIES) {
        const oldestKey = summaryCache.keys().next().value;
        if (oldestKey) summaryCache.delete(oldestKey);
    }
    summaryCache.set(cacheKey, { summary, expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS });
};

const getTimestampMillis = (value: unknown): number => (
    getAnswerlatticeProductSurfaceTimestampMillis(value) ?? 0
);

const compactArticle = (article: KnowledgeBaseArticleType): AnswerlatticeRelatedArticleRef => ({
    id: article.id,
    title: article.title,
    ...(article.categoryTitle ? { categoryTitle: article.categoryTitle } : {}),
    ...(article.sectionTitle ? { sectionTitle: article.sectionTitle } : {}),
    ...(article.url ? { url: article.url } : {}),
    tags: Array.isArray(article.tags) ? article.tags.slice(0, 8) : [],
});

const compactChangelog = (entry: ChangelogEntry, pageId: string): AnswerlatticeRelatedChangelogRef => ({
    id: entry.id,
    pageId,
    title: entry.title,
    version: entry.version || null,
    releasedOn: getTimestampMillis(entry.releasedOn) || null,
    tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 8) : [],
});

const compactFaq = (faq: AnswerlatticeFaq): AnswerlatticeRelatedFaqRef => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    articleId: faq.articleId || null,
    articleTitle: faq.articleTitle || null,
    tags: Array.isArray(faq.tags) ? faq.tags.slice(0, 8) : [],
});

const buildTicketStats = (tickets: SupportTicketType[]): AnswerlatticeSurfaceTicketStats => ({
    total: tickets.length,
    open: tickets.filter(ticket => !['Resolved', 'Closed'].includes(String(ticket.status || ''))).length,
    recentDisplayIds: tickets.slice(0, 5).map(ticket => ticket.displayId || getAnswerlatticeSupportTicketDisplayId(ticket.id)),
});

async function loadActiveSurfaces(tId: number, sId: number): Promise<AnswerlatticeProductSurface[]> {
    const snapshot = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('active', '==', true)
        .orderBy('priority', 'desc')
        .limit(ANSWERLATTICE_PRODUCT_SURFACE_LIMIT + 1)
        .get();

    assertSummarySourceWithinLimit(snapshot, ANSWERLATTICE_PRODUCT_SURFACE_LIMIT, 'active surface');

    return snapshot.docs
        .map(doc => normalizeStoredAnswerlatticeProductSurface({ ...doc.data(), id: doc.id }, { tId, sId }, doc.id))
        .filter((surface): surface is AnswerlatticeProductSurface => Boolean(surface))
        .filter(surface => surface.active !== false);
}

async function loadPublishedArticles(tId: number, sId: number): Promise<KnowledgeBaseArticleType[]> {
    const snapshot = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.KB_ARTICLES)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'published')
        .limit(MAX_ARTICLES_FOR_SUMMARY + 1)
        .get();

    assertSummarySourceWithinLimit(snapshot, MAX_ARTICLES_FOR_SUMMARY, 'published article');

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as KnowledgeBaseArticleType));
}

async function loadPublishedFaqs(tId: number, sId: number): Promise<AnswerlatticeFaq[]> {
    const snapshot = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'published')
        .where('active', '==', true)
        .orderBy('sortOrder', 'asc')
        .orderBy('modifiedOn', 'desc')
        .limit(MAX_FAQS_FOR_SUMMARY + 1)
        .get();

    assertSummarySourceWithinLimit(snapshot, MAX_FAQS_FOR_SUMMARY, 'published FAQ');

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AnswerlatticeFaq));
}

async function loadRecentChangelogEntries(tId: number, sId: number): Promise<Array<ChangelogEntry & { pageId: string }>> {
    const snapshot = await getAnswerlatticeDb()
        .collection(`${DB_COLLECTIONS.CHANGELOG}/${tId}/${sId}`)
        .orderBy('pageNumber', 'desc')
        .limit(MAX_CHANGELOG_PAGES_FOR_SUMMARY)
        .get();

    const entries: Array<ChangelogEntry & { pageId: string }> = [];
    snapshot.docs.forEach(doc => {
        const page = { ...doc.data(), id: doc.id } as ChangelogPage;
        (page.entries || [])
            .filter(isAnswerlatticeChangelogEntryPublished)
            .forEach(entry => entries.push({ ...entry, pageId: doc.id }));
    });

    return entries.sort((a, b) => getTimestampMillis(b.releasedOn) - getTimestampMillis(a.releasedOn));
}

async function loadRecentTickets(tId: number, sId: number): Promise<SupportTicketType[]> {
    const snapshot = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.SUPPORT_TICKETS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('deleted', '==', false)
        .orderBy('createdOn', 'desc')
        .limit(MAX_TICKETS_FOR_SUMMARY)
        .get();

    return snapshot.docs
        .map(doc => ({
            ...doc.data(),
            id: doc.id,
            displayId: getAnswerlatticeSupportTicketDisplayId(doc.id),
        } as SupportTicketType))
        .sort((a, b) => getTimestampMillis(b.createdOn) - getTimestampMillis(a.createdOn));
}

export async function rebuildProductSurfaceContentSummaryServer(params: {
    tId: number;
    sId: number;
    reason?: string;
}): Promise<AnswerlatticeSurfaceContentSummary> {
    const { tId, sId } = requireAnswerlatticeProductSurfaceScope(params);

    const [surfaces, articles, faqs, changelogEntries, tickets] = await Promise.all([
        loadActiveSurfaces(tId, sId),
        loadPublishedArticles(tId, sId),
        loadPublishedFaqs(tId, sId),
        loadRecentChangelogEntries(tId, sId),
        loadRecentTickets(tId, sId),
    ]);

    const surfaceItems: Record<string, AnswerlatticeSurfaceContentItem> = {};
    const activeSurfaceKeys = new Set<string>();

    for (const surface of surfaces) {
        if (activeSurfaceKeys.has(surface.key)) {
            throw new Error(`Duplicate active Answerlattice product surface key: ${surface.key}`);
        }
        activeSurfaceKeys.add(surface.key);

        const matchedArticles = articles
            .map(article => ({ article, score: scoreContentForSurface(article as any, surface) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score || getTimestampMillis(b.article.modifiedOn) - getTimestampMillis(a.article.modifiedOn))
            .slice(0, 8)
            .map(item => compactArticle(item.article));

        const matchedArticleIds = new Set(matchedArticles.map(article => article.id));
        const matchedFaqs = faqs
            .map(faq => ({
                faq,
                score: scoreContentForSurface(faq as any, surface) + (faq.articleId && matchedArticleIds.has(faq.articleId) ? 30 : 0),
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score || getTimestampMillis(b.faq.modifiedOn) - getTimestampMillis(a.faq.modifiedOn))
            .slice(0, 6)
            .map(item => compactFaq(item.faq));

        const matchedChangelogs = changelogEntries
            .map(entry => {
                const sourceArticleMatch = (entry.kbSources || []).some(source => source.articleId && matchedArticleIds.has(source.articleId));
                return {
                    entry,
                    score: scoreContentForSurface(entry as any, surface) + (sourceArticleMatch ? 35 : 0),
                };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score || getTimestampMillis(b.entry.releasedOn) - getTimestampMillis(a.entry.releasedOn))
            .slice(0, 5)
            .map(item => compactChangelog(item.entry, item.entry.pageId));

        const matchedTickets = tickets
            .map(ticket => ({ ticket, score: scoreContentForSurface(ticket as any, surface) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score || getTimestampMillis(b.ticket.createdOn) - getTimestampMillis(a.ticket.createdOn))
            .slice(0, 25)
            .map(item => item.ticket);

        surfaceItems[surface.key] = {
            key: surface.key,
            label: surface.label,
            routePatterns: surface.routePatterns || [],
            ...(surface.feature ? { feature: surface.feature } : {}),
            ...(surface.page ? { page: surface.page } : {}),
            ...(surface.workflow ? { workflow: surface.workflow } : {}),
            entityHints: surface.entityHints || [],
            entityIds: surface.entityIds || [],
            tags: surface.tags || [],
            visibility: surface.visibility,
            articles: matchedArticles,
            faqs: matchedFaqs,
            changelogs: matchedChangelogs,
            tickets: buildTicketStats(matchedTickets),
        };
    }

    const summary: AnswerlatticeSurfaceContentSummary = {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId,
        sId,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        surfaceCount: surfaces.length,
        articleCount: articles.length,
        faqCount: faqs.length,
        changelogCount: changelogEntries.length,
        ticketCount: tickets.length,
        surfaces: surfaceItems,
    };

    const docId = getContextContentSummaryDocId(tId, sId);
    await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(docId)
        .set(summary);

    const persistedSummary = normalizeAnswerlatticeSurfaceContentSummary({ ...summary, id: docId }, { tId, sId }, docId);
    if (!persistedSummary) throw new Error('Generated Answerlattice product surface summary failed validation.');
    rememberSummary(`${tId}:${sId}`, persistedSummary);
    return persistedSummary;
}

export async function getProductSurfaceContentSummaryServer(tId: number, sId: number): Promise<AnswerlatticeSurfaceContentSummary | null> {
    const scope = requireAnswerlatticeProductSurfaceScope({ tId, sId });
    const cacheKey = `${scope.tId}:${scope.sId}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.summary;
    if (cached) summaryCache.delete(cacheKey);

    const docId = getContextContentSummaryDocId(scope.tId, scope.sId);
    const snap = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(docId)
        .get();

    const summary = snap.exists
        ? normalizeAnswerlatticeSurfaceContentSummary({ ...snap.data(), id: snap.id }, scope, snap.id)
        : null;
    rememberSummary(cacheKey, summary);
    return summary;
}

export async function resolveRelatedContentForSearch(params: {
    tId: number;
    sId: number;
    context?: AnswerlatticeContextPayload;
    target?: 'helpWidget' | 'helpCenter' | 'changelog';
}): Promise<{
    relatedContent?: AnswerlatticeSurfaceContentItem;
    retrievalContext?: AnswerlatticeContextPayload;
}> {
    if (!params.context) return { retrievalContext: params.context };

    const summary = await getProductSurfaceContentSummaryServer(params.tId, params.sId).catch(() => null);
    const surface = resolveSurfaceContentForContext(summary, params.context, params.target || 'helpWidget');
    return {
        relatedContent: buildPublicRelatedContent(surface),
        retrievalContext: mergeSurfaceContext(params.context, surface),
    };
}
