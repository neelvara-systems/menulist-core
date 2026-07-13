import type { Timestamp } from 'firebase/firestore';
import type { SourceContext } from './multiProduct';

export interface Feedback {
    id: string;
    pId: 'AL';
    sourceContext: SourceContext | null;
    sId: string | number;
    tId: string | number;
    uId: string | number;
    type: 'general' | 'feature_usage' | 'feature_requests';
    rating?: number;
    comment?: string;
    featureComment?: string;
    featureIssues?: string[];
    featureRequest?: string; // For user's own new feature request
    votedPopularRequests?: { feature: string; interested: boolean }[]; // For voting on existing popular requests
    contextKey?: string | null; // Optional Answerlattice product surface key for sorting/triage
    surfaceId?: string | null;
    surfaceLabel?: string | null;
    surfaceAssignedBy?: string | null;
    surfaceAssignedAt?: Timestamp | null;
    traceId?: string;
    requestId?: string;
    role?: string;
    modifiedBy?: string;
    modifiedOn?: Timestamp;
    createdBy?: string;
    createdOn: Timestamp;
}
