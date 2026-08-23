import type { GrowthOSActionType, GrowthOSDestination, GrowthOSExportMethod } from "@type/growthos";
import { MENULIST_B2C_PLAN_IDS } from "./menulistPlans";

export const GROWTHOS_OWNER_LABEL = "Growth Kits";

export const GROWTHOS_SUMMARY_DOC_PREFIX = "growthos";

export const GROWTHOS_KIT_TTL_HOURS = 24;

export const GROWTHOS_MAX_ACTIONS = 3;

export const GROWTHOS_MAX_UNAVAILABLE_ITEMS = 3;

export const GROWTHOS_ALLOWED_ACTION_TYPES: GrowthOSActionType[] = [
    "promote_item",
    "menu_event",
    "staff_push",
    "local_trust",
    "truth_fix",
    "review_reply",
];

export const GROWTHOS_CORE_DESTINATIONS: GrowthOSDestination[] = [
    "whatsapp_status",
    "whatsapp_message",
    "instagram_caption",
    "google_update_draft",
    "staff_brief",
    "counter_prompt",
    "qr_table_prompt",
];

export const GROWTHOS_DESTINATION_LABELS: Record<GrowthOSDestination, string> = {
    whatsapp_status: "WhatsApp status",
    whatsapp_message: "WhatsApp message",
    instagram_caption: "Instagram caption",
    google_update_draft: "Google update draft",
    staff_brief: "Staff brief",
    counter_prompt: "Counter prompt",
    qr_table_prompt: "QR table prompt",
    review_reply: "Review reply",
};

export const GROWTHOS_EXPORT_METHOD_LABELS: Record<GrowthOSExportMethod, string> = {
    copy: "Copied",
    share: "Shared",
    download: "Downloaded",
    print: "Printed",
    mark_used: "Marked used",
    regenerate: "Regenerated",
    stale: "Stale",
};

export const GROWTHOS_FORBIDDEN_PUBLIC_PHRASES = [
    "ai-powered",
    "smart",
    "dynamic",
    "best in",
    "number one",
    "guaranteed",
    "limited time offer",
    "discount",
    "free",
    "buy one get one",
    "bogo",
    "roi",
    "conversion",
];

export const GROWTHOS_SUPPORTED_PAID_PLANS = [
    MENULIST_B2C_PLAN_IDS.PRO,
    MENULIST_B2C_PLAN_IDS.MULTI_LOCATION,
];
