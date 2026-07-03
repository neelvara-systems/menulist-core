import {
    CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS,
    type CampaignCueDesignCueActionId,
} from "@constant/campaigncue/designCue";
import type {
    CreativeEditorDesignCueCanvasPreset,
    CreativeEditorDesignCueFinding,
    CreativeEditorDesignCuePatchOperation,
    CreativeEditorDesignCuePatchSet,
    CreativeEditorDesignCueSafeLayerPatch,
    CreativeEditorDesignCueTarget,
} from "@/modules/creative-editor/types";
import {
    cleanDesignCueText,
    getCampaignCueDesignCueOfferSubject,
    isDesignCueTextElement,
    truncateDesignCueText,
    type CampaignCueDesignCueContext,
} from "./context";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";

const patchId = (prefix: string) => createTimestampedRuntimeId(prefix, 8);

const includesLoose = (haystack: string, needle?: string) => {
    const normalizedNeedle = cleanDesignCueText(needle).toLowerCase();
    if (!normalizedNeedle) return false;
    return haystack.toLowerCase().includes(normalizedNeedle);
};

const finding = (
    id: string,
    tone: CreativeEditorDesignCueFinding["tone"],
    text: string,
): CreativeEditorDesignCueFinding => ({ id, text, tone });

const patchSet = (params: {
    actionId: CampaignCueDesignCueActionId | string;
    findings?: CreativeEditorDesignCueFinding[];
    needsReview?: boolean;
    operations: CreativeEditorDesignCuePatchOperation[];
    protectedFactsUsed?: string[];
    summary: string;
    target: CreativeEditorDesignCueTarget;
    title: string;
}): CreativeEditorDesignCuePatchSet => ({
    executionMode: "programmatic",
    findings: params.findings,
    id: patchId(params.actionId.replace(/[^a-z0-9]+/gi, "_")),
    needsReview: Boolean(params.needsReview),
    operations: params.operations,
    protectedFactsUsed: params.protectedFactsUsed || [],
    summary: params.summary,
    target: params.target,
    title: params.title,
});

const findingPatchSet = (params: {
    actionId: CampaignCueDesignCueActionId | string;
    findings: CreativeEditorDesignCueFinding[];
    summary: string;
    target: CreativeEditorDesignCueTarget;
    title: string;
}): CreativeEditorDesignCuePatchSet => patchSet({
    ...params,
    needsReview: true,
    operations: params.findings.map((entry) => ({
        id: entry.id,
        op: "add_finding",
        text: entry.text,
        tone: entry.tone,
    })),
});

const addTextPatch = (params: {
    actionId: CampaignCueDesignCueActionId;
    name: string;
    protectedFactsUsed?: string[];
    summary: string;
    target: CreativeEditorDesignCueTarget;
    text: string;
    title: string;
}): CreativeEditorDesignCuePatchSet => patchSet({
    actionId: params.actionId,
    operations: [{
        name: params.name,
        op: "add_text",
        placement: "cta_zone",
        text: truncateDesignCueText(params.text, 260),
    }],
    protectedFactsUsed: params.protectedFactsUsed,
    summary: params.summary,
    target: params.target,
    title: params.title,
});

const selectedTextPatch = (params: {
    actionId: CampaignCueDesignCueActionId;
    context: CampaignCueDesignCueContext;
    patch?: CreativeEditorDesignCueSafeLayerPatch;
    summary: string;
    target: CreativeEditorDesignCueTarget;
    text?: string;
    title: string;
}) => {
    const selected = params.context.selectedElement;
    if (!isDesignCueTextElement(selected)) {
        return findingPatchSet({
            actionId: params.actionId,
            findings: [
                finding("select-text-layer", "review", "Select a text layer first, then run this again."),
            ],
            summary: "Select a text layer before applying this change.",
            target: params.target,
            title: params.title,
        });
    }

    const operations: CreativeEditorDesignCuePatchOperation[] = [];
    if (params.text != null) {
        operations.push({
            elementId: selected.id,
            op: "update_text",
            text: truncateDesignCueText(params.text, 500),
        });
    }
    if (params.patch) {
        operations.push({
            elementId: selected.id,
            op: "update_layer",
            patch: params.patch,
        });
    }

    return patchSet({
        actionId: params.actionId,
        operations,
        protectedFactsUsed: selected.sourceRefs?.map((source) => source.label).filter(Boolean),
        summary: params.summary,
        target: { type: "layer", elementId: selected.id },
        title: params.title,
    });
};

