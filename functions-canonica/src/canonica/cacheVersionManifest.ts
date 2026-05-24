import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import { CANONICA_CACHE_VERSIONS_COLLECTION } from "../types/constants";
import { markCompiledContextSourceChanged } from "./compiledContextVersions";

export const CANONICA_CACHE_SOURCES = {
    KB: "kb",
    CANONICAL: "canonical",
} as const;

export type CanonicaCacheSource = typeof CANONICA_CACHE_SOURCES[keyof typeof CANONICA_CACHE_SOURCES];

type CacheVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

export const getCanonicaCacheVersionDocId = (
    source: CanonicaCacheSource,
    tId: number,
    sId: number,
) => `${source}_${Number(tId)}_${Number(sId)}`;

export const getCanonicaCacheVersionBumpData = (
    source: CanonicaCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    const data: Record<string, unknown> = {
        pId: "CN",
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

export const bumpCanonicaCacheVersion = async (
    db: Firestore,
    source: CanonicaCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error("Cannot update Canonica cache version without valid tenant and store scope.");
    }

    await db
        .collection(CANONICA_CACHE_VERSIONS_COLLECTION)
        .doc(getCanonicaCacheVersionDocId(source, tenantId, storeId))
        .set(getCanonicaCacheVersionBumpData(source, tenantId, storeId, metadata), { merge: true });
    await markCompiledContextSourceChanged(db, source, tenantId, storeId, {
        reason: metadata?.reason || `${source}_cache_version_bumped`,
        sourceId: metadata?.sourceId,
        sourceType: metadata?.sourceType,
    });
};
