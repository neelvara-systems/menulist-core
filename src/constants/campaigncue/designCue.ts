import type { CreativeEditorDesignCueCommand } from "@/modules/creative-editor/types";

export const CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS = {
    ADD_LOCATION: "campaigncue.design_cue.add_location",
    ADD_WHATSAPP: "campaigncue.design_cue.add_whatsapp",
    BIGGER_OFFER: "campaigncue.design_cue.bigger_offer",
    CHECK_BRAND: "campaigncue.design_cue.check_brand",
    CHECK_FACTS: "campaigncue.design_cue.check_facts",
    EXPORT_CHECKLIST: "campaigncue.design_cue.export_checklist",
    MAKE_GOOGLE_READY: "campaigncue.design_cue.make_google_ready",
    MAKE_PREMIUM: "campaigncue.design_cue.make_premium",
    MAKE_PRINT_READY: "campaigncue.design_cue.make_print_ready",
    MAKE_SIMPLE: "campaigncue.design_cue.make_simple",
    MAKE_WHATSAPP_READY: "campaigncue.design_cue.make_whatsapp_ready",
    RESIZE_POSTER: "campaigncue.design_cue.resize_poster",
    RESIZE_SQUARE: "campaigncue.design_cue.resize_square",
    RESIZE_STORY: "campaigncue.design_cue.resize_story",
    RESIZE_WIDE: "campaigncue.design_cue.resize_wide",
    REWRITE_FRIENDLY: "campaigncue.design_cue.rewrite_friendly",
    SHORTER_TEXT: "campaigncue.design_cue.shorter_text",
    TOO_BUSY: "campaigncue.design_cue.too_busy",
} as const;

export type CampaignCueDesignCueActionId = (
    typeof CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS
)[keyof typeof CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS];

export const CAMPAIGNCUE_DESIGN_CUE_LIMITS = {
    MAX_COMMENT_LENGTH: 500,
    MAX_OPERATIONS_PER_PATCH_SET: 8,
    MAX_TEXT_LENGTH: 700,
    MIN_LAYER_SIZE: 8,
} as const;

export const CAMPAIGNCUE_DESIGN_CUE_ALLOWED_LAYER_PATCH_KEYS = [
    "align",
    "color",
    "fill",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "height",
    "lineHeight",
    "name",
    "opacity",
    "rotation",
    "stroke",
    "strokeWidth",
    "visible",
    "width",
    "x",
    "y",
] as const;

export const CAMPAIGNCUE_DESIGN_CUE_COMMANDS: CreativeEditorDesignCueCommand[] = [
    {
        description: "Make the selected offer text larger, or add a clear offer line.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.BIGGER_OFFER,
        label: "Bigger offer",
        ownerHint: "No provider call",
    },
    {
        description: "Shorten the selected text so it fits better on the asset.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.SHORTER_TEXT,
        label: "Shorter text",
        ownerHint: "Select text first",
        requiresSelection: true,
    },
    {
        description: "Add the saved locality as editable text.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_LOCATION,
        label: "Add location",
        ownerHint: "Uses Business Brain",
    },
    {
        description: "Add the saved WhatsApp, phone, booking, menu, or website contact.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_WHATSAPP,
        label: "Add contact line",
        ownerHint: "Uses approved contact",
    },
    {
        description: "Convert the design to a square feed asset.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_SQUARE,
        label: "Make square",
        ownerHint: "Local resize",
    },
    {
        description: "Convert the design to a tall story asset.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_STORY,
        label: "Make story",
        ownerHint: "Local resize",
    },
    {
        description: "Convert the design to a print-style poster.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_POSTER,
        label: "Make poster",
        ownerHint: "Local resize",
    },
    {
        description: "Convert the design to a wide cover asset.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_WIDE,
        label: "Make wide",
        ownerHint: "Local resize",
    },
    {
        description: "Check visible text against known business facts.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_FACTS,
        label: "Check facts",
        ownerHint: "No provider call",
    },
    {
        description: "Check business name, logo, color, and brand presence.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_BRAND,
        label: "Check brand",
        ownerHint: "No provider call",
    },
    {
        description: "Show the manual checks before download and use.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.EXPORT_CHECKLIST,
        label: "Export checklist",
        ownerHint: "Download only",
    },
    {
        description: "Check whether this asset is ready to use with a WhatsApp image and message.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_WHATSAPP_READY,
        label: "Ready for WhatsApp",
        ownerHint: "No sending",
    },
    {
        description: "Check whether this asset has the fields needed for a Google update, offer, or event handoff.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_GOOGLE_READY,
        label: "Ready for Google",
        ownerHint: "No account action",
    },
    {
        description: "Check print-readiness before using a poster, flyer, counter card, or coupon sheet.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PRINT_READY,
        label: "Ready for print",
        ownerHint: "Flattened export",
    },
    {
        description: "Suggest a simpler version without deleting layers automatically.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_SIMPLE,
        label: "Make it simpler",
        ownerHint: "Review first",
    },
    {
        description: "Make selected text feel more premium with safer typography.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PREMIUM,
        label: "Make it premium",
        ownerHint: "No provider call",
    },
    {
        description: "Review clutter and readability before export.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.TOO_BUSY,
        label: "Looks too busy",
        ownerHint: "No provider call",
    },
    {
        description: "Create a friendlier selected-text version without changing facts.",
        id: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.REWRITE_FRIENDLY,
        label: "Rewrite friendly",
        ownerHint: "Deterministic fallback",
        requiresSelection: true,
    },
];
