import { Timestamp } from 'firebase/firestore';
import { UserUploadedFileType } from './common';
import { KnowledgeBaseArticleType } from './knowledgeBase';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    // Use backend response structure directly
    content?: string; // For user messages
    craftedAnswer?: string; // For assistant messages (from backend)
    createdOn?: Timestamp; // Firestore Timestamp
    searchHistoryId?: string; // Links to aiSearchHistory for analytics
    references?: KnowledgeBaseArticleType[]; // KB articles with similarity scores
    answerSource?: 'canonical' | 'faq' | 'rag' | 'cache' | 'empty' | string;
    relatedContent?: import('@type/answerlattice').AnswerlatticeSurfaceContentItem;
    suggestedQuestions?: string[]; // AI-generated follow-up questions (3 contextual questions)
    image?: UserUploadedFileType;
    // Feedback stored directly in message for easy UI display
    feedback?: {
        isGood: boolean;
        reasonsToImprove?: Array<{
            value: string;
            label: string;
        }>;
        comments?: string;
        submittedAt?: Timestamp; // Firestore Timestamp - when feedback was submitted
    };
    // Generation metadata for analytics (retry/regenerate tracking)
    generationMetadata?: {
        isRetry: boolean;           // True if this was generated via retry/regenerate
        attempt: number;            // Generation attempt (1 = original, 2+ = retry)
        previousMessageId?: string; // For regenerate: ID of message that was replaced
        retryReason?: 'error' | 'regenerate'; // Why was it retried?
    };
    // AI Failure Escalation (Item #8) — only on assistant messages when escalation is suggested
    escalation?: {
        suggested: boolean;
        type: 'soft' | 'hard' | 'none';
        triggers: string[];
        context?: import('@lib/answerlattice/escalationTypes').EscalationContext;
    };
    // Quality flags are calculated in real-time from similarityScore (not stored)
}

export type ChatMode = 'qna' | 'assistant';

export interface ChatSession {
    id?: string;
    title: string;
    mode: ChatMode;
    messages: ChatMessage[];
    // Session-related fields that will be added by the DAL
    uId?: string;
    userName?: string; // User's display name for UI (e.g., "John Doe")
    tId?: number;
    sId?: number;
    createdOn?: Timestamp; // Should be a server timestamp
    modifiedOn?: Timestamp; // Should be a server timestamp
    // Admin/Owner only field for internal team collaboration (Array for future multi-note support)
    internalNotes?: Array<{
        id?: string;                    // Unique note ID
        content: any;                   // TipTap JSON for rich formatted notes
        createdBy?: string;             // User ID who created
        createdByName?: string;         // Display name of creator
        createdOn?: Timestamp;          // When created
        modifiedBy?: string;            // User ID who last modified
        modifiedByName?: string;        // Display name of last editor
        modifiedOn?: Timestamp;         // When last modified
    }>;

    // Admin Organization & Tracking Fields (for filtering and triage)
    adminStatus?: 'new' | 'in_progress' | 'resolved' | 'follow_up' | 'closed';
    priority?: 'high' | 'normal' | 'low';
    adminTags?: string[]; // e.g., ["Technical Issue", "VIP Customer", "Bug Report"]
    isUnread?: boolean; // Has new customer messages that admin hasn't viewed
    lastAdminView?: Timestamp; // When admin last opened this conversation
}

// Admin filter options (predefined for consistency across UI and backend)

// Status options
export const ADMIN_STATUS_OPTIONS = [
    { label: '🆕 New', value: 'new' },
    { label: '⏳ In Progress', value: 'in_progress' },
    { label: '✅ Resolved', value: 'resolved' },
    { label: '🔄 Follow-up', value: 'follow_up' },
    { label: '🔒 Closed', value: 'closed' }
] as const;

// Priority options
export const ADMIN_PRIORITY_OPTIONS = [
    { label: '🔴 High', value: 'high' },
    { label: '🟡 Normal', value: 'normal' },
    { label: '🟢 Low', value: 'low' }
] as const;

// Tag options
export const ADMIN_TAG_OPTIONS = [
    'Technical Issue',
    'Billing Question',
    'Feature Request',
    'Bug Report',
    'Account Issue',
    'Integration Help',
    'Training Needed',
    'Follow-up Required'
] as const;

// Quality options (based on AI response similarity scores)
export const ADMIN_QUALITY_OPTIONS = [
    { label: '✨ Good Quality (≥60%)', value: 'good' },
    { label: '⚠️ Low Confidence (<60%)', value: 'low' },
    { label: '🔴 Very Low (<40%)', value: 'very_low' }
] as const;

// Conversation filters type (for admin management)
export interface ConversationFilters {
    mode: 'all' | 'qna' | 'assistant';
    feedback: 'all' | 'positive' | 'negative' | 'none';
    status: 'all' | 'new' | 'in_progress' | 'resolved' | 'follow_up' | 'closed';
    priority: 'all' | 'high' | 'normal' | 'low';
    quality: 'all' | 'good' | 'low' | 'very_low'; // AI response quality based on similarity scores
    tags: string[];
    hasNotes: boolean;
    isUnread: boolean;
    dateRange: [any, any] | null; // dayjs.Dayjs type
}
