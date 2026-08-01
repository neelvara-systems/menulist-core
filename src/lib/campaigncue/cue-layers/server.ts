import { FEATURE_FLAGS } from "@config/features";
import {
    CAMPAIGNCUE_ASSET_ID_PREFIX,
    CAMPAIGNCUE_COLLECTIONS,
    CAMPAIGNCUE_EVENT_ID_PREFIX,
    CAMPAIGNCUE_IDEMPOTENCY_RETENTION_MS,
    CAMPAIGNCUE_PAGE_SIZE,
} from "@constant/campaigncue/database";
import {
    CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES,
    CAMPAIGNCUE_CUE_LAYERS,
} from "@constant/campaigncue/cueLayers";
import {
    admin,
    campaigncueFirestoreAdmin as firestoreAdmin,
    campaigncueStorageAdmin,
} from "@lib/firebase/campaigncueFirebaseAdmin";
import { sanitizeForFirestore as sanitizeFirestoreValue } from "@lib/firestore/sanitizeForFirestore";
import type {
    CampaignCueCueLayerAutosaveInput,
    CampaignCueCueLayerExportInput,
    CampaignCueCueLayerRepairInput,
    CampaignCueCueLayerUploadInput,
} from "@lib/validation/campaigncueCueLayersSchemas";
import { CampaignCueCueLayerEditorDocumentSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import type { CampaignCueAsset, CampaignCueBusinessBrain } from "@type/campaigncue";
import type {
    CampaignCueCreativeEditorDocumentSnapshot,
    CampaignCueCreativeSourcePackage,
    CampaignCueCueLayerAssetRef,
    CampaignCueCueLayerBootPackage,
    CampaignCueCueLayerDesign,
    CampaignCueCueLayerIndex,
    CampaignCueCueLayerJob,
    CampaignCueCueLayerUploadResult,
} from "@type/campaigncueCueLayers";
import type { CreativeEditorDocument } from "@/modules/creative-editor/types";
import {
    buildCampaignCueApiError,
    buildCampaignCueWorkspaceId,
    ensureCampaignCueWorkspaceServer,
    logCampaignCueServerError,
    type CampaignCueSessionScope,
} from "../server";
import { assertCampaignCueWorkspaceRecordScope } from "../workspaceScope";
import { buildCampaignCueCueLayerProjection } from "./editorProjection";
import {
    assertCampaignCueCueLayerDocumentScope,
    collectCampaignCueCueLayerDocumentAssetIds,
    dehydrateCampaignCueCueLayerDocumentAssets,
    getCampaignCueCueLayerExportBindingError,
    hydrateCampaignCueCueLayerDocumentAssets,
} from "./documentBoundary";
import {
    assertCampaignCueCueLayersClaimOwnership,
    CampaignCueCueLayersIdempotencyConflictError,
    getCampaignCueCueLayersClaimDecision,
    type CampaignCueCueLayersIdempotencyRecord,
} from "./idempotency";
import {
    assertCampaignCueCueLayerImageLimits,
    readCampaignCueCueLayerImageMetadata,
} from "./imageMetadata";
import { parseCampaignCueCueLayerIndexArtifact } from "./layerIndexBoundary";
import {
    parseCampaignCueCueLayerDesignRecord,
    parseCampaignCueCueLayerJobRecord,
} from "./recordBoundary";
import {
    buildCampaignCueCueAssetUri,
    buildCampaignCueCueLayerId,
    buildCueLayerAssetRef,
    buildCueLayersStoragePaths,
    getCampaignCueCueLayerExtension,
    sha256Hex,
    stableJsonHash,
} from "./storagePaths";

const nowTimestamp = () => admin.firestore.Timestamp.now();
const CUE_LAYERS_IDEMPOTENCY_LEASE_MS = 5 * 60 * 1000;
const sanitizeForAdminFirestore = <T>(value: T): T extends undefined ? null : T => sanitizeFirestoreValue(value, {
    dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
    undefinedObjectValue: "omit",
});

const workspaceRef = (workspaceId: string) => (
    firestoreAdmin.collection(CAMPAIGNCUE_COLLECTIONS.WORKSPACES).doc(workspaceId)
);

const workspaceSubcollection = (workspaceId: string, collection: string) => (
    workspaceRef(workspaceId).collection(collection)
);

async function assertCurrentCueLayersWorkspaceAccess(
    transaction: FirebaseFirestore.Transaction,
    scope: CampaignCueSessionScope,
    workspaceId: string,
) {
    const currentWorkspaceSnap = await transaction.get(workspaceRef(workspaceId));
    return assertCampaignCueWorkspaceRecordScope(
        currentWorkspaceSnap.exists ? currentWorkspaceSnap.data() : null,
        { ...scope, workspaceId },
    );
}

const jsonBuffer = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2), "utf8");

const safeTitle = (value: string) => (
    value.trim().replace(/\.[a-z0-9]+$/i, "").slice(0, 100) || "CueLayers image"
);

const decodeCanonicalBase64 = (value: string) => {
    if (
        value.length % 4 !== 0
        || !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(value)
    ) {
        throw new Error("Image data is not valid base64.");
    }
    const buffer = Buffer.from(value, "base64");
    if (buffer.toString("base64") !== value) throw new Error("Image data is not valid base64.");
    return buffer;
};

function parseImageDataUrl(dataUrl: string, expectedMimeType: string) {
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) throw new Error("Unsupported image upload.");
    const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
    if (mimeType !== expectedMimeType) throw new Error("Upload MIME type does not match the image data.");
    const buffer = decodeCanonicalBase64(match[2]);
    if (!buffer.length || buffer.length > CAMPAIGNCUE_CUE_LAYERS.MAX_UPLOAD_BYTES) {
        throw new Error("Upload is empty or too large.");
    }
    const metadata = readCampaignCueCueLayerImageMetadata(buffer);
    if (metadata.mimeType !== mimeType) throw new Error("Upload MIME type does not match the image bytes.");
    assertCampaignCueCueLayerImageLimits(metadata, {
        maxLongEdge: CAMPAIGNCUE_CUE_LAYERS.MAX_SOURCE_LONG_EDGE,
        maxPixels: CAMPAIGNCUE_CUE_LAYERS.MAX_CANVAS_PIXELS,
    });
    return { buffer, height: metadata.height, mimeType, width: metadata.width };
}