export const buildCampaignCueDesignCueBiggerOfferPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    if (isDesignCueTextElement(context.selectedElement)) {
        const currentSize = context.selectedElement.fontSize || 40;
        return selectedTextPatch({
            actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.BIGGER_OFFER,
            context,
            patch: {
                fontSize: Math.min(140, Math.round(currentSize * 1.18)),
                fontWeight: "800",
            },
            summary: "The selected offer text will become larger and stronger.",
            target,
            title: "Make offer clearer",
        });
    }
    const subject = getCampaignCueDesignCueOfferSubject(context);
    return addTextPatch({
        actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.BIGGER_OFFER,
        name: "Clear offer",
        protectedFactsUsed: [context.businessName, subject],
        summary: "A clear editable offer line will be added.",
        target,
        text: `${context.businessName}: ${subject}`,
        title: "Add clear offer",
    });
};

export const buildCampaignCueDesignCueShorterTextPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => selectedTextPatch({
    actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.SHORTER_TEXT,
    context,
    summary: "The selected text will be shortened while staying editable.",
    target,
    text: truncateDesignCueText(context.selectedText, 58),
    title: "Shorten selected text",
});

export const buildCampaignCueDesignCueLocationPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    if (!context.hasLocality) {
        return findingPatchSet({
            actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_LOCATION,
            findings: [
                finding("missing-location", "review", "Location is not saved yet. Add or confirm the locality before placing it on the design."),
            ],
            summary: "No location text was added because the locality is not confirmed.",
            target,
            title: "Location needs review",
        });
    }
    return addTextPatch({
        actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_LOCATION,
        name: "Location",
        protectedFactsUsed: [context.locality],
        summary: "The saved locality will be added as editable text.",
        target,
        text: context.locality,
        title: "Add location",
    });
};

const contactTextFor = (context: CampaignCueDesignCueContext) => {
    if (context.contactKind === "whatsapp") return `WhatsApp: ${context.contactLine}`;
    if (context.contactKind === "phone") return `Call: ${context.contactLine}`;
    if (context.contactKind === "booking_url") return `Book: ${context.contactLine}`;
    if (context.contactKind === "public_menu") return `Order: ${context.contactLine}`;
    if (context.contactKind === "website") return `Visit: ${context.contactLine}`;
    return "";
};

export const buildCampaignCueDesignCueWhatsappPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    if (!context.hasContactLine) {
        return findingPatchSet({
            actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_WHATSAPP,
            findings: [
                finding("missing-contact", "review", "No approved WhatsApp, phone, booking, menu, or website contact is saved yet."),
            ],
            summary: "No contact line was added because the contact detail is not confirmed.",
            target,
            title: "Contact needs review",
        });
    }
    return addTextPatch({
        actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_WHATSAPP,
        name: "Contact line",
        protectedFactsUsed: [context.contactLine],
        summary: "The saved contact line will be added as editable text.",
        target,
        text: contactTextFor(context),
        title: "Add contact line",
    });
};

export const buildCampaignCueDesignCueResizePatch = (
    actionId: CampaignCueDesignCueActionId,
    preset: CreativeEditorDesignCueCanvasPreset,
    target: CreativeEditorDesignCueTarget,
) => patchSet({
    actionId,
    operations: [{ op: "resize_canvas", preset }],
    summary: `The design will resize to ${preset}. Layers scale with the canvas.`,
    target,
    title: `Make ${preset}`,
});

export const buildCampaignCueDesignCueFactCheckPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    const text = context.documentText;
    const facts = context.sourceFacts.map((fact) => cleanDesignCueText(fact.value)).filter(Boolean);
    const knownNumbers = new Set([
        ...(context.primaryItem?.priceLabel ? [context.primaryItem.priceLabel] : []),
        ...facts.filter((value) => /[$₹€£]|\b\d+(\.\d{1,2})?\b/.test(value)),
    ].map((value) => value.toLowerCase()));
    const visibleNumbers = Array.from(new Set(text.match(/(?:[$₹€£]\s*)?\b\d+(?:\.\d{1,2})?\b/g) || []));
    const unknownNumbers = visibleNumbers.filter((value) => !knownNumbers.has(value.toLowerCase()));
    return findingPatchSet({
        actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_FACTS,
        findings: [
            includesLoose(text, context.businessName)
                ? finding("business-name-present", "ready", `Business name appears: ${context.businessName}.`)
                : finding("business-name-missing", "review", `Business name is not visible. Add ${context.businessName} before public use.`),
            context.sourceFacts.length
                ? finding("source-facts-present", "ready", `${context.sourceFacts.length} source fact${context.sourceFacts.length === 1 ? "" : "s"} available for review.`)
                : finding("source-facts-missing", "review", "No source facts are attached. Review offers, prices, dates, and contact details manually."),
            unknownNumbers.length
                ? finding("unknown-numbers", "review", `Review these numbers before use: ${unknownNumbers.slice(0, 4).join(", ")}.`)
                : finding("numbers-clear", "note", "No unrecognized price-like number was found in visible text."),
        ],
        summary: "Design Cue will show fact checks without changing the design.",
        target,
        title: "Business fact check",
    });
};

