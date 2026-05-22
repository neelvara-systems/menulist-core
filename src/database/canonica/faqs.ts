import { DB_COLLECTIONS } from '@constant/database';
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    setDoc,
    Timestamp,
    where,
    writeBatch,
} from '@firebase/firestore';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { bumpCanonicaCacheVersion } from '@lib/canonica/cacheVersionClient';
import { CANONICA_CACHE_SOURCES } from '@lib/canonica/cacheVersionManifest';
import {
    CANONICA_FAQ_ARTICLE_LINK_LIMIT,
    CANONICA_FAQ_MANAGEMENT_LIMIT,
    CANONICA_FAQ_PUBLIC_LIMIT,
    parseCanonicaFaqSaveInput,
} from '@lib/canonica/faqContent';
import { revalidateCanonicaPublicClientCache } from '@lib/cache/canonicaPublicClientCache';
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { canonicaFirebaseClient } from '@lib/firebase/canonicaFirebaseClient';
import {
    CANONICA_FAQ_STATUS,
    type CanonicaFaq,
    type CanonicaFaqStatus,
} from '@type/canonica';

const COLLECTION = DB_COLLECTIONS.CANONICA_FAQS;
const ARTICLE_COLLECTION = DB_COLLECTIONS.KB_ARTICLES;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(canonicaFirebaseClient, COLLECTION, docId);
const getArticleRef = (articleId: string) => doc(canonicaFirebaseClient, ARTICLE_COLLECTION, articleId);

const requireScope = async () => {
    const session = await getActiveSession();
    const tId = Number(session?.tId);
    const sId = Number(session?.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        throw new Error('Canonica workspace is not available.');
    }
    return { tId, sId };
};

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const sortFaqs = (faqs: CanonicaFaq[]) => [...faqs].sort((left, right) => (
    Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    || getTimestampMillis(right.modifiedOn) - getTimestampMillis(left.modifiedOn)
    || left.question.localeCompare(right.question)
));

const buildFaqQuery = (
    scope: { tId: number; sId: number },
    statuses?: CanonicaFaqStatus[],
    maxResults = CANONICA_FAQ_MANAGEMENT_LIMIT,
) => {
    const filters: any[] = [
        where('tId', '==', scope.tId),
        where('sId', '==', scope.sId),
    ];

    const validStatuses = Array.from(new Set(statuses || [])).filter(Boolean);
    if (validStatuses.length === 1) {
        filters.push(where('status', '==', validStatuses[0]));
    } else if (validStatuses.length > 1 && validStatuses.length <= 10) {
        filters.push(where('status', 'in', validStatuses));
    }

    return query(
        getCollectionRef(),
        ...filters,
        orderBy('sortOrder', 'asc'),
        orderBy('modifiedOn', 'desc'),
        limit(Math.min(Math.max(maxResults, 1), 200)),
    );
};

const bumpFaqVersion = async (
    scope: { tId: number; sId: number },
    reason: string,
    sourceId?: string,
) => {
    await bumpCanonicaCacheVersion(CANONICA_CACHE_SOURCES.KB, scope.tId, scope.sId, {
        reason,
        sourceId,
        sourceType: 'canonica_faq',
    });
};

export const getFaqsForSession = async (
    statuses?: CanonicaFaqStatus[],
    maxResults = CANONICA_FAQ_MANAGEMENT_LIMIT,
) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const snapshot = await getDocs(buildFaqQuery(scope, statuses, maxResults));
            return sortFaqs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CanonicaFaq)));
        },
        { statuses, maxResults },
        'getFaqsForSession',
    );
};

export const getPublishedFaqsForSession = async (maxResults = CANONICA_FAQ_PUBLIC_LIMIT) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const snapshot = await getDocs(query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('status', '==', CANONICA_FAQ_STATUS.PUBLISHED),
                where('active', '==', true),
                orderBy('sortOrder', 'asc'),
                orderBy('modifiedOn', 'desc'),
                limit(Math.min(Math.max(maxResults, 1), CANONICA_FAQ_PUBLIC_LIMIT)),
            ));
            return sortFaqs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CanonicaFaq)));
        },
        { maxResults },
        'getPublishedFaqsForSession',
    );
};

