import { Timestamp } from 'firebase/firestore';

/**
 * GuestFeedback - Public feedback submitted by guests
 * 
 * NOTE: This is SEPARATE from the authenticated `Feedback` type
 * in src/types/feedback.ts which is for logged-in users.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */
export interface GuestFeedback {
    /** Auto-generated Firestore document ID */
    id?: string;

    // ─────────────────────────────────────────────────────────────
    // TENANT/STORE ISOLATION (Required for all queries)
    // ─────────────────────────────────────────────────────────────

    /** Tenant ID - required for tenant isolation */
    tId: number;

    /** Store ID - required for store isolation */
    sId: number;

    // ─────────────────────────────────────────────────────────────
    // FEEDBACK CONTENT
    // ─────────────────────────────────────────────────────────────

    /** Rating (1-5 stars) - REQUIRED */
    rating: 1 | 2 | 3 | 4 | 5;

    /** Optional message from guest (max 300 chars) */
    message?: string;

    // ─────────────────────────────────────────────────────────────
    // OPTIONAL CONTACT INFO (Consent-based)
    // ─────────────────────────────────────────────────────────────

    /** Guest name (max 60 chars) */
    customerName?: string;

    /** Guest phone (max 20 chars) */
    customerPhone?: string;

    /** Guest email (max 120 chars) */
    customerEmail?: string;

    // ─────────────────────────────────────────────────────────────
    // SOURCE TRACKING
    // ─────────────────────────────────────────────────────────────

    /** How the guest accessed the feedback form */
    source: 'menu_footer' | 'feedback_qr' | 'direct_link';

    /** Project ID of the menu they were viewing */
    projectId: string;

    // ─────────────────────────────────────────────────────────────
    // STATUS
    // ─────────────────────────────────────────────────────────────

    /** Feedback status */
    status: 'new' | 'resolved';

    /** 
     * Computed field: true when rating <= 3 AND status == 'new'
     * Used for efficient Firestore queries (avoids inequality on multiple fields)
     */
    needsAttention: boolean;

    /** Optional owner note when marking resolved (max 300 chars) */
    ownerNote?: string;

    // ─────────────────────────────────────────────────────────────
    // AUDIT FIELDS
    // ─────────────────────────────────────────────────────────────

    /** When feedback was submitted */
    createdOn: Timestamp;

    /** Always 'guest' for public submissions */
    createdBy: 'guest';

    /** When status was last updated */
    modifiedOn?: Timestamp;

    /** User ID who updated status (owner/manager) */
    modifiedBy?: string;

    // ─────────────────────────────────────────────────────────────
    // RETENTION
    // ─────────────────────────────────────────────────────────────

    /** Calculated expiry date (createdOn + 90 days) */
    expiresOn: Timestamp;
}

/**
 * Filter options for feedback inbox
 */
export type GuestFeedbackFilter = 'all' | 'needs_attention' | 'resolved';

/**
 * Sort options for feedback inbox
 */
export type GuestFeedbackSort = 'newest' | 'oldest' | 'rating_low' | 'rating_high';

/**
 * Store-level feedback defaults
 * Controls which contact fields are shown in the feedback form
 */
export interface FeedbackDefaults {
    /** Collect customer name (default: false) */
    collectName: boolean;

    /** Collect customer phone (default: true - India market) */
    collectPhone: boolean;

    /** Collect customer email (default: true) */
    collectEmail: boolean;
}

/**
 * Default values for FeedbackDefaults when not set
 */
export const DEFAULT_FEEDBACK_SETTINGS: FeedbackDefaults = {
    collectName: false,
    collectPhone: true,
    collectEmail: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// FORM TYPES (Used by GuestFeedbackForm component)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Form values for guest feedback submission
 */
export interface GuestFeedbackFormValues {
    rating: number;
    message?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    website?: string; // Honeypot field
}

/**
 * Submit state for feedback form
 */
export type GuestFeedbackSubmitState = 'idle' | 'submitting' | 'success' | 'error';
