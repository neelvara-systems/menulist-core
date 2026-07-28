import { Timestamp } from "firebase/firestore";
import { LogEntry } from "./common";

export interface TicketMessage {
    id: string;
    text: string;
    type?: 'user' | 'system'; // 'user' for regular messages, 'system' for status changes
    sender: {
        id: string;
        name: string;
        email: string;
    };
    timestamp: Timestamp;
    attachments?: Array<{
        url: string;
        name: string;
        type: string;
        size: number;
    }>;
}

export interface SupportTicketDocument {
    uid?: string;
    url: string;
    name: string;
    type: string;
    size: number;
}

export interface SupportTicketType {
    id: string;
    displayId: string;
    subject: string;
    status: string;
    priority: string;
    category: string;
    message: string;
    documents: SupportTicketDocument[];
    platformNotes: string;
    platformTags: string[];
    contextKeys?: string[];
    deleted?: boolean; // Soft delete flag
    satisfaction?: { rating: number; comment?: string; submittedAt?: Timestamp }; // CSAT survey after resolution
    statuses: {
        status: string;
        timestamp: Timestamp;
        createdBy: {
            id: string;
            name: string;
            email: string;
        };
        remark: string;
    }[];
    messages?: TicketMessage[]; // NEW: Conversation messages separate from status changes
    clientDetails?: {
        storeName: string;
        tenantName: string;
        email: string;
        phone: string;
    },

    // AI Failure Escalation (Expansion Item #8)
    // @see __docs__/answerlattice/ai-failure-escalation/
    /** AI escalation context (only present on tickets created via escalation) */
    escalationContext?: import('@lib/answerlattice/escalationTypes').EscalationContext;
    /** Whether this ticket is a candidate for knowledge creation (System 9) */
    knowledgeCandidate?: boolean;
    /** How this ticket was created */
    source?: 'manual' | 'ai_escalation';
    /** Public widget handoff metadata. Retrieval context is derived server-side from search history. */
    widgetEscalation?: {
        searchHistoryId: string;
        replyEmail: string;
        submittedName?: string;
        detailsProvided: boolean;
    };

    //metatdata which injected via requestBodyComposer //src/lib/apiHelper/index.ts
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;//name
    modifiedBy?: string;//name
    sId?: number;//store id
    tId?: number;//tenant id
    uId?: string;//created by user id,
    logs?: LogEntry[];
    clientDebugContext?: {
        userAgent?: string | null;
        capturedAt?: number | null;
    };
}

export const SUPPORT_TICKET_STATUS = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    RE_OPENED: 'Re-Opened'
} as const;

export const SUPPORT_TICKET_PRIORITY = {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High'
} as const;

export const SUPPORT_TICKET_PRIORITY_LIST = [
    {
        value: SUPPORT_TICKET_PRIORITY.LOW,
        label: 'Not urgent (can wait)'
    },
    {
        value: SUPPORT_TICKET_PRIORITY.NORMAL,
        label: 'Important (needs attention soon)'
    },
    {
        value: SUPPORT_TICKET_PRIORITY.HIGH,
        label: 'Urgent (needs immediate attention)'
    }
]

export const SUPPORT_TICKET_CATEGORY = {
    TECHNICAL_ISSUE: 'Technical Issue',
    BILLING_INQUIRY: 'Billing Inquiry',
    GENERAL_QUESTION: 'General Question',
    CONTENT_MENU_UPDATE: 'Content Update',
    FEATURE_SUGGESTION: 'Feature Suggestion',
    ACCOUNT_LOGIN_HELP: 'Account & Login Help',
    OTHER: 'Other'
} as const;

export const SUPPORT_TICKET_CATEGORY_LIST = [
    { value: SUPPORT_TICKET_CATEGORY.TECHNICAL_ISSUE, label: 'Technical Issue (something not working)' },
    { value: SUPPORT_TICKET_CATEGORY.BILLING_INQUIRY, label: 'Billing / Payments' },
    { value: SUPPORT_TICKET_CATEGORY.GENERAL_QUESTION, label: 'General Question' },
    { value: SUPPORT_TICKET_CATEGORY.CONTENT_MENU_UPDATE, label: 'Content / Menu Update' },
    { value: SUPPORT_TICKET_CATEGORY.FEATURE_SUGGESTION, label: 'Feature Suggestion' },
    { value: SUPPORT_TICKET_CATEGORY.ACCOUNT_LOGIN_HELP, label: 'Account & Login Help' },
    { value: SUPPORT_TICKET_CATEGORY.OTHER, label: 'Other' }
]

