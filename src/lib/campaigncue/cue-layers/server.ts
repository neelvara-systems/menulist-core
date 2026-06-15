import { FEATURE_FLAGS } from "@config/features";
import {
    CAMPAIGNCUE_COLLECTIONS,
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
import { logger } from "@lib/monitoring/logger";
import type { CampaignCueAssetInput } from "@lib/validation/campaigncueSchemas";
import type {
    CampaignCueCueLayerAutosaveInput,
    CampaignCueCueLayerExportInput,
    CampaignCueCueLayerRepairInput,
    CampaignCueCueLayerUploadInput,
} from "@lib/validation/campaigncueCueLayersSchemas";
import type { CampaignCueBusinessBrain } from "@type/campaigncue";
import type {
    CampaignCueCreativeEditorDocumentSnapshot,
    CampaignCueCreativeSourcePackage,
    CampaignCueCueLayerAssetRef,
    CampaignCueCueLayerBootPackage,
    CampaignCueCueLayerDesign,
    CampaignCueCueLayerIndex,
    CampaignCueCueLayerJob,
    CampaignCueCueLayerQualityReport,
    CampaignCueCueLayerUploadResult,
} from "@type/campaigncueCueLayers";
import type { CreativeEditorDocument, CreativeEditorElement } from "@/modules/creative-editor/types";
import {
    buildCampaignCueApiError,
    buildCampaignCueWorkspaceId,
    createCampaignCueAssetServer,
    ensureCampaignCueWorkspaceServer,
    type CampaignCueSessionScope,
} from "../server";
import { buildCampaignCueCueLayerProjection } from "./editorProjection";
import {
    buildCampaignCueCueAssetUri,
    buildCampaignCueCueLayerId,
    buildCueLayerAssetRef,
    buildCueLayersStoragePaths,
    getCampaignCueCueLayerExtension,
    parseCampaignCueCueAssetUri,
    sha256Hex,
    stableJsonHash,
} from "./storagePaths";

const nowTimestamp = () => admin.firestore.Timestamp.now();
type CampaignCueCueLayerFirestoreBatch = ReturnType<typeof firestoreAdmin.batch>;

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value !== "object") return value;
    if (typeof value?.toDate === "function" && typeof value?.seconds === "number") {
        return admin.firestore.Timestamp.fromDate(value.toDate());
    }
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, sanitizeForAdminFirestore(nested)]));
};

const workspaceRef = (workspaceId: string) => (
    firestoreAdmin.collection(CAMPAIGNCUE_COLLECTIONS.WORKSPACES).doc(workspaceId)
);

const workspaceSubcollection = (workspaceId: string, collection: string) => (
    workspaceRef(workspaceId).collection(collection)
);

const jsonBuffer = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2), "utf8");

const safeTitle = (value: string) => (
    value.trim().replace(/\.[a-z0-9]+$/i, "").slice(0, 100) || "CueLayers image"
);

function parseImageDataUrl(dataUrl: string, expectedMimeType: string) {
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) throw new Error("Unsupported image upload.");
    const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
    if (mimeType !== expectedMimeType) throw new Error("Upload MIME type does not match the image data.");
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > CAMPAIGNCUE_CUE_LAYERS.MAX_UPLOAD_BYTES) {
        throw new Error("Upload is empty or too large.");
    }
    return { buffer, mimeType };
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
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > CAMPAIGNCUE_CUE_LAYERS.MAX_EXPORT_BYTES) {
        throw new Error("Rendered export is empty or too large.");
    }
    return { buffer, mimeType };
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

