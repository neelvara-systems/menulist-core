import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    buildSignalDeskDailyActivationDesk,
    buildSignalDeskWeeklyActivationSnapshot,
    hasVerifiedSignalDeskActivation,
} from "../../src/lib/signaldesk/dailyActivationDesk";
import type { SignalDeskWorkspaceResponse } from "../../src/types/signaldesk";

const fixture = {
    workspace: {
        activationOpportunities: [
            {
                activationOpportunityId: "activation_opportunity_target_1",
                allowedRoute: "email-export",
                allowedRouteReason: "Owner asked for the setup link.",
                category: "Cafe",
                city: "Bengaluru",
                dimensions: { evidence: 80, reachability: 80, truthGap: 90 },
                displayName: "Daily Cafe",
                evidenceGrade: "high",
                hardGateFailures: [],
                nextAction: "Share the existing MenuList setup path.",
                priority: 90,
                routePermissionState: "permissioned",
                sourcePolicyState: "active",
                state: "engaged",
                targetId: "target_1",
                truthGap: "missing-current-menu",
            },
            {
                activationOpportunityId: "activation_opportunity_target_2",
                allowedRoute: "none",
                allowedRouteReason: "Evidence review first.",
                dimensions: { evidence: 40, reachability: 20, truthGap: 70 },
                displayName: "Second Cafe",
                evidenceGrade: "medium",
                hardGateFailures: [],
                nextAction: "Build evidence.",
                priority: 70,
                routePermissionState: "review_required",
                sourcePolicyState: "active",
                state: "actionable",
                targetId: "target_2",
                truthGap: "stale-menu",
            },
        ],
        approvals: [{ approvalId: "approval_done", status: "approved", targetId: "target_2" }],
        conversations: [{
            channel: "manual",
            conversationId: "conversation_1",
            state: "interested",
            targetId: "target_1",
            targetName: "Daily Cafe",
        }],
        growthMissions: [{
            growthMissionId: "mission_today",
            missionActions: [
                {
                    actionId: "mission_today_1",
                    actionType: "review",
                    entityId: "conversation_1",
                    entityType: "reply",
                    expectedOutcome: "Route the interested owner to the safe setup path.",
                    label: "Handle interested reply",
                    rank: 1,
                    reason: "reply:review:medium",
                    riskLevel: "medium",
                    status: "pending",
                },
                {
                    actionId: "mission_today_2",
                    actionType: "approve",
                    entityId: "approval_done",
                    entityType: "approval",
                    expectedOutcome: "Review current approval.",
                    label: "Review approval",
                    rank: 2,
                    reason: "approval:approve:medium",
                    riskLevel: "medium",
                    status: "pending",
                },
            ],
            ownerDecision: "pending",
            status: "ready",
        }],
        outcomes: [
            { count: 1, day: "2026-07-20", outcomeType: "route_created", targetId: "target_1" },
            { count: 1, day: "2026-07-20", outcomeType: "route_created", targetId: "target_2" },
            { count: 1, day: "2026-07-21", outcomeType: "upload_started" },
            { count: 1, day: "2026-07-21", outcomeType: "preview_prepared" },
            { count: 1, day: "2026-07-22", outcomeType: "published" },
            {
                count: 1,
                day: "2026-07-22",
                evidenceRef: "manual-proof-target-1",
                integrityStatus: "owner-reviewed-manual",
                outcomeType: "two_surface_activation",
                ownerQualifiedAt: "2026-07-14T10:00:00.000Z",
                ownerReviewedAt: "2026-07-22T10:00:00.000Z",
                surfaces: ["website", "qr"],
                targetId: "target_1",
            },
            { count: 1, day: "2026-07-22", outcomeType: "two_surface_activation", targetId: "target_2" },
            { count: 9, day: "2026-06-01", outcomeType: "two_surface_activation" },
        ],
        researchTableRows: [],
        targets: [
            { nextAction: "hold", targetId: "target_1" },
            { nextAction: "evidence", targetId: "target_2" },
        ],
    },
} as unknown as SignalDeskWorkspaceResponse;

const tasks = buildSignalDeskDailyActivationDesk(fixture);
assert.equal(tasks.length, 2, "daily desk should deduplicate the mission reply and live opportunity by target");
assert.equal(tasks[0]?.action, "handoff", "interested owner should receive the explicit MenuList handoff action");
assert.equal(tasks[0]?.destination, "conversations", "reply work should stay in Conversations");
assert.equal(tasks[0]?.targetId, "target_1", "mission reply should resolve to its target without copying private message text");
assert.equal(tasks[1]?.action, "evidence", "remaining live opportunity should retain its existing evidence action");
assert.equal(tasks.some((task) => task.id.includes("approval_done")), false, "resolved approvals must not remain in Today");

const suppressedFixture = structuredClone(fixture) as SignalDeskWorkspaceResponse;
suppressedFixture.workspace.activationOpportunities[1].state = "suppressed";
suppressedFixture.workspace.researchTableRows = [{
    recommendedNextAction: "evidence",
    targetId: "target_2",
} as SignalDeskWorkspaceResponse["workspace"]["researchTableRows"][number]];
const suppressedTasks = buildSignalDeskDailyActivationDesk(suppressedFixture);
assert.equal(
    suppressedTasks.find((task) => task.targetId === "target_2")?.action,
    "journey",
    "suppressed opportunities must stay review-only even when an older research row recommends a direct action",
);