function parseRenderedExportDataUrl(dataUrl: string | undefined, format: CampaignCueCueLayerExportInput["format"]) {
    if (format === "pdf_flattened" || format === "json") {
        throw new Error("CueLayers currently saves PNG, JPEG, or WebP exports.");
    }
    if (!dataUrl) throw new Error("Rendered export data is required.");
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) throw new Error("Rendered export format is not supported.");
    const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
    const expectedMimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
    if (mimeType !== expectedMimeType) throw new Error("Rendered export MIME type does not match the requested format.");
    const buffer = decodeCanonicalBase64(match[2]);
    if (!buffer.length || buffer.length > CAMPAIGNCUE_CUE_LAYERS.MAX_EXPORT_BYTES) {
        throw new Error("Rendered export is empty or too large.");
    }
    const metadata = readCampaignCueCueLayerImageMetadata(buffer);
    if (metadata.mimeType !== mimeType) throw new Error("Rendered export MIME type does not match the image bytes.");
    assertCampaignCueCueLayerImageLimits(metadata, {
        maxLongEdge: CAMPAIGNCUE_CUE_LAYERS.MAX_EXPORT_LONG_EDGE,
        maxPixels: CAMPAIGNCUE_CUE_LAYERS.MAX_CANVAS_PIXELS,
    });
    return { buffer, height: metadata.height, mimeType, width: metadata.width };
}

async function uploadStorageObject(params: {
    buffer: Buffer;
    cacheControl?: string;
    contentType: string;
    customMetadata?: Record<string, string>;
    path: string;
}) {
    const bucket = campaigncueStorageAdmin.bucket();
    const file = bucket.file(params.path);
    await file.save(params.buffer, {
        contentType: params.contentType,
        resumable: false,
        metadata: {
            cacheControl: params.cacheControl || "private, max-age=0, no-store",
            metadata: params.customMetadata || {},
        },
    });
    const [metadata] = await file.getMetadata();
    return {
        generation: String(metadata.generation || ""),
        metageneration: String(metadata.metageneration || ""),
        size: Number(metadata.size || params.buffer.length),
    };
}

async function uploadJsonArtifact(params: {
    assetId?: string;
    path: string;
    retentionClass: CampaignCueCueLayerAssetRef["retentionClass"];
    scope: CampaignCueCueLayerAssetRef["assetScope"];
    value: unknown;
}) {
    const buffer = jsonBuffer(params.value);
    const uploaded = await uploadStorageObject({
        buffer,
        contentType: "application/json",
        customMetadata: {
            retentionClass: params.retentionClass,
            sha256: sha256Hex(buffer),
            workspaceId: params.scope.workspaceId,
            designId: params.scope.designId,
        },
        path: params.path,
    });
    return buildCueLayerAssetRef({
        assetId: params.assetId,
        contentType: "application/json",
        retentionClass: params.retentionClass,
        scope: params.scope,
        sha256: sha256Hex(buffer),
        sizeBytes: uploaded.size,
        storageGeneration: uploaded.generation,
        storageMetageneration: uploaded.metageneration,
        storagePath: params.path,
    });
}

async function deleteStorageObjectBestEffort(path: string, cleanupTarget: string) {
    try {
        await campaigncueStorageAdmin.bucket().file(path).delete({ ignoreNotFound: true });
    } catch (error) {
        logCampaignCueServerError("CampaignCue CueLayers cleanup failed", error, {
            cleanupTarget,
            feature: "cue-layers",
        });
    }
}

async function withUncommittedStorageCleanup<T>(
    cleanupTarget: string,
    operation: (
        recordUploadedPath: (path: string) => void,
        markCommitted: () => void,
    ) => Promise<T>,
): Promise<T> {
    const uploadedPaths: string[] = [];
    let committed = false;
    try {
        return await operation(
            (path) => uploadedPaths.push(path),
            () => {
                committed = true;
            },
        );
    } catch (error) {
        if (!committed) {
            await Promise.all(
                uploadedPaths
                    .slice()
                    .reverse()
                    .map((path) => deleteStorageObjectBestEffort(path, cleanupTarget)),
            );
        }
        throw error;
    }
}

async function readJsonArtifact(path: string, maxBytes: number): Promise<unknown> {
    const stream = campaigncueStorageAdmin.bucket().file(path).createReadStream();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buffer.length;
        if (totalBytes > maxBytes) {
            stream.destroy();
            throw new Error("CueLayers artifact is too large.");
        }
        chunks.push(buffer);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw new Error("CueLayers artifact is invalid.");
    }
}

async function signedUrlForAsset(asset: CampaignCueCueLayerAssetRef) {
    const [url] = await campaigncueStorageAdmin.bucket().file(asset.storagePath).getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
    });
    return url;
}

function collectLayerAssets(layerIndex: CampaignCueCueLayerIndex) {
    const assets = new Map<string, CampaignCueCueLayerAssetRef>();
    layerIndex.entries.forEach((entry) => {
        entry.assetRefs.forEach((asset) => assets.set(asset.assetId, asset));
    });
    return assets;
}

function collectLayerAssetIds(layerIndex: CampaignCueCueLayerIndex) {
    return new Set(collectLayerAssets(layerIndex).keys());
}

function parseCueLayerExportReplayRecord(
    value: unknown,
    exportId: string,
    designId: string,
    workspaceId: string,
) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new CampaignCueCueLayersIdempotencyConflictError("The saved export retry result is unavailable.");
    }
    const record = value as Record<string, unknown>;
    if (
        record.id !== exportId
        || record.designId !== designId
        || record.workspaceId !== workspaceId
        || typeof record.outputAssetId !== "string"
    ) {
        throw new CampaignCueCueLayersIdempotencyConflictError("The saved export retry result is invalid.");
    }
    return record as { outputAssetId: string } & Record<string, unknown>;
}

function parseCueLayerExportAssetRecord(value: unknown, assetId: string, workspaceId: string): CampaignCueAsset {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new CampaignCueCueLayersIdempotencyConflictError("The saved export asset is unavailable.");
    }
    const asset = value as Partial<CampaignCueAsset>;
    if (asset.id !== assetId || asset.workspaceId !== workspaceId || asset.assetType !== "export") {
        throw new CampaignCueCueLayersIdempotencyConflictError("The saved export asset is invalid.");
    }
    return asset as CampaignCueAsset;
}

function parseCueLayerEditorDocumentRecord(
    value: unknown,
    designId: string,
    workspaceId: string,
): CampaignCueCreativeEditorDocumentSnapshot {
    const parsed = CampaignCueCueLayerEditorDocumentSchema.safeParse(value);
    if (!parsed.success) throw new Error("CueLayers editor snapshot is invalid.");
    const documentValue = parsed.data as unknown as CampaignCueCreativeEditorDocumentSnapshot;
    assertCampaignCueCueLayerDocumentScope(documentValue, designId, workspaceId);
    return documentValue;
}

