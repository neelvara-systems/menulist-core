import { CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY } from "@constant/campaigncue/packTemplates";
import type {
    CampaignCuePackTemplateBusinessCategory,
    CampaignCuePackTemplatePayload,
    CampaignCuePackTemplateSummary,
    CampaignCuePlatformPackTemplateCatalog,
    CampaignCueWorkspacePackTemplateIndex,
} from "@type/campaigncuePackTemplates";
import { isOwnedWorkspaceTemplateStoragePath } from "./workspaceTemplateIndexBoundary";
import { isCampaignCuePackTemplateCatalogIdForCategory } from "./category";

const SAFE_ARTIFACT_NAME = /^(?:pack-template|editor-document)(?:-[a-f0-9]{16,64})?\.json$|^preview(?:-[a-f0-9]{16,64})?\.(?:png|jpeg|webp)$/;
const SAFE_WORKSPACE_ARTIFACT_PATH = /^(?:versions\/[A-Za-z0-9_-]{3,160}\/)?(?:pack-template\.json|editor-document\.json|preview\.(?:png|jpeg|webp))$/;
const PLATFORM_PAYLOAD_HASH_PATH = /\/pack-template-([a-f0-9]{16,64})\.json$/;

const isSafePath = (path: string) => (
    Boolean(path)
    && !path.includes("//")
    && !path.includes("../")
    && !path.includes("\\")
    && !/[\u0000-\u001f\u007f]/.test(path)
);

const isOwnedPlatformTemplateStoragePath = (params: {
    businessCategory: CampaignCuePackTemplateBusinessCategory;
    path: string;
    templateId: string;
}) => {
    if (!isSafePath(params.path)) return false;
    const categoryRoot = `${CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.PLATFORM_STORAGE_ROOT}/${params.businessCategory}/${params.templateId}/`;
    const sharedRoot = `${CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SHARED_PLATFORM_STORAGE_ROOT}/${params.templateId}/`;
    const root = params.path.startsWith(categoryRoot)
        ? categoryRoot
        : params.path.startsWith(sharedRoot)
            ? sharedRoot
            : "";
    return Boolean(root) && SAFE_ARTIFACT_NAME.test(params.path.slice(root.length));
};

function assertUniqueTemplateIds(templates: readonly CampaignCuePackTemplateSummary[]) {
    const templateIds = new Set<string>();
    templates.forEach((template) => {
        if (templateIds.has(template.templateId)) {
            throw new Error("Template catalog contains a duplicate template id.");
        }
        templateIds.add(template.templateId);
    });
}

function assertPlatformSummaryScope(
    summary: CampaignCuePackTemplateSummary,
    businessCategory: CampaignCuePackTemplateBusinessCategory,
) {
    if (
        summary.businessCategory !== businessCategory
        || summary.templateType !== "platform"
        || summary.qualityTier !== "platform_curated"
    ) {
        throw new Error("Platform template summary scope is invalid.");
    }
    [summary.payloadPath, summary.editorDocumentPath, summary.previewPath]
        .filter((path): path is string => Boolean(path))
        .forEach((path) => {
            if (!isOwnedPlatformTemplateStoragePath({ businessCategory, path, templateId: summary.templateId })) {
                throw new Error("Platform template artifact path is invalid.");
            }
        });
    getCampaignCuePlatformPayloadHashPrefix(summary);
}

export function getCampaignCuePlatformPayloadHashPrefix(
    summary: CampaignCuePackTemplateSummary,
): string {
    if (summary.templateType !== "platform") {
        throw new Error("Platform template payload hash requires a platform summary.");
    }
    const match = summary.payloadPath.match(PLATFORM_PAYLOAD_HASH_PATH);
    if (!match) {
        throw new Error("Platform template payload path is not content-addressed.");
    }
    return match[1];
}

export function assertCampaignCuePlatformPayloadHash(
    summary: CampaignCuePackTemplateSummary,
    actualSha256: string,
): void {
    const expectedPrefix = getCampaignCuePlatformPayloadHashPrefix(summary);
    if (!/^[a-f0-9]{64}$/.test(actualSha256) || !actualSha256.startsWith(expectedPrefix)) {
        throw new Error("Platform template payload content hash does not match its catalog summary.");
    }
}

