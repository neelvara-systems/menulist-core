import { CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY } from "@constant/campaigncue/packTemplates";
import type { CreativeEditorDocument } from "@/modules/creative-editor/types";
import type {
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueDecisionOutputType,
    CampaignCueOutputPack,
} from "@type/campaigncue";
import type {
    CampaignCuePackTemplateHydrated,
    CampaignCuePackTemplatePayload,
    CampaignCueWorkspacePackTemplateSaveInput,
} from "@type/campaigncuePackTemplates";
import { resolveCampaignCuePackTemplateCategory } from "./category";

const normalizeToken = (value: string) => (
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
);

const compactUnique = (values: Array<string | undefined | null>, limit = 60) => (
    Array.from(new Set(values
        .map((value) => normalizeToken(String(value || "")))
        .filter(Boolean)))
        .slice(0, limit)
);

const ownerGoalLabel = (ownerGoal: string) => ownerGoal.replace(/_/g, " ");

const outputTypeForPostType = (postType?: string): CampaignCueDecisionOutputType => {
    switch (postType) {
        case "whatsapp_message":
            return "whatsapp_message";
        case "google_update":
            return "google_update";
        case "reel_brief":
            return "reel_brief";
        case "creator_script":
            return "creator_script";
        case "ad_handoff":
            return "ad_handoff_copy";
        case "social_post":
            return "instagram_square";
        case "manual_task":
        default:
            return "manual_task";
    }
};

export function buildCampaignCuePackTemplatePayloadFromCampaign(input: {
    campaign: CampaignCueCampaign;
    outputPack?: CampaignCueOutputPack;
}): CampaignCuePackTemplatePayload {
    const ownerGoal = input.outputPack?.decision.ownerGoal
        || input.campaign.pack?.ownerGoal
        || "prepare_local_pack";
    const recipeId = input.campaign.pack?.recipeId || "custom_campaign_pack";
    const outputChannels = compactUnique([
        ...(input.outputPack?.creative.visualAssets.map((asset) => String(asset.channel)) || []),
        ...(input.campaign.channels || []),
    ], 16);
    const deliveryCards = compactUnique(input.outputPack?.deliveryCards.map((card) => card.title) || [], 16);
    const printFormats = compactUnique([
        ...(input.outputPack?.creative.visualAssets
            .filter((asset) => asset.exportFormat === "pdf_flattened")
            .map((asset) => asset.size) || []),
        input.outputPack?.proofDeck ? "campaign_proof_deck_pdf" : undefined,
    ], 16);
    const copyBlocks = compactUnique([
        ...(input.outputPack?.copy.whatsapp.map((block) => block.label) || []),
        ...(input.outputPack?.copy.googleBusinessProfile.map((block) => block.label) || []),
        ...(input.outputPack?.copy.instagram.map((block) => block.label) || []),
        ...(input.outputPack?.copy.emailSms.map((block) => block.label) || []),
        ...(input.outputPack?.copy.adsHandoff.map((block) => block.label) || []),
        ...(input.outputPack?.copy.staff.map((block) => block.label) || []),
        ...(input.outputPack?.proofDeck.sections.map((block) => block.label) || []),
    ], 24);

    return {
        decisionSeed: {
            ownerGoal,
            recipeId,
            whyNow: ["Use only after current campaign timing and availability are confirmed."],
            whyThis: ["Reusable structure from an owner-saved CampaignCue pack."],
        },
        factSlots: (input.outputPack?.facts.missingInputs || []).map((missingInput) => ({
            ownerQuestion: missingInput.ownerQuestion,
            protected: true,
            required: missingInput.required,
            type: missingInput.type,
        })),
        outputPackShape: {
            channels: outputChannels.length ? outputChannels : input.campaign.channels,
            copyBlocks,
            deliveryCards,
            printFormats,
            resultQuestion: input.outputPack?.resultMemory.question
                || input.campaign.pack?.resultQuestion
                || "Did this campaign help?",
        },
        reuseRules: {
            allowCueLayersSource: true,
            allowSavedAssetSource: true,
            staleFactPolicy: "rehydrate_or_block",
        },
        schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
        templateId: `cc_pack_${normalizeToken(input.campaign.id)}`,
        trustChecks: compactUnique(input.outputPack?.trustReport.checked || [], 20),
    };
}