async function readJsonArtifact<T>(path: string): Promise<T> {
    const [buffer] = await campaigncueStorageAdmin.bucket().file(path).download();
    return JSON.parse(buffer.toString("utf8")) as T;
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

async function hydrateDocumentAssets(documentValue: CreativeEditorDocument, layerIndex: CampaignCueCueLayerIndex) {
    const assets = collectLayerAssets(layerIndex);
    const hydratedEntries = await Promise.all(Array.from(assets.values()).map(async (asset) => ({
        asset,
        url: await signedUrlForAsset(asset),
    })));
    const urlByAssetId = new Map(hydratedEntries.map((entry) => [entry.asset.assetId, entry.url]));
    const elements = documentValue.elements.map((element) => {
        if (element.type !== "image") return element;
        const assetId = parseCampaignCueCueAssetUri(element.src)
            || parseCampaignCueCueAssetUri(element.sourceRefs?.find((ref) => ref.sourceRef?.startsWith("cue-asset://"))?.sourceRef);
        if (!assetId) return element;
        return {
            ...element,
            src: urlByAssetId.get(assetId) || element.src,
        };
    });
    return { ...documentValue, elements };
}

function dehydrateDocumentAssets(
    documentValue: CreativeEditorDocument,
    allowedAssetIds?: Set<string>,
): CampaignCueCreativeEditorDocumentSnapshot {
    const elements = documentValue.elements.map((element) => {
        if (element.type !== "image") return element;
        const sourceAssetUri = element.sourceRefs?.find((ref) => ref.sourceRef?.startsWith("cue-asset://"))?.sourceRef;
        const directAssetUri = element.src?.startsWith("cue-asset://") ? element.src : "";
        const assetId = parseCampaignCueCueAssetUri(sourceAssetUri || directAssetUri);
        if (!sourceAssetUri && !directAssetUri) {
            throw new Error("CueLayers image edits must use product-owned asset references.");
        }
        if (!assetId || (allowedAssetIds && !allowedAssetIds.has(assetId))) {
            throw new Error("CueLayers image edits must reference an existing design asset.");
        }
        if (/^(javascript|data):/i.test(element.src)) {
            throw new Error("CueLayers image edits cannot persist unsafe image URLs.");
        }
        return {
            ...element,
            src: sourceAssetUri || directAssetUri,
        };
    });
    return {
        ...documentValue,
        elements,
        metadata: {
            ...documentValue.metadata,
            updatedAt: new Date().toISOString(),
        },
    } as CampaignCueCreativeEditorDocumentSnapshot;
}

async function checkCueLayersIdempotency(params: {
    action: string;
    idempotencyKey?: string;
    resultId?: string;
    scope: CampaignCueSessionScope;
    workspaceId: string;
}) {
    if (!params.idempotencyKey) return null;
    const ref = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS).doc(params.idempotencyKey);
    try {
        await ref.create(sanitizeForAdminFirestore({
            id: params.idempotencyKey,
            action: params.action,
            actorId: params.scope.userId,
            status: "in_progress",
            createdAt: nowTimestamp(),
        }));
        return null;
    } catch (error) {
        const snap = await ref.get();
        const existing = snap.exists ? snap.data() as { action?: string; resultId?: string; status?: string } : null;
        if (existing?.action !== params.action) {
            throw new Error("This idempotency key was already used for another CampaignCue action.");
        }
        return existing?.resultId || null;
    }
}

function enqueueCueLayerEvent(batch: CampaignCueCueLayerFirestoreBatch, params: {
    action: string;
    createdAt?: unknown;
    designId?: string;
    jobId?: string;
    metadata?: Record<string, unknown>;
    scope: CampaignCueSessionScope;
    workspaceId: string;
}) {
    const ref = workspaceSubcollection(params.workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOB_EVENTS)
        .doc(buildCampaignCueCueLayerId("cccl_event"));
    batch.set(ref, sanitizeForAdminFirestore({
        id: ref.id,
        workspaceId: params.workspaceId,
        actorId: params.scope.userId,
        action: params.action,
        designId: params.designId,
        jobId: params.jobId,
        metadata: params.metadata || {},
        createdAt: params.createdAt || nowTimestamp(),
    }));
}

