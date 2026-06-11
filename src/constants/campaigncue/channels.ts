export const CAMPAIGNCUE_CHANNELS = [
    "whatsapp",
    "google_local",
    "creative",
    "video",
    "ugc",
    "ads",
    "calendar",
] as const;

export type CampaignCueChannelConstant = typeof CAMPAIGNCUE_CHANNELS[number];

export const CAMPAIGNCUE_CHANNEL_LABELS: Record<CampaignCueChannelConstant, string> = {
    whatsapp: "WhatsApp",
    google_local: "Google local",
    creative: "Creative",
    video: "Video/Reel",
    ugc: "UGC script",
    ads: "Ads",
    calendar: "Calendar",
};

export const CAMPAIGNCUE_MANUAL_PROVIDER_POSTURE = {
    whatsapp: "manual_export",
    google_local: "manual_fallback",
    meta_ads: "manual_handoff",
    google_ads: "manual_handoff",
    video_render: "brief_only",
} as const;