function assertWorkspaceSummaryScope(summary: CampaignCuePackTemplateSummary, workspaceId: string) {
    if (summary.templateType !== "workspace" || summary.qualityTier !== "workspace_saved") {
        throw new Error("Workspace template summary scope is invalid.");
    }
    [summary.payloadPath, summary.editorDocumentPath, summary.previewPath]
        .filter((path): path is string => Boolean(path))
        .forEach((path) => {
            const root = `${CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_STORAGE_ROOT}/${workspaceId}/${summary.templateId}/`;
            if (!isOwnedWorkspaceTemplateStoragePath({
                path,
                storageRoot: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_STORAGE_ROOT,
                templateId: summary.templateId,
                workspaceId,
            }) || !path.startsWith(root) || !SAFE_WORKSPACE_ARTIFACT_PATH.test(path.slice(root.length))) {
                throw new Error("Workspace template artifact path is invalid.");
            }
        });
}

export function assertCampaignCuePlatformTemplateCatalogScope(
    catalog: CampaignCuePlatformPackTemplateCatalog,
    businessCategory: CampaignCuePackTemplateBusinessCategory,
    expectedCatalogId: string = businessCategory,
) {
    if (
        catalog.catalogId !== expectedCatalogId
        || catalog.businessCategory !== businessCategory
        || !isCampaignCuePackTemplateCatalogIdForCategory(catalog.catalogId, businessCategory)
    ) {
        throw new Error("Platform template catalog identity is invalid.");
    }
    const overflowDocIds = catalog.overflowDocIds || [];
    if (new Set(overflowDocIds).size !== overflowDocIds.length) {
        throw new Error("Platform template catalog contains duplicate overflow ids.");
    }
    if (catalog.catalogId !== businessCategory && overflowDocIds.length) {
        throw new Error("Only the base platform template catalog may reference overflow catalogs.");
    }
    overflowDocIds.forEach((catalogId) => {
        if (
            catalogId === businessCategory
            || !isCampaignCuePackTemplateCatalogIdForCategory(catalogId, businessCategory)
        ) {
            throw new Error("Platform template overflow catalog identity is invalid.");
        }
    });
    assertUniqueTemplateIds(catalog.data);
    catalog.data.forEach((summary) => assertPlatformSummaryScope(summary, businessCategory));
}

export function assertCampaignCueWorkspaceTemplateIndexScope(
    index: CampaignCueWorkspacePackTemplateIndex,
    workspaceId: string,
) {
    if (index.workspaceId !== workspaceId || index.id !== CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID) {
        throw new Error("Workspace template index identity is invalid.");
    }
    assertUniqueTemplateIds(index.data);
    index.data.forEach((summary) => assertWorkspaceSummaryScope(summary, workspaceId));
}

export function assertCampaignCuePackTemplateSummaryScope(
    summary: CampaignCuePackTemplateSummary,
    workspaceId?: string,
) {
    if (summary.templateType === "platform") {
        assertPlatformSummaryScope(summary, summary.businessCategory);
        return;
    }
    if (!workspaceId) throw new Error("Workspace template requires workspace scope.");
    assertWorkspaceSummaryScope(summary, workspaceId);
}

export function assertCampaignCuePackTemplatePayloadIdentity(
    summary: CampaignCuePackTemplateSummary,
    payload: CampaignCuePackTemplatePayload,
) {
    if (payload.templateId !== summary.templateId || payload.schemaVersion !== summary.schemaVersion) {
        throw new Error("Template payload identity does not match its catalog summary.");
    }
    const requiredSummaryFacts = Array.from(new Set(summary.requiredFactTypes)).sort();
    const requiredPayloadFacts = Array.from(new Set(payload.factSlots.filter((slot) => slot.required).map((slot) => slot.type))).sort();
    const optionalSummaryFacts = Array.from(new Set(summary.optionalFactTypes)).sort();
    const optionalPayloadFacts = Array.from(new Set(payload.factSlots.filter((slot) => !slot.required).map((slot) => slot.type))).sort();
    if (
        JSON.stringify(requiredSummaryFacts) !== JSON.stringify(requiredPayloadFacts)
        || JSON.stringify(optionalSummaryFacts) !== JSON.stringify(optionalPayloadFacts)
    ) {
        throw new Error("Template fact-slot metadata does not match its payload.");
    }
}