function businessTruthSnapshot(businessBrain: CampaignCueBusinessBrain) {
    return {
        businessName: businessBrain.name,
        locality: businessBrain.locality || "",
        contacts: businessBrain.contacts,
        catalog: businessBrain.catalog,
        brandVoice: businessBrain.brandKit.voice,
        sourceSnapshotId: businessBrain.sourceSnapshotId,
        snapshotHash: stableJsonHash({
            name: businessBrain.name,
            contacts: businessBrain.contacts,
            catalog: businessBrain.catalog,
        }),
    };
}

function protectedTextSnapshot(businessBrain: CampaignCueBusinessBrain) {
    return [
        businessBrain.name,
        businessBrain.locality,
        businessBrain.contacts.phone,
        businessBrain.contacts.website,
        businessBrain.contacts.whatsapp,
        businessBrain.contacts.bookingUrl,
        businessBrain.contacts.publicMenuUrl,
        ...businessBrain.catalog.items.map((item) => item.name),
        ...businessBrain.catalog.services.map((service) => service.name),
    ].filter(Boolean);
}

function brandSnapshot(businessBrain: CampaignCueBusinessBrain) {
    return {
        name: businessBrain.name,
        primaryColor: businessBrain.brandKit.primaryColor,
        logoUrl: businessBrain.brandKit.logoUrl,
        voice: businessBrain.brandKit.voice,
    };
}

