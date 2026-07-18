export const CAMPAIGNCUE_DELIVERY_MODE = "export_download_only" as const;

export const CAMPAIGNCUE_EXPORT_ACTIONS = [
    "download",
    "export",
    "mark_used",
    "record_outcome",
    "request_approval",
    "approve",
    "reject",
    "schedule",
] as const;

export const CAMPAIGNCUE_DISABLED_PROVIDER_ACTIONS = [
    "direct_publish",
    "direct_send",
    "provider_metrics_import",
    "ad_create",
    "ad_edit",
    "ad_budget_mutate",
    "ad_catalog_mutate",
    "ad_experiment_mutate",
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
        "tenant-scoped authorization and revocation",
        "provider capability allowlist",
        "consent and opt-out controls",
        "quota and retry limits",
        "compact provider result summaries",
        "spend approval",
        "idempotent provider jobs",
        "manual export fallback",
    ],
} as const;

export const CAMPAIGNCUE_META_ADS_MCP_POSTURE = {
    id: "meta_ads_mcp_read_first",
    provider: "meta_ads",
    status: "disabled",
    activeMode: "manual_handoff_only",
    rolloutMode: "read_first",
    readCandidates: [
        "comprehensive_reporting",
        "activity_logs",
        "signals_and_datasets",
        "help_and_troubleshooting",
    ],
    deferredAdvancedCapabilities: [
        "catalog_creation_and_management",
        "ab_tests_and_conversion_lift_studies",
    ],
    blockedMutations: [
        "ad_creation",
        "ad_editing",
        "budget_or_spend_change",
        "catalog_mutation",
        "experiment_mutation",
    ],
    activationGate: [
        "explicit owner account connection and ad-account selection",
        "server-only authorization and token storage outside Firestore",
        "verified Meta scopes, app review, and tool-level restrictions",
        "deterministic read-tool allowlist with no arbitrary model tool choice",
        "workspace role checks, revocation, timeout, and bounded retry controls",
        "owner-triggered or bounded refresh into one compact summary",
        "confidence-labelled provider evidence without sales or ROI inference",
        "manual ad-pack handoff fallback",
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
        reason: "Download an ad handoff pack. Read-first Meta reporting and diagnostics are future-only; no account connection, metrics import, or ad mutation runs.",
    },
    {
        provider: "video_render",
        label: "Video rendering",
        mode: "brief_only",
        status: "manual_only",
        reason: "Download a reel brief. CampaignCue does not render or upload videos in the active runtime.",
    },
] as const;
