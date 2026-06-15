import {
    CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS,
    type CampaignCueCreativeEditorAiActionId,
} from "@constant/campaigncue/creativeEditorAiTools";
import type {
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueCatalogItem,
    CampaignCueOverview,
    CampaignCueSourceFact,
} from "@type/campaigncue";
import type {
    CreativeEditorAiToolFinding,
    CreativeEditorAiToolResult,
    CreativeEditorAiToolSuggestion,
    CreativeEditorDocument,
    CreativeEditorElement,
} from "@/modules/creative-editor/types";

interface CampaignCueEditorAiContext {
    actionId: CampaignCueCreativeEditorAiActionId | string;
    document: CreativeEditorDocument;
    overview?: CampaignCueOverview | null;
    selectedElement?: CreativeEditorElement | null;
    selectedText?: string;
}

interface CampaignCueCopyContext {
    businessName: string;
    businessType: string;
    destination: string;
    latestCampaign?: CampaignCueCampaign;
    locality: string;
    primaryItem?: CampaignCueCatalogItem;
    sourceFacts: CampaignCueSourceFact[];
}

const DEFAULT_BUSINESS_NAME = "this business";
const DEFAULT_LOCALITY = "your area";

const clean = (value?: string | null) => (
    String(value || "").replace(/\s+/g, " ").trim()
);

const truncate = (value: string, maxLength: number) => {
    const normalized = clean(value);
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
};

const titleizeBusinessType = (value?: string) => (
    clean(value || "local business").replace(/_/g, " ")
);

const getPrimaryItem = (businessBrain?: CampaignCueBusinessBrain) => {
    const catalog = businessBrain?.catalog;
    return [...(catalog?.items || []), ...(catalog?.services || [])].find((item) => item.available);
};

const getDestination = (businessBrain?: CampaignCueBusinessBrain) => (
    businessBrain?.contacts.bookingUrl
    || businessBrain?.contacts.publicMenuUrl
    || businessBrain?.contacts.website
    || businessBrain?.contacts.whatsapp
    || businessBrain?.contacts.phone
    || "Use the best active contact link."
);

const getDocumentText = (documentValue: CreativeEditorDocument) => (
    documentValue.elements
        .map((element) => {
            if (element.type === "text" || element.type === "pathText") return element.text;
            if (element.type === "qr") return element.value;
            return "";
        })
        .filter(Boolean)
        .join(" ")
);

const includesLoose = (haystack: string, needle?: string) => {
    const normalizedNeedle = clean(needle).toLowerCase();
    if (!normalizedNeedle) return false;
    return haystack.toLowerCase().includes(normalizedNeedle);
};

const suggestion = (id: string, label: string, text: string, actionLabel = "Add text"): CreativeEditorAiToolSuggestion => ({
    actionLabel,
    id,
    label,
    text: truncate(text, 800),
});

const finding = (id: string, tone: CreativeEditorAiToolFinding["tone"], text: string): CreativeEditorAiToolFinding => ({
    id,
    text,
    tone,
});

const buildCopyContext = (overview: CampaignCueOverview | null | undefined, documentValue: CreativeEditorDocument): CampaignCueCopyContext => {
    const businessBrain = overview?.businessBrain;
    const businessName = clean(businessBrain?.name || documentValue.metadata?.brand?.name) || DEFAULT_BUSINESS_NAME;
    const locality = clean(businessBrain?.locality || overview?.locations?.[0]?.locality) || DEFAULT_LOCALITY;
    return {
        businessName,
        businessType: titleizeBusinessType(businessBrain?.businessType),
        destination: getDestination(businessBrain),
        latestCampaign: overview?.campaigns?.[0],
        locality,
        primaryItem: getPrimaryItem(businessBrain),
        sourceFacts: overview?.sourceFacts || [],
    };
};

const getOfferSubject = (context: CampaignCueCopyContext) => (
    clean(context.latestCampaign?.title)
    || clean(context.primaryItem?.name)
    || `${context.businessName} update`
);

const getPrimaryItemLine = (context: CampaignCueCopyContext) => {
    if (!context.primaryItem) return "A fresh update is ready for customers.";
    const price = context.primaryItem.priceLabel ? ` (${context.primaryItem.priceLabel})` : "";
    return `${context.primaryItem.name}${price} is ready for customers.`;
};

const buildImproveSuggestions = (context: CampaignCueCopyContext) => {
    const subject = getOfferSubject(context);
    return [
        suggestion("improve-headline", "Headline", `${context.businessName}: ${subject}`),
        suggestion("improve-body", "Support line", `${getPrimaryItemLine(context)} Visit us in ${context.locality} or use the link to order, book, or ask.`),
        suggestion("improve-cta", "Call to action", "Order, book, or message today"),
    ];
};

const buildCaptionSuggestions = (context: CampaignCueCopyContext) => {
    const subject = getOfferSubject(context);
    return [
        suggestion("caption-friendly", "Friendly caption", `${subject} from ${context.businessName}. Available now for customers in ${context.locality}. ${context.destination}`),
        suggestion("caption-short", "Short caption", `${context.businessName} has a new update for ${context.locality}. ${context.destination}`),
        suggestion("caption-direct", "Direct caption", `${getPrimaryItemLine(context)} Contact ${context.businessName} today: ${context.destination}`),
    ];
};