export async function listCampaignCueCueLayerDesignsServer(scope: CampaignCueSessionScope): Promise<CampaignCueCueLayerDesign[]> {
    const { workspace } = await ensureCampaignCueWorkspaceServer(scope);
    const snap = await workspaceSubcollection(workspace.workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS)
        .orderBy("updatedAt", "desc")
        .limit(CAMPAIGNCUE_PAGE_SIZE)
        .get();
    return snap.docs.map((doc) => doc.data() as CampaignCueCueLayerDesign);
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
    const { workspace, businessBrain } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId || buildCampaignCueWorkspaceId(params.scope);
    const replayDesignId = await checkCueLayersIdempotency({
        action: "cue_layers_upload",
        idempotencyKey: params.input.idempotencyKey,
        scope: params.scope,
        workspaceId,
    });
    if (replayDesignId) {
        const boot = await bootCampaignCueCueLayerDesignServer({ designId: replayDesignId, scope: params.scope });
        const replayJobId = boot.design.current.jobId;
        let job: CampaignCueCueLayerJob | undefined;
        if (replayJobId) {
            const jobSnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOBS)
                .doc(replayJobId)
                .get();
            job = jobSnap.data() as CampaignCueCueLayerJob | undefined;
        } else {
            const jobSnap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOBS)
                .where("designId", "==", replayDesignId)
                .limit(1)
                .get();
            job = jobSnap.docs[0]?.data() as CampaignCueCueLayerJob | undefined;
        }
        if (!job) throw new Error("CueLayers replay job is unavailable.");
        return { boot, design: boot.design, job };
    }

    const parsed = parseImageDataUrl(params.input.dataUrl, params.input.mimeType);
    const sha256 = sha256Hex(parsed.buffer);
    const designId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.DESIGN);
    const jobId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.JOB);
    const sourcePackageId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.SOURCE_PACKAGE);
    const reconstructionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.RECONSTRUCTION);
    const projectionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.PROJECTION);
    const versionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.VERSION);
    const qualityReportId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.QUALITY_REPORT);
    const ext = getCampaignCueCueLayerExtension(parsed.mimeType);
    const width = params.input.width || 1080;
    const height = params.input.height || 1080;
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

    const businessTruthAsset = await uploadJsonArtifact({
        path: `${buildCueLayersStoragePaths.sourcePackage(workspaceId, designId, sourcePackageId).replace("/package.json", "")}/business-truth.json`,
        retentionClass: "source_durable",
        scope: assetScope,
        value: businessTruthSnapshot(businessBrain),
    });
    const protectedTextAsset = await uploadJsonArtifact({
        path: `${buildCueLayersStoragePaths.sourcePackage(workspaceId, designId, sourcePackageId).replace("/package.json", "")}/protected-text.json`,
        retentionClass: "source_durable",
        scope: assetScope,
        value: protectedTextSnapshot(businessBrain),
    });
    const brandAsset = await uploadJsonArtifact({
        path: `${buildCueLayersStoragePaths.sourcePackage(workspaceId, designId, sourcePackageId).replace("/package.json", "")}/brand.json`,
        retentionClass: "source_durable",
        scope: assetScope,
        value: brandSnapshot(businessBrain),
    });
    const rightsAsset = await uploadJsonArtifact({
        path: `${buildCueLayersStoragePaths.sourcePackage(workspaceId, designId, sourcePackageId).replace("/package.json", "")}/rights.json`,
        retentionClass: "source_durable",
        scope: assetScope,
        value: {
            sourceRightsStatus: "owner_uploaded_claimed",
            containsPerson: false,
            containsLogo: Boolean(businessBrain.brandKit.logoUrl),
            watermarkDetected: false,
        },
    });

    const sourcePackage: CampaignCueCreativeSourcePackage = {
        brandSnapshotAssetId: brandAsset.assetId,
        businessTruthSnapshotAssetId: businessTruthAsset.assetId,
        createdAt: nowTimestamp(),
        createdByUserId: params.scope.userId,
        designId,
        editorReferenceAssetId: editorReferenceAsset.assetId,
        height,
        mimeType: parsed.mimeType,
        normalizedAssetId: editorReferenceAsset.assetId,
        originalAssetId: originalAsset.assetId,
        protectedTextTruthAssetId: protectedTextAsset.assetId,
        provenance: {
            fileName: params.input.fileName,
            sourceHash: sha256,
        },
        rights: {
            containsLogo: Boolean(businessBrain.brandKit.logoUrl),
            containsPerson: false,
            sourceRightsStatus: "owner_uploaded_claimed",
            watermarkDetected: false,
        },
        rightsSnapshotAssetId: rightsAsset.assetId,
        schemaVersion: CAMPAIGNCUE_CUE_LAYERS.SCHEMA_VERSION,
        sha256,
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
                businessTruthAsset,
                protectedTextAsset,
                brandAsset,
                rightsAsset,
            },
        },
    });

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
    const projectionAsset = await uploadJsonArtifact({
        assetId: projectionId,
        path: buildCueLayersStoragePaths.projection(workspaceId, designId, reconstructionId, projectionId),
        retentionClass: "runtime_durable",
        scope: assetScope,
        value: { ...built.projection, layerIndexAssetId: layerIndexAsset.assetId },
    });
    const reconstructionAsset = await uploadJsonArtifact({
        assetId: reconstructionId,
        path: buildCueLayersStoragePaths.reconstruction(workspaceId, designId, reconstructionId),
        retentionClass: "runtime_durable",
        scope: assetScope,
        value: built.reconstruction,
    });
    const editorSnapshotAsset = await uploadJsonArtifact({
        assetId: versionId,
        path: buildCueLayersStoragePaths.editorDocumentSnapshot(workspaceId, designId, versionId),
        retentionClass: "runtime_durable",
        scope: assetScope,
        value: dehydrateDocumentAssets(built.document, collectLayerAssetIds(built.layerIndex)),
    });
    const qualityReport: CampaignCueCueLayerQualityReport = {
        ...built.qualityReport,
        createdAt: nowTimestamp(),
        id: qualityReportId,
        jobId,
        reportAssetId: qualityReportId,
    };
    const qualityAsset = await uploadJsonArtifact({
        assetId: qualityReportId,
        path: buildCueLayersStoragePaths.qualityReport(workspaceId, designId, qualityReportId),
        retentionClass: "diagnostic_temporary",
        scope: assetScope,
        value: qualityReport,
    });
    const now = nowTimestamp();
    const design: CampaignCueCueLayerDesign = {
        createdAt: now,
        createdByUserId: params.scope.userId,
        current: {
            creativeEditorDocumentSnapshotAssetId: editorSnapshotAsset.assetId,
            editorProjectionAssetId: projectionAsset.assetId,
            jobId,
            layerIndexAssetId: layerIndexAsset.assetId,
            reconstructionAssetId: reconstructionAsset.assetId,
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
            brandSnapshotAssetId: brandAsset.assetId,
            businessTruthSnapshotAssetId: businessTruthAsset.assetId,
            currentSourcePackageAssetId: sourcePackageAsset.assetId,
            kind: params.input.sourceKind,
            originalAssetId: originalAsset.assetId,
            protectedTextTruthAssetId: protectedTextAsset.assetId,
            rightsSnapshotAssetId: rightsAsset.assetId,
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
            projectionAssetId: projectionAsset.assetId,
            qualityAssetId: qualityAsset.assetId,
            reconstructionAssetId: reconstructionAsset.assetId,
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
    const batch = firestoreAdmin.batch();
    batch.set(workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS).doc(design.id), sanitizeForAdminFirestore(design));
    batch.set(workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOBS).doc(job.id), sanitizeForAdminFirestore(job));
    batch.set(workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_VERSIONS).doc(versionId), sanitizeForAdminFirestore({
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
    batch.set(workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_QUALITY_REPORTS).doc(qualityReport.id), sanitizeForAdminFirestore({
        ...qualityReport,
        reportAssetId: qualityAsset.assetId,
    }));
    const eventRef = workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_JOB_EVENTS)
        .doc(buildCampaignCueCueLayerId("cccl_event"));
    batch.set(eventRef, sanitizeForAdminFirestore({
        id: eventRef.id,
        workspaceId,
        actorId: params.scope.userId,
        action: "cue_layers_upload_completed",
        designId,
        jobId,
        metadata: { outcome: job.outcome, sourceKind: job.sourceKind },
        createdAt: now,
    }));
    if (params.input.idempotencyKey) {
        batch.set(
            workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.IDEMPOTENCY_KEYS).doc(params.input.idempotencyKey),
            sanitizeForAdminFirestore({
                action: "cue_layers_upload",
                resultId: designId,
                status: "completed",
                updatedAt: now,
            }),
            { merge: true },
        );
    }
    await batch.commit();
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
}

