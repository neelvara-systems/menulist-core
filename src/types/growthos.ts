import type { Timestamp } from "firebase/firestore";

export type GrowthOSAccessMode = "disabled" | "pilot" | "paid";

export type GrowthOSActionType =
    | "promote_item"
    | "menu_event"
    | "staff_push"
    | "local_trust"
    | "truth_fix"
    | "review_reply";

export type GrowthOSDestination =
    | "whatsapp_status"
    | "whatsapp_message"
    | "instagram_caption"
    | "google_update_draft"
    | "staff_brief"
    | "counter_prompt"
    | "qr_table_prompt"
    | "review_reply";

export type GrowthOSExportMethod =
    | "copy"
    | "share"
    | "download"
    | "print"
    | "mark_used"
    | "regenerate"
    | "stale";

export type GrowthOSKitStatus =
    | "draft"
    | "copied"
    | "downloaded"
    | "shared"
    | "printed"
    | "used"
    | "archived";

export type GrowthOSReadinessStatus = "ready" | "limited" | "blocked" | "stale";

export type GrowthOSSummaryReason =
    | "no_menu"
    | "incomplete_truth"
    | "not_entitled"
    | "no_action";

export interface GrowthOSMenuItemFact {
    id: string;
    name: string;
    categoryName?: string;
    available: boolean;
    price?: number | null;
    currencySymbol?: string;
    imageUrl?: string;
    isBestSeller?: boolean;
    isNew?: boolean;
}

export interface GrowthOSSourceFactsSummary {
    businessName: string;
    projectName: string;
    menuLink?: string;
    itemCount: number;
    availableItemCount: number;
    unavailableItemNames: string[];
    promotedItemName?: string;
    promotedItemPrice?: number | null;
    isOpenToday: boolean;
    todayHoursLabel?: string;
}

export interface GrowthOSSourceFacts {
    tId: string;
    sId: string;
    projectId: string;
    businessName: string;
    projectName: string;
    businessType?: string;
    menuLink?: string;
    currencySymbol?: string;
    todayHoursLabel?: string;
    isOpenToday: boolean;
    items: GrowthOSMenuItemFact[];
    generatedForDate: string;
}

export interface GrowthOSPreflightResult {
    status: GrowthOSReadinessStatus;
    blocks: string[];
    warnings: string[];
}

export interface GrowthOSActionSummary {
    id: string;
    type: GrowthOSActionType;
    title: string;
    reason: string;
    itemId?: string;
    itemName?: string;
    confidence: number;
    destinations: GrowthOSDestination[];
    readiness: GrowthOSPreflightResult;
}

export interface GrowthOSOutput {
    id: string;
    destination: GrowthOSDestination;
    label: string;
    text: string;
    preflight: GrowthOSPreflightResult;
}

export interface GrowthOSStaffBriefOutput extends GrowthOSOutput {
    destination: "staff_brief";
    mainLine: string;
    reason?: string;
    avoidLines?: string[];
    menuLinkLine?: string;
    counterPrompt?: string;
    expiresAt?: Timestamp | string | null;
}

export interface GrowthOSKitSummary {
    id: string;
    actionType: GrowthOSActionType;
    title: string;
    itemName?: string;
    outputs: GrowthOSOutput[];
    sourceFactsHash: string;
    status: GrowthOSKitStatus;
    createdAt?: Timestamp | string | null;
    expiresAt?: Timestamp | string | null;
    isStale?: boolean;
}

export interface GrowthOSKit extends GrowthOSKitSummary {
    tId: string;
    sId: string;
    projectId?: string;
    actionId?: string;
    destinationSet: GrowthOSDestination[];
    sourceFactsSummary: GrowthOSSourceFactsSummary;
    aiOperationIds?: string[];
    updatedAt?: Timestamp | string | null;
}

export interface GrowthOSSummaryDocument {
    tId: string;
    sId: string;
    date: string;
    lastUpdated?: Timestamp | string | null;
    sourceFactsHash?: string;
    eligible: boolean;
    reason?: GrowthOSSummaryReason;
    readiness?: GrowthOSPreflightResult;
    primaryAction?: GrowthOSActionSummary | null;
    secondaryActions: GrowthOSActionSummary[];
    latestKit?: GrowthOSKitSummary | null;
}

export interface GrowthOSExport {
    id: string;
    tId: string;
    sId: string;
    kitId: string;
    destination: GrowthOSDestination;
    method: GrowthOSExportMethod;
    exportedAt?: Timestamp | string | null;
}

export type GrowthOSReviewTone = "calm" | "apology" | "clarification" | "thank_you";

export type GrowthOSReviewRisk =
    | "positive"
    | "neutral"
    | "negative"
    | "volatile"
    | "food_safety"
    | "legal_or_threatening"
    | "abusive"
    | "unclear";

export interface GrowthOSReviewGuardResult {
    risk: GrowthOSReviewRisk;
    publicReplyRecommended: boolean;
    recommendation: string;
    reply?: string;
    privateRecoveryMessage?: string;
    internalCheckLine?: string;
}
