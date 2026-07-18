import { doc, getDoc, runTransaction } from "firebase/firestore";
import { deleteObject, ref, uploadString } from "firebase/storage";
import { CAMPAIGNCUE_COLLECTIONS } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY } from "@constant/campaigncue/packTemplates";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import { createRuntimeId } from "@lib/runtime/randomId";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import {
    isOwnedWorkspaceTemplateStoragePath,
    removeWorkspaceTemplateFromIndex,
    upsertWorkspaceTemplateIndex,
} from "./workspaceTemplateIndexBoundary";
import {
    campaignCueWorkspacePackTemplateDeleteSchema,
    campaignCueWorkspacePackTemplateIndexSchema,
    campaignCueWorkspacePackTemplateSaveSchema,
} from "@lib/validation/campaigncuePackTemplateSchemas";
import type {
    CampaignCuePackTemplateSummary,
    CampaignCueWorkspacePackTemplateIndex,
    CampaignCueWorkspacePackTemplateSaveInput,
} from "@type/campaigncuePackTemplates";
import { prepareCampaignCuePackTemplateEditorDocument } from "./editorDocumentBoundary";
import { assertCampaignCueWorkspaceTemplateIndexScope } from "./templateScopeBoundary";

type CampaignCueWorkspaceTemplateStorageCleanupContext = {
    cleanupTarget: "payload" | "editorDocument" | "preview";
    templateId?: string;
    workspaceId?: string;
};

const safeSegment = (value: string) => (
    String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100)
);

const getWorkspaceTemplateIndexRef = (workspaceId: string) => doc(
    firebaseClient,
    CAMPAIGNCUE_COLLECTIONS.WORKSPACES,
    workspaceId,
    CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_COLLECTION,
    CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID,
);

const buildWorkspaceTemplateRoot = (workspaceId: string, templateId: string) => (
    `${CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_STORAGE_ROOT}/${safeSegment(workspaceId)}/${safeSegment(templateId)}`
);

const parsePreviewContentType = (dataUrl?: string) => {
    if (!dataUrl) return null;
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,/i);
    return match?.[1]?.toLowerCase() || null;
};

const sizeOf = (value: string) => new TextEncoder().encode(value).length;

const isMissingStorageObjectError = (error: unknown): boolean => (
    Boolean(error)
    && typeof error === "object"
    && (error as { code?: unknown }).code === "storage/object-not-found"
);

const getWorkspaceTemplateCleanupTarget = (
    path: string | undefined,
): CampaignCueWorkspaceTemplateStorageCleanupContext["cleanupTarget"] => {
    if (path?.endsWith("/pack-template.json")) return "payload";
    if (path?.endsWith("/editor-document.json")) return "editorDocument";
    return "preview";
};

async function deleteWorkspaceTemplateStoragePath(
    path: string | undefined,
    context: CampaignCueWorkspaceTemplateStorageCleanupContext,
) {
    if (!path) return;
    try {
        await deleteObject(ref(firebaseStorage, path));
    } catch (error) {
        if (isMissingStorageObjectError(error)) return;
        logRuntimeFailure("campaigncue_workspace_template_storage_cleanup_failed", error, {
            cleanupTarget: context.cleanupTarget,
            ...getBoundedRuntimeStringContext("storagePath", path),
            ...getBoundedRuntimeStringContext("templateId", context.templateId),
            ...getBoundedRuntimeStringContext("workspaceId", context.workspaceId),
        });
    }
}

const getWorkspaceTemplateStoragePaths = (summary?: CampaignCuePackTemplateSummary | null): string[] => (
    summary
        ? [summary.payloadPath, summary.editorDocumentPath, summary.previewPath].filter((path): path is string => Boolean(path))
        : []
);

async function cleanupWorkspaceTemplateSummaries(
    summaries: CampaignCuePackTemplateSummary[],
    currentPaths: ReadonlySet<string>,
    workspaceId: string,
): Promise<void> {
    const targets = new Map<string, { templateId: string }>();
    for (const summary of summaries) {
        for (const path of getWorkspaceTemplateStoragePaths(summary)) {
            if (
                !currentPaths.has(path)
                && isOwnedWorkspaceTemplateStoragePath({
                    path,
                    storageRoot: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_STORAGE_ROOT,
                    templateId: summary.templateId,
                    workspaceId,
                })
            ) {
                targets.set(path, { templateId: summary.templateId });
            }
        }
    }
    await Promise.all(Array.from(targets.entries()).map(([path, target]) => (
        deleteWorkspaceTemplateStoragePath(path, {
            cleanupTarget: getWorkspaceTemplateCleanupTarget(path),
            templateId: target.templateId,
            workspaceId,
        })
    )));
}