async function getCueLayerDesign(params: { designId: string; scope: CampaignCueSessionScope }) {
    const { workspace } = await ensureCampaignCueWorkspaceServer(params.scope);
    const workspaceId = workspace.workspaceId;
    const snap = await workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS)
        .doc(params.designId)
        .get();
    if (!snap.exists) throw new Error("CueLayers design not found.");
    return { design: snap.data() as CampaignCueCueLayerDesign, workspaceId };
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
    return snap.data() as CampaignCueCueLayerJob;
}

export async function bootCampaignCueCueLayerDesignServer(params: {
    designId: string;
    scope: CampaignCueSessionScope;
}): Promise<CampaignCueCueLayerBootPackage> {
    const { design, workspaceId } = await getCueLayerDesign(params);
    const versionId = (design.current as CampaignCueCueLayerDesign["current"] & { versionId?: string }).versionId;
    if (!versionId) throw new Error("CueLayers version pointer is missing.");
    const documentPath = buildCueLayersStoragePaths.editorDocumentSnapshot(workspaceId, design.id, versionId);
    const layerIndexPath = buildCueLayersStoragePaths.layerIndex(workspaceId, design.id, versionId);
    const [documentValue, layerIndex] = await Promise.all([
        readJsonArtifact<CampaignCueCreativeEditorDocumentSnapshot>(documentPath),
        readJsonArtifact<CampaignCueCueLayerIndex>(layerIndexPath),
    ]);
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
    if (params.input.expectedRevision != null && params.input.expectedRevision !== design.current.revision) {
        return { error: "This design changed in another session. Refresh before saving.", status: 409 as const };
    }
    const layerIndexVersionId = (design.current as CampaignCueCueLayerDesign["current"] & { versionId?: string }).versionId;
    const currentLayerIndex = layerIndexVersionId
        ? await readJsonArtifact<CampaignCueCueLayerIndex>(buildCueLayersStoragePaths.layerIndex(workspaceId, design.id, layerIndexVersionId))
        : { schemaVersion: CAMPAIGNCUE_CUE_LAYERS.LAYER_INDEX_SCHEMA_VERSION, workspaceId, designId: design.id, reconstructionId: "", entries: [] };
    const dehydrated = dehydrateDocumentAssets(
        params.input.document as unknown as CreativeEditorDocument,
        collectLayerAssetIds(currentLayerIndex),
    );
    const nextRevision = design.current.revision + 1;
    const versionId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.VERSION);
    const scope = { workspaceId, designId: design.id, versionId };
    const [documentAsset, layerIndexAsset] = await Promise.all([
        uploadJsonArtifact({
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
        }),
        uploadJsonArtifact({
            path: buildCueLayersStoragePaths.layerIndex(workspaceId, design.id, versionId),
            retentionClass: "runtime_durable",
            scope,
            value: currentLayerIndex,
        }),
    ]);
    const now = nowTimestamp();
    const update = {
        current: {
            ...design.current,
            creativeEditorDocumentSnapshotAssetId: documentAsset.assetId,
            layerIndexAssetId: layerIndexAsset.assetId,
            revision: nextRevision,
            versionId,
        },
        updatedAt: now,
    };
    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_DESIGNS).doc(design.id),
        sanitizeForAdminFirestore(update),
        { merge: true },
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_VERSIONS).doc(versionId),
        sanitizeForAdminFirestore({
            id: versionId,
            workspaceId,
            designId: design.id,
            revision: nextRevision,
            creativeEditorDocumentSnapshotAssetId: documentAsset.assetId,
            creativeEditorDocumentSnapshotPath: documentAsset.storagePath,
            layerIndexAssetId: layerIndexAsset.assetId,
            layerIndexPath: layerIndexAsset.storagePath,
            createdByUserId: params.scope.userId,
            createdAt: now,
        }),
    );
    await batch.commit();
    return {
        design: {
            ...design,
            ...update,
        } as CampaignCueCueLayerDesign,
        revision: nextRevision,
    };
}

