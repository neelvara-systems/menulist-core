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
import { bumpAnswerlatticeCacheVersion } from '@lib/answerlattice/cacheVersionClient';
import { ANSWERLATTICE_CACHE_SOURCES } from '@lib/answerlattice/cacheVersionManifest';
import {
    ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT,
    ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT,
    ANSWERLATTICE_FAQ_PUBLIC_LIMIT,
    parseAnswerlatticeFaqSaveInput,
} from '@lib/answerlattice/faqContent';
import { revalidateAnswerlatticePublicClientCache } from '@lib/cache/answerlatticePublicClientCache';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import {
    ANSWERLATTICE_FAQ_STATUS,
    type AnswerlatticeFaq,
    type AnswerlatticeFaqStatus,
} from '@type/answerlattice';

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_FAQS;
const ARTICLE_COLLECTION = DB_COLLECTIONS.KB_ARTICLES;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, COLLECTION, docId);
const getArticleRef = (articleId: string) => doc(answerlatticeFirebaseClient, ARTICLE_COLLECTION, articleId);

const requireScope = async () => {
    const session = await getActiveSession();
    const tId = Number(session?.tId);
    const sId = Number(session?.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        throw new Error('Answerlattice workspace is not available.');
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

const sortFaqs = (faqs: AnswerlatticeFaq[]) => [...faqs].sort((left, right) => (
    Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    || getTimestampMillis(right.modifiedOn) - getTimestampMillis(left.modifiedOn)
    || left.question.localeCompare(right.question)
));

const buildFaqQuery = (
    scope: { tId: number; sId: number },
    statuses?: AnswerlatticeFaqStatus[],
    maxResults = ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT,
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
    await bumpAnswerlatticeCacheVersion(ANSWERLATTICE_CACHE_SOURCES.KB, scope.tId, scope.sId, {
        reason,
        sourceId,
        sourceType: 'answerlattice_faq',
    });
};

export const getFaqsForSession = async (
    statuses?: AnswerlatticeFaqStatus[],
    maxResults = ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT,
) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const snapshot = await getDocs(buildFaqQuery(scope, statuses, maxResults));
            return sortFaqs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as AnswerlatticeFaq)));
        },
        { statuses, maxResults },
        'getFaqsForSession',
    );
};

export const getPublishedFaqsForSession = async (maxResults = ANSWERLATTICE_FAQ_PUBLIC_LIMIT) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const snapshot = await getDocs(query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('status', '==', ANSWERLATTICE_FAQ_STATUS.PUBLISHED),
                where('active', '==', true),
                orderBy('sortOrder', 'asc'),
                orderBy('modifiedOn', 'desc'),
                limit(Math.min(Math.max(maxResults, 1), ANSWERLATTICE_FAQ_PUBLIC_LIMIT)),
            ));
            return sortFaqs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as AnswerlatticeFaq)));
        },
        { maxResults },
        'getPublishedFaqsForSession',
    );
};

export const getFaqsByArticleId = async (articleId: string, maxResults = ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const snapshot = await getDocs(query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('articleId', '==', articleId),
                where('active', '==', true),
                limit(Math.min(Math.max(maxResults, 1), ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT)),
            ));
            return sortFaqs(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as AnswerlatticeFaq)));
        },
        { articleId, maxResults },
        'getFaqsByArticleId',
    );
};

