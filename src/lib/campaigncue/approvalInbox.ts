import type {
    CampaignCueApprovalInbox,
    CampaignCueWorkspaceRole,
} from "@type/campaigncue";

export const CAMPAIGNCUE_APPROVAL_COMMENT_LIMIT = 20;

export const CAMPAIGNCUE_APPROVAL_REQUEST_ROLES = [
    "owner",
    "admin",
    "marketer",
    "reviewer",
    "local_manager",
    "agency_member",
] as const satisfies readonly CampaignCueWorkspaceRole[];

export const CAMPAIGNCUE_APPROVAL_COMMENT_ROLES = [
    ...CAMPAIGNCUE_APPROVAL_REQUEST_ROLES,
] as const satisfies readonly CampaignCueWorkspaceRole[];

export const CAMPAIGNCUE_APPROVAL_RESOLUTION_ROLES = [
    "owner",
    "admin",
    "reviewer",
    "local_manager",
] as const satisfies readonly CampaignCueWorkspaceRole[];

const roleIsAllowed = (
    roles: readonly CampaignCueWorkspaceRole[],
    role?: CampaignCueWorkspaceRole,
) => Boolean(role && roles.includes(role));

export const campaignCueCanRequestApproval = (role?: CampaignCueWorkspaceRole) => (
    roleIsAllowed(CAMPAIGNCUE_APPROVAL_REQUEST_ROLES, role)
);

export const campaignCueCanCommentOnApproval = (role?: CampaignCueWorkspaceRole) => (
    roleIsAllowed(CAMPAIGNCUE_APPROVAL_COMMENT_ROLES, role)
);

export const campaignCueCanResolveApproval = (role?: CampaignCueWorkspaceRole) => (
    roleIsAllowed(CAMPAIGNCUE_APPROVAL_RESOLUTION_ROLES, role)
);

export class CampaignCueApprovalInboxError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CampaignCueApprovalInboxError";
    }
}

export const campaignCueApprovalHasOpenComments = (inbox?: CampaignCueApprovalInbox) => (
    Boolean(inbox?.comments.some((comment) => comment.status === "open"))
);

export function startCampaignCueApprovalRequest(params: {
    actorId: string;
    current?: CampaignCueApprovalInbox;
    locationId?: string;
    now: unknown;
    outputId?: string;
    requestId: string;
}): CampaignCueApprovalInbox {
    const requestRevision = Math.min(1000, Number(params.current?.requestRevision || 0) + 1);
    return {
        requestId: params.requestId,
        requestRevision,
        status: "requested",
        requestedBy: params.actorId,
        requestedAt: params.now,
        outputId: params.outputId,
        locationId: params.locationId,
        comments: [],
        updatedAt: params.now,
    };
}

export function addCampaignCueApprovalComment(params: {
    actorId: string;
    actorRole: CampaignCueWorkspaceRole;
    commentId: string;
    inbox: CampaignCueApprovalInbox;
    locationId?: string;
    note: string;
    now: unknown;
    outputId?: string;
}): CampaignCueApprovalInbox {
    if (params.inbox.status !== "requested") {
        throw new CampaignCueApprovalInboxError("Comments can be added only while approval is waiting.");
    }
    if (params.inbox.comments.length >= CAMPAIGNCUE_APPROVAL_COMMENT_LIMIT) {
        throw new CampaignCueApprovalInboxError("This approval thread has reached its 20-comment limit. Resolve it and start a new review request.");
    }
    const note = params.note.trim();
    if (!note) throw new CampaignCueApprovalInboxError("Add a short review comment.");
    return {
        ...params.inbox,
        comments: [...params.inbox.comments, {
            id: params.commentId,
            requestRevision: params.inbox.requestRevision,
            authorId: params.actorId,
            authorRole: params.actorRole,
            note,
            status: "open",
            outputId: params.outputId,
            locationId: params.locationId,
            createdAt: params.now,
        }],
        updatedAt: params.now,
    };
}

export function resolveCampaignCueApprovalComment(params: {
    actorId: string;
    commentId: string;
    inbox: CampaignCueApprovalInbox;
    now: unknown;
}): CampaignCueApprovalInbox {
    if (params.inbox.status !== "requested") {
        throw new CampaignCueApprovalInboxError("Comments can be resolved only while approval is waiting.");
    }
    const comment = params.inbox.comments.find((item) => item.id === params.commentId);
    if (!comment || comment.status !== "open") {
        throw new CampaignCueApprovalInboxError("This review comment is no longer open.");
    }
    return {
        ...params.inbox,
        comments: params.inbox.comments.map((item) => item.id === comment.id ? {
            ...item,
            status: "resolved" as const,
            resolvedAt: params.now,
            resolvedBy: params.actorId,
        } : item),
        updatedAt: params.now,
    };
}

export function decideCampaignCueApproval(params: {
    actorId: string;
    decision: "approved" | "rejected";
    inbox: CampaignCueApprovalInbox;
    note?: string;
    now: unknown;
}): CampaignCueApprovalInbox {
    if (params.inbox.status !== "requested") {
        throw new CampaignCueApprovalInboxError("This approval request is no longer waiting.");
    }
    if (params.decision === "approved" && campaignCueApprovalHasOpenComments(params.inbox)) {
        throw new CampaignCueApprovalInboxError("Resolve the open review comments before approving this campaign pack.");
    }
    return {
        ...params.inbox,
        status: params.decision,
        decidedBy: params.actorId,
        decidedAt: params.now,
        decisionNote: params.note?.trim() || undefined,
        updatedAt: params.now,
    };
}