export async function saveCampaignCueWorkspacePackTemplate(
    params: CampaignCueWorkspacePackTemplateSaveInput,
): Promise<CampaignCuePackTemplateSummary> {
    const input = campaignCueWorkspacePackTemplateSaveSchema.parse(params) as CampaignCueWorkspacePackTemplateSaveInput;
    const templateId = safeSegment(input.summary.templateId);
    if (!templateId) throw new Error("Template id is required");

    const now = Date.now();
    const root = buildWorkspaceTemplateRoot(input.workspaceId, templateId);
    const versionRoot = `${root}/versions/${safeSegment(createRuntimeId("save"))}`;
    const payloadPath = `${versionRoot}/pack-template.json`;
    const reusableEditorDocument = input.editorDocument
        ? prepareCampaignCuePackTemplateEditorDocument({
            document: input.editorDocument,
            templateId,
            workspaceId: input.workspaceId,
        })
        : undefined;
    const editorDocumentPath = reusableEditorDocument ? `${versionRoot}/editor-document.json` : undefined;
    const previewContentType = parsePreviewContentType(input.previewDataUrl);
    const previewPath = input.previewDataUrl && previewContentType ? `${versionRoot}/preview.${previewContentType.split("/")[1]}` : undefined;

    const payloadJson = JSON.stringify({
        ...input.payload,
        templateId,
    }, null, 2);
    if (sizeOf(payloadJson) > CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_PAYLOAD_BYTES) {
        throw new Error("Campaign pack template payload is too large");
    }
    const editorJson = reusableEditorDocument ? JSON.stringify(reusableEditorDocument) : null;
    if (editorJson && sizeOf(editorJson) > CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_EDITOR_DOCUMENT_BYTES) {
        throw new Error("Campaign pack editor document is too large");
    }

    const uploadedPaths: string[] = [];
    let persistenceAttempted = false;
    let obsoleteRecords: CampaignCuePackTemplateSummary[] = [];
    try {
        uploadedPaths.push(payloadPath);
        await uploadString(ref(firebaseStorage, payloadPath), payloadJson, "raw", {
            cacheControl: "private, max-age=31536000, immutable",
            contentType: "application/json",
        });
        if (editorJson && editorDocumentPath) {
            uploadedPaths.push(editorDocumentPath);
            await uploadString(ref(firebaseStorage, editorDocumentPath), editorJson, "raw", {
                cacheControl: "private, max-age=31536000, immutable",
                contentType: "application/json",
            });
        }

        if (input.previewDataUrl && previewPath && previewContentType) {
            uploadedPaths.push(previewPath);
            await uploadString(ref(firebaseStorage, previewPath), input.previewDataUrl, "data_url", {
                cacheControl: "private, max-age=31536000, immutable",
                contentType: previewContentType,
            });
        }

        const indexRef = getWorkspaceTemplateIndexRef(input.workspaceId);
        persistenceAttempted = true;
        const summary = await runTransaction(firebaseClient, async (transaction) => {
            const indexDoc = await transaction.get(indexRef);
            const currentIndex = indexDoc.exists()
                ? campaignCueWorkspacePackTemplateIndexSchema.parse(indexDoc.data()) as CampaignCueWorkspacePackTemplateIndex
                : null;
            if (currentIndex) assertCampaignCueWorkspaceTemplateIndexScope(currentIndex, input.workspaceId);
            const existingTemplates = currentIndex?.data || [];
            const existingRecord = existingTemplates.find((template) => template.templateId === templateId);
            const nextSummary: CampaignCuePackTemplateSummary = {
                ...input.summary,
                businessCategory: input.businessCategory,
                createdAt: existingRecord?.createdAt || input.summary.createdAt || now,
                editorDocumentPath,
                payloadPath,
                previewPath,
                qualityTier: "workspace_saved",
                schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
                status: "active",
                templateId,
                templateType: "workspace",
                updatedAt: now,
            };
            const mutation = upsertWorkspaceTemplateIndex({
                existingTemplates,
                maxTemplates: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_WORKSPACE_TEMPLATES,
                summary: nextSummary,
            });
            obsoleteRecords = mutation.obsoleteRecords;
            const index: CampaignCueWorkspacePackTemplateIndex = {
                data: mutation.data,
                id: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID,
                schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
                updatedAt: now,
                workspaceId: input.workspaceId,
            };
            transaction.set(indexRef, index);
            return nextSummary;
        });
        await cleanupWorkspaceTemplateSummaries(obsoleteRecords, new Set(uploadedPaths), input.workspaceId);
        return summary;
    } catch (error) {
        if (persistenceAttempted) {
            try {
                const indexDoc = await getDoc(getWorkspaceTemplateIndexRef(input.workspaceId));
                const currentIndex = indexDoc.exists()
                    ? campaignCueWorkspacePackTemplateIndexSchema.parse(indexDoc.data()) as CampaignCueWorkspacePackTemplateIndex
                    : null;
                if (currentIndex) assertCampaignCueWorkspaceTemplateIndexScope(currentIndex, input.workspaceId);
                const committed = currentIndex?.data.find((template) => (
                    template.templateId === templateId
                    && template.payloadPath === payloadPath
                    && template.editorDocumentPath === editorDocumentPath
                    && template.previewPath === previewPath
                ));
                if (committed) {
                    await cleanupWorkspaceTemplateSummaries(obsoleteRecords, new Set(uploadedPaths), input.workspaceId);
                    return committed;
                }
            } catch (probeError) {
                logRuntimeFailure("campaigncue_workspace_template_persistence_probe_failed", probeError, {
                    ...getBoundedRuntimeStringContext("templateId", templateId),
                    ...getBoundedRuntimeStringContext("workspaceId", input.workspaceId),
                    cleanupDeferred: true,
                });
                throw error;
            }
        }
        await cleanupWorkspaceTemplateSummaries([{
            ...input.summary,
            businessCategory: input.businessCategory,
            createdAt: input.summary.createdAt || now,
            editorDocumentPath,
            payloadPath,
            previewPath,
            qualityTier: "workspace_saved",
            schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
            status: "active",
            templateId,
            templateType: "workspace",
            updatedAt: now,
        }], new Set(), input.workspaceId);
        throw error;
    }
}

