import type {
    CampaignCueActionType,
    CampaignCueWorkspace,
    CampaignCueWorkspaceRole,
} from "@type/campaigncue";

type CampaignCueWorkspaceMember = CampaignCueWorkspace["members"][string];

export const CAMPAIGNCUE_WORKSPACE_CONTENT_ROLES = [
    "owner",
    "admin",
    "marketer",
    "agency_member",
] as const satisfies readonly CampaignCueWorkspaceRole[];

export const CAMPAIGNCUE_LOCATION_OUTPUT_ROLES = [
    ...CAMPAIGNCUE_WORKSPACE_CONTENT_ROLES,
    "local_manager",
] as const satisfies readonly CampaignCueWorkspaceRole[];

const roleIsAllowed = (
    roles: readonly CampaignCueWorkspaceRole[],
    role?: CampaignCueWorkspaceRole,
) => Boolean(role && roles.includes(role));

export const campaignCueCanManageWorkspaceContent = (role?: CampaignCueWorkspaceRole) => (
    roleIsAllowed(CAMPAIGNCUE_WORKSPACE_CONTENT_ROLES, role)
);

export const campaignCueCanManageSomeCampaignOutput = (role?: CampaignCueWorkspaceRole) => (
    roleIsAllowed(CAMPAIGNCUE_LOCATION_OUTPUT_ROLES, role)
);

export const campaignCueCanManageCampaignLocation = (params: {
    locationId?: string;
    member?: CampaignCueWorkspaceMember;
}) => {
    const { locationId, member } = params;
    if (!member || !roleIsAllowed(CAMPAIGNCUE_LOCATION_OUTPUT_ROLES, member.role)) return false;
    if (member.role !== "local_manager") return true;
    return Boolean(locationId && member.locationIds?.includes(locationId));
};

export const campaignCueCanRegisterAsset = (params: {
    locationId?: string;
    member?: CampaignCueWorkspaceMember;
}) => (
    params.locationId
        ? campaignCueCanManageCampaignLocation(params)
        : campaignCueCanManageWorkspaceContent(params.member?.role)
);

const CAMPAIGN_OUTPUT_ACTIONS = new Set<CampaignCueActionType>([
    "download",
    "export",
    "archive_export",
    "mark_used",
    "record_outcome",
    "record_result_evidence",
    "schedule",
    "accept_experiment",
]);

export const campaignCueCanPerformCampaignOutputAction = (params: {
    action: CampaignCueActionType;
    locationId?: string;
    member?: CampaignCueWorkspaceMember;
}) => (
    !CAMPAIGN_OUTPUT_ACTIONS.has(params.action)
    || campaignCueCanManageCampaignLocation(params)
);

export const campaignCueCanMutateVideoProject = (params: {
    action: string;
    locationId?: string;
    member?: CampaignCueWorkspaceMember;
}) => {
    if (params.action === "add_review_note") {
        return params.member?.role === "reviewer"
            || campaignCueCanManageCampaignLocation(params);
    }
    if (["approve", "reject", "resolve_review_note"].includes(params.action)) {
        return params.member?.role === "owner"
            || params.member?.role === "admin"
            || params.member?.role === "reviewer"
            || (
                params.member?.role === "local_manager"
                && campaignCueCanManageCampaignLocation(params)
            );
    }
    return campaignCueCanManageCampaignLocation(params);
};

export const campaignCueCanReadCreativeWorkspace = (role?: CampaignCueWorkspaceRole) => (
    role !== "billing_admin" && Boolean(role)
);
