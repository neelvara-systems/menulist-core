import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import { ANSWERLATTICE_CACHE_VERSIONS_COLLECTION } from "../types/constants";
import { markCompiledContextSourceChanged } from "./compiledContextVersions";

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
    const tenantId = Number(tId);
    const storeId = Number(sId);
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

export const bumpAnswerlatticeCacheVersion = async (
    db: Firestore,
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error("Cannot update Answerlattice cache version without valid tenant and store scope.");
    }

    await db
        .collection(ANSWERLATTICE_CACHE_VERSIONS_COLLECTION)
        .doc(getAnswerlatticeCacheVersionDocId(source, tenantId, storeId))
        .set(getAnswerlatticeCacheVersionBumpData(source, tenantId, storeId, metadata), { merge: true });
    await markCompiledContextSourceChanged(db, source, tenantId, storeId, {
        reason: metadata?.reason || `${source}_cache_version_bumped`,
        sourceId: metadata?.sourceId,
        sourceType: metadata?.sourceType,
    });
};
