import type {
    CampaignCueChannel,
    CampaignCueDecisionOutputType,
    CampaignCueOutputIntentId,
} from "@type/campaigncue";
import type { CampaignCueDailyDeskOwnerGoal } from "@constant/campaigncue/dailyDesk";
import type {
    CampaignCuePackTemplateKind,
    CampaignCuePackTemplateSummary,
} from "@type/campaigncuePackTemplates";

export type CampaignCueOutputPickerGroupId =
    | "recommended"
    | "sell_today"
    | "bookings"
    | "local_visibility"
    | "print"
    | "handoff"
    | "reuse"
    | "advanced";

export type CampaignCueOutputPickerItemId = CampaignCueOutputIntentId;

export const CAMPAIGNCUE_OUTPUT_PICKER_ITEM_IDS = [
    "recommended_pack",
    "source_to_channel_pack",
    "whatsapp_sales_pack",
    "booking_push_pack",
    "google_local_update",
    "instagram_post_story",
    "print_in_store",
    "staff_share_pack",
    "ad_handoff_pack",
    "local_creator_test_brief",
    "campaign_proof_deck",
    "reuse_old_asset",
    "custom_size",
] as const satisfies readonly CampaignCueOutputPickerItemId[];

export interface CampaignCueOutputIntentRequirement {
    factTypes: string[];
    ownerQuestion: string;
}

export interface CampaignCueOutputPickerGroup {
    description: string;
    id: CampaignCueOutputPickerGroupId;
    title: string;
}

export interface CampaignCueOutputPickerItem {
    actionLabel: string;
    channels: CampaignCueChannel[];
    description: string;
    factMatchTypes: string[];
    groupId: CampaignCueOutputPickerGroupId;
    id: CampaignCueOutputPickerItemId;
    ownerGoals: CampaignCueDailyDeskOwnerGoal[];
    outputTypes: CampaignCueDecisionOutputType[];
    requiredFactGroups: CampaignCueOutputIntentRequirement[];
    searchTokens: string[];
    templateKinds: CampaignCuePackTemplateKind[];
    title: string;
}

export const CAMPAIGNCUE_OUTPUT_PICKER_GROUPS: CampaignCueOutputPickerGroup[] = [
    {
        description: "Start from the current Daily Desk cue or source-backed campaign context.",
        id: "recommended",
        title: "Recommended",
    },
    {
        description: "Use when the owner needs orders, replies, or same-day interest.",
        id: "sell_today",
        title: "Sell today",
    },
    {
        description: "Use when the owner needs bookings, calls, or filled slots.",
        id: "bookings",
        title: "Fill bookings",
    },
    {
        description: "Use when no strong offer is ready but local presence needs attention.",
        id: "local_visibility",
        title: "Stay visible",
    },
    {
        description: "Use for counters, windows, reception desks, handouts, and QR cards.",
        id: "print",
        title: "Print and in-store",
    },
    {
        description: "Use when the owner needs copy or an external handoff, not a design task.",
        id: "handoff",
        title: "Handoff",
    },
    {
        description: "Use existing posters, screenshots, and reusable owner assets safely.",
        id: "reuse",
        title: "Reuse",
    },
    {
        description: "Use only when a standard campaign output does not fit.",
        id: "advanced",
        title: "Advanced",
    },
];

