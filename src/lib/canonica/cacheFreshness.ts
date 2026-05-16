import { DB_COLLECTIONS } from '@constant/database';
import { canonicaFirestoreAdmin as firestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import type { AiSearchHistory } from '@type/aiSearchHistory';
import {
    CANONICA_CACHE_SOURCES,
    CanonicaCacheSource,
    CanonicaCacheSourceVersions,
    normalizeCacheVersion,
} from './cacheVersionManifest';
import { getCanonicaCacheVersionServer } from './cacheVersionServer';

const FRESHNESS_CLOCK_SKEW_MS = 1000;

export const getCanonicaTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const isModifiedAfterCache = (modifiedOn: any, cachedAtMs: number): boolean => {
    const modifiedMs = getCanonicaTimestampMillis(modifiedOn);
    return Boolean(modifiedMs && cachedAtMs && modifiedMs > cachedAtMs + FRESHNESS_CLOCK_SKEW_MS);
};

type CanonicalFreshnessInput = {
    canonicalAnswerId?: string | null;
    tId: number;
    sId: number;
    cachedAtMs: number;
    answerVersion?: number | null;
    sourceVersions?: CanonicaCacheSourceVersions;
    currentSourceVersions?: CanonicaCacheSourceVersions;
};

const isVersionManifestFresh = async (
    source: CanonicaCacheSource,
    tId: number,
    sId: number,
    cachedSourceVersions?: CanonicaCacheSourceVersions,
    currentSourceVersions?: CanonicaCacheSourceVersions,
): Promise<boolean | undefined> => {
    const cachedVersion = normalizeCacheVersion(cachedSourceVersions?.[source]);
    if (!cachedVersion) return undefined;

    const currentVersion = normalizeCacheVersion(currentSourceVersions?.[source]) ??
        await getCanonicaCacheVersionServer(source, tId, sId);

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
    if (!canonicalAnswerId || !cachedAtMs) return false;

    const manifestFresh = await isVersionManifestFresh(
        CANONICA_CACHE_SOURCES.CANONICAL,
        tId,
        sId,
        sourceVersions,
        currentSourceVersions,
    );
    if (manifestFresh !== undefined) return manifestFresh;

    const doc = await firestoreAdmin
        .collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
        .doc(canonicalAnswerId)
        .get();

    if (!doc.exists) return false;

    const answer = doc.data() || {};
    if (Number(answer.tId) !== Number(tId) || Number(answer.sId) !== Number(sId)) return false;
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
    const articleId = typeof reference?.id === 'string' ? reference.id : '';
    if (!articleId || !cachedAtMs) return false;

    const doc = await firestoreAdmin
        .collection(DB_COLLECTIONS.KB_ARTICLES)
        .doc(articleId)
        .get();

    if (!doc.exists) return false;

    const article = doc.data() || {};
    if (Number(article.tId) !== Number(tId) || Number(article.sId) !== Number(sId)) return false;
    if (article.status !== 'published') return false;
    if (article.active === false || article.deleted === true) return false;
    if (isModifiedAfterCache(article.modifiedOn, cachedAtMs)) return false;

    return true;
};

export const isCachedSearchResultFresh = async (
    cachedResult: AiSearchHistory,
    tId: number,
    sId: number,
    currentSourceVersions?: CanonicaCacheSourceVersions,
): Promise<boolean> => {
    const cachedAtMs = getCanonicaTimestampMillis(cachedResult.createdOn || cachedResult.modifiedOn);
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

    const references = Array.isArray(cachedResult.references) ? cachedResult.references : [];
    if (references.length === 0) {
        return true;
    }

    const manifestFresh = await isVersionManifestFresh(
        CANONICA_CACHE_SOURCES.KB,
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