export const buildCampaignCueDesignCueBrandCheckPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    const hasBrandName = includesLoose(context.documentText, context.businessName);
    const hasBrandColor = JSON.stringify(context.selectedElement || {}).toLowerCase().includes(context.brandColor.toLowerCase())
        || context.documentText.toLowerCase().includes(context.brandColor.toLowerCase());
    const avoidedTerm = context.brandAvoidList.find((term) => includesLoose(context.documentText, term));
    return findingPatchSet({
        actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_BRAND,
        findings: [
            hasBrandName
                ? finding("brand-name-present", "ready", "Business name is visible.")
                : finding("brand-name-missing", "review", "Add the business name if customers will see this without context."),
            hasBrandColor
                ? finding("brand-color-present", "ready", `Brand color is visible: ${context.brandColor}.`)
                : finding("brand-color-missing", "review", `Brand color is not obvious in editable layers: ${context.brandColor}.`),
            finding("brand-voice", "note", `Use a ${context.brandVoice} tone for final copy.`),
            context.brandFeel.length
                ? finding("brand-feel", "note", `Brand feel: ${context.brandFeel.join(", ")}.`)
                : finding("brand-feel-missing", "review", "Brand feel is not set in Business details."),
            context.brandVisualMotifs.length
                ? finding("brand-visual-motifs", "note", `Visual motifs: ${context.brandVisualMotifs.join(", ")}.`)
                : finding("brand-visual-motifs-missing", "review", "Visual motifs are not set in Business details."),
            avoidedTerm
                ? finding("brand-avoid-term", "review", `Document text uses avoid-list wording: ${avoidedTerm}.`)
                : finding("brand-avoid-list", "note", "Check the Brand Playbook avoid list before export."),
        ],
        summary: "Design Cue will show brand checks without changing the design.",
        target,
        title: "Brand check",
    });
};

export const buildCampaignCueDesignCueExportChecklistPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => findingPatchSet({
    actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.EXPORT_CHECKLIST,
    findings: [
        finding("download-first", "ready", "Download PNG when the design is ready."),
        finding("manual-use", "note", "Use the downloaded asset manually in WhatsApp, Google, social, or ad tools."),
        finding("facts-before-export", "review", `Check business name, contact, offer, price, and date for ${context.businessName}.`),
        finding("rights-before-export", "review", "Confirm rights for uploaded photos, people, logos, and watermarked images before public use."),
    ],
    summary: "Design Cue will show export checks without changing the design.",
    target,
    title: "Export checklist",
});