async function hydrateDocumentAssets(documentValue: CreativeEditorDocument, layerIndex: CampaignCueCueLayerIndex) {
    const assets = collectLayerAssets(layerIndex);
    const referencedAssetIds = collectCampaignCueCueLayerDocumentAssetIds(documentValue);
    const hydratedEntries = await Promise.all(Array.from(referencedAssetIds).map(async (assetId) => {
        const asset = assets.get(assetId);
        if (!asset) throw new Error("CueLayers design asset is unavailable.");
        return {
        asset,
        url: await signedUrlForAsset(asset),
        };
    }));
    const urlByAssetId = new Map(hydratedEntries.map((entry) => [entry.asset.assetId, entry.url]));
    return hydrateCampaignCueCueLayerDocumentAssets(documentValue, urlByAssetId);
}

async function claimCueLayersIdempotency(params: {
    action: string;
    idempotencyKey: string;
    requestHash: string;
    scope: CampaignCueSessionScope;
    workspaceId: string;
}) {
    const ref = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS).doc(params.idempotencyKey);
    const claimId = buildCampaignCueCueLayerId("claim");
    const nowMillis = Date.now();
    const result = await firestoreAdmin.runTransaction<{
        claimId: string | null;
        replay: CampaignCueCueLayersIdempotencyRecord | null;
    }>(async (transaction) => {
        const [snap] = await Promise.all([
            transaction.get(ref),
            assertCurrentCueLayersWorkspaceAccess(transaction, params.scope, params.workspaceId),
        ]);
        const expected = {
            action: params.action,
            actorId: params.scope.userId,
            requestHash: params.requestHash,
        };
        const decision = getCampaignCueCueLayersClaimDecision(
            snap.exists ? snap.data() : null,
            expected,
            nowMillis,
        );
        if (decision.kind === "replay") return { claimId: null, replay: decision.replay };
        if (decision.kind === "conflict") throw new CampaignCueCueLayersIdempotencyConflictError();
        const now = admin.firestore.Timestamp.fromMillis(nowMillis);
        transaction.set(ref, sanitizeForAdminFirestore({
            id: params.idempotencyKey,
            action: params.action,
            actorId: params.scope.userId,
            claimId,
            requestHash: params.requestHash,
            status: "in_progress",
            createdAt: snap.exists ? snap.data()?.createdAt || now : now,
            updatedAt: now,
            leaseExpiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + CUE_LAYERS_IDEMPOTENCY_LEASE_MS),
            expiresAt: admin.firestore.Timestamp.fromMillis(nowMillis + CAMPAIGNCUE_IDEMPOTENCY_RETENTION_MS),
        }));
        return { claimId, replay: null };
    });
    return { claimId: result.claimId, ref, replay: result.replay };
}

function cueLayersIdempotencyCompletion(params: {
    action: string;
    actorId: string;
    claimId?: string | null;
    requestHash: string;
    responseError?: string;
    responseStatus?: number;
    resultId: string;
    resultRevision?: number;
    secondaryResultId?: string;
}) {
    return sanitizeForAdminFirestore({
        action: params.action,
        actorId: params.actorId,
        claimId: params.claimId || undefined,
        requestHash: params.requestHash,
        responseError: params.responseError,
        responseStatus: params.responseStatus,
        resultId: params.resultId,
        resultRevision: params.resultRevision,
        secondaryResultId: params.secondaryResultId,
        status: "completed",
        updatedAt: nowTimestamp(),
    });
}

async function completeCueLayersIdempotencyClaim(params: {
    action: string;
    actorId: string;
    claimId: string | null;
    ref: FirebaseFirestore.DocumentReference | null;
    requestHash: string;
    responseError?: string;
    responseStatus?: number;
    resultId: string;
    resultRevision?: number;
    secondaryResultId?: string;
}) {
    if (!params.ref || !params.claimId) return;
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(params.ref as FirebaseFirestore.DocumentReference);
        assertCampaignCueCueLayersClaimOwnership(snap.exists ? snap.data() : null, {
            action: params.action,
            actorId: params.actorId,
            requestHash: params.requestHash,
        }, params.claimId as string);
        transaction.set(params.ref as FirebaseFirestore.DocumentReference, cueLayersIdempotencyCompletion(params), { merge: true });
    });
}

function businessTruthSnapshot(businessBrain: CampaignCueBusinessBrain) {
    const catalog = {
        items: businessBrain.catalog.items.map((item) => ({
            available: item.available,
            category: item.category,
            id: item.id,
            name: item.name,
            priceLabel: item.priceLabel,
        })),
        services: businessBrain.catalog.services.map((service) => ({
            available: service.available,
            category: service.category,
            id: service.id,
            name: service.name,
            priceLabel: service.priceLabel,
        })),
    };
    return {
        businessName: businessBrain.name,
        locality: businessBrain.locality || "",
        contacts: businessBrain.contacts,
        catalog,
        brandVoice: businessBrain.brandKit.voice,
        brandPlaybook: businessBrain.brandKit.playbook,
        sourceSnapshotId: businessBrain.sourceSnapshotId,
        snapshotHash: stableJsonHash({
            name: businessBrain.name,
            contacts: businessBrain.contacts,
            catalog,
            brandKit: businessBrain.brandKit,
        }),
    };
}

