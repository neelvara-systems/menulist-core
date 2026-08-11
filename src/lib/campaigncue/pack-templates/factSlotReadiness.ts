import type {
    CampaignCueAsset,
    CampaignCueBusinessBrain,
    CampaignCueSourceFact,
    CampaignCueSourceInput,
} from "@type/campaigncue";
import type { CampaignCuePackTemplatePayload } from "@type/campaigncuePackTemplates";
import type {
    CampaignCueOutputIntentRequirement,
    CampaignCueOutputPickerItem,
} from "@constant/campaigncue/outputPicker";
import { isCampaignCueReadyVisualAsset } from "@lib/campaigncue/mediaMissions";

type CampaignCuePackTemplateFactSlot = CampaignCuePackTemplatePayload["factSlots"][number];

export interface CampaignCuePackTemplateFactContext {
    assets: readonly CampaignCueAsset[];
    businessBrain: CampaignCueBusinessBrain;
    sourceFacts: readonly CampaignCueSourceFact[];
    sourceInputs: readonly CampaignCueSourceInput[];
}

const normalized = (value: unknown) => String(value || "").trim().toLowerCase();

const hasText = (value: unknown) => normalized(value).length > 0;

const hasEvidence = (
    context: CampaignCuePackTemplateFactContext,
    terms: readonly string[],
    sourceTypes?: readonly CampaignCueSourceFact["sourceType"][],
) => {
    const normalizedTerms = terms.map(normalized);
    const facts = context.sourceFacts.filter((fact) => (
        fact.risk !== "blocked"
        && fact.freshness !== "stale"
        && (!sourceTypes?.length || sourceTypes.includes(fact.sourceType))
    ));
    const inputs = context.sourceInputs.filter((input) => input.status === "active");
    return [...facts, ...inputs].some((record) => {
        const haystack = `${normalized(record.label)} ${normalized(record.value)}`;
        return normalizedTerms.some((term) => haystack.includes(term));
    });
};

export function isCampaignCuePackTemplateFactSlotReady(
    slot: CampaignCuePackTemplateFactSlot,
    context: CampaignCuePackTemplateFactContext,
): boolean {
    const type = normalized(slot.type).replace(/-/g, "_");
    const availableItems = context.businessBrain.catalog.items.filter((item) => item.available);
    const availableServices = context.businessBrain.catalog.services.filter((item) => item.available);
    const readyVisualAssets = context.assets.filter(isCampaignCueReadyVisualAsset);
    switch (type) {
        case "business_name":
            return hasText(context.businessBrain.name);
        case "location":
        case "location_detail":
        case "branch_location":
            return hasText(context.businessBrain.locality);
        case "phone":
            return hasText(context.businessBrain.contacts.phone);
        case "whatsapp_number":
            return hasText(context.businessBrain.contacts.whatsapp);
        case "website":
            return hasText(context.businessBrain.contacts.website);
        case "booking_link":
            return hasText(context.businessBrain.contacts.bookingUrl);
        case "menu_link":
            return hasText(context.businessBrain.contacts.publicMenuUrl);
        case "destination_url":
        case "business_cta":
            return [
                context.businessBrain.contacts.bookingUrl,
                context.businessBrain.contacts.publicMenuUrl,
                context.businessBrain.contacts.website,
                context.businessBrain.contacts.whatsapp,
                context.businessBrain.contacts.phone,
            ].some(hasText);
        case "menu_item":
        case "product":
            return availableItems.length > 0 || hasEvidence(context, ["item", "product", "menu"], ["menu_or_service"]);
        case "service":
            return availableServices.length > 0 || hasEvidence(context, ["service", "class", "appointment"], ["menu_or_service"]);
        case "price":
            return [...availableItems, ...availableServices].some((item) => hasText(item.priceLabel))
                || hasEvidence(context, ["price", "cost", "rate"], ["menu_or_service", "offer"]);
        case "availability":
            return context.businessBrain.operatingPulse.capacityStatus === "available"
                || context.businessBrain.operatingPulse.capacityStatus === "limited"
                || hasEvidence(context, ["availability", "available", "slot"]);
        case "availability_date":
        case "available_time_slot":
            return hasEvidence(context, ["availability date", "available date", "available time", "slot", "valid until"]);
        case "photo":
            return readyVisualAssets.length > 0
                || [...availableItems, ...availableServices].some((item) => hasText(item.imageUrl));
        case "approved_asset":
            return readyVisualAssets.length > 0;
        case "usage_rights":
        case "asset_rights":
            return readyVisualAssets.length > 0;
        case "offer":
        case "current_offer":
            return hasEvidence(context, ["offer", "promotion", "package"], ["offer"]);
        case "offer_end_date":
            return hasEvidence(context, ["offer end", "end date", "expires", "expiry", "valid until"], ["offer"]);
        case "terms":
            return hasEvidence(context, ["terms", "conditions"], ["offer", "policy"]);
        case "approved_claim":
            return hasEvidence(context, ["approved claim", "approved statement"], ["policy", "manual"]);
        default:
            return false;
    }
}

export function getUnresolvedCampaignCuePackTemplateFactSlots(
    slots: readonly CampaignCuePackTemplateFactSlot[],
    context: CampaignCuePackTemplateFactContext,
): CampaignCuePackTemplateFactSlot[] {
    return slots.filter((slot) => slot.required && !isCampaignCuePackTemplateFactSlotReady(slot, context));
}

export function getUnresolvedCampaignCueOutputIntentRequirements(
    intent: CampaignCueOutputPickerItem,
    context: CampaignCuePackTemplateFactContext,
): CampaignCueOutputIntentRequirement[] {
    return intent.requiredFactGroups.filter((requirement) => (
        !requirement.factTypes.some((type) => isCampaignCuePackTemplateFactSlotReady({
            ownerQuestion: requirement.ownerQuestion,
            protected: true,
            required: true,
            type,
        }, context))
    ));
}
