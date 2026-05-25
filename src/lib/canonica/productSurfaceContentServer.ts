import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import * as admin from 'firebase-admin';
import type {
    CanonicaProductSurface,
    CanonicaFaq,
    CanonicaRelatedArticleRef,
    CanonicaRelatedChangelogRef,
    CanonicaRelatedFaqRef,
    CanonicaSurfaceContentItem,
    CanonicaSurfaceContentSummary,
    CanonicaContextPayload,
    CanonicaSurfaceTicketStats,
} from '@type/canonica';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import type { ChangelogEntry, ChangelogPage } from '@type/changelog';
import type { SupportTicketType } from '@type/supportTicket';
import {
    CANONICA_PRODUCT_SURFACE_LIMIT,
    buildPublicRelatedContent,
    getContextContentSummaryDocId,
    mergeSurfaceContext,
    resolveSurfaceContentForContext,
    scoreContentForSurface,
} from './productSurfaceContent';

const SUMMARY_CACHE_TTL_MS = 60_000;
const MAX_SUMMARY_CACHE_ENTRIES = 300;
const MAX_ARTICLES_FOR_SUMMARY = 500;
const MAX_FAQS_FOR_SUMMARY = 500;
const MAX_CHANGELOG_PAGES_FOR_SUMMARY = 3;
const MAX_TICKETS_FOR_SUMMARY = 300;

type SummaryCacheEntry = {
    summary: CanonicaSurfaceContentSummary | null;
    expiresAt: number;
};

const summaryCache = new Map<string, SummaryCacheEntry>();

const getCanonicaDb = () => {
    if (!canonicaFirestoreAdmin || typeof canonicaFirestoreAdmin.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    return canonicaFirestoreAdmin;
};

const rememberSummary = (cacheKey: string, summary: CanonicaSurfaceContentSummary | null) => {
    if (summaryCache.size >= MAX_SUMMARY_CACHE_ENTRIES) {
        const oldestKey = summaryCache.keys().next().value;
        if (oldestKey) summaryCache.delete(oldestKey);
    }
    summaryCache.set(cacheKey, { summary, expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS });
};

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const compactArticle = (article: KnowledgeBaseArticleType): CanonicaRelatedArticleRef => ({
    id: article.id,
    title: article.title,
    categoryTitle: article.categoryTitle,
    sectionTitle: article.sectionTitle,
    url: article.url,
    tags: Array.isArray(article.tags) ? article.tags.slice(0, 8) : [],
});

const compactChangelog = (entry: ChangelogEntry, pageId: string): CanonicaRelatedChangelogRef => ({
    id: entry.id,
    pageId,
    title: entry.title,
    version: entry.version || null,
    releasedOn: entry.releasedOn || null,
    tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 8) : [],
});

const compactFaq = (faq: CanonicaFaq): CanonicaRelatedFaqRef => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    articleId: faq.articleId || null,
    articleTitle: faq.articleTitle || null,
    tags: Array.isArray(faq.tags) ? faq.tags.slice(0, 8) : [],
});

const getDisplayId = (id: string) => id.slice(0, 6).toUpperCase();

const buildTicketStats = (tickets: SupportTicketType[]): CanonicaSurfaceTicketStats => ({
    total: tickets.length,
    open: tickets.filter(ticket => !['Resolved', 'Closed'].includes(String(ticket.status || ''))).length,
    recentDisplayIds: tickets.slice(0, 5).map(ticket => ticket.displayId || getDisplayId(ticket.id)),
});

async function loadActiveSurfaces(tId: number, sId: number): Promise<CanonicaProductSurface[]> {
    const snapshot = await getCanonicaDb()
        .collection(DB_COLLECTIONS.CANONICA_PRODUCT_SURFACES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(CANONICA_PRODUCT_SURFACE_LIMIT)
        .get();

    return snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as CanonicaProductSurface))
        .filter(surface => surface.active !== false)
        .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
}

async function loadPublishedArticles(tId: number, sId: number): Promise<KnowledgeBaseArticleType[]> {
    const snapshot = await getCanonicaDb()
        .collection(DB_COLLECTIONS.KB_ARTICLES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'published')
        .limit(MAX_ARTICLES_FOR_SUMMARY)
        .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as KnowledgeBaseArticleType));
}

