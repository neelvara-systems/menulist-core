export const CAMPAIGNCUE_DELIVERY_MODE = "export_download_only" as const;

export const CAMPAIGNCUE_EXPORT_ACTIONS = [
    "download",
    "export",
    "mark_used",
    "record_outcome",
    "request_approval",
    "schedule",
] as const;

export const CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS = [
    "direct_publish",
    "direct_send",
] as const;

export const CAMPAIGNCUE_DAY_ONE_DELIVERY = {
    label: "Export and download",
    mode: CAMPAIGNCUE_DELIVERY_MODE,
    ownerSummary: "CampaignCue prepares packs. Owners download generated assets and post manually.",
    providerSummary: "No social account connection, direct posting, ad spend, or provider send runs in the day-one product.",
} as const;

export const CAMPAIGNCUE_FUTURE_PROVIDER_LAYER = {
    label: "Future provider layer",
    status: "disabled_day_one",
    ownerSummary: "Provider connections are a separate future contract, not part of the active owner workflow.",
    activationGate: [
        "provider credentials",
        "consent and opt-out controls",
        "quota and retry limits",
        "spend approval",
        "idempotent provider jobs",
        "manual export fallback",
    ],
} as const;

export const CAMPAIGNCUE_PROVIDER_POSTURES = [
    {
        provider: "whatsapp",
        label: "WhatsApp",
        mode: "manual_export",
        status: "manual_only",
        reason: "Download WhatsApp-ready text and materials. Direct send is not part of the active product.",
    },
    {
        provider: "google_business_profile",
        label: "Google Business Profile",
        mode: "manual_export",
        status: "manual_only",
        reason: "Download Google-ready post text. Connected publishing is a separate future layer.",
    },
    {
        provider: "google_ads",
        label: "Google Ads",
        mode: "manual_handoff",
        status: "manual_only",
        reason: "Download an ad handoff pack. CampaignCue does not create ads or start spend.",
    },
    {
        provider: "meta_ads",
        label: "Meta Ads",
        mode: "manual_handoff",
        status: "manual_only",
        reason: "Download an ad handoff pack. CampaignCue does not connect social ad accounts.",
    },
    {
        provider: "video_render",
        label: "Video rendering",
        mode: "brief_only",
        status: "manual_only",
        reason: "Download a reel brief. CampaignCue does not render or upload videos in the active runtime.",
    },
] as const;