export const getFaqsByArticleId = async (articleId: string, maxResults = CANONICA_FAQ_ARTICLE_LINK_LIMIT) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const snapshot = await getDocs(query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('articleId', '==', articleId),
                where('active', '==', true),
                limit(Math.min(Math.max(maxResults, 1), CANONICA_FAQ_ARTICLE_LINK_LIMIT)),
            ));
            return sortFaqs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CanonicaFaq)));
        },
        { articleId, maxResults },
        'getFaqsByArticleId',
    );
};

export const saveFaq = async (input: unknown) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const parsed = parseCanonicaFaqSaveInput(input, scope);
            const faqRef = parsed.id ? getDocRef(parsed.id) : doc(getCollectionRef());
            const existingSnap = parsed.id ? await getDoc(faqRef) : null;
            const existing = existingSnap?.exists() ? existingSnap.data() as CanonicaFaq : null;
            const nextStatus = parsed.status;
            const isNew = !existing;
            const now = Timestamp.now();
            const publishData = nextStatus === CANONICA_FAQ_STATUS.PUBLISHED
                ? {
                    ...(existing?.publishedOn ? {} : { publishedOn: now }),
                    lastReviewedOn: now,
                    reviewRequestedOn: null,
                }
                : {};

            const composedData = await canonicaRequestBodyComposer({
                ...parsed,
                id: faqRef.id,
                ...(isNew ? { likes: 0, dislikes: 0 } : {}),
                ...(nextStatus === CANONICA_FAQ_STATUS.ARCHIVED ? { active: false } : {}),
                ...publishData,
            });

            const batch = writeBatch(canonicaFirebaseClient);
            batch.set(faqRef, composedData, { merge: true });

            const previousArticleId = existing?.articleId || null;
            const nextArticleId = parsed.articleId || null;
            if (previousArticleId && previousArticleId !== nextArticleId) {
                batch.set(getArticleRef(previousArticleId), {
                    faqIds: arrayRemove(faqRef.id),
                    modifiedOn: Timestamp.now(),
                }, { merge: true });
            }
            if (nextArticleId && nextStatus !== CANONICA_FAQ_STATUS.ARCHIVED) {
                batch.set(getArticleRef(nextArticleId), {
                    faqIds: arrayUnion(faqRef.id),
                    modifiedOn: Timestamp.now(),
                }, { merge: true });
            }

            await batch.commit();
            await bumpFaqVersion(scope, isNew ? 'faq_create' : 'faq_update', faqRef.id);
            await revalidateCanonicaPublicClientCache(scope, ['faqs', 'kb', 'context'], 'saveFaq');
            return { ...composedData, id: faqRef.id } as CanonicaFaq;
        },
        input,
        'saveFaq',
    );
};

export const archiveFaq = async (faqId: string) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const faqRef = getDocRef(faqId);
            const snap = await getDoc(faqRef);
            if (!snap.exists()) throw new Error('FAQ not found.');
            const existing = snap.data() as CanonicaFaq;
            const composedData = await canonicaRequestBodyComposer({
                status: CANONICA_FAQ_STATUS.ARCHIVED,
                active: false,
            });

            const batch = writeBatch(canonicaFirebaseClient);
            batch.set(faqRef, composedData, { merge: true });
            if (existing.articleId) {
                batch.set(getArticleRef(existing.articleId), {
                    faqIds: arrayRemove(faqId),
                    modifiedOn: Timestamp.now(),
                }, { merge: true });
            }
            await batch.commit();
            await bumpFaqVersion(scope, 'faq_archive', faqId);
            await revalidateCanonicaPublicClientCache(scope, ['faqs', 'kb', 'context'], 'archiveFaq');
            return { id: faqId, ...composedData };
        },
        { faqId },
        'archiveFaq',
    );
};

