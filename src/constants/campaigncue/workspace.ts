import type { CampaignCueChannelConstant } from "./channels";

export const CAMPAIGNCUE_DEFAULT_LOCALE = "en";
export const CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR = "#315d52";
export const CAMPAIGNCUE_DEFAULT_TIMEZONE = "Asia/Kolkata";

export const CAMPAIGNCUE_CHANNEL_STUDIO_COPY: Partial<Record<CampaignCueChannelConstant, {
    eyebrow: string;
    title: string;
    empty: string;
}>> = {
    ads: {
        eyebrow: "Ads Studio",
        title: "Ad handoffs",
        empty: "Create a campaign pack with ads selected to prepare spend-safe handoff copy.",
    },
    creative: {
        eyebrow: "Creative Studio",
        title: "Creative outputs",
        empty: "Create a campaign pack to prepare creative briefs and social copy.",
    },
    google_local: {
        eyebrow: "Google Local Studio",
        title: "Google local drafts",
        empty: "Create a campaign pack with Google local selected to prepare manual post copy.",
    },
    ugc: {
        eyebrow: "UGC Script Studio",
        title: "Creator scripts",
        empty: "Create a campaign pack with UGC selected to prepare source-safe creator scripts.",
    },
    video: {
        eyebrow: "Video/Reel Studio",
        title: "Reel briefs",
        empty: "Create a campaign pack with video selected to prepare a brief-mode reel script.",
    },
    whatsapp: {
        eyebrow: "WhatsApp Sales Studio",
        title: "WhatsApp drafts",
        empty: "Create a campaign pack with WhatsApp selected to prepare consent-safe manual copy.",
    },
};

export const CAMPAIGNCUE_SOURCE_TYPE_LABELS: Record<string, string> = {
    booking_link: "Booking link",
    event: "Event",
    manual_note: "Manual note",
    menu_link: "Menu link",
    offer: "Offer",
    upload_metadata: "Uploaded file note",
};