export const getCardColor = (
    status: string,
    token: {
        colorErrorBg: string;
        colorInfoBg: string;
        colorSuccessBg: string;
        colorWarningBg: string;
    },
) => {
    switch (status) {
        case SUPPORT_TICKET_STATUS.IN_PROGRESS: return token.colorInfoBg;
        case SUPPORT_TICKET_STATUS.RESOLVED: return token.colorSuccessBg;
        case SUPPORT_TICKET_STATUS.CLOSED: return token.colorErrorBg;
        case SUPPORT_TICKET_STATUS.RE_OPENED: return token.colorWarningBg;
        case SUPPORT_TICKET_STATUS.OPEN: return token.colorInfoBg;
        default: return token.colorInfoBg;
    }
};

export const PLATFORM_SUPPORT_TICKET_TAG_OPTIONS = ['Issue', 'Bug', 'Feature', 'Improvement', 'Performance'] as const;

// SLA Configuration (in hours)
export const SLA_CONFIG = {
    [SUPPORT_TICKET_PRIORITY.HIGH]: {
        firstResponse: 2,    // 2 hours
        resolution: 24,      // 24 hours (1 day)
    },
    [SUPPORT_TICKET_PRIORITY.NORMAL]: {
        firstResponse: 8,    // 8 hours
        resolution: 72,      // 72 hours (3 days)
    },
    [SUPPORT_TICKET_PRIORITY.LOW]: {
        firstResponse: 24,   // 24 hours
        resolution: 168,     // 168 hours (7 days)
    },
};

// SLA Status Types
export type SLAStatus = 'on_time' | 'at_risk' | 'breached';