export async function repairCampaignCueCueLayerDesignServer(params: {
    designId: string;
    input: CampaignCueCueLayerRepairInput;
    scope: CampaignCueSessionScope;
}) {
    const { design, workspaceId } = await getCueLayerDesign(params);
    if (params.input.expectedRevision !== design.current.revision) {
        return { error: "This design changed in another session. Refresh before repair.", status: 409 as const };
    }
    const repairId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.REPAIR);
    const now = nowTimestamp();
    await uploadJsonArtifact({
        assetId: repairId,
        path: buildCueLayersStoragePaths.repairPatch(workspaceId, design.id, repairId),
        retentionClass: "repair_durable",
        scope: { workspaceId, designId: design.id, repairId },
        value: {
            schemaVersion: CAMPAIGNCUE_CUE_LAYERS.SCHEMA_VERSION,
            repairId,
            designId: design.id,
            sourceRevision: design.current.revision,
            correctionType: params.input.correctionType,
            layerId: params.input.layerId,
            createdAt: new Date().toISOString(),
        },
    });
    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_REPAIR_REQUESTS).doc(repairId),
        sanitizeForAdminFirestore({
            id: repairId,
            workspaceId,
            designId: design.id,
            layerId: params.input.layerId,
            correctionType: params.input.correctionType,
            sourceRevision: design.current.revision,
            status: "ready",
            safeMessage: "Original fallback is available.",
            createdByUserId: params.scope.userId,
            createdAt: now,
            updatedAt: now,
        }),
    );
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_CORRECTION_EVENTS).doc(buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.CORRECTION)),
        sanitizeForAdminFirestore({
            workspaceId,
            designId: design.id,
            correctionType: params.input.correctionType,
            layerId: params.input.layerId,
            userId: params.scope.userId,
            createdAt: now,
        }),
    );
    await batch.commit();
    return { repairId, status: "ready" as const, message: "Original fallback is available." };
}