function protectedTextSnapshot(businessBrain: CampaignCueBusinessBrain): string[] {
    return [
        businessBrain.name,
        businessBrain.locality,
        businessBrain.contacts.phone,
        businessBrain.contacts.website,
        businessBrain.contacts.whatsapp,
        businessBrain.contacts.bookingUrl,
        businessBrain.contacts.publicMenuUrl,
        ...businessBrain.catalog.items.flatMap((item) => [item.name, item.priceLabel]),
        ...businessBrain.catalog.services.flatMap((service) => [service.name, service.priceLabel]),
    ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function brandSnapshot(businessBrain: CampaignCueBusinessBrain) {
    return {
        name: businessBrain.name,
        primaryColor: businessBrain.brandKit.primaryColor,
        logoUrl: businessBrain.brandKit.logoUrl,
        voice: businessBrain.brandKit.voice,
        playbook: businessBrain.brandKit.playbook,
    };
}

export async function listCampaignCueCueLayerDesignsServer(scope: CampaignCueSessionScope): Promise<CampaignCueCueLayerDesign[]> {
    const { workspace } = await ensureCampaignCueWorkspaceServer(scope);
    const snap = await workspaceSubcollection(workspace.workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS)
        .orderBy("updatedAt", "desc")
        .limit(CAMPAIGNCUE_PAGE_SIZE)
        .get();
    return snap.docs.map((doc) => parseCampaignCueCueLayerDesignRecord(doc.data(), doc.id, workspace.workspaceId));
}

export async function createCampaignCueCueLayerUploadServer(params: {
    input: CampaignCueCueLayerUploadInput;
    scope: CampaignCueSessionScope;
}): Promise<CampaignCueCueLayerUploadResult> {
    if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS || !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD) {
        throw new Error("CueLayers upload is disabled.");
    }
    if (params.input.sourceKind !== "user_upload" && !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS_GENERATED_SOURCE) {
        throw new Error("CueLayers generated sources are disabled.");
    }
    const parsed = parseImageDataUrl(params.input.dataUrl, params.input.mimeType);
    const sha256 = sha256Hex(parsed.buffer);
    const { workspace, businessBrain } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId || buildCampaignCueWorkspaceId(params.scope);
    const idempotencyAction = "cue_layers_upload";
    const requestHash = stableJsonHash({
        action: idempotencyAction,
        fileName: params.input.fileName,
        height: params.input.height,
        mimeType: parsed.mimeType,
        sha256,
        sourceKind: params.input.sourceKind,
        title: params.input.title,
        width: params.input.width,
    });
    const idempotency = await claimCueLayersIdempotency({
        action: idempotencyAction,
        idempotencyKey: params.input.idempotencyKey,
        requestHash,
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay?.resultId) {
        const replayDesignId = idempotency.replay.resultId;
        const boot = await bootCampaignCueCueLayerDesignServer({ designId: replayDesignId, scope: params.scope });
        const replayJobId = boot.design.current.jobId;
        let job: CampaignCueCueLayerJob | undefined;
        if (replayJobId) {
            const jobSnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOBS)
                .doc(replayJobId)
                .get();
            job = jobSnap.exists
                ? parseCampaignCueCueLayerJobRecord(jobSnap.data(), jobSnap.id, workspaceId, replayDesignId)
                : undefined;
        } else {
            const jobSnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOBS)
                .where("designId", "==", replayDesignId)
                .limit(1)
                .get();
            const jobDoc = jobSnap.docs[0];
            job = jobDoc
                ? parseCampaignCueCueLayerJobRecord(jobDoc.data(), jobDoc.id, workspaceId, replayDesignId)
                : undefined;
        }
        if (!job) throw new Error("CueLayers replay job is unavailable.");
        return { boot, design: boot.design, job };
    }

    return withUncommittedStorageCleanup(
        "cue_layers_upload",
        async (recordUploadedPath, markCommitted) => {
    const designId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.DESIGN);
    const jobId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.JOB);
    const sourcePackageId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.SOURCE_PACKAGE);
    const reconstructionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.RECONSTRUCTION);
    const projectionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.PROJECTION);
    const versionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.VERSION);
    const ext = getCampaignCueCueLayerExtension(parsed.mimeType);
    const width = parsed.width;
    const height = parsed.height;
    const assetScope = { workspaceId, designId, sourcePackageId, jobId, reconstructionId, versionId };

    const originalPath = buildCueLayersStoragePaths.sourceOriginal(workspaceId, designId, sourcePackageId, ext);
    const originalUpload = await uploadStorageObject({
        buffer: parsed.buffer,
        cacheControl: "private, max-age=31536000, immutable",
        contentType: parsed.mimeType,
        customMetadata: {
            retentionClass: "source_durable",
            sha256,
            workspaceId,
            designId,
            sourcePackageId,
        },
        path: originalPath,
    });
    recordUploadedPath(originalPath);
    const originalAsset = buildCueLayerAssetRef({
        contentType: parsed.mimeType,
        height,
        retentionClass: "source_durable",
        scope: assetScope,
        sha256,
        sizeBytes: originalUpload.size,
        storageGeneration: originalUpload.generation,
        storageMetageneration: originalUpload.metageneration,
        storagePath: originalPath,
        width,
    });
    const editorReferenceAsset = originalAsset;

    const rightsSnapshot = {
        sourceRightsStatus: "owner_uploaded_claimed" as const,
        containsPerson: false,
        containsLogo: Boolean(businessBrain.brandKit.logoUrl),
        watermarkDetected: false,
    };
    const sourceSnapshots = {
        brand: brandSnapshot(businessBrain),
        businessTruth: businessTruthSnapshot(businessBrain),
        protectedText: protectedTextSnapshot(businessBrain),
        rights: rightsSnapshot,
    };

    const sourcePackage: CampaignCueCreativeSourcePackage = {
        createdAt: nowTimestamp(),
        createdByUserId: params.scope.userId,
        designId,
        editorReferenceAssetId: editorReferenceAsset.assetId,
        height,
        mimeType: parsed.mimeType,
        normalizedAssetId: editorReferenceAsset.assetId,
        originalAssetId: originalAsset.assetId,
        provenance: {
            fileName: params.input.fileName,
            sourceHash: sha256,
        },
        rights: rightsSnapshot,
        schemaVersion: CAMPAIGNCUE_CUE_LAYERS.SCHEMA_VERSION,
        sha256,
        snapshots: sourceSnapshots,
        sourceKind: params.input.sourceKind,
        sourcePackageId,
        updatedAt: nowTimestamp(),
        width,
        workspaceId,
    };
    const sourcePackageAsset = await uploadJsonArtifact({
        assetId: sourcePackageId,
        path: buildCueLayersStoragePaths.sourcePackage(workspaceId, designId, sourcePackageId),
        retentionClass: "source_durable",
        scope: assetScope,
        value: {
            ...sourcePackage,
            assets: {
                originalAsset,
                editorReferenceAsset,
            },
        },
    });
    recordUploadedPath(sourcePackageAsset.storagePath);

    const built = buildCampaignCueCueLayerProjection({
        businessBrain,
        designId,
        editorReferenceAsset,
        jobId,
        projectionId,
        reconstructionId,
        sourcePackage,
        versionId,
    });

    const layerIndexAsset = await uploadJsonArtifact({
        path: buildCueLayersStoragePaths.layerIndex(workspaceId, designId, versionId),
        retentionClass: "runtime_durable",
        scope: assetScope,
        value: built.layerIndex,
    });
    recordUploadedPath(layerIndexAsset.storagePath);
    const editorSnapshotAsset = await uploadJsonArtifact({
        assetId: versionId,
        path: buildCueLayersStoragePaths.editorDocumentSnapshot(workspaceId, designId, versionId),
        retentionClass: "runtime_durable",
        scope: assetScope,
        value: dehydrateCampaignCueCueLayerDocumentAssets(built.document, collectLayerAssetIds(built.layerIndex)),
    });
    recordUploadedPath(editorSnapshotAsset.storagePath);
    const now = nowTimestamp();
    const design: CampaignCueCueLayerDesign = {
        createdAt: now,
        createdByUserId: params.scope.userId,
        current: {
            creativeEditorDocumentSnapshotAssetId: editorSnapshotAsset.assetId,
            jobId,
            layerIndexAssetId: layerIndexAsset.assetId,
            layerIndexVersionId: versionId,
            revision: 1,
            versionId,
        } as CampaignCueCueLayerDesign["current"],
        id: designId,
        quality: {
            textSafetyStatus: "needs_review",
            visualMatchScore: 1,
            warningCount: 1,
        },
        source: {
            currentSourcePackageAssetId: sourcePackageAsset.assetId,
            kind: params.input.sourceKind,
            originalAssetId: originalAsset.assetId,
        },
        status: "needs_review",
        title: params.input.title || `${safeTitle(params.input.fileName)} layered edit`,
        updatedAt: now,
        workspaceId,
    };
    const job: CampaignCueCueLayerJob = {
        attempt: 1,
        completedAt: now,
        createdAt: now,
        createdByUserId: params.scope.userId,
        currentArtifactIds: {
            editorSnapshotAssetId: editorSnapshotAsset.assetId,
            layerIndexAssetId: layerIndexAsset.assetId,
            sourcePackageAssetId: sourcePackageAsset.assetId,
        },
        designId,
        id: jobId,
        idempotencyKey: params.input.idempotencyKey,
        outcome: "flat_safe",
        progress: 100,
        sourceKind: params.input.sourceKind,
        sourcePackageAssetId: sourcePackageAsset.assetId,
        status: "completed",
        step: "validating",
        updatedAt: now,
        workspaceId,
    };
    await firestoreAdmin.runTransaction(async (transaction) => {
        const [, idempotencySnap] = await Promise.all([
            assertCurrentCueLayersWorkspaceAccess(transaction, params.scope, workspaceId),
            idempotency.ref && idempotency.claimId ? transaction.get(idempotency.ref) : Promise.resolve(null),
        ]);
        if (idempotencySnap && idempotency.claimId) {
            assertCampaignCueCueLayersClaimOwnership(idempotencySnap.exists ? idempotencySnap.data() : null, {
                action: idempotencyAction,
                actorId: params.scope.userId,
                requestHash,
            }, idempotency.claimId);
        }
        transaction.set(workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS).doc(design.id), sanitizeForAdminFirestore(design));
        transaction.set(workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOBS).doc(job.id), sanitizeForAdminFirestore(job));
        transaction.set(workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_VERSIONS).doc(versionId), sanitizeForAdminFirestore({
            id: versionId,
            workspaceId,
            designId,
            revision: 1,
            creativeEditorDocumentSnapshotAssetId: editorSnapshotAsset.assetId,
            creativeEditorDocumentSnapshotPath: editorSnapshotAsset.storagePath,
            layerIndexAssetId: layerIndexAsset.assetId,
            layerIndexPath: layerIndexAsset.storagePath,
            createdByUserId: params.scope.userId,
            createdAt: now,
        }));
        if (idempotency.ref) {
            transaction.set(idempotency.ref, cueLayersIdempotencyCompletion({
                action: idempotencyAction,
                actorId: params.scope.userId,
                claimId: idempotency.claimId,
                requestHash,
                resultId: designId,
            }), { merge: true });
        }
    });
    markCommitted();
    const hydratedDocument = await hydrateDocumentAssets(built.document, built.layerIndex);
    return {
        boot: {
            design,
            document: hydratedDocument,
            layerIndex: built.layerIndex,
        },
        design,
        job,
    };
        },
    );
}

