export const CAMPAIGNCUE_CAMPAIGN_MEMORY_SCHEMA_VERSION = 1 as const;
export const CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_RECIPE_SIGNALS = 16;
export const CAMPAIGNCUE_CAMPAIGN_MEMORY_MAX_COUNTER = 1_000_000_000;

export const CAMPAIGNCUE_CAMPAIGN_MEMORY_NEGATIVE_SIGNAL_ID = "not_useful";
export const CAMPAIGNCUE_CAMPAIGN_MEMORY_NOT_USED_SIGNAL_ID = "not_used";

export const CAMPAIGNCUE_CAMPAIGN_MEMORY_METRIC_KEYS = [
    "replies",
    "calls",
    "bookings",
    "orders",
    "walkIns",
    "linkClicks",
] as const;
