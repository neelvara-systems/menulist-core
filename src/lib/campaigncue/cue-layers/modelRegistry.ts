import { CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES } from "@constant/campaigncue/cueLayers";
import type {
    CampaignCueCueLayerModelCapability,
    CampaignCueCueLayerModelRegistryEntry,
} from "@type/campaigncueCueLayers";

const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_ENV_VALUES = new Set(["0", "false", "no", "off"]);
const NON_MODEL_ID_ENV_VALUES = new Set([
    "0",
    "1",
    "false",
    "no",
    "off",
    "on",
    "true",
    "yes",
]);

function readBooleanEnvironmentValue(value: string | undefined): boolean {
    return TRUE_ENV_VALUES.has(String(value || "").trim().toLowerCase());
}

function readConfiguredModelId(value: string | undefined): string | null {
    const normalized = String(value || "").trim();
    if (!normalized || NON_MODEL_ID_ENV_VALUES.has(normalized.toLowerCase())) return null;
    return normalized;
}

function readRolloutPercent(value: string | undefined, fallback: number): number {
    const parsed = Number(String(value || "").trim());
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(100, Math.max(0, parsed));
}

const lowCostImageModelId = readConfiguredModelId(
    process.env.CAMPAIGNCUE_CUE_LAYERS_LOW_COST_IMAGE_MODEL,
);
const premiumImageModelId = readConfiguredModelId(
    process.env.CAMPAIGNCUE_CUE_LAYERS_PREMIUM_IMAGE_MODEL,
);
const segmentationModelId = readConfiguredModelId(
    process.env.CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_MODEL,
);

export const CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY: CampaignCueCueLayerModelRegistryEntry[] = [
    {
        capabilities: ["image_generation", "layout_reasoning", "text_safety"],
        costTier: "low",
        enabled: true,
        modelId: lowCostImageModelId || "registry:google-low-cost-image",
        provider: "google",
        releaseStage: "stable",
        rolloutPercent: 100,
    },
    {
        capabilities: ["image_generation", "image_editing", "layout_reasoning", "text_safety"],
        costTier: "premium",
        enabled: readBooleanEnvironmentValue(
            process.env.CAMPAIGNCUE_CUE_LAYERS_ENABLE_PREMIUM_MODEL,
        ),
        modelId: premiumImageModelId || "registry:google-premium-image",
        provider: "google",
        releaseStage: "preview",
        rolloutPercent: readRolloutPercent(
            process.env.CAMPAIGNCUE_CUE_LAYERS_PREMIUM_ROLLOUT_PERCENT,
            0,
        ),
    },
    {
        capabilities: ["segmentation_masks"],
        costTier: "medium",
        enabled: segmentationModelId !== null,
        modelId: segmentationModelId || "registry:segmentation-adapter",
        provider: "internal",
        releaseStage: "stable",
        rolloutPercent: readRolloutPercent(
            process.env.CAMPAIGNCUE_CUE_LAYERS_SEGMENTATION_ROLLOUT_PERCENT,
            0,
        ),
    },
];

export function pickCampaignCueCueLayerModel(params: {
    capability: CampaignCueCueLayerModelCapability;
    maxCostTier?: "low" | "medium" | "premium";
    /** Stable caller-derived bucket from 0 through 99 for partial rollouts. */
    rolloutBucket?: number;
}): CampaignCueCueLayerModelRegistryEntry | null {
    const tierOrder = { low: 0, medium: 1, premium: 2 };
    const maxTier = tierOrder[params.maxCostTier || "low"];
    const rolloutBucket = Number.isInteger(params.rolloutBucket)
        && Number(params.rolloutBucket) >= 0
        && Number(params.rolloutBucket) <= 99
        ? Number(params.rolloutBucket)
        : null;
    return CAMPAIGNCUE_CUE_LAYER_MODEL_REGISTRY
        .filter((entry) => entry.enabled)
        .filter((entry) => entry.releaseStage !== "deprecated")
        .filter((entry) => entry.capabilities.includes(params.capability))
        .filter((entry) => tierOrder[entry.costTier] <= maxTier)
        .filter((entry) => (
            entry.rolloutPercent >= 100
            || (
                entry.rolloutPercent > 0
                && rolloutBucket !== null
                && rolloutBucket < entry.rolloutPercent
            )
        ))
        .sort((a, b) => tierOrder[a.costTier] - tierOrder[b.costTier])[0] || null;
}

export function assertCampaignCueCueLayerCapability(value: string): value is CampaignCueCueLayerModelCapability {
    return CAMPAIGNCUE_CUE_LAYER_MODEL_CAPABILITIES.includes(value as CampaignCueCueLayerModelCapability);
}
