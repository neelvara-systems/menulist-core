/**
 * Reviews & Reputation — Type Definitions
 *
 * Raw review data from Google Business Profile (immutable after ingestion)
 * and classification state (mutable, managed by Cloud Functions).
 *
 * @see __docs__/reviews-reputation/reviews-reputation_impl.md §3
 */

import { Timestamp } from "firebase/firestore";

// ================================================================
// RAW REVIEW DATA (Immutable after ingestion)
// Collection: reviews/{tId}/{sId}/{reviewId}
// ================================================================

export interface Review {
    id: string;
    tId: number;
    sId: number;

    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    reviewerName: string;
    reviewerPhotoUrl?: string;
    reviewTime: Timestamp;

    ownerReply?: {
        comment: string;
        updateTime: Timestamp;
    };

    gbpReviewName: string;
    ingestedOn: Timestamp;
    source: "gbp_api" | "manual_import";
}

// ================================================================
// REVIEW STATE (Classification + Block/Escalation)
// Collection: reviewsState/{reviewId}; tenant/store ownership lives in tId/sId fields
// ================================================================

export type ReviewClassification =
    | "benign"
    | "informational"
    | "negative_low_risk"
    | "negative_high_risk"
    | "volatile";

export interface ReviewState {
    id: string;
    tId: number;
    sId: number;

    classification: ReviewClassification;
    triggerKeywords?: string[];

    blockActive: boolean;
    escalationActive: boolean;
    autoExpiresAt: Timestamp;

    classifiedOn: Timestamp;
    classifierVersion: string;
    updatedOn: Timestamp;
}

// ================================================================
// REPUTATION STATE (Derived — stored on store doc or computed client-side)
// ================================================================

export type ReputationState = 'stable' | 'needs_attention';

export interface ReputationStatus {
    hasBlockActive: boolean;
    hasEscalationActive: boolean;
}
