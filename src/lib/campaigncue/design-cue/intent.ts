import {
    CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS,
    type CampaignCueDesignCueActionId,
} from "@constant/campaigncue/designCue";
import type {
    CreativeEditorDesignCueCanvasPreset,
    CreativeEditorDesignCuePatchSet,
    CreativeEditorDesignCueRequest,
} from "@/modules/creative-editor/types";
import type { CampaignCueOverview } from "@type/campaigncue";
import {
    buildCampaignCueDesignCueContext,
    cleanDesignCueText,
} from "./context";
import {
    buildCampaignCueDesignCueBiggerOfferPatch,
    buildCampaignCueDesignCueBrandCheckPatch,
    buildCampaignCueDesignCueExportChecklistPatch,
    buildCampaignCueDesignCueFactCheckPatch,
    buildCampaignCueDesignCueFriendlyRewritePatch,
    buildCampaignCueDesignCueLocationPatch,
    buildCampaignCueDesignCuePremiumPatch,
    buildCampaignCueDesignCueChannelReadyPatch,
    buildCampaignCueDesignCueResizePatch,
    buildCampaignCueDesignCueShorterTextPatch,
    buildCampaignCueDesignCueSimplePatch,
    buildCampaignCueDesignCueTooBusyPatch,
    buildCampaignCueDesignCueUnsupportedPatch,
    buildCampaignCueDesignCueWhatsappPatch,
} from "./patches";

export interface CampaignCueDesignCueRunParams extends CreativeEditorDesignCueRequest {
    overview?: CampaignCueOverview | null;
}

const resizePresetForAction = (
    actionId: CampaignCueDesignCueActionId,
): CreativeEditorDesignCueCanvasPreset | null => {
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_POSTER) return "poster";
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_SQUARE) return "square";
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_STORY) return "story";
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_WIDE) return "wide";
    return null;
};

const campaignCueDesignCueActionIds = new Set<string>(Object.values(CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS));

const isCampaignCueDesignCueActionId = (value?: string): value is CampaignCueDesignCueActionId => (
    Boolean(value && campaignCueDesignCueActionIds.has(value))
);

const resolveFreeTextAction = (comment?: string): CampaignCueDesignCueActionId | undefined => {
    const text = cleanDesignCueText(comment).toLowerCase();
    if (!text) return undefined;
    if (/\b(square|feed|instagram post)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_SQUARE;
    if (/\b(story|reel|vertical|tall)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_STORY;
    if (/\b(poster|print|flyer)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_POSTER;
    if (/\b(wide|banner|cover)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_WIDE;
    if (/\b(location|address|local|area)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_LOCATION;
    if (/\b(whatsapp|phone|call|contact|booking)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_WHATSAPP;
    if (/\b(bigger|larger|clearer|highlight|more visible)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.BIGGER_OFFER;
    if (/\b(short|shorter|trim|reduce words)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.SHORTER_TEXT;
    if (/\b(fact|price|date|check|correct)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_FACTS;
    if (/\b(brand|logo|color|colour)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_BRAND;
    if (/\b(whatsapp ready|ready for whatsapp|whatsapp pack)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_WHATSAPP_READY;
    if (/\b(google ready|ready for google|google post|google offer|business profile)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_GOOGLE_READY;
    if (/\b(print ready|ready for print|poster ready|flyer ready)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PRINT_READY;
    if (/\b(export|download|ready|post)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.EXPORT_CHECKLIST;
    if (/\b(simple|simpler|clean|minimal)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_SIMPLE;
    if (/\b(premium|luxury|elegant)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PREMIUM;
    if (/\b(busy|clutter|crowded|readability)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.TOO_BUSY;
    if (/\b(friendly|rewrite|warmer|polite)\b/.test(text)) return CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.REWRITE_FRIENDLY;
    return undefined;
};

export const runCampaignCueDesignCue = (params: CampaignCueDesignCueRunParams): CreativeEditorDesignCuePatchSet => {
    const actionId = isCampaignCueDesignCueActionId(params.commandId)
        ? params.commandId
        : resolveFreeTextAction(params.comment);
    const context = buildCampaignCueDesignCueContext({
        document: params.document,
        overview: params.overview,
        selectedElement: params.selectedElement,
        selectedText: params.selectedText,
    });
    const target = params.target;

    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.BIGGER_OFFER) {
        return buildCampaignCueDesignCueBiggerOfferPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.SHORTER_TEXT) {
        return buildCampaignCueDesignCueShorterTextPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_LOCATION) {
        return buildCampaignCueDesignCueLocationPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_WHATSAPP) {
        return buildCampaignCueDesignCueWhatsappPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_FACTS) {
        return buildCampaignCueDesignCueFactCheckPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.CHECK_BRAND) {
        return buildCampaignCueDesignCueBrandCheckPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.EXPORT_CHECKLIST) {
        return buildCampaignCueDesignCueExportChecklistPatch(context, target);
    }
    if (
        actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_WHATSAPP_READY
        || actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_GOOGLE_READY
        || actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PRINT_READY
    ) {
        return buildCampaignCueDesignCueChannelReadyPatch(actionId, context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_SIMPLE) {
        return buildCampaignCueDesignCueSimplePatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PREMIUM) {
        return buildCampaignCueDesignCuePremiumPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.TOO_BUSY) {
        return buildCampaignCueDesignCueTooBusyPatch(context, target);
    }
    if (actionId === CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.REWRITE_FRIENDLY) {
        return buildCampaignCueDesignCueFriendlyRewritePatch(context, target);
    }

    const preset = actionId ? resizePresetForAction(actionId) : null;
    if (actionId && preset) {
        return buildCampaignCueDesignCueResizePatch(actionId, preset, target);
    }

    return buildCampaignCueDesignCueUnsupportedPatch(actionId || "campaigncue.design_cue.unsupported", target);
};