const terminalMissionFixture = structuredClone(fixture) as SignalDeskWorkspaceResponse;
terminalMissionFixture.workspace.activationOpportunities[1].state = "activated";
terminalMissionFixture.workspace.growthMissions[0].missionActions.push({
    actionId: "mission_today_terminal_target",
    actionType: "review",
    entityId: "target_2",
    entityType: "target",
    expectedOutcome: "Review a target whose activation is already complete.",
    label: "Review completed target",
    rank: 3,
    reason: "target:review:low",
    riskLevel: "low",
    status: "pending",
});
assert.equal(
    buildSignalDeskDailyActivationDesk(terminalMissionFixture).some((task) => task.targetId === "target_2"),
    false,
    "mission actions must not revive a target whose current opportunity is terminal",
);

const weekly = buildSignalDeskWeeklyActivationSnapshot(fixture, new Date("2026-07-22T12:00:00.000Z"));
assert.deepEqual(weekly, {
    activated: 1,
    interestedNow: 1,
    previewPrepared: 1,
    published: 1,
    routeCreated: 2,
    routedCohortActivationRate: 0.5,
    stalledNow: 0,
    uploadStarted: 1,
});

const stalledFixture = structuredClone(fixture) as SignalDeskWorkspaceResponse;
stalledFixture.workspace.activationOpportunities[1].activationDeadlineAt = "2026-07-21T12:00:00.000Z";
assert.equal(
    buildSignalDeskWeeklyActivationSnapshot(stalledFixture, new Date("2026-07-22T12:00:00.000Z")).stalledNow,
    1,
    "an unresolved opportunity counts as stalled only after its durable activation deadline elapses",
);
stalledFixture.workspace.activationOpportunities[1].state = "expired";
assert.equal(
    buildSignalDeskWeeklyActivationSnapshot(stalledFixture, new Date("2026-07-22T12:00:00.000Z")).stalledNow,
    0,
    "an expired source-policy opportunity must not be reported as an activation-deadline stall",
);

assert.equal(hasVerifiedSignalDeskActivation(undefined), false, "missing target truth cannot admit proof preparation");
assert.equal(hasVerifiedSignalDeskActivation({
    latestVerifiedActivationAt: "2026-07-22T10:00:00.000Z",
    latestVerifiedActivationEvidenceRef: "manual-proof-target-1",
    latestVerifiedActivationIntegrityStatus: "menulist-signed",
    latestVerifiedActivationSurfaces: ["website"],
}), false, "one activation surface is insufficient for customer proof");
assert.equal(hasVerifiedSignalDeskActivation({
    latestVerifiedActivationAt: "2026-07-22T10:00:00.000Z",
    latestVerifiedActivationEvidenceRef: "manual-proof-target-1",
    latestVerifiedActivationIntegrityStatus: null,
    latestVerifiedActivationSurfaces: ["website", "qr"],
}), false, "unverified activation integrity cannot admit customer proof");
assert.equal(hasVerifiedSignalDeskActivation({
    latestVerifiedActivationAt: "2026-07-22T10:00:00.000Z",
    latestVerifiedActivationEvidenceRef: null,
    latestVerifiedActivationIntegrityStatus: "owner-reviewed-manual",
    latestVerifiedActivationSurfaces: ["website", "qr"],
}), false, "activation without durable evidence cannot admit customer proof");
assert.equal(hasVerifiedSignalDeskActivation({
    latestVerifiedActivationAt: "2026-07-22T10:00:00.000Z",
    latestVerifiedActivationEvidenceRef: "manual-proof-target-1",
    latestVerifiedActivationIntegrityStatus: "owner-reviewed-manual",
    latestVerifiedActivationSurfaces: ["website", "qr"],
}), true, "durable owner-reviewed two-surface activation admits permission review for proof preparation");

const workspaceSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/signaldesk/SignalDeskWorkspace.tsx"),
    "utf8",
);
[
    "Today&apos;s activation desk",
    "Seven-day outcomes",
    "Add targets",
    "Copy MenuList setup link",
    "SignalDesk remains observer-only",
    "proofTargetId",
    "Permissioned proof",
    "buildSignalDeskDailyActivationDesk(data)",
    "buildSignalDeskWeeklyActivationSnapshot(data)",
    "hasVerifiedSignalDeskActivation(target)",
    "hasVerifiedSignalDeskActivation(outcomeTarget)",
    "hasVerifiedSignalDeskActivation(selectedJourneyTarget)",
    "Routed cohort",
].forEach((fragment) => {
    assert.ok(workspaceSource.includes(fragment), `SignalDesk workspace is missing the daily activation contract: ${fragment}`);
});
assert.ok(
    workspaceSource.includes("utm_source=founder_pilot&utm_medium=manual_handoff&utm_campaign=bengaluru_pilot_2026"),
    "MenuList handoff must use the existing anonymous founder-pilot attribution contract",
);
assert.ok(
    workspaceSource.includes('<details className={styles.discoveryDisclosure} open={!dailyTasks.length}>'),
    "Add-target discovery must use the native data-derived details open state",
);
assert.equal(
    workspaceSource.includes("defaultOpen="),
    false,
    "Native details must not use the unsupported React defaultOpen prop",
);
assert.equal(
    workspaceSource.includes('runAction("create-signaldesk-route-token"'),
    false,
    "Today must not mint a route token when the MenuList emitter and secret gate remain pending",
);
assert.equal(
    workspaceSource.includes('runAction("send-provider-message"'),
    false,
    "Today must not enable provider send",
);

console.log("SignalDesk daily activation desk tests passed.");
