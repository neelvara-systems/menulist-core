#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    campaignCueCanManageCampaignLocation,
    campaignCueCanManageSomeCampaignOutput,
    campaignCueCanManageWorkspaceContent,
    campaignCueCanMutateVideoProject,
    campaignCueCanPerformCampaignOutputAction,
    campaignCueCanReadCreativeWorkspace,
    campaignCueCanRegisterAsset,
} from "../../src/lib/campaigncue/permissions";
import type { CampaignCueWorkspace, CampaignCueWorkspaceRole } from "../../src/types/campaigncue";

let checks = 0;
const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    checks += 1;
};

const member = (
    role: CampaignCueWorkspaceRole,
    locationIds?: string[],
): CampaignCueWorkspace["members"][string] => ({ role, locationIds });

const contentRoles: CampaignCueWorkspaceRole[] = ["owner", "admin", "marketer", "agency_member"];
const nonContentRoles: CampaignCueWorkspaceRole[] = ["reviewer", "local_manager", "billing_admin"];

for (const role of contentRoles) {
    check(campaignCueCanManageWorkspaceContent(role), `${role} can manage workspace content`);
    check(campaignCueCanManageSomeCampaignOutput(role), `${role} can manage campaign outputs`);
    check(campaignCueCanRegisterAsset({ member: member(role) }), `${role} can register workspace assets`);
    check(campaignCueCanReadCreativeWorkspace(role), `${role} can read the creative workspace`);
}

for (const role of nonContentRoles) {
    check(!campaignCueCanManageWorkspaceContent(role), `${role} cannot manage workspace content`);
}

check(campaignCueCanManageSomeCampaignOutput("local_manager"), "local manager can manage assigned campaign outputs");
check(!campaignCueCanManageSomeCampaignOutput("reviewer"), "reviewer cannot run campaign output mutations");
check(!campaignCueCanManageSomeCampaignOutput("billing_admin"), "billing admin cannot run campaign output mutations");
check(campaignCueCanReadCreativeWorkspace("reviewer"), "reviewer can read creative records for review");
check(campaignCueCanReadCreativeWorkspace("local_manager"), "local manager can read assigned creative records");
check(!campaignCueCanReadCreativeWorkspace("billing_admin"), "billing admin cannot read creative records");
check(!campaignCueCanReadCreativeWorkspace(undefined), "missing role cannot read creative records");

const assignedManager = member("local_manager", ["location-a"]);
check(campaignCueCanManageCampaignLocation({ locationId: "location-a", member: assignedManager }), "local manager can manage an assigned location");
check(!campaignCueCanManageCampaignLocation({ locationId: "location-b", member: assignedManager }), "local manager cannot manage another location");
check(!campaignCueCanManageCampaignLocation({ member: assignedManager }), "local manager cannot manage workspace-global output");
check(campaignCueCanPerformCampaignOutputAction({ action: "download", locationId: "location-a", member: assignedManager }), "assigned local manager can download a location output");
check(!campaignCueCanPerformCampaignOutputAction({ action: "download", locationId: "location-b", member: assignedManager }), "local manager cannot download another location output");
check(!campaignCueCanRegisterAsset({ member: assignedManager }), "local manager cannot register an unscoped asset");
check(campaignCueCanRegisterAsset({ locationId: "location-a", member: assignedManager }), "local manager can register an assigned campaign asset");

const reviewer = member("reviewer");
check(campaignCueCanMutateVideoProject({ action: "add_review_note", member: reviewer }), "reviewer can add a video review note");
check(campaignCueCanMutateVideoProject({ action: "approve", member: reviewer }), "reviewer can approve a video project");
check(campaignCueCanMutateVideoProject({ action: "reject", member: reviewer }), "reviewer can reject a video project");
check(!campaignCueCanMutateVideoProject({ action: "save", member: reviewer }), "reviewer cannot rewrite a video project");
check(!campaignCueCanMutateVideoProject({ action: "add_review_note", member: member("billing_admin") }), "billing admin cannot comment on a video project");
check(campaignCueCanMutateVideoProject({ action: "save", locationId: "location-a", member: assignedManager }), "assigned local manager can save a location video project");
check(!campaignCueCanMutateVideoProject({ action: "save", locationId: "location-b", member: assignedManager }), "local manager cannot save another location video project");
check(!campaignCueCanMutateVideoProject({ action: "save", member: assignedManager }), "local manager cannot save a workspace-global video project");

const agencyMember = member("agency_member");
check(campaignCueCanManageCampaignLocation({ member: agencyMember }), "agency member can manage an approved workspace campaign output");

const root = path.resolve(__dirname, "..", "..");
const apiGuardSource = fs.readFileSync(path.join(root, "src/lib/campaigncue/apiGuards.ts"), "utf8");
const serverSource = fs.readFileSync(path.join(root, "src/lib/campaigncue/server.ts"), "utf8");
const cueLayersServerSource = fs.readFileSync(path.join(root, "src/lib/campaigncue/cue-layers/server.ts"), "utf8");
check(apiGuardSource.includes("resolveCampaignCueSessionStoreRole"), "CampaignCue session scope derives the active MenuList store role");
check(serverSource.includes('if (!isOwnerRole(scope.sourceStoreRole || ""))'), "only a proven MenuList owner can create the first CampaignCue workspace");
check(serverSource.includes("if (!campaignCueCanReadCreativeWorkspace(workspace.members?.[scope.userId]?.role))"), "Admin SDK creative reads recheck the durable CampaignCue role");
check(!cueLayersServerSource.includes("campaignCueCanReadCreativeWorkspace"), "CueLayers does not expose unassigned workspace source images to review or local-manager roles");
check(cueLayersServerSource.includes("if (!campaignCueCanManageWorkspaceContent(workspace.members?.[params.scope.userId]?.role))"), "CueLayers design and job reads use the same content-manager boundary as its owner UI");

process.stdout.write(`CampaignCue permissions verification passed (${checks} checks).\n`);
