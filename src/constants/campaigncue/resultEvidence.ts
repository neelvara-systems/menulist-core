export const CAMPAIGNCUE_RESULT_EVIDENCE_PROVIDERS = [
    "google_business_profile",
    "google_ads",
    "meta_ads",
    "instagram_insights",
    "facebook_insights",
] as const;

export const CAMPAIGNCUE_RESULT_EVIDENCE_SCOPES = [
    "campaign_specific",
    "location_window",
    "account_window",
] as const;

export const CAMPAIGNCUE_RESULT_EVIDENCE_METRICS = [
    "impressions",
    "reach",
    "profileViews",
    "websiteClicks",
    "callClicks",
    "directionRequests",
    "messages",
    "linkClicks",
] as const;

export const CAMPAIGNCUE_RESULT_EVIDENCE_ROLES = [
    "owner",
    "admin",
    "marketer",
    "local_manager",
    "agency_member",
] as const;

export const campaignCueCanRecordResultEvidence = (role?: string) => (
    Boolean(role && (CAMPAIGNCUE_RESULT_EVIDENCE_ROLES as readonly string[]).includes(role))
);

export const CAMPAIGNCUE_RESULT_EVIDENCE_MAX_WINDOW_DAYS = 92;

export const CAMPAIGNCUE_READ_ONLY_RESULT_CONNECTOR_POSTURE = {
    activeInputMode: "owner_copied_report",
    attributionBoundary: "directional_not_campaign_attribution",
    providerApiStatus: "disabled_until_verified_connection",
    summary: "Owners can save a compact summary from a provider report. CampaignCue does not connect, post, change spend, or treat the numbers as campaign attribution.",
    activationGate: [
        "provider-approved OAuth and account selection",
        "server-only credential storage and revocation",
        "read-method allowlist",
        "bounded date window and metric allowlist",
        "provider response validation",
        "quota, timeout, retry, and audit controls",
        "manual result fallback",
    ],
} as const;