async function getCueLayerDesign(params: { designId: string; scope: CampaignCueSessionScope }) {
    const { workspace } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS)
        .doc(params.designId)
        .get();
    if (!snap.exists) throw new Error("CueLayers design not found.");
    return { design: parseCampaignCueCueLayerDesignRecord(snap.data(), snap.id, workspaceId), workspaceId };
}

export async function readCampaignCueCueLayerJobServer(params: {
    jobId: string;
    scope: CampaignCueSessionScope;
}) {
    const { workspace } = await ensureCampaignCueWorkspaceServer(params.scope);
    const snap = await workspaceSubcollection(workspace.workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOBS)
        .doc(params.jobId)
        .get();
    if (!snap.exists) throw new Error("CueLayers job not found.");
    return parseCampaignCueCueLayerJobRecord(snap.data(), snap.id, workspace.workspaceId);
}

export async function bootCampaignCueCueLayerDesignServer(params: {
    designId: string;
    scope: CampaignCueSessionScope;
}): Promise<CampaignCueCueLayerBootPackage> {
    const { design, workspaceId } = await getCueLayerDesign(params);
    const versionId = (design.current as CampaignCueCueLayerDesign["current"] & { versionId?: string }).versionId;
    if (!versionId) throw new Error("CueLayers version pointer is missing.");
    const layerIndexVersionId = (design.current as CampaignCueCueLayerDesign["current"] & { layerIndexVersionId?: string }).layerIndexVersionId || versionId;
    const documentPath = buildCueLayersStoragePaths.editorDocumentSnapshot(workspaceId, design.id, versionId);
    const layerIndexPath = buildCueLayersStoragePaths.layerIndex(workspaceId, design.id, layerIndexVersionId);
    const [documentArtifact, layerIndexArtifact] = await Promise.all([
        readJsonArtifact(documentPath, CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES),
        readJsonArtifact(layerIndexPath, CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES),
    ]);
    const documentValue = parseCueLayerEditorDocumentRecord(documentArtifact, design.id, workspaceId);
    const layerIndex = parseCampaignCueCueLayerIndexArtifact(layerIndexArtifact, design.id, workspaceId);
    return {
        design,
        document: await hydrateDocumentAssets(documentValue, layerIndex),
        layerIndex,
    };
}

