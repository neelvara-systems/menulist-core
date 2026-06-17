import { doc, getDoc, setDoc } from "firebase/firestore";
import { deleteObject, ref, uploadString } from "firebase/storage";
import { CAMPAIGNCUE_COLLECTIONS } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY } from "@constant/campaigncue/packTemplates";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    campaignCueWorkspacePackTemplateIndexSchema,
    campaignCueWorkspacePackTemplateSaveSchema,
} from "@lib/validation/campaigncuePackTemplateSchemas";
import type {
    CampaignCuePackTemplateSummary,
    CampaignCueWorkspacePackTemplateIndex,
    CampaignCueWorkspacePackTemplateSaveInput,
} from "@type/campaigncuePackTemplates";

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

async function getExistingWorkspaceTemplates(workspaceId: string): Promise<CampaignCuePackTemplateSummary[]> {
    const indexDoc = await getDoc(getWorkspaceTemplateIndexRef(workspaceId));
    if (!indexDoc.exists()) return [];
    const index = campaignCueWorkspacePackTemplateIndexSchema.parse(indexDoc.data()) as CampaignCueWorkspacePackTemplateIndex;
    return index.data;
}

export async function saveCampaignCueWorkspacePackTemplate(
    params: CampaignCueWorkspacePackTemplateSaveInput,
): Promise<CampaignCuePackTemplateSummary> {
    const input = campaignCueWorkspacePackTemplateSaveSchema.parse(params) as CampaignCueWorkspacePackTemplateSaveInput;
    const templateId = safeSegment(input.summary.templateId);
    if (!templateId) throw new Error("Template id is required");

    const now = Date.now();
    const existingTemplates = await getExistingWorkspaceTemplates(input.workspaceId);
    const existingRecord = existingTemplates.find((template) => template.templateId === templateId);
    const root = buildWorkspaceTemplateRoot(input.workspaceId, templateId);
    const payloadPath = `${root}/pack-template.json`;
    const editorDocumentPath = input.editorDocument ? `${root}/editor-document.json` : undefined;
    const previewContentType = parsePreviewContentType(input.previewDataUrl);
    const previewPath = input.previewDataUrl && previewContentType ? `${root}/preview.${previewContentType.split("/")[1]}` : undefined;

    const payloadJson = JSON.stringify({
        ...input.payload,
        templateId,
    }, null, 2);
    if (sizeOf(payloadJson) > CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_PAYLOAD_BYTES) {
        throw new Error("Campaign pack template payload is too large");
    }
    const uploadedPaths: string[] = [];
    try {
        await uploadString(ref(firebaseStorage, payloadPath), payloadJson, "raw", {
            cacheControl: "private, max-age=31536000, immutable",
            contentType: "application/json",
        });
        uploadedPaths.push(payloadPath);

        if (input.editorDocument && editorDocumentPath) {
            const editorJson = JSON.stringify(input.editorDocument);
            if (sizeOf(editorJson) > CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_EDITOR_DOCUMENT_BYTES) {
                throw new Error("Campaign pack editor document is too large");
            }
            await uploadString(ref(firebaseStorage, editorDocumentPath), editorJson, "raw", {
                cacheControl: "private, max-age=31536000, immutable",
                contentType: "application/json",
            });
            uploadedPaths.push(editorDocumentPath);
        }

        if (input.previewDataUrl && previewPath && previewContentType) {
            await uploadString(ref(firebaseStorage, previewPath), input.previewDataUrl, "data_url", {
                cacheControl: "private, max-age=31536000, immutable",
                contentType: previewContentType,
            });
            uploadedPaths.push(previewPath);
        }

        const summary: CampaignCuePackTemplateSummary = {
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
        const data = [
            summary,
            ...existingTemplates.filter((template) => template.templateId !== templateId),
        ].slice(0, CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_WORKSPACE_TEMPLATES);
        const index: CampaignCueWorkspacePackTemplateIndex = {
            data,
            id: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID,
            schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
            updatedAt: now,
            workspaceId: input.workspaceId,
        };
        await setDoc(getWorkspaceTemplateIndexRef(input.workspaceId), index);
        return summary;
    } catch (error) {
        const previousPaths = new Set([
            existingRecord?.payloadPath,
            existingRecord?.editorDocumentPath,
            existingRecord?.previewPath,
        ].filter(Boolean));
        await Promise.all(uploadedPaths
            .filter((path) => !previousPaths.has(path))
            .map((path) => deleteObject(ref(firebaseStorage, path)).catch(() => undefined)));
        throw error;
    }
}

export async function deleteCampaignCueWorkspacePackTemplate(input: {
    templateId: string;
    workspaceId: string;
}): Promise<void> {
    const templateId = safeSegment(input.templateId);
    const existingTemplates = await getExistingWorkspaceTemplates(input.workspaceId);
    const removed = existingTemplates.find((template) => template.templateId === templateId);
    const data = existingTemplates.filter((template) => template.templateId !== templateId);
    const index: CampaignCueWorkspacePackTemplateIndex = {
        data,
        id: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID,
        schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
        updatedAt: Date.now(),
        workspaceId: input.workspaceId,
    };
    await setDoc(getWorkspaceTemplateIndexRef(input.workspaceId), index);

    await Promise.all([
        removed?.payloadPath ? deleteObject(ref(firebaseStorage, removed.payloadPath)) : Promise.resolve(),
        removed?.editorDocumentPath ? deleteObject(ref(firebaseStorage, removed.editorDocumentPath)) : Promise.resolve(),
        removed?.previewPath ? deleteObject(ref(firebaseStorage, removed.previewPath)) : Promise.resolve(),
    ]).catch(() => undefined);
}