export const buildCampaignCueDesignCueChannelReadyPatch = (
    actionId: CampaignCueDesignCueActionId,
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    const baseFindings = [
        context.hasBusinessName && includesLoose(context.documentText, context.businessName)
            ? finding("business-name-visible", "ready", `Business name is visible: ${context.businessName}.`)
            : finding("business-name-review", "review", `Add ${context.businessName} if customers will see this asset outside CampaignCue.`),
        context.hasContactLine
            ? finding("contact-confirmed", "ready", `Contact is confirmed: ${contactTextFor(context)}.`)
            : finding("contact-missing", "review", "Confirm WhatsApp, phone, booking link, menu link, or website before public use."),
    ];

    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_WHATSAPP_READY) {
        return findingPatchSet({
            actionId,
            findings: [
                ...baseFindings,
                finding("whatsapp-manual", "note", "Download the image and copy the WhatsApp message from the delivery card. CampaignCue will not send it."),
                context.documentText.length > 220
                    ? finding("whatsapp-text-density", "review", "The visible text may be too long for a quick WhatsApp image.")
                    : finding("whatsapp-text-density", "ready", "Text length looks usable for a WhatsApp image."),
            ],
            summary: "Design Cue will check WhatsApp readiness without changing the design.",
            target,
            title: "WhatsApp readiness",
        });
    }

    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_GOOGLE_READY) {
        return findingPatchSet({
            actionId,
            findings: [
                ...baseFindings,
                context.hasLocality
                    ? finding("google-locality", "ready", `Locality is confirmed: ${context.locality}.`)
                    : finding("google-locality", "review", "Confirm the business location or service area before Google handoff."),
                context.destination
                    ? finding("google-destination", "ready", `Destination is available: ${context.destination}.`)
                    : finding("google-destination", "review", "Confirm a booking, order, menu, website, or contact destination before Google handoff."),
                finding("google-manual", "note", "Use the Google delivery card for update, offer, or event fields. CampaignCue will not post to Google."),
            ],
            summary: "Design Cue will check Google Business Profile handoff readiness without changing the design.",
            target,
            title: "Google readiness",
        });
    }

    return findingPatchSet({
        actionId,
        findings: [
            ...baseFindings,
            finding("print-format", "note", "Export a flattened PNG/PDF from the saved editor state before printing."),
            finding("print-legibility", "review", "Check small text, price, date, and QR/contact readability on the final size."),
            finding("print-rights", "review", "Confirm rights for photos, people, logos, and watermarked images before printing."),
        ],
        summary: "Design Cue will check print readiness without changing the design.",
        target,
        title: "Print readiness",
    });
};

export const buildCampaignCueDesignCueSimplePatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => findingPatchSet({
    actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_SIMPLE,
    findings: [
        finding("simple-primary", "note", "Keep one offer, one supporting line, and one contact action visible."),
        context.documentText.length > 180
            ? finding("text-density", "review", "The visible text may be too long for a quick campaign asset.")
            : finding("text-density", "ready", "Text length looks manageable."),
        finding("manual-simplify", "note", "Delete or hide extra decorative layers manually if they are not needed."),
    ],
    summary: "Design Cue will suggest simplification without deleting layers automatically.",
    target,
    title: "Make it simpler",
});

export const buildCampaignCueDesignCuePremiumPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    if (isDesignCueTextElement(context.selectedElement)) {
        return selectedTextPatch({
            actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PREMIUM,
            context,
            patch: {
                color: "#16231f",
                fontWeight: "800",
                lineHeight: 1.05,
            },
            summary: "The selected text will use a stronger premium-looking style.",
            target,
            title: "Make selected text premium",
        });
    }
    return addTextPatch({
        actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PREMIUM,
        name: "Premium line",
        protectedFactsUsed: [context.businessName],
        summary: "A calm premium-style editable line will be added.",
        target,
        text: `Selected by ${context.businessName}`,
        title: "Add premium line",
    });
};

export const buildCampaignCueDesignCueTooBusyPatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => findingPatchSet({
    actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.TOO_BUSY,
    findings: [
        context.documentText.length > 160
            ? finding("copy-density", "review", "There may be too much text for a fast campaign asset.")
            : finding("copy-density", "ready", "Text density looks manageable."),
        context.selectedElement
            ? finding("selected-layer", "note", `Selected layer: ${context.selectedElement.name}. Adjust size or spacing if it competes with the offer.`)
            : finding("selected-layer", "note", "Select a layer to get a more specific suggestion."),
        finding("owner-control", "note", "Design Cue will not delete layers without your action."),
    ],
    summary: "Design Cue will show clutter/readability checks without changing the design.",
    target,
    title: "Readability check",
});

export const buildCampaignCueDesignCueFriendlyRewritePatch = (
    context: CampaignCueDesignCueContext,
    target: CreativeEditorDesignCueTarget,
) => {
    const selected = cleanDesignCueText(context.selectedText);
    const friendly = selected
        ? `${selected.replace(/[.!?]+$/, "")}. Message ${context.businessName} for details.`
        : "";
    return selectedTextPatch({
        actionId: CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.REWRITE_FRIENDLY,
        context,
        summary: "The selected text will become friendlier without changing known facts.",
        target,
        text: friendly,
        title: "Rewrite selected text",
    });
};

export const buildCampaignCueDesignCueUnsupportedPatch = (
    actionId: string,
    target: CreativeEditorDesignCueTarget,
) => findingPatchSet({
    actionId,
    findings: [
        finding("unsupported-request", "review", "Design Cue could not safely match this request. Choose a command chip or select a text layer first."),
    ],
    summary: "No safe editable change was prepared.",
    target,
    title: "Review request",
});
