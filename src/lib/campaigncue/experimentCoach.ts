import type {
    CampaignCueExperimentSuggestion,
    CampaignCueExperimentVariable,
} from "@type/campaigncue";

export const CAMPAIGNCUE_EXPERIMENT_VARIABLES: CampaignCueExperimentVariable[] = [
    "channel",
    "timing",
    "offer",
    "photo",
    "cta",
    "format",
];

export const getCampaignCueExperimentStatus = (
    experiment?: CampaignCueExperimentSuggestion,
) => experiment?.status || "suggested";

export const acceptCampaignCueExperiment = (
    experiment: CampaignCueExperimentSuggestion,
    acceptedAt: unknown,
): CampaignCueExperimentSuggestion => ({
    ...experiment,
    status: "accepted",
    acceptedAt,
});

export const completeCampaignCueExperimentForResult = (params: {
    completedAt: unknown;
    experiment?: CampaignCueExperimentSuggestion;
    experimentVariable?: CampaignCueExperimentVariable;
    resultSignalId?: string;
}): CampaignCueExperimentSuggestion | undefined => {
    const experiment = params.experiment;
    if (
        !experiment
        || getCampaignCueExperimentStatus(experiment) !== "accepted"
        || !params.experimentVariable
        || params.experimentVariable !== experiment.variable
        || !params.resultSignalId
        || params.resultSignalId === "not_used"
    ) {
        return experiment;
    }
    return {
        ...experiment,
        status: "completed",
        completedAt: params.completedAt,
        completedResultSignalId: params.resultSignalId,
    };
};
