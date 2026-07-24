import { FieldValue, Firestore, Timestamp, Transaction } from "firebase-admin/firestore";
import { ANSWERLATTICE_CACHE_VERSIONS_COLLECTION } from "../types/constants";
import {
    appendCompiledContextSourceChanges,
    type AnswerlatticeContextSourceKey,
} from "./compiledContextVersions";

export const ANSWERLATTICE_CACHE_SOURCES = {
    KB: "kb",
    CANONICAL: "canonical",
} as const;

export type AnswerlatticeCacheSource = typeof ANSWERLATTICE_CACHE_SOURCES[keyof typeof ANSWERLATTICE_CACHE_SOURCES];

type CacheVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

export const getAnswerlatticeCacheVersionDocId = (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
) => `${source}_${Number(tId)}_${Number(sId)}`;

export const getAnswerlatticeCacheVersionBumpData = (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error("Cannot update Answerlattice cache version without valid tenant and store scope.");
    }
    const tenantId = tId;
    const storeId = sId;
    const data: Record<string, unknown> = {
        pId: 'AL',
        tId: tenantId,
        sId: storeId,
        source,
        version: FieldValue.increment(1),
        modifiedOn: Timestamp.now(),
    };

    if (metadata?.reason) data.lastReason = String(metadata.reason).slice(0, 80);
    if (metadata?.sourceId) data.lastSourceId = String(metadata.sourceId).slice(0, 160);
    if (metadata?.sourceType) data.lastSourceType = String(metadata.sourceType).slice(0, 80);
    return data;
};

const isValidStoredCacheVersion = (value: unknown) => {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return false;
    return Number.isSafeInteger(Number(value));
};

export const appendAnswerlatticeCacheVersionBump = async (
    transaction: Transaction,
    db: Firestore,
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
    additionalContextSources: readonly AnswerlatticeContextSourceKey[] = [],
) => {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error("Cannot update Answerlattice cache version without valid tenant and store scope.");
    }
    const cacheVersionRef = db.collection(ANSWERLATTICE_CACHE_VERSIONS_COLLECTION)
        .doc(getAnswerlatticeCacheVersionDocId(source, tId, sId));
    const cacheVersionSnapshot = await transaction.get(cacheVersionRef);
    const cacheVersion = cacheVersionSnapshot.data();
    if (cacheVersionSnapshot.exists && (
        cacheVersion?.pId !== 'AL'
        || cacheVersion?.tId !== tId
        || cacheVersion?.sId !== sId
        || cacheVersion?.source !== source
        || !isValidStoredCacheVersion(cacheVersion?.version)
    )) {
        throw new Error('Answerlattice cache-version ownership conflict.');
    }
    await appendCompiledContextSourceChanges(transaction, db, [source, ...additionalContextSources], tId, sId, {
        reason: metadata?.reason || `${source}_cache_version_bumped`,
        sourceId: metadata?.sourceId,
        sourceType: metadata?.sourceType,
    });
    transaction.set(
        cacheVersionRef,
        getAnswerlatticeCacheVersionBumpData(source, tId, sId, metadata),
        { merge: true },
    );
};

export const bumpAnswerlatticeCacheVersion = async (
    db: Firestore,
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
    additionalContextSources: readonly AnswerlatticeContextSourceKey[] = [],
) => {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error("Cannot update Answerlattice cache version without valid tenant and store scope.");
    }
    const tenantId = tId;
    const storeId = sId;

    await db.runTransaction(async transaction => {
        await appendAnswerlatticeCacheVersionBump(
            transaction,
            db,
            source,
            tenantId,
            storeId,
            metadata,
            additionalContextSources,
        );
    });
};
