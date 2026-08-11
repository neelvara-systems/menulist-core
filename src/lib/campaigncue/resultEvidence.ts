import {
    CAMPAIGNCUE_RESULT_EVIDENCE_METRICS,
    CAMPAIGNCUE_RESULT_EVIDENCE_PROVIDERS,
    CAMPAIGNCUE_RESULT_EVIDENCE_SCOPES,
} from "@constant/campaigncue/resultEvidence";
import type {
    CampaignCueReadOnlyResultEvidence,
    CampaignCueResultEvidenceInput,
} from "@type/campaigncue";
import { createHash } from "crypto";

const compactMetrics = (metrics: CampaignCueResultEvidenceInput["metrics"]) => Object.fromEntries(
    CAMPAIGNCUE_RESULT_EVIDENCE_METRICS.flatMap((metric) => {
        const value = metrics[metric];
        return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
            ? [[metric, value] as const]
            : [];
    }),
) as CampaignCueReadOnlyResultEvidence["metrics"];

export const buildCampaignCueResultEvidenceFingerprint = (
    input: CampaignCueResultEvidenceInput,
) => createHash("sha256").update(JSON.stringify({
    metrics: compactMetrics(input.metrics),
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    provider: input.provider,
    scope: input.scope,
}), "utf8").digest("hex").slice(0, 24);

export const buildCampaignCueReadOnlyResultEvidence = (params: {
    input: CampaignCueResultEvidenceInput;
    recordedAt: unknown;
}): CampaignCueReadOnlyResultEvidence => ({
    schemaVersion: 1,
    source: "owner_copied_report",
    confidence: "manual",
    attribution: "directional_not_campaign_attribution",
    provider: params.input.provider,
    scope: params.input.scope,
    periodStart: params.input.periodStart,
    periodEnd: params.input.periodEnd,
    metrics: compactMetrics(params.input.metrics),
    note: params.input.note?.trim() || undefined,
    sourceFingerprint: buildCampaignCueResultEvidenceFingerprint(params.input),
    recordedAt: params.recordedAt,
});

export const campaignCueResultEvidenceProviderLabel = (
    provider: CampaignCueResultEvidenceInput["provider"],
) => ({
    google_business_profile: "Google Business Profile",
    google_ads: "Google Ads",
    meta_ads: "Meta Ads",
    instagram_insights: "Instagram insights",
    facebook_insights: "Facebook insights",
}[provider]);

export const isCampaignCueResultEvidenceProvider = (value: unknown) => (
    typeof value === "string"
    && (CAMPAIGNCUE_RESULT_EVIDENCE_PROVIDERS as readonly string[]).includes(value)
);

export const isCampaignCueResultEvidenceScope = (value: unknown) => (
    typeof value === "string"
    && (CAMPAIGNCUE_RESULT_EVIDENCE_SCOPES as readonly string[]).includes(value)
);