export const saveFaq = async (input: unknown) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireScope();
            const parsed = parseAnswerlatticeFaqSaveInput(input, scope);
            const faqRef = parsed.id ? getDocRef(parsed.id) : doc(getCollectionRef());
            const existingSnap = parsed.id ? await getDoc(faqRef) : null;
            const existing = existingSnap?.exists() ? existingSnap.data() as AnswerlatticeFaq : null;
            const nextStatus = parsed.status;
            const isNew = !existing;
            const now = Timestamp.now();
            const publishData = nextStatus === ANSWERLATTICE_FAQ_STATUS.PUBLISHED
                ? {
                    ...(existing?.publishedOn ? {} : { publishedOn: now }),
                    lastReviewedOn: now,
                    reviewRequestedOn: null,
                }
                : {};

            const composedData = await answerlatticeRequestBodyComposer({
                ...parsed,
                id: faqRef.id,
                ...(isNew ? { likes: 0, dislikes: 0 } : {}),
                ...(nextStatus === ANSWERLATTICE_FAQ_STATUS.ARCHIVED ? { active: false } : {}),
                ...publishData,
            });

            const batch = writeBatch(answerlatticeFirebaseClient);
            batch.set(faqRef, composedData, { merge: true });

            const previousArticleId = existing?.articleId || null;
            const nextArticleId = parsed.articleId || null;
            if (previousArticleId && previousArticleId !== nextArticleId) {
                batch.set(getArticleRef(previousArticleId), {
                    faqIds: arrayRemove(faqRef.id),
                    modifiedOn: Timestamp.now(),
                }, { merge: true });
            }
            if (nextArticleId && nextStatus !== ANSWERLATTICE_FAQ_STATUS.ARCHIVED) {
                batch.set(getArticleRef(nextArticleId), {
                    faqIds: arrayUnion(faqRef.id),
                    modifiedOn: Timestamp.now(),
                }, { merge: true });
            }

            await batch.commit();
            await bumpFaqVersion(scope, isNew ? 'faq_create' : 'faq_update', faqRef.id);
            await revalidateAnswerlatticePublicClientCache(scope, ['faqs', 'kb', 'context'], 'saveFaq');
            return { ...composedData, id: faqRef.id } as AnswerlatticeFaq;
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
            const existing = snap.data() as AnswerlatticeFaq;
            const composedData = await answerlatticeRequestBodyComposer({
                status: ANSWERLATTICE_FAQ_STATUS.ARCHIVED,
                active: false,
            });

            const batch = writeBatch(answerlatticeFirebaseClient);
            batch.set(faqRef, composedData, { merge: true });
            if (existing.articleId) {
                batch.set(getArticleRef(existing.articleId), {
                    faqIds: arrayRemove(faqId),
                    modifiedOn: Timestamp.now(),
                }, { merge: true });
            }
            await batch.commit();
            await bumpFaqVersion(scope, 'faq_archive', faqId);
            await revalidateAnswerlatticePublicClientCache(scope, ['faqs', 'kb', 'context'], 'archiveFaq');
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
                limit(ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT),
            ));
            if (snapshot.empty) return { updatedCount: 0 };

            const batch = writeBatch(answerlatticeFirebaseClient);
            const updateData = await answerlatticeRequestBodyComposer({
                status: ANSWERLATTICE_FAQ_STATUS.NEEDS_REVIEW,
                reviewRequestedOn: Timestamp.now(),
            });
            snapshot.docs.forEach(item => batch.set(item.ref, updateData, { merge: true }));
            await batch.commit();
            await bumpFaqVersion(scope, 'article_changed_mark_faq_review', article.id);
            await revalidateAnswerlatticePublicClientCache(scope, ['faqs', 'kb', 'context'], 'markFaqsNeedReviewForArticle');
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
                limit(ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT),
            ));
            if (snapshot.empty) return { updatedCount: 0 };

            const batch = writeBatch(answerlatticeFirebaseClient);
            const updateData = await answerlatticeRequestBodyComposer({
                status: ANSWERLATTICE_FAQ_STATUS.ARCHIVED,
                active: false,
            });
            snapshot.docs.forEach(item => batch.set(item.ref, updateData, { merge: true }));
            await batch.commit();
            await bumpFaqVersion(scope, 'article_deleted_archive_faqs', article.id);
            await revalidateAnswerlatticePublicClientCache(scope, ['faqs', 'kb', 'context'], 'archiveFaqsForArticle');
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
            return await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
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