export const getSupportTicketTimestampMillis = (value: unknown): number | null => {
    try {
        if (value instanceof Date) {
            const millis = value.getTime();
            return Number.isFinite(millis) && millis >= 0 ? millis : null;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value) && value >= 0 ? value : null;
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

        const timestamp = value as { nanoseconds?: unknown; seconds?: unknown; toMillis?: unknown };
        if (typeof timestamp.toMillis === 'function') {
            const millis = (timestamp.toMillis as () => unknown).call(value);
            return typeof millis === 'number' && Number.isFinite(millis) && millis >= 0
                ? millis
                : null;
        }
        if (
            typeof timestamp.seconds === 'number'
            && Number.isSafeInteger(timestamp.seconds)
            && timestamp.seconds >= 0
        ) {
            const nanoseconds = timestamp.nanoseconds ?? 0;
            if (
                typeof nanoseconds !== 'number'
                || !Number.isSafeInteger(nanoseconds)
                || nanoseconds < 0
                || nanoseconds >= 1_000_000_000
            ) return null;
            const millis = (timestamp.seconds * 1000) + Math.floor(nanoseconds / 1_000_000);
            return Number.isSafeInteger(millis) ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
};

export const getFirstSupportTicketResponse = (
    ticket: Pick<SupportTicketType, 'clientDetails' | 'messages' | 'uId'>,
): TicketMessage | undefined => {
    const requesterEmail = String(ticket.clientDetails?.email || '').trim().toLowerCase();
    const requesterId = String(ticket.uId || '').trim();
    return (ticket.messages || []).find((message) => {
        if (message.type === 'system') return false;
        const senderEmail = String(message.sender?.email || '').trim().toLowerCase();
        const senderId = String(message.sender?.id || '').trim();
        if (requesterEmail) return Boolean(senderEmail && senderEmail !== requesterEmail);
        return Boolean(requesterId && senderId && senderId !== requesterId);
    });
};

export const calculateSupportTicketSLAStatus = (
    ticket: Pick<SupportTicketType, 'clientDetails' | 'createdOn' | 'messages' | 'priority' | 'statuses' | 'uId'>,
    nowMillis: number = Date.now(),
): ReturnType<typeof calculateSLAStatus> | null => {
    const createdMillis = getSupportTicketTimestampMillis(ticket.createdOn);
    if (createdMillis === null) return null;
    const config = SLA_CONFIG[ticket.priority] || SLA_CONFIG[SUPPORT_TICKET_PRIORITY.NORMAL];
    const firstResponse = getFirstSupportTicketResponse(ticket);
    const firstResponseMillis = getSupportTicketTimestampMillis(firstResponse?.timestamp);
    const firstResolution = (ticket.statuses || []).find((entry) => (
        entry.status === SUPPORT_TICKET_STATUS.RESOLVED
        || entry.status === SUPPORT_TICKET_STATUS.CLOSED
    ));
    const resolutionMillis = getSupportTicketTimestampMillis(firstResolution?.timestamp);
    const boundedNow = Number.isFinite(nowMillis) ? Math.max(nowMillis, createdMillis) : createdMillis;
    const responseTimeUsed = Math.max(0, (Math.max(firstResponseMillis ?? boundedNow, createdMillis) - createdMillis) / (1000 * 60 * 60));
    const resolutionTimeUsed = Math.max(0, (Math.max(resolutionMillis ?? boundedNow, createdMillis) - createdMillis) / (1000 * 60 * 60));
    const classify = (used: number, target: number): SLAStatus => {
        const percentage = (used / target) * 100;
        if (percentage > 100) return 'breached';
        if (percentage >= 80) return 'at_risk';
        return 'on_time';
    };

    return {
        responseStatus: classify(responseTimeUsed, config.firstResponse),
        resolutionStatus: classify(resolutionTimeUsed, config.resolution),
        responseTimeUsed,
        resolutionTimeUsed,
        responseTimeRemaining: config.firstResponse - responseTimeUsed,
        resolutionTimeRemaining: config.resolution - resolutionTimeUsed,
    };
};

// Helper to calculate SLA status
export const calculateSLAStatus = (
    createdOn: Timestamp,
    priority: string,
    hasResponse: boolean = false,
    isResolved: boolean = false
): {
    responseStatus: SLAStatus;
    resolutionStatus: SLAStatus;
    responseTimeUsed: number;  // in hours
    resolutionTimeUsed: number; // in hours
    responseTimeRemaining: number; // in hours
    resolutionTimeRemaining: number; // in hours
} => {
    const slaConfig = SLA_CONFIG[priority] || SLA_CONFIG[SUPPORT_TICKET_PRIORITY.NORMAL];
    const now = Date.now();
    const createdTime = createdOn.toMillis();
    const elapsedMs = now - createdTime;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Response SLA
    const responseTimeUsed = elapsedHours;
    const responseTimeRemaining = slaConfig.firstResponse - elapsedHours;
    const responsePercentage = (elapsedHours / slaConfig.firstResponse) * 100;

    let responseStatus: SLAStatus = 'on_time';
    if (hasResponse) {
        responseStatus = 'on_time'; // Already responded
    } else if (responsePercentage > 100) {
        responseStatus = 'breached';
    } else if (responsePercentage >= 80) {
        responseStatus = 'at_risk';
    }

    // Resolution SLA
    const resolutionTimeUsed = elapsedHours;
    const resolutionTimeRemaining = slaConfig.resolution - elapsedHours;
    const resolutionPercentage = (elapsedHours / slaConfig.resolution) * 100;

    let resolutionStatus: SLAStatus = 'on_time';
    if (isResolved) {
        resolutionStatus = 'on_time'; // Already resolved
    } else if (resolutionPercentage > 100) {
        resolutionStatus = 'breached';
    } else if (resolutionPercentage >= 80) {
        resolutionStatus = 'at_risk';
    }

    return {
        responseStatus,
        resolutionStatus,
        responseTimeUsed,
        resolutionTimeUsed,
        responseTimeRemaining,
        resolutionTimeRemaining,
    };
};
