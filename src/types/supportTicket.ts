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

export interface SupportTicketType {
    id: string;
    displayId: string;
    subject: string;
    status: string;
    priority: string;
    category: string;
    message: string;
    documents: any[];
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

export const getCardColor = (status: string, token: any) => {
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
