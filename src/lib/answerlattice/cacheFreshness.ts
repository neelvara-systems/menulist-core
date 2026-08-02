import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin as firestoreAdmin, requireAnswerlatticeFirestoreAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';
import type { AiSearchHistory } from '@type/aiSearchHistory';
import { ANSWERLATTICE_CACHE_SOURCES, AnswerlatticeCacheSource, AnswerlatticeCacheSourceVersions, normalizeCacheVersion, } from './cacheVersionManifest';
import { getAnswerlatticeCacheVersionServer } from './cacheVersionServer';
import { normalizeAnswerlatticeCanonicalAnswerId } from './governanceIdBoundary';
import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId } from './sessionScope';

const FRESHNESS_CLOCK_SKEW_MS = 1000;

export const getAnswerlatticeTimestampMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;

    try {
        if (typeof (value as { toMillis?: unknown }).toMillis === 'function') {
            const millis = Number((value as { toMillis(): unknown }).toMillis());
            return Number.isFinite(millis) && millis > 0 ? millis : 0;
        }
        if (value instanceof Date) {
            const millis = value.getTime();
            return Number.isFinite(millis) && millis > 0 ? millis : 0;
        }
    } catch {
        return 0;
    }

    return 0;
};

const isModifiedAfterCache = (modifiedOn: unknown, cachedAtMs: number): boolean => {
    const modifiedMs = getAnswerlatticeTimestampMillis(modifiedOn);
    return Boolean(modifiedMs && cachedAtMs && modifiedMs > cachedAtMs + FRESHNESS_CLOCK_SKEW_MS);
};

type CanonicalFreshnessInput = {
    canonicalAnswerId?: string | null;
    tId: number;
    sId: number;
    cachedAtMs: number;
    answerVersion?: number | null;
    sourceVersions?: AnswerlatticeCacheSourceVersions;
    currentSourceVersions?: AnswerlatticeCacheSourceVersions;
};

const isVersionManifestFresh = async (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    cachedSourceVersions?: AnswerlatticeCacheSourceVersions,
    currentSourceVersions?: AnswerlatticeCacheSourceVersions,
): Promise<boolean | undefined> => {
    const cachedVersion = normalizeCacheVersion(cachedSourceVersions?.[source]);
    if (!cachedVersion) return undefined;

    const currentVersion = normalizeCacheVersion(currentSourceVersions?.[source]) ??
        await getAnswerlatticeCacheVersionServer(source, tId, sId);

    if (!currentVersion) return undefined;
    return cachedVersion === currentVersion;
};

export const isCachedCanonicalAnswerFresh = async ({
    canonicalAnswerId,
    tId,
    sId,
    cachedAtMs,
    answerVersion,
    sourceVersions,
    currentSourceVersions,
}: CanonicalFreshnessInput): Promise<boolean> => {
    const normalizedCanonicalAnswerId = normalizeAnswerlatticeCanonicalAnswerId(canonicalAnswerId);
    if (!normalizedCanonicalAnswerId || !cachedAtMs) return false;

    const manifestFresh = await isVersionManifestFresh(
        ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
        tId,
        sId,
        sourceVersions,
        currentSourceVersions,
    );
    if (manifestFresh !== undefined) return manifestFresh;

    const doc = await requireAnswerlatticeFirestoreAdmin()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .doc(normalizedCanonicalAnswerId)
        .get();

    if (!doc.exists) return false;

    const answer = doc.data() || {};
    if (
        answer.pId !== 'AL'
        || normalizeAnswerlatticeScopeDocumentId(answer.tId) !== normalizeAnswerlatticeScopeDocumentId(tId)
        || normalizeAnswerlatticeScopeDocumentId(answer.sId) !== normalizeAnswerlatticeScopeDocumentId(sId)
    ) return false;
    if (answer.status !== 'active') return false;
    if (answer.governance?.driftFlag || answer.governance?.reviewRequired) return false;
    if (isModifiedAfterCache(answer.modifiedOn, cachedAtMs)) return false;

    if (
        typeof answerVersion === 'number' &&
        Number(answer.productBinding?.lastValidatedInVersion || 0) !== Number(answerVersion)
    ) {
        return false;
    }

    return true;
};

const isCachedArticleReferenceFresh = async (
    reference: any,
    tId: number,
    sId: number,
    cachedAtMs: number,
): Promise<boolean> => {
    const articleId = normalizeAnswerlatticeKbArticleId(reference?.id);
    if (!articleId || !cachedAtMs) return false;

    const doc = await requireAnswerlatticeFirestoreAdmin()
        .collection(DB_COLLECTIONS.KB_ARTICLES)
        .doc(articleId)
        .get();

    if (!doc.exists) return false;

    const article = doc.data() || {};
    if (
        article.pId !== 'AL'
        || normalizeAnswerlatticeScopeDocumentId(article.tId) !== normalizeAnswerlatticeScopeDocumentId(tId)
        || normalizeAnswerlatticeScopeDocumentId(article.sId) !== normalizeAnswerlatticeScopeDocumentId(sId)
    ) return false;
    if (article.status !== 'published') return false;
    if (article.active === false || article.deleted === true) return false;
    if (isModifiedAfterCache(article.modifiedOn, cachedAtMs)) return false;

    return true;
};

export const isCachedSearchResultFresh = async (
    cachedResult: AiSearchHistory,
    tId: number,
    sId: number,
    currentSourceVersions?: AnswerlatticeCacheSourceVersions,
): Promise<boolean> => {
    const cachedAtMs = getAnswerlatticeTimestampMillis(cachedResult.createdOn || cachedResult.modifiedOn);
    if (!cachedAtMs) return false;

    if (cachedResult.canonical) {
        return isCachedCanonicalAnswerFresh({
            canonicalAnswerId: cachedResult.canonicalAnswerId,
            tId,
            sId,
            cachedAtMs,
            sourceVersions: cachedResult.sourceVersions,
            currentSourceVersions,
        });
    }

    // Non-canonical cache entries must also yield to newly approved or changed
    // canonical truth. Governance version changes invalidate FAQ/RAG history.
    const canonicalManifestFresh = await isVersionManifestFresh(
        ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
        tId,
        sId,
        cachedResult.sourceVersions,
        currentSourceVersions,
    );
    if (canonicalManifestFresh === false) return false;

    const references = Array.isArray(cachedResult.references) ? cachedResult.references : [];
    if (references.length === 0) {
        return false;
    }

    const manifestFresh = await isVersionManifestFresh(
        ANSWERLATTICE_CACHE_SOURCES.KB,
        tId,
        sId,
        cachedResult.sourceVersions,
        currentSourceVersions,
    );
    if (manifestFresh !== undefined) return manifestFresh;

    const freshnessChecks = await Promise.all(
        references.map((reference) => isCachedArticleReferenceFresh(reference, tId, sId, cachedAtMs)),
    );

    return freshnessChecks.every(Boolean);
};
