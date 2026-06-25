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
    ugc: "Local creator brief",
    ads: "Ads",
    calendar: "Calendar",
};
