import { CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES } from "@constant/campaigncue/cueLayers";
import type {
    CampaignCueCueLayerModelCapability,
    CampaignCueCueLayerModelRegistryEntry,
} from "@type/campaigncueCueLayers";

export const CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY: CampaignCueCueLayerModelRegistryEntry[] = [
    {
        capabilities: ["image_generation", "layout_reasoning", "text_safety"],
        costTier: "low",
        enabled: true,
        modelId: process.env.CAMPAIGNCUE_CUE_LAYERS_LOW_COST_IMAGE_MODEL || "registry:google-low-cost-image",
        provider: "google",
        releaseStage: "stable",
        rolloutPercent: 100,
    },
    {
        capabilities: ["image_generation", "image_editing", "layout_reasoning", "text_safety"],
        costTier: "premium",
        enabled: Boolean(process.env.CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL),
        modelId: process.env.CAMPAIGNCUE_CUE_LAYERS_PREMIUM_IMAGE_MODEL || "registry:google-premium-image",
        provider: "google",
        releaseStage: "preview",
        rolloutPercent: Number(process.env.CAMPAIGNCUE_CUE_LAYERS_PREMIUM_ROLLOUT_PERCENT || 0),
    },
    {
        capabilities: ["segmentation_masks"],
        costTier: "medium",
        enabled: Boolean(process.env.CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL),
        modelId: process.env.CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL || "registry:segmentation-adapter",
        provider: "internal",
        releaseStage: "stable",
        rolloutPercent: Number(process.env.CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT || 0),
    },
];

export function pickCampaignCueCueLayerModel(params: {
    capability: CampaignCueCueLayerModelCapability;
    maxCostTier?: "low" | "medium" | "premium";
}): CampaignCueCueLayerModelRegistryEntry | null {
    const tierOrder = { low: 0, medium: 1, premium: 2 };
    const maxTier = tierOrder[params.maxCostTier || "low"];
    return CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY
        .filter((entry) => entry.enabled)
        .filter((entry) => entry.releaseStage !== "deprecated")
        .filter((entry) => entry.capabilities.includes(params.capability))
        .filter((entry) => tierOrder[entry.costTier] <= maxTier)
        .sort((a, b) => tierOrder[a.costTier] - tierOrder[b.costTier])[0] || null;
}

export function assertCampaignCueCueLayerCapability(value: string): value is CampaignCueCueLayerModelCapability {
    return CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES.includes(value as CampaignCueCueLayerModelCapability);
}
