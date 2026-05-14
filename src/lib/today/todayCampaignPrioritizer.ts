import { TodayCampaignSummary } from "@type/campaigns";

const INTENT_SCORE: Record<string, number> = {
    broadcast_attention: 30,
    direct_customer_notify: 20,
    in_store_reinforcement: 10,
};

const KIND_SCORE: Record<string, number> = {
    active: 20,
    passive: 5,
};

const confidenceBonus = (confidence: number) => {
    if (confidence >= 0.85) return 20;
    if (confidence >= 0.7) return 10;
    if (confidence >= 0.5) return 5;
    return 0;
};

export const getTodayCampaignPriorityScore = (campaign: TodayCampaignSummary) => {
    const intentPriority = INTENT_SCORE[campaign.intent] || 0;
    const kindPriority = KIND_SCORE[campaign.kind] || 0;
    const confidencePriority = confidenceBonus(campaign.confidence);
    return intentPriority + kindPriority + confidencePriority;
};

export const sortOperationalCampaignsByPriority = (campaigns: TodayCampaignSummary[] = []) => {
    return [...campaigns].sort((a, b) => getTodayCampaignPriorityScore(b) - getTodayCampaignPriorityScore(a));
};