export function buildCampaignCueWorkspaceTemplateSaveInput(input: {
    businessBrain: CampaignCueBusinessBrain & { businessCategory?: string };
    campaign: CampaignCueCampaign;
    editorDocument?: CreativeEditorDocument;
    outputPack?: CampaignCueOutputPack;
    previewDataUrl?: string;
    workspaceId: string;
}): CampaignCueWorkspacePackTemplateSaveInput {
    const businessCategory = resolveCampaignCuePackTemplateCategory({
        businessCategory: input.businessBrain.businessCategory,
        businessType: input.businessBrain.businessType,
    });
    const payload = buildCampaignCuePackTemplatePayloadFromCampaign({
        campaign: input.campaign,
        outputPack: input.outputPack,
    });
    const outputTypes = compactUnique([
        ...input.campaign.outputs.map((output) => outputTypeForPostType(output.fields.postType)),
        input.outputPack?.proofDeck ? "campaign_proof_deck_pdf" : undefined,
    ],
        20,
    ) as CampaignCueDecisionOutputType[];
    const requiredFactTypes = compactUnique(input.outputPack?.facts.missingInputs
        .filter((missingInput) => missingInput.required)
        .map((missingInput) => missingInput.type) || [], 20);
    const reusableGoal = ownerGoalLabel(payload.decisionSeed.ownerGoal);

    return {
        businessCategory,
        editorDocument: input.editorDocument,
        payload,
        previewDataUrl: input.previewDataUrl,
        summary: {
            businessCategory,
            channels: input.campaign.channels,
            description: `Reusable ${reusableGoal} pack. Current business facts are checked before use.`,
            eventTags: [],
            optionalFactTypes: compactUnique(input.outputPack?.facts.missingInputs
                .filter((missingInput) => !missingInput.required)
                .map((missingInput) => missingInput.type) || [], 16),
            outputTypes,
            ownerGoals: [payload.decisionSeed.ownerGoal],
            priority: 100,
            qualityTier: "workspace_saved",
            recipeIds: [payload.decisionSeed.recipeId],
            requiredFactTypes,
            schemaVersion: CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY.SCHEMA_VERSION,
            searchTokens: compactUnique([
                input.businessBrain.businessType,
                businessCategory,
                ...input.campaign.channels,
                ...outputTypes,
                ...requiredFactTypes,
                input.businessBrain.brandKit.playbook.targetAudience,
                ...input.businessBrain.brandKit.playbook.brandFeel,
                ...input.businessBrain.brandKit.playbook.visualMotifs,
                ...input.businessBrain.brandKit.playbook.productFocus,
            ]),
            status: "active",
            styleTags: compactUnique([
                input.businessBrain.brandKit.voice,
                input.outputPack?.trustReport.status,
                ...input.businessBrain.brandKit.playbook.brandFeel,
                ...input.businessBrain.brandKit.playbook.visualMotifs,
            ], 20),
            supportedBusinessTypes: [input.businessBrain.businessType],
            templateId: payload.templateId,
            templateKind: "campaign_pack",
            templateType: "workspace",
            title: `Saved ${reusableGoal} pack`,
            trustChecks: payload.trustChecks,
        },
        workspaceId: input.workspaceId,
    };
}

export function summarizeCampaignCuePackTemplateApplication(
    template: CampaignCuePackTemplateHydrated,
    unresolvedRequiredCount = template.payload.factSlots.filter((slot) => slot.required).length,
): string {
    if (unresolvedRequiredCount) {
        return `Template loaded. Confirm ${unresolvedRequiredCount} required detail${unresolvedRequiredCount === 1 ? "" : "s"} before using this pack.`;
    }
    if (template.editorDocument) {
        return "Template loaded in the editor. Check facts before exporting.";
    }
    return "Template loaded. Check facts and prepare the pack before exporting.";
}
