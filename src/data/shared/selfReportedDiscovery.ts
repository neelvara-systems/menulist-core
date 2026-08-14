export const SELF_REPORTED_DISCOVERY_CHANNELS = [
    'chatgpt',
    'claude',
    'gemini',
    'microsoft_copilot',
    'perplexity',
    'search_engine',
    'social_or_community',
    'friend_or_colleague',
    'other',
] as const;

export type SelfReportedDiscoveryChannel = typeof SELF_REPORTED_DISCOVERY_CHANNELS[number];
export type SelfReportedDiscoveryCategory = 'ai_assistant' | 'search' | 'social_community' | 'referral' | 'other';

export interface SelfReportedDiscoveryAttribution {
    category: SelfReportedDiscoveryCategory;
    channel: SelfReportedDiscoveryChannel;
    method: 'self_reported';
}

const CATEGORY_BY_CHANNEL: Record<SelfReportedDiscoveryChannel, SelfReportedDiscoveryCategory> = {
    chatgpt: 'ai_assistant',
    claude: 'ai_assistant',
    gemini: 'ai_assistant',
    microsoft_copilot: 'ai_assistant',
    perplexity: 'ai_assistant',
    search_engine: 'search',
    social_or_community: 'social_community',
    friend_or_colleague: 'referral',
    other: 'other',
};

export const isSelfReportedDiscoveryChannel = (
    value: unknown,
): value is SelfReportedDiscoveryChannel => (
    typeof value === 'string'
    && SELF_REPORTED_DISCOVERY_CHANNELS.some((channel) => channel === value)
);

export const buildSelfReportedDiscoveryAttribution = (
    value: unknown,
): SelfReportedDiscoveryAttribution | null => {
    if (!isSelfReportedDiscoveryChannel(value)) return null;

    return {
        category: CATEGORY_BY_CHANNEL[value],
        channel: value,
        method: 'self_reported',
    };
};