export const markFaqsNeedReviewForArticle = async (article: { id: string; tId?: number; sId?: number }) => {
    return await apiCallComposer(
        async () => {
            const fallbackScope = await requireScope().catch(() => null);
            const scope = {
                tId: Number(article.tId || fallbackScope?.tId),
                sId: Number(article.sId || fallbackScope?.sId),
            };
            if (!Number.isFinite(scope.tId) || !Number.isFinite(scope.sId) || scope.tId <= 0 || scope.sId <= 0) {
                return { updatedCount: 0 };
            }

            const snapshot = await getDocs(query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('articleId', '==', article.id),
                where('active', '==', true),
                limit(CANONICA_FAQ_ARTICLE_LINK_LIMIT),
            ));
            if (snapshot.empty) return { updatedCount: 0 };

            const batch = writeBatch(canonicaFirebaseClient);
            const updateData = await canonicaRequestBodyComposer({
                status: CANONICA_FAQ_STATUS.NEEDS_REVIEW,
                reviewRequestedOn: Timestamp.now(),
            });
            snapshot.docs.forEach(item => batch.set(item.ref, updateData, { merge: true }));
            await batch.commit();
            await bumpFaqVersion(scope, 'article_changed_mark_faq_review', article.id);
            await revalidateCanonicaPublicClientCache(scope, ['faqs', 'kb', 'context'], 'markFaqsNeedReviewForArticle');
            return { updatedCount: snapshot.size };
        },
        article,
        'markFaqsNeedReviewForArticle',
    );
};

export const archiveFaqsForArticle = async (article: { id: string; tId?: number; sId?: number }) => {
    return await apiCallComposer(
        async () => {
            const fallbackScope = await requireScope().catch(() => null);
            const scope = {
                tId: Number(article.tId || fallbackScope?.tId),
                sId: Number(article.sId || fallbackScope?.sId),
            };
            if (!Number.isFinite(scope.tId) || !Number.isFinite(scope.sId) || scope.tId <= 0 || scope.sId <= 0) {
                return { updatedCount: 0 };
            }

            const snapshot = await getDocs(query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('articleId', '==', article.id),
                where('active', '==', true),
                limit(CANONICA_FAQ_ARTICLE_LINK_LIMIT),
            ));
            if (snapshot.empty) return { updatedCount: 0 };

            const batch = writeBatch(canonicaFirebaseClient);
            const updateData = await canonicaRequestBodyComposer({
                status: CANONICA_FAQ_STATUS.ARCHIVED,
                active: false,
            });
            snapshot.docs.forEach(item => batch.set(item.ref, updateData, { merge: true }));
            await batch.commit();
            await bumpFaqVersion(scope, 'article_deleted_archive_faqs', article.id);
            await revalidateCanonicaPublicClientCache(scope, ['faqs', 'kb', 'context'], 'archiveFaqsForArticle');
            return { updatedCount: snapshot.size };
        },
        article,
        'archiveFaqsForArticle',
    );
};

export const updateFaqFeedback = async (
    faqId: string,
    type: 'like' | 'dislike',
    shouldIncrement: boolean = true,
) => {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(faqId);
            return await runTransaction(canonicaFirebaseClient, async (transaction) => {
                const snap = await transaction.get(docRef);
                if (!snap.exists()) throw new Error('FAQ not found.');

                const field = type === 'like' ? 'likes' : 'dislikes';
                const current = Number(snap.data()?.[field] || 0);
                const delta = shouldIncrement ? 1 : -1;
                const next = Math.max(0, current + delta);
                transaction.update(docRef, { [field]: next });
                return {
                    likes: field === 'likes' ? next : Number(snap.data()?.likes || 0),
                    dislikes: field === 'dislikes' ? next : Number(snap.data()?.dislikes || 0),
                };
            });
        },
        { faqId, type, shouldIncrement },
        'updateFaqFeedback',
    );
};
