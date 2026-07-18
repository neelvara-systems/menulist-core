import { doc, getDoc } from "firebase/firestore";
import { getBlob, ref } from "firebase/storage";
import { CAMPAIGNCUE_COLLECTIONS } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY } from "@constant/campaigncue/packTemplates";
import { firebaseClient, firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    campaignCuePackTemplatePayloadSchema,
    campaignCuePlatformPackTemplateCatalogSchema,
    campaignCueWorkspacePackTemplateIndexSchema,
} from "@lib/validation/campaigncuePackTemplateSchemas";
import type {
    CampaignCuePackTemplateHydrated,
    CampaignCuePackTemplateListResult,
    CampaignCuePackTemplatePayload,
    CampaignCuePlatformPackTemplateCatalog,
    CampaignCuePackTemplateSummary,
    CampaignCueWorkspacePackTemplateIndex,
} from "@type/campaigncuePackTemplates";
import { resolveCampaignCuePackTemplateCategory } from "./category";
import type { CreativeEditorDocument } from "@/modules/creative-editor/types";
import { CampaignCuePackTemplateEditorDocumentSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import {
    assertCampaignCuePackTemplatePayloadIdentity,
    assertCampaignCuePackTemplateSummaryScope,
    assertCampaignCuePlatformTemplateCatalogScope,
    assertCampaignCueWorkspaceTemplateIndexScope,
} from "./templateScopeBoundary";

const ACTIVE_STATUS = "active";

const normalizeToken = (value: string) => value.trim().toLowerCase();

const matchesSearch = (template: CampaignCuePackTemplateSummary, query: string): boolean => {
    const normalizedQuery = normalizeToken(query);
    if (!normalizedQuery) return true;
    const tokens = [
        template.title,
        template.description,
        template.businessCategory,
        ...template.channels,
        ...template.eventTags,
        ...template.ownerGoals,
        ...template.outputTypes,
        ...template.recipeIds,
        ...template.requiredFactTypes,
        ...template.searchTokens,
        ...template.styleTags,
        ...template.supportedBusinessTypes,
    ].map((token) => normalizeToken(String(token)));
    return tokens.some((token) => token.includes(normalizedQuery));
};

const sortTemplates = (templates: CampaignCuePackTemplateSummary[]) => (
    [...templates].sort((left, right) => {
        if (left.priority !== right.priority) return right.priority - left.priority;
        return right.updatedAt - left.updatedAt;
    })
);

const activeTemplates = (templates: CampaignCuePackTemplateSummary[]) => (
    sortTemplates(templates.filter((template) => template.status === ACTIVE_STATUS))
);

async function readJsonFromStorage<T>(path: string, maxBytes: number, parser: (value: unknown) => T): Promise<T> {
    const blob = await getBlob(ref(firebaseStorage, path), maxBytes);
    const raw = await blob.text();
    return parser(JSON.parse(raw));
}

async function loadPlatformTemplates(
    businessCategory: CampaignCuePackTemplateListResult["businessCategory"],
): Promise<CampaignCuePackTemplateSummary[]> {
    const catalogRef = doc(firebaseClient, CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.PLATFORM_COLLECTION, businessCategory);
    const catalogDoc = await getDoc(catalogRef);
    if (!catalogDoc.exists()) return [];
    const catalog = campaignCuePlatformPackTemplateCatalogSchema.parse(catalogDoc.data()) as CampaignCuePlatformPackTemplateCatalog;
    assertCampaignCuePlatformTemplateCatalogScope(catalog, businessCategory);
    if (catalog.catalogStatus !== "active") return [];
    return activeTemplates(catalog.data.filter((template) => template.businessCategory === businessCategory));
}

async function loadWorkspaceTemplates(workspaceId: string): Promise<CampaignCuePackTemplateSummary[]> {
    const indexRef = doc(
        firebaseClient,
        CAMPAIGNCUE_COLLECTIONS.WORKSPACES,
        workspaceId,
        CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_COLLECTION,
        CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.WORKSPACE_INDEX_DOC_ID,
    );
    const indexDoc = await getDoc(indexRef);
    if (!indexDoc.exists()) return [];
    const index = campaignCueWorkspacePackTemplateIndexSchema.parse(indexDoc.data()) as CampaignCueWorkspacePackTemplateIndex;
    assertCampaignCueWorkspaceTemplateIndexScope(index, workspaceId);
    return activeTemplates(index.data);
}

export async function listCampaignCuePackTemplates(input: {
    businessCategory?: string;
    businessType?: string;
    includeWorkspaceTemplates?: boolean;
    workspaceId?: string;
}): Promise<CampaignCuePackTemplateListResult> {
    const businessCategory = resolveCampaignCuePackTemplateCategory({
        businessCategory: input.businessCategory,
        businessType: input.businessType,
    });
    const [platformTemplates, workspaceTemplates] = await Promise.all([
        loadPlatformTemplates(businessCategory),
        input.includeWorkspaceTemplates && input.workspaceId
            ? loadWorkspaceTemplates(input.workspaceId)
            : Promise.resolve([]),
    ]);
    return {
        businessCategory,
        platformTemplates,
        workspaceTemplates,
    };
}

export function searchCampaignCuePackTemplates(input: {
    query?: string;
    templates: CampaignCuePackTemplateSummary[];
}): CampaignCuePackTemplateSummary[] {
    return sortTemplates(input.templates.filter((template) => matchesSearch(template, input.query || "")));
}

export async function getCampaignCuePackTemplate(
    summary: CampaignCuePackTemplateSummary,
    options: { workspaceId?: string } = {},
): Promise<CampaignCuePackTemplateHydrated> {
    assertCampaignCuePackTemplateSummaryScope(summary, options.workspaceId);
    const payload = await readJsonFromStorage(
        summary.payloadPath,
        CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_PAYLOAD_BYTES,
        (value) => campaignCuePackTemplatePayloadSchema.parse(value) as CampaignCuePackTemplatePayload,
    );
    assertCampaignCuePackTemplatePayloadIdentity(summary, payload);
    const editorDocument = summary.editorDocumentPath
        ? await readJsonFromStorage<CreativeEditorDocument>(
            summary.editorDocumentPath,
            CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_EDITOR_DOCUMENT_BYTES,
            (value) => CampaignCuePackTemplateEditorDocumentSchema.parse(value) as CreativeEditorDocument,
        )
        : undefined;
    return {
        editorDocument,
        payload,
        summary,
    };
}