export async function autosaveCampaignCueCueLayerDesignServer(params: {
    designId: string;
    input: CampaignCueCueLayerAutosaveInput;
    scope: CampaignCueSessionScope;
}) {
    const { design, workspaceId } = await getCueLayerDesign(params);
    const expectedRevision = params.input.expectedRevision ?? design.current.revision;
    assertCampaignCueCueLayerDocumentScope(params.input.document as unknown as CreativeEditorDocument, design.id, workspaceId);
    const layerIndexVersionId = (design.current as CampaignCueCueLayerDesign["current"] & { layerIndexVersionId?: string; versionId?: string }).layerIndexVersionId
        || (design.current as CampaignCueCueLayerDesign["current"] & { versionId?: string }).versionId;
    if (!layerIndexVersionId) throw new Error("CueLayers layer index is unavailable.");
    const currentLayerIndexArtifact = await readJsonArtifact(
        buildCueLayersStoragePaths.layerIndex(workspaceId, design.id, layerIndexVersionId),
        CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES,
    );
    const currentLayerIndex = parseCampaignCueCueLayerIndexArtifact(currentLayerIndexArtifact, design.id, workspaceId);
    const dehydrated = dehydrateCampaignCueCueLayerDocumentAssets(
        params.input.document as unknown as CreativeEditorDocument,
        collectLayerAssetIds(currentLayerIndex),
    );
    const idempotencyAction = "cue_layers_autosave";
    const requestHash = stableJsonHash({
        action: idempotencyAction,
        designId: design.id,
        document: params.input.document,
        expectedRevision,
    });
    const idempotency = await claimCueLayersIdempotency({
        action: idempotencyAction,
        idempotencyKey: params.input.idempotencyKey,
        requestHash,
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay) {
        if (idempotency.replay.resultId !== design.id) {
            throw new CampaignCueCueLayersIdempotencyConflictError();
        }
        if (idempotency.replay.responseError) {
            return {
                error: idempotency.replay.responseError,
                status: (idempotency.replay.responseStatus || 409) as 409,
            };
        }
        if (
            idempotency.replay.resultRevision === undefined
            || idempotency.replay.resultRevision !== design.current.revision
        ) {
            return {
                error: "This saved retry belongs to an older design revision. Refresh before continuing.",
                status: 409 as const,
            };
        }
        return { design, revision: design.current.revision, replayed: true as const };
    }
    if (expectedRevision !== design.current.revision) {
        await completeCueLayersIdempotencyClaim({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            ref: idempotency.ref,
            requestHash,
            responseError: "This design changed in another session. Refresh before saving.",
            responseStatus: 409,
            resultId: design.id,
        });
        return { error: "This design changed in another session. Refresh before saving.", status: 409 as const };
    }
    const nextRevision = expectedRevision + 1;
    const versionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.VERSION);
    const scope = { workspaceId, designId: design.id, versionId };
    const documentAsset = await uploadJsonArtifact({
        assetId: versionId,
        path: buildCueLayersStoragePaths.editorDocumentSnapshot(workspaceId, design.id, versionId),
        retentionClass: "runtime_durable",
        scope,
        value: {
            ...dehydrated,
            metadata: {
                ...dehydrated.metadata,
                cueLayers: {
                    ...dehydrated.metadata?.cueLayers,
                    designId: design.id,
                    revision: nextRevision,
                },
            },
        },
    });
    const designRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS).doc(design.id);
    let committedDesign: CampaignCueCueLayerDesign | null;
    try {
        committedDesign = await firestoreAdmin.runTransaction(async (transaction) => {
        const [currentSnap, idempotencySnap] = await Promise.all([
            transaction.get(designRef),
            idempotency.ref ? transaction.get(idempotency.ref) : Promise.resolve(null),
            assertCurrentCueLayersWorkspaceAccess(transaction, params.scope, workspaceId),
        ]);
        if (idempotencySnap && idempotency.claimId) {
            assertCampaignCueCueLayersClaimOwnership(idempotencySnap.data(), {
                action: idempotencyAction,
                actorId: params.scope.userId,
                requestHash,
            }, idempotency.claimId);
        }
        if (!currentSnap.exists) return null;
        const currentDesign = parseCampaignCueCueLayerDesignRecord(currentSnap.data(), currentSnap.id, workspaceId);
        if (currentDesign.current.revision !== expectedRevision) {
            if (idempotency.ref) {
                transaction.set(idempotency.ref, cueLayersIdempotencyCompletion({
                    action: idempotencyAction,
                    actorId: params.scope.userId,
                    claimId: idempotency.claimId,
                    requestHash,
                    responseError: "This design changed in another session. Refresh before saving.",
                    responseStatus: 409,
                    resultId: design.id,
                }), { merge: true });
            }
            return null;
        }
        const now = nowTimestamp();
        const update = {
            current: {
                ...currentDesign.current,
                creativeEditorDocumentSnapshotAssetId: documentAsset.assetId,
                layerIndexVersionId,
                revision: nextRevision,
                versionId,
            },
            updatedAt: now,
        };
        transaction.set(designRef, sanitizeForAdminFirestore(update), { merge: true });
        transaction.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_VERSIONS).doc(versionId),
            sanitizeForAdminFirestore({
                id: versionId,
                workspaceId,
                designId: design.id,
                revision: nextRevision,
                creativeEditorDocumentSnapshotAssetId: documentAsset.assetId,
                creativeEditorDocumentSnapshotPath: documentAsset.storagePath,
                layerIndexAssetId: currentDesign.current.layerIndexAssetId,
                layerIndexPath: layerIndexVersionId
                    ? buildCueLayersStoragePaths.layerIndex(workspaceId, design.id, layerIndexVersionId)
                    : undefined,
                createdByUserId: params.scope.userId,
                createdAt: now,
            }),
        );
        if (idempotency.ref) {
            transaction.set(idempotency.ref, cueLayersIdempotencyCompletion({
                action: idempotencyAction,
                actorId: params.scope.userId,
                claimId: idempotency.claimId,
                requestHash,
                resultId: design.id,
                resultRevision: nextRevision,
            }), { merge: true });
        }
        return {
            ...currentDesign,
            ...update,
        } as CampaignCueCueLayerDesign;
        });
    } catch (error) {
        await deleteStorageObjectBestEffort(documentAsset.storagePath, "autosave_snapshot");
        throw error;
    }
    if (!committedDesign) {
        await deleteStorageObjectBestEffort(documentAsset.storagePath, "autosave_snapshot");
        return { error: "This design changed in another session. Refresh before saving.", status: 409 as const };
    }
    return {
        design: committedDesign,
        revision: nextRevision,
    };
}