export const CAMPAIGNCUE_OUTPUT_PICKER_ITEMS: CampaignCueOutputPickerItem[] = [
    {
        actionLabel: "Use recommended pack",
        channels: [],
        description: "Keep the Daily Desk recommendation and its current output mix.",
        factMatchTypes: [],
        groupId: "recommended",
        id: "recommended_pack",
        ownerGoals: [],
        outputTypes: [],
        requiredFactGroups: [],
        searchTokens: ["recommended", "daily_desk", "campaign_pack"],
        templateKinds: ["campaign_pack", "editor_layout", "handoff_pack", "reuse_asset"],
        title: "Recommended pack",
    },
    {
        actionLabel: "Prepare source pack",
        channels: ["whatsapp", "google_local", "creative", "calendar"],
        description: "Turn the current source-backed campaign cue into WhatsApp, Google/local, social, print, manual task, and result prompt.",
        factMatchTypes: ["business_name", "location_detail", "menu_item", "service", "product", "price", "availability", "booking_link", "whatsapp_number"],
        groupId: "recommended",
        id: "source_to_channel_pack",
        ownerGoals: [],
        outputTypes: ["whatsapp_message", "google_update", "instagram_square", "poster_pdf", "staff_share_text", "manual_task"],
        requiredFactGroups: [
            { factTypes: ["business_name"], ownerQuestion: "Confirm the business name before preparing this pack." },
            { factTypes: ["location_detail", "location", "branch_location"], ownerQuestion: "Confirm the business location before preparing this pack." },
            { factTypes: ["menu_item", "service", "product", "offer"], ownerQuestion: "Choose the item, service, product, or offer this pack should promote." },
            { factTypes: ["whatsapp_number"], ownerQuestion: "Confirm the WhatsApp number before preparing the WhatsApp part of this pack." },
        ],
        searchTokens: ["source", "distribution", "multi_channel", "channel_ready", "whatsapp", "google", "social", "print", "result"],
        templateKinds: ["campaign_pack", "handoff_pack", "editor_layout"],
        title: "Source-to-channel pack",
    },
    {
        actionLabel: "Prepare WhatsApp pack",
        channels: ["whatsapp", "creative"],
        description: "Image, short message, status text, and customer reply script.",
        factMatchTypes: ["price", "whatsapp_number", "menu_item", "product", "service", "offer"],
        groupId: "sell_today",
        id: "whatsapp_sales_pack",
        ownerGoals: ["bring_people_today", "sell_product", "book_service", "fill_slots"],
        outputTypes: ["whatsapp_image", "whatsapp_message", "instagram_square"],
        requiredFactGroups: [
            { factTypes: ["whatsapp_number"], ownerQuestion: "Confirm the WhatsApp number before preparing this pack." },
            { factTypes: ["menu_item", "product", "service", "offer"], ownerQuestion: "Choose the item, product, service, or offer this pack should sell." },
            { factTypes: ["price"], ownerQuestion: "Confirm the price before preparing this sales pack." },
        ],
        searchTokens: ["whatsapp", "sales", "reply", "status", "message"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "WhatsApp sales pack",
    },
    {
        actionLabel: "Prepare booking pack",
        channels: ["whatsapp", "creative", "google_local"],
        description: "Booking message, story, Google update, and reception poster context.",
        factMatchTypes: ["availability", "available_time_slot", "booking_link", "price", "whatsapp_number", "service"],
        groupId: "bookings",
        id: "booking_push_pack",
        ownerGoals: ["fill_slots", "book_service"],
        outputTypes: ["whatsapp_image", "whatsapp_message", "instagram_story", "google_update", "poster_pdf"],
        requiredFactGroups: [
            { factTypes: ["availability", "available_time_slot", "availability_date"], ownerQuestion: "Confirm the available booking time or capacity before preparing this pack." },
            { factTypes: ["booking_link", "whatsapp_number", "phone"], ownerQuestion: "Confirm how customers should book before preparing this pack." },
            { factTypes: ["service"], ownerQuestion: "Choose the service this booking pack should promote." },
        ],
        searchTokens: ["booking", "slots", "appointment", "availability", "weekend"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Booking push pack",
    },
    {
        actionLabel: "Prepare Google update",
        channels: ["google_local", "creative"],
        description: "Google Business Profile update handoff with exact fields.",
        factMatchTypes: ["business_name", "location_detail", "phone", "service", "menu_item", "product", "offer", "destination_url"],
        groupId: "local_visibility",
        id: "google_local_update",
        ownerGoals: [],
        outputTypes: ["google_update", "instagram_square", "flyer_pdf"],
        requiredFactGroups: [
            { factTypes: ["business_name"], ownerQuestion: "Confirm the business name before preparing this Google update." },
            { factTypes: ["location_detail", "location", "branch_location"], ownerQuestion: "Confirm the business location before preparing this Google update." },
            { factTypes: ["service", "menu_item", "product", "offer"], ownerQuestion: "Choose what this Google update should feature." },
            { factTypes: ["phone", "website", "booking_link", "menu_link", "destination_url"], ownerQuestion: "Confirm a customer destination before preparing this Google update." },
        ],
        searchTokens: ["google", "local", "visibility", "update", "offer"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Google local update",
    },
    {
        actionLabel: "Prepare social sizes",
        channels: ["creative"],
        description: "Square post and story variants from the same campaign pack.",
        factMatchTypes: ["photo", "approved_asset", "service", "menu_item", "product", "offer"],
        groupId: "sell_today",
        id: "instagram_post_story",
        ownerGoals: [],
        outputTypes: ["instagram_square", "instagram_story", "reel_brief"],
        requiredFactGroups: [
            { factTypes: ["photo", "approved_asset"], ownerQuestion: "Add one ready business photo before preparing these social sizes." },
            { factTypes: ["service", "menu_item", "product", "offer"], ownerQuestion: "Choose what the post and story should feature." },
        ],
        searchTokens: ["instagram", "story", "square", "social", "reel"],
        templateKinds: ["campaign_pack", "editor_layout"],
        title: "Instagram post + story",
    },
    {
        actionLabel: "Prepare print pack",
        channels: ["creative"],
        description: "Poster, flyer, coupon, or counter card for local offline use.",
        factMatchTypes: ["business_name", "location_detail", "price", "offer_end_date", "destination_url", "phone", "whatsapp_number"],
        groupId: "print",
        id: "print_in_store",
        ownerGoals: [],
        outputTypes: ["poster_pdf", "flyer_pdf"],
        requiredFactGroups: [
            { factTypes: ["business_name"], ownerQuestion: "Confirm the business name before preparing this print pack." },
            { factTypes: ["location_detail", "location", "branch_location"], ownerQuestion: "Confirm the business location before preparing this print pack." },
            { factTypes: ["destination_url", "phone", "whatsapp_number", "booking_link", "menu_link"], ownerQuestion: "Confirm how customers should respond before preparing this print pack." },
        ],
        searchTokens: ["poster", "flyer", "print", "counter", "coupon", "qr"],
        templateKinds: ["campaign_pack", "editor_layout"],
        title: "Poster or flyer",
    },
    {
        actionLabel: "Prepare staff pack",
        channels: ["whatsapp", "creative"],
        description: "Staff share text, counter script, and customer reply prompts.",
        factMatchTypes: ["whatsapp_number", "service", "menu_item", "product", "offer"],
        groupId: "handoff",
        id: "staff_share_pack",
        ownerGoals: [],
        outputTypes: ["staff_share_text", "whatsapp_message", "manual_task"],
        requiredFactGroups: [
            { factTypes: ["service", "menu_item", "product", "offer"], ownerQuestion: "Choose what staff should share before preparing this pack." },
        ],
        searchTokens: ["staff", "share", "script", "reply", "counter"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Staff share pack",
    },
    {
        actionLabel: "Prepare ad handoff",
        channels: ["ads", "creative"],
        description: "Ad copy, headlines, destination, terms, and approval handoff.",
        factMatchTypes: ["destination_url", "approved_claim", "price", "terms"],
        groupId: "handoff",
        id: "ad_handoff_pack",
        ownerGoals: ["bring_people_today", "sell_product", "book_service", "fill_slots"],
        outputTypes: ["ad_handoff_copy", "instagram_square"],
        requiredFactGroups: [
            { factTypes: ["destination_url", "booking_link", "menu_link", "website"], ownerQuestion: "Confirm the ad destination before preparing this handoff." },
            { factTypes: ["approved_claim"], ownerQuestion: "Confirm the approved campaign claim before preparing this ad handoff." },
            { factTypes: ["terms"], ownerQuestion: "Confirm the campaign terms before preparing this ad handoff." },
        ],
        searchTokens: ["ads", "handoff", "headline", "destination", "agency"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Ad handoff pack",
    },
    {
        actionLabel: "Prepare local creator brief",
        channels: ["ugc", "video", "creative"],
        description: "Local creator fit checklist, lightweight brief, 3-test plan, disclosure, and result prompt.",
        factMatchTypes: ["business_name", "location_detail", "menu_item", "service", "offer", "asset_rights", "destination_url"],
        groupId: "handoff",
        id: "local_creator_test_brief",
        ownerGoals: ["bring_people_today", "sell_product", "book_service", "prepare_local_pack"],
        outputTypes: ["creator_script", "reel_brief", "manual_task"],
        requiredFactGroups: [
            { factTypes: ["business_name"], ownerQuestion: "Confirm the business name before preparing this creator brief." },
            { factTypes: ["location_detail", "location", "branch_location"], ownerQuestion: "Confirm the business location before preparing this creator brief." },
            { factTypes: ["menu_item", "service", "product", "offer"], ownerQuestion: "Choose what the creator should feature." },
            { factTypes: ["asset_rights", "usage_rights"], ownerQuestion: "Confirm rights for the creator assets before preparing this brief." },
            { factTypes: ["destination_url", "booking_link", "menu_link", "website", "whatsapp_number"], ownerQuestion: "Confirm the customer destination before preparing this creator brief." },
        ],
        searchTokens: ["creator", "ugc", "influencer", "local", "audience", "fit", "brief", "test", "flat_fee"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Local creator test brief",
    },
    {
        actionLabel: "Prepare proof deck",
        channels: ["creative", "ugc", "video"],
        description: "Brand, campaign, UGC/reel, trust, and source-trace brief for review.",
        factMatchTypes: ["business_name", "approved_asset", "asset_rights"],
        groupId: "handoff",
        id: "campaign_proof_deck",
        ownerGoals: [],
        outputTypes: ["campaign_proof_deck_pdf"],
        requiredFactGroups: [
            { factTypes: ["business_name"], ownerQuestion: "Confirm the business name before preparing this proof deck." },
            { factTypes: ["approved_asset"], ownerQuestion: "Add one approved business asset before preparing this proof deck." },
            { factTypes: ["asset_rights", "usage_rights"], ownerQuestion: "Confirm the asset rights before preparing this proof deck." },
        ],
        searchTokens: ["proof", "deck", "brand", "approval", "client", "review"],
        templateKinds: ["campaign_pack", "editor_layout", "handoff_pack"],
        title: "Campaign proof deck",
    },
    {
        actionLabel: "Reuse old image",
        channels: ["creative"],
        description: "Preserve the original and use CueLayers only where safe.",
        factMatchTypes: ["asset_rights", "usage_rights", "photo", "approved_asset"],
        groupId: "reuse",
        id: "reuse_old_asset",
        ownerGoals: [],
        outputTypes: ["manual_task", "poster_pdf", "flyer_pdf"],
        requiredFactGroups: [
            { factTypes: ["photo", "approved_asset"], ownerQuestion: "Choose the old image you want to reuse." },
            { factTypes: ["asset_rights", "usage_rights"], ownerQuestion: "Confirm that you can use this image before reusing it." },
        ],
        searchTokens: ["reuse", "old", "poster", "image", "layers", "asset"],
        templateKinds: ["reuse_asset", "editor_layout", "campaign_pack"],
        title: "Reuse old poster/image",
    },
    {
        actionLabel: "Set custom size",
        channels: ["creative"],
        description: "Advanced blank layout when the owner already knows the size.",
        factMatchTypes: [],
        groupId: "advanced",
        id: "custom_size",
        ownerGoals: [],
        outputTypes: ["manual_task"],
        requiredFactGroups: [],
        searchTokens: ["custom", "size", "blank", "advanced"],
        templateKinds: ["editor_layout"],
        title: "Custom size",
    },
];

export const CAMPAIGNCUE_DEFAULT_OUTPUT_PICKER_ITEM_ID: CampaignCueOutputPickerItemId = "recommended_pack";

export const getCampaignCueOutputPickerItem = (
    itemId?: string,
) => CAMPAIGNCUE_OUTPUT_PICKER_ITEMS.find((item) => item.id === itemId);

export const campaignCueOutputIntentSupportsOwnerGoal = (
    item: CampaignCueOutputPickerItem,
    ownerGoal: CampaignCueDailyDeskOwnerGoal,
) => !item.ownerGoals.length || item.ownerGoals.includes(ownerGoal);

export const formatCampaignCueOutputTypeLabel = (outputType: string) => (
    outputType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .replace(/\bPdf\b/g, "PDF")
);

export const campaignCueOutputItemMatchesTemplate = (
    item: CampaignCueOutputPickerItem,
    template: CampaignCuePackTemplateSummary,
) => {
    if (item.id === "recommended_pack") return true;
    const outputTypeMatch = item.outputTypes.some((outputType) => template.outputTypes.includes(outputType));
    const channelMatch = item.channels.some((channel) => template.channels.includes(channel));
    const kindMatch = item.templateKinds.includes(template.templateKind);
    const factMatch = item.factMatchTypes.some((factType) => (
        template.requiredFactTypes.includes(factType)
        || template.optionalFactTypes.includes(factType)
    ));
    const searchTokenMatch = item.searchTokens.some((token) => (
        template.searchTokens.includes(token)
        || template.eventTags.includes(token)
        || template.styleTags.includes(token)
        || template.recipeIds.includes(token)
    ));
    return kindMatch && (outputTypeMatch || channelMatch || factMatch || searchTokenMatch);
};