const buildWhatsAppSuggestions = (context: CampaignCueCopyContext) => [
    suggestion(
        "whatsapp-message",
        "WhatsApp message",
        `Hi, ${context.businessName} here. ${getPrimaryItemLine(context)} Reply here or use this link: ${context.destination}`,
    ),
    suggestion("whatsapp-reply", "Reply prompt", "Reply with what you need and we will confirm the details."),
];

const buildGooglePostSuggestions = (context: CampaignCueCopyContext) => [
    suggestion(
        "google-post",
        "Google post",
        `${context.businessName} has an update for customers in ${context.locality}. ${getPrimaryItemLine(context)} Use ${context.destination} for the latest details.`,
    ),
];

const buildAdHandoffSuggestions = (context: CampaignCueCopyContext) => {
    const subject = getOfferSubject(context);
    return [
        suggestion("ad-primary", "Primary text", `${subject} from ${context.businessName}. Clear local offer for customers in ${context.locality}.`),
        suggestion("ad-headline", "Ad headline", truncate(`${context.businessName} ${context.primaryItem?.name || "update"}`, 60)),
        suggestion("ad-description", "Ad description", truncate(`${getPrimaryItemLine(context)} Manual ad setup only; review facts before spend.`, 90)),
    ];
};

const rewriteSelectedText = (context: CampaignCueCopyContext, selectedText?: string) => {
    const base = clean(selectedText);
    if (!base) return [];
    return [
        suggestion(
            "rewrite-selected",
            "Rewritten selected text",
            `${context.businessName}: ${base.replace(/[.!?]+$/, "")}. Available for customers in ${context.locality}.`,
            "Add version",
        ),
    ];
};

const shortenSelectedText = (selectedText?: string) => {
    const base = clean(selectedText);
    if (!base) return [];
    return [
        suggestion("shorten-selected", "Shorter selected text", truncate(base, 58), "Add version"),
    ];
};

const localizeSelectedText = (context: CampaignCueCopyContext, selectedText?: string) => {
    const base = clean(selectedText);
    if (!base) return [];
    return [
        suggestion("local-selected", "Local selected text", `${base} at ${context.businessName} in ${context.locality}.`, "Add version"),
    ];
};

const buildFactFindings = (context: CampaignCueCopyContext, documentValue: CreativeEditorDocument) => {
    const text = getDocumentText(documentValue);
    const facts = context.sourceFacts.map((fact) => clean(fact.value)).filter(Boolean);
    const knownPrices = new Set([
        ...(context.primaryItem?.priceLabel ? [context.primaryItem.priceLabel] : []),
        ...facts.filter((value) => /[$₹€£]|\b\d+(\.\d{1,2})?\b/.test(value)),
    ].map((value) => value.toLowerCase()));
    const priceLikeValues = Array.from(new Set(text.match(/(?:[$₹€£]\s*)?\b\d+(?:\.\d{1,2})?\b/g) || []));
    const unknownPrices = priceLikeValues.filter((value) => !knownPrices.has(value.toLowerCase()));

    return [
        includesLoose(text, context.businessName)
            ? finding("business-name-present", "success", `Business name appears in the design: ${context.businessName}.`)
            : finding("business-name-missing", "warning", `Business name is not visible. Add ${context.businessName} before export if this is public.`),
        context.sourceFacts.length
            ? finding("source-facts", "success", `${context.sourceFacts.length} source fact${context.sourceFacts.length === 1 ? "" : "s"} available for review.`)
            : finding("source-facts-empty", "warning", "No source facts are attached. Review offers, prices, dates, and contact details manually."),
        unknownPrices.length
            ? finding("price-review", "warning", `Review these numbers before using the asset: ${unknownPrices.slice(0, 4).join(", ")}.`)
            : finding("price-review-clear", "neutral", "No unrecognized price-like number was found in visible text."),
        finding("manual-delivery", "neutral", "CampaignCue exports assets only. It does not post, send, or spend from this editor."),
    ];
};

const buildBrandFindings = (context: CampaignCueCopyContext, documentValue: CreativeEditorDocument) => {
    const brand = documentValue.metadata?.brand;
    const primaryColor = clean(brand?.primaryColor);
    const colorText = JSON.stringify(documentValue.elements).toLowerCase();
    const hasLogo = documentValue.elements.some((element) => element.type === "image" && includesLoose(element.src, brand?.logoUrl));
    return [
        primaryColor && colorText.includes(primaryColor.toLowerCase())
            ? finding("brand-color-present", "success", `Brand color is used: ${primaryColor}.`)
            : finding("brand-color-missing", "warning", "Brand color is not obvious in editable layers."),
        brand?.logoUrl && hasLogo
            ? finding("logo-present", "success", "Business logo appears in the design.")
            : brand?.logoUrl
                ? finding("logo-missing", "warning", "Business logo is available but not visible in the design.")
                : finding("logo-unavailable", "neutral", "No logo is saved for this workspace yet."),
        includesLoose(getDocumentText(documentValue), context.businessName)
            ? finding("brand-name-present", "success", "Business name is visible.")
            : finding("brand-name-missing", "warning", "Add the business name if customers will see this without context."),
    ];
};