export async function repairCampaignCueCueLayerDesignServer(params: {
    designId: string;
    input: CampaignCueCueLayerRepairInput;
    scope: CampaignCueSessionScope;
}) {
    const { design, workspaceId } = await getCueLayerDesign(params);
    if (params.input.layerId) {
        const layerIndexVersionId = design.current.layerIndexVersionId || design.current.versionId;
        if (!layerIndexVersionId) {
            return { error: "This design does not have a reusable layer index.", status: 409 as const };
        }
        const layerIndex = parseCampaignCueCueLayerIndexArtifact(
            await readJsonArtifact(
                buildCueLayersStoragePaths.layerIndex(workspaceId, design.id, layerIndexVersionId),
                CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES,
            ),
            design.id,
            workspaceId,
        );
        if (!layerIndex.entries.some((entry) => entry.layerId === params.input.layerId)) {
            return { error: "This reusable layer is no longer available.", status: 409 as const };
        }
    }
    const idempotencyAction = "cue_layers_repair";
    const requestHash = stableJsonHash({
        action: idempotencyAction,
        correctionType: params.input.correctionType,
        designId: design.id,
        expectedRevision: params.input.expectedRevision,
        layerId: params.input.layerId,
    });
    const idempotency = await claimCueLayersIdempotency({
        action: idempotencyAction,
        idempotencyKey: params.input.idempotencyKey,
        requestHash,
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay) {
        if (idempotency.replay.responseError) {
            return {
                error: idempotency.replay.responseError,
                status: (idempotency.replay.responseStatus || 409) as 409,
            };
        }
        return {
            message: "Original fallback is available.",
            repairId: idempotency.replay.resultId,
            replayed: true as const,
            status: "ready" as const,
        };
    }
    if (params.input.expectedRevision !== design.current.revision) {
        await completeCueLayersIdempotencyClaim({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            ref: idempotency.ref,
            requestHash,
            responseError: "This design changed in another session. Refresh before repair.",
            responseStatus: 409,
            resultId: design.id,
        });
        return { error: "This design changed in another session. Refresh before repair.", status: 409 as const };
    }
    const repairId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.REPAIR);
    const designRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS).doc(design.id);
    const committed = await firestoreAdmin.runTransaction(async (transaction) => {
        const [currentSnap, idempotencySnap] = await Promise.all([
            transaction.get(designRef),
            idempotency.ref ? transaction.get(idempotency.ref) : Promise.resolve(null),
            assertCurrentCueLayersWorkspaceAccess(transaction, params.scope, workspaceId),
        ]);
        if (idempotencySnap && idempotency.claimId) {
            assertCampaignCueCueLayersClaimOwnership(idempotencySnap.data(), {
                action: idempotencyAction,
                actorId: params.scope.userId,
                requestHash,
            }, idempotency.claimId);
        }
        if (!currentSnap.exists) return false;
        const currentDesign = parseCampaignCueCueLayerDesignRecord(currentSnap.data(), currentSnap.id, workspaceId);
        if (currentDesign.current.revision !== params.input.expectedRevision) {
            if (idempotency.ref) {
                transaction.set(idempotency.ref, cueLayersIdempotencyCompletion({
                    action: idempotencyAction,
                    actorId: params.scope.userId,
                    claimId: idempotency.claimId,
                    requestHash,
                    responseError: "This design changed in another session. Refresh before repair.",
                    responseStatus: 409,
                    resultId: design.id,
                }), { merge: true });
            }
            return false;
        }
        const now = nowTimestamp();
        transaction.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_REPAIR_REQUESTS).doc(repairId),
            sanitizeForAdminFirestore({
                id: repairId,
                workspaceId,
                designId: design.id,
                layerId: params.input.layerId,
                correctionType: params.input.correctionType,
                sourceRevision: currentDesign.current.revision,
                status: "ready",
                safeMessage: "Original fallback is available.",
                createdByUserId: params.scope.userId,
                createdAt: now,
                updatedAt: now,
            }),
        );
        if (idempotency.ref) {
            transaction.set(idempotency.ref, cueLayersIdempotencyCompletion({
                action: idempotencyAction,
                actorId: params.scope.userId,
                claimId: idempotency.claimId,
                requestHash,
                resultId: repairId,
                resultRevision: currentDesign.current.revision,
            }), { merge: true });
        }
        return true;
    });
    if (!committed) {
        return { error: "This design changed in another session. Refresh before repair.", status: 409 as const };
    }
    return { repairId, status: "ready" as const, message: "Original fallback is available." };
}

