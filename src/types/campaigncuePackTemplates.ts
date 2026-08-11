import type { CreativeEditorDocument } from "@/modules/creative-editor/types";
import type { CampaignCueDailyDeskOwnerGoal } from "@constant/campaigncue/dailyDesk";
import type {
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueChannel,
    CampaignCueDecisionOutputType,
    CampaignCueOutputPack,
} from "@type/campaigncue";

export type CampaignCuePackTemplateBusinessCategory =
    | "service"
    | "retail"
    | "food"
    | "professional"
    | "creative"
    | "health"
    | "specialty";

export type CampaignCuePackTemplateStatus = "active" | "hidden" | "retired";
export type CampaignCuePackTemplateType = "platform" | "workspace";
export type CampaignCuePackTemplateKind = "campaign_pack" | "editor_layout" | "handoff_pack" | "reuse_asset";
export type CampaignCuePackTemplateQualityTier = "platform_curated" | "workspace_saved";
export type CampaignCuePackTemplateTrustPolicy = "rehydrate_or_block";

export interface CampaignCuePackTemplateSummary {
    businessCategory: CampaignCuePackTemplateBusinessCategory;
    channels: CampaignCueChannel[];
    createdAt: number;
    description: string;
    editorDocumentPath?: string;
    eventTags: string[];
    optionalFactTypes: string[];
    outputTypes: CampaignCueDecisionOutputType[];
    ownerGoals: CampaignCueDailyDeskOwnerGoal[];
    payloadPath: string;
    previewPath?: string;
    priority: number;
    qualityTier: CampaignCuePackTemplateQualityTier;
    recipeIds: string[];
    requiredFactTypes: string[];
    schemaVersion: number;
    searchTokens: string[];
    status: CampaignCuePackTemplateStatus;
    styleTags: string[];
    supportedBusinessTypes: string[];
    templateId: string;
    templateKind: CampaignCuePackTemplateKind;
    templateType: CampaignCuePackTemplateType;
    title: string;
    trustChecks: string[];
    updatedAt: number;
}

export interface CampaignCuePlatformPackTemplateCatalog {
    businessCategory: CampaignCuePackTemplateBusinessCategory;
    catalogId: string;
    catalogStatus: "active" | "hidden";
    data: CampaignCuePackTemplateSummary[];
    overflowDocIds?: string[];
    schemaVersion: number;
    updatedAt: number;
    updatedBy: string;
}

export interface CampaignCueWorkspacePackTemplateIndex {
    data: CampaignCuePackTemplateSummary[];
    id: "default";
    schemaVersion: number;
    updatedAt: number;
    updatedBy?: string;
    workspaceId: string;
}

export interface CampaignCuePackTemplatePayload {
    decisionSeed: {
        ownerGoal: CampaignCueDailyDeskOwnerGoal;
        recipeId: string;
        whyNow: string[];
        whyThis: string[];
    };
    factSlots: Array<{
        ownerQuestion: string;
        protected: boolean;
        required: boolean;
        type: string;
    }>;
    outputPackShape: {
        channels: string[];
        copyBlocks: string[];
        deliveryCards: string[];
        printFormats: string[];
        resultQuestion: string;
    };
    reuseRules: {
        allowCueLayersSource: boolean;
        allowSavedAssetSource: boolean;
        staleFactPolicy: CampaignCuePackTemplateTrustPolicy;
    };
    schemaVersion: number;
    templateId: string;
    trustChecks: string[];
}

export interface CampaignCuePackTemplateListResult {
    businessCategory: CampaignCuePackTemplateBusinessCategory;
    platformOverflowDocIds: string[];
    platformTemplates: CampaignCuePackTemplateSummary[];
    workspaceTemplates: CampaignCuePackTemplateSummary[];
}

export interface CampaignCuePackTemplateHydrated {
    editorDocument?: CreativeEditorDocument;
    payload: CampaignCuePackTemplatePayload;
    summary: CampaignCuePackTemplateSummary;
}

export interface CampaignCuePackTemplateSaveDraft {
    businessBrain: CampaignCueBusinessBrain;
    campaign: CampaignCueCampaign;
    editorDocument?: CreativeEditorDocument;
    outputPack?: CampaignCueOutputPack;
    previewDataUrl?: string;
    title?: string;
}

export interface CampaignCueWorkspacePackTemplateSaveInput {
    businessCategory: CampaignCuePackTemplateBusinessCategory;
    editorDocument?: CreativeEditorDocument;
    payload: CampaignCuePackTemplatePayload;
    previewDataUrl?: string;
    summary: Omit<CampaignCuePackTemplateSummary, "createdAt" | "editorDocumentPath" | "payloadPath" | "previewPath" | "updatedAt"> & {
        createdAt?: number;
        editorDocumentPath?: string;
        payloadPath?: string;
        previewPath?: string;
        updatedAt?: number;
    };
    workspaceId: string;
}
