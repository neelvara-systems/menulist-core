import type {
    SignalDeskActivationOpportunitySummary,
    SignalDeskGrowthMissionSummary,
    SignalDeskOutcomeSummary,
    SignalDeskTargetSummary,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";

export type SignalDeskDailyDeskDestination =
    | "activations"
    | "approvals"
    | "content"
    | "controls"
    | "conversations"
    | "opportunities";

export type SignalDeskDailyDeskAction =
    | "draft"
    | "evidence"
    | "handoff"
    | "journey"
    | "navigate"
    | "score";

export interface SignalDeskDailyDeskTask {
    action: SignalDeskDailyDeskAction;
    destination: SignalDeskDailyDeskDestination;
    detail: string;
    expectedOutcome: string;
    id: string;
    label: string;
    opportunityId?: string | null;
    riskLevel: "high" | "low" | "medium";
    source: "live" | "mission";
    targetId?: string | null;
}

export interface SignalDeskWeeklyActivationSnapshot {
    activated: number;
    interestedNow: number;
    previewPrepared: number;
    published: number;
    routeCreated: number;
    routedCohortActivationRate: number;
    stalledNow: number;
    uploadStarted: number;
}

const ACTIVE_CONVERSATION_STATES = new Set(["interested", "needs_review"]);
const CRITICAL_CONVERSATION_STATES = new Set(["complaint", "privacy_request", "legal_request"]);
const TERMINAL_OPPORTUNITY_STATES = new Set(["activated", "closed", "rejected"]);
const VERIFIED_ACTIVATION_INTEGRITY = new Set(["menulist-signed", "owner-reviewed-manual"]);

export const hasVerifiedSignalDeskActivation = (
    target: Pick<
        SignalDeskTargetSummary,
        | "latestVerifiedActivationAt"
        | "latestVerifiedActivationEvidenceRef"
        | "latestVerifiedActivationIntegrityStatus"
        | "latestVerifiedActivationSurfaces"
    > | null | undefined,
) => Boolean(
    target?.latestVerifiedActivationAt
    && target.latestVerifiedActivationEvidenceRef
    && target.latestVerifiedActivationIntegrityStatus
    && VERIFIED_ACTIVATION_INTEGRITY.has(target.latestVerifiedActivationIntegrityStatus)
    && new Set(target.latestVerifiedActivationSurfaces || []).size >= 2
);

const missionDestination = (
    action: SignalDeskGrowthMissionSummary["missionActions"][number],
): SignalDeskDailyDeskDestination => {
    if (action.entityType === "reply") return "conversations";
    if (action.entityType === "approval") return "approvals";
    if (action.entityType === "content") return "content";
    if (action.entityType === "sender" || action.entityType === "source") return "controls";
    if (action.entityType === "target" && /activat|upload|preview|publish/i.test(`${action.label} ${action.expectedOutcome}`)) {
        return "activations";
    }
    return "opportunities";
};

const missionTargetId = (
    action: SignalDeskGrowthMissionSummary["missionActions"][number],
    data: SignalDeskWorkspaceResponse,
) => {
    if (action.entityType === "target") return action.entityId || null;
    if (action.entityType === "reply") {
        return data.workspace.conversations.find((conversation) => conversation.conversationId === action.entityId)?.targetId || null;
    }
    if (action.entityType === "approval") {
        return data.workspace.approvals.find((approval) => approval.approvalId === action.entityId)?.targetId || null;
    }
    return null;
};

const missionDetail = (
    action: SignalDeskGrowthMissionSummary["missionActions"][number],
    data: SignalDeskWorkspaceResponse,
    opportunity?: SignalDeskActivationOpportunitySummary | null,
) => {
    if (opportunity?.nextAction) return opportunity.nextAction;
    if (action.entityType === "reply") {
        const conversation = data.workspace.conversations.find((item) => item.conversationId === action.entityId);
        return conversation ? `Review the current ${conversation.state.replace(/_/g, " ")} conversation and choose its governed next route.` : action.expectedOutcome;
    }
    if (action.entityType === "approval") {
        return data.workspace.approvals.find((approval) => approval.approvalId === action.entityId)?.reviewReason || action.expectedOutcome;
    }
    return action.expectedOutcome;
};

const isMissionActionCurrent = (
    action: SignalDeskGrowthMissionSummary["missionActions"][number],
    data: SignalDeskWorkspaceResponse,
) => {
    if (action.status === "completed" || action.status === "held" || action.status === "redirected") return false;
    let current = true;
    if (action.entityType === "reply") {
        const conversation = data.workspace.conversations.find((item) => item.conversationId === action.entityId);
        current = Boolean(conversation && (
            ACTIVE_CONVERSATION_STATES.has(conversation.state)
            || CRITICAL_CONVERSATION_STATES.has(conversation.state)
        ));
    } else if (action.entityType === "approval") {
        current = data.workspace.approvals.some((approval) => approval.approvalId === action.entityId && approval.status === "pending");
    } else if (action.entityType === "target") {
        current = data.workspace.targets.some((target) => target.targetId === action.entityId);
    }
    if (!current) return false;
    const targetId = missionTargetId(action, data);
    const opportunity = targetId
        ? data.workspace.activationOpportunities.find((item) => item.targetId === targetId)
        : null;
    return !opportunity || !TERMINAL_OPPORTUNITY_STATES.has(opportunity.state);
};

const opportunityAction = (
    opportunity: SignalDeskActivationOpportunitySummary,
    data: SignalDeskWorkspaceResponse,
): SignalDeskDailyDeskAction => {
    if (opportunity.state === "engaged" || opportunity.state === "activation_started") return "handoff";
    if (opportunity.state !== "actionable" && opportunity.state !== "verified") return "journey";
    const target = data.workspace.targets.find((item) => item.targetId === opportunity.targetId);
    const researchRow = data.workspace.researchTableRows.find((row) => row.targetId === opportunity.targetId);
    const nextAction = researchRow?.recommendedNextAction || target?.nextAction;
    if (nextAction === "draft") return "draft";
    if (nextAction === "evidence") return "evidence";
    if (nextAction === "score") return "score";
    return "journey";
};

const opportunityDestination = (
    opportunity: SignalDeskActivationOpportunitySummary,
): SignalDeskDailyDeskDestination => (
    opportunity.state === "contacted"
    || opportunity.state === "engaged"
    || opportunity.state === "activation_started"
        ? "activations"
        : "opportunities"
);

const pushUnique = (
    tasks: SignalDeskDailyDeskTask[],
    task: SignalDeskDailyDeskTask,
) => {
    const duplicate = tasks.some((current) => (
        current.id === task.id
        || Boolean(current.targetId && task.targetId && current.targetId === task.targetId)
    ));
    if (!duplicate && tasks.length < 5) tasks.push(task);
};

export const buildSignalDeskDailyActivationDesk = (
    data: SignalDeskWorkspaceResponse,
): SignalDeskDailyDeskTask[] => {
    const tasks: SignalDeskDailyDeskTask[] = [];
    const mission = data.workspace.growthMissions.find((candidate) => (
        candidate.status !== "completed"
        && candidate.status !== "held"
        && candidate.ownerDecision !== "completed"
        && candidate.ownerDecision !== "hold"
    ));

    mission?.missionActions
        .filter((action) => isMissionActionCurrent(action, data))
        .sort((left, right) => left.rank - right.rank)
        .forEach((action) => {
            const targetId = missionTargetId(action, data);
            const opportunity = targetId
                ? data.workspace.activationOpportunities.find((item) => item.targetId === targetId)
                : null;
            pushUnique(tasks, {
                action: opportunity ? opportunityAction(opportunity, data) : "navigate",
                destination: missionDestination(action),
                detail: missionDetail(action, data, opportunity),
                expectedOutcome: action.expectedOutcome,
                id: `mission:${mission.growthMissionId}:${action.actionId}`,
                label: action.label,
                opportunityId: opportunity?.activationOpportunityId || null,
                riskLevel: action.riskLevel,
                source: "mission",
                targetId,
            });
        });

    data.workspace.activationOpportunities
        .filter((opportunity) => !TERMINAL_OPPORTUNITY_STATES.has(opportunity.state))
        .sort((left, right) => right.priority - left.priority)
        .forEach((opportunity) => {
            pushUnique(tasks, {
                action: opportunityAction(opportunity, data),
                destination: opportunityDestination(opportunity),
                detail: opportunity.nextAction,
                expectedOutcome: opportunity.state === "engaged" || opportunity.state === "activation_started"
                    ? "Move the owner into the existing MenuList setup flow, then record observed progress in Activations."
                    : "Advance one evidence-bound opportunity without enabling provider send.",
                id: `opportunity:${opportunity.activationOpportunityId}`,
                label: opportunity.displayName,
                opportunityId: opportunity.activationOpportunityId,
                riskLevel: opportunity.state === "suppressed" || opportunity.state === "expired" ? "high" : "medium",
                source: "live",
                targetId: opportunity.targetId,
            });
        });

    return tasks;
};

const countOutcome = (
    outcomes: SignalDeskOutcomeSummary[],
    outcomeType: SignalDeskOutcomeSummary["outcomeType"],
) => outcomes
    .filter((outcome) => outcome.outcomeType === outcomeType)
    .reduce((total, outcome) => total + Math.max(0, Number(outcome.count) || 0), 0);

const isVerifiedTwoSurfaceOutcome = (outcome: SignalDeskOutcomeSummary) => (
    outcome.outcomeType === "two_surface_activation"
    && (outcome.integrityStatus === "owner-reviewed-manual" || outcome.integrityStatus === "menulist-signed")
    && Boolean(outcome.ownerQualifiedAt)
    && Boolean(outcome.ownerReviewedAt)
    && Boolean(outcome.evidenceRef)
    && new Set(outcome.surfaces || []).size >= 2
);

export const buildSignalDeskWeeklyActivationSnapshot = (
    data: SignalDeskWorkspaceResponse,
    now = new Date(),
): SignalDeskWeeklyActivationSnapshot => {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 6);
    const startDay = start.toISOString().slice(0, 10);
    const endDay = now.toISOString().slice(0, 10);
    const outcomes = data.workspace.outcomes.filter((outcome) => outcome.day >= startDay && outcome.day <= endDay);
    const routeCreated = countOutcome(outcomes, "route_created");
    const interestedNow = data.workspace.conversations.filter((conversation) => conversation.state === "interested").length;
    const verifiedActivationOutcomes = outcomes.filter(isVerifiedTwoSurfaceOutcome);
    const activated = verifiedActivationOutcomes
        .reduce((total, outcome) => total + Math.max(0, Number(outcome.count) || 0), 0);
    const routedTargetIds = new Set(outcomes
        .filter((outcome) => outcome.outcomeType === "route_created" && outcome.targetId)
        .map((outcome) => outcome.targetId!));
    const activatedRoutedTargetIds = new Set(verifiedActivationOutcomes
        .filter((outcome) => outcome.targetId && routedTargetIds.has(outcome.targetId))
        .map((outcome) => outcome.targetId!));
    const nowMillis = now.getTime();

    return {
        activated,
        interestedNow,
        previewPrepared: countOutcome(outcomes, "preview_prepared"),
        published: countOutcome(outcomes, "published"),
        routeCreated,
        routedCohortActivationRate: routedTargetIds.size
            ? activatedRoutedTargetIds.size / routedTargetIds.size
            : 0,
        stalledNow: data.workspace.activationOpportunities.filter((opportunity) => {
            const deadlineMillis = opportunity.activationDeadlineAt
                ? new Date(opportunity.activationDeadlineAt).getTime()
                : Number.NaN;
            return Number.isFinite(deadlineMillis)
                && deadlineMillis < nowMillis
                && !opportunity.activatedAt
                && !["activated", "closed", "rejected", "suppressed", "expired"].includes(opportunity.state);
        }).length,
        uploadStarted: countOutcome(outcomes, "upload_started"),
    };
};