export async function exportCampaignCueCueLayerDesignServer(params: {
    designId: string;
    input: CampaignCueCueLayerExportInput;
    scope: CampaignCueSessionScope;
}) {
    const { design, workspaceId } = await getCueLayerDesign(params);
    assertCampaignCueCueLayerDocumentScope(params.input.document as unknown as CreativeEditorDocument, design.id, workspaceId);
    const renderedExport = parseRenderedExportDataUrl(params.input.renderedDataUrl, params.input.format);
    const renderedSha256 = sha256Hex(renderedExport.buffer);
    const idempotencyAction = "cue_layers_export";
    const requestHash = stableJsonHash({
        action: idempotencyAction,
        designId: design.id,
        document: params.input.document,
        format: params.input.format,
        renderedSha256,
        sourceRevision: params.input.sourceRevision,
    });
    const idempotency = await claimCueLayersIdempotency({
        action: idempotencyAction,
        idempotencyKey: params.input.idempotencyKey,
        requestHash,
        scope: params.scope,
        workspaceId,
    });
    if (idempotency.replay) {
        if (idempotency.replay.responseError) {
            return {
                error: idempotency.replay.responseError,
                status: (idempotency.replay.responseStatus || 409) as 409,
            };
        }
        const replayResultId = idempotency.replay.resultId;
        if (!replayResultId) {
            throw new CampaignCueCueLayersIdempotencyConflictError(
                "The saved export retry result is incomplete.",
            );
        }
        const exportSnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_EXPORTS)
            .doc(replayResultId)
            .get();
        const exportRecord = parseCueLayerExportReplayRecord(
            exportSnap.exists ? exportSnap.data() : null,
            replayResultId,
            design.id,
            workspaceId,
        );
        if (idempotency.replay.secondaryResultId && idempotency.replay.secondaryResultId !== exportRecord.outputAssetId) {
            throw new CampaignCueCueLayersIdempotencyConflictError("The saved export retry result does not match its asset.");
        }
        const assetSnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS)
            .doc(exportRecord.outputAssetId)
            .get();
        return {
            asset: parseCueLayerExportAssetRecord(
                assetSnap.exists ? assetSnap.data() : null,
                exportRecord.outputAssetId,
                workspaceId,
            ),
            exportId: idempotency.replay.resultId,
            replayed: true as const,
            status: "ready" as const,
        };
    }
    if (params.input.sourceRevision !== design.current.revision) {
        await completeCueLayersIdempotencyClaim({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            ref: idempotency.ref,
            requestHash,
            responseError: "Save the latest edit before exporting.",
            responseStatus: 409,
            resultId: design.id,
        });
        return { error: "Save the latest edit before exporting.", status: 409 as const };
    }
    const savedVersionId = design.current.versionId;
    if (!savedVersionId) throw new Error("CueLayers saved editor version is unavailable.");
    const savedDocument = parseCueLayerEditorDocumentRecord(
        await readJsonArtifact(
            buildCueLayersStoragePaths.editorDocumentSnapshot(workspaceId, design.id, savedVersionId),
            CAMPAIGNCUE_CUE_LAYERS.MAX_EDITOR_DOCUMENT_BYTES,
        ),
        design.id,
        workspaceId,
    );
    const submittedDocument = params.input.document as unknown as CreativeEditorDocument;
    const exportBindingError = getCampaignCueCueLayerExportBindingError({
        renderedHeight: renderedExport.height,
        renderedWidth: renderedExport.width,
        savedDocument,
        submittedDocument,
    });
    if (exportBindingError) {
        await completeCueLayersIdempotencyClaim({
            action: idempotencyAction,
            actorId: params.scope.userId,
            claimId: idempotency.claimId,
            ref: idempotency.ref,
            requestHash,
            responseError: exportBindingError,
            responseStatus: 409,
            resultId: design.id,
        });
        return { error: exportBindingError, status: 409 as const };
    }
    const exportId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.EXPORT);
    const assetId = buildCampaignCueCueLayerId(CAMPAIGNCUE_ASSET_ID_PREFIX);
    const eventId = buildCampaignCueCueLayerId(CAMPAIGNCUE_EVENT_ID_PREFIX);
    const ext = params.input.format === "jpeg" ? "jpg" : params.input.format;
    const exportOutputPath = buildCueLayersStoragePaths.exportOutput(workspaceId, design.id, exportId, ext);
    const exportUpload = await uploadStorageObject({
        buffer: renderedExport.buffer,
        cacheControl: "private, max-age=31536000, immutable",
        contentType: renderedExport.mimeType,
        customMetadata: {
            retentionClass: "export_durable",
            sha256: renderedSha256,
            workspaceId,
            designId: design.id,
            exportId,
        },
        path: exportOutputPath,
    });
    const now = nowTimestamp();
    const asset: CampaignCueAsset = {
        id: assetId,
        workspaceId,
        name: `${design.title} export`,
        assetType: "export",
        status: "ready",
        source: "generated",
        rights: {
            status: "needs_review",
            note: "Exported from CueLayers. Review source image rights before public use.",
            consentType: "not_applicable",
        },
        tags: ["cue-layers", params.input.format],
        file: {
            storagePath: exportOutputPath,
            storageGeneration: exportUpload.generation,
            mimeType: renderedExport.mimeType,
            sizeBytes: exportUpload.size,
        },
        usageRefs: [],
        createdAt: now,
        updatedAt: now,
    };
    const designRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS).doc(design.id);
    let committed: boolean;
    try {
        committed = await firestoreAdmin.runTransaction(async (transaction) => {
        const [currentSnap, idempotencySnap] = await Promise.all([
            transaction.get(designRef),
            idempotency.ref ? transaction.get(idempotency.ref) : Promise.resolve(null),
            assertCurrentCueLayersWorkspaceAccess(transaction, params.scope, workspaceId),
        ]);
        if (idempotencySnap && idempotency.claimId) {
            assertCampaignCueCueLayersClaimOwnership(idempotencySnap.data(), {
                action: idempotencyAction,
                actorId: params.scope.userId,
                requestHash,
            }, idempotency.claimId);
        }
        if (!currentSnap.exists) return false;
        const currentDesign = parseCampaignCueCueLayerDesignRecord(currentSnap.data(), currentSnap.id, workspaceId);
        if (currentDesign.current.revision !== params.input.sourceRevision) {
            if (idempotency.ref) {
                transaction.set(idempotency.ref, cueLayersIdempotencyCompletion({
                    action: idempotencyAction,
                    actorId: params.scope.userId,
                    claimId: idempotency.claimId,
                    requestHash,
                    responseError: "Save the latest edit before exporting.",
                    responseStatus: 409,
                    resultId: design.id,
                }), { merge: true });
            }
            return false;
        }
        transaction.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.ASSETS).doc(asset.id),
            sanitizeForAdminFirestore(asset),
        );
        transaction.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.EVENTS).doc(eventId),
            sanitizeForAdminFirestore({
                workspaceId,
                actorId: params.scope.userId,
                action: "asset_registered",
                metadata: { assetId: asset.id, assetType: asset.assetType, rightsStatus: asset.rights.status },
                confidence: "observed",
                createdAt: now,
            }),
        );
        transaction.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_EXPORTS).doc(exportId),
            sanitizeForAdminFirestore({
                id: exportId,
                workspaceId,
                designId: currentDesign.id,
                versionId: currentDesign.current.versionId,
                sourceRevision: params.input.sourceRevision,
                format: params.input.format,
                status: "ready",
                sourceCreativeEditorDocumentSnapshotAssetId: currentDesign.current.creativeEditorDocumentSnapshotAssetId,
                outputAssetId: asset.id,
                sizeBytes: exportUpload.size,
                storageGeneration: exportUpload.generation,
                storagePath: exportOutputPath,
                createdByUserId: params.scope.userId,
                createdAt: now,
                updatedAt: now,
            }),
        );
        if (idempotency.ref) {
            transaction.set(idempotency.ref, cueLayersIdempotencyCompletion({
                action: idempotencyAction,
                actorId: params.scope.userId,
                claimId: idempotency.claimId,
                requestHash,
                resultId: exportId,
                resultRevision: currentDesign.current.revision,
                secondaryResultId: asset.id,
            }), { merge: true });
        }
            return true;
        });
    } catch (error) {
        await deleteStorageObjectBestEffort(exportOutputPath, "export_output");
        throw error;
    }
    if (!committed) {
        await deleteStorageObjectBestEffort(exportOutputPath, "stale_export_output");
        return { error: "Save the latest edit before exporting.", status: 409 as const };
    }
    return { asset, exportId, status: "ready" as const };
}

export function buildCampaignCueCueLayersApiError(error: unknown, fallbackMessage: string) {
    logCampaignCueServerError("CampaignCue CueLayers API error", error, { feature: "cue-layers" });
    if (error instanceof CampaignCueCueLayersIdempotencyConflictError) {
        return {
            body: { code: error.code, error: error.clientMessage },
            status: error.status,
        };
    }
    return buildCampaignCueApiError(error, fallbackMessage);
}