async function loadPublishedFaqs(tId: number, sId: number): Promise<CanonicaFaq[]> {
    const snapshot = await getCanonicaDb()
        .collection(DB_COLLECTIONS.CANONICA_FAQS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'published')
        .where('active', '==', true)
        .orderBy('sortOrder', 'asc')
        .orderBy('modifiedOn', 'desc')
        .limit(MAX_FAQS_FOR_SUMMARY)
        .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CanonicaFaq));
}

async function loadRecentChangelogEntries(tId: number, sId: number): Promise<Array<ChangelogEntry & { pageId: string }>> {
    const snapshot = await getCanonicaDb()
        .collection(`${DB_COLLECTIONS.CHANGELOG}/${tId}/${sId}`)
        .orderBy('pageNumber', 'desc')
        .limit(MAX_CHANGELOG_PAGES_FOR_SUMMARY)
        .get();

    const entries: Array<ChangelogEntry & { pageId: string }> = [];
    snapshot.docs.forEach(doc => {
        const page = { ...doc.data(), id: doc.id } as ChangelogPage;
        (page.entries || [])
            .filter(entry => entry.published !== false)
            .forEach(entry => entries.push({ ...entry, pageId: doc.id }));
    });

    return entries.sort((a, b) => getTimestampMillis(b.releasedOn) - getTimestampMillis(a.releasedOn));
}

async function loadRecentTickets(tId: number, sId: number): Promise<SupportTicketType[]> {
    const snapshot = await getCanonicaDb()
        .collection(DB_COLLECTIONS.SUPPORT_TICKETS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('deleted', '==', false)
        .orderBy('createdOn', 'desc')
        .limit(MAX_TICKETS_FOR_SUMMARY)
        .get();

    return snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id, displayId: getDisplayId(doc.id) } as SupportTicketType))
        .sort((a, b) => getTimestampMillis(b.createdOn) - getTimestampMillis(a.createdOn));
}

export async function rebuildProductSurfaceContentSummaryServer(params: {
    tId: number;
    sId: number;
    reason?: string;
}): Promise<CanonicaSurfaceContentSummary> {
    const tId = Number(params.tId);
    const sId = Number(params.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        throw new Error('Invalid Canonica tenant scope.');
    }

    const [surfaces, articles, faqs, changelogEntries, tickets] = await Promise.all([
        loadActiveSurfaces(tId, sId),
        loadPublishedArticles(tId, sId),
        loadPublishedFaqs(tId, sId),
        loadRecentChangelogEntries(tId, sId),
        loadRecentTickets(tId, sId),
    ]);

    const surfaceItems: Record<string, CanonicaSurfaceContentItem> = {};

    for (const surface of surfaces) {
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
            feature: surface.feature,
            page: surface.page,
            workflow: surface.workflow,
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

    const summary: CanonicaSurfaceContentSummary = {
        pId: PRODUCT_IDS.CANONICA,
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
    await getCanonicaDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(docId)
        .set(summary, { merge: true });

    rememberSummary(`${tId}:${sId}`, { ...summary, id: docId });
    return { ...summary, id: docId };
}

export async function getProductSurfaceContentSummaryServer(tId: number, sId: number): Promise<CanonicaSurfaceContentSummary | null> {
    const cacheKey = `${Number(tId)}:${Number(sId)}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.summary;
    if (cached) summaryCache.delete(cacheKey);

    const docId = getContextContentSummaryDocId(tId, sId);
    const snap = await getCanonicaDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(docId)
        .get();

    const summary = snap.exists
        ? ({ ...snap.data(), id: snap.id } as CanonicaSurfaceContentSummary)
        : null;
    rememberSummary(cacheKey, summary);
    return summary;
}

export async function resolveRelatedContentForSearch(params: {
    tId: number;
    sId: number;
    context?: CanonicaContextPayload;
    target?: 'helpWidget' | 'helpCenter' | 'changelog';
}): Promise<{
    relatedContent?: CanonicaSurfaceContentItem;
    retrievalContext?: CanonicaContextPayload;
}> {
    if (!params.context) return { retrievalContext: params.context };

    const summary = await getProductSurfaceContentSummaryServer(params.tId, params.sId).catch(() => null);
    const surface = resolveSurfaceContentForContext(summary, params.context, params.target || 'helpWidget');
    return {
        relatedContent: buildPublicRelatedContent(surface),
        retrievalContext: mergeSurfaceContext(params.context, surface),
    };
}
