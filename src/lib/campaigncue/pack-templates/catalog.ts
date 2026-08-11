import { doc, getDoc } from "firebase/firestore";
import { getBlob, ref, type FirebaseStorage } from "firebase/storage";
import type { Firestore } from "firebase/firestore";
import { CAMPAIGNCUE_COLLECTIONS } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY } from "@constant/campaigncue/packTemplates";
import { withCampaignCueFirebaseSession } from "@lib/campaigncue/firebaseSessionClient";
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
import {
    isCampaignCuePackTemplateCatalogIdForCategory,
    resolveCampaignCuePackTemplateCategory,
} from "./category";
import type { CreativeEditorDocument } from "@/modules/creative-editor/types";
import { CampaignCuePackTemplateEditorDocumentSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import {
    assertCampaignCuePackTemplatePayloadIdentity,
    assertCampaignCuePlatformPayloadHash,
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

async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readJsonFromStorage<T>(
    storage: FirebaseStorage,
    path: string,
    maxBytes: number,
    parser: (value: unknown) => T,
    verifyRaw?: (raw: string) => Promise<void>,
): Promise<T> {
    const blob = await getBlob(ref(storage, path), maxBytes);
    const raw = await blob.text();
    await verifyRaw?.(raw);
    return parser(JSON.parse(raw));
}

async function loadPlatformCatalog(
    firestore: Firestore,
    businessCategory: CampaignCuePackTemplateListResult["businessCategory"],
    catalogId: string = businessCategory,
): Promise<CampaignCuePlatformPackTemplateCatalog | null> {
    if (!isCampaignCuePackTemplateCatalogIdForCategory(catalogId, businessCategory)) {
        throw new Error("Platform template catalog scope is invalid.");
    }
    const catalogRef = doc(firestore, CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.PLATFORM_COLLECTION, catalogId);
    const catalogDoc = await getDoc(catalogRef);
    if (!catalogDoc.exists()) return null;
    const catalog = campaignCuePlatformPackTemplateCatalogSchema.parse(catalogDoc.data()) as CampaignCuePlatformPackTemplateCatalog;
    assertCampaignCuePlatformTemplateCatalogScope(catalog, businessCategory, catalogId);
    return catalog;
}

async function loadWorkspaceTemplates(
    firestore: Firestore,
    workspaceId: string,
): Promise<CampaignCuePackTemplateSummary[]> {
    const indexRef = doc(
        firestore,
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
    workspaceId: string;
}): Promise<CampaignCuePackTemplateListResult> {
    const businessCategory = resolveCampaignCuePackTemplateCategory({
        businessCategory: input.businessCategory,
        businessType: input.businessType,
    });
    return withCampaignCueFirebaseSession(input.workspaceId, { purpose: "template_read" }, async ({ firestore }) => {
        const [platformCatalog, workspaceTemplates] = await Promise.all([
            loadPlatformCatalog(firestore, businessCategory),
            input.includeWorkspaceTemplates
                ? loadWorkspaceTemplates(firestore, input.workspaceId)
                : Promise.resolve([]),
        ]);
        return {
            businessCategory,
            platformOverflowDocIds: platformCatalog?.catalogStatus === "active"
                ? [...(platformCatalog.overflowDocIds || [])]
                : [],
            platformTemplates: platformCatalog?.catalogStatus === "active"
                ? activeTemplates(platformCatalog.data.filter((template) => template.businessCategory === businessCategory))
                : [],
            workspaceTemplates,
        };
    });
}

export async function loadCampaignCuePackTemplateOverflow(input: {
    businessCategory: CampaignCuePackTemplateListResult["businessCategory"];
    catalogId: string;
    workspaceId: string;
}): Promise<CampaignCuePackTemplateSummary[]> {
    if (input.catalogId === input.businessCategory) {
        throw new Error("The base platform template catalog is already loaded.");
    }
    return withCampaignCueFirebaseSession(input.workspaceId, { purpose: "template_read" }, async ({ firestore }) => {
        const catalog = await loadPlatformCatalog(firestore, input.businessCategory, input.catalogId);
        if (!catalog || catalog.catalogStatus !== "active") return [];
        return activeTemplates(catalog.data.filter((template) => template.businessCategory === input.businessCategory));
    });
}

export function searchCampaignCuePackTemplates(input: {
    query?: string;
    templates: CampaignCuePackTemplateSummary[];
}): CampaignCuePackTemplateSummary[] {
    return sortTemplates(input.templates.filter((template) => matchesSearch(template, input.query || "")));
}

export async function getCampaignCuePackTemplate(
    summary: CampaignCuePackTemplateSummary,
    options: { workspaceId: string },
): Promise<CampaignCuePackTemplateHydrated> {
    assertCampaignCuePackTemplateSummaryScope(summary, options.workspaceId);
    return withCampaignCueFirebaseSession(options.workspaceId, { purpose: "template_read" }, async ({ storage }) => {
        const payload = await readJsonFromStorage(
            storage,
            summary.payloadPath,
            CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.MAX_PAYLOAD_BYTES,
            (value) => campaignCuePackTemplatePayloadSchema.parse(value) as CampaignCuePackTemplatePayload,
            summary.templateType === "platform"
                ? async (raw) => assertCampaignCuePlatformPayloadHash(summary, await sha256Hex(raw))
                : undefined,
        );
        assertCampaignCuePackTemplatePayloadIdentity(summary, payload);
        const editorDocument = summary.editorDocumentPath
            ? await readJsonFromStorage<CreativeEditorDocument>(
                storage,
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
    });
}
