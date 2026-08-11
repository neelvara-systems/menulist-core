import type { CampaignCueAsset, CampaignCueWorkspace } from "@type/campaigncue";

type CampaignCueWorkspaceMember = CampaignCueWorkspace["members"][string];

export const filterCampaignCueAssetsForMember = (
    assets: CampaignCueAsset[],
    member?: CampaignCueWorkspaceMember,
): CampaignCueAsset[] => {
    if (!member || member.role === "billing_admin") return [];
    if (member?.role !== "local_manager") return assets;
    const assignedLocationIds = new Set(member.locationIds || []);
    return assets.filter((asset) => {
        if (asset.locationId) return assignedLocationIds.has(asset.locationId);
        return !asset.usageRefs.some((usageRef) => Boolean(usageRef.campaignId));
    });
};