const buildLayerImageFindings = (selectedElement?: CreativeEditorElement | null) => {
    if (!selectedElement || selectedElement.type !== "image") {
        return [
            finding("select-image", "warning", "Select an image layer first, or upload a flat image from the Layered image reuse panel."),
        ];
    }
    return [
        finding("cue-layers-entry", "neutral", "For a full layer conversion, upload the original image through Layered image reuse so CampaignCue can preserve the source package."),
        finding("selected-image-safe", "success", "The selected image can still be edited here with crop, opacity, filters, outline, and export tools."),
    ];
};

const buildExportFindings = (context: CampaignCueCopyContext) => [
    finding("download-first", "success", "Download PNG when the design is ready."),
    finding("fact-review", "neutral", `Check business name, contact link, offer, price, and date for ${context.businessName}.`),
    finding("manual-use", "neutral", "Use the downloaded asset manually in WhatsApp, Google, social, or ad tools."),
    finding("rights-review", "warning", "If the design includes uploaded people, customer photos, logos, or watermarks, confirm rights before public use."),
];

const buildReadyToShareFindings = (context: CampaignCueCopyContext, documentValue: CreativeEditorDocument) => [
    ...buildFactFindings(context, documentValue),
    ...buildBrandFindings(context, documentValue),
    ...buildExportFindings(context),
];

const buildMissingDetailSuggestions = (context: CampaignCueCopyContext, documentValue: CreativeEditorDocument) => {
    const text = getDocumentText(documentValue);
    const suggestions: CreativeEditorAiToolSuggestion[] = [];
    if (!includesLoose(text, context.businessName)) {
        suggestions.push(suggestion("missing-business-name", "Business name", context.businessName));
    }
    if (context.locality !== DEFAULT_LOCALITY && !includesLoose(text, context.locality)) {
        suggestions.push(suggestion("missing-locality", "Area or city", context.locality));
    }
    if (!includesLoose(text, context.destination) && context.destination !== "Use the best active contact link.") {
        suggestions.push(suggestion("missing-contact", "Contact line", context.destination));
    }
    if (!suggestions.length) {
        suggestions.push(suggestion("missing-detail-clear", "Nothing obvious missing", "Business name, locality, and contact path are already visible or unavailable."));
    }
    return suggestions;
};

export function runCampaignCueCreativeEditorAiTool(params: CampaignCueEditorAiContext): CreativeEditorAiToolResult {
    const context = buildCopyContext(params.overview, params.document);
    const actionId = params.actionId;

    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.READY_TO_SHARE_CHECK) {
        return { notice: "Share-readiness check complete.", findings: buildReadyToShareFindings(context, params.document) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.ADD_MISSING_DETAILS) {
        return { notice: "Missing detail suggestions are ready.", suggestions: buildMissingDetailSuggestions(context, params.document) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.IMPROVE_DESIGN) {
        return { notice: "Editable suggestions are ready.", suggestions: buildImproveSuggestions(context) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.CAPTION_VARIANTS) {
        return { notice: "Caption options are ready for manual use.", suggestions: buildCaptionSuggestions(context) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.WHATSAPP_PACK) {
        return { notice: "WhatsApp text is ready for manual copy.", suggestions: buildWhatsAppSuggestions(context) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.GOOGLE_POST) {
        return { notice: "Google post text is ready for manual copy.", suggestions: buildGooglePostSuggestions(context) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.AD_HANDOFF_COPY) {
        return { notice: "Ad handoff copy is ready for manual setup.", suggestions: buildAdHandoffSuggestions(context) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.REWRITE_SELECTED_TEXT) {
        return { notice: "Selected text version is ready.", suggestions: rewriteSelectedText(context, params.selectedText) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.SHORTEN_SELECTED_TEXT) {
        return { notice: "Shorter selected text is ready.", suggestions: shortenSelectedText(params.selectedText) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.LOCALIZE_SELECTED_TEXT) {
        return { notice: "Local selected text is ready.", suggestions: localizeSelectedText(context, params.selectedText) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.SOURCE_FACT_CHECK) {
        return { notice: "Business fact check complete.", findings: buildFactFindings(context, params.document) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.BRAND_CHECK) {
        return { notice: "Brand check complete.", findings: buildBrandFindings(context, params.document) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.LAYER_SELECTED_IMAGE) {
        return { notice: "Layering guidance is ready.", findings: buildLayerImageFindings(params.selectedElement) };
    }
    if (actionId === CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTION_IDS.EXPORT_CHECKLIST) {
        return { notice: "Export checklist is ready.", findings: buildExportFindings(context) };
    }

    return {
        findings: [
            finding("unsupported-action", "warning", "This tool is not active in CampaignCue yet."),
        ],
        notice: "Tool is not available.",
    };
}