export async function deleteCampaignCueWorkspacePackTemplate(input: {
    templateId: string;
    workspaceId: string;
}): Promise<void> {
    const parsed = campaignCueWorkspacePackTemplateDeleteSchema.parse(input);
    const templateId = parsed.templateId;
    const indexRef = getWorkspaceTemplateIndexRef(parsed.workspaceId);
    let removedAttempt: CampaignCuePackTemplateSummary | undefined;
    try {
        const removed = await runTransaction(firebaseClient, async (transaction) => {
            const indexDoc = await transaction.get(indexRef);
            const currentIndex = indexDoc.exists()
                ? campaignCueWorkspacePackTemplateIndexSchema.parse(indexDoc.data()) as CampaignCueWorkspacePackTemplateIndex
                : null;
            if (currentIndex) assertCampaignCueWorkspaceTemplateIndexScope(currentIndex, parsed.workspaceId);
            const existingTemplates = currentIndex?.data || [];
            const mutation = removeWorkspaceTemplateFromIndex({ existingTemplates, templateId });
            removedAttempt = mutation.removed;
            if (!mutation.removed) return undefined;
            const index: CampaignCueWorkspacePackTemplateIndex = {
                data: mutation.data,
                id: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID,
                schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
                updatedAt: Date.now(),
                workspaceId: parsed.workspaceId,
            };
            transaction.set(indexRef, index);
            return mutation.removed;
        });
        await cleanupWorkspaceTemplateSummaries(removed ? [removed] : [], new Set(), parsed.workspaceId);
    } catch (error) {
        if (!removedAttempt) throw error;
        try {
            const indexDoc = await getDoc(indexRef);
            const currentIndex = indexDoc.exists()
                ? campaignCueWorkspacePackTemplateIndexSchema.parse(indexDoc.data()) as CampaignCueWorkspacePackTemplateIndex
                : null;
            if (currentIndex) assertCampaignCueWorkspaceTemplateIndexScope(currentIndex, parsed.workspaceId);
            if (!currentIndex?.data.some((template) => template.templateId === templateId)) {
                await cleanupWorkspaceTemplateSummaries([removedAttempt], new Set(), parsed.workspaceId);
                return;
            }
        } catch (probeError) {
            logRuntimeFailure("campaigncue_workspace_template_delete_probe_failed", probeError, {
                ...getBoundedRuntimeStringContext("templateId", templateId),
                ...getBoundedRuntimeStringContext("workspaceId", parsed.workspaceId),
                cleanupDeferred: true,
            });
        }
        throw error;
    }
}
