import type { CampaignCueChannel, CampaignCueDecisionOutputType } from "@type/campaigncue";
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

export type CampaignCueOutputPickerItemId =
    | "recommended_pack"
    | "source_to_channel_pack"
    | "whatsapp_sales_pack"
    | "booking_push_pack"
    | "google_local_update"
    | "instagram_post_story"
    | "print_in_store"
    | "staff_share_pack"
    | "ad_handoff_pack"
    | "local_creator_test_brief"
    | "campaign_proof_deck"
    | "reuse_old_asset"
    | "custom_size";

export interface CampaignCueOutputPickerGroup {
    description: string;
    id: CampaignCueOutputPickerGroupId;
    title: string;
}

export interface CampaignCueOutputPickerItem {
    actionLabel: string;
    channels: CampaignCueChannel[];
    description: string;
    groupId: CampaignCueOutputPickerGroupId;
    id: CampaignCueOutputPickerItemId;
    outputTypes: CampaignCueDecisionOutputType[];
    requiredFactTypes: string[];
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
        groupId: "recommended",
        id: "recommended_pack",
        outputTypes: [],
        requiredFactTypes: [],
        searchTokens: ["recommended", "daily_desk", "campaign_pack"],
        templateKinds: ["campaign_pack", "editor_layout", "handoff_pack", "reuse_asset"],
        title: "Recommended pack",
    },
    {
        actionLabel: "Prepare source pack",
        channels: ["whatsapp", "google_local", "creative", "calendar"],
        description: "Turn the current source-backed campaign cue into WhatsApp, Google/local, social, print, manual task, and result prompt.",
        groupId: "recommended",
        id: "source_to_channel_pack",
        outputTypes: ["whatsapp_message", "google_update", "instagram_square", "poster_pdf", "staff_share_text", "manual_task"],
        requiredFactTypes: ["business_name", "location_detail", "menu_item", "service", "product", "price", "availability", "booking_link", "whatsapp_number"],
        searchTokens: ["source", "distribution", "multi_channel", "channel_ready", "whatsapp", "google", "social", "print", "result"],
        templateKinds: ["campaign_pack", "handoff_pack", "editor_layout"],
        title: "Source-to-channel pack",
    },
    {
        actionLabel: "Prepare WhatsApp pack",
        channels: ["whatsapp", "creative"],
        description: "Image, short message, status text, and customer reply script.",
        groupId: "sell_today",
        id: "whatsapp_sales_pack",
        outputTypes: ["whatsapp_image", "whatsapp_message", "instagram_square"],
        requiredFactTypes: ["price", "whatsapp_number", "menu_item", "product", "service"],
        searchTokens: ["whatsapp", "sales", "reply", "status", "message"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "WhatsApp sales pack",
    },
    {
        actionLabel: "Prepare booking pack",
        channels: ["whatsapp", "creative", "google_local"],
        description: "Booking message, story, Google update, and reception poster context.",
        groupId: "bookings",
        id: "booking_push_pack",
        outputTypes: ["whatsapp_image", "whatsapp_message", "instagram_story", "google_update", "poster_pdf"],
        requiredFactTypes: ["availability", "booking_link", "price", "whatsapp_number"],
        searchTokens: ["booking", "slots", "appointment", "availability", "weekend"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Booking push pack",
    },
    {
        actionLabel: "Prepare Google update",
        channels: ["google_local", "creative"],
        description: "Google Business Profile update or offer handoff with exact fields.",
        groupId: "local_visibility",
        id: "google_local_update",
        outputTypes: ["google_update", "google_offer", "instagram_square", "flyer_pdf"],
        requiredFactTypes: ["business_name", "location_detail", "phone", "service", "offer_end_date"],
        searchTokens: ["google", "local", "visibility", "update", "offer"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Google local update",
    },
    {
        actionLabel: "Prepare social sizes",
        channels: ["creative"],
        description: "Square post and story variants from the same campaign pack.",
        groupId: "sell_today",
        id: "instagram_post_story",
        outputTypes: ["instagram_square", "instagram_story", "reel_brief"],
        requiredFactTypes: ["photo", "service", "menu_item", "product"],
        searchTokens: ["instagram", "story", "square", "social", "reel"],
        templateKinds: ["campaign_pack", "editor_layout"],
        title: "Instagram post + story",
    },
    {
        actionLabel: "Prepare print pack",
        channels: ["creative"],
        description: "Poster, flyer, coupon, or counter card for local offline use.",
        groupId: "print",
        id: "print_in_store",
        outputTypes: ["poster_pdf", "flyer_pdf"],
        requiredFactTypes: ["business_name", "location_detail", "price", "offer_end_date"],
        searchTokens: ["poster", "flyer", "print", "counter", "coupon", "qr"],
        templateKinds: ["campaign_pack", "editor_layout"],
        title: "Poster or flyer",
    },
    {
        actionLabel: "Prepare staff pack",
        channels: ["whatsapp", "creative"],
        description: "Staff share text, counter script, and customer reply prompts.",
        groupId: "handoff",
        id: "staff_share_pack",
        outputTypes: ["staff_share_text", "whatsapp_message", "manual_task"],
        requiredFactTypes: ["whatsapp_number", "service", "menu_item", "product"],
        searchTokens: ["staff", "share", "script", "reply", "counter"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Staff share pack",
    },
    {
        actionLabel: "Prepare ad handoff",
        channels: ["ads", "creative"],
        description: "Ad copy, headlines, destination, terms, and approval handoff.",
        groupId: "handoff",
        id: "ad_handoff_pack",
        outputTypes: ["ad_handoff_copy", "instagram_square"],
        requiredFactTypes: ["destination_url", "approved_claim", "price", "terms"],
        searchTokens: ["ads", "handoff", "headline", "destination", "agency"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Ad handoff pack",
    },
    {
        actionLabel: "Prepare creator brief",
        channels: ["ugc", "video", "creative"],
        description: "Local creator fit checklist, lightweight brief, 3-test plan, disclosure, and result prompt.",
        groupId: "handoff",
        id: "local_creator_test_brief",
        outputTypes: ["creator_script", "reel_brief", "manual_task"],
        requiredFactTypes: ["business_name", "location_detail", "menu_item", "service", "offer", "asset_rights", "destination_url"],
        searchTokens: ["creator", "ugc", "influencer", "local", "audience", "fit", "brief", "test", "flat_fee"],
        templateKinds: ["campaign_pack", "handoff_pack"],
        title: "Local creator test brief",
    },
    {
        actionLabel: "Prepare proof deck",
        channels: ["creative", "ugc", "video"],
        description: "Brand, campaign, UGC/reel, trust, and source-trace brief for review.",
        groupId: "handoff",
        id: "campaign_proof_deck",
        outputTypes: ["campaign_proof_deck_pdf"],
        requiredFactTypes: ["business_name", "approved_asset", "asset_rights"],
        searchTokens: ["proof", "deck", "brand", "approval", "client", "review"],
        templateKinds: ["campaign_pack", "editor_layout", "handoff_pack"],
        title: "Campaign proof deck",
    },
    {
        actionLabel: "Reuse old image",
        channels: ["creative"],
        description: "Preserve the original and use CueLayers only where safe.",
        groupId: "reuse",
        id: "reuse_old_asset",
        outputTypes: ["manual_task", "poster_pdf", "flyer_pdf"],
        requiredFactTypes: ["asset_rights", "photo"],
        searchTokens: ["reuse", "old", "poster", "image", "layers", "asset"],
        templateKinds: ["reuse_asset", "editor_layout", "campaign_pack"],
        title: "Reuse old poster/image",
    },
    {
        actionLabel: "Set custom size",
        channels: ["creative"],
        description: "Advanced blank layout when the owner already knows the size.",
        groupId: "advanced",
        id: "custom_size",
        outputTypes: ["manual_task"],
        requiredFactTypes: [],
        searchTokens: ["custom", "size", "blank", "advanced"],
        templateKinds: ["editor_layout"],
        title: "Custom size",
    },
];

export const CAMPAIGNCUE_DEFAULT_OUTPUT_PICKER_ITEM_ID: CampaignCueOutputPickerItemId = "recommended_pack";

export const getCampaignCueOutputPickerItem = (
    itemId?: string,
) => CAMPAIGNCUE_OUTPUT_PICKER_ITEMS.find((item) => item.id === itemId);

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
    const requiredFactMatch = item.requiredFactTypes.some((factType) => (
        template.requiredFactTypes.includes(factType)
        || template.optionalFactTypes.includes(factType)
    ));
    const searchTokenMatch = item.searchTokens.some((token) => (
        template.searchTokens.includes(token)
        || template.eventTags.includes(token)
        || template.styleTags.includes(token)
        || template.recipeIds.includes(token)
    ));
    return outputTypeMatch || (channelMatch && kindMatch) || requiredFactMatch || searchTokenMatch;
};
