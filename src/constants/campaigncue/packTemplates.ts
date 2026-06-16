import { BUSINESS_CATEGORIES } from "@data/shared/businessTypes";

export const CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY = {
    PLATFORM_COLLECTION: "campaigncuePlatformPackTemplates",
    WORKSPACE_INDEX_COLLECTION: "packTemplateIndexes",
    WORKSPACE_INDEX_DOC_ID: "default",
    SCHEMA_VERSION: 1,
    STORAGE_ROOT: "campaigncue/templates",
    PLATFORM_STORAGE_ROOT: "campaigncue/templates/platform",
    WORKSPACE_STORAGE_ROOT: "campaigncue/templates/workspaces",
    SHARED_PLATFORM_STORAGE_ROOT: "campaigncue/templates/platform/shared",
    MAX_ACTIVE_PLATFORM_TEMPLATES_PER_DOC: 80,
    MAX_WORKSPACE_TEMPLATES: 100,
    MAX_FIRESTORE_CATALOG_BYTES: 750_000,
    MAX_PAYLOAD_BYTES: 750_000,
    MAX_EDITOR_DOCUMENT_BYTES: 750_000,
    MAX_PREVIEW_BYTES: 750_000,
} as const;

export const CAMPAIGNCUE_PACK_TEMPLATE_BUSINESS_CATEGORIES = BUSINESS_CATEGORIES.map((category) => category.value);

export const CAMPAIGNCUE_PACK_TEMPLATE_EVENT_TAGS = [
    "diwali",
    "christmas",
    "new_year",
    "birthday",
    "festival",
    "weekend",
    "weekday",
    "seasonal",
    "local_visibility",
    "repeat_customer",
] as const;

export const CAMPAIGNCUE_PACK_TEMPLATE_KINDS = [
    "campaign_pack",
    "editor_layout",
    "handoff_pack",
    "reuse_asset",
] as const;

export const CAMPAIGNCUE_PACK_TEMPLATE_STATUSES = [
    "active",
    "hidden",
    "retired",
] as const;

export const CAMPAIGNCUE_PACK_TEMPLATE_OWNER_COPY = {
    empty: "No reusable campaign pack matches this business category yet.",
    loadError: "Templates could not be loaded. You can still create a fresh campaign pack.",
    loaded: "Template ready. Confirm missing details before using the pack.",
    saved: "Reusable campaign pack saved for this workspace.",
    saveBlocked: "Create or open a campaign pack before saving it as a reusable base.",
    noExtraReads: "Search is filtered locally from the loaded category templates.",
} as const;
