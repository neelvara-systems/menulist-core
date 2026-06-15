import type {
    CreativeEditorDesignCuePatchSet,
    CreativeEditorDesignCueRequest,
} from "@/modules/creative-editor/types";
import type { CampaignCueOverview } from "@type/campaigncue";
import { buildCampaignCueDesignCueUnsupportedPatch } from "./patches";

export interface CampaignCueDesignCueModelAssistParams extends CreativeEditorDesignCueRequest {
    overview?: CampaignCueOverview | null;
}

export const runCampaignCueDesignCueModelAssist = async (
    params: CampaignCueDesignCueModelAssistParams,
): Promise<CreativeEditorDesignCuePatchSet> => (
    buildCampaignCueDesignCueUnsupportedPatch(
        params.commandId || "campaigncue.design_cue.model_assist_disabled",
        params.target,
    )
);