export async function exportCampaignCueCueLayerDesignServer(params: {
    designId: string;
    input: CampaignCueCueLayerExportInput;
    scope: CampaignCueSessionScope;
}) {
    const { design, workspaceId } = await getCueLayerDesign(params);
    if (params.input.sourceRevision !== design.current.revision) {
        return { error: "Save the latest edit before exporting.", status: 409 as const };
    }
    const exportId = buildCampaignCueCueLayerId(CAMPAIGNCUE_CUE_LAYER_ID_PREFIXES.EXPORT);
    const now = nowTimestamp();
    const ext = params.input.format === "jpeg" ? "jpg" : params.input.format;
    const renderedExport = parseRenderedExportDataUrl(params.input.renderedDataUrl, params.input.format);
    const exportOutputPath = buildCueLayersStoragePaths.exportOutput(workspaceId, design.id, exportId, ext);
    const exportUpload = await uploadStorageObject({
        buffer: renderedExport.buffer,
        cacheControl: "private, max-age=31536000, immutable",
        contentType: renderedExport.mimeType,
        customMetadata: {
            retentionClass: "export_durable",
            sha256: sha256Hex(renderedExport.buffer),
            workspaceId,
            designId: design.id,
            exportId,
        },
        path: exportOutputPath,
    });
    const exportReportAsset = await uploadJsonArtifact({
        assetId: exportId,
        path: buildCueLayersStoragePaths.exportReport(workspaceId, design.id, exportId),
        retentionClass: "export_durable",
        scope: { workspaceId, designId: design.id, exportId },
        value: {
            schemaVersion: CAMPAIGNCUE_CUE_LAYERS.SCHEMA_VERSION,
            exportId,
            designId: design.id,
            sourceRevision: params.input.sourceRevision,
            format: params.input.format,
            outputSha256: sha256Hex(renderedExport.buffer),
            outputStorageGeneration: exportUpload.generation,
            status: "ready",
            createdAt: new Date().toISOString(),
        },
    });
    const assetInput: CampaignCueAssetInput = {
        name: `${design.title} export`,
        assetType: "export",
        source: "generated",
        rightsStatus: "needs_review",
        rightsNote: "Exported from CueLayers. Review source image rights before public use.",
        consentType: "not_applicable",
        tags: ["cue-layers", params.input.format],
        storagePath: exportOutputPath,
        mimeType: renderedExport.mimeType,
        sizeBytes: exportUpload.size,
    };
    const asset = await createCampaignCueAssetServer({ input: assetInput, scope: params.scope });
    const batch = firestoreAdmin.batch();
    batch.set(
        workspaceSubcollection(workspaceId, CAMPAIGNCUE_COLLECTIONS.CUE_LAYER_EXPORTS).doc(exportId),
        sanitizeForAdminFirestore({
            id: exportId,
            workspaceId,
            designId: design.id,
            versionId: (design.current as CampaignCueCueLayerDesign["current"] & { versionId?: string }).versionId,
            sourceRevision: params.input.sourceRevision,
            format: params.input.format,
            status: "ready",
            sourceCreativeEditorDocumentSnapshotAssetId: design.current.creativeEditorDocumentSnapshotAssetId,
            outputAssetId: asset.id,
            reportAssetId: exportReportAsset.assetId,
            sizeBytes: exportUpload.size,
            storageGeneration: exportUpload.generation,
            storagePath: exportOutputPath,
            createdByUserId: params.scope.userId,
            createdAt: now,
            updatedAt: now,
        }),
    );
    enqueueCueLayerEvent(batch, {
        action: "cue_layers_export_ready",
        createdAt: now,
        designId: design.id,
        metadata: { exportId, assetId: asset.id, format: params.input.format },
        scope: params.scope,
        workspaceId,
    });
    await batch.commit();
    return { asset, exportId, status: "ready" as const };
}

export function buildCampaignCueCueLayersApiError(error: unknown, fallbackMessage: string) {
    logger.error("CampaignCue CueLayers API error", error, { productId: "campaigncue", feature: "cue-layers" });
    return buildCampaignCueApiError(error, fallbackMessage);
}
