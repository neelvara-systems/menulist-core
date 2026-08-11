#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    addCampaignCueApprovalComment,
    campaignCueApprovalHasOpenComments,
    campaignCueCanCommentOnApproval,
    campaignCueCanRequestApproval,
    campaignCueCanResolveApproval,
    CampaignCueApprovalInboxError,
    decideCampaignCueApproval,
    resolveCampaignCueApprovalComment,
    startCampaignCueApprovalRequest,
} from "../../src/lib/campaigncue/approvalInbox";

const ROOT = path.resolve(__dirname, "..", "..");
const NOW = new Date("2026-08-10T10:00:00.000Z");
let checks = 0;
const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    checks += 1;
};
const rejects = (run: () => unknown, message: string) => {
    assert.throws(run, CampaignCueApprovalInboxError, message);
    checks += 1;
};

check(campaignCueCanRequestApproval("agency_member"), "agency member can request approval");
check(campaignCueCanRequestApproval("reviewer"), "reviewer can restart a bounded review request");
check(!campaignCueCanRequestApproval("billing_admin"), "billing-only role cannot request approval");
check(campaignCueCanCommentOnApproval("marketer"), "marketer can comment on a waiting approval");
check(!campaignCueCanCommentOnApproval("billing_admin"), "billing-only role cannot comment on approval");
check(campaignCueCanResolveApproval("local_manager"), "local manager can resolve an assigned-location approval");
check(!campaignCueCanResolveApproval("agency_member"), "agency member cannot resolve approval");

const requested = startCampaignCueApprovalRequest({
    actorId: "owner_1",
    locationId: "cc_location_one",
    now: NOW,
    outputId: "cc_output_one",
    requestId: "cc_approval_campaign_one",
});
check(requested.status === "requested" && requested.requestRevision === 1, "first request starts revision one");
check(requested.comments.length === 0, "new request starts a bounded empty thread");

const commented = addCampaignCueApprovalComment({
    actorId: "reviewer_1",
    actorRole: "reviewer",
    commentId: "cc_comment_one",
    inbox: requested,
    locationId: "cc_location_one",
    note: "  Make the booking date clearer.  ",
    now: NOW,
    outputId: "cc_output_one",
});
check(commented.comments[0]?.note === "Make the booking date clearer.", "comment text is trimmed but not rewritten");
check(campaignCueApprovalHasOpenComments(commented), "new comment blocks approval");
rejects(() => decideCampaignCueApproval({ actorId: "owner_1", decision: "approved", inbox: commented, now: NOW }), "open comments must block approval");

const resolved = resolveCampaignCueApprovalComment({
    actorId: "owner_1",
    commentId: "cc_comment_one",
    inbox: commented,
    now: NOW,
});
check(resolved.comments[0]?.note === commented.comments[0]?.note, "resolving preserves immutable comment text");
check(resolved.comments[0]?.status === "resolved", "resolution changes only review state and resolution evidence");
check(!campaignCueApprovalHasOpenComments(resolved), "resolved thread can be approved");
const approved = decideCampaignCueApproval({ actorId: "owner_1", decision: "approved", inbox: resolved, now: NOW });
check(approved.status === "approved" && approved.decidedBy === "owner_1", "approval records the actor");
rejects(() => addCampaignCueApprovalComment({ actorId: "reviewer_1", actorRole: "reviewer", commentId: "late", inbox: approved, note: "late", now: NOW }), "resolved requests cannot receive comments");

const requestedAgain = startCampaignCueApprovalRequest({
    actorId: "agency_1",
    current: { ...approved, status: "rejected" },
    now: NOW,
    requestId: approved.requestId,
});
check(requestedAgain.requestRevision === 2, "new request increments the review revision");
check(requestedAgain.comments.length === 0, "new request does not silently reuse prior comments");

let full = requestedAgain;
for (let index = 0; index < 20; index += 1) {
    full = addCampaignCueApprovalComment({
        actorId: "reviewer_1",
        actorRole: "reviewer",
        commentId: `cc_comment_${index}`,
        inbox: full,
        note: `Review item ${index}`,
        now: NOW,
    });
}
check(full.comments.length === 20, "thread admits no more than twenty comments");
rejects(() => addCampaignCueApprovalComment({ actorId: "reviewer_1", actorRole: "reviewer", commentId: "overflow", inbox: full, note: "Overflow", now: NOW }), "twenty-first comment is rejected");

const server = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/server.ts"), "utf8");
const approvalSource = fs.readFileSync(path.join(ROOT, "src/lib/campaigncue/approvalInbox.ts"), "utf8");
const overviewStart = server.indexOf("export async function loadCampaignCueOverviewServer");
const overviewEnd = server.indexOf("function resolveOpportunity", overviewStart);
const overview = server.slice(overviewStart, overviewEnd);
check(server.includes("!current.outputs.some((output) => output.id === params.outputId)"), "approval output scope is revalidated against the campaign");
check(server.includes("params.locationId !== current.locationId"), "approval location scope is revalidated against the campaign");
check(server.includes("noteHash: params.action === \"add_approval_comment\""), "audit event stores a note digest rather than raw comment text");
check(!overview.includes("APPROVAL_REQUESTS"), "approval inbox adds no overview query");
check(server.includes("decideCampaignCueApproval"), "server delegates approval decisions to the pure inbox boundary");
check(server.includes('params.action === "request_approval" && !campaignCueCanRequestApproval(currentRole)'), "transaction rechecks request permission against the current workspace role");
check(server.includes('params.input.action === "request_approval"') && server.includes("!campaignCueCanRequestApproval(approvalRole)"), "request path fails fast for a billing-only role");
check(approvalSource.includes("CAMPAIGNCUE_APPROVAL_REQUEST_ROLES"), "one shared role contract drives request permission");
check(approvalSource.includes("Resolve the open review comments before approving this campaign pack."), "approval boundary blocks approval with open comments");

process.stdout.write(`CampaignCue approval/comment inbox verification passed (${checks} checks).\n`);
